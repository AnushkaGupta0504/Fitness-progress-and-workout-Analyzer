const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  profile: {
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    height: { type: Number }, // cm
    weight: { type: Number }, // kg
    goalWeight: { type: Number },
    activityLevel: { type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'], default: 'moderate' },
    fitnessGoal: { type: String, enum: ['lose_weight', 'gain_muscle', 'maintain', 'improve_endurance'], default: 'maintain' },
    dailyCalorieGoal: { type: Number, default: 2000 },
    dailyStepGoal: { type: Number, default: 10000 },
    dailyWaterGoal: { type: Number, default: 8 } // glasses
  },
  gender: {
  type: String,
  enum: ["male", "female", "other"]
},
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
