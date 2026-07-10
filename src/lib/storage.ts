// localStorage persistence + default profile + first-run demo seed.

import type { AppState, FoodEntry, UserProfile, WeightEntry } from '../types'
import { addDays, startOfWeek, todayISO, uid } from './date'
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
  planStartDate: null,
  raceType: 'half-marathon',
  trainingDaysPerWeek: 4,
  halfMarathonGoal: 'sub230',
  targetFinishMin: null,
  bestRunDistanceKm: 5,
  bestRunPaceSecPerKm: 360,
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
    const hadCapability =
      typeof parsed.profile.bestRunDistanceKm === 'number' &&
      typeof parsed.profile.bestRunPaceSecPerKm === 'number'
    const legacyProfile = parsed.profile as Partial<UserProfile> & { targetFinishMin?: number | null }
    const migratedGoal = legacyProfile.halfMarathonGoal
      ? legacyProfile.halfMarathonGoal
      : legacyProfile.targetFinishMin
        ? goalFromMinutes(legacyProfile.targetFinishMin)
        : DEFAULT_PROFILE.halfMarathonGoal
    parsed.profile = { ...DEFAULT_PROFILE, ...parsed.profile }
    parsed.profile.halfMarathonGoal = migratedGoal
    parsed.profile.targetFinishMin = null
    // Rename the old 'half-marathon' plan tag to the generic 'running' tag.
    parsed.sessions = parsed.sessions.map((s) =>
      (s.plan as string) === 'half-marathon' ? { ...s, plan: 'running' } : s,
    )
    if (!hadCapability) {
      const manual = parsed.sessions.filter((s) => s.plan === 'manual' || s.manual)
      const completedKeys = new Set(parsed.sessions.filter((s) => s.completed).map((s) => `${s.date}|${s.plan}|${s.title}`))
      const fresh = generatePlan(parsed.profile, parsed.profile.startWeightKg).map((s) =>
        completedKeys.has(`${s.date}|${s.plan}|${s.title}`) ? { ...s, completed: true } : s,
      )
      parsed.sessions = [...fresh, ...manual].sort((a, b) => a.date.localeCompare(b.date))
    }
    return parsed
  } catch {
    return null
  }
}

function goalFromMinutes(min: number): UserProfile['halfMarathonGoal'] {
  if (min <= 105) return 'sub145'
  if (min <= 120) return 'sub200'
  if (min <= 135) return 'sub215'
  if (min <= 150) return 'sub230'
  return 'finish'
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
  const seeded = { ...profile, planStartDate: profile.planStartDate ?? startOfWeek(today) }
  const p = seeded
  const weights: WeightEntry[] = []
  const start = p.startWeightKg + 4.2
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

  const sessions = generatePlan(p, p.startWeightKg)
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

  return { profile: p, foods, weights, photos: [], sessions, v: STATE_VERSION }
}
