let currentLog = null;
let waterCount = 0;
let lookupDebounce = null;
let aiNutrition = null; // stores the last AI lookup result

// ===== SIMPLE FOOD NUTRITION DATABASE =====
const foodDatabase = {
  egg: { calories: 155, protein: 13, carbs: 1, fat: 11 },
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  milk: { calories: 60, protein: 3.2, carbs: 5, fat: 3.3 },
  bread: { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  apple: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  banana: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }
};

function calculateNutrition(foodName, quantity) {

  const food = foodDatabase[foodName.toLowerCase()];

  if (!food) {
    alert("Food not found in database");
    return null;
  }

  // quantity multiply mat karo
  return {
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat
  };
}

async function loadDietPage() {
  const user = api.getUser();
  if (user?.profile) {
    document.getElementById('calGoal').textContent = user.profile.dailyCalorieGoal || 2000;
    const proteinGoal = Math.round((user.profile.weight || 70) * 1.6);
    document.getElementById('proteinGoal').textContent = proteinGoal;
    document.getElementById('carbsGoal').textContent = '250';
  }
  await loadTodayLog();
  renderWaterTracker();
}

async function loadTodayLog() {
  try {
    const data = await api.get('/nutrition');
    currentLog = data.log;
    waterCount = data.log.totals?.water || 0;
    updateMacros();
    renderMeals();
    renderWaterTracker();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateMacros() {
  if (!currentLog) return;
  const t = currentLog.totals;
  const user = api.getUser();
  const calGoal = user?.profile?.dailyCalorieGoal || 2000;
  const proteinGoal = Math.round((user?.profile?.weight || 70) * 1.6);

  document.getElementById('macroCalories').textContent = Math.round(t.calories || 0);
  document.getElementById('macroProtein').textContent = Math.round(t.protein || 0) + 'g';
  document.getElementById('macroCarbs').textContent = Math.round(t.carbs || 0) + 'g';
  document.getElementById('macroFat').textContent = Math.round(t.fat || 0) + 'g';

  document.getElementById('calProgress').style.width = Math.min(100, (t.calories / calGoal) * 100) + '%';
  document.getElementById('proteinProgress').style.width = Math.min(100, (t.protein / proteinGoal) * 100) + '%';
  document.getElementById('carbsProgress').style.width = Math.min(100, (t.carbs / 250) * 100) + '%';
  document.getElementById('fatProgress').style.width = Math.min(100, (t.fat / 65) * 100) + '%';
}

function renderMeals() {
  const meals = [
    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { key: 'lunch', label: 'Lunch', icon: '☀️' },
    { key: 'dinner', label: 'Dinner', icon: '🌙' },
    { key: 'snacks', label: 'Snacks', icon: '🍎' }
  ];
  const container = document.getElementById('mealsGrid');
  container.innerHTML = meals.map(m => {
    const items = currentLog?.meals?.[m.key] || [];
    const totalCal = items.reduce((s, f) => s + (f.calories * f.quantity), 0);
    return `
      <div class="meal-card">
        <div class="meal-header">
          <h4>${m.icon} ${m.label}</h4>
          <span class="meal-cals">${Math.round(totalCal)} kcal</span>
        </div>
        ${items.length === 0 ? '<div class="meal-empty">No foods logged yet</div>' : items.map(f => `
          <div class="food-item">
            <div>
              <div class="food-name">${f.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${f.quantity} serving · P:${Math.round(f.protein*f.quantity)}g C:${Math.round(f.carbs*f.quantity)}g F:${Math.round(f.fat*f.quantity)}g</div>
            </div>
            <span class="food-cal">${Math.round(f.calories * f.quantity)} kcal</span>
            <button class="food-del" onclick="deleteFood('${m.key}', '${f._id}')">✕</button>
          </div>
        `).join('')}
        <button class="btn-ghost btn-sm" style="margin-top:10px;width:100%" onclick="showAddFoodModal('${m.key}')">+ Add ${m.label}</button>
      </div>
    `;
  }).join('');
}

function renderWaterTracker() {
  const container = document.getElementById('waterGlasses');
  document.getElementById('waterBadge').textContent = `${waterCount} / 8 glasses`;
  container.innerHTML = Array.from({ length: 8 }, (_, i) => `
    <button class="water-glass ${i < waterCount ? 'filled' : ''}" onclick="setWater(${i + 1})" title="${i + 1} glass${i > 0 ? 'es' : ''}">💧</button>
  `).join('');
}

async function setWater(glasses) {
  try {
    waterCount = glasses;
    await api.put('/nutrition/water', { glasses });
    renderWaterTracker();
    if (currentLog) currentLog.totals.water = glasses;
    showToast(`Water updated: ${glasses} glasses`, 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

function showAddFoodModal(meal = 'breakfast') {
  document.getElementById('foodMeal').value = meal;
  document.getElementById('addFoodModal').classList.add('active');
  // Reset state
  aiNutrition = null;
  document.getElementById('nutritionPreview').style.display = 'none';
  document.getElementById('lookupStatus').style.display = 'none';
  ['foodName','foodCal','foodProtein','foodCarbs','foodFat'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('foodQty').value = '1';
  document.getElementById('foodError').textContent = '';
  setTimeout(() => document.getElementById('foodName').focus(), 100);
  
}

function closeAddFoodModal(e) {
  if (e.target.id === 'addFoodModal') document.getElementById('addFoodModal').classList.remove('active');
}

// Debounce lookup as user types
function onFoodNameInput() {
  clearTimeout(lookupDebounce);
  aiNutrition = null;
  document.getElementById('nutritionPreview').style.display = 'none';
  document.getElementById('lookupStatus').style.display = 'none';
  const name = document.getElementById('foodName').value.trim();
  if (name.length < 3) return;
  lookupDebounce = setTimeout(() => lookupNutrition(), 900);
}

// async function lookupNutrition() {
//   const name = document.getElementById('foodName').value.trim();
//   if (!name) return;
//   const qty = parseFloat(document.getElementById('foodQty').value) || 1;
//   const statusDiv = document.getElementById('lookupStatus');
//   const previewDiv = document.getElementById('nutritionPreview');
//   const btn = document.getElementById('lookupBtn');

//   statusDiv.style.display = 'flex';
//   document.getElementById('lookupStatusIcon').textContent = '⏳';
//   document.getElementById('lookupStatusText').textContent = `Looking up "${name}"...`;
//   previewDiv.style.display = 'none';
//   btn.textContent = '...';
//   btn.disabled = true;

//   try {
//     const GEMINI_API_KEY = 'AIzaSyB4EnfF5QepM7gPWZDoHUXwX8OcIlg0VN4';

//     const prompt = `You are a nutrition database. For the food item "${name}" (quantity: ${qty} serving), respond ONLY with a valid JSON object, no extra text, no markdown:
// {
//   "calories": <total calories as number>,
//   "protein": <total protein in grams as number>,
//   "carbs": <total carbs in grams as number>,
//   "fat": <total fat in grams as number>,
//   "fiber": <total fiber in grams as number>,
//   "serving_description": "<e.g. 1 cup or 200g>",
//   "food_name": "<full corrected food name>"
// }`;

//     const res = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
//       {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           contents: [{ parts: [{ text: prompt }] }],
//           generationConfig: { maxOutputTokens: 300, temperature: 0.1 }
//         })
//       }
//     );

//     if (!res.ok) throw new Error('Gemini API error: ' + res.status);

//     const data = await res.json();
//     const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

//     // Strip markdown code blocks if present
//     const cleaned = rawText.replace(/```json|```/g, '').trim();
//     const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
//     if (!jsonMatch) throw new Error('Could not parse response');

//     const n = JSON.parse(jsonMatch[0]);
//     aiNutrition = n;

//     // Fill hidden inputs
//     document.getElementById('foodCal').value = Math.round(n.calories);
//     document.getElementById('foodProtein').value = Math.round(n.protein);
//     document.getElementById('foodCarbs').value = Math.round(n.carbs);
//     document.getElementById('foodFat').value = Math.round(n.fat);

//     // Show preview
//     document.getElementById('previewFoodName').textContent = n.food_name || name;
//     document.getElementById('previewServing').textContent = n.serving_description || `${qty} serving`;
//     document.getElementById('previewCalories').textContent = Math.round(n.calories) + ' kcal';
//     document.getElementById('previewProtein').textContent = Math.round(n.protein) + 'g';
//     document.getElementById('previewCarbs').textContent = Math.round(n.carbs) + 'g';
//     document.getElementById('previewFat').textContent = Math.round(n.fat) + 'g';

//     if (n.food_name && n.food_name !== name) {
//       document.getElementById('foodName').value = n.food_name;
//     }

//     statusDiv.style.display = 'none';
//     previewDiv.style.display = 'block';

//   } catch (err) {
//     console.error('Lookup error:', err);
//     document.getElementById('lookupStatusIcon').textContent = '❌';
//     document.getElementById('lookupStatusText').textContent = 'AI lookup failed — enter values manually below.';
//     document.getElementById('manualOverride').open = true;
//   } finally {
//     btn.textContent = '✨ AI Lookup';
//     btn.disabled = false;
//   }
// }
// async function addFood() {

//   const name = document.getElementById('foodName').value.trim().toLowerCase();
//   const qty = parseFloat(document.getElementById('foodQty').value) || 1;
//   const meal = document.getElementById('foodMeal').value;
//   const errEl = document.getElementById('foodError');

//   errEl.textContent = '';

//   if (!name) {
//     errEl.textContent = 'Please enter a food name';
//     return;
//   }

//   let calories, protein, carbs, fat;

//   // ===== TRY DATABASE FIRST =====
//   const nutrition = calculateNutrition(name, qty);

//   if (nutrition) {

//     calories = nutrition.calories;
//     protein = nutrition.protein;
//     carbs = nutrition.carbs;
//     fat = nutrition.fat;

//   } else {

//     // ===== MANUAL INPUT =====
//     calories = parseFloat(document.getElementById('foodCal').value);
//     protein = parseFloat(document.getElementById('foodProtein').value) || 0;
//     carbs = parseFloat(document.getElementById('foodCarbs').value) || 0;
//     fat = parseFloat(document.getElementById('foodFat').value) || 0;

//     if (!calories) {
//       errEl.textContent = "Food not in database. Enter calories manually.";
//       return;
//     }

//   }

//   try {

//     await api.post(`/nutrition/meal/${meal}`, {
//       name,
//       quantity: qty,
//       calories,
//       protein,
//       carbs,
//       fat
//     });

//     document.getElementById('addFoodModal').classList.remove('active');

//     showToast(`✅ ${name} added to ${meal}!`, 'success');

//     await loadTodayLog();

//   } catch (err) {

//     errEl.textContent = err.message;

//   }

// }

async function addFood() {

  const name = document.getElementById('foodName').value.trim();
  const qty = parseFloat(document.getElementById('foodQty').value) || 1;
  const meal = document.getElementById('foodMeal').value;
  const errEl = document.getElementById('foodError');

  errEl.textContent = '';

  try {

    const lookup = await api.post('/nutrition/lookup', {
      foodName: name,
      quantity: qty
    });

    const n = lookup.nutrition;

    await api.post(`/nutrition/meal/${meal}`, {
      name: n.food_name || name,
      quantity: qty,
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat
    });

    document.getElementById('addFoodModal').classList.remove('active');

    showToast(`✅ ${name} added successfully`, 'success');

    await loadTodayLog();

  } catch (err) {

    console.error(err);
    errEl.textContent = err.message;

  }
}


// async function addFood() {
//   const name = document.getElementById('foodName').value.trim();
//   const qty = parseFloat(document.getElementById('foodQty').value) || 1;
//   const meal = document.getElementById('foodMeal').value;
//   const errEl = document.getElementById('foodError');
//   errEl.textContent = '';

//   if (!name) { errEl.textContent = 'Please enter a food name'; return; }

//   // Use AI result or manual input
//   const calories = parseFloat(document.getElementById('foodCal').value) || (aiNutrition?.calories);
//   const protein = parseFloat(document.getElementById('foodProtein').value) || (aiNutrition?.protein) || 0;
//   const carbs = parseFloat(document.getElementById('foodCarbs').value) || (aiNutrition?.carbs) || 0;
//   const fat = parseFloat(document.getElementById('foodFat').value) || (aiNutrition?.fat) || 0;

//   if (!calories) {
//     errEl.textContent = 'Please use AI Lookup first, or enter calories manually';
//     return;
//   }

//   try {
//     await api.post(`/nutrition/meal/${meal}`, { name, quantity: qty, calories, protein, carbs, fat });
//     document.getElementById('addFoodModal').classList.remove('active');
//     showToast(`✅ ${name} added to ${meal}!`, 'success');
//     aiNutrition = null;
//     await loadTodayLog();
//   } catch (err) { errEl.textContent = err.message; }
// }

// async function deleteFood(mealType, foodId) {
//   try {
//     await api.delete(`/nutrition/meal/${mealType}/${foodId}`);
//     showToast('Food removed', 'info');
//     await loadTodayLog();
//   } catch (err) { showToast(err.message, 'error'); }
// }

// document.addEventListener('DOMContentLoaded', loadDietPage);
