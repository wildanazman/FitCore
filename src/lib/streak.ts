import type { AppState } from '../types'
import { addDays, daysBetween, parseISO, startOfWeek, todayISO } from './date'

export const STREAK_MILESTONES = [
  { days: 3, name: 'Finding your rhythm' },
  { days: 7, name: 'A week of showing up' },
  { days: 14, name: 'Making it yours' },
  { days: 30, name: 'Built to last' },
  { days: 60, name: 'Still showing up' },
  { days: 100, name: 'Your hundred club' },
] as const

function validDate(date: string, today: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '1900-01-01' && date <= today && todayISO(parseISO(date)) === date
}

/** Derived from saved logs: editing/removing a log never leaves a phantom streak. */
export function showUpStreak(state: Pick<AppState, 'foods' | 'sessions' | 'weights'>, today = todayISO()) {
  const checked = new Set([
    ...state.foods.map(entry => entry.date),
    ...state.sessions.filter(entry => entry.completed && entry.type !== 'rest').map(entry => entry.date),
    ...state.weights.filter(entry => entry.source !== 'onboarding' && Number.isFinite(entry.weightKg) && entry.weightKg > 0).map(entry => entry.date),
  ].filter(date => validDate(date, today)))
  const dates = [...checked].sort()
  const rescued = new Set<string>()
  const usedWeeks = new Set<string>()
  let chain = 0
  let best = 0
  let previous: string | undefined
  for (const date of dates) {
    const gap = previous ? daysBetween(previous, date) : 0
    const missing = previous ? addDays(previous, 1) : date
    if (gap === 1) chain += 1
    else if (gap === 2 && !usedWeeks.has(startOfWeek(missing))) {
      rescued.add(missing)
      usedWeeks.add(startOfWeek(missing))
      chain += 1
    } else chain = 1
    best = Math.max(best, chain)
    previous = date
  }
  const gap = previous ? daysBetween(previous, today) : Infinity
  const pendingRescue = gap === 2 && !usedWeeks.has(startOfWeek(addDays(previous!, 1)))
  const current = gap <= 1 || pendingRescue ? chain : 0
  const todayDone = checked.has(today)
  const next = STREAK_MILESTONES.find(item => item.days > current)
  return {
    checked, rescued, current, best, todayDone, pendingRescue,
    rescueAvailable: !usedWeeks.has(startOfWeek(today)),
    total: checked.size,
    weekCount: [...checked].filter(date => date >= startOfWeek(today)).length,
    next: next ?? { days: (Math.floor(current / 100) + 1) * 100, name: 'Keep making it yours' },
    earned: STREAK_MILESTONES.filter(item => item.days <= best),
  }
}
