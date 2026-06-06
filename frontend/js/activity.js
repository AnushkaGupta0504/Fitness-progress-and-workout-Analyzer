let hrChart, stepsWeekChart;
let liveSimInterval = null;
let hrHistory = [];

async function loadActivityData() {
  try {
    const [todayData, logsData] = await Promise.all([
      api.get('/activity/today'),
      api.get('/activity?days=7')
    ]);

    const a = todayData.activity;
    const user = api.getUser();
    const stepGoal = user?.profile?.dailyStepGoal || 10000;

    // Hero cards
    updateStepDisplay(a.steps, stepGoal);
    updateHRDisplay(a.heartRate, a.hrZone, a.maxHR, a.caloriesEstimate);
    updateActiveDisplay(a.activeMinutes);
    updateDistDisplay(a.distance);

    // History timeline
    renderTimeline(logsData.logs, stepGoal);

    // 7-day steps chart
    renderStepsWeekChart(logsData.logs, stepGoal);

    // HR live chart (start with empty)
    initHRChart();

  } catch (err) {
    showToast('Could not load activity data', 'error');
  }
}

function updateStepDisplay(steps, goal) {
  const pct = Math.min(100, Math.round((steps / goal) * 100));
  document.getElementById('heroSteps').textContent = steps.toLocaleString();
  document.getElementById('heroStepGoal').textContent = goal.toLocaleString();
  document.getElementById('stepsProgressBar').style.width = pct + '%';
  document.getElementById('stepBadge').textContent = pct + '%';
  document.getElementById('stepGoalDisplay').textContent = goal.toLocaleString();
  document.getElementById('stepRemaining').textContent = Math.max(0, goal - steps).toLocaleString();
  document.getElementById('stepCalories').textContent = Math.round(steps * 0.04) + ' kcal';

  // Ring
  const circumference = 377;
  const offset = circumference - (pct / 100) * circumference;
  document.getElementById('stepRingCircle').style.strokeDashoffset = offset;
  document.getElementById('stepRingNum').textContent = steps >= 1000 ? (steps / 1000).toFixed(1) + 'k' : steps;
  document.getElementById('stepRingPct').textContent = pct + '%';
}

function updateHRDisplay(hr, zone, maxHR, cals) {
  const display = document.getElementById('hrBpmDisplay');
  const numEl = document.getElementById('hrBpmNum');
  const user = api.getUser();
  const age = user?.profile?.age || 30;
  const max = maxHR || (220 - age);

  numEl.textContent = hr || '--';
  document.getElementById('heroHR').textContent = hr ? hr + ' bpm' : '—';
  document.getElementById('heroHRZone').textContent = 'Zone: ' + (zone || '—');
  document.getElementById('hrZoneDetail').textContent = zone || '—';
  document.getElementById('hrMaxDetail').textContent = max + ' bpm';
  document.getElementById('hrCalDetail').textContent = cals ? cals + ' kcal' : '—';

  if (hr) {
    display.classList.add('beating');
    const pct = (hr / max) * 100;
    document.getElementById('hrProgressBar').style.width = Math.min(100, pct) + '%';
  }

  // Zone bars
  const zones = ['Resting', 'Light', 'Moderate', 'Hard', 'Maximum'];
  const zoneIds = ['zoneResting', 'zoneLight', 'zoneModerate', 'zoneHard', 'zoneMax'];
  zoneIds.forEach((id, i) => {
    document.getElementById(id).style.width = zones[i] === zone ? '100%' : '20%';
  });

  // HR badge color
  const zoneColors = { Resting: '#60a5fa', Light: '#34d399', Moderate: '#ffd166', Hard: '#ff8c42', Maximum: '#ef4444' };
  document.getElementById('hrStatusBadge').style.background = zoneColors[zone] || 'rgba(255,255,255,0.1)';
  document.getElementById('hrStatusBadge').style.color = '#fff';
}

function updateActiveDisplay(mins) {
  document.getElementById('heroActive').textContent = mins + ' min';
  document.getElementById('activeProgressBar').style.width = Math.min(100, (mins / 30) * 100) + '%';
}

function updateDistDisplay(km) {
  document.getElementById('heroDistance').textContent = (km || 0).toFixed(1) + ' km';
  document.getElementById('distProgressBar').style.width = Math.min(100, ((km || 0) / 10) * 100) + '%';
}

function initHRChart() {
  if (hrChart) hrChart.destroy();
  const ctx = document.getElementById('hrChart').getContext('2d');
  hrChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 300 },
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 40, max: 200,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }
        },
        x: { display: false }
      }
    }
  });
}

function pushHRPoint(bpm) {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  hrHistory.push({ time: now, bpm });
  if (hrHistory.length > 40) hrHistory.shift();

  if (hrChart) {
    hrChart.data.labels = hrHistory.map(h => h.time);
    hrChart.data.datasets[0].data = hrHistory.map(h => h.bpm);
    hrChart.update('none');
  }
}

function renderStepsWeekChart(logs, stepGoal) {
  const days = 7;
  const dateMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dateMap[key] = 0;
  }
  logs.forEach(l => {
    const key = new Date(l.date).toISOString().split('T')[0];
    if (key in dateMap) dateMap[key] = l.steps;
  });

  const labels = Object.keys(dateMap).map(k => {
    const d = new Date(k);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });
  const data = Object.values(dateMap);

  if (stepsWeekChart) stepsWeekChart.destroy();
  stepsWeekChart = new Chart(document.getElementById('stepsWeekChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map(v => v >= stepGoal ? 'rgba(124,92,252,0.85)' : 'rgba(124,92,252,0.35)'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }
        }
      }
    }
  });
}

function renderTimeline(logs, stepGoal) {
  const container = document.getElementById('activityTimeline');
  if (!logs.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏃</div><p>No activity data yet. Log your first entry!</p></div>';
    return;
  }

  container.innerHTML = logs.map(l => {
    const pct = Math.min(100, (l.steps / stepGoal) * 100);
    const dateStr = new Date(l.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dotColor = pct >= 100 ? '#34d399' : pct >= 70 ? 'var(--primary-light)' : 'var(--text-muted)';
    return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:${dotColor}"></div>
        <div class="timeline-date">${dateStr}</div>
        <div class="timeline-steps">${(l.steps || 0).toLocaleString()} steps</div>
        <div class="timeline-bar-wrap">
          <div class="timeline-bar" style="width:${pct}%"></div>
        </div>
        <div class="timeline-hr">${l.heartRate ? '❤️ ' + l.heartRate : '—'}</div>
      </div>
    `;
  }).join('');
}

async function logActivity() {
  const steps = parseInt(document.getElementById('inputSteps').value) || 0;
  const heartRate = parseInt(document.getElementById('inputHR').value) || null;
  const activeMinutes = parseInt(document.getElementById('inputActive').value) || 0;
  const distance = parseFloat(document.getElementById('inputDist').value) || 0;

  if (!steps && !heartRate && !activeMinutes && !distance) {
    showToast('Please enter at least one value', 'warning');
    return;
  }

  try {
    await api.post('/activity/log', { steps, heartRate, activeMinutes, distance });
    showToast('Activity logged successfully! 🎉', 'success');
    loadActivityData();
    document.getElementById('inputSteps').value = '';
    document.getElementById('inputHR').value = '';
    document.getElementById('inputActive').value = '';
    document.getElementById('inputDist').value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Simulate live wearable data
function simulateLiveData() {
  if (liveSimInterval) {
    clearInterval(liveSimInterval);
    liveSimInterval = null;
    showToast('Live simulation stopped', 'info');
    return;
  }

  showToast('⚡ Live simulation started!', 'success');
  let stepCount = Math.floor(Math.random() * 5000) + 2000;
  let baseHR = 65 + Math.floor(Math.random() * 30);

  const user = api.getUser();
  const age = user?.profile?.age || 30;
  const maxHR = 220 - age;

  const tick = () => {
    stepCount += Math.floor(Math.random() * 8) + 1;
    baseHR += (Math.random() - 0.48) * 4;
    baseHR = Math.max(50, Math.min(185, baseHR));
    const hr = Math.round(baseHR);
    const stepGoal = user?.profile?.dailyStepGoal || 10000;

    // HR zone
    const pct = (hr / maxHR) * 100;
    let zone = 'Resting';
    if (pct >= 90) zone = 'Maximum';
    else if (pct >= 80) zone = 'Hard';
    else if (pct >= 70) zone = 'Moderate';
    else if (pct >= 50) zone = 'Light';

    const dist = (stepCount * 0.00075).toFixed(2);
    const active = Math.round(stepCount / 100);

    updateStepDisplay(stepCount, stepGoal);
    updateHRDisplay(hr, zone, maxHR, Math.round(stepCount * 0.04));
    updateActiveDisplay(Math.min(active, 120));
    updateDistDisplay(parseFloat(dist));
    pushHRPoint(hr);
  };

  tick();
  liveSimInterval = setInterval(tick, 1200);
}

document.addEventListener('DOMContentLoaded', loadActivityData);
