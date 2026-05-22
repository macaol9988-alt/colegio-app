require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { pool, query, queryOne } = require("./src/db");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const SKIP_DB_SCHEMA = String(process.env.SKIP_DB_SCHEMA || "").toLowerCase() === "true";
const SKIP_DB_SEED = String(process.env.SKIP_DB_SEED || "").toLowerCase() === "true";

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", publicLimiter);

const uploadsDir = path.join(__dirname, "public", "uploads");
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (error) {
  console.warn("[boot] Nao foi possivel criar pasta de uploads:", error.message);
}

app.use("/uploads", express.static(uploadsDir, { maxAge: "7d" }));
app.use(express.static(path.join(__dirname, "public"), { index: "index.html", maxAge: "1h" }));

app.get("/api/health", async (req, res) => {
  const health = { status: "ok", time: new Date().toISOString(), db: "unknown" };
  try {
    await pool.query("SELECT 1");
    health.db = "ok";
  } catch (error) {
    health.db = "error";
    health.dbError = error.code || error.message;
  }
  res.json(health);
});

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/users", require("./src/routes/users"));
app.use("/api/school", require("./src/routes/school"));
app.use("/api/classes", require("./src/routes/classes"));
app.use("/api/attendance", require("./src/routes/attendance"));
app.use("/api/tickets", require("./src/routes/tickets"));

app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error("[error]", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Erro interno." });
});

async function ensureSchema() {
  if (SKIP_DB_SCHEMA) {
    console.log("[schema] Pulado (SKIP_DB_SCHEMA=true).");
    return;
  }
  // Em hospedagem compartilhada, importe database/install.sql via phpMyAdmin antes
  // (o usuario do banco pode nao ter privilegio para CREATE TABLE em runtime).
  const candidates = [
    path.join(__dirname, "database", "install.sql"),
    path.join(__dirname, "src", "schema.sql"),
  ];
  const schemaPath = candidates.find((p) => fs.existsSync(p));
  if (!schemaPath) {
    console.warn("[schema] Nenhum arquivo schema encontrado.");
    return;
  }
  const schema = fs.readFileSync(schemaPath, "utf-8");
  const statements = schema
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter((s) => s.length > 0);
  let failed = 0;
  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      const msg = String(error.message || "");
      if (msg.includes("already exists") || msg.includes("Duplicate") || error.code === "ER_TABLE_EXISTS_ERROR") continue;
      // Em shared hosting o usuario pode nao ter privilegio CREATE - logamos mas seguimos.
      if (error.code === "ER_TABLEACCESS_DENIED_ERROR" || error.code === "ER_DBACCESS_DENIED_ERROR" || error.code === "ER_SPECIFIC_ACCESS_DENIED_ERROR") {
        console.warn("[schema] Sem privilegio para criar tabelas. Importe database/install.sql via phpMyAdmin.");
        return;
      }
      failed += 1;
      if (failed <= 3) console.error("[schema] erro:", error.code || error.message);
    }
  }
  if (failed === 0) console.log("[schema] Verificado.");
}

async function ensureSeedAdmin() {
  if (SKIP_DB_SEED) return;
  try {
    const adminExists = await queryOne("SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    if (adminExists) return;
    const name = process.env.SEED_ADMIN_NAME || "Administrador";
    const email = (process.env.SEED_ADMIN_EMAIL || "admin@colegio.com").toLowerCase();
    const cpf = process.env.SEED_ADMIN_CPF || null;
    const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `INSERT IGNORE INTO users (name, email, cpf, password_hash, role, status, must_change_password)
       VALUES (?, ?, ?, ?, 'admin', 'active', 1)`,
      [name, email, cpf, passwordHash],
    );
    console.log(`[seed] Admin inicial criado: ${email}`);
  } catch (error) {
    console.warn("[seed] Pulado:", error.code || error.message);
  }
}

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("[db] Conectado ao MySQL.");
  } catch (error) {
    console.error("[db] Falha ao conectar ao MySQL:", error.code || error.message);
    console.error("[db] Verifique DB_HOST, DB_USER, DB_PASSWORD, DB_NAME no .env (ou variaveis de ambiente do painel).");
    // Nao mata o processo em producao - deixa subir e mostrar a pagina,
    // o erro fica visivel em /api/health enquanto o usuario corrige.
    if (process.env.NODE_ENV === "production") {
      console.error("[db] Subindo mesmo assim para nao reiniciar em loop.");
    } else {
      process.exit(1);
    }
  }

  await ensureSchema();
  await ensureSeedAdmin();

  app.listen(PORT, () => {
    console.log(`[server] Rodando na porta ${PORT}`);
  });
}

start();

process.on("uncaughtException", (error) => console.error("[uncaught]", error));
process.on("unhandledRejection", (error) => console.error("[unhandled]", error));
