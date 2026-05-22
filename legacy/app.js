const STORAGE_KEYS = {
  records: "horaextra.records",
  settings: "horaextra.settings",
  session: "horaextra.session",
  teachers: "horaextra.teachers",
  staffUsers: "horaextra.staffUsers",
  coordinatorLinks: "horaextra.coordinatorLinks",
  classes: "horaextra.classes",
  teacherClassLinks: "horaextra.teacherClassLinks",
};

const DEFAULT_SETTINGS = {
  schoolLat: -23.55052,
  schoolLng: -46.633308,
  allowedRadius: 120,
  maxAccuracy: 80,
};

const CLASS_WINDOWS = [
  { start: "07:00", end: "12:00" },
  { start: "13:00", end: "18:00" },
];

const DEFAULT_TEACHERS = [
  {
    name: "Mateus Castilho",
    email: "mateus.castilho@colegio.com",
    password: "050917",
    mustChangePassword: false,
  },
];

const DEFAULT_STAFF_USERS = [
  { name: "Coordenação", password: "123456", role: "coordinator" },
  { name: "Admin", password: "123456", role: "admin" },
];

const state = {
  records: readJson(STORAGE_KEYS.records, []),
  settings: readJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  session: readJson(STORAGE_KEYS.session, null),
  teachers: readJson(STORAGE_KEYS.teachers, DEFAULT_TEACHERS),
  staffUsers: readJson(STORAGE_KEYS.staffUsers, DEFAULT_STAFF_USERS),
  coordinatorLinks: readJson(STORAGE_KEYS.coordinatorLinks, {}),
  classes: readJson(STORAGE_KEYS.classes, []),
  teacherClassLinks: readJson(STORAGE_KEYS.teacherClassLinks, []),
  position: null,
  map: null,
  marker: null,
  schoolCircle: null,
  selectedRole: "teacher",
  showTeacherOptions: false,
  lastRegisterTap: 0,
  pendingRecord: null,
};

const elements = {
  loginView: document.querySelector("#loginView"),
  teacherView: document.querySelector("#teacherView"),
  managerView: document.querySelector("#managerView"),
  loginForm: document.querySelector("#loginForm"),
  loginName: document.querySelector("#loginName"),
  loginPassword: document.querySelector("#loginPassword"),
  roleButtons: document.querySelectorAll(".role-button"),
  teacherGreeting: document.querySelector("#teacherGreeting"),
  teacherClock: document.querySelector("#teacherClock"),
  teacherGpsStatus: document.querySelector("#teacherGpsStatus"),
  teacherAccuracy: document.querySelector("#teacherAccuracy"),
  teacherDistance: document.querySelector("#teacherDistance"),
  teacherRegister: document.querySelector("#teacherRegister"),
  openTeacherRecords: document.querySelector("#openTeacherRecords"),
  openTeacherProfile: document.querySelector("#openTeacherProfile"),
  logoutTeacher: document.querySelector("#logoutTeacher"),
  managerRole: document.querySelector("#managerRole"),
  logoutManager: document.querySelector("#logoutManager"),
  openManagerProfile: document.querySelector("#openManagerProfile"),
  managerProfileDialog: document.querySelector("#managerProfileDialog"),
  managerProfileSubtitle: document.querySelector("#managerProfileSubtitle"),
  managerProfileName: document.querySelector("#managerProfileName"),
  managerProfileRole: document.querySelector("#managerProfileRole"),
  profileCoordinatorLabel: document.querySelector("#profileCoordinatorLabel"),
  profileCoordinatorSelect: document.querySelector("#profileCoordinatorSelect"),
  profileTeacherLinks: document.querySelector("#profileTeacherLinks"),
  classForm: document.querySelector("#classForm"),
  className: document.querySelector("#className"),
  classYear: document.querySelector("#classYear"),
  classShift: document.querySelector("#classShift"),
  classList: document.querySelector("#classList"),
  teacherClassForm: document.querySelector("#teacherClassForm"),
  teacherClassTeacher: document.querySelector("#teacherClassTeacher"),
  teacherClassClass: document.querySelector("#teacherClassClass"),
  teacherClassYear: document.querySelector("#teacherClassYear"),
  teacherClassList: document.querySelector("#teacherClassList"),
  logoutManagerProfile: document.querySelector("#logoutManagerProfile"),
  currentDate: document.querySelector("#currentDate"),
  currentTime: document.querySelector("#currentTime"),
  adminPanel: document.querySelector("#adminPanel"),
  adminTeacherCount: document.querySelector("#adminTeacherCount"),
  adminStaffCount: document.querySelector("#adminStaffCount"),
  adminRecordCount: document.querySelector("#adminRecordCount"),
  adminPendingCount: document.querySelector("#adminPendingCount"),
  staffForm: document.querySelector("#staffForm"),
  newStaffName: document.querySelector("#newStaffName"),
  newStaffRole: document.querySelector("#newStaffRole"),
  newStaffPassword: document.querySelector("#newStaffPassword"),
  staffList: document.querySelector("#staffList"),
  exportBackup: document.querySelector("#exportBackup"),
  importBackup: document.querySelector("#importBackup"),
  clearRecords: document.querySelector("#clearRecords"),
  settingsForm: document.querySelector("#settingsForm"),
  schoolLat: document.querySelector("#schoolLat"),
  schoolLng: document.querySelector("#schoolLng"),
  allowedRadius: document.querySelector("#allowedRadius"),
  teacherForm: document.querySelector("#teacherForm"),
  newTeacherName: document.querySelector("#newTeacherName"),
  newTeacherEmail: document.querySelector("#newTeacherEmail"),
  newTeacherPassword: document.querySelector("#newTeacherPassword"),
  newTeacherMustChange: document.querySelector("#newTeacherMustChange"),
  toggleTeacherOptions: document.querySelector("#toggleTeacherOptions"),
  teacherAdminList: document.querySelector("#teacherAdminList"),
  filterTeacher: document.querySelector("#filterTeacher"),
  filterMonth: document.querySelector("#filterMonth"),
  filterStatus: document.querySelector("#filterStatus"),
  totalRecords: document.querySelector("#totalRecords"),
  totalJustifications: document.querySelector("#totalJustifications"),
  validRecords: document.querySelector("#validRecords"),
  pendingApprovalRecords: document.querySelector("#pendingApprovalRecords"),
  recordsBody: document.querySelector("#recordsBody"),
  selectAllRecords: document.querySelector("#selectAllRecords"),
  approveSelectedRecords: document.querySelector("#approveSelectedRecords"),
  approveAllRecords: document.querySelector("#approveAllRecords"),
  exportCsv: document.querySelector("#exportCsv"),
  exportSummaryCsv: document.querySelector("#exportSummaryCsv"),
  exportPdf: document.querySelector("#exportPdf"),
  justificationDialog: document.querySelector("#justificationDialog"),
  justificationForm: document.querySelector("#justificationForm"),
  justificationText: document.querySelector("#justificationText"),
  cancelJustification: document.querySelector("#cancelJustification"),
  teacherRecordsDialog: document.querySelector("#teacherRecordsDialog"),
  teacherRecordsSummary: document.querySelector("#teacherRecordsSummary"),
  teacherRecordsList: document.querySelector("#teacherRecordsList"),
  teacherProfileDialog: document.querySelector("#teacherProfileDialog"),
  profileTeacherName: document.querySelector("#profileTeacherName"),
  profileTeacherRecords: document.querySelector("#profileTeacherRecords"),
  passwordChangeDialog: document.querySelector("#passwordChangeDialog"),
  passwordChangeForm: document.querySelector("#passwordChangeForm"),
  forcedNewPassword: document.querySelector("#forcedNewPassword"),
  forcedConfirmPassword: document.querySelector("#forcedConfirmPassword"),
  toast: document.querySelector("#toast"),
};

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function classifyPosition(distance, accuracy) {
  if (accuracy > state.settings.maxAccuracy) return "GPS impreciso";
  if (distance > Number(state.settings.allowedRadius)) return "Fora da geocerca";
  return "Validado";
}

function badgeClass(status) {
  if (status === "Aprovado") return "ok";
  if (status === "Pendente") return "warn";
  if (status === "Validado") return "ok";
  if (status === "GPS impreciso") return "warn";
  return "danger";
}

function approvalStatus(record) {
  return record.approvalStatus || "Pendente";
}

function minutesFromText(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinClassHours(date = new Date()) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return CLASS_WINDOWS.some((window) => now >= minutesFromText(window.start) && now <= minutesFromText(window.end));
}

function showView(viewName) {
  elements.loginView.classList.toggle("hidden", viewName !== "login");
  elements.teacherView.classList.toggle("hidden", viewName !== "teacher");
  elements.managerView.classList.toggle("hidden", viewName !== "manager");
}

function normalizeText(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function findTestUser(name, password, role) {
  if (role === "teacher") {
    const teacher = state.teachers.find(
      (user) => normalizeText(user.name) === normalizeText(name) && user.password === password,
    );
    return teacher ? { ...teacher, role: "teacher" } : null;
  }

  return state.staffUsers.find(
    (user) => normalizeText(user.name) === normalizeText(name) && user.password === password && user.role === role,
  );
}

function startSession(session) {
  state.session = session;
  writeJson(STORAGE_KEYS.session, session);

  if (session.role === "teacher") {
    openTeacherView();
    if (session.mustChangePassword) {
      window.setTimeout(() => elements.passwordChangeDialog.showModal(), 200);
    }
    return;
  }

  openManagerView(session.role);
}

function logout() {
  state.session = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  showView("login");
}

function openTeacherView() {
  showView("teacher");
  elements.teacherGreeting.textContent = state.session?.name || "Professor";
  window.setTimeout(() => {
    initMap();
    requestLocation().catch(() => {});
  }, 50);
}

function openManagerView(role) {
  showView("manager");
  elements.managerRole.textContent = role === "admin" ? "Admin" : "Coordenação";
  elements.adminPanel.classList.toggle("hidden", role !== "admin");
  hydrateSettings();
  renderTeacherAdminList();
  renderAdminPanel();
  renderRecords();
}

function initMap() {
  const school = [Number(state.settings.schoolLat), Number(state.settings.schoolLng)];

  if (!window.L) {
    document.querySelector("#map").innerHTML = '<div class="map-fallback">Mapa indisponível</div>';
    return;
  }

  if (!state.map) {
    state.map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
    }).setView(school, 17);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
    }).addTo(state.map);

    L.control.zoom({ position: "bottomright" }).addTo(state.map);
  }

  state.map.setView(state.position ? [state.position.lat, state.position.lng] : school, 17);
  drawSchoolCircle();
  state.map.invalidateSize();
}

function drawSchoolCircle() {
  if (!state.map || !window.L) return;
  const school = [Number(state.settings.schoolLat), Number(state.settings.schoolLng)];
  if (state.schoolCircle) state.schoolCircle.remove();
  state.schoolCircle = L.circle(school, {
    radius: Number(state.settings.allowedRadius),
    color: "#226f54",
    fillColor: "#226f54",
    fillOpacity: 0.14,
    weight: 2,
  }).addTo(state.map);
}

function drawTeacherMarker() {
  if (!state.map || !window.L || !state.position) return;
  const latLng = [state.position.lat, state.position.lng];
  if (!state.marker) {
    state.marker = L.marker(latLng).addTo(state.map);
  } else {
    state.marker.setLatLng(latLng);
  }
  state.map.setView(latLng, 18);
}

function requestLocation() {
  if (!navigator.geolocation) {
    setTeacherGpsStatus("GPS indisponível", "danger");
    showToast("Este navegador não oferece geolocalização.");
    return Promise.reject(new Error("Geolocalização indisponível"));
  }

  setTeacherGpsStatus("Buscando GPS", "warn");

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.position = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        };
        updateTeacherLocationUI();
        drawTeacherMarker();
        resolve(state.position);
      },
      (error) => {
        setTeacherGpsStatus("GPS indisponível", "danger");
        showToast(error.message || "Não foi possível obter a localização.");
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

function setTeacherGpsStatus(text, kind) {
  elements.teacherGpsStatus.textContent = text;
  elements.teacherGpsStatus.dataset.kind = kind;
}

function updateTeacherLocationUI() {
  if (!state.position) return;

  const school = {
    lat: Number(state.settings.schoolLat),
    lng: Number(state.settings.schoolLng),
  };
  const distance = distanceMeters(school, state.position);
  const status = classifyPosition(distance, state.position.accuracy);

  elements.teacherAccuracy.textContent = `${formatNumber(state.position.accuracy)} m`;
  elements.teacherDistance.textContent = `${formatNumber(distance)} m`;
  setTeacherGpsStatus(status, badgeClass(status));
}

function createTeacherRecord(justification = "") {
  if (!state.position || !state.session) return null;

  const school = {
    lat: Number(state.settings.schoolLat),
    lng: Number(state.settings.schoolLng),
  };
  const distance = distanceMeters(school, state.position);
  const status = classifyPosition(distance, state.position.accuracy);

  return {
    id: crypto.randomUUID(),
    teacherName: state.session.name,
    role: state.session.role,
    recordType: "Ponto",
    createdAt: new Date().toISOString(),
    latitude: state.position.lat,
    longitude: state.position.lng,
    accuracy: state.position.accuracy,
    schoolLat: school.lat,
    schoolLng: school.lng,
    allowedRadius: Number(state.settings.allowedRadius),
    distance,
    status,
    approvalStatus: "Pendente",
    approvedAt: "",
    approvedBy: "",
    withinClassHours: isWithinClassHours(),
    justification,
  };
}

function saveRecord(record) {
  state.records.unshift(record);
  writeJson(STORAGE_KEYS.records, state.records);
}

function saveRecords() {
  writeJson(STORAGE_KEYS.records, state.records);
}

function exportBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    teachers: state.teachers,
    staffUsers: state.staffUsers,
    coordinatorLinks: state.coordinatorLinks,
    classes: state.classes,
    teacherClassLinks: state.teacherClassLinks,
    records: state.records,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `backup-hora-extra-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const backup = JSON.parse(reader.result);
      state.settings = backup.settings || state.settings;
      state.teachers = Array.isArray(backup.teachers) ? backup.teachers : state.teachers;
      state.staffUsers = Array.isArray(backup.staffUsers) ? backup.staffUsers : state.staffUsers;
      state.coordinatorLinks = backup.coordinatorLinks || state.coordinatorLinks;
      state.classes = Array.isArray(backup.classes) ? backup.classes : state.classes;
      state.teacherClassLinks = Array.isArray(backup.teacherClassLinks)
        ? backup.teacherClassLinks
        : state.teacherClassLinks;
      state.records = Array.isArray(backup.records) ? backup.records : state.records;

      writeJson(STORAGE_KEYS.settings, state.settings);
      writeJson(STORAGE_KEYS.teachers, state.teachers);
      writeJson(STORAGE_KEYS.staffUsers, state.staffUsers);
      writeJson(STORAGE_KEYS.coordinatorLinks, state.coordinatorLinks);
      writeJson(STORAGE_KEYS.classes, state.classes);
      writeJson(STORAGE_KEYS.teacherClassLinks, state.teacherClassLinks);
      writeJson(STORAGE_KEYS.records, state.records);

      hydrateSettings();
      renderTeacherAdminList();
      renderAdminPanel();
      renderRecords();
      showToast("Backup restaurado.");
    } catch {
      showToast("Arquivo de backup inválido.");
    }
  });
  reader.readAsText(file);
}

function clearAllRecords() {
  const confirmed = window.confirm("Deseja limpar todos os registros? Esta ação não remove professores ou usuários.");
  if (!confirmed) return;
  state.records = [];
  saveRecords();
  renderTeacherAdminList();
  renderAdminPanel();
  renderRecords();
  showToast("Registros removidos.");
}

function saveTeachers() {
  state.teachers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  writeJson(STORAGE_KEYS.teachers, state.teachers);
}

function saveStaffUsers() {
  state.staffUsers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  writeJson(STORAGE_KEYS.staffUsers, state.staffUsers);
}

function saveCoordinatorLinks() {
  writeJson(STORAGE_KEYS.coordinatorLinks, state.coordinatorLinks);
}

function saveClasses() {
  state.classes.sort((a, b) => Number(b.year) - Number(a.year) || a.name.localeCompare(b.name, "pt-BR"));
  writeJson(STORAGE_KEYS.classes, state.classes);
}

function saveTeacherClassLinks() {
  state.teacherClassLinks.sort(
    (a, b) => Number(b.year) - Number(a.year) || a.teacherName.localeCompare(b.teacherName, "pt-BR"),
  );
  writeJson(STORAGE_KEYS.teacherClassLinks, state.teacherClassLinks);
}

function coordinatorUsers() {
  return state.staffUsers.filter((user) => user.role === "coordinator");
}

function selectedCoordinatorName() {
  if (state.session?.role === "admin") {
    return elements.profileCoordinatorSelect.value || coordinatorUsers()[0]?.name || "";
  }
  return state.session?.name || "";
}

function linkedTeacherNames(coordinatorName) {
  return state.coordinatorLinks[coordinatorName] || [];
}

function setTeacherLink(coordinatorName, teacherName, linked) {
  if (!coordinatorName) return;
  const current = new Set(linkedTeacherNames(coordinatorName));
  if (linked) {
    current.add(teacherName);
  } else {
    current.delete(teacherName);
  }
  state.coordinatorLinks[coordinatorName] = Array.from(current).sort((a, b) => a.localeCompare(b, "pt-BR"));
  saveCoordinatorLinks();
  renderManagerProfile();
}

function currentYear() {
  return new Date().getFullYear();
}

function classLabel(item) {
  return `${item.name} · ${item.year} · ${item.shift}`;
}

function addClass(name, year, shift) {
  const exists = state.classes.some(
    (item) => normalizeText(item.name) === normalizeText(name) && String(item.year) === String(year),
  );
  if (exists) {
    showToast("Turma já cadastrada para este ano letivo.");
    return;
  }
  state.classes.push({ id: crypto.randomUUID(), name: name.trim(), year: Number(year), shift });
  saveClasses();
  renderManagerProfile();
  showToast("Turma adicionada.");
}

function removeClass(id) {
  state.classes = state.classes.filter((item) => item.id !== id);
  state.teacherClassLinks = state.teacherClassLinks.filter((item) => item.classId !== id);
  saveClasses();
  saveTeacherClassLinks();
  renderManagerProfile();
  showToast("Turma removida.");
}

function addTeacherClassLink(teacherName, classId, year) {
  const classItem = state.classes.find((item) => item.id === classId);
  if (!classItem) return;
  const exists = state.teacherClassLinks.some(
    (item) => normalizeText(item.teacherName) === normalizeText(teacherName) && item.classId === classId && String(item.year) === String(year),
  );
  if (exists) {
    showToast("Professor já está atrelado a esta turma neste ano letivo.");
    return;
  }
  state.teacherClassLinks.push({
    id: crypto.randomUUID(),
    teacherName,
    classId,
    className: classItem.name,
    year: Number(year),
  });
  saveTeacherClassLinks();
  renderManagerProfile();
  showToast("Professor atrelado à turma.");
}

function removeTeacherClassLink(id) {
  state.teacherClassLinks = state.teacherClassLinks.filter((item) => item.id !== id);
  saveTeacherClassLinks();
  renderManagerProfile();
  showToast("Vínculo com turma removido.");
}

function renderClassManagement() {
  elements.classYear.value = elements.classYear.value || currentYear();
  elements.teacherClassYear.value = elements.teacherClassYear.value || currentYear();

  elements.classList.innerHTML = state.classes.length
    ? state.classes
        .map(
          (item) => `
            <article class="class-item">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${item.year} · ${escapeHtml(item.shift)}</span>
              </div>
              <button class="secondary remove-class" type="button" data-class-id="${item.id}">Remover</button>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">Nenhuma turma cadastrada.</p>';

  elements.teacherClassTeacher.innerHTML = state.teachers
    .map((teacher) => `<option value="${escapeHtml(teacher.name)}">${escapeHtml(teacher.name)}</option>`)
    .join("");
  elements.teacherClassClass.innerHTML = state.classes
    .map((item) => `<option value="${item.id}">${escapeHtml(classLabel(item))}</option>`)
    .join("");

  elements.teacherClassList.innerHTML = state.teacherClassLinks.length
    ? state.teacherClassLinks
        .map(
          (item) => `
            <article class="class-item">
              <div>
                <strong>${escapeHtml(item.teacherName)}</strong>
                <span>${escapeHtml(item.className)} · ${item.year}</span>
              </div>
              <button class="secondary remove-teacher-class" type="button" data-teacher-class-id="${item.id}">Remover</button>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-state">Nenhum professor atrelado a turma.</p>';
}

function renderManagerProfile() {
  const isAdmin = state.session?.role === "admin";
  elements.managerProfileSubtitle.textContent = isAdmin
    ? "Dados do admin e vínculos das coordenações"
    : "Dados da coordenação";
  elements.managerProfileName.textContent = state.session?.name || "--";
  elements.managerProfileRole.textContent = isAdmin ? "Admin" : "Coordenação";
  elements.profileCoordinatorLabel.classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    const coordinators = coordinatorUsers();
    elements.profileCoordinatorSelect.innerHTML = coordinators
      .map((user) => `<option value="${escapeHtml(user.name)}">${escapeHtml(user.name)}</option>`)
      .join("");
  }

  const coordinatorName = selectedCoordinatorName();
  const linked = new Set(linkedTeacherNames(coordinatorName));
  if (!coordinatorName) {
    elements.profileTeacherLinks.innerHTML = '<p class="empty-state">Cadastre uma coordenação para criar vínculos.</p>';
    return;
  }

  if (!state.teachers.length) {
    elements.profileTeacherLinks.innerHTML = '<p class="empty-state">Nenhum professor cadastrado.</p>';
    return;
  }

  elements.profileTeacherLinks.innerHTML = state.teachers
    .map(
      (teacher) => `
        <label class="link-item">
          <input type="checkbox" data-link-teacher="${escapeHtml(teacher.name)}" ${linked.has(teacher.name) ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(teacher.name)}</strong>
            <small>${escapeHtml(teacher.email || "Sem e-mail")}</small>
          </span>
        </label>
      `,
    )
    .join("");
  renderClassManagement();
}

function renderAdminPanel() {
  if (state.session?.role !== "admin") return;
  const pending = state.records.filter((record) => approvalStatus(record) !== "Aprovado").length;
  elements.adminTeacherCount.textContent = state.teachers.length;
  elements.adminStaffCount.textContent = state.staffUsers.length;
  elements.adminRecordCount.textContent = state.records.length;
  elements.adminPendingCount.textContent = pending;
  renderStaffList();
}

function renderStaffList() {
  elements.staffList.innerHTML = state.staffUsers
    .map(
      (user) => `
        <article class="staff-item">
          <div>
            <strong>${escapeHtml(user.name)}</strong>
            <span>${user.role === "admin" ? "Admin" : "Coordenação"}</span>
          </div>
          <div class="staff-actions">
            <button class="secondary reset-staff-password" type="button" data-staff="${escapeHtml(user.name)}">Redefinir senha</button>
            <button class="secondary remove-staff" type="button" data-staff="${escapeHtml(user.name)}">Remover</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function addStaffUser(name, role, password) {
  const exists = state.staffUsers.some((user) => normalizeText(user.name) === normalizeText(name) && user.role === role);
  if (exists) {
    showToast("Usuário administrativo já existe.");
    return;
  }
  state.staffUsers.push({ name: name.trim(), role, password });
  saveStaffUsers();
  renderAdminPanel();
  showToast("Usuário administrativo adicionado.");
}

function findStaffUser(name) {
  return state.staffUsers.find((user) => normalizeText(user.name) === normalizeText(name));
}

function resetStaffPassword(name) {
  const user = findStaffUser(name);
  if (!user) return;
  const password = window.prompt(`Nova senha para ${user.name}:`);
  if (!password) return;
  user.password = password;
  saveStaffUsers();
  showToast("Senha administrativa redefinida.");
}

function removeStaffUser(name) {
  if (state.staffUsers.length <= 1) {
    showToast("Mantenha pelo menos um usuário administrativo.");
    return;
  }
  if (normalizeText(state.session?.name || "") === normalizeText(name)) {
    showToast("Não remova o usuário logado.");
    return;
  }
  state.staffUsers = state.staffUsers.filter((user) => normalizeText(user.name) !== normalizeText(name));
  saveStaffUsers();
  renderAdminPanel();
  showToast("Usuário administrativo removido.");
}

function renderTeacherAdminList() {
  if (!state.teachers.length) {
    elements.teacherAdminList.innerHTML = '<p class="empty-state">Nenhum professor cadastrado.</p>';
    return;
  }

  elements.teacherAdminList.innerHTML = state.teachers
    .map((teacher) => {
      const recordsCount = state.records.filter((record) => normalizeText(record.teacherName) === normalizeText(teacher.name)).length;
      const emailText = teacher.email || "Sem e-mail";
      const changeText = teacher.mustChangePassword ? "Troca obrigatória no próximo acesso" : "Senha ativa";
      return `
        <article class="teacher-admin-item">
          <div>
            <strong>${escapeHtml(teacher.name)}</strong>
            <span>${escapeHtml(emailText)}</span>
            <span>${recordsCount} registro(s) · ${changeText}</span>
          </div>
          <div class="teacher-admin-actions ${state.showTeacherOptions ? "" : "hidden"}">
            <button class="secondary send-login" type="button" data-teacher="${escapeHtml(teacher.name)}">Enviar login</button>
            <button class="secondary reset-password" type="button" data-teacher="${escapeHtml(teacher.name)}">Redefinir senha</button>
            <button class="secondary toggle-password-change" type="button" data-teacher="${escapeHtml(teacher.name)}">
              ${teacher.mustChangePassword ? "Não exigir troca" : "Exigir troca"}
            </button>
            <button class="secondary remove-teacher" type="button" data-teacher="${escapeHtml(teacher.name)}">Remover</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function findTeacherByName(name) {
  return state.teachers.find((teacher) => normalizeText(teacher.name) === normalizeText(name));
}

function addTeacher(name, email, password, mustChangePassword) {
  const exists = state.teachers.some((teacher) => normalizeText(teacher.name) === normalizeText(name));
  if (exists) {
    showToast("Professor já cadastrado.");
    return;
  }

  state.teachers.push({ name: name.trim(), email: email.trim(), password, mustChangePassword });
  saveTeachers();
  renderTeacherAdminList();
  renderAdminPanel();
  showToast("Professor adicionado.");
}

function removeTeacher(name) {
  state.teachers = state.teachers.filter((teacher) => normalizeText(teacher.name) !== normalizeText(name));
  saveTeachers();
  renderTeacherAdminList();
  renderAdminPanel();
  showToast("Professor removido. Os registros históricos foram mantidos.");
}

function resetTeacherPassword(name) {
  const teacher = findTeacherByName(name);
  if (!teacher) return;
  const newPassword = window.prompt(`Nova senha para ${teacher.name}:`);
  if (!newPassword) return;
  teacher.password = newPassword;
  teacher.mustChangePassword = true;
  saveTeachers();
  renderTeacherAdminList();
  showToast("Senha redefinida. Troca exigida no próximo acesso.");
}

function togglePasswordChange(name) {
  const teacher = findTeacherByName(name);
  if (!teacher) return;
  teacher.mustChangePassword = !teacher.mustChangePassword;
  saveTeachers();
  renderTeacherAdminList();
  showToast("Preferência de troca de senha atualizada.");
}

function sendLoginEmail(name) {
  const teacher = findTeacherByName(name);
  if (!teacher) return;
  if (!teacher.email) {
    showToast("Cadastre um e-mail para este professor.");
    return;
  }

  const subject = encodeURIComponent("Dados de acesso - Hora Extra Professores");
  const body = encodeURIComponent(
    `Olá, ${teacher.name}.\n\nSeus dados de acesso ao sistema Hora Extra Professores são:\n\nNome: ${teacher.name}\nSenha: ${teacher.password}\nPerfil: Professor\n\nAcesse o sistema e altere sua senha se solicitado.`,
  );
  window.location.href = `mailto:${teacher.email}?subject=${subject}&body=${body}`;
}

function updateTeacherPassword(name, password) {
  const teacher = findTeacherByName(name);
  if (!teacher) return;
  teacher.password = password;
  teacher.mustChangePassword = false;
  saveTeachers();
  state.session.mustChangePassword = false;
  writeJson(STORAGE_KEYS.session, state.session);
}

function getCurrentTeacherRecords() {
  const teacherName = normalizeText(state.session?.name || "");
  return state.records.filter((record) => normalizeText(record.teacherName) === teacherName);
}

function renderTeacherRecords() {
  const records = getCurrentTeacherRecords();
  const justified = records.filter((record) => record.justification).length;
  elements.teacherRecordsSummary.textContent = `${records.length} registro(s), ${justified} com justificativa`;

  if (!records.length) {
    elements.teacherRecordsList.innerHTML = '<p class="empty-state">Nenhum ponto registrado ainda.</p>';
    return;
  }

  elements.teacherRecordsList.innerHTML = records
    .map(
      (record) => `
        <article class="teacher-record-item">
          <div>
            <strong>${formatDateTime(record.createdAt)}</strong>
            <span>${record.withinClassHours ? "Dentro do horário de aula" : "Fora do horário de aula"}</span>
          </div>
          <div class="teacher-record-meta">
            <span class="badge ${badgeClass(record.status)}">${escapeHtml(record.status)}</span>
            <span class="badge ${badgeClass(approvalStatus(record))}">${escapeHtml(approvalStatus(record))}</span>
            <span>${formatNumber(record.distance)} m</span>
            <span>GPS ${formatNumber(record.accuracy)} m</span>
          </div>
          ${
            record.justification
              ? `<p class="teacher-record-justification">${escapeHtml(record.justification)}</p>`
              : ""
          }
        </article>
      `,
    )
    .join("");
}

function renderTeacherProfile() {
  const records = getCurrentTeacherRecords();
  elements.profileTeacherName.textContent = state.session?.name || "--";
  elements.profileTeacherRecords.textContent = records.length;
}

async function handleRegisterIntent() {
  const now = Date.now();
  const isSecondTap = now - state.lastRegisterTap < 900;
  state.lastRegisterTap = now;

  if (!isSecondTap) {
    elements.teacherRegister.textContent = "Toque novamente";
    window.setTimeout(() => {
      elements.teacherRegister.textContent = "Registrar ponto";
    }, 1000);
    return;
  }

  elements.teacherRegister.disabled = true;
  elements.teacherRegister.textContent = "Registrando...";

  try {
    await requestLocation();
    const needsJustification = !isWithinClassHours();
    if (needsJustification) {
      state.pendingRecord = createTeacherRecord();
      elements.justificationText.value = "";
      elements.justificationDialog.showModal();
      return;
    }

    const record = createTeacherRecord();
    saveRecord(record);
    showToast("Ponto registrado.");
  } catch {
    showToast("Não foi possível registrar sem GPS.");
  } finally {
    elements.teacherRegister.disabled = false;
    elements.teacherRegister.textContent = "Registrar ponto";
  }
}

function hydrateSettings() {
  elements.schoolLat.value = state.settings.schoolLat;
  elements.schoolLng.value = state.settings.schoolLng;
  elements.allowedRadius.value = state.settings.allowedRadius;
}

function getFilteredRecords() {
  const teacher = elements.filterTeacher.value.trim().toLowerCase();
  const month = elements.filterMonth.value;
  const status = elements.filterStatus.value;

  return state.records.filter((record) => {
    const matchesTeacher = !teacher || record.teacherName.toLowerCase().includes(teacher);
    const matchesMonth = !month || record.createdAt.slice(0, 7) === month;
    const matchesStatus = !status || record.status === status;
    return matchesTeacher && matchesMonth && matchesStatus;
  });
}

function renderRecords() {
  const records = getFilteredRecords();
  const justified = records.filter((record) => record.justification).length;
  const validRecords = records.filter((record) => record.status === "Validado").length;
  const pendingApproval = records.filter((record) => approvalStatus(record) !== "Aprovado").length;

  elements.totalRecords.textContent = records.length;
  elements.totalJustifications.textContent = justified;
  elements.validRecords.textContent = validRecords;
  elements.pendingApprovalRecords.textContent = pendingApproval;
  elements.selectAllRecords.checked = false;
  elements.selectAllRecords.disabled = records.length === 0;

  if (!records.length) {
    elements.recordsBody.innerHTML = '<tr><td colspan="10">Nenhum registro encontrado.</td></tr>';
    return;
  }

  elements.recordsBody.innerHTML = records
    .map(
      (record) => `
        <tr>
          <td><input class="record-checkbox" type="checkbox" data-record-id="${record.id}" aria-label="Selecionar registro" /></td>
          <td>${formatDateTime(record.createdAt)}</td>
          <td>${escapeHtml(record.teacherName)}</td>
          <td>${record.withinClassHours ? "Aula" : "Fora do horário"}</td>
          <td>${formatNumber(record.distance)} m</td>
          <td>${formatNumber(record.accuracy)} m</td>
          <td><span class="badge ${badgeClass(record.status)}">${escapeHtml(record.status)}</span></td>
          <td><span class="badge ${badgeClass(approvalStatus(record))}">${escapeHtml(approvalStatus(record))}</span></td>
          <td>${escapeHtml(record.justification || "")}</td>
          <td>
            ${
              approvalStatus(record) === "Aprovado"
                ? `<span class="approval-note">${escapeHtml(record.approvedBy || "Coordenação")}</span>`
                : `<button class="secondary approve-record" type="button" data-record-id="${record.id}">Aprovar</button>`
            }
          </td>
        </tr>
      `,
    )
    .join("");
}

function approveRecords(recordIds) {
  const ids = new Set(recordIds);
  const approver = state.session?.name || "Coordenação";
  let count = 0;

  state.records.forEach((record) => {
    if (!ids.has(record.id) || approvalStatus(record) === "Aprovado") return;
    record.approvalStatus = "Aprovado";
    record.approvedAt = new Date().toISOString();
    record.approvedBy = approver;
    count += 1;
  });

  if (!count) {
    showToast("Nenhum registro pendente selecionado.");
    return;
  }

  saveRecords();
  renderRecords();
  renderAdminPanel();
  showToast(`${count} registro(s) aprovado(s).`);
}

function getSelectedRecordIds() {
  return Array.from(document.querySelectorAll(".record-checkbox:checked")).map((input) => input.dataset.recordId);
}

function exportCsv() {
  const rows = getFilteredRecords();
  const headers = [
    "Data",
    "Professor",
    "Tipo",
    "Horário",
    "Latitude",
    "Longitude",
    "Precisão GPS (m)",
    "Distância da escola (m)",
    "Raio permitido (m)",
    "Status",
    "Aprovação coordenação",
    "Aprovado por",
    "Aprovado em",
    "Justificativa",
  ];
  const csvRows = [
    headers,
    ...rows.map((record) => [
      formatDateTime(record.createdAt),
      record.teacherName,
      record.recordType,
      record.withinClassHours ? "Aula" : "Fora do horário",
      record.latitude,
      record.longitude,
      Math.round(record.accuracy),
      Math.round(record.distance),
      record.allowedRadius,
      record.status,
      approvalStatus(record),
      record.approvedBy || "",
      record.approvedAt ? formatDateTime(record.approvedAt) : "",
      record.justification || "",
    ]),
  ];
  const csv = csvRows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `registros-ponto-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportSummaryCsv() {
  const rows = getFilteredRecords();
  const summary = new Map();

  rows.forEach((record) => {
    const key = record.teacherName;
    const current = summary.get(key) || {
      teacherName: record.teacherName,
      total: 0,
      valid: 0,
      outOfFence: 0,
      imprecise: 0,
      justified: 0,
      outOfClassHours: 0,
      approved: 0,
      pendingApproval: 0,
    };

    current.total += 1;
    current.valid += record.status === "Validado" ? 1 : 0;
    current.outOfFence += record.status === "Fora da geocerca" ? 1 : 0;
    current.imprecise += record.status === "GPS impreciso" ? 1 : 0;
    current.justified += record.justification ? 1 : 0;
    current.outOfClassHours += record.withinClassHours ? 0 : 1;
    current.approved += approvalStatus(record) === "Aprovado" ? 1 : 0;
    current.pendingApproval += approvalStatus(record) === "Aprovado" ? 0 : 1;
    summary.set(key, current);
  });

  const headers = [
    "Professor",
    "Total de registros",
    "Validados",
    "Fora da geocerca",
    "GPS impreciso",
    "Fora do horário",
    "Com justificativa",
    "Aprovados coordenação",
    "Pendentes aprovação",
  ];
  const csvRows = [
    headers,
    ...Array.from(summary.values()).map((item) => [
      item.teacherName,
      item.total,
      item.valid,
      item.outOfFence,
      item.imprecise,
      item.outOfClassHours,
      item.justified,
      item.approved,
      item.pendingApproval,
    ]),
  ];
  const csv = csvRows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `relatório-consolidado-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportFiltersText() {
  const filters = [];
  if (elements.filterTeacher.value.trim()) filters.push(`Professor: ${elements.filterTeacher.value.trim()}`);
  if (elements.filterMonth.value) filters.push(`Mês: ${elements.filterMonth.value}`);
  if (elements.filterStatus.value) filters.push(`Status GPS: ${elements.filterStatus.value}`);
  return filters.length ? filters.join(" | ") : "Todos os registros";
}

function exportPdf() {
  const rows = getFilteredRecords();
  const total = rows.length;
  const approved = rows.filter((record) => approvalStatus(record) === "Aprovado").length;
  const pending = total - approved;
  const justified = rows.filter((record) => record.justification).length;
  const generatedAt = formatDateTime(new Date().toISOString());
  const tableRows = rows
    .map(
      (record) => `
        <tr>
          <td>${formatDateTime(record.createdAt)}</td>
          <td>${escapeHtml(record.teacherName)}</td>
          <td>${record.withinClassHours ? "Aula" : "Fora do horário"}</td>
          <td>${escapeHtml(record.status)}</td>
          <td>${escapeHtml(approvalStatus(record))}</td>
          <td>${formatNumber(record.distance)} m</td>
          <td>${formatNumber(record.accuracy)} m</td>
          <td>${escapeHtml(record.justification || "")}</td>
        </tr>
      `,
    )
    .join("");

  const reportWindow = window.open("", "_blank", "width=1120,height=780");
  if (!reportWindow) {
    showToast("Permita pop-ups para exportar o PDF.");
    return;
  }

  reportWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de registros</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 32px; color: #1f2933; font-family: Arial, Helvetica, sans-serif; }
          header { border-bottom: 2px solid #226f54; margin-bottom: 18px; padding-bottom: 14px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0; color: #637083; }
          .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
          .meta div { border: 1px solid #d9e2df; border-radius: 6px; padding: 10px; }
          .meta span { display: block; color: #637083; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .meta strong { display: block; margin-top: 5px; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d9e2df; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #eef4f1; color: #31443f; text-transform: uppercase; }
          @media print {
            body { margin: 18mm; }
            button { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>Relatório de registros dos professores</h1>
          <p>${escapeHtml(reportFiltersText())}</p>
          <p>Gerado em ${generatedAt}</p>
        </header>
        <section class="meta">
          <div><span>Total</span><strong>${total}</strong></div>
          <div><span>Aprovados</span><strong>${approved}</strong></div>
          <div><span>Pendentes</span><strong>${pending}</strong></div>
          <div><span>Justificativas</span><strong>${justified}</strong></div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Professor</th>
              <th>Horário</th>
              <th>Status GPS</th>
              <th>Coordenação</th>
              <th>Distância</th>
              <th>Precisão</th>
              <th>Justificativa</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="8">Nenhum registro encontrado.</td></tr>'}</tbody>
        </table>
        <script>
          window.addEventListener("load", () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  reportWindow.document.close();
}

function updateClock() {
  const now = new Date();
  elements.teacherClock.textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  elements.currentDate.textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  elements.currentTime.textContent = elements.teacherClock.textContent;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 3200);
}

elements.roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedRole = button.dataset.role;
    elements.roleButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = findTestUser(elements.loginName.value, elements.loginPassword.value, state.selectedRole);
  if (!user) {
    showToast("Nome, senha ou perfil inválidos.");
    return;
  }

  startSession({
    name: user.name,
    role: user.role,
  });
});

elements.teacherRegister.addEventListener("click", handleRegisterIntent);
elements.openTeacherRecords.addEventListener("click", () => {
  renderTeacherRecords();
  elements.teacherRecordsDialog.showModal();
});
elements.openTeacherProfile.addEventListener("click", () => {
  renderTeacherProfile();
  elements.teacherProfileDialog.showModal();
});
elements.logoutTeacher.addEventListener("click", logout);
elements.logoutManager.addEventListener("click", logout);
elements.openManagerProfile.addEventListener("click", () => {
  renderManagerProfile();
  elements.managerProfileDialog.showModal();
});
elements.logoutManagerProfile.addEventListener("click", logout);
elements.profileCoordinatorSelect.addEventListener("change", renderManagerProfile);
elements.profileTeacherLinks.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-link-teacher]");
  if (!input) return;
  setTeacherLink(selectedCoordinatorName(), input.dataset.linkTeacher, input.checked);
});
elements.classForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addClass(elements.className.value, elements.classYear.value, elements.classShift.value);
  elements.className.value = "";
});
elements.classList.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-class");
  if (!button) return;
  removeClass(button.dataset.classId);
});
elements.teacherClassForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTeacherClassLink(
    elements.teacherClassTeacher.value,
    elements.teacherClassClass.value,
    elements.teacherClassYear.value,
  );
});
elements.teacherClassList.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-teacher-class");
  if (!button) return;
  removeTeacherClassLink(button.dataset.teacherClassId);
});

elements.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings = {
    ...state.settings,
    schoolLat: Number(elements.schoolLat.value),
    schoolLng: Number(elements.schoolLng.value),
    allowedRadius: Number(elements.allowedRadius.value),
  };
  writeJson(STORAGE_KEYS.settings, state.settings);
  drawSchoolCircle();
  updateTeacherLocationUI();
  showToast("Geocerca salva.");
});

elements.teacherForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTeacher(
    elements.newTeacherName.value,
    elements.newTeacherEmail.value,
    elements.newTeacherPassword.value,
    elements.newTeacherMustChange.checked,
  );
  elements.teacherForm.reset();
  elements.newTeacherMustChange.checked = true;
});

elements.toggleTeacherOptions.addEventListener("click", () => {
  state.showTeacherOptions = !state.showTeacherOptions;
  elements.toggleTeacherOptions.textContent = state.showTeacherOptions ? "Ocultar opções" : "Opções";
  renderTeacherAdminList();
});

elements.teacherAdminList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-teacher]");
  if (!button) return;
  if (button.classList.contains("remove-teacher")) removeTeacher(button.dataset.teacher);
  if (button.classList.contains("reset-password")) resetTeacherPassword(button.dataset.teacher);
  if (button.classList.contains("toggle-password-change")) togglePasswordChange(button.dataset.teacher);
  if (button.classList.contains("send-login")) sendLoginEmail(button.dataset.teacher);
});

elements.staffForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addStaffUser(elements.newStaffName.value, elements.newStaffRole.value, elements.newStaffPassword.value);
  elements.staffForm.reset();
});

elements.staffList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-staff]");
  if (!button) return;
  if (button.classList.contains("reset-staff-password")) resetStaffPassword(button.dataset.staff);
  if (button.classList.contains("remove-staff")) removeStaffUser(button.dataset.staff);
});

elements.exportBackup.addEventListener("click", exportBackup);
elements.importBackup.addEventListener("change", () => {
  const [file] = elements.importBackup.files;
  if (file) importBackup(file);
  elements.importBackup.value = "";
});
elements.clearRecords.addEventListener("click", clearAllRecords);

elements.recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest(".approve-record");
  if (!button) return;
  approveRecords([button.dataset.recordId]);
});

elements.selectAllRecords.addEventListener("change", () => {
  document.querySelectorAll(".record-checkbox").forEach((input) => {
    input.checked = elements.selectAllRecords.checked;
  });
});

elements.approveSelectedRecords.addEventListener("click", () => {
  approveRecords(getSelectedRecordIds());
});

elements.approveAllRecords.addEventListener("click", () => {
  const ids = getFilteredRecords()
    .filter((record) => approvalStatus(record) !== "Aprovado")
    .map((record) => record.id);
  approveRecords(ids);
});

elements.passwordChangeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = elements.forcedNewPassword.value;
  const confirmation = elements.forcedConfirmPassword.value;
  if (password !== confirmation) {
    showToast("As senhas não conferem.");
    return;
  }
  updateTeacherPassword(state.session.name, password);
  elements.passwordChangeForm.reset();
  elements.passwordChangeDialog.close();
  showToast("Senha alterada.");
});

elements.justificationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.pendingRecord) return;
  state.pendingRecord.justification = elements.justificationText.value.trim();
  saveRecord(state.pendingRecord);
  state.pendingRecord = null;
  elements.justificationDialog.close();
  showToast("Ponto registrado com justificativa.");
});

elements.cancelJustification.addEventListener("click", () => {
  state.pendingRecord = null;
  elements.justificationDialog.close();
});

elements.exportCsv.addEventListener("click", exportCsv);
elements.exportSummaryCsv.addEventListener("click", exportSummaryCsv);
elements.exportPdf.addEventListener("click", exportPdf);
elements.filterTeacher.addEventListener("input", renderRecords);
elements.filterMonth.addEventListener("change", renderRecords);
elements.filterStatus.addEventListener("change", renderRecords);

hydrateSettings();
updateClock();
window.setInterval(updateClock, 1000);

if (state.session) {
  startSession(state.session);
} else {
  showView("login");
}
