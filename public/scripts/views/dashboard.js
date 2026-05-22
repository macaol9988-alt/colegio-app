const Dashboard = (() => {
  const contentEl = document.getElementById("content");

  async function render(state) {
    contentEl.innerHTML = `
      <div class="welcome-card">
        <p class="eyebrow" style="color: rgba(255,255,255,0.85)">Bem-vindo(a)</p>
        <h2>Olá, ${escapeHtml(state.user.name.split(" ")[0])} 👋</h2>
        <p>Aqui está um resumo do que está acontecendo no colégio.</p>
        <div class="actions">
          ${state.user.role === "teacher" ? `<button class="btn accent" data-quick="point">${icon("point")} Registrar ponto</button>` : ""}
          <button class="btn ghost" style="background: rgba(255,255,255,0.18); color:#fff;" data-quick="tickets">${icon("tickets")} Ver chamados</button>
        </div>
      </div>
      <div id="dashStats" class="grid-cards">
        <div class="loader-block"><div class="loader"></div></div>
      </div>
      <div id="dashLists" class="grid-cards" style="margin-top: 16px;"></div>
    `;

    contentEl.querySelectorAll("[data-quick]").forEach((btn) => {
      btn.addEventListener("click", () => App.navigate(btn.dataset.quick));
    });

    await loadStats(state);
    await loadRecent(state);
  }

  async function loadStats(state) {
    try {
      const isStaff = ["admin", "coordinator", "ti"].includes(state.user.role);
      const promises = [API.get("/tickets/stats")];
      if (isStaff) promises.push(API.get("/school/stats"));
      const [ticketStats, schoolStats] = await Promise.all(promises);
      const grid = document.getElementById("dashStats");

      const cards = [];
      cards.push({
        label: "Chamados abertos",
        value: (ticketStats.stats.Aberto || 0) + (ticketStats.stats.EmAndamento || 0) + (ticketStats.stats.Aguardando || 0),
        icon: "tickets",
        kind: "",
        foot: `${ticketStats.overdue || 0} fora do SLA`,
      });
      cards.push({
        label: "Resolvidos",
        value: ticketStats.stats.Resolvido || 0,
        icon: "check",
        kind: "success",
        foot: `${ticketStats.stats.Fechado || 0} fechados`,
      });
      if (schoolStats) {
        cards.push({
          label: "Pontos pendentes",
          value: schoolStats.pendingAttendance,
          icon: "clock",
          kind: "accent",
          foot: `${schoolStats.attendance} no total`,
        });
        cards.push({
          label: "Professores",
          value: schoolStats.teachers,
          icon: "users",
          kind: "",
          foot: `${schoolStats.staff} usuários internos`,
        });
      }

      grid.innerHTML = cards
        .map(
          (c) => `
            <div class="stat-card ${c.kind}">
              <div class="stat-icon">${icon(c.icon)}</div>
              <p class="stat-label">${c.label}</p>
              <div class="stat-value">${formatNumber(c.value)}</div>
              <p class="stat-foot">${escapeHtml(c.foot)}</p>
            </div>
          `,
        )
        .join("");
    } catch (error) {
      document.getElementById("dashStats").innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  async function loadRecent(state) {
    try {
      const { tickets } = await API.get("/tickets?mine=" + (state.user.role === "teacher" ? "1" : "0"));
      const list = document.getElementById("dashLists");
      const recent = tickets.slice(0, 5);
      list.innerHTML = `
        <div class="panel" style="grid-column: 1 / -1;">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Chamados recentes</p>
              <h2>Atividade</h2>
            </div>
            <button class="btn ghost sm" data-quick="tickets">Ver todos</button>
          </div>
          ${recent.length === 0 ? `<div class="empty">${icon("tickets")}<p>Nenhum chamado por aqui.</p></div>` : ""}
          <div class="list">
            ${recent
              .map(
                (t) => `
                  <div class="list-item">
                    <div class="avatar" style="background: var(--surface-soft); box-shadow: var(--neu-in-soft); color: var(--primary);">${initials(t.created_by_name)}</div>
                    <div class="grow">
                      <strong>${escapeHtml(t.title)}</strong>
                      <small>${escapeHtml(t.ticket_number)} · ${escapeHtml(t.category)}</small>
                    </div>
                    ${priorityChip(t.priority)}
                    ${statusChip(t.status)}
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
      `;
      list.querySelector("[data-quick]")?.addEventListener("click", () => App.navigate("tickets"));
    } catch (error) {
      document.getElementById("dashLists").innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  return { render };
})();
