// Personalized diet guidance. Turns profile stats (weight, height, age, sex,
// activity, goal) into a recommended protocol + detailed, actionable diet detail.

import type { DietMode, UserProfile } from '../types'
import { baseCalorieTarget, macroTargets, tdee } from './nutrition'

export interface BmiInfo {
  value: number
  category: 'Underweight' | 'Healthy' | 'Overweight' | 'Obese'
  tone: 'warn' | 'good' | 'tertiary' | 'error'
}

export function bmi(heightCm: number, weightKg: number): BmiInfo {
  const m = heightCm / 100
  const v = m > 0 ? Math.round((weightKg / (m * m)) * 10) / 10 : 0
  let category: BmiInfo['category'] = 'Healthy'
  let tone: BmiInfo['tone'] = 'good'
  if (v < 18.5) {
    category = 'Underweight'
    tone = 'warn'
  } else if (v < 25) {
    category = 'Healthy'
    tone = 'good'
  } else if (v < 30) {
    category = 'Overweight'
    tone = 'tertiary'
  } else {
    category = 'Obese'
    tone = 'error'
  }
  return { value: v, category, tone }
}

/** Healthy weight range (BMI 18.5–24.9) for the height, in kg. */
export function idealWeightRange(heightCm: number): { minKg: number; maxKg: number } {
  const m = heightCm / 100
  return { minKg: Math.round(18.5 * m * m * 10) / 10, maxKg: Math.round(24.9 * m * m * 10) / 10 }
}

/** Daily water target (ml): ~35 ml/kg, nudged up for high activity. */
export function waterTargetMl(weightKg: number, activity: UserProfile['activity']): number {
  const base = weightKg * 35
  const bonus = activity === 'high' || activity === 'athlete' ? 500 : 0
  return Math.round((base + bonus) / 50) * 50
}

export interface Recommendation {
  mode: DietMode
  reason: string
}

/**
 * Suggest a protocol from the athlete's stats + goal. Deterministic rules — a
 * live Claude coach could refine this, but the logic here is transparent.
 */
export function recommendDiet(profile: UserProfile, weightKg: number): Recommendation {
  const b = bmi(profile.heightCm, weightKg).value
  const heavyTraining = profile.activity === 'high' || profile.activity === 'athlete'
  const endurance = profile.sports.includes('running')

  if (profile.goal === 'gain' || b < 18.5) {
    return {
      mode: 'standard',
      reason: 'You are building or below a healthy BMI — a balanced surplus with steady meals beats any restrictive protocol. Keep protein high and carbs plentiful for training.',
    }
  }
  if (heavyTraining && endurance) {
    return {
      mode: '16:8',
      reason: 'High endurance training load — 16:8 gives a daily fasting benefit while still leaving an 8-hour window to fuel runs with carbs. Avoid deep keto, which blunts top-end pace.',
    }
  }
  if (b >= 30) {
    return {
      mode: 'omad',
      reason: 'Higher BMI with a large deficit to run — OMAD makes a big daily deficit simple to hold. Ease in through 16:8 for a week first, and hit your full calorie + protein target in the one meal.',
    }
  }
  if (b >= 25) {
    return {
      mode: 'keto',
      reason: 'Overweight range and low carb needs from training — keto strongly blunts appetite and speeds early fat loss. Mind electrolytes through the first-week adjustment.',
    }
  }
  return {
    mode: '16:8',
    reason: 'A healthy BMI with a moderate cut goal — 16:8 is the most sustainable, flexible option and pairs well with your training.',
  }
}

export interface SampleMeal {
  name: string
  items: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface DietGuide {
  headline: string
  howItWorks: string[]
  eat: string[]
  avoid: string[]
  tips: string[]
  cautions: string[]
  /** Template day at ~2000 kcal; scaled to the user's target at render. */
  sampleDay: SampleMeal[]
}

export const DIET_GUIDE: Record<DietMode, DietGuide> = {
  standard: {
    headline: 'Balanced calorie control — flexible timing, whole foods.',
    howItWorks: [
      'Eat across the day, hitting your calorie budget and protein target.',
      'Split roughly 30% protein / 40% carbs / 30% fat.',
      'Time carbs around training for performance and recovery.',
    ],
    eat: ['Lean protein (chicken, fish, eggs, tofu)', 'Vegetables and fruit', 'Whole grains, oats, rice, potatoes', 'Nuts, olive oil, avocado'],
    avoid: ['Sugary drinks and liquid calories', 'Ultra-processed snacks', 'Frequent refined-sugar treats'],
    tips: ['Anchor every meal with 30–40g protein', 'Walk 8–10k steps daily', 'Weigh in weekly, not daily'],
    cautions: ['No major restrictions — the sustainable default.'],
    sampleDay: [
      { name: 'Breakfast', items: 'Oats, whey, berries, peanut butter', kcal: 520, protein: 38, carbs: 55, fat: 16 },
      { name: 'Lunch', items: 'Chicken, rice, mixed veg, olive oil', kcal: 640, protein: 48, carbs: 62, fat: 18 },
      { name: 'Dinner', items: 'Salmon, potatoes, salad', kcal: 620, protein: 42, carbs: 48, fat: 24 },
      { name: 'Snack', items: 'Greek yogurt + almonds', kcal: 220, protein: 20, carbs: 14, fat: 10 },
    ],
  },
  omad: {
    headline: 'One meal a day — 23-hour fast, one large nutrient-dense meal.',
    howItWorks: [
      'Pick a 1-hour eating window and eat your full calorie + protein target in it.',
      'During the fast: water, black coffee, plain tea, electrolytes only.',
      'Make the meal big and balanced — under-eating is the main OMAD failure.',
    ],
    eat: ['High-protein centre (meat, fish, eggs)', 'Plenty of vegetables for fibre and volume', 'Healthy fats to hit calories', 'Slow carbs (rice, potato, oats)'],
    avoid: ['Anything caloric during the fast', 'A small "light" meal that misses your target', 'Sugary drinks that break the fast'],
    tips: ['Front-load protein, eat slowly over the hour', 'Salt + potassium + magnesium during the fast', 'On hard training days, train near the window'],
    cautions: ['Not for pregnancy, type-1 diabetes, or a history of disordered eating.', 'Ease in via 16:8 first.', 'Discuss with a doctor if you take blood-sugar or blood-pressure medication.'],
    sampleDay: [
      { name: 'The Meal', items: 'Steak, sweet potato, greens, olive oil, eggs, yogurt + fruit', kcal: 2000, protein: 150, carbs: 150, fat: 78 },
    ],
  },
  '16:8': {
    headline: 'Fast 16 hours, eat within an 8-hour window.',
    howItWorks: [
      'Choose an 8-hour window (e.g. 12:00–20:00) and eat all meals inside it.',
      'Fast the other 16 hours on water, black coffee, and tea.',
      'Two to three meals in-window; hit protein and calorie targets normally.',
    ],
    eat: ['Balanced meals as in Standard', 'Protein at every in-window meal', 'Fibre-rich veg and fruit', 'Whole-food carbs around training'],
    avoid: ['Calorie drinks during the fast', 'Cramming junk just because it "fits"', 'Skipping protein at the first meal'],
    tips: ['Align the window with training and social meals', 'Break the fast with protein + fibre, not sugar', 'Black coffee helps ride out the morning fast'],
    cautions: ['Mild early hunger that fades in a week.', 'Pull the window earlier if evening eating hurts sleep.'],
    sampleDay: [
      { name: '12:00 — Meal 1', items: 'Chicken, rice, veg, avocado', kcal: 720, protein: 52, carbs: 70, fat: 22 },
      { name: '16:00 — Snack', items: 'Greek yogurt, berries, nuts', kcal: 320, protein: 24, carbs: 24, fat: 14 },
      { name: '19:30 — Meal 2', items: 'Salmon, potatoes, salad', kcal: 660, protein: 46, carbs: 52, fat: 26 },
    ],
  },
  keto: {
    headline: 'Very low carb, high fat — shift fuel to ketones.',
    howItWorks: [
      'Keep net carbs under your cap (default 20g); fat becomes the main fuel.',
      'Moderate protein, high fat, near-zero sugar and starch.',
      'Expect a 3–7 day "keto flu" adaptation — push electrolytes.',
    ],
    eat: ['Meat, poultry, fish, eggs', 'Avocado, olive oil, butter', 'Cheese and full-fat dairy', 'Leafy greens, broccoli, cauliflower', 'Nuts and seeds'],
    avoid: ['Bread, rice, pasta, oats', 'Sugar, soda, most fruit', 'Potatoes and starchy veg', 'Beans and legumes (carb-heavy)'],
    tips: ['Sodium, potassium, magnesium daily to beat keto flu', 'Track net carbs strictly — they add up fast', 'Ramp fat up as carbs come down to hold energy'],
    cautions: ['Endurance top-end pace can dip for weeks.', 'Talk to a doctor if on diabetes or blood-pressure meds.', 'Not ideal right before a race that needs carb-loading.'],
    sampleDay: [
      { name: 'Breakfast', items: '3 eggs, avocado, cheese, spinach', kcal: 520, protein: 28, carbs: 5, fat: 42 },
      { name: 'Lunch', items: 'Chicken thighs, olive-oil salad, nuts', kcal: 680, protein: 46, carbs: 6, fat: 50 },
      { name: 'Dinner', items: 'Steak, butter broccoli, cauliflower mash', kcal: 720, protein: 48, carbs: 7, fat: 52 },
    ],
  },
  egg: {
    headline: 'Egg-centred, very low carb — a short-term reset.',
    howItWorks: [
      'Eggs are the primary protein; add lean meat and low-carb veg.',
      'Keep carbs low, protein high, moderate fat.',
      'Run it short-term (days to ~2 weeks), then return to a balanced plan.',
    ],
    eat: ['Eggs (boiled, scrambled, omelette)', 'Lean meat and fish', 'Low-carb veg (spinach, peppers, courgette)', 'A little healthy fat (avocado, olive oil)'],
    avoid: ['Bread, rice, pasta, sugar', 'High-carb sides and fruit', 'Processed snacks'],
    tips: ['Vary egg prep to avoid boredom', 'Add veg for fibre and micronutrients', 'Hydrate well and add salt'],
    cautions: ['Nutritionally narrow — short-term only.', 'Watch cholesterol if your doctor has flagged it.', 'Not a long-term or performance diet.'],
    sampleDay: [
      { name: 'Breakfast', items: '3-egg omelette, spinach, cheese', kcal: 340, protein: 26, carbs: 4, fat: 24 },
      { name: 'Lunch', items: 'Grilled chicken, 2 boiled eggs, salad', kcal: 480, protein: 52, carbs: 6, fat: 26 },
      { name: 'Dinner', items: 'Fish, courgette, 2 eggs, olive oil', kcal: 520, protein: 48, carbs: 8, fat: 30 },
    ],
  },
}

export interface PersonalPlan {
  bmi: BmiInfo
  ideal: { minKg: number; maxKg: number }
  tdee: number
  target: number
  macros: { protein: number; carbs: number; fat: number }
  waterMl: number
  recommendation: Recommendation
  guide: DietGuide
  /** sampleDay scaled to the user's calorie target. */
  scaledDay: SampleMeal[]
  scaledTotal: { kcal: number; protein: number; carbs: number; fat: number }
}

export function personalPlan(profile: UserProfile, weightKg: number): PersonalPlan {
  const target = baseCalorieTarget(profile, weightKg)
  const m = macroTargets(profile, weightKg, target)
  const guide = DIET_GUIDE[profile.dietMode]
  const templateKcal = guide.sampleDay.reduce((s, meal) => s + meal.kcal, 0)
  const scale = templateKcal > 0 ? target / templateKcal : 1
  // Low-carb protocols pin carbs — scaling energy must not inflate them past the cap.
  const lowCarb = profile.dietMode === 'keto' || profile.dietMode === 'egg'
  const scaledDay = guide.sampleDay.map((meal) => ({
    ...meal,
    kcal: Math.round(meal.kcal * scale),
    protein: Math.round(meal.protein * scale),
    carbs: lowCarb ? meal.carbs : Math.round(meal.carbs * scale),
    fat: Math.round(meal.fat * scale),
  }))
  const scaledTotal = scaledDay.reduce(
    (a, meal) => ({
      kcal: a.kcal + meal.kcal,
      protein: a.protein + meal.protein,
      carbs: a.carbs + meal.carbs,
      fat: a.fat + meal.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  return {
    bmi: bmi(profile.heightCm, weightKg),
    ideal: idealWeightRange(profile.heightCm),
    tdee: tdee(profile, weightKg),
    target,
    macros: { protein: m.protein, carbs: m.carbs, fat: m.fat },
    waterMl: waterTargetMl(weightKg, profile.activity),
    recommendation: recommendDiet(profile, weightKg),
    guide,
    scaledDay,
    scaledTotal,
  }
}
