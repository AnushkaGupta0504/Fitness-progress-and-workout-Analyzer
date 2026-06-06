let allWorkouts = [];
let currentFilter = 'all';

async function loadWorkoutsPage() {
  document.getElementById('wkDate').value = new Date().toISOString().split('T')[0];
  await Promise.all([loadWeeklySummary(), loadWorkouts()]);
}

async function loadWeeklySummary() {
  try {
    const data = await api.get('/workouts/summary/weekly');
    const s = data.summary;
    document.getElementById('wkWeeklyCount').textContent = s.totalWorkouts;
    document.getElementById('wkWeeklyCals').textContent = s.totalCaloriesBurned.toLocaleString() + ' kcal';
    document.getElementById('wkWeeklyDuration').textContent = s.totalDuration + ' min';
  } catch (err) { /* silent */ }
}

async function loadWorkouts() {
  try {
    const data = await api.get('/workouts?limit=50');
    allWorkouts = data.workouts;
    renderWorkouts(allWorkouts);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderWorkouts(workouts) {
  const container = document.getElementById('workoutsList');
  if (workouts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏋️</div><p>No workouts logged yet. Click "Log Workout" to start!</p></div>`;
    return;
  }
  const typeIcons = { cardio: '🏃', strength: '💪', yoga: '🧘', hiit: '⚡', sports: '⚽', mixed: '🔥' };
  const typeColors = { cardio: 'rgba(0,212,170,0.15)', strength: 'rgba(255,107,157,0.15)', yoga: 'rgba(255,209,102,0.15)', hiit: 'rgba(255,140,66,0.15)', sports: 'rgba(124,92,252,0.15)', mixed: 'rgba(124,92,252,0.15)' };
  const moodEmojis = { great: '😄', good: '🙂', okay: '😐', tired: '😴', bad: '😞' };

  container.innerHTML = workouts.map(w => `
    <div class="workout-card-item">
      <div class="workout-type-icon" style="background:${typeColors[w.type] || 'rgba(124,92,252,0.15)'}">
        ${typeIcons[w.type] || '🏋️'}
      </div>
      <div class="workout-info">
        <div class="workout-title">${w.title}</div>
        <div class="workout-meta">
          <span>📅 ${new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span>⏱️ ${w.totalDuration} min</span>
          <span>🔥 ${w.totalCaloriesBurned} kcal</span>
          ${w.mood ? `<span>${moodEmojis[w.mood] || ''} ${w.mood}</span>` : ''}
        </div>
        ${w.notes ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">📝 ${w.notes}</div>` : ''}
      </div>
      <div class="workout-actions">
        <span class="badge badge-purple">${w.type}</span>
        <button class="btn-icon" onclick="deleteWorkout('${w._id}')" title="Delete" style="color:var(--accent-pink)">🗑️</button>
      </div>
    </div>
  `).join('');
}

function filterWorkouts(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = type === 'all' ? allWorkouts : allWorkouts.filter(w => w.type === type);
  renderWorkouts(filtered);
}

function showWorkoutModal() {
  document.getElementById('workoutModal').classList.add('active');
}
function closeWorkoutModal(e) {
  if (e.target.id === 'workoutModal') document.getElementById('workoutModal').classList.remove('active');
}

async function saveWorkout() {
  const title = document.getElementById('wkTitle').value.trim();
  const type = document.getElementById('wkType').value;
  const totalDuration = parseInt(document.getElementById('wkDuration').value) || 0;
  const totalCaloriesBurned = parseInt(document.getElementById('wkCals').value) || 0;
  const mood = document.getElementById('wkMood').value;
  const date = document.getElementById('wkDate').value;
  const notes = document.getElementById('wkNotes').value.trim();
  const errEl = document.getElementById('workoutError');
  errEl.textContent = '';
  if (!title) { errEl.textContent = 'Workout title is required'; return; }
  try {
    await api.post('/workouts', { title, type, totalDuration, totalCaloriesBurned, mood, date, notes });
    document.getElementById('workoutModal').classList.remove('active');
    showToast('Workout logged! 💪', 'success');
    ['wkTitle','wkDuration','wkCals','wkNotes'].forEach(id => document.getElementById(id).value = '');
    await Promise.all([loadWeeklySummary(), loadWorkouts()]);
  } catch (err) { errEl.textContent = err.message; }
}

async function deleteWorkout(id) {
  if (!confirm('Delete this workout?')) return;
  try {
    await api.delete(`/workouts/${id}`);
    showToast('Workout deleted', 'info');
    await Promise.all([loadWeeklySummary(), loadWorkouts()]);
  } catch (err) { showToast(err.message, 'error'); }
}

document.addEventListener('DOMContentLoaded', loadWorkoutsPage);
