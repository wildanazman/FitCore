// Training-plan engine.
// Generates a capability-scaled half-marathon plan, plus calorie helpers for
// manually logged activities.

import type { HalfMarathonGoal, PlanSession, SessionType, UserProfile } from '../types'
import { addDays, mondayIndex, startOfWeek, todayISO, uid } from './date'
import { activityById, caloriesFromMet, metForRun } from './activities'

const RACE_KM = 21.1
const SEC_PER_MIN = 60

const HM_GOAL_MINUTES: Record<HalfMarathonGoal, number | null> = {
  finish: null,
  sub230: 150,
  sub215: 135,
  sub200: 120,
  sub145: 105,
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
  return min ? Math.round((min * SEC_PER_MIN) / RACE_KM) : null
}

export const HALF_MARATHON_GOALS: HalfMarathonGoal[] = ['finish', 'sub230', 'sub215', 'sub200', 'sub145']

export function planCapability(p: UserProfile) {
  const bestKm = Math.max(1, p.bestRunDistanceKm || 5)
  const bestPace = Math.max(240, p.bestRunPaceSecPerKm || 360)
  const easyPace = bestPace + 75
  const tempoPace = Math.max(240, bestPace + 20)
  const intervalPace = Math.max(210, bestPace - 10)
  const projectedRacePace = Math.round(bestPace + 35 + Math.max(0, 10 - bestKm) * 5)
  const selectedGoalPace = halfMarathonGoalPace(p.halfMarathonGoal)
  const targetPace = selectedGoalPace ?? projectedRacePace

  return {
    bestKm,
    bestPace,
    easyPace,
    tempoPace,
    intervalPace,
    targetPace,
    selectedGoalMin: halfMarathonGoalMinutes(p.halfMarathonGoal),
    selectedGoalLabel: halfMarathonGoalLabel(p.halfMarathonGoal),
    projectedFinishMin: Math.round((targetPace * RACE_KM) / SEC_PER_MIN),
  }
}

function longRunForWeek(p: UserProfile, weekIndex: number, weeks: number): number {
  const cap = planCapability(p)
  if (weeks === 6) {
    const base = Math.max(3, Math.min(8, Math.round(cap.bestKm * 0.9)))
    return Math.min(14, Math.round((base + weekIndex * Math.max(0.5, cap.bestKm * 0.12)) * 10) / 10)
  }

  if (weekIndex === weeks - 1) return RACE_KM

  const start = Math.max(4, Math.min(10, Math.round(cap.bestKm + 1)))
  const peak = Math.max(14, Math.min(22, Math.round(Math.max(cap.bestKm * 2.4, 16))))
  const buildPattern = [0, 0.12, -0.02, 0.26, 0.38, 0.14, 0.5, 0.66, 0.36, 0.82, 1, 0.55, 0.24]
  return Math.max(4, Math.round((start + (peak - start) * buildPattern[weekIndex]) * 10) / 10)
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
 * Generate a periodized plan. With a race date, race day lands exactly on that
 * date. Without a race date, this builds a rolling 6-week base block.
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

  const weeks = p.raceDate ? 14 : 6
  const lastMonday = startOfWeek(p.raceDate ?? todayISO())
  const planStart = addDays(lastMonday, -(weeks - 1) * 7)

  for (let w = 0; w < weeks; w++) {
    const weekNum = w + 1
    const weekStart = addDays(planStart, w * 7)
    const taperFactor = p.raceDate && weekNum >= weeks - 2 ? 1 - 0.2 * (weekNum - (weeks - 3)) : 1

    const longKm = longRunForWeek(p, w, weeks)
    const easyKm = Math.max(3, Math.round(longKm * 0.45 * taperFactor))
    const tempoKm = Math.max(4, Math.round(longKm * 0.55 * taperFactor))

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)

      if (p.raceDate && date === p.raceDate) {
        out.push(
          session(date, 'run', 'Half Marathon - Race Day', `${RACE_KM} KM - ${paceText(cap.targetPace)} target`, runMinutes(RACE_KM, cap.targetPace), kcalRun(weightKg, RACE_KM), 'half-marathon', 'emoji_events', {
            distanceKm: RACE_KM,
            zone: 'Race',
          }),
        )
        continue
      }

      if (doesRun && d === 1) {
        if (weekNum % 2 === 0) {
          out.push(
            session(date, 'run', 'Tempo Run', `${tempoKm} KM - ${paceText(cap.tempoPace)} tempo`, runMinutes(tempoKm, cap.tempoPace), kcalRun(weightKg, tempoKm), 'half-marathon', 'directions_run', {
              distanceKm: tempoKm,
              zone: 'Z3-Z4',
            }),
          )
        } else {
          out.push(
            session(date, 'run', 'Intervals', `${Math.max(4, Math.round(longKm / 3))}x800m - ${paceText(cap.intervalPace)}`, runMinutes(tempoKm, cap.intervalPace), kcalRun(weightKg, tempoKm), 'half-marathon', 'directions_run', {
              distanceKm: tempoKm,
              zone: 'Z4-Z5',
            }),
          )
        }
      } else if (doesRun && d === 3) {
        out.push(
          session(date, 'run', 'Easy / Recovery', `${easyKm} KM - ${paceText(cap.easyPace)} easy`, runMinutes(easyKm, cap.easyPace), kcalRun(weightKg, easyKm), 'half-marathon', 'directions_run', {
            distanceKm: easyKm,
            zone: 'Z2',
          }),
        )
      } else if (doesRun && d === 5) {
        out.push(
          session(date, 'run', 'Long Run', `${longKm} KM - ${paceText(cap.easyPace)} easy`, runMinutes(longKm, cap.easyPace), kcalRun(weightKg, longKm), 'half-marathon', 'directions_run', {
            distanceKm: longKm,
            zone: 'Z2',
          }),
        )
      }

      if (hasStrength && (d === 2 || d === 4)) {
        const isPush = d === 2
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

      if (sport && d === 6) {
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
  const runs = sessions.filter((s) => s.plan === 'half-marathon')
  if (!runs.length) return null
  const start = runs[0].date
  const totalDays = 14 * 7
  const elapsed = Math.max(0, Math.min(totalDays, (mondayIndex(todayIso) + 1) + 7 * weeksSince(start, todayIso)))
  const week = Math.max(1, Math.min(14, Math.ceil(elapsed / 7)))
  const daysLeft = Math.max(0, daysUntil(todayIso, p.raceDate))
  const taperIn = daysUntil(todayIso, p.raceDate) - 21
  return { week, totalWeeks: 14, daysLeft, taperIn, pct: Math.round((week / 14) * 100) }
}

function weeksSince(startISO: string, nowISO: string): number {
  const s = startOfWeek(startISO)
  const n = startOfWeek(nowISO)
  return Math.round((Date.parse(n) - Date.parse(s)) / (7 * 86_400_000))
}
function daysUntil(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000)
}
