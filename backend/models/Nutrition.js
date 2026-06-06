const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String },
  servingSize: { type: Number, default: 100 }, // grams
  servingUnit: { type: String, default: 'g' },
  quantity: { type: Number, default: 1 },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 }, // grams
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  sodium: { type: Number, default: 0 } // mg
});

const nutritionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  meals: {
    breakfast: [foodItemSchema],
    lunch: [foodItemSchema],
    dinner: [foodItemSchema],
    snacks: [foodItemSchema]
  },
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    water: { type: Number, default: 0 } // glasses
  },
  notes: { type: String }
}, { timestamps: true });

// Auto-calculate totals before save
nutritionSchema.pre('save', function(next) {
  const allFoods = [
    ...this.meals.breakfast,
    ...this.meals.lunch,
    ...this.meals.dinner,
    ...this.meals.snacks
  ];
  this.totals.calories = allFoods.reduce((sum, f) => sum + (f.calories * f.quantity), 0);
  this.totals.protein = allFoods.reduce((sum, f) => sum + (f.protein * f.quantity), 0);
  this.totals.carbs = allFoods.reduce((sum, f) => sum + (f.carbs * f.quantity), 0);
  this.totals.fat = allFoods.reduce((sum, f) => sum + (f.fat * f.quantity), 0);
  this.totals.fiber = allFoods.reduce((sum, f) => sum + (f.fiber * f.quantity), 0);
  next();
});

module.exports = mongoose.model('Nutrition', nutritionSchema);
