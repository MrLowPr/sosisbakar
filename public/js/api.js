// ============================================
// Helper API + Utils
// ============================================

const API = {
  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BACKEND_URL + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
    return data;
  },

  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
  put(path, body) { return this.request(path, { method: 'PUT', body: JSON.stringify(body) }); },
  patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
  del(path) { return this.request(path, { method: 'DELETE' }); },
};

const fmtRupiah = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

function getSession() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast') || (() => {
    const t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
    return t;
  })();
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}