function switchTab(tab, el) {
  document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.settings-menu-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  el.classList.add('active');
}

function loadSettingsData() {
  const user = api.getUser();
  if (!user) return;
  const p = user.profile || {};
  document.getElementById('profName').value = user.name || '';
  document.getElementById('profEmail').value = user.email || '';
  document.getElementById('profAge').value = p.age || '';
  document.getElementById('profGender').value = p.gender || '';
  document.getElementById('profWeight').value = p.weight || '';
  document.getElementById('profHeight').value = p.height || '';
  document.getElementById('profActivity').value = p.activityLevel || 'moderate';
  document.getElementById('goalType').value = p.fitnessGoal || 'maintain';
  document.getElementById('goalCals').value = p.dailyCalorieGoal || 2000;
  document.getElementById('goalSteps').value = p.dailyStepGoal || 10000;
  document.getElementById('goalWeight').value = p.goalWeight || '';
}

async function saveProfile() {
  const name = document.getElementById('profName').value.trim();
  const errEl = document.getElementById('profileError');
  errEl.textContent = '';
  try {
    const user = api.getUser();
    const profile = { ...user.profile,
      age: parseInt(document.getElementById('profAge').value) || undefined,
      gender: document.getElementById('profGender').value || undefined,
      weight: parseFloat(document.getElementById('profWeight').value) || undefined,
      height: parseFloat(document.getElementById('profHeight').value) || undefined,
      activityLevel: document.getElementById('profActivity').value
    };
    const data = await api.put('/users/profile', { name, profile });
    api.setUser(data.user);
    initSidebar();
    showToast('Profile saved!', 'success');
  } catch (err) { errEl.textContent = err.message; }
}

async function saveGoals() {
  const errEl = document.getElementById('goalsError');
  errEl.textContent = '';
  try {
    const user = api.getUser();
    const profile = { ...user.profile,
      fitnessGoal: document.getElementById('goalType').value,
      dailyCalorieGoal: parseInt(document.getElementById('goalCals').value) || 2000,
      dailyStepGoal: parseInt(document.getElementById('goalSteps').value) || 10000,
      goalWeight: parseFloat(document.getElementById('goalWeight').value) || undefined
    };
    const data = await api.put('/users/profile', { name: user.name, profile });
    api.setUser(data.user);
    initSidebar();
    showToast('Goals updated!', 'success');
  } catch (err) { errEl.textContent = err.message; }
}

async function changePassword() {
  const cur = document.getElementById('curPass').value;
  const nw = document.getElementById('newPass').value;
  const conf = document.getElementById('confPass').value;
  const errEl = document.getElementById('passwordError');
  errEl.textContent = '';
  if (!cur || !nw || !conf) { errEl.textContent = 'All fields are required'; return; }
  if (nw !== conf) { errEl.textContent = 'New passwords do not match'; return; }
  if (nw.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }
  try {
    await api.put('/users/password', { currentPassword: cur, newPassword: nw });
    showToast('Password changed successfully!', 'success');
    document.getElementById('curPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confPass').value = '';
  } catch (err) { errEl.textContent = err.message; }
}

document.addEventListener('DOMContentLoaded', loadSettingsData);
