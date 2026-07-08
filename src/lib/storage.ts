// localStorage persistence + default profile + first-run demo seed.

import type { AppState, FoodEntry, UserProfile, WeightEntry } from '../types'
import { addDays, todayISO, uid } from './date'
import { generatePlan } from './plan'

const KEY = 'fitcore.state.v1'
export const STATE_VERSION = 1

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  sex: 'male',
  age: 32,
  heightCm: 178,
  startWeightKg: 78.4,
  goal: 'lose',
  sports: ['running', 'strength', 'badminton'],
  raceDate: null,
  targetFinishMin: 105,
  activity: 'high',
  calorieTargetOverride: null,
  proteinPerKg: 1.8,
  dietMode: 'standard',
  netCarbCapG: 20,
  eatingWindowStartHour: 12,
  units: 'metric',
  wearables: { appleHealth: false, garmin: false, strava: false },
  notif: { morningBrief: true, underFuelAlert: true, preRace: true },
  anthropicApiKey: '',
  onboarded: false,
}

export function emptyState(): AppState {
  return { profile: { ...DEFAULT_PROFILE }, foods: [], weights: [], photos: [], sessions: [], v: STATE_VERSION }
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    if (parsed.v !== STATE_VERSION) return null
    parsed.profile = { ...DEFAULT_PROFILE, ...parsed.profile }
    return parsed
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Quota or private-mode failure — non-fatal; app keeps working in-memory.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/**
 * Build a populated state for a freshly-onboarded profile so dashboards are alive:
 * 8 weeks of weigh-ins trending down, the generated plan with past sessions completed,
 * and a couple of meals logged today.
 */
export function seedForProfile(profile: UserProfile): AppState {
  const today = todayISO()
  const weights: WeightEntry[] = []
  const start = profile.startWeightKg + 4.2
  for (let i = 56; i >= 0; i -= 1) {
    if (i % 2 === 1 && i !== 0) continue // ~every other day
    const t = (56 - i) / 56
    const noise = ((i * 9301 + 49297) % 233280) / 233280 // deterministic 0..1
    const kg = Math.round((start - 4.2 * t + (noise - 0.5) * 0.6) * 10) / 10
    const date = addDays(today, -i)
    const entry: WeightEntry = { id: uid(), date, weightKg: kg }
    if (i === 0) {
      entry.neckCm = 38
      entry.waistCm = 82
      entry.hipCm = 98
    }
    weights.push(entry)
  }

  const sessions = generatePlan(profile, profile.startWeightKg)
  for (const s of sessions) {
    if (s.date < today) s.completed = true
  }

  const mk = (h: number, m: number) => {
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const foods: FoodEntry[] = [
    {
      id: uid(), name: 'Protein Oats & Eggs', emoji: '🥣', date: today, loggedAt: mk(8, 30),
      slot: 'breakfast', kcal: 540, protein: 38, carbs: 52, fat: 18, servings: 1, confidence: 1,
    },
    {
      id: uid(), name: 'Apple & Almonds', emoji: '🍎', date: today, loggedAt: mk(11, 15),
      slot: 'snack', kcal: 280, protein: 8, carbs: 30, fat: 14, servings: 1, confidence: 1,
    },
  ]

  return { profile, foods, weights, photos: [], sessions, v: STATE_VERSION }
}
