let charts = {};

async function loadAnalytics() {
  const days = document.getElementById('rangePicker').value;
  try {
    const [data, actLogs] = await Promise.all([
      api.get(`/analytics/progress?days=${days}`),
      api.get(`/activity?days=${days}`).catch(() => ({ logs: [] }))
    ]);
    const { workouts, nutrition } = data;

    // Build date range
    const dateMap = {};
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dateMap[d.toISOString().split('T')[0]] = { cals: 0, protein: 0, carbs: 0, fat: 0, workoutCount: 0, calsBurned: 0, steps: 0, hr: null };
    }
    workouts.forEach(w => {
      const key = new Date(w.date).toISOString().split('T')[0];
      if (dateMap[key]) { dateMap[key].workoutCount++; dateMap[key].calsBurned += w.totalCaloriesBurned; }
    });
    nutrition.forEach(n => {
      const key = new Date(n.date).toISOString().split('T')[0];
      if (dateMap[key]) { dateMap[key].cals = n.totals.calories; dateMap[key].protein = n.totals.protein; dateMap[key].carbs = n.totals.carbs; dateMap[key].fat = n.totals.fat; }
    });
    (actLogs.logs || []).forEach(l => {
      const key = new Date(l.date).toISOString().split('T')[0];
      if (dateMap[key]) { dateMap[key].steps = l.steps || 0; dateMap[key].hr = l.heartRate; }
    });

    const keys = Object.keys(dateMap);
    const labels = keys.map(k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const calsBurnedArr = keys.map(k => dateMap[k].calsBurned);
    const calIntakeArr = keys.map(k => dateMap[k].cals);
    const workoutArr = keys.map(k => dateMap[k].workoutCount);
    const stepsArr = keys.map(k => dateMap[k].steps);
    const hrArr = keys.map(k => dateMap[k].hr);
    const proteinArr = keys.map(k => dateMap[k].protein);
    const carbsArr = keys.map(k => dateMap[k].carbs);
    const fatArr = keys.map(k => dateMap[k].fat);

    // Summary badges
    const totalCalsBurned = calsBurnedArr.reduce((a, b) => a + b, 0);
    const nonZeroCals = calIntakeArr.filter(c => c > 0);
    const avgCals = nonZeroCals.length > 0 ? Math.round(nonZeroCals.reduce((a, b) => a + b, 0) / nonZeroCals.length) : 0;
    const totalSteps = stepsArr.reduce((a, b) => a + b, 0);
    document.getElementById('totalCalsBurned').textContent = totalCalsBurned.toLocaleString() + ' total';
    document.getElementById('avgCalIntake').textContent = avgCals + ' avg/day';
    document.getElementById('totalWorkoutsLabel').textContent = workouts.length + ' workouts';
    if (document.getElementById('totalStepsLabel')) document.getElementById('totalStepsLabel').textContent = totalSteps.toLocaleString() + ' steps';

    const rebuild = (id, config) => { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), config); };

    // Calories burned — gradient bars
    const burnCtx = document.getElementById('calsBurnedChart').getContext('2d');
    const burnGrad = burnCtx.createLinearGradient(0, 0, 0, 220);
    burnGrad.addColorStop(0, 'rgba(155,126,255,0.95)');
    burnGrad.addColorStop(1, 'rgba(124,92,252,0.3)');
    rebuild('calsBurnedChart', {
      type: 'bar',
      data: { labels, datasets: [{ data: calsBurnedArr, backgroundColor: burnGrad, borderRadius: 7, borderSkipped: false }] },
      options: enhancedBarOpts('kcal', 'rgba(124,92,252,0.3)')
    });

    // Calorie intake — smooth area
    const intakeCtx = document.getElementById('calIntakeChart').getContext('2d');
    const intakeGrad = intakeCtx.createLinearGradient(0, 0, 0, 220);
    intakeGrad.addColorStop(0, 'rgba(255,107,157,0.3)');
    intakeGrad.addColorStop(1, 'rgba(255,107,157,0.01)');
    rebuild('calIntakeChart', {
      type: 'line',
      data: { labels, datasets: [{ data: calIntakeArr, borderColor: 'rgba(255,107,157,1)', backgroundColor: intakeGrad, fill: true, tension: 0.45, pointRadius: 4, pointBackgroundColor: 'rgba(255,107,157,1)', pointBorderColor: '#0d0d1a', pointBorderWidth: 2 }] },
      options: enhancedLineOpts('kcal', 'rgba(255,107,157,0.3)')
    });

    // Workout frequency — gradient bars
    const wCtx = document.getElementById('workoutFreqChart').getContext('2d');
    const wGrad = wCtx.createLinearGradient(0, 0, 0, 220);
    wGrad.addColorStop(0, 'rgba(0,212,170,0.9)');
    wGrad.addColorStop(1, 'rgba(0,212,170,0.25)');
    rebuild('workoutFreqChart', {
      type: 'bar',
      data: { labels, datasets: [{ data: workoutArr, backgroundColor: wGrad, borderRadius: 7, borderSkipped: false }] },
      options: enhancedBarOpts('workouts', 'rgba(0,212,170,0.3)')
    });

    // Macro breakdown — enhanced doughnut
    const avgP = Math.round(proteinArr.filter(v => v > 0).reduce((a, b) => a + b, 0) / (proteinArr.filter(v => v > 0).length || 1));
    const avgC = Math.round(carbsArr.filter(v => v > 0).reduce((a, b) => a + b, 0) / (carbsArr.filter(v => v > 0).length || 1));
    const avgF = Math.round(fatArr.filter(v => v > 0).reduce((a, b) => a + b, 0) / (fatArr.filter(v => v > 0).length || 1));
    rebuild('macroAvgChart', {
      type: 'doughnut',
      data: {
        labels: [`Protein (${avgP}g)`, `Carbs (${avgC}g)`, `Fat (${avgF}g)`],
        datasets: [{ data: [avgP, avgC, avgF], backgroundColor: ['rgba(155,126,255,0.9)', 'rgba(255,107,157,0.85)', 'rgba(255,209,102,0.85)'], borderWidth: 3, borderColor: '#0d0d1a', hoverOffset: 10 }]
      },
      options: {
        responsive: true, cutout: '62%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', padding: 16, font: { size: 12 } } },
          tooltip: { backgroundColor: 'rgba(13,13,26,0.96)', borderColor: 'rgba(124,92,252,0.3)', borderWidth: 1, callbacks: { label: ctx => `  ${ctx.label}` } }
        }
      }
    });

    // Steps trend chart (new)
    if (document.getElementById('stepsChart')) {
      const sCtx = document.getElementById('stepsChart').getContext('2d');
      const sGrad = sCtx.createLinearGradient(0, 0, 0, 220);
      sGrad.addColorStop(0, 'rgba(255,140,66,0.35)');
      sGrad.addColorStop(1, 'rgba(255,140,66,0.01)');
      const user = api.getUser();
      const stepGoal = user?.profile?.dailyStepGoal || 10000;
      rebuild('stepsChart', {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Steps', data: stepsArr, borderColor: 'rgba(255,140,66,1)', backgroundColor: sGrad, fill: true, tension: 0.45, pointRadius: 4, pointBackgroundColor: 'rgba(255,140,66,1)', pointBorderColor: '#0d0d1a', pointBorderWidth: 2 },
            { label: 'Goal', data: stepsArr.map(() => stepGoal), borderColor: 'rgba(255,255,255,0.15)', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false }
          ]
        },
        options: enhancedLineOpts('steps', 'rgba(255,140,66,0.3)')
      });
    }

  } catch (err) { showToast(err.message, 'error'); }
}

function enhancedBarOpts(yLabel, tooltipBorder) {
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(13,13,26,0.96)', borderColor: tooltipBorder, borderWidth: 1, titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)', padding: 12, callbacks: { label: ctx => `  ${yLabel}: ${ctx.parsed.y.toLocaleString()}` } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }, title: { display: false } },
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 }, maxTicksLimit: 10 } }
    }
  };
}

function enhancedLineOpts(yLabel, tooltipBorder) {
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(13,13,26,0.96)', borderColor: tooltipBorder, borderWidth: 1, titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)', padding: 12, callbacks: { label: ctx => `  ${yLabel}: ${ctx.parsed.y.toLocaleString()}` } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 }, maxTicksLimit: 10 } }
    }
  };
}

document.addEventListener('DOMContentLoaded', loadAnalytics);
