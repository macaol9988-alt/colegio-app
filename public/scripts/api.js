// Cliente HTTP simples que envia o JWT em todas as requisicoes.
const API = (() => {
  const TOKEN_KEY = "colegio.token";

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function request(method, path, body, options = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const response = await fetch(`/api${path}`, {
      method,
      headers,
      body: payload,
      credentials: "same-origin",
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }

    if (!response.ok) {
      const error = new Error(data?.error || `Erro ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  return {
    getToken,
    setToken,
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    patch: (path, body) => request("PATCH", path, body),
    delete: (path) => request("DELETE", path),
    upload: (path, formData) => request("POST", path, formData),
  };
})();
