const Admin = (() => {
  const contentEl = document.getElementById("content");

  // -------------------- USERS --------------------
  async function renderUsers(state) {
    contentEl.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Equipe</p>
            <h2>Usuários do sistema</h2>
          </div>
          <div class="panel-actions">
            <input class="input" id="userSearch" placeholder="Buscar nome, e-mail, CPF..." style="min-width: 240px;" />
            <select class="select" id="userRoleFilter">
              <option value="">Todos perfis</option>
              <option value="teacher">Professor</option>
              <option value="coordinator">Coordenação</option>
              <option value="ti">TI</option>
              <option value="admin">Admin</option>
            </select>
            <select class="select" id="userStatusFilter">
              <option value="">Todos status</option>
              <option value="pending">Pendentes</option>
              <option value="active">Ativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
            <button class="btn primary" id="newUserBtn">${icon("plus")} Novo usuário</button>
          </div>
        </div>
        <div id="userListBox"><div class="loader-block"><div class="loader"></div></div></div>
      </div>
    `;
    document.getElementById("newUserBtn").addEventListener("click", openNewUserModal);
    const reload = debounce(reloadUsers, 250);
    document.getElementById("userSearch").addEventListener("input", reload);
    document.getElementById("userRoleFilter").addEventListener("change", reloadUsers);
    document.getElementById("userStatusFilter").addEventListener("change", reloadUsers);
    await reloadUsers();
  }

  async function reloadUsers() {
    const search = document.getElementById("userSearch")?.value || "";
    const role = document.getElementById("userRoleFilter")?.value || "";
    const status = document.getElementById("userStatusFilter")?.value || "";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    const box = document.getElementById("userListBox");
    if (!box) return;
    try {
      const { users } = await API.get(`/users?${params.toString()}`);
      if (!users.length) {
        box.innerHTML = `<div class="empty">${icon("users")}<p>Nenhum usuário encontrado.</p></div>`;
        return;
      }
      box.innerHTML = `
        <div class="list">
          ${users.map(userRow).join("")}
        </div>
      `;
      box.querySelectorAll("[data-user-action]").forEach((btn) => {
        btn.addEventListener("click", () => handleUserAction(btn.dataset.userAction, Number(btn.dataset.userId), btn.dataset.userName));
      });
    } catch (error) {
      box.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function userRow(u) {
    const roleLabel = App.roleLabel(u.role);
    const statusKind = u.status === "active" ? "success" : u.status === "pending" ? "warning" : "danger";
    return `
      <div class="list-item">
        <div class="avatar">${initials(u.name)}</div>
        <div class="grow">
          <strong>${escapeHtml(u.name)}</strong>
          <small>${escapeHtml(u.email)} ${u.cpf ? ` · ${escapeHtml(u.cpf)}` : ""}</small>
        </div>
        <span class="chip ghost">${escapeHtml(roleLabel)}</span>
        <span class="chip ${statusKind}">${u.status === "active" ? "Ativo" : u.status === "pending" ? "Pendente" : "Bloqueado"}</span>
        <div class="actions">
          ${u.status === "pending" ? `<button class="btn sm primary" data-user-action="activate" data-user-id="${u.id}" title="Ativar">${icon("check")}</button>` : ""}
          ${u.status === "pending" ? `<button class="btn sm ghost" data-user-action="invite" data-user-id="${u.id}" title="Reenviar convite">${icon("send")}</button>` : ""}
          <button class="btn sm ghost" data-user-action="reset" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}" title="Redefinir senha">${icon("unlock")}</button>
          ${u.status === "active" ? `<button class="btn sm ghost" data-user-action="block" data-user-id="${u.id}" title="Bloquear">${icon("block")}</button>` : ""}
          <button class="btn sm ghost" data-user-action="delete" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}" title="Remover" style="color: var(--danger);">${icon("trash")}</button>
        </div>
      </div>
    `;
  }

  async function handleUserAction(action, id, name) {
    try {
      if (action === "activate") {
        await API.post(`/users/${id}/activate`);
        Toast("Usuário ativado.", "success");
      } else if (action === "invite") {
        const data = await API.post(`/users/${id}/send-invite`);
        Toast(data.message, "info");
        if (data.activationLink) {
          prompt("Link de ativação:", data.activationLink);
        }
      } else if (action === "block") {
        if (!confirm("Bloquear este usuário?")) return;
        await API.post(`/users/${id}/block`);
        Toast("Usuário bloqueado.", "info");
      } else if (action === "reset") {
        const pwd = prompt(`Nova senha para ${name}:`);
        if (!pwd) return;
        await API.post(`/users/${id}/reset-password`, { newPassword: pwd });
        Toast("Senha redefinida.", "success");
      } else if (action === "delete") {
        if (!confirm(`Remover ${name}? Esta ação não pode ser desfeita.`)) return;
        await API.delete(`/users/${id}`);
        Toast("Usuário removido.", "info");
      }
      reloadUsers();
    } catch (error) { Toast(error.message, "error"); }
  }

  function openNewUserModal() {
    Modal.open({
      eyebrow: "Equipe",
      title: "Adicionar usuário",
      body: `
        <form id="newUserForm" class="stack">
          <div class="field"><label>Nome</label><input class="input" name="name" required /></div>
          <div class="field"><label>E-mail</label><input class="input" name="email" type="email" required /></div>
          <div class="field"><label>CPF (opcional)</label><input class="input" name="cpf" maxlength="14" /></div>
          <div class="field"><label>Telefone (opcional)</label><input class="input" name="phone" /></div>
          <div class="field">
            <label>Perfil</label>
            <select class="select" name="role" required>
              <option value="teacher">Professor</option>
              <option value="coordinator">Coordenação</option>
              <option value="ti">TI</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="field">
            <label>Senha inicial (deixe vazio para gerar automática)</label>
            <input class="input" name="password" type="text" />
          </div>
          <label class="row gap-sm" style="cursor:pointer">
            <input type="checkbox" name="sendInvite" checked /> <span>Enviar convite por e-mail (recomendado)</span>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn ghost" id="cancelNewUser">Cancelar</button>
            <button type="submit" class="btn primary">${icon("plus")} Criar usuário</button>
          </div>
        </form>
      `,
    });
    document.getElementById("cancelNewUser").addEventListener("click", Modal.close);
    document.querySelector("#newUserForm input[name=cpf]").addEventListener("input", (event) => {
      event.target.value = formatCpfInput(event.target.value);
    });
    document.getElementById("newUserForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      data.sendInvite = !!data.sendInvite;
      try {
        const res = await API.post("/users", data);
        let msg = "Usuário criado.";
        if (res.tempPassword) msg += ` Senha: ${res.tempPassword}`;
        if (res.activationLink) msg += ` | Link: ${res.activationLink}`;
        Toast(msg, "success");
        Modal.close();
        reloadUsers();
      } catch (error) { Toast(error.message, "error"); }
    });
  }

  // -------------------- SETTINGS --------------------
  async function renderSettings(state) {
    contentEl.innerHTML = `<div class="loader-block"><div class="loader"></div></div>`;
    try {
      const { settings } = await API.get("/school");
      contentEl.innerHTML = `
        <div class="tabs" id="adminTabs">
          <button class="tab active" data-tab="school">${icon("admin")} Dados do colégio</button>
          <button class="tab" data-tab="geo">${icon("point")} Geocerca</button>
          <button class="tab" data-tab="sla">${icon("clock")} SLA & Chamados</button>
          <button class="tab" data-tab="security">${icon("unlock")} Segurança</button>
        </div>
        <div id="adminTabContent"></div>
      `;
      const tabs = contentEl.querySelectorAll("#adminTabs .tab");
      tabs.forEach((t) => t.addEventListener("click", () => {
        tabs.forEach((x) => x.classList.toggle("active", x === t));
        showTab(t.dataset.tab, settings);
      }));
      showTab("school", settings);
    } catch (error) {
      contentEl.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function showTab(tab, settings) {
    const target = document.getElementById("adminTabContent");
    if (tab === "school") return renderSchoolTab(target, settings);
    if (tab === "geo") return renderGeoTab(target, settings);
    if (tab === "sla") return renderSlaTab(target, settings);
    if (tab === "security") return renderSecurityTab(target, settings);
  }

  function renderSchoolTab(target, s) {
    target.innerHTML = `
      <div class="admin-grid">
        <div class="panel">
          <p class="eyebrow">Identidade</p>
          <h3 style="margin-bottom: 14px;">Dados do colégio</h3>
          <form id="schoolForm" class="stack">
            <div class="field"><label>Nome do colégio</label><input class="input" name="name" value="${escapeHtml(s.name || "")}" required /></div>
            <div class="field"><label>CNPJ</label><input class="input" name="cnpj" value="${escapeHtml(s.cnpj || "")}" placeholder="00.000.000/0000-00" /></div>
            <div class="field"><label>Endereço</label><input class="input" name="address" value="${escapeHtml(s.address || "")}" /></div>
            <div class="field"><label>Telefone</label><input class="input" name="phone" value="${escapeHtml(s.phone || "")}" /></div>
            <div class="field"><label>E-mail de contato</label><input class="input" type="email" name="email" value="${escapeHtml(s.email || "")}" /></div>
            <div class="row gap-md">
              <div class="field" style="flex:1">
                <label>Cor primária</label>
                <input class="color-input" type="color" name="primary_color" value="${escapeHtml(s.primary_color || "#6c5ce7")}" />
              </div>
              <div class="field" style="flex:1">
                <label>Cor de destaque</label>
                <input class="color-input" type="color" name="accent_color" value="${escapeHtml(s.accent_color || "#fd79a8")}" />
              </div>
            </div>
            <button class="btn primary block" type="submit">${icon("check")} Salvar dados</button>
          </form>
        </div>

        <div class="panel">
          <p class="eyebrow">Marca</p>
          <h3 style="margin-bottom: 14px;">Logo do colégio</h3>
          <label class="logo-uploader" for="logoInput">
            <img id="logoPreview" src="${escapeHtml(s.logo_path || "")}" onerror="this.style.display='none'" alt="Logo atual" ${s.logo_path ? "" : "style='display:none'"}/>
            ${icon("upload")}
            <strong>${s.logo_path ? "Trocar logo" : "Enviar logo"}</strong>
            <small class="muted">PNG, JPG, WEBP ou SVG até 4 MB</small>
            <input type="file" id="logoInput" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
          </label>
          ${s.logo_path ? `<button class="btn ghost block sm" id="removeLogo" style="margin-top: 10px;">${icon("trash")} Remover logo</button>` : ""}
        </div>
      </div>
    `;
    document.getElementById("schoolForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      try {
        const res = await API.put("/school", data);
        Toast("Configurações salvas.", "success");
        App.applyBranding(res.settings);
      } catch (error) { Toast(error.message, "error"); }
    });
    document.getElementById("logoInput").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const form = new FormData();
      form.append("logo", file);
      try {
        const res = await API.upload("/school/logo", form);
        Toast("Logo atualizada.", "success");
        const reload = await API.get("/school");
        App.applyBranding(reload.settings);
        renderSchoolTab(target, reload.settings);
      } catch (error) { Toast(error.message, "error"); }
    });
    document.getElementById("removeLogo")?.addEventListener("click", async () => {
      try {
        await API.delete("/school/logo");
        Toast("Logo removida.", "info");
        const reload = await API.get("/school");
        App.applyBranding(reload.settings);
        renderSchoolTab(target, reload.settings);
      } catch (error) { Toast(error.message, "error"); }
    });
  }

  function renderGeoTab(target, s) {
    target.innerHTML = `
      <div class="panel">
        <p class="eyebrow">Localização</p>
        <h3>Geocerca da escola</h3>
        <p class="subtitle" style="margin-bottom: 14px;">Defina o ponto da escola e o raio máximo aceito para registro de ponto.</p>
        <form id="geoForm" class="stack">
          <div class="row gap-md">
            <div class="field" style="flex:1">
              <label>Latitude</label>
              <input class="input" name="school_lat" type="number" step="0.0000001" value="${escapeHtml(s.school_lat)}" required />
            </div>
            <div class="field" style="flex:1">
              <label>Longitude</label>
              <input class="input" name="school_lng" type="number" step="0.0000001" value="${escapeHtml(s.school_lng)}" required />
            </div>
          </div>
          <div class="row gap-md">
            <div class="field" style="flex:1">
              <label>Raio permitido (m)</label>
              <input class="input" name="allowed_radius" type="number" min="10" max="2000" value="${escapeHtml(s.allowed_radius)}" required />
            </div>
            <div class="field" style="flex:1">
              <label>Precisão máxima do GPS (m)</label>
              <input class="input" name="max_accuracy" type="number" min="5" max="500" value="${escapeHtml(s.max_accuracy)}" required />
            </div>
          </div>
          <h4 style="margin-top: 8px;">Janelas de aula</h4>
          <div class="row gap-md">
            <div class="field" style="flex:1"><label>Manhã início</label><input class="input" type="time" name="class_morning_start" value="${escapeHtml((s.class_morning_start || "").slice(0,5))}" /></div>
            <div class="field" style="flex:1"><label>Manhã fim</label><input class="input" type="time" name="class_morning_end" value="${escapeHtml((s.class_morning_end || "").slice(0,5))}" /></div>
          </div>
          <div class="row gap-md">
            <div class="field" style="flex:1"><label>Tarde início</label><input class="input" type="time" name="class_afternoon_start" value="${escapeHtml((s.class_afternoon_start || "").slice(0,5))}" /></div>
            <div class="field" style="flex:1"><label>Tarde fim</label><input class="input" type="time" name="class_afternoon_end" value="${escapeHtml((s.class_afternoon_end || "").slice(0,5))}" /></div>
          </div>
          <button class="btn primary block" type="submit">${icon("check")} Salvar geocerca</button>
        </form>
        <div id="geoMap" style="height: 280px; border-radius: var(--radius-xl); margin-top: 18px; box-shadow: var(--neu-in-soft); overflow: hidden;"></div>
      </div>
    `;
    document.getElementById("geoForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      try {
        const res = await API.put("/school", data);
        Toast("Geocerca salva.", "success");
        App.applyBranding(res.settings);
      } catch (error) { Toast(error.message, "error"); }
    });
    if (window.L) {
      const m = L.map("geoMap", { zoomControl: true, attributionControl: false }).setView([Number(s.school_lat), Number(s.school_lng)], 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(m);
      const marker = L.marker([Number(s.school_lat), Number(s.school_lng)], { draggable: true }).addTo(m);
      const circle = L.circle([Number(s.school_lat), Number(s.school_lng)], {
        radius: Number(s.allowed_radius),
        color: "#6c5ce7", fillColor: "#6c5ce7", fillOpacity: 0.15, weight: 2,
      }).addTo(m);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        document.querySelector("#geoForm input[name=school_lat]").value = pos.lat.toFixed(7);
        document.querySelector("#geoForm input[name=school_lng]").value = pos.lng.toFixed(7);
        circle.setLatLng(pos);
      });
      document.querySelector("#geoForm input[name=allowed_radius]").addEventListener("input", (event) => {
        circle.setRadius(Number(event.target.value));
      });
      setTimeout(() => m.invalidateSize(), 200);
    }
  }

  function renderSlaTab(target, s) {
    target.innerHTML = `
      <div class="panel">
        <p class="eyebrow">Suporte</p>
        <h3>SLA por prioridade</h3>
        <p class="subtitle" style="margin-bottom: 14px;">Tempo máximo (em horas) para resolução de cada prioridade.</p>
        <form id="slaForm" class="stack">
          <div class="row gap-md">
            <div class="field" style="flex:1"><label>Crítica (h)</label><input class="input" type="number" name="sla_critical_hours" min="1" value="${escapeHtml(s.sla_critical_hours)}" /></div>
            <div class="field" style="flex:1"><label>Alta (h)</label><input class="input" type="number" name="sla_high_hours" min="1" value="${escapeHtml(s.sla_high_hours)}" /></div>
          </div>
          <div class="row gap-md">
            <div class="field" style="flex:1"><label>Média (h)</label><input class="input" type="number" name="sla_medium_hours" min="1" value="${escapeHtml(s.sla_medium_hours)}" /></div>
            <div class="field" style="flex:1"><label>Baixa (h)</label><input class="input" type="number" name="sla_low_hours" min="1" value="${escapeHtml(s.sla_low_hours)}" /></div>
          </div>
          <button class="btn primary block" type="submit">${icon("check")} Salvar SLA</button>
        </form>
      </div>
    `;
    document.getElementById("slaForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      try {
        await API.put("/school", data);
        Toast("SLA atualizado.", "success");
      } catch (error) { Toast(error.message, "error"); }
    });
  }

  function renderSecurityTab(target, s) {
    target.innerHTML = `
      <div class="panel">
        <p class="eyebrow">Acessos</p>
        <h3>Política de cadastro</h3>
        <form id="securityForm" class="stack" style="margin-top: 12px;">
          <label class="row gap-md" style="cursor:pointer; padding: 10px; background: var(--surface-soft); border-radius: var(--radius-md); box-shadow: var(--neu-in-soft);">
            <input type="checkbox" name="allow_self_register" ${Number(s.allow_self_register) ? "checked" : ""} />
            <div>
              <strong>Permitir auto-cadastro</strong>
              <p class="subtitle">Quando ligado, professores podem criar a conta sozinhos (ficam como pendentes até a sua aprovação).</p>
            </div>
          </label>
          <button class="btn primary" type="submit">${icon("check")} Salvar</button>
        </form>
      </div>
    `;
    document.getElementById("securityForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const checked = event.target.querySelector("[name=allow_self_register]").checked;
      try {
        await API.put("/school", { allow_self_register: checked ? 1 : 0 });
        Toast("Política atualizada.", "success");
      } catch (error) { Toast(error.message, "error"); }
    });
  }

  return { renderUsers, renderSettings };
})();
