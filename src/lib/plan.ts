// Training-plan engine.
// PRD 3.3: 14-week half-marathon plan (Pfitzinger-style), auto-taper 21 days out
// (~20%/week volume cut), strength scheduled on non-running days, sport logged as conditioning.

import type { PlanSession, SessionType, UserProfile } from '../types'
import { addDays, mondayIndex, startOfWeek, todayISO, uid } from './date'

// Weekly long-run distance (km) across 14 weeks, with cut-back weeks and a 3-week taper at the end.
const LONG_RUN_KM = [11, 13, 10, 15, 17, 13, 18, 20, 15, 22, 19, 15, 11, 21.1]
const RACE_KM = 21.1

function kcalRun(weightKg: number, km: number): number {
  return Math.round(weightKg * km * 1.03)
}
function kcalStrength(min: number): number {
  return Math.round(min * 5)
}
function kcalSport(min: number): number {
  return Math.round(min * 7)
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
 * Generate the full periodized plan. Anchored so the race lands exactly on raceDate.
 * If no race date, builds a rolling 6-week base block from this week.
 */
export function generatePlan(p: UserProfile, weightKg: number): PlanSession[] {
  const hasStrength = p.sports.includes('strength')
  const sport: 'badminton' | 'pickleball' | null = p.sports.includes('badminton')
    ? 'badminton'
    : p.sports.includes('pickleball')
      ? 'pickleball'
      : null
  const doesRun = p.sports.includes('running')

  const out: PlanSession[] = []

  const weeks = p.raceDate ? 14 : 6
  const lastMonday = startOfWeek(p.raceDate ?? todayISO())
  const planStart = addDays(lastMonday, -(weeks - 1) * 7)

  for (let w = 0; w < weeks; w++) {
    const weekNum = w + 1
    const weekStart = addDays(planStart, w * 7)
    // Taper applies to the final 3 weeks of a race build.
    const taperFactor = p.raceDate && weekNum >= weeks - 2 ? 1 - 0.2 * (weekNum - (weeks - 3)) : 1

    const longKm = p.raceDate ? LONG_RUN_KM[w] : 10 + w
    const easyKm = Math.max(5, Math.round(longKm * 0.45 * taperFactor))
    const tempoKm = Math.max(6, Math.round(longKm * 0.55 * taperFactor))

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)

      // Race day overrides everything.
      if (p.raceDate && date === p.raceDate) {
        out.push(
          session(date, 'run', 'Half Marathon — RACE DAY', `${RACE_KM} KM • RACE PACE`, 105, kcalRun(weightKg, RACE_KM), 'half-marathon', 'emoji_events', {
            distanceKm: RACE_KM,
            zone: 'Race',
          }),
        )
        continue
      }

      // d: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
      if (doesRun && d === 1) {
        // Quality day: alternate intervals / tempo by week parity.
        if (weekNum % 2 === 0) {
          out.push(
            session(date, 'run', 'Tempo Run', `${tempoKm} KM • Z3–Z4`, Math.round(tempoKm * 5.2), kcalRun(weightKg, tempoKm), 'half-marathon', 'directions_run', {
              distanceKm: tempoKm,
              zone: 'Z3-Z4',
            }),
          )
        } else {
          out.push(
            session(date, 'run', 'Intervals', `${Math.max(4, Math.round(longKm / 3))}×800m • Z4–Z5`, 55, kcalRun(weightKg, tempoKm), 'half-marathon', 'directions_run', {
              distanceKm: tempoKm,
              zone: 'Z4-Z5',
            }),
          )
        }
      } else if (doesRun && d === 3) {
        out.push(
          session(date, 'run', 'Easy / Recovery', `${easyKm} KM • Z2`, Math.round(easyKm * 6.5), kcalRun(weightKg, easyKm), 'half-marathon', 'directions_run', {
            distanceKm: easyKm,
            zone: 'Z2',
          }),
        )
      } else if (doesRun && d === 5) {
        out.push(
          session(date, 'run', 'Long Run', `${longKm} KM • Z2`, Math.round(longKm * 6), kcalRun(weightKg, longKm), 'half-marathon', 'directions_run', {
            distanceKm: longKm,
            zone: 'Z2',
          }),
        )
      }

      // Strength on non-quality, non-long days (Wed & Sat-adjacent Fri) to avoid interference.
      if (hasStrength && (d === 2 || d === 4)) {
        const isPush = d === 2
        out.push(
          session(
            date,
            'strength',
            isPush ? 'Upper Body Power' : 'Lower Body Strength',
            '60 MIN • STRENGTH',
            60,
            kcalStrength(60),
            'strength',
            'fitness_center',
          ),
        )
      }

      // Sport session as cross-training conditioning, typically Sunday.
      if (sport && d === 6) {
        const title = sport === 'badminton' ? 'Badminton' : 'Pickleball'
        out.push(
          session(date, 'sport', title, '90 MIN • CONDITIONING', 90, kcalSport(90), 'sport', 'sports_tennis', {
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
