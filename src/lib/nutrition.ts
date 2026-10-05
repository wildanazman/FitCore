// Nutrition math — Mifflin-St Jeor BMR, TDEE, goal-adjusted targets,
// training-load calorie bonuses, per-day fuel rollup.

import type { ActivityLevel, DayFuel, FoodEntry, MacroTargets, PlanSession, UserProfile, WeightLossPace } from '../types'

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
}

/** Basal metabolic rate (kcal/day), Mifflin-St Jeor. */
export function bmr(p: Pick<UserProfile, 'sex' | 'age' | 'heightCm'>, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * p.heightCm - 5 * p.age
  return Math.round(p.sex === 'male' ? base + 5 : base - 161)
}

/** Total daily energy expenditure (maintenance calories). */
export function tdee(p: UserProfile, weightKg: number): number {
  return Math.round(bmr(p, weightKg) * ACTIVITY_FACTOR[p.activity])
}

export type BmiCategory = 'Underweight' | 'Healthy' | 'Overweight' | 'Obesity'

export function bmiValue(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  return heightM > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : 0
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'Underweight'
  if (value < 25) return 'Healthy'
  if (value < 30) return 'Overweight'
  return 'Obesity'
}

export interface AutoCaloriePlan {
  maintenance: number
  target: number
  bmi: number
  category: BmiCategory
  pace: WeightLossPace
  aggressiveAllowed: boolean
  deficitKcal: number
  estimatedWeeklyKg: number
  minimumKcal: number
}

/**
 * Automatic calorie plan derived from Mifflin-St Jeor TDEE and adult BMI.
 * Faster cuts are only offered from BMI 25 and every deficit is capped at
 * 1,000 kcal/day plus a conservative sex-specific intake floor.
 */
export function autoCaloriePlan(p: UserProfile, weightKg: number): AutoCaloriePlan {
  const maintenance = tdee(p, weightKg)
  const bmi = bmiValue(p.heightCm, weightKg)
  const category = bmiCategory(bmi)
  const aggressiveAllowed = bmi >= 25
  const pace: WeightLossPace = p.weightLossPace === 'faster' && aggressiveAllowed ? 'faster' : 'steady'
  const minimumKcal = p.sex === 'female' ? 1200 : 1500

  let deficitKcal = 0
  if (p.goal === 'lose' && bmi >= 18.5) {
    const deficitPct = pace === 'faster'
      ? bmi >= 30 ? 0.25 : 0.2
      : bmi >= 30 ? 0.18 : bmi >= 25 ? 0.15 : 0.1
    deficitKcal = Math.min(1000, Math.round(maintenance * deficitPct))
  }

  let target = maintenance
  if (p.goal === 'lose') target = Math.min(maintenance, Math.max(minimumKcal, maintenance - deficitKcal))
  if (p.goal === 'gain') target = Math.round(maintenance * 1.1)
  deficitKcal = Math.max(0, maintenance - target)

  return {
    maintenance,
    target,
    bmi,
    category,
    pace,
    aggressiveAllowed,
    deficitKcal,
    estimatedWeeklyKg: Math.round((deficitKcal * 7 / 7700) * 10) / 10,
    minimumKcal,
  }
}

/** Resting daily calorie target after goal adjustment (before training bonus). */
export function baseCalorieTarget(p: UserProfile, weightKg: number): number {
  if (p.calorieTargetOverride && p.calorieTargetOverride > 0) return p.calorieTargetOverride
  return autoCaloriePlan(p, weightKg).target
}

/**
 * Extra calories granted for the day's training load.
 * PRD 3.4: +15% on long-run days (>12 km), +8% on strength days.
 * Multiple qualifying sessions stack but are capped at +25%.
 */
export function trainingBonus(base: number, daySessions: PlanSession[]): number {
  let pct = 0
  for (const s of daySessions) {
    if (s.type === 'run' && (s.distanceKm ?? 0) > 12) pct += 0.15
    else if (s.type === 'strength') pct += 0.08
    else if (s.type === 'sport') pct += 0.06
  }
  pct = Math.min(pct, 0.25)
  return Math.round(base * pct)
}

export function macroTargets(p: UserProfile, weightKg: number, budget: number): MacroTargets {
  const protein = Math.round(p.proteinPerKg * weightKg)

  // Low-carb protocols pin carbs and let fat fill the remaining energy.
  if (p.dietMode === 'keto' || p.dietMode === 'egg') {
    const carbs = p.netCarbCapG
    const fat = Math.max(0, Math.round((budget - protein * 4 - carbs * 4) / 9))
    return { kcal: budget, protein, carbs, fat }
  }

  const fatKcal = budget * 0.25
  const fat = Math.round(fatKcal / 9)
  const carbKcal = budget - protein * 4 - fat * 9
  const carbs = Math.max(0, Math.round(carbKcal / 4))
  return { kcal: budget, protein, carbs, fat }
}

export function sumDay(foods: FoodEntry[]) {
  return foods.reduce(
    (a, f) => ({
      kcal: a.kcal + f.kcal * f.servings,
      protein: a.protein + f.protein * f.servings,
      carbs: a.carbs + f.carbs * f.servings,
      fat: a.fat + f.fat * f.servings,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export function dayFuel(
  p: UserProfile,
  weightKg: number,
  date: string,
  foods: FoodEntry[],
  sessions: PlanSession[],
): DayFuel {
  const dayFoods = foods.filter((f) => f.date === date)
  const daySessions = sessions.filter((s) => s.date === date)
  const base = baseCalorieTarget(p, weightKg)
  const bonus = trainingBonus(base, daySessions)
  const budget = base + bonus
  const eaten = sumDay(dayFoods)
  const targets = macroTargets(p, weightKg, budget)
  return {
    date,
    baseTarget: base,
    trainingBonus: bonus,
    budget,
    consumed: Math.round(eaten.kcal),
    remaining: Math.round(budget - eaten.kcal),
    protein: Math.round(eaten.protein),
    carbs: Math.round(eaten.carbs),
    fat: Math.round(eaten.fat),
    proteinTarget: targets.protein,
    carbTarget: targets.carbs,
    fatTarget: targets.fat,
  }
}

export const KG_PER_LB = 0.45359237

export function toDisplayWeight(kg: number, units: UserProfile['units']): number {
  return units === 'metric' ? kg : kg / KG_PER_LB
}
export function fromDisplayWeight(val: number, units: UserProfile['units']): number {
  return units === 'metric' ? val : val * KG_PER_LB
}
export function weightUnit(units: UserProfile['units']): string {
  return units === 'metric' ? 'kg' : 'lbs'
}
