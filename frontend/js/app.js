// ===== AUTH GUARD FOR APP PAGES =====
if (!api.isLoggedIn()) {
  window.location.href = '../index.html';
}

function logout() {
  api.removeToken();
  api.removeUser();
  window.location.href = '../index.html';
}

// ===== INIT USER IN SIDEBAR =====
function initSidebar() {
  const user = api.getUser();
  if (!user) return;
  const firstLetter = user.name ? user.name[0].toUpperCase() : 'U';
  const nameEl = document.getElementById('sidebarName');
  const goalEl = document.getElementById('sidebarGoal');
  const avatarEl = document.getElementById('sidebarAvatar');
  const topbarAvatar = document.getElementById('topbarAvatar');
  const welcomeName = document.getElementById('welcomeName');
  if (nameEl) nameEl.textContent = user.name;
  if (goalEl) goalEl.textContent = user.profile?.fitnessGoal?.replace(/_/g, ' ') || 'No goal set';
  if (avatarEl) avatarEl.textContent = firstLetter;
  if (topbarAvatar) topbarAvatar.textContent = firstLetter;
  if (welcomeName) welcomeName.textContent = user.name?.split(' ')[0] || 'User';
}

// Set today's date
function setTodayDate() {
  const el = document.getElementById('todayDate');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}

// Chart defaults
Chart.defaults.color = '#a0a0c8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  setTodayDate();
});
