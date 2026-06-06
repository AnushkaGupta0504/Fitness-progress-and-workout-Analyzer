const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  steps: { type: Number, default: 0 },
  heartRate: { type: Number, default: null }, // BPM
  heartRateHistory: [{ time: String, bpm: Number }], // for intraday graph
  activeMinutes: { type: Number, default: 0 },
  distance: { type: Number, default: 0 }, // km
  floors: { type: Number, default: 0 },
  sedentaryMinutes: { type: Number, default: 0 },
  source: { type: String, enum: ['manual', 'wearable', 'simulated'], default: 'manual' }
}, { timestamps: true });

activityLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
