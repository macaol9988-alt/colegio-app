const Attendance = (() => {
  const contentEl = document.getElementById("content");
  let map = null;
  let schoolCircle = null;
  let teacherMarker = null;
  let watchId = null;
  let currentPosition = null;
  let lastTap = 0;
  let pendingPosition = null;
  let regBtnTimeout = null;

  // ----------------- TEACHER VIEW -----------------
  async function renderTeacher(state) {
    contentEl.innerHTML = `
      <div class="point-shell">
        <div class="point-map" id="pointMap"></div>
        <div class="point-stats">
          <div class="point-stat ok" id="gpsStatusBox">
            <span>Status</span>
            <strong id="gpsStatus">Buscando GPS</strong>
          </div>
          <div class="point-stat">
            <span>Precisão</span>
            <strong id="gpsAccuracy">--</strong>
          </div>
          <div class="point-stat">
            <span>Distância</span>
            <strong id="gpsDistance">--</strong>
          </div>
        </div>
        <button class="point-register ready" id="registerPointBtn">${icon("point")} Toque 2 vezes para registrar ponto</button>
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Histórico</p>
              <h2>Meus registros</h2>
            </div>
            <button class="btn ghost sm" id="refreshRecords">${icon("refresh")} Atualizar</button>
          </div>
          <div id="myRecordsList"><div class="loader-block"><div class="loader"></div></div></div>
        </div>
      </div>
    `;

    initMap(state.settings);
    startWatch();

    document.getElementById("registerPointBtn").addEventListener("click", handleRegisterIntent);
    document.getElementById("refreshRecords").addEventListener("click", () => loadMyRecords());

    loadMyRecords();
  }

  function initMap(settings) {
    if (!window.L) return;
    const center = [Number(settings?.school_lat || -23.55), Number(settings?.school_lng || -46.63)];
    if (map) {
      map.remove();
      map = null;
    }
    map = L.map("pointMap", { zoomControl: false, attributionControl: false }).setView(center, 17);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(map);
    schoolCircle = L.circle(center, {
      radius: Number(settings?.allowed_radius || 120),
      color: "#6c5ce7",
      fillColor: "#6c5ce7",
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }

  function startWatch() {
    if (!navigator.geolocation) {
      setStatus("GPS indisponível", "danger");
      return;
    }
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        currentPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        updateMarker();
        updateStats();
      },
      (error) => {
        setStatus("GPS indisponível", "danger");
        Toast(error.message || "Não foi possível obter a localização.", "error");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  function updateMarker() {
    if (!map || !currentPosition) return;
    const latLng = [currentPosition.lat, currentPosition.lng];
    if (!teacherMarker) teacherMarker = L.marker(latLng).addTo(map);
    else teacherMarker.setLatLng(latLng);
    map.setView(latLng, 18, { animate: true });
  }

  function updateStats() {
    const settings = App.state.settings;
    if (!settings || !currentPosition) return;
    const distance = haversine(
      { lat: Number(settings.school_lat), lng: Number(settings.school_lng) },
      currentPosition,
    );
    document.getElementById("gpsAccuracy").textContent = `${Math.round(currentPosition.accuracy)} m`;
    document.getElementById("gpsDistance").textContent = `${Math.round(distance)} m`;

    let status = "Validado";
    let kind = "ok";
    if (currentPosition.accuracy > Number(settings.max_accuracy)) { status = "GPS impreciso"; kind = "warn"; }
    else if (distance > Number(settings.allowed_radius)) { status = "Fora da geocerca"; kind = "danger"; }
    setStatus(status, kind);
  }

  function setStatus(text, kind) {
    document.getElementById("gpsStatus").textContent = text;
    const box = document.getElementById("gpsStatusBox");
    box.className = `point-stat ${kind}`;
  }

  function haversine(a, b) {
    const R = 6371000;
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function handleRegisterIntent() {
    const now = Date.now();
    const isSecondTap = now - lastTap < 1100;
    lastTap = now;
    const btn = document.getElementById("registerPointBtn");
    if (!isSecondTap) {
      btn.innerHTML = `${icon("point")} Toque novamente para confirmar`;
      if (regBtnTimeout) clearTimeout(regBtnTimeout);
      regBtnTimeout = setTimeout(() => {
        btn.innerHTML = `${icon("point")} Toque 2 vezes para registrar ponto`;
      }, 1500);
      return;
    }
    confirmRegister(btn);
  }

  async function confirmRegister(btn) {
    if (!currentPosition) {
      Toast("Aguardando GPS. Tente novamente em alguns segundos.", "error");
      return;
    }
    const settings = App.state.settings;
    const insideClassHours = isClassHours(settings);
    if (!insideClassHours) {
      promptJustification(btn);
      return;
    }
    await sendRegister(btn, "");
  }

  function isClassHours(settings) {
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) return false;
    const minutes = now.getHours() * 60 + now.getMinutes();
    const inRange = (start, end) => {
      if (!start || !end) return false;
      const [sh, sm] = String(start).split(":").map(Number);
      const [eh, em] = String(end).split(":").map(Number);
      return minutes >= sh * 60 + (sm || 0) && minutes <= eh * 60 + (em || 0);
    };
    return inRange(settings.class_morning_start, settings.class_morning_end) ||
           inRange(settings.class_afternoon_start, settings.class_afternoon_end);
  }

  function promptJustification(btn) {
    Modal.open({
      eyebrow: "Hora extra",
      title: "Registrar fora do horário",
      body: `
        <p class="subtitle">Você está fora do horário regular de aula. Descreva o motivo:</p>
        <form id="justifyForm" class="stack" style="margin-top: 14px;">
          <div class="field">
            <label>Motivo</label>
            <textarea class="textarea" name="justification" minlength="8" maxlength="240" required></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" id="cancelJustify">Cancelar</button>
            <button type="submit" class="btn primary">Confirmar registro</button>
          </div>
        </form>
      `,
    });
    document.getElementById("cancelJustify").addEventListener("click", Modal.close);
    document.getElementById("justifyForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = new FormData(event.target).get("justification");
      Modal.close();
      await sendRegister(btn, text);
    });
  }

  async function sendRegister(btn, justification) {
    btn.disabled = true;
    btn.innerHTML = `${icon("clock")} Registrando...`;
    try {
      await API.post("/attendance", {
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        accuracy: currentPosition.accuracy,
        justification,
      });
      Toast("Ponto registrado.", "success");
      btn.innerHTML = `${icon("check")} Ponto registrado!`;
      setTimeout(() => {
        btn.innerHTML = `${icon("point")} Toque 2 vezes para registrar ponto`;
        btn.disabled = false;
      }, 1800);
      loadMyRecords();
    } catch (error) {
      Toast(error.message || "Falha ao registrar.", "error");
      btn.disabled = false;
      btn.innerHTML = `${icon("point")} Tentar novamente`;
    }
  }

  async function loadMyRecords() {
    const target = document.getElementById("myRecordsList");
    if (!target) return;
    try {
      const { records } = await API.get("/attendance?mine=1");
      if (!records.length) {
        target.innerHTML = `<div class="empty">${icon("paper")}<p>Sem registros ainda.</p></div>`;
        return;
      }
      target.innerHTML = `
        <div class="list">
          ${records
            .slice(0, 30)
            .map(
              (r) => `
                <div class="list-item">
                  <div class="avatar" style="background: var(--surface-soft); box-shadow: var(--neu-in-soft); color: var(--primary);">${icon("point")}</div>
                  <div class="grow">
                    <strong>${formatDate(r.created_at)}</strong>
                    <small>${escapeHtml(r.within_class_hours ? "Dentro do horário" : "Fora do horário")} · ${Math.round(r.distance)} m</small>
                    ${r.justification ? `<small style="display:block; margin-top: 4px; color: var(--ink-soft);">${escapeHtml(r.justification)}</small>` : ""}
                  </div>
                  <span class="chip ${statusKind(r.gps_status)}">${escapeHtml(r.gps_status)}</span>
                  <span class="chip ${approvalKind(r.approval_status)}">${escapeHtml(r.approval_status)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      `;
    } catch (error) {
      target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function statusKind(status) {
    if (status === "Validado") return "success";
    if (status === "GPS impreciso") return "warning";
    return "danger";
  }
  function approvalKind(status) {
    if (status === "Aprovado") return "success";
    if (status === "Rejeitado") return "danger";
    return "warning";
  }

  // ----------------- MANAGER VIEW -----------------
  async function renderManager(state) {
    contentEl.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Gestão</p>
            <h2>Registros de ponto</h2>
          </div>
          <div class="panel-actions">
            <button class="btn ghost sm" id="exportCsv">${icon("download")} CSV</button>
            <button class="btn ghost sm" id="exportPdf">${icon("paper")} PDF</button>
            <button class="btn primary sm" id="approveAll">${icon("check")} Aprovar todos</button>
          </div>
        </div>
        <div class="filter-bar">
          <div class="field">
            <label>Professor</label>
            <input class="input" id="filterTeacher" placeholder="Nome..." />
          </div>
          <div class="field">
            <label>Mês</label>
            <input class="input" id="filterMonth" type="month" />
          </div>
          <div class="field">
            <label>Status GPS</label>
            <select class="select" id="filterGps">
              <option value="">Todos</option>
              <option value="Validado">Validado</option>
              <option value="Fora da geocerca">Fora da geocerca</option>
              <option value="GPS impreciso">GPS impreciso</option>
            </select>
          </div>
          <div class="field">
            <label>Aprovação</label>
            <select class="select" id="filterApproval">
              <option value="">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>
        <div class="grid-cards" id="summaryCards"></div>
        <div class="table-wrap" style="margin-top: 18px;">
          <table class="data" id="recordsTable">
            <thead>
              <tr>
                <th>Data</th>
                <th>Professor</th>
                <th>Horário</th>
                <th>Distância</th>
                <th>GPS</th>
                <th>Aprovação</th>
                <th>Justificativa</th>
                <th></th>
              </tr>
            </thead>
            <tbody><tr><td colspan="8"><div class="loader-block"><div class="loader"></div></div></td></tr></tbody>
          </table>
        </div>
      </div>
    `;

    const filterIds = ["filterTeacher", "filterMonth", "filterGps", "filterApproval"];
    filterIds.forEach((id) => {
      document.getElementById(id).addEventListener("input", debouncedReload);
      document.getElementById(id).addEventListener("change", debouncedReload);
    });
    document.getElementById("approveAll").addEventListener("click", () => approveAll());
    document.getElementById("exportCsv").addEventListener("click", () => exportCsv());
    document.getElementById("exportPdf").addEventListener("click", () => exportPdf());

    await reloadRecords();
  }

  const debouncedReload = debounce(() => reloadRecords(), 300);

  async function reloadRecords() {
    const teacher = document.getElementById("filterTeacher")?.value || "";
    const month = document.getElementById("filterMonth")?.value || "";
    const gps = document.getElementById("filterGps")?.value || "";
    const approval = document.getElementById("filterApproval")?.value || "";
    const params = new URLSearchParams();
    if (teacher) params.set("teacher", teacher);
    if (month) params.set("month", month);
    if (gps) params.set("gpsStatus", gps);
    if (approval) params.set("approval", approval);
    const target = document.querySelector("#recordsTable tbody");
    if (!target) return;
    target.innerHTML = `<tr><td colspan="8"><div class="loader-block"><div class="loader"></div></div></td></tr>`;
    try {
      const { records } = await API.get(`/attendance?${params.toString()}`);
      renderRecordsTable(records);
      renderSummary(records);
    } catch (error) {
      target.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderSummary(records) {
    const total = records.length;
    const approved = records.filter((r) => r.approval_status === "Aprovado").length;
    const pending = records.filter((r) => r.approval_status === "Pendente").length;
    const justified = records.filter((r) => r.justification).length;
    const target = document.getElementById("summaryCards");
    target.innerHTML = [
      { label: "Total", value: total, kind: "" },
      { label: "Aprovados", value: approved, kind: "success" },
      { label: "Pendentes", value: pending, kind: "accent" },
      { label: "Com justificativa", value: justified, kind: "" },
    ]
      .map(
        (c) => `
          <div class="stat-card ${c.kind}">
            <p class="stat-label">${c.label}</p>
            <div class="stat-value">${formatNumber(c.value)}</div>
          </div>
        `,
      )
      .join("");
  }

  function renderRecordsTable(records) {
    const target = document.querySelector("#recordsTable tbody");
    if (!records.length) {
      target.innerHTML = `<tr><td colspan="8" class="empty">Nenhum registro encontrado.</td></tr>`;
      return;
    }
    target.innerHTML = records
      .map(
        (r) => `
          <tr>
            <td>${formatDate(r.created_at)}</td>
            <td>${escapeHtml(r.teacher_name)}</td>
            <td>${r.within_class_hours ? "Aula" : "Fora"}</td>
            <td>${Math.round(r.distance)} m</td>
            <td><span class="chip ${statusKind(r.gps_status)}">${escapeHtml(r.gps_status)}</span></td>
            <td><span class="chip ${approvalKind(r.approval_status)}">${escapeHtml(r.approval_status)}</span></td>
            <td><small>${escapeHtml(r.justification || "")}</small></td>
            <td>
              ${
                r.approval_status === "Pendente"
                  ? `<button class="btn sm primary" data-approve="${r.id}">${icon("check")}</button> <button class="btn sm ghost" data-reject="${r.id}">${icon("x")}</button>`
                  : `<small>${escapeHtml(r.approved_by_name || "")}</small>`
              }
            </td>
          </tr>
        `,
      )
      .join("");
    target.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", () => approveOne(Number(btn.dataset.approve)));
    });
    target.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", () => rejectOne(Number(btn.dataset.reject)));
    });
  }

  async function approveOne(id) {
    try {
      await API.post("/attendance/approve", { ids: [id] });
      Toast("Aprovado.", "success");
      reloadRecords();
    } catch (error) { Toast(error.message, "error"); }
  }
  async function rejectOne(id) {
    try {
      await API.post(`/attendance/${id}/reject`);
      Toast("Rejeitado.");
      reloadRecords();
    } catch (error) { Toast(error.message, "error"); }
  }
  async function approveAll() {
    if (!confirm("Aprovar todos os registros pendentes?")) return;
    try {
      const data = await API.post("/attendance/approve", { all: true });
      Toast(data.message, "success");
      reloadRecords();
    } catch (error) { Toast(error.message, "error"); }
  }

  function exportCsv() {
    const rows = Array.from(document.querySelectorAll("#recordsTable tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).slice(0, 7).map((td) => `"${td.textContent.trim().replaceAll('"', '""')}"`).join(";"),
    );
    if (!rows.length) return Toast("Sem registros para exportar.", "info");
    const header = '"Data";"Professor";"Horário";"Distância";"GPS";"Aprovação";"Justificativa"';
    const csv = "﻿" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registros-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rows = Array.from(document.querySelectorAll("#recordsTable tbody tr"))
      .map((tr) => Array.from(tr.querySelectorAll("td")).slice(0, 7).map((td) => td.textContent.trim()));
    if (!rows.length) return Toast("Sem registros para exportar.", "info");
    const win = window.open("", "_blank", "width=1100,height=720");
    if (!win) return Toast("Permita pop-ups para exportar.", "error");
    win.document.write(`
      <!doctype html><html><head><meta charset="UTF-8"><title>Relatório</title>
      <style>body{font-family:Arial;margin:32px;color:#2d2f4a}h1{color:#6c5ce7}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d9d9e8;padding:8px;text-align:left}th{background:#f4f3ff}@media print{button{display:none}}</style>
      </head><body>
      <h1>Relatório de registros de ponto</h1>
      <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <table><thead><tr><th>Data</th><th>Professor</th><th>Horário</th><th>Distância</th><th>GPS</th><th>Aprovação</th><th>Justificativa</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c.replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    win.document.close();
  }

  return { renderTeacher, renderManager };
})();
