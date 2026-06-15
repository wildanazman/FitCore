// Body composition — Navy method body-fat %, lean/fat mass, 7-day rolling weight trend.

import type { Sex, WeightEntry } from '../types'

/**
 * US Navy body-fat estimate. Measurements in cm.
 * Returns null when required measurements are missing.
 */
export function navyBodyFat(
  sex: Sex,
  heightCm: number,
  neckCm?: number,
  waistCm?: number,
  hipCm?: number,
): number | null {
  if (!neckCm || !waistCm) return null
  const log10 = (x: number) => Math.log10(x)
  if (sex === 'male') {
    if (waistCm - neckCm <= 0) return null
    const bf = 495 / (1.0324 - 0.19077 * log10(waistCm - neckCm) + 0.15456 * log10(heightCm)) - 450
    return clampBf(bf)
  }
  if (!hipCm) return null
  if (waistCm + hipCm - neckCm <= 0) return null
  const bf = 495 / (1.29579 - 0.35004 * log10(waistCm + hipCm - neckCm) + 0.221 * log10(heightCm)) - 450
  return clampBf(bf)
}

function clampBf(bf: number): number {
  return Math.max(3, Math.min(60, Math.round(bf * 10) / 10))
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10
}
export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return Math.round(weightKg * (bodyFatPct / 100) * 10) / 10
}

/** Sorted ascending by date. */
export function sortByDate(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 7-day rolling average of weight (PRD 3.5 — smooths daily noise).
 * Returns one smoothed point per entry date, averaging that day and the prior 6 days' raw entries.
 */
export function rollingTrend(entries: WeightEntry[]): { date: string; kg: number }[] {
  const sorted = sortByDate(entries)
  return sorted.map((e, i) => {
    const windowStart = Math.max(0, i - 6)
    const slice = sorted.slice(windowStart, i + 1)
    const avg = slice.reduce((s, x) => s + x.weightKg, 0) / slice.length
    return { date: e.date, kg: Math.round(avg * 10) / 10 }
  })
}

export function latestMeasured(entries: WeightEntry[]): WeightEntry | null {
  const sorted = sortByDate(entries)
  return sorted.length ? sorted[sorted.length - 1] : null
}

/** Latest entry that carries Navy measurements. */
export function latestWithMeasurements(entries: WeightEntry[]): WeightEntry | null {
  const sorted = sortByDate(entries)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].neckCm && sorted[i].waistCm) return sorted[i]
  }
  return null
}
