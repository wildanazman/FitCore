// Diet / eating-protocol engine. Layers OMAD, 16:8, keto, and egg-diet rules on
// top of the calorie tracker. Pure logic — UI reads these helpers.

import type { DietMode, FoodEntry } from '../types'

export interface DietDef {
  id: DietMode
  label: string
  short: string
  icon: string
  tagline: string
  /** What the dashboard card should emphasise. */
  kind: 'none' | 'window' | 'carb' | 'food'
}

export const DIETS: Record<DietMode, DietDef> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    short: 'Standard',
    icon: 'restaurant',
    tagline: 'Balanced macros, eat any time',
    kind: 'none',
  },
  omad: {
    id: 'omad',
    label: 'OMAD',
    short: 'OMAD',
    icon: 'bolt',
    tagline: 'One meal a day · 1-hour window',
    kind: 'window',
  },
  '16:8': {
    id: '16:8',
    label: '16:8 Fasting',
    short: '16:8',
    icon: 'schedule',
    tagline: 'Fast 16h · eat within 8h',
    kind: 'window',
  },
  keto: {
    id: 'keto',
    label: 'Keto',
    short: 'Keto',
    icon: 'egg_alt',
    tagline: 'High fat · net carbs capped',
    kind: 'carb',
  },
  egg: {
    id: 'egg',
    label: 'Egg Diet',
    short: 'Egg',
    icon: 'egg',
    tagline: 'Egg-based · low carb',
    kind: 'food',
  },
}

export const DIET_LIST: DietDef[] = Object.values(DIETS)

export function dietDef(mode: DietMode): DietDef {
  return DIETS[mode]
}

/** Eating-window length in hours per fasting protocol. */
function windowLengthH(mode: DietMode): number {
  if (mode === 'omad') return 1
  if (mode === '16:8') return 8
  return 24
}

export interface WindowState {
  startHour: number
  endHour: number
  /** Fraction of the day already fasted or eaten, for the ring. */
  pct: number
  eating: boolean
  /** e.g. "Eating window" / "Fasting" */
  phase: string
  /** e.g. "3h 12m left" / "opens in 5h 40m" */
  detail: string
  /** hours fasted so far in the current fast (0 while eating) */
  hoursFasted: number
}

function fmtDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h <= 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Compute the current fasting/eating window state for OMAD & 16:8.
 * `nowMinutes` is minutes since local midnight (injectable for testing).
 */
export function windowState(startHour: number, mode: DietMode, nowMinutes: number): WindowState {
  const len = windowLengthH(mode)
  const now = nowMinutes / 60
  const start = startHour
  const end = (startHour + len) % 24 || 24 // keep 24 rather than 0 for same-day windows

  // Windows here never wrap midnight (start 0-16, len 1-8 → end ≤ 24).
  const eating = now >= start && now < start + len
  if (eating) {
    const remaining = start + len - now
    return {
      startHour: start,
      endHour: end,
      pct: (now - start) / len,
      eating: true,
      phase: 'Eating window',
      detail: `${fmtDuration(remaining)} left`,
      hoursFasted: 0,
    }
  }
  // Fasting: time until the window opens (today if before start, else tomorrow).
  const untilOpen = now < start ? start - now : 24 - now + start
  const fastLen = 24 - len
  const fasted = fastLen - untilOpen
  return {
    startHour: start,
    endHour: end,
    pct: Math.max(0, Math.min(1, fasted / fastLen)),
    eating: false,
    phase: 'Fasting',
    detail: `opens in ${fmtDuration(untilOpen)}`,
    hoursFasted: Math.max(0, fasted),
  }
}

export function mealsOn(foods: FoodEntry[], date: string): number {
  return foods.filter((f) => f.date === date).length
}

export function eggsOn(foods: FoodEntry[], date: string): number {
  return foods
    .filter((f) => f.date === date && /egg/i.test(f.name))
    .reduce((n, f) => n + Math.max(1, Math.round(f.servings)), 0)
}

/** Net carbs consumed on a date (carbs are treated as net carbs in this build). */
export function netCarbsOn(foods: FoodEntry[], date: string): number {
  return Math.round(
    foods.filter((f) => f.date === date).reduce((n, f) => n + f.carbs * f.servings, 0),
  )
}

export type WarnTone = 'good' | 'warn' | 'error'

export interface DietWarning {
  tone: WarnTone
  icon: string
  text: string
}

/** Rule checks surfaced on Food/Home for the active protocol. */
export function dietWarnings(
  mode: DietMode,
  opts: { foods: FoodEntry[]; date: string; netCarbCapG: number; window?: WindowState },
): DietWarning[] {
  const out: DietWarning[] = []
  const { foods, date, netCarbCapG, window } = opts

  if (mode === 'keto') {
    const carbs = netCarbsOn(foods, date)
    if (carbs > netCarbCapG) {
      out.push({ tone: 'error', icon: 'warning', text: `Net carbs ${carbs}g over your ${netCarbCapG}g cap — may break ketosis.` })
    } else {
      out.push({ tone: 'good', icon: 'check_circle', text: `${netCarbCapG - carbs}g net carbs left before your cap.` })
    }
  }

  if (mode === 'omad') {
    const meals = mealsOn(foods, date)
    if (meals > 1) out.push({ tone: 'warn', icon: 'restaurant', text: `${meals} meals logged — OMAD targets a single meal.` })
    if (window && !window.eating && meals === 0) out.push({ tone: 'good', icon: 'schedule', text: `Fasting — window ${window.detail}.` })
  }

  if (mode === '16:8' && window) {
    if (!window.eating && mealsOn(foods, date) > 0) {
      out.push({ tone: 'warn', icon: 'schedule', text: `Logged outside your 8-hour window (${window.detail}).` })
    }
  }

  if (mode === 'egg') {
    const eggs = eggsOn(foods, date)
    out.push({ tone: eggs > 0 ? 'good' : 'warn', icon: 'egg', text: eggs > 0 ? `${eggs} egg${eggs === 1 ? '' : 's'} logged today.` : 'No eggs logged yet today.' })
  }

  return out
}

/** Minutes since local midnight — kept here so callers stay pure-ish. */
export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}
