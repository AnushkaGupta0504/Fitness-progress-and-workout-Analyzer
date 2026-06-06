let caloriesChart, macroChart, workoutsChart;

async function loadDashboard() {
  try {
    const user = api.getUser();
    if (user?.profile) {
      document.getElementById('stepGoal').textContent = (user.profile.dailyStepGoal || 10000).toLocaleString();
      document.getElementById('calGoal').textContent = user.profile.dailyCalorieGoal || 2000;
    }

    const [dashData, workoutsData, activityData] = await Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/workouts?limit=5'),
      api.get('/activity/today').catch(() => ({ activity: { steps: 0, heartRate: null, hrZone: '—' } }))
    ]);

    const d = dashData.dashboard;
    const act = activityData.activity;

    // Stats
    document.getElementById('statSteps').textContent = act.steps > 0 ? act.steps.toLocaleString() : '—';
    document.getElementById('statCalsBurned').textContent = d.weeklyCaloriesBurned.toLocaleString() + ' kcal';
    document.getElementById('statCalories').textContent = d.todayCalories.toLocaleString() + ' kcal';
    document.getElementById('statWater').innerHTML = `${d.todayWater} <span style="font-size:1rem">glasses</span>`;
    document.getElementById('weeklyWorkoutBadge').textContent = `${d.weeklyWorkouts} this week`;

    if (act.heartRate) {
      document.getElementById('statHeartRate').textContent = act.heartRate + ' bpm';
      document.getElementById('statHRZone').textContent = 'Zone: ' + (act.hrZone || '—');
    } else {
      document.getElementById('statHeartRate').textContent = '—';
      document.getElementById('statHRZone').textContent = 'Track on Activity page';
    }

    // Labels
    const labels = d.dailyData.map(x => new Date(x.date).toLocaleDateString('en-US', { weekday: 'short' }));
    const calsBurnedData = d.dailyData.map(x => x.caloriesBurned);
    const calsConsumedData = d.dailyData.map(x => x.calories);

    // ENHANCED Calories Chart - gradient bars
    if (caloriesChart) caloriesChart.destroy();
    const caloriesCtx = document.getElementById('caloriesChart').getContext('2d');
    const burnedGrad = caloriesCtx.createLinearGradient(0, 0, 0, 220);
    burnedGrad.addColorStop(0, 'rgba(155,126,255,0.95)');
    burnedGrad.addColorStop(1, 'rgba(124,92,252,0.4)');
    const consumedGrad = caloriesCtx.createLinearGradient(0, 0, 0, 220);
    consumedGrad.addColorStop(0, 'rgba(255,107,157,0.9)');
    consumedGrad.addColorStop(1, 'rgba(255,107,157,0.25)');

    caloriesChart = new Chart(caloriesCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Burned', data: calsBurnedData, backgroundColor: burnedGrad, borderRadius: 8, borderSkipped: false },
          { label: 'Consumed', data: calsConsumedData, backgroundColor: consumedGrad, borderRadius: 8, borderSkipped: false }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, boxWidth: 12, padding: 16 } },
          tooltip: {
            backgroundColor: 'rgba(13,13,26,0.96)', borderColor: 'rgba(124,92,252,0.3)', borderWidth: 1,
            titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)', padding: 12,
            callbacks: { label: ctx => `  ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} kcal` }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } }
        }
      }
    });

    // ENHANCED Macro doughnut
    const protein = d.todayProtein || 60, carbs = d.todayCarbs || 200, fat = d.todayFat || 50;
    if (macroChart) macroChart.destroy();
    macroChart = new Chart(document.getElementById('macroChart'), {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{ data: [protein, carbs, fat], backgroundColor: ['rgba(155,126,255,0.9)','rgba(255,107,157,0.85)','rgba(255,209,102,0.85)'], borderWidth: 3, borderColor: '#0d0d1a', hoverOffset: 8 }]
      },
      options: {
        responsive: true, cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: 'rgba(13,13,26,0.96)', borderColor: 'rgba(124,92,252,0.3)', borderWidth: 1, callbacks: { label: ctx => `  ${ctx.label}: ${Math.round(ctx.parsed)}g` } }
        }
      }
    });

    document.getElementById('macroLegend').innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:rgba(155,126,255,0.9)"></div> Protein ${Math.round(protein)}g</div>
      <div class="legend-item"><div class="legend-dot" style="background:rgba(255,107,157,0.85)"></div> Carbs ${Math.round(carbs)}g</div>
      <div class="legend-item"><div class="legend-dot" style="background:rgba(255,209,102,0.85)"></div> Fat ${Math.round(fat)}g</div>
    `;

    // ENHANCED Weekly workouts - smooth area chart
    const workoutsByDay = d.dailyData.map(x => x.workouts);
    if (workoutsChart) workoutsChart.destroy();
    const wCtx = document.getElementById('workoutsChart').getContext('2d');
    const wGrad = wCtx.createLinearGradient(0, 0, 0, 160);
    wGrad.addColorStop(0, 'rgba(0,212,170,0.35)');
    wGrad.addColorStop(1, 'rgba(0,212,170,0.01)');
    workoutsChart = new Chart(wCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Workouts', data: workoutsByDay, borderColor: 'rgba(0,212,170,1)', backgroundColor: wGrad, fill: true, tension: 0.45, pointBackgroundColor: 'rgba(0,212,170,1)', pointBorderColor: '#0d0d1a', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(13,13,26,0.96)', borderColor: 'rgba(0,212,170,0.3)', borderWidth: 1, callbacks: { label: ctx => `  Workouts: ${ctx.parsed.y}` } } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, color: 'rgba(255,255,255,0.4)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } } }
        }
      }
    });

    // Activity list
    const actList = document.getElementById('activityList');
    const workouts = workoutsData.workouts;
    if (workouts.length === 0) {
      actList.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><p>No workouts logged yet. <a href="workouts.html" style="color:var(--primary-light)">Add your first workout</a></p></div>';
    } else {
      const typeIcons = { cardio: '🏃', strength: '💪', yoga: '🧘', hiit: '⚡', sports: '⚽', mixed: '🔥' };
      const typeColors = { cardio: 'var(--accent-teal)', strength: 'var(--primary-light)', yoga: 'var(--accent-pink)', hiit: 'var(--accent-orange)', sports: 'var(--accent-yellow)', mixed: 'var(--primary-light)' };
      actList.innerHTML = workouts.map(w => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${typeColors[w.type] || 'var(--primary-light)'}"></div>
          <div class="activity-info">
            <div class="activity-name">${w.title}</div>
            <div class="activity-meta">${typeIcons[w.type] || '🏋️'} ${w.type} · ${new Date(w.date).toLocaleDateString()}</div>
          </div>
          <div class="activity-val">${w.totalCaloriesBurned} kcal</div>
        </div>`).join('');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadDashboard);
