const Tickets = (() => {
  const contentEl = document.getElementById("content");
  let slaTimer = null;

  async function render(state) {
    const canManage = ["admin", "ti"].includes(state.user.role);
    contentEl.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Suporte</p>
            <h2>Chamados</h2>
          </div>
          <div class="panel-actions">
            <input class="input" id="ticketSearch" placeholder="Buscar título, número..." style="min-width: 220px;" />
            <select class="select" id="ticketPriorityFilter">
              <option value="">Todas prioridades</option>
              <option value="Critica">Crítica</option>
              <option value="Alta">Alta</option>
              <option value="Media">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
            <button class="btn primary" id="newTicketBtn">${icon("plus")} Novo chamado</button>
          </div>
        </div>
        <div class="kanban-board" id="kanbanBoard">
          <div class="loader-block"><div class="loader"></div></div>
        </div>
      </div>
    `;

    document.getElementById("newTicketBtn").addEventListener("click", openNewTicketModal);
    document.getElementById("ticketSearch").addEventListener("input", debounce(reload, 300));
    document.getElementById("ticketPriorityFilter").addEventListener("change", reload);

    App.setFab(true, openNewTicketModal);
    await reload();
    if (slaTimer) clearInterval(slaTimer);
    slaTimer = setInterval(updateSlaCounters, 60000);
  }

  async function reload() {
    const board = document.getElementById("kanbanBoard");
    if (!board) return;
    const search = document.getElementById("ticketSearch")?.value || "";
    const priority = document.getElementById("ticketPriorityFilter")?.value || "";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (priority) params.set("priority", priority);

    try {
      const { tickets } = await API.get(`/tickets?${params.toString()}`);
      renderBoard(tickets);
    } catch (error) {
      board.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function renderBoard(tickets) {
    const board = document.getElementById("kanbanBoard");
    const columns = ["Aberto", "EmAndamento", "Aguardando", "Resolvido", "Fechado"];
    const labels = {
      Aberto: "Aberto",
      EmAndamento: "Em andamento",
      Aguardando: "Aguardando",
      Resolvido: "Resolvido",
      Fechado: "Fechado",
    };
    const grouped = Object.fromEntries(columns.map((c) => [c, []]));
    tickets.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });
    board.innerHTML = columns
      .map((col) => `
        <div class="kanban-col" data-status="${col}">
          <header>
            <strong>${labels[col]}</strong>
            <span class="count">${grouped[col].length}</span>
          </header>
          <div class="kanban-list">
            ${grouped[col].length === 0 ? `<div class="empty"><small>Sem chamados aqui.</small></div>` : ""}
            ${grouped[col].map(cardHtml).join("")}
          </div>
        </div>
      `)
      .join("");
    board.querySelectorAll("[data-ticket-id]").forEach((card) => {
      card.addEventListener("click", () => openDetail(Number(card.dataset.ticketId)));
    });
  }

  function cardHtml(t) {
    const sla = slaInfo(t);
    return `
      <article class="ticket-card" data-ticket-id="${t.id}" data-priority="${t.priority}">
        <div class="ticket-head">
          <span class="num">${escapeHtml(t.ticket_number)}</span>
          ${priorityChip(t.priority)}
        </div>
        <h4>${escapeHtml(t.title)}</h4>
        <div class="ticket-meta">
          <span class="chip ghost">${escapeHtml(t.category)}</span>
          ${t.assigned_to_name ? `<span class="chip ghost">${icon("user")} ${escapeHtml(t.assigned_to_name)}</span>` : ""}
        </div>
        <div class="ticket-foot">
          <span>${icon("user")} ${escapeHtml(t.created_by_name)}</span>
          <span class="sla ${sla.state}" data-sla="${t.sla_due_at || ""}" data-status="${t.status}">${icon("clock")} ${escapeHtml(sla.label)}</span>
        </div>
      </article>
    `;
  }

  function updateSlaCounters() {
    document.querySelectorAll(".sla[data-sla]").forEach((el) => {
      const due = el.dataset.sla;
      const status = el.dataset.status;
      if (!due) return;
      const info = slaInfo({ sla_due_at: due, status });
      el.className = `sla ${info.state}`;
      el.innerHTML = `${icon("clock")} ${escapeHtml(info.label)}`;
    });
  }

  function openNewTicketModal() {
    Modal.open({
      eyebrow: "Suporte",
      title: "Abrir novo chamado",
      body: `
        <form id="newTicketForm" class="stack">
          <div class="field">
            <label>Título</label>
            <input class="input" name="title" required maxlength="200" placeholder="Ex.: Computador da sala 12 não liga" />
          </div>
          <div class="field">
            <label>Descrição</label>
            <textarea class="textarea" name="description" required minlength="10"></textarea>
          </div>
          <div class="field">
            <label>Categoria</label>
            <select class="select" name="category" required>
              <option>Rede</option><option>Hardware</option><option>Software</option>
              <option>Impressora</option><option>Telefonia</option><option>Acesso</option><option>Outros</option>
            </select>
          </div>
          <div class="field">
            <label>Prioridade</label>
            <select class="select" name="priority" required>
              <option value="Baixa">Baixa</option>
              <option value="Media" selected>Média</option>
              <option value="Alta">Alta</option>
              <option value="Critica">Crítica</option>
            </select>
          </div>
          <div class="field">
            <label>Local (sala, setor)</label>
            <input class="input" name="location" placeholder="Ex.: Sala 12, Secretaria" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" id="cancelNewTicket">Cancelar</button>
            <button type="submit" class="btn primary">${icon("send")} Abrir chamado</button>
          </div>
        </form>
      `,
    });
    document.getElementById("cancelNewTicket").addEventListener("click", Modal.close);
    document.getElementById("newTicketForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(event.target).entries());
      try {
        await API.post("/tickets", form);
        Toast("Chamado aberto.", "success");
        Modal.close();
        reload();
      } catch (error) {
        Toast(error.message, "error");
      }
    });
  }

  async function openDetail(id) {
    Modal.open({
      eyebrow: "Carregando",
      title: "Detalhes do chamado",
      body: `<div class="loader-block"><div class="loader"></div></div>`,
      lg: true,
    });
    try {
      const { ticket, comments, history } = await API.get(`/tickets/${id}`);
      const state = App.state;
      const canManage = ["admin", "ti"].includes(state.user.role);
      const sla = slaInfo(ticket);

      Modal.bodyEl.innerHTML = `
        <div class="ticket-detail">
          <div>
            <div class="row gap-md" style="margin-bottom: 14px;">
              <span class="num" style="font-weight:800;color:var(--muted)">${escapeHtml(ticket.ticket_number)}</span>
              ${priorityChip(ticket.priority)}
              ${statusChip(ticket.status)}
              <span class="chip ${sla.state}">${icon("clock")} ${escapeHtml(sla.label)}</span>
            </div>
            <h2 style="margin-bottom: 8px;">${escapeHtml(ticket.title)}</h2>
            <p style="margin-bottom: 14px; color: var(--ink); white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
            ${ticket.location ? `<p class="subtitle"><strong>Local:</strong> ${escapeHtml(ticket.location)}</p>` : ""}

            <h3 style="margin-top: 22px;">Comentários</h3>
            <div class="comments" id="commentsList" style="margin-top: 10px;">
              ${comments.length === 0 ? `<div class="empty"><small>Nenhum comentário ainda.</small></div>` : ""}
              ${comments.map(commentHtml).join("")}
            </div>

            <form id="addCommentForm" class="stack" style="margin-top: 14px;">
              <div class="field">
                <label>Adicionar comentário</label>
                <textarea class="textarea" name="message" required minlength="2"></textarea>
              </div>
              <div class="row" style="justify-content: space-between;">
                ${canManage ? `<label class="row gap-sm" style="cursor:pointer"><input type="checkbox" name="internal" /> <span class="subtitle">Comentário interno (TI/Admin)</span></label>` : "<span></span>"}
                <button type="submit" class="btn primary sm">${icon("send")} Enviar</button>
              </div>
            </form>
          </div>

          <aside class="stack">
            ${canManage ? renderManageBox(ticket) : ""}
            ${
              !canManage && ticket.status === "Resolvido" && ticket.created_by_id === state.user.id
                ? `<button class="btn success block" data-close-ticket>${icon("check")} Confirmar resolução</button>`
                : ""
            }
            <div class="neu-card flat">
              <p class="eyebrow">Informações</p>
              <p><strong>Solicitante:</strong> ${escapeHtml(ticket.created_by_name)}</p>
              ${ticket.assigned_to_name ? `<p><strong>Atribuído a:</strong> ${escapeHtml(ticket.assigned_to_name)}</p>` : ""}
              <p><strong>Categoria:</strong> ${escapeHtml(ticket.category)}</p>
              <p><strong>Aberto em:</strong> ${formatDate(ticket.created_at)}</p>
              ${ticket.resolved_at ? `<p><strong>Resolvido em:</strong> ${formatDate(ticket.resolved_at)}</p>` : ""}
            </div>
            <div class="neu-card flat">
              <p class="eyebrow">Histórico</p>
              <div class="history-list" style="margin-top: 8px;">
                ${history.map(historyHtml).join("")}
              </div>
            </div>
          </aside>
        </div>
      `;

      document.getElementById("addCommentForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = new FormData(event.target);
        try {
          await API.post(`/tickets/${id}/comments`, { message: form.get("message"), is_internal: !!form.get("internal") });
          openDetail(id);
        } catch (error) { Toast(error.message, "error"); }
      });

      document.querySelector("[data-close-ticket]")?.addEventListener("click", async () => {
        try {
          await API.patch(`/tickets/${id}`, { status: "Fechado" });
          Toast("Chamado fechado.", "success");
          Modal.close();
          reload();
        } catch (error) { Toast(error.message, "error"); }
      });

      bindManageBox(ticket);
    } catch (error) {
      Modal.bodyEl.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function renderManageBox(ticket) {
    return `
      <div class="neu-card stack">
        <p class="eyebrow">Ações de TI</p>
        <div class="field">
          <label>Status</label>
          <select class="select" id="manageStatus">
            ${["Aberto", "EmAndamento", "Aguardando", "Resolvido", "Fechado"]
              .map((s) => `<option value="${s}" ${s === ticket.status ? "selected" : ""}>${s === "EmAndamento" ? "Em andamento" : s}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field">
          <label>Prioridade</label>
          <select class="select" id="managePriority">
            ${["Critica", "Alta", "Media", "Baixa"]
              .map((p) => `<option value="${p}" ${p === ticket.priority ? "selected" : ""}>${p}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field">
          <label>Atribuído a</label>
          <select class="select" id="manageAssign">
            <option value="">Ninguém</option>
          </select>
        </div>
        <button class="btn primary" id="saveManageBtn">${icon("check")} Salvar alterações</button>
        <button class="btn ghost danger" id="deleteTicketBtn" style="color: var(--danger);">${icon("trash")} Remover chamado</button>
      </div>
    `;
  }

  async function bindManageBox(ticket) {
    const assignSelect = document.getElementById("manageAssign");
    if (!assignSelect) return;
    try {
      const { users } = await API.get("/users?role=ti");
      const { users: admins } = await API.get("/users?role=admin");
      [...users, ...admins].forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = `${u.name} (${u.role === "ti" ? "TI" : "Admin"})`;
        if (u.id === ticket.assigned_to_id) opt.selected = true;
        assignSelect.appendChild(opt);
      });
    } catch {}

    document.getElementById("saveManageBtn")?.addEventListener("click", async () => {
      const status = document.getElementById("manageStatus").value;
      const priority = document.getElementById("managePriority").value;
      const assigned = document.getElementById("manageAssign").value;
      try {
        await API.patch(`/tickets/${ticket.id}`, {
          status, priority,
          assigned_to_id: assigned ? Number(assigned) : null,
        });
        Toast("Chamado atualizado.", "success");
        openDetail(ticket.id);
        reload();
      } catch (error) { Toast(error.message, "error"); }
    });

    document.getElementById("deleteTicketBtn")?.addEventListener("click", async () => {
      if (!confirm(`Remover o chamado ${ticket.ticket_number}?`)) return;
      try {
        await API.delete(`/tickets/${ticket.id}`);
        Toast("Chamado removido.", "info");
        Modal.close();
        reload();
      } catch (error) { Toast(error.message, "error"); }
    });
  }

  function commentHtml(c) {
    return `
      <div class="comment ${c.is_internal ? "internal" : ""}">
        <header>
          <div class="avatar" style="width:32px;height:32px;font-size:0.7rem">${initials(c.user_name)}</div>
          <strong>${escapeHtml(c.user_name)}</strong>
          ${c.is_internal ? `<span class="chip warning" style="font-size:0.65rem">Interno</span>` : ""}
          <time>${formatDate(c.created_at)}</time>
        </header>
        <p>${escapeHtml(c.message)}</p>
      </div>
    `;
  }

  function historyHtml(h) {
    const value = h.new_value && h.old_value ? `${h.old_value} → ${h.new_value}` : (h.new_value || "");
    return `
      <div class="history-item">
        <div class="dot"></div>
        <div class="content">
          <span><strong>${escapeHtml(h.user_name)}</strong> ${escapeHtml(h.action)} ${value ? `· ${escapeHtml(value)}` : ""}</span>
          <time>${formatDate(h.created_at)}</time>
        </div>
      </div>
    `;
  }

  return { render };
})();
