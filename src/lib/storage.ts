// localStorage persistence + default profile + first-run demo seed.

import type { AppState, UserProfile } from '../types'
import { todayISO, uid } from './date'
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
  weightLossPace: 'steady',
  sports: ['running', 'strength', 'badminton'],
  raceDate: null,
  planStartDate: null,
  raceType: 'half-marathon',
  trainingDaysPerWeek: 4,
  halfMarathonGoal: 'sub230',
  targetFinishMin: null,
  bestRunDistanceKm: 5,
  bestRunPaceSecPerKm: 360,
  bestFiveKmPaceSecPerKm: 360,
  bestTenKmPaceSecPerKm: 420,
  runPreferredDays: [1, 3, 5],
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
  return { profile: { ...DEFAULT_PROFILE }, foods: [], weights: [], photos: [], sessions: [], dietTasks: [], v: STATE_VERSION }
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
    parsed.dietTasks = Array.isArray(parsed.dietTasks) ? parsed.dietTasks : []
    parsed.profile.bestFiveKmPaceSecPerKm = parsed.profile.bestFiveKmPaceSecPerKm || parsed.profile.bestRunPaceSecPerKm || DEFAULT_PROFILE.bestFiveKmPaceSecPerKm
    parsed.profile.bestTenKmPaceSecPerKm = parsed.profile.bestTenKmPaceSecPerKm || Math.round((parsed.profile.bestRunPaceSecPerKm || DEFAULT_PROFILE.bestRunPaceSecPerKm) + 45)
    parsed.profile.runPreferredDays = Array.isArray(parsed.profile.runPreferredDays) && parsed.profile.runPreferredDays.length
      ? parsed.profile.runPreferredDays
      : DEFAULT_PROFILE.runPreferredDays
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
  if (min <= 155) return 'sub235'
  if (min <= 160) return 'sub240'
  if (min <= 165) return 'sub245'
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

/** Start from the user's real baseline, never simulated meals or workouts. */
export function seedForProfile(profile: UserProfile): AppState {
  return {
    profile,
    foods: [],
    weights: [{ id: uid(), date: todayISO(), weightKg: profile.startWeightKg }],
    photos: [],
    sessions: generatePlan(profile, profile.startWeightKg),
    dietTasks: [],
    v: STATE_VERSION,
  }
}
