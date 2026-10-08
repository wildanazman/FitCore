// localStorage persistence + default profile + first-run demo seed.

import type { AppState, UserProfile } from '../types'
import { todayISO, uid } from './date'
import { generatePlan } from './plan'
import { DEFAULT_GEMINI_MODEL, geminiModelOrDefault } from '../../shared/geminiModels.js'

const KEY = 'fitcore.state.v1'
const FOOD_AI_USAGE_KEY = 'fitcore-food-ai-usage-v1'
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
  runGoalTimeMin: null,
  runPlanWeeks: 14,
  runBenchmarkDistanceKm: 5,
  runBenchmarkKnown: false,
  targetWeightKg: null,
  trainingDaysPerWeek: 4,
  halfMarathonGoal: 'sub230',
  targetFinishMin: null,
  bestRunDistanceKm: 5,
  bestRunPaceSecPerKm: 360,
  bestFiveKmPaceSecPerKm: 360,
  bestTenKmPaceSecPerKm: 420,
  runPreferredDays: [0, 1, 3, 5],
  activity: 'high',
  calorieTargetOverride: null,
  calorieOverrideIncludesTraining: false,
  proteinPerKg: 1.8,
  dietMode: 'standard',
  netCarbCapG: 20,
  eatingWindowStartHour: 12,
  units: 'metric',
  wearables: { appleHealth: false, garmin: false, strava: false },
  notif: { morningBrief: true, underFuelAlert: true, preRace: true },
  anthropicApiKey: '',
  geminiModel: DEFAULT_GEMINI_MODEL,
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
    const hadCustomGoal = Object.prototype.hasOwnProperty.call(parsed.profile, 'runGoalTimeMin')
    parsed.profile = { ...DEFAULT_PROFILE, ...parsed.profile }
    parsed.profile.geminiModel = geminiModelOrDefault(parsed.profile.geminiModel)
    if (!hadCustomGoal) {
      const legacyMinutes = { finish: null, sub245: 165, sub240: 160, sub235: 155, sub230: 150, sub215: 135, sub200: 120, sub145: 105 }
      parsed.profile.runGoalTimeMin = parsed.profile.raceType === 'half-marathon' ? legacyMinutes[migratedGoal] : null
      parsed.profile.runPlanWeeks = parsed.profile.raceType === 'marathon' ? 18 : 14
      parsed.profile.runBenchmarkKnown = hadCapability
    }
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
      const retained = parsed.sessions.filter(s => !(s.manual || s.plan === 'manual') && (s.completed || s.plan !== 'running'))
      const completedSlots = new Set(retained.filter(s => s.completed).map(s => `${s.date}|${s.plan}|${s.type}`))
      const fresh = generatePlan(parsed.profile, parsed.profile.startWeightKg).filter(s => !completedSlots.has(`${s.date}|${s.plan}|${s.type}`))
      parsed.sessions = [...fresh, ...retained, ...manual].sort((a, b) => a.date.localeCompare(b.date))
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

/** Import must fail visibly before replacing in-memory data if storage is full. */
export function persistImportedState(state: AppState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)) }
  catch { throw new Error('Not enough browser storage to restore this backup. Your current data has not changed. Free some device storage and try again.') }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(FOOD_AI_USAGE_KEY)
    localStorage.removeItem('fitcore.roulette-skips.v1')
  } catch {
    /* noop */
  }
}

/** Start from the user's real baseline, never simulated meals or workouts. */
export function seedForProfile(profile: UserProfile): AppState {
  return {
    profile,
    foods: [],
    weights: [{ id: uid(), date: todayISO(), weightKg: profile.startWeightKg, source: 'onboarding' }],
    photos: [],
    sessions: generatePlan(profile, profile.startWeightKg),
    dietTasks: [],
    v: STATE_VERSION,
  }
}
