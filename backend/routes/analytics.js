const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const { protect } = require('../middleware/auth');

// Dashboard summary
router.get('/dashboard', protect, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [todayNutrition, weeklyWorkouts, monthlyWorkouts] = await Promise.all([
      Nutrition.findOne({ user: req.user._id, date: { $gte: startOfDay, $lte: endOfDay } }),
      Workout.find({ user: req.user._id, date: { $gte: sevenDaysAgo } }),
      Workout.find({ user: req.user._id, date: { $gte: thirtyDaysAgo } })
    ]);

    // Build daily calories for chart (last 7 days)
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      dailyData.push({ date: dayStart.toISOString().split('T')[0] });
    }

    const weeklyNutrition = await Nutrition.find({
      user: req.user._id, date: { $gte: sevenDaysAgo }
    });

    const enrichedDaily = dailyData.map(day => {
      const nut = weeklyNutrition.find(n => n.date.toISOString().split('T')[0] === day.date);
      const wrk = weeklyWorkouts.filter(w => w.date.toISOString().split('T')[0] === day.date);
      return {
        date: day.date,
        calories: nut ? nut.totals.calories : 0,
        caloriesBurned: wrk.reduce((s, w) => s + w.totalCaloriesBurned, 0),
        workouts: wrk.length
      };
    });

    res.json({
      success: true,
      dashboard: {
        todayCalories: todayNutrition ? todayNutrition.totals.calories : 0,
        todayProtein: todayNutrition ? todayNutrition.totals.protein : 0,
        todayCarbs: todayNutrition ? todayNutrition.totals.carbs : 0,
        todayFat: todayNutrition ? todayNutrition.totals.fat : 0,
        todayWater: todayNutrition ? todayNutrition.totals.water : 0,
        weeklyWorkouts: weeklyWorkouts.length,
        weeklyCaloriesBurned: weeklyWorkouts.reduce((s, w) => s + w.totalCaloriesBurned, 0),
        weeklyDuration: weeklyWorkouts.reduce((s, w) => s + w.totalDuration, 0),
        monthlyWorkouts: monthlyWorkouts.length,
        dailyData: enrichedDaily
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Progress over time
router.get('/progress', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(); since.setDate(since.getDate() - parseInt(days));
    const workouts = await Workout.find({ user: req.user._id, date: { $gte: since } }).sort({ date: 1 });
    const nutrition = await Nutrition.find({ user: req.user._id, date: { $gte: since } }).sort({ date: 1 });
    res.json({ success: true, workouts, nutrition });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
