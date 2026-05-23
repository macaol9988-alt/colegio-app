const express = require("express");

const { query, queryOne, withTransaction } = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { calculateSlaDueAt } = require("../services/sla");
const emailService = require("../services/email");

const router = express.Router();

const PRIORITIES = ["Critica", "Alta", "Media", "Baixa"];
const CATEGORIES = ["Rede", "Hardware", "Software", "Impressora", "Telefonia", "Acesso", "Outros"];
const STATUSES = ["Aberto", "EmAndamento", "Aguardando", "Resolvido", "Fechado"];

function isTiOrAdmin(user) {
  return user.role === "admin" || user.role === "ti";
}

// Usuarios que veem apenas os proprios chamados (nao podem gerenciar fila):
// professor, monitora, auxiliar educacional
function isRegularUser(user) {
  return ["teacher", "monitor", "assistant"].includes(user.role);
}

async function generateTicketNumber() {
  const year = new Date().getFullYear();
  const last = await queryOne(
    "SELECT ticket_number FROM tickets WHERE ticket_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`TI-${year}-%`],
  );
  let next = 1;
  if (last?.ticket_number) {
    const parts = last.ticket_number.split("-");
    const n = Number(parts[2]);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `TI-${year}-${String(next).padStart(4, "0")}`;
}

async function recordHistory(conn, ticketId, user, action, oldValue, newValue) {
  await conn.execute(
    "INSERT INTO ticket_history (ticket_id, user_id, user_name, action, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)",
    [ticketId, user.id, user.name, action, oldValue ?? null, newValue ?? null],
  );
}

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { status, priority, category, assigned, mine, search } = req.query;
    const filters = [];
    const params = [];

    if (isRegularUser(req.user) || mine === "1") {
      filters.push("created_by_id = ?");
      params.push(req.user.id);
    }
    if (status) {
      filters.push("status = ?");
      params.push(status);
    }
    if (priority) {
      filters.push("priority = ?");
      params.push(priority);
    }
    if (category) {
      filters.push("category = ?");
      params.push(category);
    }
    if (assigned === "me") {
      filters.push("assigned_to_id = ?");
      params.push(req.user.id);
    } else if (assigned === "unassigned") {
      filters.push("assigned_to_id IS NULL");
    } else if (assigned) {
      filters.push("assigned_to_id = ?");
      params.push(Number(assigned));
    }
    if (search) {
      filters.push("(title LIKE ? OR description LIKE ? OR ticket_number LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const tickets = await query(
      `SELECT * FROM tickets ${where}
       ORDER BY FIELD(status,'Aberto','EmAndamento','Aguardando','Resolvido','Fechado'),
                FIELD(priority,'Critica','Alta','Media','Baixa'),
                created_at DESC
       LIMIT 500`,
      params,
    );
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.get("/board", authenticate, async (req, res, next) => {
  try {
    const filters = [];
    const params = [];
    if (isRegularUser(req.user)) {
      filters.push("created_by_id = ?");
      params.push(req.user.id);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const tickets = await query(
      `SELECT id, ticket_number, title, priority, status, category, assigned_to_name, created_by_name, sla_due_at, created_at, updated_at
       FROM tickets ${where}
       ORDER BY FIELD(priority,'Critica','Alta','Media','Baixa'), created_at DESC`,
      params,
    );
    const board = {
      Aberto: [],
      EmAndamento: [],
      Aguardando: [],
      Resolvido: [],
      Fechado: [],
    };
    tickets.forEach((t) => {
      if (board[t.status]) board[t.status].push(t);
    });
    res.json({ board });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", authenticate, async (req, res, next) => {
  try {
    const isRegular = isRegularUser(req.user);
    const filter = isRegular ? "WHERE created_by_id = ?" : "";
    const params = isRegular ? [req.user.id] : [];
    const rows = await query(
      `SELECT status, COUNT(*) AS total FROM tickets ${filter} GROUP BY status`,
      params,
    );
    const stats = { Aberto: 0, EmAndamento: 0, Aguardando: 0, Resolvido: 0, Fechado: 0 };
    rows.forEach((r) => { stats[r.status] = r.total; });
    const overdue = await queryOne(
      `SELECT COUNT(*) AS total FROM tickets
       WHERE status IN ('Aberto','EmAndamento','Aguardando')
       AND sla_due_at IS NOT NULL AND sla_due_at < NOW()
       ${isRegular ? "AND created_by_id = ?" : ""}`,
      isRegular ? [req.user.id] : [],
    );
    res.json({ stats, overdue: overdue.total });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ticket = await queryOne("SELECT * FROM tickets WHERE id = ?", [id]);
    if (!ticket) return res.status(404).json({ error: "Chamado nao encontrado." });
    if (isRegularUser(req.user) && ticket.created_by_id !== req.user.id) {
      return res.status(403).json({ error: "Sem acesso a este chamado." });
    }
    const comments = await query(
      "SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC",
      [id],
    );
    const history = await query(
      "SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY created_at ASC",
      [id],
    );
    const visibleComments = isRegularUser(req.user)
      ? comments.filter((c) => !c.is_internal)
      : comments;
    res.json({ ticket, comments: visibleComments, history });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { title, description, category, priority, location } = req.body || {};
    if (!title || !description) return res.status(400).json({ error: "Titulo e descricao sao obrigatorios." });
    const finalCategory = CATEGORIES.includes(category) ? category : "Outros";
    const finalPriority = PRIORITIES.includes(priority) ? priority : "Media";

    const ticketNumber = await generateTicketNumber();
    const slaDueAt = await calculateSlaDueAt(finalPriority);

    const insertResult = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO tickets (ticket_number, created_by_id, created_by_name, title, description, category, priority, status, location, sla_due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Aberto', ?, ?)`,
        [
          ticketNumber,
          req.user.id,
          req.user.name,
          title.trim(),
          description.trim(),
          finalCategory,
          finalPriority,
          location || null,
          slaDueAt,
        ],
      );
      await recordHistory(conn, result.insertId, req.user, "Criou chamado", null, finalPriority);
      return result;
    });

    const ticket = await queryOne("SELECT * FROM tickets WHERE id = ?", [insertResult.insertId]);

    const tiUsers = await query("SELECT email FROM users WHERE role IN ('ti','admin') AND status='active'");
    if (tiUsers.length) {
      const settings = await queryOne("SELECT name FROM school_settings WHERE id = 1");
      const template = emailService.ticketCreatedEmail({ ticket, schoolName: settings?.name });
      for (const u of tiUsers) {
        emailService.send({ to: u.email, ...template }).catch(() => {});
      }
    }

    res.status(201).json({ message: "Chamado aberto.", ticket });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ticket = await queryOne("SELECT * FROM tickets WHERE id = ?", [id]);
    if (!ticket) return res.status(404).json({ error: "Chamado nao encontrado." });

    const canEdit = isTiOrAdmin(req.user) || ticket.created_by_id === req.user.id;
    if (!canEdit) return res.status(403).json({ error: "Sem permissao." });

    const updates = [];
    const params = [];
    const historyEntries = [];

    if (req.body.title !== undefined && req.body.title !== ticket.title) {
      updates.push("title = ?");
      params.push(req.body.title);
      historyEntries.push(["Editou titulo", ticket.title, req.body.title]);
    }
    if (req.body.description !== undefined && req.body.description !== ticket.description) {
      updates.push("description = ?");
      params.push(req.body.description);
      historyEntries.push(["Editou descricao", null, null]);
    }
    if (req.body.location !== undefined && req.body.location !== ticket.location) {
      updates.push("location = ?");
      params.push(req.body.location || null);
      historyEntries.push(["Local", ticket.location, req.body.location]);
    }
    if (req.body.category !== undefined && CATEGORIES.includes(req.body.category) && req.body.category !== ticket.category) {
      updates.push("category = ?");
      params.push(req.body.category);
      historyEntries.push(["Categoria", ticket.category, req.body.category]);
    }
    if (req.body.priority !== undefined && PRIORITIES.includes(req.body.priority) && req.body.priority !== ticket.priority) {
      if (!isTiOrAdmin(req.user)) {
        return res.status(403).json({ error: "Somente TI/Admin altera prioridade." });
      }
      updates.push("priority = ?");
      params.push(req.body.priority);
      const newDue = await calculateSlaDueAt(req.body.priority, new Date(ticket.created_at));
      updates.push("sla_due_at = ?");
      params.push(newDue);
      historyEntries.push(["Prioridade", ticket.priority, req.body.priority]);
    }
    if (req.body.status !== undefined && STATUSES.includes(req.body.status) && req.body.status !== ticket.status) {
      if (!isTiOrAdmin(req.user) && !(req.body.status === "Fechado" && ticket.status === "Resolvido" && ticket.created_by_id === req.user.id)) {
        return res.status(403).json({ error: "Somente TI/Admin altera o status (exceto fechamento pelo solicitante)." });
      }
      updates.push("status = ?");
      params.push(req.body.status);
      historyEntries.push(["Status", ticket.status, req.body.status]);
      if (req.body.status === "EmAndamento" && !ticket.first_response_at) {
        updates.push("first_response_at = NOW()");
      }
      if (req.body.status === "Resolvido") updates.push("resolved_at = NOW()");
      if (req.body.status === "Fechado") updates.push("closed_at = NOW()");
    }
    if (req.body.assigned_to_id !== undefined) {
      if (!isTiOrAdmin(req.user)) return res.status(403).json({ error: "Somente TI/Admin atribui." });
      const newAssignee = req.body.assigned_to_id ? Number(req.body.assigned_to_id) : null;
      let newAssigneeName = null;
      if (newAssignee) {
        const u = await queryOne("SELECT name FROM users WHERE id = ?", [newAssignee]);
        newAssigneeName = u?.name || null;
      }
      updates.push("assigned_to_id = ?");
      params.push(newAssignee);
      updates.push("assigned_to_name = ?");
      params.push(newAssigneeName);
      historyEntries.push(["Atribuido a", ticket.assigned_to_name, newAssigneeName]);
    }

    if (!updates.length) return res.json({ message: "Nada para atualizar." });
    params.push(id);

    await withTransaction(async (conn) => {
      await conn.execute(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, params);
      for (const [action, oldV, newV] of historyEntries) {
        await recordHistory(conn, id, req.user, action, oldV, newV);
      }
    });

    const updated = await queryOne("SELECT * FROM tickets WHERE id = ?", [id]);
    res.json({ message: "Chamado atualizado.", ticket: updated });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/comments", authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ticket = await queryOne("SELECT created_by_id FROM tickets WHERE id = ?", [id]);
    if (!ticket) return res.status(404).json({ error: "Chamado nao encontrado." });
    if (isRegularUser(req.user) && ticket.created_by_id !== req.user.id) {
      return res.status(403).json({ error: "Sem acesso." });
    }
    const { message, is_internal } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Mensagem obrigatoria." });
    }
    const internalFlag = is_internal && isTiOrAdmin(req.user) ? 1 : 0;
    const result = await query(
      "INSERT INTO ticket_comments (ticket_id, user_id, user_name, message, is_internal) VALUES (?, ?, ?, ?, ?)",
      [id, req.user.id, req.user.name, String(message).trim(), internalFlag],
    );
    await query("UPDATE tickets SET updated_at = NOW() WHERE id = ?", [id]);
    if (isTiOrAdmin(req.user)) {
      await query("UPDATE tickets SET first_response_at = NOW() WHERE id = ? AND first_response_at IS NULL", [id]);
    }
    const comment = await queryOne("SELECT * FROM ticket_comments WHERE id = ?", [result.insertId]);
    res.status(201).json({ message: "Comentario adicionado.", comment });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM tickets WHERE id = ?", [id]);
    res.json({ message: "Chamado removido." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
