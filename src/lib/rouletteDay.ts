import { isLogDate } from './date'

export const ROULETTE_DAY_KEY = 'fitcore.roulette-skips.v1'
export type RouletteDays = Record<string, string[]>
export function loadRouletteDays(): RouletteDays {
  try {
    const value = JSON.parse(localStorage.getItem(ROULETTE_DAY_KEY) || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([date, ids]) => isLogDate(date) && Array.isArray(ids) && ids.every(id => typeof id === 'string')).slice(-60)) as RouletteDays
  } catch { return {} }
}
export function saveRouletteDays(days: RouletteDays) {
  try { localStorage.setItem(ROULETTE_DAY_KEY, JSON.stringify(days)) } catch { /* Session-only when storage is unavailable. */ }
}
export function setDaySkipped(days: RouletteDays, date: string, id: string, skipped: boolean): RouletteDays {
  const ids = days[date] || []
  const next = { ...days, [date]: skipped ? [...new Set([...ids, id])] : ids.filter(value => value !== id) }
  if (!next[date].length) delete next[date]
  return Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)).slice(-60))
}
