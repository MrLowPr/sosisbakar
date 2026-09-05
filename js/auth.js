// ============================================
// Auth Pages Logic
// ============================================

const isRegister = location.pathname.includes('register');

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById(isRegister ? 'registerForm' : 'loginForm');
  const errorBox = document.getElementById('errorBox');
  const btn = document.getElementById('submitBtn');

  // Redirect logins to admin
  if (!isRegister) {
    const user = getSession();
    if (user && user.role === 'admin') window.location.href = 'admin.html';
    else if (user) window.location.href = 'index.html';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');
    btn.disabled = true;
    btn.textContent = isRegister ? 'Membuat akun...' : 'Memproses...';
    try {
      let res;
      if (isRegister) {
        res = await API.post('/auth/register', {
          full_name: document.getElementById('full_name').value.trim(),
          email: document.getElementById('email').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          password: document.getElementById('password').value,
        });
      } else {
        res = await API.post('/auth/login', {
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
        });
      }
      setSession(res.token, res.user);
      if (res.user.role === 'admin') window.location.href = 'admin.html';
      else window.location.href = 'index.html';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = isRegister ? 'Daftar Sekarang' : 'Masuk';
    }
  });
});