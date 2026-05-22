// Orquestrador do SPA: estado global, navegacao, troca de views.

const App = (() => {
  const state = {
    user: null,
    settings: null,
    currentView: null,
    clockInterval: null,
  };

  const authView = document.getElementById("authView");
  const appShell = document.getElementById("appShell");
  const contentEl = document.getElementById("content");
  const navMain = document.getElementById("navMain");
  const bottomNav = document.getElementById("bottomNav");
  const topbarEyebrow = document.getElementById("topbarEyebrow");
  const topbarTitle = document.getElementById("topbarTitle");
  const fab = document.getElementById("fabPrimary");

  const ROUTES = {
    dashboard: {
      label: "Dashboard",
      icon: "dashboard",
      eyebrow: "Painel",
      roles: ["teacher", "coordinator", "ti", "admin"],
      render: () => Dashboard.render(state),
    },
    point: {
      label: "Hora extra",
      icon: "point",
      eyebrow: "Ponto",
      roles: ["teacher", "admin"],
      render: () => Attendance.renderTeacher(state),
    },
    attendance: {
      label: "Registros",
      icon: "list",
      eyebrow: "Gestão",
      roles: ["coordinator", "ti", "admin"],
      render: () => Attendance.renderManager(state),
    },
    tickets: {
      label: "Chamados",
      icon: "tickets",
      eyebrow: "Suporte",
      roles: ["teacher", "coordinator", "ti", "admin"],
      render: () => Tickets.render(state),
    },
    users: {
      label: "Usuários",
      icon: "users",
      eyebrow: "Equipe",
      roles: ["admin"],
      render: () => Admin.renderUsers(state),
    },
    admin: {
      label: "Configurações",
      icon: "admin",
      eyebrow: "Admin",
      roles: ["admin"],
      render: () => Admin.renderSettings(state),
    },
  };

  function availableRoutes() {
    return Object.entries(ROUTES).filter(([, route]) => route.roles.includes(state.user.role));
  }

  function renderNav() {
    const routes = availableRoutes();
    navMain.innerHTML = routes
      .map(
        ([id, route]) => `
          <button class="nav-item" data-route="${id}">
            ${icon(route.icon)} <span>${route.label}</span>
          </button>
        `,
      )
      .join("");

    const mobileRoutes = routes.slice(0, 5);
    bottomNav.innerHTML = mobileRoutes
      .map(
        ([id, route]) => `
          <button data-route="${id}">${icon(route.icon)}<span>${route.label.split(" ")[0]}</span></button>
        `,
      )
      .join("");

    navMain.querySelectorAll("[data-route]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.route));
    });
    bottomNav.querySelectorAll("[data-route]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.route));
    });
  }

  async function navigate(route) {
    if (!ROUTES[route]) return;
    state.currentView = route;
    document.querySelectorAll(".nav-item, .bottom-nav button").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === route);
    });
    topbarEyebrow.textContent = ROUTES[route].eyebrow;
    topbarTitle.textContent = ROUTES[route].label;
    contentEl.classList.remove("view");
    void contentEl.offsetWidth;
    contentEl.classList.add("view");
    try {
      await ROUTES[route].render();
    } catch (error) {
      console.error(error);
      contentEl.innerHTML = `<div class="panel"><p class="empty">Falha ao carregar: ${escapeHtml(error.message)}</p></div>`;
    }
    fab.classList.add("hidden");
  }

  function setFab(visible, handler) {
    fab.classList.toggle("hidden", !visible);
    fab.onclick = handler || null;
  }

  function applyBranding(settings) {
    if (!settings) return;
    state.settings = settings;
    document.getElementById("brandName").textContent = settings.name || "Colégio";
    document.getElementById("brandNameMobile").textContent = settings.name || "Colégio";
    if (settings.logo_path) {
      document.getElementById("brandLogo").src = settings.logo_path;
      document.getElementById("brandLogoMobile").src = settings.logo_path;
    }
    if (settings.primary_color) {
      document.documentElement.style.setProperty("--primary", settings.primary_color);
    }
    if (settings.accent_color) {
      document.documentElement.style.setProperty("--accent", settings.accent_color);
    }
  }

  async function loadSchoolSettings() {
    try {
      const data = await API.get("/school");
      applyBranding(data.settings);
    } catch {}
  }

  function startClock() {
    const dateEl = document.getElementById("currentDate");
    const timeEl = document.getElementById("currentTime");
    const tick = () => {
      const now = new Date();
      dateEl.textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "short",
      }).format(now);
      timeEl.textContent = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now);
    };
    tick();
    if (state.clockInterval) clearInterval(state.clockInterval);
    state.clockInterval = setInterval(tick, 30000);
  }

  function showAppShell() {
    authView.classList.add("hidden");
    appShell.classList.remove("hidden");
    document.getElementById("userName").textContent = state.user.name;
    document.getElementById("userRole").textContent = roleLabel(state.user.role);
    document.getElementById("userAvatar").textContent = initials(state.user.name);
  }

  function showAuth() {
    appShell.classList.add("hidden");
    authView.classList.remove("hidden");
  }

  function roleLabel(role) {
    return {
      teacher: "Professor",
      coordinator: "Coordenação",
      ti: "TI",
      admin: "Administrador",
    }[role] || role;
  }

  async function bootAuthenticated(user) {
    state.user = user;
    await loadSchoolSettings();
    showAppShell();
    renderNav();
    startClock();
    if (user.must_change_password) {
      openChangePasswordModal();
    }
    const initial = availableRoutes()[0]?.[0] || "dashboard";
    navigate(initial);
  }

  function openChangePasswordModal() {
    Modal.open({
      eyebrow: "Seguranca",
      title: "Defina uma nova senha",
      body: `
        <p class="subtitle">Por seguranca, troque sua senha antes de continuar.</p>
        <form id="forceChangeForm" class="stack" style="margin-top: 14px;">
          <div class="field">
            <label>Senha atual</label>
            <input class="input" type="password" name="current" required />
          </div>
          <div class="field">
            <label>Nova senha</label>
            <input class="input" type="password" name="next" minlength="6" required />
          </div>
          <div class="field">
            <label>Confirmar nova senha</label>
            <input class="input" type="password" name="confirm" minlength="6" required />
          </div>
          <button class="btn primary block" type="submit">Salvar</button>
        </form>
      `,
    });
    document.getElementById("forceChangeForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      if (form.get("next") !== form.get("confirm")) return Toast("Senhas nao conferem.", "error");
      try {
        await API.post("/auth/change-password", {
          currentPassword: form.get("current"),
          newPassword: form.get("next"),
        });
        Toast("Senha alterada.", "success");
        state.user.must_change_password = false;
        Modal.close();
      } catch (error) {
        Toast(error.message, "error");
      }
    });
  }

  function init() {
    Auth.init();

    document.getElementById("logoutBtn").addEventListener("click", Auth.logout);
    document.getElementById("logoutBtnMobile").addEventListener("click", Auth.logout);

    window.addEventListener("auth:login", (event) => bootAuthenticated(event.detail));
    window.addEventListener("auth:logout", () => {
      state.user = null;
      showAuth();
      Auth.show("login");
    });

    if (API.getToken()) {
      API.get("/auth/me")
        .then((data) => bootAuthenticated(data.user))
        .catch(() => {
          API.setToken(null);
          showAuth();
        });
    } else {
      showAuth();
    }
  }

  return { init, state, navigate, setFab, applyBranding, roleLabel };
})();

document.addEventListener("DOMContentLoaded", App.init);
