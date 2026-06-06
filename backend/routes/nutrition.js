const express = require('express');
const router = express.Router();
const Nutrition = require('../models/Nutrition');
const { protect } = require('../middleware/auth');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Get nutrition log by date
router.get('/', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));
    let log = await Nutrition.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    if (!log) {
      log = { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }, totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 } };
    }
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get weekly nutrition data
router.get('/weekly', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const logs = await Nutrition.find({ user: req.user._id, date: { $gte: sevenDaysAgo } }).sort({ date: 1 });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add food to meal
router.post('/meal/:mealType', protect, async (req, res) => {
  try {
    const { mealType } = req.params;
    const validMeals = ['breakfast', 'lunch', 'dinner', 'snacks'];
    if (!validMeals.includes(mealType)) return res.status(400).json({ success: false, message: 'Invalid meal type' });

    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    let log = await Nutrition.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    if (!log) {
      log = new Nutrition({ user: req.user._id, date: new Date() });
    }
    log.meals[mealType].push(req.body);
    await log.save();
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove food from meal
router.delete('/meal/:mealType/:foodId', protect, async (req, res) => {
  try {
    const { mealType, foodId } = req.params;
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    const log = await Nutrition.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    log.meals[mealType] = log.meals[mealType].filter(f => f._id.toString() !== foodId);
    await log.save();
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update water intake
router.put('/water', protect, async (req, res) => {
  try {
    const { glasses } = req.body;
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    let log = await Nutrition.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    if (!log) log = new Nutrition({ user: req.user._id, date: new Date() });
    log.totals.water = glasses;
    await log.save();
    res.json({ success: true, water: log.totals.water });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// AI-powered food nutrition lookup using Gemini
router.post('/lookup', protect, async (req, res) => {
  try {
    const { foodName, quantity } = req.body;
    if (!foodName) return res.status(400).json({ success: false, message: 'Food name required' });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB4EnfF5QepM7gPWZDoHUXwX8OcIlg0VN4';
    const qty = parseFloat(quantity) || 1;

    const prompt = `You are a nutrition database. For "${foodName}" (quantity: ${qty} serving), respond with ONLY this JSON, no markdown, no extra text:
{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"serving_description":"1 serving","food_name":"name"}
Fill in real values for the food. Return ONLY the JSON object.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.1 }
        })
      }
    );

    const geminiData = await geminiRes.json();
    console.log('Gemini raw response:', JSON.stringify(geminiData)); // for debugging

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiData);
      return res.status(502).json({ success: false, message: 'Gemini API error: ' + (geminiData.error?.message || 'unknown') });
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Raw text:', rawText); // for debugging

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ success: false, message: 'Could not parse AI response' });

    const nutrition = JSON.parse(jsonMatch[0]);
    res.json({ success: true, nutrition });

  } catch (err) {
    console.error('Lookup route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
