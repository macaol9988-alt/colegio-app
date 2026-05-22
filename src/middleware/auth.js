const { verify } = require("../utils/jwt");
const { queryOne } = require("../db");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token ausente." });
    const payload = verify(token);
    const user = await queryOne(
      "SELECT id, name, email, cpf, role, status, must_change_password FROM users WHERE id = ?",
      [payload.id],
    );
    if (!user) return res.status(401).json({ error: "Usuario nao encontrado." });
    if (user.status !== "active") return res.status(403).json({ error: "Usuario nao esta ativo." });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalido ou expirado." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Nao autenticado." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Sem permissao para esta acao." });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
