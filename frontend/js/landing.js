// ===== AUTH GUARD =====
if (api.isLoggedIn()) {
  window.location.href = 'pages/dashboard.html';
}

function showModal(type) {
  document.getElementById('authModal').classList.add('active');
  switchForm(type);
}
function closeModal(e) {
  if (e.target.id === 'authModal') closeModalBtn();
}
function closeModalBtn() {
  document.getElementById('authModal').classList.remove('active');
}
function switchForm(type) {
  document.getElementById('loginForm').classList.toggle('hidden', type !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', type !== 'register');
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields'; return; }
  try {
    const data = await api.post('/auth/login', { email, password });
    api.setToken(data.token);
    api.setUser(data.user);
    window.location.href = 'pages/dashboard.html';
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const fitnessGoal = document.getElementById('regGoal').value;
  const weight = parseFloat(document.getElementById('regWeight').value);
  const height = parseFloat(document.getElementById('regHeight').value);
  const gender = document.getElementById("regGender").value;
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all required fields'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }
  try {
    const data = await api.post('/auth/register', {
      name, email, password,
      profile: { fitnessGoal, weight: weight || 70, height: height || 175 }
    });
    api.setToken(data.token);
    api.setUser(data.user);
    window.location.href = 'pages/dashboard.html';
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// Enter key support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (!document.getElementById('loginForm').classList.contains('hidden')) handleLogin();
    else handleRegister();
  }
});
