const express = require("express");

const { query, queryOne } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isWithinClassHours(date, settings) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  const ranges = [
    [settings.class_morning_start, settings.class_morning_end],
    [settings.class_afternoon_start, settings.class_afternoon_end],
  ];
  return ranges.some(([start, end]) => {
    if (!start || !end) return false;
    const [sh, sm] = String(start).split(":").map(Number);
    const [eh, em] = String(end).split(":").map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);
    return minutes >= startMin && minutes <= endMin;
  });
}

function classifyPosition(distance, accuracy, settings) {
  if (accuracy > Number(settings.max_accuracy)) return "GPS impreciso";
  if (distance > Number(settings.allowed_radius)) return "Fora da geocerca";
  return "Validado";
}

router.post("/", authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Apenas professores registram ponto." });
    }
    const { latitude, longitude, accuracy, justification } = req.body || {};
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || !Number.isFinite(Number(accuracy))) {
      return res.status(400).json({ error: "Coordenadas invalidas." });
    }
    const settings = await queryOne("SELECT * FROM school_settings WHERE id = 1");
    const school = { lat: Number(settings.school_lat), lng: Number(settings.school_lng) };
    const teacherPos = { lat: Number(latitude), lng: Number(longitude) };
    const distance = distanceMeters(school, teacherPos);
    const now = new Date();
    const status = classifyPosition(distance, Number(accuracy), settings);
    const withinClass = isWithinClassHours(now, settings);

    const result = await query(
      `INSERT INTO attendance_records
        (teacher_id, teacher_name, latitude, longitude, accuracy, distance, school_lat, school_lng, allowed_radius, gps_status, within_class_hours, justification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.name,
        Number(latitude),
        Number(longitude),
        Number(accuracy),
        distance,
        school.lat,
        school.lng,
        Number(settings.allowed_radius),
        status,
        withinClass ? 1 : 0,
        (justification || "").trim() || null,
      ],
    );

    const record = await queryOne("SELECT * FROM attendance_records WHERE id = ?", [result.insertId]);
    res.status(201).json({ message: "Ponto registrado.", record });
  } catch (error) {
    next(error);
  }
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { teacher, month, gpsStatus, approval, mine } = req.query;
    const filters = [];
    const params = [];

    const isRegular = ["teacher", "monitor", "assistant"].includes(req.user.role);
    if (isRegular || mine === "1") {
      filters.push("teacher_id = ?");
      params.push(req.user.id);
    } else if (teacher) {
      filters.push("teacher_name LIKE ?");
      params.push(`%${teacher}%`);
    }
    if (month) {
      filters.push("DATE_FORMAT(created_at, '%Y-%m') = ?");
      params.push(month);
    }
    if (gpsStatus) {
      filters.push("gps_status = ?");
      params.push(gpsStatus);
    }
    if (approval) {
      filters.push("approval_status = ?");
      params.push(approval);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const records = await query(
      `SELECT * FROM attendance_records ${where} ORDER BY created_at DESC LIMIT 1000`,
      params,
    );
    res.json({ records });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const { month } = req.query;
    const params = [];
    let where = "";
    if (month) {
      where = "WHERE DATE_FORMAT(created_at, '%Y-%m') = ?";
      params.push(month);
    }
    const rows = await query(
      `SELECT teacher_name,
              COUNT(*) AS total,
              SUM(gps_status = 'Validado') AS valid_count,
              SUM(gps_status = 'Fora da geocerca') AS out_count,
              SUM(gps_status = 'GPS impreciso') AS imprecise_count,
              SUM(approval_status = 'Aprovado') AS approved_count,
              SUM(approval_status = 'Pendente') AS pending_count,
              SUM(justification IS NOT NULL AND justification <> '') AS justified_count,
              SUM(within_class_hours = 0) AS out_of_class_hours
       FROM attendance_records ${where}
       GROUP BY teacher_name
       ORDER BY teacher_name`,
      params,
    );
    res.json({ summary: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/approve", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const { ids, all } = req.body || {};
    let targetIds = Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
    if (all === true) {
      const rows = await query("SELECT id FROM attendance_records WHERE approval_status = 'Pendente'");
      targetIds = rows.map((r) => r.id);
    }
    if (!targetIds.length) return res.json({ message: "Nada a aprovar.", count: 0 });
    const placeholders = targetIds.map(() => "?").join(",");
    const result = await query(
      `UPDATE attendance_records SET approval_status='Aprovado', approved_by_id=?, approved_by_name=?, approved_at=NOW()
       WHERE id IN (${placeholders}) AND approval_status = 'Pendente'`,
      [req.user.id, req.user.name, ...targetIds],
    );
    res.json({ message: `${result.affectedRows} registro(s) aprovado(s).`, count: result.affectedRows });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reject", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query(
      "UPDATE attendance_records SET approval_status = 'Rejeitado', approved_by_id = ?, approved_by_name = ?, approved_at = NOW() WHERE id = ?",
      [req.user.id, req.user.name, id],
    );
    res.json({ message: "Registro rejeitado." });
  } catch (error) {
    next(error);
  }
});

router.delete("/", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    await query("DELETE FROM attendance_records");
    res.json({ message: "Todos os registros removidos." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
