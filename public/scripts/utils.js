// Utilidades compartilhadas (formatadores, toast, modal, etc.)

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value, opts = { dateStyle: "short", timeStyle: "short" }) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", opts).format(new Date(value));
}

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(Number(value))) return "--";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}

function formatRelative(value) {
  if (!value) return "--";
  const date = new Date(value);
  const diff = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const fmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (abs < 60) return fmt.format(Math.round(diff), "seconds");
  if (abs < 3600) return fmt.format(Math.round(diff / 60), "minutes");
  if (abs < 86400) return fmt.format(Math.round(diff / 3600), "hours");
  return fmt.format(Math.round(diff / 86400), "days");
}

function formatCpfInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  let result = digits;
  if (digits.length > 9) result = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  else if (digits.length > 6) result = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  else if (digits.length > 3) result = `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return result;
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const Toast = (() => {
  const el = document.getElementById("toast");
  let timeout = null;
  return (message, type = "info") => {
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type === "info" ? "" : type}`;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => el.classList.remove("show"), 3500);
  };
})();

const Modal = (() => {
  const backdrop = document.getElementById("modalBackdrop");
  const titleEl = document.getElementById("modalTitle");
  const eyebrowEl = document.getElementById("modalEyebrow");
  const bodyEl = document.getElementById("modalBody");
  const closeBtn = document.getElementById("modalClose");

  function open({ eyebrow = "", title = "", body = "", lg = false }) {
    eyebrowEl.textContent = eyebrow;
    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    backdrop.querySelector(".modal").classList.toggle("lg", !!lg);
    backdrop.classList.add("open");
    document.body.classList.add("no-scroll");
    return bodyEl;
  }

  function close() {
    backdrop.classList.remove("open");
    document.body.classList.remove("no-scroll");
    bodyEl.innerHTML = "";
  }

  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && backdrop.classList.contains("open")) close();
  });

  return { open, close, bodyEl };
})();

function debounce(fn, ms = 250) {
  let id = null;
  return (...args) => {
    if (id) clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

function priorityChip(priority) {
  return `<span class="chip priority-${priority}"><span class="dot"></span>${priority}</span>`;
}

function statusChip(status) {
  const label = status === "EmAndamento" ? "Em andamento" : status;
  return `<span class="chip status-${status}">${label}</span>`;
}

function slaInfo(ticket) {
  if (!ticket.sla_due_at) return { state: "none", label: "Sem SLA" };
  if (ticket.status === "Resolvido" || ticket.status === "Fechado") return { state: "done", label: "Concluido" };
  const due = new Date(ticket.sla_due_at).getTime();
  const remaining = due - Date.now();
  const hours = Math.floor(Math.abs(remaining) / 3_600_000);
  const minutes = Math.floor((Math.abs(remaining) % 3_600_000) / 60_000);
  const human = `${hours}h${String(minutes).padStart(2, "0")}m`;
  if (remaining < 0) return { state: "overdue", label: `Atrasado ${human}` };
  if (remaining < 3_600_000) return { state: "warning", label: `${human} restantes` };
  return { state: "ok", label: `${human} restantes` };
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-toggle-password]");
  if (toggle) {
    const id = toggle.dataset.togglePassword;
    const input = document.getElementById(id);
    if (input) input.type = input.type === "password" ? "text" : "password";
  }
});
