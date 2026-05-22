const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { query, queryOne } = require("../db");
const { sign } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");
const emailService = require("../services/email");
const {
  isValidEmail,
  isValidCpf,
  formatCpf,
  onlyDigits,
  looksLikeCpf,
  strongEnoughPassword,
} = require("../utils/validators");

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function getSchoolName() {
  const row = await queryOne("SELECT name FROM school_settings WHERE id = 1");
  return row?.name || "Colegio";
}

async function findUserByIdentifier(identifier) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  if (looksLikeCpf(raw)) {
    const formatted = formatCpf(raw);
    return queryOne("SELECT * FROM users WHERE cpf = ? OR cpf = ? LIMIT 1", [formatted, onlyDigits(raw)]);
  }
  return queryOne("SELECT * FROM users WHERE email = ? LIMIT 1", [raw.toLowerCase()]);
}

router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: "Informe e-mail/CPF e senha." });
    }
    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ error: "Credenciais invalidas." });
    if (user.status === "pending") {
      return res.status(403).json({ error: "Sua conta ainda nao foi ativada. Aguarde a aprovacao do administrador ou ative pelo e-mail recebido." });
    }
    if (user.status === "blocked") {
      return res.status(403).json({ error: "Conta bloqueada. Procure o administrador." });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciais invalidas." });

    await query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

    const token = sign({ id: user.id, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        role: user.role,
        must_change_password: !!user.must_change_password,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const settings = await queryOne("SELECT allow_self_register, name FROM school_settings WHERE id = 1");
    if (!settings?.allow_self_register) {
      return res.status(403).json({ error: "Auto-cadastro desabilitado. Procure o administrador." });
    }
    const { name, email, cpf, password, phone } = req.body || {};
    if (!name || !email || !cpf || !password) {
      return res.status(400).json({ error: "Preencha nome, e-mail, CPF e senha." });
    }
    if (!isValidEmail(email)) return res.status(400).json({ error: "E-mail invalido." });
    if (!isValidCpf(cpf)) return res.status(400).json({ error: "CPF invalido." });
    if (!strongEnoughPassword(password)) {
      return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
    }
    const formattedCpf = formatCpf(cpf);
    const emailLower = email.toLowerCase().trim();
    const existing = await queryOne("SELECT id FROM users WHERE email = ? OR cpf = ? LIMIT 1", [emailLower, formattedCpf]);
    if (existing) return res.status(409).json({ error: "Ja existe um cadastro com esse e-mail ou CPF." });

    const passwordHash = await bcrypt.hash(password, 10);
    const activationToken = generateToken();
    const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const result = await query(
      `INSERT INTO users (name, email, cpf, password_hash, role, status, phone, activation_token, activation_expires)
       VALUES (?, ?, ?, ?, 'teacher', 'pending', ?, ?, ?)`,
      [name.trim(), emailLower, formattedCpf, passwordHash, phone || null, activationToken, activationExpires],
    );

    const link = `${appUrl()}/?activate=${activationToken}`;
    const template = emailService.activationEmail({ name, link, schoolName: settings.name });
    const mailResult = await emailService.send({ to: emailLower, ...template });

    res.status(201).json({
      message: "Cadastro recebido. Aguarde a ativacao pelo administrador ou clique no link enviado para seu e-mail.",
      userId: result.insertId,
      emailSent: !mailResult?.skipped,
      activationLink: mailResult?.skipped ? link : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/activate", async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "Token ausente." });
    const user = await queryOne(
      "SELECT id, name, email, status, activation_expires FROM users WHERE activation_token = ? LIMIT 1",
      [token],
    );
    if (!user) return res.status(400).json({ error: "Token invalido ou ja utilizado." });
    if (user.activation_expires && new Date(user.activation_expires) < new Date()) {
      return res.status(400).json({ error: "Token expirado. Solicite um novo." });
    }
    await query(
      "UPDATE users SET status = 'active', activation_token = NULL, activation_expires = NULL WHERE id = ?",
      [user.id],
    );
    res.json({ message: "Conta ativada com sucesso. Voce ja pode fazer login.", email: user.email });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) return res.status(400).json({ error: "Informe o e-mail ou CPF." });
    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.json({ message: "Se houver uma conta com esses dados, enviaremos um e-mail." });
    }
    const token = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await query("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?", [token, expires, user.id]);
    const link = `${appUrl()}/?reset=${token}`;
    const template = emailService.passwordResetEmail({ name: user.name, link, schoolName: await getSchoolName() });
    const mailResult = await emailService.send({ to: user.email, ...template });
    res.json({
      message: "Se houver uma conta com esses dados, enviaremos um e-mail.",
      resetLink: mailResult?.skipped ? link : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: "Token e senha sao obrigatorios." });
    if (!strongEnoughPassword(password)) {
      return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
    }
    const user = await queryOne("SELECT id, reset_expires FROM users WHERE reset_token = ? LIMIT 1", [token]);
    if (!user) return res.status(400).json({ error: "Token invalido." });
    if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ error: "Token expirado." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, must_change_password = 0 WHERE id = ?",
      [passwordHash, user.id],
    );
    res.json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Informe a senha atual e a nova senha." });
    }
    if (!strongEnoughPassword(newPassword)) {
      return res.status(400).json({ error: "Nova senha deve ter ao menos 6 caracteres." });
    }
    const userRow = await queryOne("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    const ok = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!ok) return res.status(401).json({ error: "Senha atual incorreta." });
    const hash = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, req.user.id]);
    res.json({ message: "Senha alterada." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
