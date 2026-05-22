const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { query, queryOne } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = ext.match(/\.(png|jpg|jpeg|webp|svg)$/) ? ext : ".png";
    cb(null, `logo-${Date.now()}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/.test(file.mimetype)) {
      return cb(new Error("Formato de imagem invalido."));
    }
    cb(null, true);
  },
});

router.get("/", async (req, res, next) => {
  try {
    const settings = await queryOne("SELECT * FROM school_settings WHERE id = 1");
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

const ALLOWED_FIELDS = [
  "name",
  "cnpj",
  "address",
  "phone",
  "email",
  "primary_color",
  "accent_color",
  "school_lat",
  "school_lng",
  "allowed_radius",
  "max_accuracy",
  "class_morning_start",
  "class_morning_end",
  "class_afternoon_start",
  "class_afternoon_end",
  "sla_critical_hours",
  "sla_high_hours",
  "sla_medium_hours",
  "sla_low_hours",
  "allow_self_register",
];

router.put("/", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const updates = [];
    const params = [];
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field] === "" ? null : req.body[field]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: "Nada para atualizar." });
    await query(`UPDATE school_settings SET ${updates.join(", ")} WHERE id = 1`, params);
    const settings = await queryOne("SELECT * FROM school_settings WHERE id = 1");
    res.json({ message: "Configuracoes atualizadas.", settings });
  } catch (error) {
    next(error);
  }
});

router.post("/logo", authenticate, requireRole("admin"), upload.single("logo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Envie um arquivo de imagem." });
    const previous = await queryOne("SELECT logo_path FROM school_settings WHERE id = 1");
    const relativePath = `/uploads/${req.file.filename}`;
    await query("UPDATE school_settings SET logo_path = ? WHERE id = 1", [relativePath]);
    if (previous?.logo_path) {
      const oldPath = path.join(__dirname, "..", "..", "public", previous.logo_path.replace(/^\//, ""));
      fs.unlink(oldPath, () => {});
    }
    res.json({ message: "Logo atualizada.", logo_path: relativePath });
  } catch (error) {
    next(error);
  }
});

router.delete("/logo", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const previous = await queryOne("SELECT logo_path FROM school_settings WHERE id = 1");
    await query("UPDATE school_settings SET logo_path = NULL WHERE id = 1");
    if (previous?.logo_path) {
      const oldPath = path.join(__dirname, "..", "..", "public", previous.logo_path.replace(/^\//, ""));
      fs.unlink(oldPath, () => {});
    }
    res.json({ message: "Logo removida." });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", authenticate, requireRole("admin", "coordinator", "ti"), async (req, res, next) => {
  try {
    const [teachers, staff, attendance, pendingAttendance, tickets, openTickets] = await Promise.all([
      queryOne("SELECT COUNT(*) AS total FROM users WHERE role = 'teacher'"),
      queryOne("SELECT COUNT(*) AS total FROM users WHERE role IN ('coordinator','admin','ti')"),
      queryOne("SELECT COUNT(*) AS total FROM attendance_records"),
      queryOne("SELECT COUNT(*) AS total FROM attendance_records WHERE approval_status = 'Pendente'"),
      queryOne("SELECT COUNT(*) AS total FROM tickets"),
      queryOne("SELECT COUNT(*) AS total FROM tickets WHERE status IN ('Aberto','EmAndamento','Aguardando')"),
    ]);
    res.json({
      teachers: teachers.total,
      staff: staff.total,
      attendance: attendance.total,
      pendingAttendance: pendingAttendance.total,
      tickets: tickets.total,
      openTickets: openTickets.total,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
