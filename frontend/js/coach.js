async function loadCoachData() {
  try {
    const data = await api.get('/coach/analysis');
    const a = data.analysis;

    // Insights
    const insightsList = document.getElementById('insightsList');
    if (a.insights.length === 0) {
      insightsList.innerHTML = '<div class="text-muted" style="padding:8px">Log workouts and meals to get insights!</div>';
    } else {
      insightsList.innerHTML = a.insights.map(i => `
        <div class="insight-item ${i.type}">
          <span style="font-size:1.2rem">${i.icon}</span>
          <span>${i.text}</span>
        </div>
      `).join('');
    }

    // Weekly report rings
    const setRing = (ringId, scoreId, score) => {
      const circumference = 239;
      const offset = circumference - (score / 100) * circumference;
      document.getElementById(ringId).style.strokeDashoffset = offset;
      document.getElementById(scoreId).textContent = score + '%';
    };
    setRing('calRing', 'calScore', a.weeklyReport.calorieScore);
    setRing('wkRing', 'wkScore', a.weeklyReport.workoutScore);
    setRing('nutRing', 'nutScore', a.weeklyReport.nutritionScore);
    document.getElementById('overallScore').textContent = a.weeklyReport.overallScore + '%';

    // BMI
    if (a.bmi) {
      document.getElementById('bmiCard').style.display = 'block';
      document.getElementById('bmiValue').textContent = a.bmi.value;
      document.getElementById('bmiCategory').textContent = a.bmi.category;
      const bmiPercent = Math.min(100, Math.max(0, ((a.bmi.value - 15) / 25) * 100));
      document.getElementById('bmiProgress').style.width = bmiPercent + '%';
      const bmiColors = { Underweight: 'var(--accent-teal)', Normal: '#4ade80', Overweight: 'var(--accent-orange)', Obese: 'var(--accent-pink)' };
      document.getElementById('bmiProgress').style.background = bmiColors[a.bmi.category] || 'var(--primary)';
    }

    // Recommendations
    const recList = document.getElementById('recommendationsList');
    const priorityColors = { high: 'var(--accent-pink)', medium: 'var(--accent-orange)', low: 'var(--accent-teal)' };
    recList.innerHTML = a.recommendations.map(r => `
      <div class="insight-item" style="margin-bottom:10px;border-left:3px solid ${priorityColors[r.priority]}">
        <span style="font-size:0.75rem;font-weight:700;color:${priorityColors[r.priority]};text-transform:uppercase;min-width:40px">${r.priority}</span>
        <span style="font-size:0.88rem">${r.text}</span>
      </div>
    `).join('');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  appendMessage(message, 'user');
  
  const typing = appendTyping();
  try {
    const data = await api.post('/coach/chat', { message });
    typing.remove();
    appendMessage(data.response, 'bot');
  } catch (err) {
    typing.remove();
    appendMessage('Sorry, I could not process your message. Please try again.', 'bot');
  }
}

function sendQuick(msg) {
  document.getElementById('chatInput').value = msg;
  sendMessage();
}

function appendMessage(text, role) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const avatar = role === 'bot' ? '🤖' : (api.getUser()?.name?.[0]?.toUpperCase() || 'U');
  div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">${text}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendTyping() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble" style="animation:pulse 1s infinite">Thinking...</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

document.addEventListener('DOMContentLoaded', loadCoachData);
