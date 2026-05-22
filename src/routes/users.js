const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { query, queryOne } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const emailService = require("../services/email");
const {
  isValidEmail,
  isValidCpf,
  formatCpf,
  strongEnoughPassword,
} = require("../utils/validators");

const router = express.Router();

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

router.get("/", authenticate, requireRole("admin", "coordinator", "ti"), async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filters = [];
    const params = [];
    if (role) {
      filters.push("role = ?");
      params.push(role);
    }
    if (status) {
      filters.push("status = ?");
      params.push(status);
    }
    if (search) {
      filters.push("(name LIKE ? OR email LIKE ? OR cpf LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const users = await query(
      `SELECT id, name, email, cpf, role, status, phone, must_change_password, last_login, created_at
       FROM users ${where} ORDER BY status='pending' DESC, name ASC`,
      params,
    );
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get("/teachers", authenticate, async (req, res, next) => {
  try {
    const rows = await query(
      "SELECT id, name, email, cpf, status FROM users WHERE role = 'teacher' AND status = 'active' ORDER BY name",
    );
    res.json({ teachers: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const { name, email, cpf, role, password, sendInvite, phone } = req.body || {};
    if (!name || !email || !role) {
      return res.status(400).json({ error: "Nome, e-mail e papel sao obrigatorios." });
    }
    if (!isValidEmail(email)) return res.status(400).json({ error: "E-mail invalido." });
    if (cpf && !isValidCpf(cpf)) return res.status(400).json({ error: "CPF invalido." });
    if (!["teacher", "coordinator", "ti", "admin"].includes(role)) {
      return res.status(400).json({ error: "Papel invalido." });
    }
    const emailLower = email.toLowerCase().trim();
    const formattedCpf = cpf ? formatCpf(cpf) : null;
    const existing = await queryOne("SELECT id FROM users WHERE email = ? OR (cpf IS NOT NULL AND cpf = ?) LIMIT 1", [
      emailLower,
      formattedCpf,
    ]);
    if (existing) return res.status(409).json({ error: "Ja existe usuario com esse e-mail ou CPF." });

    const tempPassword = password || crypto.randomBytes(6).toString("base64").replace(/[+/=]/g, "").slice(0, 8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const activationToken = sendInvite ? crypto.randomBytes(24).toString("hex") : null;
    const activationExpires = sendInvite ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;
    const status = sendInvite ? "pending" : "active";
    const mustChange = !password || sendInvite ? 1 : 0;

    const result = await query(
      `INSERT INTO users (name, email, cpf, password_hash, role, status, must_change_password, phone, activation_token, activation_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), emailLower, formattedCpf, passwordHash, role, status, mustChange, phone || null, activationToken, activationExpires],
    );

    let mailResult = null;
    let activationLink = null;
    if (sendInvite) {
      const settings = await queryOne("SELECT name FROM school_settings WHERE id = 1");
      activationLink = `${appUrl()}/?activate=${activationToken}`;
      const template = emailService.activationEmail({ name, link: activationLink, schoolName: settings?.name });
      mailResult = await emailService.send({ to: emailLower, ...template });
    }

    res.status(201).json({
      message: "Usuario criado.",
      userId: result.insertId,
      tempPassword: !sendInvite ? tempPassword : undefined,
      emailSent: mailResult ? !mailResult.skipped : false,
      activationLink: mailResult?.skipped ? activationLink : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/activate", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await queryOne("SELECT id, status FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "Usuario nao encontrado." });
    await query("UPDATE users SET status = 'active', activation_token = NULL, activation_expires = NULL WHERE id = ?", [id]);
    res.json({ message: "Usuario ativado." });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/block", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "Voce nao pode bloquear o proprio usuario." });
    await query("UPDATE users SET status = 'blocked' WHERE id = ?", [id]);
    res.json({ message: "Usuario bloqueado." });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/send-invite", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await queryOne("SELECT id, name, email FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "Usuario nao encontrado." });
    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await query("UPDATE users SET activation_token = ?, activation_expires = ?, status = 'pending' WHERE id = ?", [
      token,
      expires,
      id,
    ]);
    const settings = await queryOne("SELECT name FROM school_settings WHERE id = 1");
    const link = `${appUrl()}/?activate=${token}`;
    const template = emailService.activationEmail({ name: user.name, link, schoolName: settings?.name });
    const mailResult = await emailService.send({ to: user.email, ...template });
    res.json({
      message: mailResult?.skipped ? "Token gerado. SMTP nao configurado." : "Convite enviado.",
      activationLink: mailResult?.skipped ? link : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reset-password", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body || {};
    if (!strongEnoughPassword(newPassword)) {
      return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?", [hash, id]);
    res.json({ message: "Senha redefinida. Troca exigida no proximo acesso." });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, email, cpf, role, phone } = req.body || {};
    const updates = [];
    const params = [];
    if (name) { updates.push("name = ?"); params.push(name.trim()); }
    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ error: "E-mail invalido." });
      updates.push("email = ?"); params.push(email.toLowerCase().trim());
    }
    if (cpf !== undefined) {
      if (cpf && !isValidCpf(cpf)) return res.status(400).json({ error: "CPF invalido." });
      updates.push("cpf = ?"); params.push(cpf ? formatCpf(cpf) : null);
    }
    if (role) {
      if (!["teacher", "coordinator", "ti", "admin"].includes(role)) {
        return res.status(400).json({ error: "Papel invalido." });
      }
      updates.push("role = ?"); params.push(role);
    }
    if (phone !== undefined) {
      updates.push("phone = ?"); params.push(phone || null);
    }
    if (!updates.length) return res.status(400).json({ error: "Nada para atualizar." });
    params.push(id);
    await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ message: "Usuario atualizado." });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "Nao remova o proprio usuario." });
    await query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "Usuario removido." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
