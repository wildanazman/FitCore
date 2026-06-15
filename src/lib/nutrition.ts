// Nutrition math — Mifflin-St Jeor BMR, TDEE, goal-adjusted targets,
// training-load calorie bonuses, per-day fuel rollup.

import type { ActivityLevel, DayFuel, FoodEntry, Goal, MacroTargets, PlanSession, UserProfile } from '../types'

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
}

const GOAL_DELTA: Record<Goal, number> = {
  lose: -0.18, // ~18% deficit
  maintain: 0,
  gain: 0.1, // ~10% surplus
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

/** Resting daily calorie target after goal adjustment (before training bonus). */
export function baseCalorieTarget(p: UserProfile, weightKg: number): number {
  if (p.calorieTargetOverride && p.calorieTargetOverride > 0) return p.calorieTargetOverride
  const maint = tdee(p, weightKg)
  return Math.round(maint * (1 + GOAL_DELTA[p.goal]))
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
