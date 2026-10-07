import type { WeightEntry } from '../types'
import { addDays, daysBetween, parseISO, todayISO } from './date'

export function weightHistory(entries: WeightEntry[], today: string, days: number | null) {
  const byDay = new Map<string, WeightEntry>()
  for (const entry of entries) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.date) && todayISO(parseISO(entry.date)) === entry.date && entry.date <= today && Number.isFinite(entry.weightKg) && entry.weightKg > 0) byDay.set(entry.date, entry)
  }
  const daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  const start = days === null ? (daily[0]?.date && daily[0].date < today ? daily[0].date : addDays(today, -6)) : addDays(today, -(days - 1))
  const points = daily.map(entry => {
    const window = daily.filter(e => daysBetween(e.date, entry.date) >= 0 && daysBetween(e.date, entry.date) <= 6)
    return { date: entry.date, kg: entry.weightKg, average: window.length >= 2 ? window.reduce((sum, e) => sum + e.weightKg, 0) / window.length : null, samples: window.length }
  }).filter(p => p.date >= start)
  return { points, start, end: today, totalDays: daily.length }
}
