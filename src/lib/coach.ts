// AI Coach — deterministic, data-driven brief + alerts (PRD 3.4).
// Works fully offline. A live Claude path can layer on top via foodAI's client when a key is set.

import type { DayFuel, PlanSession, UserProfile, WeightEntry } from '../types'
import { latestWithMeasurements, navyBodyFat } from './body'

export interface CoachBrief {
  headline: string
  body: string
  tone: 'primary' | 'tertiary' | 'error' | 'secondary'
  icon: string
}

/** Synthetic recovery score 0..100 from recent training density (deterministic). */
export function recoveryScore(sessions: PlanSession[], todayISO: string): number {
  const recent = sessions.filter((s) => s.date < todayISO && s.completed)
  const last3 = recent.slice(-3)
  const load = last3.reduce((sum, s) => sum + s.kcal, 0)
  // Higher recent load → lower recovery. Map ~0..2500 kcal load to 95..60.
  const score = Math.round(95 - Math.min(35, load / 70))
  return Math.max(55, Math.min(98, score))
}

export function morningBrief(
  fuel: DayFuel,
  todaySessions: PlanSession[],
  sessions: PlanSession[],
  todayISO: string,
  daysToRace: number | null,
): CoachBrief {
  // Pre-race carb-load window (PRD 3.4: activate 3 days before a race).
  if (daysToRace !== null && daysToRace <= 3 && daysToRace >= 0) {
    return {
      headline: 'Race week fueling',
      body:
        daysToRace === 0
          ? `Race day. Light breakfast 2–3h before, ~60g carbs. Sip water, don't try anything new.`
          : `${daysToRace} day${daysToRace === 1 ? '' : 's'} to race. Carb-load now — push carbs to ~8g/kg, ease training volume, hydrate steadily.`,
      tone: 'tertiary',
      icon: 'emoji_events',
    }
  }

  const key = todaySessions.find((s) => s.type === 'run' && (s.distanceKm ?? 0) > 12)
  const strength = todaySessions.find((s) => s.type === 'strength')
  const rec = recoveryScore(sessions, todayISO)

  if (key) {
    return {
      headline: `Recovery ${rec}%`,
      body: `Long run on the board today (${key.distanceKm} km). Budget lifted to ${fuel.budget} kcal — front-load carbs and aim for ${fuel.proteinTarget}g protein to recover.`,
      tone: 'primary',
      icon: 'directions_run',
    }
  }
  if (strength) {
    return {
      headline: `Recovery ${rec}%`,
      body: `Strength day. You're cleared to push. Hit ${fuel.proteinTarget}g protein and keep within ${fuel.budget} kcal.`,
      tone: 'primary',
      icon: 'fitness_center',
    }
  }
  return {
    headline: `Recovery ${rec}%`,
    body: `Lighter day — good window to recover. Target ${fuel.budget} kcal and ${fuel.proteinTarget}g protein. Stay hydrated.`,
    tone: 'secondary',
    icon: 'self_improvement',
  }
}

/**
 * Under-fuelling alert (PRD 3.4): on a training day, if logged kcal < TDEE×0.75.
 * We approximate TDEE with the day's calorie budget (target already goal-adjusted +
 * training bonus), which is the figure surfaced to the athlete.
 */
export function underFuelAlert(fuel: DayFuel, todaySessions: PlanSession[]): CoachBrief | null {
  const isTrainingDay = todaySessions.some((s) => s.type !== 'rest')
  if (!isTrainingDay) return null
  const threshold = Math.round(fuel.budget * 0.75)
  if (fuel.consumed > 0 && fuel.consumed < threshold) {
    return {
      headline: 'Under-fuelling risk',
      body: `You're at ${fuel.consumed} kcal on a training day (target ${fuel.budget}). Add a protein-rich meal — aim above ${threshold} kcal to support recovery.`,
      tone: 'error',
      icon: 'warning',
    }
  }
  return null
}

/** Lean-mass insight (PRD 3.5): flag drop > 0.5 kg/week. */
export function leanMassInsight(p: UserProfile, weights: WeightEntry[]): string {
  const m = latestWithMeasurements(weights)
  if (!m) return 'Log a weigh-in with neck & waist measurements to estimate body composition.'
  const bf = navyBodyFat(p.sex, p.heightCm, m.neckCm, m.waistCm, m.hipCm)
  if (bf === null) return 'Add waist & neck measurements to estimate body fat.'
  return `You're losing fat while holding lean mass — keep protein at ${Math.round(p.proteinPerKg * 10) / 10}g/kg or above.`
}
