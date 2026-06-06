const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const { protect } = require('../middleware/auth');

// AI Health Analysis - generates insights based on user data
router.get('/analysis', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [workouts, nutritionLogs] = await Promise.all([
      Workout.find({ user: req.user._id, date: { $gte: sevenDaysAgo } }),
      Nutrition.find({ user: req.user._id, date: { $gte: sevenDaysAgo } })
    ]);

    const user = req.user;
    const profile = user.profile || {};
    const insights = [];
    const recommendations = [];

    // Workout analysis
    const totalWorkouts = workouts.length;
    const totalCalsBurned = workouts.reduce((s, w) => s + w.totalCaloriesBurned, 0);
    const avgDuration = totalWorkouts > 0 ? workouts.reduce((s, w) => s + w.totalDuration, 0) / totalWorkouts : 0;

    if (totalWorkouts === 0) {
      insights.push({ type: 'warning', icon: '⚠️', text: "No workouts logged this week. Try to aim for at least 3 sessions." });
    } else if (totalWorkouts < 3) {
      insights.push({ type: 'info', icon: '💪', text: `You've completed ${totalWorkouts} workout(s) this week. Aim for 3-5 for optimal results.` });
    } else {
      insights.push({ type: 'success', icon: '🏆', text: `Excellent! ${totalWorkouts} workouts this week. You're building great consistency!` });
    }

    if (totalCalsBurned > 0) {
      insights.push({ type: 'info', icon: '🔥', text: `You've burned ${Math.round(totalCalsBurned)} calories through exercise this week.` });
    }

    // Nutrition analysis
    const avgCalories = nutritionLogs.length > 0
      ? nutritionLogs.reduce((s, n) => s + n.totals.calories, 0) / nutritionLogs.length : 0;
    const goalCalories = profile.dailyCalorieGoal || 2000;

    if (avgCalories > 0) {
      const diff = avgCalories - goalCalories;
      if (Math.abs(diff) < 100) {
        insights.push({ type: 'success', icon: '🥗', text: `Your calorie intake is right on target at ~${Math.round(avgCalories)} kcal/day.` });
      } else if (diff > 0) {
        insights.push({ type: 'warning', icon: '🍽️', text: `You're averaging ${Math.round(diff)} kcal above your daily goal. Consider portion control.` });
      } else {
        insights.push({ type: 'info', icon: '🥦', text: `You're eating ${Math.round(Math.abs(diff))} kcal below goal. Ensure you're getting enough nutrients.` });
      }
    }

    // Protein analysis
    const avgProtein = nutritionLogs.length > 0
      ? nutritionLogs.reduce((s, n) => s + n.totals.protein, 0) / nutritionLogs.length : 0;
    const idealProtein = (profile.weight || 70) * 1.6; // 1.6g per kg
    if (avgProtein > 0 && avgProtein < idealProtein * 0.8) {
      recommendations.push({ priority: 'high', text: `Increase protein intake to ~${Math.round(idealProtein)}g/day for muscle maintenance and recovery.` });
    }

    // BMI calculation
    let bmi = null;
    let bmiCategory = '';
    if (profile.weight && profile.height) {
      const heightM = profile.height / 100;
      bmi = (profile.weight / (heightM * heightM)).toFixed(1);
      if (bmi < 18.5) bmiCategory = 'Underweight';
      else if (bmi < 25) bmiCategory = 'Normal';
      else if (bmi < 30) bmiCategory = 'Overweight';
      else bmiCategory = 'Obese';
    }

    // General recommendations
    recommendations.push({ priority: 'medium', text: 'Stay hydrated — aim for 8 glasses of water daily, especially on workout days.' });
    recommendations.push({ priority: 'medium', text: 'Get 7-9 hours of sleep to maximize recovery and hormone balance.' });
    if (totalWorkouts >= 3) {
      recommendations.push({ priority: 'low', text: 'Consider adding a rest day between intense sessions to prevent overtraining.' });
    }
    if (profile.fitnessGoal === 'lose_weight') {
      recommendations.push({ priority: 'high', text: 'Combine cardio (3x/week) with strength training (2x/week) for optimal fat loss.' });
    }
    if (profile.fitnessGoal === 'gain_muscle') {
      recommendations.push({ priority: 'high', text: 'Progressive overload — gradually increase weights or reps each week to build muscle.' });
    }

    // Weekly report scores
    const calorieScore = avgCalories > 0 ? Math.min(100, Math.round((1 - Math.abs(avgCalories - goalCalories) / goalCalories) * 100)) : 50;
    const workoutScore = Math.min(100, Math.round((totalWorkouts / 5) * 100));
    const nutritionScore = nutritionLogs.length > 0 ? Math.min(100, Math.round((nutritionLogs.length / 7) * 100)) : 30;

    res.json({
      success: true,
      analysis: {
        insights,
        recommendations,
        weeklyReport: {
          calorieScore: Math.max(0, calorieScore),
          workoutScore,
          nutritionScore,
          overallScore: Math.round((calorieScore + workoutScore + nutritionScore) / 3)
        },
        bmi: bmi ? { value: parseFloat(bmi), category: bmiCategory } : null,
        stats: {
          totalWorkouts,
          totalCalsBurned: Math.round(totalCalsBurned),
          avgDuration: Math.round(avgDuration),
          avgCalories: Math.round(avgCalories),
          logsTracked: nutritionLogs.length
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Chat with Gemini AI Coach
router.post('/chat', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;
    const profile = user.profile || {};

    // Build context-rich system prompt
    const systemContext = `You are FitnessAI Coach, an expert, friendly, and motivating personal fitness coach embedded in a fitness tracking app. 
User profile: Name: ${user.name}, Age: ${profile.age || 'unknown'}, Weight: ${profile.weight || 'unknown'}kg, Height: ${profile.height || 'unknown'}cm, Goal: ${profile.fitnessGoal || 'general fitness'}, Activity level: ${profile.activityLevel || 'moderate'}.
Provide concise, actionable, evidence-based fitness and nutrition advice. Be encouraging and personal. Keep responses under 150 words. Use emojis sparingly.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB4EnfF5QepM7gPWZDoHUXwX8OcIlg0VN4';
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemContext}\n\nUser: ${message}` }] }],
          generationConfig: { maxOutputTokens: 250, temperature: 0.7 }
        })
      }
    );

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const response = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I'm having trouble connecting. Please check your Gemini API key.";
      res.json({ success: true, response, timestamp: new Date(), powered_by: 'gemini' });
    } else {
      // Fallback to smart rule-based
      const msg = message.toLowerCase();
      let response = msg.includes('hello') || msg.includes('hi') 
        ? `Hello ${user.name}! 💪 I'm your AI coach. Ask me about workouts, nutrition, or your fitness goals!`
        : "For best results: stay consistent, eat balanced meals rich in protein, get 7-9 hours of sleep, and hydrate well. What specific fitness topic can I help you with?";
      res.json({ success: true, response, timestamp: new Date(), powered_by: 'fallback' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
