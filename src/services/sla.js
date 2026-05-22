const { queryOne } = require("../db");

const FALLBACK_HOURS = {
  Critica: 2,
  Alta: 8,
  Media: 24,
  Baixa: 72,
};

async function calculateSlaDueAt(priority, fromDate = new Date()) {
  const settings = await queryOne("SELECT sla_critical_hours, sla_high_hours, sla_medium_hours, sla_low_hours FROM school_settings WHERE id = 1");
  const hours = (() => {
    if (!settings) return FALLBACK_HOURS[priority] ?? 24;
    if (priority === "Critica") return Number(settings.sla_critical_hours) || FALLBACK_HOURS.Critica;
    if (priority === "Alta") return Number(settings.sla_high_hours) || FALLBACK_HOURS.Alta;
    if (priority === "Media") return Number(settings.sla_medium_hours) || FALLBACK_HOURS.Media;
    if (priority === "Baixa") return Number(settings.sla_low_hours) || FALLBACK_HOURS.Baixa;
    return FALLBACK_HOURS[priority] ?? 24;
  })();

  const due = new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
  return due;
}

function slaState(ticket) {
  if (!ticket.sla_due_at) return { state: "none", remainingMs: null };
  if (ticket.status === "Resolvido" || ticket.status === "Fechado") {
    return { state: "done", remainingMs: 0 };
  }
  const due = new Date(ticket.sla_due_at).getTime();
  const now = Date.now();
  const remainingMs = due - now;
  if (remainingMs < 0) return { state: "overdue", remainingMs };
  if (remainingMs < 1000 * 60 * 60) return { state: "warning", remainingMs };
  return { state: "ok", remainingMs };
}

module.exports = { calculateSlaDueAt, slaState, FALLBACK_HOURS };
