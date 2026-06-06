const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const { protect } = require('../middleware/auth');

// Get all workouts (with optional date filter)
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, type, limit = 20, page = 1 } = req.query;
    const query = { user: req.user._id };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (type) query.type = type;
    const workouts = await Workout.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await Workout.countDocuments(query);
    res.json({ success: true, workouts, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create workout
router.post('/', protect, async (req, res) => {
  try {
    const workout = await Workout.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, workout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update workout
router.put('/:id', protect, async (req, res) => {
  try {
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });
    res.json({ success: true, workout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete workout
router.delete('/:id', protect, async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ success: false, message: 'Workout not found' });
    res.json({ success: true, message: 'Workout deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Weekly summary
router.get('/summary/weekly', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const workouts = await Workout.find({ user: req.user._id, date: { $gte: sevenDaysAgo } });
    const summary = {
      totalWorkouts: workouts.length,
      totalCaloriesBurned: workouts.reduce((sum, w) => sum + w.totalCaloriesBurned, 0),
      totalDuration: workouts.reduce((sum, w) => sum + w.totalDuration, 0),
      byType: {}
    };
    workouts.forEach(w => {
      summary.byType[w.type] = (summary.byType[w.type] || 0) + 1;
    });
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
