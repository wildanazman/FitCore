// Training-plan engine.
// Capability-scaled running plan for a half or full marathon, driven by how
// many days per week the runner wants to train. Plus calorie helpers for
// manually logged activities.

import type { HalfMarathonGoal, PlanSession, RaceType, SessionType, UserProfile } from '../types'
import { addDays, startOfWeek, todayISO, uid } from './date'
import { activityById, caloriesFromMet, metForRun } from './activities'

const HALF_KM = 21.1
const FULL_KM = 42.2
const SEC_PER_MIN = 60

const HM_GOAL_MINUTES: Record<HalfMarathonGoal, number | null> = {
  finish: null,
  sub245: 165,
  sub240: 160,
  sub235: 155,
  sub230: 150,
  sub215: 135,
  sub200: 120,
  sub145: 105,
}

export function raceDistanceKm(raceType: RaceType): number {
  return raceType === 'marathon' ? FULL_KM : HALF_KM
}

export function raceLabel(raceType: RaceType): string {
  return raceType === 'marathon' ? 'Marathon' : 'Half Marathon'
}

/** Total plan length in weeks for a race build (no date -> rolling 6-week base). */
export function planWeeks(p: UserProfile): number {
  if (!p.raceDate) return 6
  return p.raceType === 'marathon' ? 18 : 14
}

/** Clamp the requested training days into the supported 3-7 range. */
export function trainingDays(p: UserProfile): number {
  const n = Math.round(p.trainingDaysPerWeek || 4)
  return Math.max(3, Math.min(7, n))
}

function kcalRun(weightKg: number, km: number): number {
  return Math.round(weightKg * km * 1.03)
}
function kcalStrength(min: number): number {
  return Math.round(min * 5)
}
function kcalSport(min: number): number {
  return Math.round(min * 7)
}

export function kcalActivity(weightKg: number, activityId: string, min: number, distanceKm = 0): number {
  const activity = activityById(activityId)
  const met = activity.type === 'run' ? metForRun(distanceKm, min, activity.met) : activity.met
  return caloriesFromMet(weightKg, met, min)
}

function paceText(secPerKm: number): string {
  const min = Math.floor(secPerKm / SEC_PER_MIN)
  const sec = Math.round(secPerKm % SEC_PER_MIN)
  return `${min}:${String(sec).padStart(2, '0')}/km`
}

function runMinutes(km: number, secPerKm: number): number {
  return Math.max(1, Math.round((km * secPerKm) / SEC_PER_MIN))
}

export function formatPace(secPerKm: number): string {
  return paceText(secPerKm)
}

export function halfMarathonGoalLabel(goal: HalfMarathonGoal): string {
  if (goal === 'finish') return 'Finish strong'
  if (goal === 'sub245') return 'Sub 2:45'
  if (goal === 'sub240') return 'Sub 2:40'
  if (goal === 'sub235') return 'Sub 2:35'
  if (goal === 'sub230') return 'Sub 2:30'
  if (goal === 'sub215') return 'Sub 2:15'
  if (goal === 'sub200') return 'Sub 2:00'
  return 'Sub 1:45'
}

export function halfMarathonGoalMinutes(goal: HalfMarathonGoal): number | null {
  return HM_GOAL_MINUTES[goal]
}

export function halfMarathonGoalPace(goal: HalfMarathonGoal): number | null {
  const min = HM_GOAL_MINUTES[goal]
  return min ? Math.round((min * SEC_PER_MIN) / HALF_KM) : null
}

export const HALF_MARATHON_GOALS: HalfMarathonGoal[] = ['finish', 'sub245', 'sub240', 'sub235', 'sub230', 'sub215', 'sub200', 'sub145']

const GOAL_ORDER: HalfMarathonGoal[] = ['sub145', 'sub200', 'sub215', 'sub230', 'sub235', 'sub240', 'sub245']

export function formatFinishTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function riegelFinishSeconds(distanceKm: number, paceSecPerKm: number, targetKm: number): number {
  const raceSeconds = distanceKm * paceSecPerKm
  return raceSeconds * Math.pow(targetKm / distanceKm, 1.06)
}

export function assessRunning(p: UserProfile) {
  const raceKm = raceDistanceKm(p.raceType)
  const fivePace = Math.max(240, p.bestFiveKmPaceSecPerKm || p.bestRunPaceSecPerKm || 360)
  const tenPace = Math.max(260, p.bestTenKmPaceSecPerKm || p.bestRunPaceSecPerKm + 45 || 420)
  const longestKm = Math.max(1, p.bestRunDistanceKm || 5)
  const fivePrediction = riegelFinishSeconds(5, fivePace, raceKm)
  const tenPrediction = riegelFinishSeconds(10, tenPace, raceKm)
  const hasTen = Boolean(p.bestTenKmPaceSecPerKm)
  const baselineSec = hasTen ? tenPrediction * 0.8 + fivePrediction * 0.2 : fivePrediction
  const days = trainingDays(p)
  const weeksAvailable = p.raceDate
    ? Math.max(1, Math.ceil(daysUntil(p.planStartDate ?? suggestPlanStart(), p.raceDate) / 7))
    : planWeeks(p)
  const dayPenalty = days <= 3 ? 0.025 : days === 4 ? 0.01 : 0
  const runwayPenalty = weeksAvailable < 8 ? 0.04 : weeksAvailable < 12 ? 0.01 : 0
  const distancePenalty = p.raceType === 'marathon'
    ? longestKm < 18 ? 0.06 : longestKm < 25 ? 0.03 : 0
    : longestKm < 8 ? 0.03 : longestKm < 12 ? 0.012 : 0
  const realisticSec = baselineSec * (1 + dayPenalty + runwayPenalty + distancePenalty)
  const stretchSec = baselineSec * (days <= 3 ? 0.985 : 0.97)
  const selectedGoalMin = p.raceType === 'half-marathon' ? halfMarathonGoalMinutes(p.halfMarathonGoal) : null
  const selectedGoalSec = selectedGoalMin ? selectedGoalMin * SEC_PER_MIN : null
  const difficulty = !selectedGoalSec
    ? 'finish'
    : selectedGoalSec < stretchSec
      ? 'unrealistic'
      : selectedGoalSec < realisticSec
        ? 'stretch'
        : 'realistic'
  const recommendedGoal = p.raceType === 'half-marathon'
    ? GOAL_ORDER.find((goal) => {
        const min = HM_GOAL_MINUTES[goal]
        return min !== null && min * SEC_PER_MIN >= realisticSec
      }) ?? 'finish'
    : 'finish'
  const planFinishSec = difficulty === 'unrealistic' || !selectedGoalSec
    ? realisticSec
    : selectedGoalSec
  const planPace = Math.round(planFinishSec / raceKm)

  return {
    raceKm,
    fivePace,
    tenPace,
    longestKm,
    weeksAvailable,
    baselineFinishMin: Math.round(baselineSec / SEC_PER_MIN),
    realisticFinishMin: Math.round(realisticSec / SEC_PER_MIN),
    stretchFinishMin: Math.round(stretchSec / SEC_PER_MIN),
    realisticPace: Math.round(realisticSec / raceKm),
    stretchPace: Math.round(stretchSec / raceKm),
    planPace,
    difficulty,
    recommendedGoal,
    selectedGoalMin,
    selectedGoalLabel: p.raceType === 'marathon' ? 'Finish the marathon' : halfMarathonGoalLabel(p.halfMarathonGoal),
  }
}

export function planCapability(p: UserProfile) {
  const raceKm = raceDistanceKm(p.raceType)
  const bestKm = Math.max(1, p.bestRunDistanceKm || 5)
  const assessment = assessRunning(p)
  const fivePace = Math.max(240, p.bestFiveKmPaceSecPerKm || p.bestRunPaceSecPerKm || 360)
  const tenPace = Math.max(260, p.bestTenKmPaceSecPerKm || p.bestRunPaceSecPerKm + 45 || 420)
  const bestPace = Math.round(fivePace * 0.35 + tenPace * 0.65)
  const easyPace = Math.max(300, Math.round(bestPace + 65))
  const tempoPace = Math.max(240, Math.round(bestPace + 8))
  const intervalPace = Math.max(210, Math.round(fivePace - 8))

  const selectedGoalPace = p.raceType === 'marathon' ? null : halfMarathonGoalPace(p.halfMarathonGoal)
  const targetPace = assessment.planPace

  return {
    raceKm,
    bestKm,
    bestPace,
    easyPace,
    tempoPace,
    intervalPace,
    targetPace,
    assessment,
    selectedGoalMin: p.raceType === 'marathon' ? null : halfMarathonGoalMinutes(p.halfMarathonGoal),
    selectedGoalLabel: p.raceType === 'marathon' ? 'Finish the marathon' : halfMarathonGoalLabel(p.halfMarathonGoal),
    selectedGoalPace,
    projectedFinishMin: Math.round((targetPace * raceKm) / SEC_PER_MIN),
  }
}

/** Peak long-run distance (km) for the race build. */
function peakLongRun(cap: ReturnType<typeof planCapability>, raceType: RaceType): number {
  if (raceType === 'marathon') return Math.max(26, Math.min(34, Math.round(Math.max(cap.bestKm * 2.8, 28))))
  return Math.max(14, Math.min(22, Math.round(Math.max(cap.bestKm * 2.4, 16))))
}

function longRunForWeek(p: UserProfile, weekIndex: number, weeks: number): number {
  const cap = planCapability(p)
  if (weeks === 6) {
    const base = Math.max(3, Math.min(8, Math.round(cap.bestKm * 0.9)))
    return Math.min(14, Math.round((base + weekIndex * Math.max(0.5, cap.bestKm * 0.12)) * 10) / 10)
  }

  const start = Math.max(4, Math.min(12, Math.round(cap.bestKm + 1)))
  const peak = peakLongRun(cap, p.raceType)
  // Progression fraction across the build weeks (0..1), same shape for any length.
  const frac = weekIndex / Math.max(1, weeks - 4)
  // Gentle cut-back every 3rd week.
  const cutback = weekIndex > 2 && weekIndex % 3 === 2 ? 0.85 : 1
  const km = (start + (peak - start) * Math.min(1, frac)) * cutback
  return Math.max(4, Math.round(km * 10) / 10)
}

/**
 * Which weekdays (0=Mon..6=Sun) carry a run, given how many training days the
 * runner wants. Long run (Sat) and one quality day (Tue) are always first;
 * easy runs fill in from a priority order.
 */
function runWeekdays(n: number, preferred: number[] = []): { long: number; quality: number; easy: number[] } {
  const clean = [...new Set(preferred)]
    .map((d) => Math.max(0, Math.min(6, Math.round(d))))
    .slice(0, 7)
  if (clean.length >= Math.min(n, 3)) {
    const selected = clean.slice(0, n)
    const long = selected.includes(5) ? 5 : selected[selected.length - 1]
    const quality = selected.find((d) => d !== long) ?? long
    const easy = selected.filter((d) => d !== long && d !== quality)
    return { long, quality, easy }
  }
  const long = 5 // Saturday
  const quality = 1 // Tuesday
  const easyPriority = [3, 6, 0, 4, 2] // Thu, Sun, Mon, Fri, Wed
  const easyCount = Math.max(0, n - 2)
  return { long, quality, easy: easyPriority.slice(0, easyCount) }
}

function session(
  date: string,
  type: SessionType,
  title: string,
  detail: string,
  durationMin: number,
  kcal: number,
  plan: PlanSession['plan'],
  icon: string,
  extra: Partial<PlanSession> = {},
): PlanSession {
  return { id: uid(), date, type, title, detail, durationMin, kcal, completed: false, plan, icon, ...extra }
}

/**
 * Generate a periodized running plan. With a race date, race day lands exactly
 * on that date. Without a race date, this builds a rolling 6-week base block.
 */
export function generatePlan(p: UserProfile, weightKg: number): PlanSession[] {
  const hasStrength = p.sports.includes('strength')
  const sport: 'badminton' | 'pickleball' | null = p.sports.includes('badminton')
    ? 'badminton'
    : p.sports.includes('pickleball')
      ? 'pickleball'
      : null
  const doesRun = p.sports.includes('running')
  const cap = planCapability(p)
  const out: PlanSession[] = []

  const weeks = planWeeks(p)
  const n = trainingDays(p)
  const { long, quality, easy } = runWeekdays(n, p.runPreferredDays)
  const runDaySet = new Set(doesRun ? [long, quality, ...easy] : [])
  // Strength on non-run days (prefer Wed/Fri/Mon), max 2.
  const strengthDays = hasStrength ? [2, 4, 0].filter((d) => !runDaySet.has(d)).slice(0, 2) : []
  // One sport session on a free day (prefer Sun then Mon).
  const sportDay = sport ? [6, 0, 3].find((d) => !runDaySet.has(d) && !strengthDays.includes(d)) : undefined

  const lastMonday = startOfWeek(p.raceDate ?? todayISO())
  const planStart = p.planStartDate ?? addDays(lastMonday, -(weeks - 1) * 7)

  for (let w = 0; w < weeks; w++) {
    const weekNum = w + 1
    const weekStart = addDays(planStart, w * 7)
    const taperFactor = p.raceDate && weekNum >= weeks - 2 ? 1 - 0.2 * (weekNum - (weeks - 3)) : 1

    const longKm = Math.max(4, Math.round(longRunForWeek(p, w, weeks) * taperFactor * 10) / 10)
    const easyKm = Math.max(3, Math.round(longKm * 0.45 * taperFactor))
    const tempoKm = Math.max(4, Math.round(longKm * 0.55 * taperFactor))
    let easyIdx = 0

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)

      // Race day overrides everything on that date.
      if (p.raceDate && date === p.raceDate) {
        out.push(
          session(date, 'run', `${raceLabel(p.raceType)} - Race Day`, `${cap.raceKm} KM - ${paceText(cap.targetPace)} target`, runMinutes(cap.raceKm, cap.targetPace), kcalRun(weightKg, cap.raceKm), 'running', 'emoji_events', {
            distanceKm: cap.raceKm,
            zone: 'Race',
          }),
        )
        continue
      }

      if (doesRun && d === long) {
        out.push(
          session(date, 'run', 'Long Run', `${longKm} KM - ${paceText(cap.easyPace)} easy`, runMinutes(longKm, cap.easyPace), kcalRun(weightKg, longKm), 'running', 'directions_run', {
            distanceKm: longKm,
            zone: 'Z2',
          }),
        )
      } else if (doesRun && d === quality) {
        if (weekNum % 2 === 0) {
          out.push(
            session(date, 'run', 'Tempo Run', `${tempoKm} KM - ${paceText(cap.tempoPace)} tempo`, runMinutes(tempoKm, cap.tempoPace), kcalRun(weightKg, tempoKm), 'running', 'directions_run', {
              distanceKm: tempoKm,
              zone: 'Z3-Z4',
            }),
          )
        } else {
          out.push(
            session(date, 'run', 'Intervals', `${Math.max(4, Math.round(longKm / 3))}x800m - ${paceText(cap.intervalPace)}`, runMinutes(tempoKm, cap.intervalPace), kcalRun(weightKg, tempoKm), 'running', 'directions_run', {
              distanceKm: tempoKm,
              zone: 'Z4-Z5',
            }),
          )
        }
      } else if (doesRun && easy.includes(d)) {
        // Vary easy-run distance a little so multiple easy days aren't identical.
        const km = Math.max(3, Math.round(easyKm * (easyIdx === 0 ? 1 : 0.8)))
        easyIdx++
        out.push(
          session(date, 'run', easyIdx > 1 ? 'Recovery Run' : 'Easy Run', `${km} KM - ${paceText(cap.easyPace)} easy`, runMinutes(km, cap.easyPace), kcalRun(weightKg, km), 'running', 'directions_run', {
            distanceKm: km,
            zone: 'Z2',
          }),
        )
      }

      if (strengthDays.includes(d)) {
        const isPush = strengthDays.indexOf(d) === 0
        out.push(
          session(
            date,
            'strength',
            isPush ? 'Upper Body Power' : 'Lower Body Strength',
            '60 MIN - STRENGTH',
            60,
            kcalStrength(60),
            'strength',
            'fitness_center',
          ),
        )
      }

      if (sport && d === sportDay) {
        const title = sport === 'badminton' ? 'Badminton' : 'Pickleball'
        out.push(
          session(date, 'sport', title, '90 MIN - CONDITIONING', 90, kcalSport(90), 'sport', 'sports_tennis', {
            zone: 'Cond',
          }),
        )
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function sessionsForWeek(sessions: PlanSession[], anchorISO: string): PlanSession[] {
  const start = startOfWeek(anchorISO)
  const end = addDays(start, 7)
  return sessions
    .filter((s) => s.date >= start && s.date < end)
    .sort((a, b) => (a.date === b.date ? 0 : a.date.localeCompare(b.date)))
}

export function planMeta(p: UserProfile, sessions: PlanSession[], todayIso: string) {
  if (!p.raceDate) return null
  const runs = sessions.filter((s) => s.plan === 'running')
  if (!runs.length) return null
  const start = p.planStartDate ?? runs[0].date
  const totalWeeks = Math.max(1, Math.round(daysUntil(start, p.raceDate) / 7) + 1)
  const daysLeft = Math.max(0, daysUntil(todayIso, p.raceDate))
  const weeksLeft = Math.ceil(daysLeft / 7)
  const week = Math.max(1, Math.min(totalWeeks, totalWeeks - weeksLeft + 1))
  const taperIn = daysUntil(todayIso, p.raceDate) - 21
  return { week, totalWeeks, daysLeft, taperIn, pct: Math.round((week / totalWeeks) * 100), raceLabel: raceLabel(p.raceType) }
}

/** Get the Monday of the current week as a suggested plan start. */
export function suggestPlanStart(): string {
  return startOfWeek(todayISO())
}

/** Calculate the correct race date so the plan fits within `weeks` from planStartDate. */
export function raceDateForPlanStart(planStart: string, totalWeeks: number): string {
  return addDays(planStart, totalWeeks * 7 - 1)
}

function daysUntil(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000)
}
