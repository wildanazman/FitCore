import type { UserProfile } from '../types'
import { tdee } from './nutrition'

/** Adult standard BMI screening range, not an individual ideal weight. */
export function healthyWeightRange(heightCm: number) {
  const area = (heightCm / 100) ** 2
  return { min: Math.ceil(18.5 * area * 10) / 10, max: Math.floor(24.9 * area * 10) / 10 }
}
export function projectionEligible(p: UserProfile, kg: number) {
  return p.age >= 20 && p.age <= 120 && Number.isFinite(kg) && kg > 0 && Number.isFinite(p.heightCm) && p.heightCm >= 80 && p.heightCm <= 250 && Number.isFinite(tdee(p, kg))
}

/** Simplified energy scenario, NOT the validated NIDDK dynamic model.
 * Maintenance is recalculated each day as weight changes. No adaptive
 * thermogenesis, water shifts or extra logged exercise are modelled.
 */
export function projectWeight(p: UserProfile, startKg: number, intake: number, targetKg: number, horizon = 730) {
  if (!projectionEligible(p, startKg) || !Number.isFinite(intake) || intake < 500 || intake > 10000 || !Number.isFinite(targetKg) || targetKg <= 0 || !Number.isFinite(horizon)) return null
  let kg = startKg
  let reachedDay: number | null = startKg <= targetKg ? 0 : null
  let plateau = false
  const samples: { day: number; kg: number }[] = [{ day: 0, kg }]
  for (let day = 1; day <= Math.min(730, Math.max(1, Math.round(horizon))); day++) {
    const balance = tdee(p, kg) - intake
    if (balance <= 0 && kg > targetKg) plateau = true
    kg = Math.max(1, kg - balance / 7700)
    if (reachedDay === null && kg <= targetKg) reachedDay = day
    if (day % 30 === 0 || day === horizon) samples.push({ day, kg })
  }
  return { reachedDay, plateau, samples, endKg: kg, initialWeeklyKg: (tdee(p, startKg) - intake) * 7 / 7700 }
}

/** Numerical inverse of the same explicitly simplified scenario. */
export function intakeForDeadline(p: UserProfile, startKg: number, targetKg: number, days: number) {
  if (!projectionEligible(p, startKg) || !Number.isFinite(targetKg) || targetKg <= 0 || targetKg >= startKg || !Number.isFinite(days) || days < 30 || days > 730) return null
  let low = 500, high = tdee(p, startKg)
  const quickest = projectWeight(p, startKg, low, targetKg, days)
  if (!quickest || quickest.endKg > targetKg) return null
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2
    const estimate = projectWeight(p, startKg, mid, targetKg, days)!
    if (estimate.endKg > targetKg) high = mid
    else low = mid
  }
  return Math.round((low + high) / 2)
}

export function clinicalScenario(p: UserProfile, weightKg: number, intake: number) {
  const floor = p.sex === 'female' ? 1200 : 1500
  const deficit = tdee(p, weightKg) - intake
  return intake <= 1200 || intake < floor || deficit > 1000 || deficit * 7 / 7700 > weightKg * .01
}
