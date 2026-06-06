const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Log activity data (steps, heart rate)
router.post('/log', protect, async (req, res) => {
  try {
    const { steps, heartRate, activeMinutes, distance, date } = req.body;
    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    let log = await ActivityLog.findOne({ user: req.user._id, date: logDate });
    if (log) {
      if (steps !== undefined) log.steps = steps;
      if (heartRate !== undefined) log.heartRate = heartRate;
      if (activeMinutes !== undefined) log.activeMinutes = activeMinutes;
      if (distance !== undefined) log.distance = distance;
      await log.save();
    } else {
      log = await ActivityLog.create({
        user: req.user._id,
        date: logDate,
        steps: steps || 0,
        heartRate: heartRate || null,
        activeMinutes: activeMinutes || 0,
        distance: distance || 0
      });
    }
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get activity logs for a date range
router.get('/', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const logs = await ActivityLog.find({
      user: req.user._id,
      date: { $gte: since }
    }).sort({ date: -1 });

    // Today's log
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLog = logs.find(l => new Date(l.date).getTime() === today.getTime());

    res.json({
      success: true,
      logs,
      today: todayLog || { steps: 0, heartRate: null, activeMinutes: 0, distance: 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get today's activity summary
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let log = await ActivityLog.findOne({ user: req.user._id, date: today });
    if (!log) {
      log = { steps: 0, heartRate: null, activeMinutes: 0, distance: 0 };
    }

    const user = req.user;
    const stepGoal = user.profile?.dailyStepGoal || 10000;
    const stepPercent = Math.min(100, Math.round((log.steps / stepGoal) * 100));

    // Heart rate zones
    let hrZone = 'Resting';
    const age = user.profile?.age || 30;
    const maxHR = 220 - age;
    if (log.heartRate) {
      const pct = (log.heartRate / maxHR) * 100;
      if (pct >= 90) hrZone = 'Maximum';
      else if (pct >= 80) hrZone = 'Hard';
      else if (pct >= 70) hrZone = 'Moderate';
      else if (pct >= 50) hrZone = 'Light';
      else hrZone = 'Resting';
    }

    res.json({
      success: true,
      activity: {
        steps: log.steps,
        stepGoal,
        stepPercent,
        heartRate: log.heartRate,
        hrZone,
        maxHR,
        activeMinutes: log.activeMinutes,
        distance: log.distance,
        caloriesEstimate: Math.round(log.steps * 0.04)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
