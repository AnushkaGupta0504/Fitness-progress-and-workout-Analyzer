const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['cardio', 'strength', 'flexibility', 'sports', 'other'], default: 'other' },
  sets: { type: Number },
  reps: { type: Number },
  weight: { type: Number }, // kg
  duration: { type: Number }, // minutes
  distance: { type: Number }, // km
  caloriesBurned: { type: Number, default: 0 },
  notes: { type: String }
});

const workoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['cardio', 'strength', 'yoga', 'hiit', 'sports', 'mixed'], default: 'mixed' },
  exercises: [exerciseSchema],
  totalDuration: { type: Number, default: 0 }, // minutes
  totalCaloriesBurned: { type: Number, default: 0 },
  heartRateAvg: { type: Number },
  heartRateMax: { type: Number },
  mood: { type: String, enum: ['great', 'good', 'okay', 'tired', 'bad'] },
  notes: { type: String },
  completed: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Workout', workoutSchema);
