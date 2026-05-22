const express = require("express");

const { query, queryOne } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const classes = await query("SELECT * FROM classes ORDER BY year DESC, name ASC");
    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const { name, year, shift } = req.body || {};
    if (!name || !year || !shift) return res.status(400).json({ error: "Nome, ano e turno sao obrigatorios." });
    if (!["Manha", "Tarde", "Noite", "Integral"].includes(shift)) {
      return res.status(400).json({ error: "Turno invalido." });
    }
    try {
      const result = await query("INSERT INTO classes (name, year, shift) VALUES (?, ?, ?)", [
        name.trim(),
        Number(year),
        shift,
      ]);
      res.status(201).json({ message: "Turma criada.", id: result.insertId });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Turma ja existe para esse ano." });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM classes WHERE id = ?", [id]);
    res.json({ message: "Turma removida." });
  } catch (error) {
    next(error);
  }
});

router.get("/links", authenticate, async (req, res, next) => {
  try {
    const links = await query(`
      SELECT tc.id, tc.teacher_id, tc.class_id, tc.year,
             u.name AS teacher_name, c.name AS class_name, c.shift
      FROM teacher_classes tc
      JOIN users u ON u.id = tc.teacher_id
      JOIN classes c ON c.id = tc.class_id
      ORDER BY tc.year DESC, u.name ASC
    `);
    res.json({ links });
  } catch (error) {
    next(error);
  }
});

router.post("/links", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const { teacher_id, class_id, year } = req.body || {};
    if (!teacher_id || !class_id || !year) {
      return res.status(400).json({ error: "Professor, turma e ano sao obrigatorios." });
    }
    try {
      const result = await query(
        "INSERT INTO teacher_classes (teacher_id, class_id, year) VALUES (?, ?, ?)",
        [Number(teacher_id), Number(class_id), Number(year)],
      );
      res.status(201).json({ message: "Vinculo criado.", id: result.insertId });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Professor ja vinculado a esta turma neste ano." });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/links/:id", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM teacher_classes WHERE id = ?", [id]);
    res.json({ message: "Vinculo removido." });
  } catch (error) {
    next(error);
  }
});

router.get("/coordinator-links", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const links = await query(`
      SELECT ct.coordinator_id, ct.teacher_id,
             c.name AS coordinator_name, t.name AS teacher_name
      FROM coordinator_teachers ct
      JOIN users c ON c.id = ct.coordinator_id
      JOIN users t ON t.id = ct.teacher_id
      ORDER BY c.name, t.name
    `);
    res.json({ links });
  } catch (error) {
    next(error);
  }
});

router.post("/coordinator-links", authenticate, requireRole("admin", "coordinator"), async (req, res, next) => {
  try {
    const { coordinator_id, teacher_id, linked } = req.body || {};
    if (!coordinator_id || !teacher_id) {
      return res.status(400).json({ error: "Coordenador e professor sao obrigatorios." });
    }
    if (linked) {
      await query("INSERT IGNORE INTO coordinator_teachers (coordinator_id, teacher_id) VALUES (?, ?)", [
        Number(coordinator_id),
        Number(teacher_id),
      ]);
    } else {
      await query("DELETE FROM coordinator_teachers WHERE coordinator_id = ? AND teacher_id = ?", [
        Number(coordinator_id),
        Number(teacher_id),
      ]);
    }
    res.json({ message: linked ? "Vinculado." : "Desvinculado." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
