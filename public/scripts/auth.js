// Gerencia as telas de autenticacao: login, cadastro, esqueci-senha, reset, ativacao.

const Auth = (() => {
  const views = {
    login: document.getElementById("loginForm"),
    register: document.getElementById("registerForm"),
    forgot: document.getElementById("forgotForm"),
    reset: document.getElementById("resetForm"),
    activating: document.getElementById("activatingMsg"),
    message: document.getElementById("authMessage"),
  };
  const titleEl = document.getElementById("authTitle");
  const subEl = document.getElementById("authSubtitle");
  const messageText = document.getElementById("authMessageText");

  const TITLES = {
    login: ["Entrar", "Acesse o sistema do colégio"],
    register: ["Criar conta", "Cadastro será revisado pelo administrador"],
    forgot: ["Recuperar senha", "Vamos te enviar um link"],
    reset: ["Nova senha", "Defina uma senha forte"],
    activating: ["Ativando conta", "Validando seu link"],
    message: ["Pronto", ""],
  };

  function show(view) {
    Object.values(views).forEach((el) => el?.classList.add("hidden"));
    views[view]?.classList.remove("hidden");
    const [t, s] = TITLES[view] || ["", ""];
    titleEl.textContent = t;
    subEl.textContent = s;
  }

  function bindNavigation() {
    document.getElementById("authView").addEventListener("click", (event) => {
      const target = event.target.closest("[data-goto]");
      if (!target) return;
      show(target.dataset.goto);
    });

    const identityButtons = document.querySelectorAll(".auth-switch button");
    identityButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        identityButtons.forEach((b) => b.classList.toggle("active", b === btn));
        const isCpf = btn.dataset.identity === "cpf";
        const input = document.getElementById("loginIdentifier");
        const label = document.getElementById("loginIdentifierLabel");
        input.type = isCpf ? "text" : "email";
        input.inputMode = isCpf ? "numeric" : "email";
        input.placeholder = isCpf ? "000.000.000-00" : "voce@colegio.com";
        label.textContent = isCpf ? "CPF" : "E-mail";
        input.value = "";
      });
    });

    document.getElementById("regCpf").addEventListener("input", (event) => {
      event.target.value = formatCpfInput(event.target.value);
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true; button.textContent = "Entrando...";
    try {
      const identifier = document.getElementById("loginIdentifier").value.trim();
      const password = document.getElementById("loginPassword").value;
      const data = await API.post("/auth/login", { identifier, password });
      API.setToken(data.token);
      window.dispatchEvent(new CustomEvent("auth:login", { detail: data.user }));
    } catch (error) {
      Toast(error.message || "Falha no login.", "error");
    } finally {
      button.disabled = false; button.textContent = "Entrar";
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true; button.textContent = "Criando...";
    try {
      const payload = {
        name: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        cpf: document.getElementById("regCpf").value,
        phone: document.getElementById("regPhone").value,
        password: document.getElementById("regPassword").value,
      };
      const data = await API.post("/auth/register", payload);
      let msg = data.message;
      if (data.activationLink) msg += `\n\nLink de ativação: ${data.activationLink}`;
      messageText.innerHTML = escapeHtml(msg).replace(/\n/g, "<br/>");
      show("message");
    } catch (error) {
      Toast(error.message || "Falha no cadastro.", "error");
    } finally {
      button.disabled = false; button.textContent = "Criar conta";
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    const button = event.target.querySelector("button[type=submit]");
    button.disabled = true; button.textContent = "Enviando...";
    try {
      const identifier = document.getElementById("forgotIdentifier").value;
      const data = await API.post("/auth/forgot-password", { identifier });
      let msg = data.message;
      if (data.resetLink) msg += `\n\nLink de reset: ${data.resetLink}`;
      messageText.innerHTML = escapeHtml(msg).replace(/\n/g, "<br/>");
      show("message");
    } catch (error) {
      Toast(error.message || "Falha ao solicitar reset.", "error");
    } finally {
      button.disabled = false; button.textContent = "Enviar link";
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    const password = document.getElementById("resetPassword").value;
    const confirm = document.getElementById("resetConfirm").value;
    if (password !== confirm) return Toast("Senhas nao conferem.", "error");
    const token = new URLSearchParams(location.search).get("reset");
    try {
      await API.post("/auth/reset-password", { token, password });
      Toast("Senha redefinida.", "success");
      history.replaceState({}, "", location.pathname);
      show("login");
    } catch (error) {
      Toast(error.message || "Falha no reset.", "error");
    }
  }

  async function checkUrlIntents() {
    const params = new URLSearchParams(location.search);
    const activate = params.get("activate");
    const reset = params.get("reset");
    if (activate) {
      show("activating");
      try {
        const data = await API.post("/auth/activate", { token: activate });
        messageText.innerHTML = `${escapeHtml(data.message)}<br/><br/><strong>${escapeHtml(data.email || "")}</strong>`;
        history.replaceState({}, "", location.pathname);
        show("message");
      } catch (error) {
        messageText.textContent = error.message || "Falha na ativacao.";
        show("message");
      }
      return true;
    }
    if (reset) {
      show("reset");
      return true;
    }
    return false;
  }

  function init() {
    bindNavigation();
    views.login.addEventListener("submit", handleLogin);
    views.register.addEventListener("submit", handleRegister);
    views.forgot.addEventListener("submit", handleForgot);
    views.reset.addEventListener("submit", handleReset);
    show("login");
    checkUrlIntents();
  }

  function logout() {
    API.setToken(null);
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }

  return { init, show, logout };
})();
