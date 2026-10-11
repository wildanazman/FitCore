import type { PlanSession, UserProfile } from '../types'
import { ACTIVITIES, canUseEquipment, type ActivityDef } from './activities'
import { addDays, daysBetween, mondayIndex, parseISO, startOfWeek, todayISO } from './date'

export const COACH_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'shoulders' | 'core' | 'arms'
const choices: Record<Pattern, { gym: string[]; home: string[] }> = {
  push: { gym: ['gym_chest_press', 'gym_db_bench'], home: ['home_db_bench_press', 'home_floor_press', 'home_kb_floor_press', 'home_bench_pushup', 'home_kneeling_pushup', 'home_pushup'] },
  pull: { gym: ['gym_lat_pulldown', 'gym_seated_row'], home: ['home_bench_row', 'home_db_bent_row', 'home_kb_row', 'home_bird_dog'] },
  squat: { gym: ['gym_leg_press', 'gym_bulgarian'], home: ['home_db_split_squat', 'home_kb_goblet', 'home_bodyweight_squat'] },
  hinge: { gym: ['gym_leg_curl', 'gym_rdl'], home: ['home_db_rdl', 'home_kb_rdl', 'home_db_bridge', 'home_glute_bridge', 'home_bodyweight_hinge'] },
  shoulders: { gym: ['gym_shoulder_press', 'gym_lateral_raise'], home: ['home_dumbbell_press', 'home_kb_shoulder_press', 'home_pike_pushup'] },
  core: { gym: ['gym_plank', 'gym_cable_crunch'], home: ['home_dead_bug', 'home_plank', 'home_standing_core'] },
  arms: { gym: ['gym_biceps_curl', 'gym_triceps_pushdown'], home: ['home_db_curl', 'home_kb_curl', 'home_pushup'] },
}
export function validCoachDays(days: number[]) {
  const sorted = [...new Set(days)].sort((a,b) => a-b)
  if (sorted.length < 2 || sorted.length > 4 || sorted.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return false
  return sorted.length === 4 || sorted.every((day, index) => ((sorted[(index+1)%sorted.length] + (index === sorted.length-1 ? 7 : 0)) - day) >= 2)
}
export function coachExercise(pattern: Pattern, profile: UserProfile, variant = 0): ActivityDef | undefined {
  const prefs = profile.strengthCoach!
  const eligible = choices[pattern][prefs.gym ? 'gym' : 'home'].map(id => ACTIVITIES.find(item => item.id === id)).filter((item): item is ActivityDef => Boolean(item && (prefs.gym || canUseEquipment(item, profile.homeEquipment ?? []))))
  // Home priority prefers actual available equipment; variation must not select an unavailable implement.
  return eligible[Math.min(variant, Math.max(0, eligible.length - 1))]
}
export function coachDay(profile: UserProfile, date: string, sessions: PlanSession[]) {
  const prefs = profile.strengthCoach
  if (!prefs || !validCoachDays(prefs.days) || !prefs.clearance || profile.age < 18 || todayISO(parseISO(prefs.startDate)) !== prefs.startDate || todayISO(parseISO(date)) !== date) return null
  const days = [...prefs.days].sort((a,b) => a-b)
  const index = days.indexOf(mondayIndex(date))
  const week = Math.max(0, Math.floor(daysBetween(startOfWeek(prefs.startDate), startOfWeek(date))/7))
  const rest = index < 0 || date < prefs.startDate
  const upper = days.length === 4 && index % 2 === 0
  const lower = days.length === 4 && !upper
  const patterns: Pattern[] = rest ? [] : upper ? ['push','pull','shoulders','arms','push','core'] : lower ? ['squat','hinge','squat','core','hinge'] : ['squat','push','pull','hinge','shoulders','core']
  const count = prefs.minutes === 30 ? 4 : prefs.minutes === 45 ? 5 : 6
  const used = new Set<string>()
  const exercises = patterns.slice(0,count).flatMap((pattern, position) => {
    const item = coachExercise(pattern, profile, used.has(coachExercise(pattern, profile)?.id ?? '') ? 1 : 0)
    if (!item || used.has(item.id)) return []
    used.add(item.id)
    const recent = sessions.filter(s => s.completed && s.date < date && s.strengthLog?.exerciseId === item.id).sort((a,b) => (b.loggedAt ?? b.date).localeCompare(a.loggedAt ?? a.date))[0]
    const held = item.id.includes('plank')
    const sets = prefs.experience === 'new' || prefs.minutes === 30 ? 2 : 3
    const key = `${date}:${item.id}`
    const logged = sessions.find(s => s.completed && s.date === date && (s.coachKey === key || s.strengthLog?.exerciseId === item.id))
    return [{ item, key, sets, reps: held ? 25 : prefs.focus === 'muscle' ? 10 : 12, held, rest: position < 4 ? 120 : 90, recent, logged }]
  })
  const limitedPull = !prefs.gym && !['dumbbell','kettlebell'].some(gear => profile.homeEquipment?.includes(gear as 'dumbbell'|'kettlebell'))
  const title = rest ? 'Recovery day' : upper ? limitedPull ? 'Upper-body basics' : 'Chest, back & shoulders' : lower ? 'Legs, glutes & core' : limitedPull ? 'Full-body basics' : 'Full body · chest, back & legs'
  const hardRun = sessions.some(s => s.date === date && s.type === 'run' && (['interval','long','tempo'].includes(s.runKind ?? '') || /interval|long|tempo|hill/i.test(s.title)))
  const yesterdayStrength = sessions.some(s => s.date === addDays(date,-1) && s.completed && s.type === 'strength')
  const nextSearchStart = date < prefs.startDate ? addDays(prefs.startDate,-1) : date
  return { title, exercises, rest, week, hardRun, recoveryWarning: !rest && days.length < 4 && yesterdayStrength,
    completed: exercises.length > 0 && exercises.every(e => e.logged), gym: prefs.gym,
    limitedPull,
    nextDate: Array.from({length:7},(_,i)=>addDays(nextSearchStart,i+1)).find(day => days.includes(mondayIndex(day)))! }
}
