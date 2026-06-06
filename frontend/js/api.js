// ===== API Configuration =====
const API_BASE = 'https://fitness-progress-and-workout-analyzer.onrender.com/api';

const api = {
  getToken: () => localStorage.getItem('fitness_token'),
  setToken: (t) => localStorage.setItem('fitness_token', t),
  removeToken: () => localStorage.removeItem('fitness_token'),
  getUser: () => { try { return JSON.parse(localStorage.getItem('fitness_user')); } catch { return null; } },
  setUser: (u) => localStorage.setItem('fitness_user', JSON.stringify(u)),
  removeUser: () => localStorage.removeItem('fitness_user'),

  request: async (endpoint, options = {}) => {
    const token = api.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) throw new Error('Cannot connect to server. Make sure the backend is running on port 5000.');
      throw err;
    }
  },

  get: (endpoint) => api.request(endpoint),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' }),

  isLoggedIn: () => !!api.getToken()
};

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}
