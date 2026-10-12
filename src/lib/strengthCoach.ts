import type { PlanSession, UserProfile } from '../types'
import { ACTIVITIES, canUseEquipment, type ActivityDef } from './activities'
import { addDays, daysBetween, mondayIndex, parseISO, startOfWeek, todayISO } from './date'

export const COACH_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'shoulders' | 'core' | 'arms' | 'chestFly' | 'rearDelt' | 'biceps' | 'triceps' | 'unilateral' | 'calves' | 'lateral'
const choices: Record<Pattern, { gym: string[]; home: string[] }> = {
  push: { gym: ['gym_chest_press', 'gym_db_bench'], home: ['home_db_bench_press', 'home_floor_press', 'home_kb_floor_press', 'home_bench_pushup', 'home_kneeling_pushup', 'home_pushup'] },
  pull: { gym: ['gym_lat_pulldown', 'gym_seated_row'], home: ['home_bench_row', 'home_db_bent_row', 'home_kb_row', 'home_bird_dog'] },
  squat: { gym: ['gym_leg_press', 'gym_bulgarian'], home: ['home_db_split_squat', 'home_kb_goblet', 'home_bodyweight_squat'] },
  hinge: { gym: ['gym_leg_curl', 'gym_rdl'], home: ['home_db_rdl', 'home_kb_rdl', 'home_db_bridge', 'home_glute_bridge', 'home_bodyweight_hinge'] },
  shoulders: { gym: ['gym_shoulder_press', 'gym_lateral_raise'], home: ['home_dumbbell_press', 'home_kb_shoulder_press', 'home_pike_pushup'] },
  core: { gym: ['gym_plank', 'gym_cable_crunch'], home: ['home_dead_bug', 'home_plank', 'home_standing_core'] },
  arms: { gym: ['gym_biceps_curl', 'gym_triceps_pushdown'], home: ['home_db_curl', 'home_kb_curl', 'home_pushup'] },
  chestFly: { gym: ['gym_pec_deck', 'gym_cable_fly'], home: ['home_db_bench_fly', 'home_db_squeeze_press', 'home_bench_pushup'] },
  rearDelt: { gym: ['gym_rear_delt', 'gym_face_pull'], home: ['home_db_reverse_fly', 'home_bird_dog'] },
  biceps: { gym: ['gym_biceps_curl', 'gym_hammer_curl'], home: ['home_db_curl', 'home_kb_curl', 'home_db_hammer_curl'] },
  triceps: { gym: ['gym_triceps_pushdown', 'gym_overhead_triceps'], home: ['home_db_triceps', 'home_db_kickback'] },
  unilateral: { gym: ['gym_bulgarian'], home: ['home_db_lunge', 'home_reverse_lunge', 'home_split_squat'] },
  calves: { gym: ['gym_calf_raise'], home: ['home_calf_raise'] },
  lateral: { gym: ['gym_lateral_raise'], home: ['home_db_lateral_raise', 'home_kb_halo'] },
}
export function validCoachDays(days: number[], split: 'balanced' | 'muscle-days' = 'muscle-days') {
  const sorted = [...new Set(days)].sort((a,b) => a-b)
  if (sorted.length !== days.length || sorted.length < 2 || sorted.length > 5 || sorted.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return false
  return (sorted.length >= 3 && split === 'muscle-days') || sorted.length >= 4 || sorted.every((day, index) => ((sorted[(index+1)%sorted.length] + (index === sorted.length-1 ? 7 : 0)) - day) >= 2)
}
type SplitDay = { label: string; short: string; muscles: string[]; patterns: Pattern[] }
const SPLIT_DAYS: Record<string, SplitDay> = {
  full: { label: 'Full body', short: 'Full', muscles: ['chest','back','legs'], patterns: ['squat','push','pull','hinge','core','shoulders'] },
  chest: { label: 'Chest & triceps', short: 'Chest', muscles: ['chest'], patterns: ['push','chestFly','triceps','core','push','shoulders'] },
  back: { label: 'Back & biceps', short: 'Back', muscles: ['back'], patterns: ['pull','rearDelt','biceps','pull','biceps','core'] },
  legs: { label: 'Legs, glutes & abs', short: 'Legs', muscles: ['legs'], patterns: ['squat','hinge','unilateral','core','calves','squat'] },
  shoulders: { label: 'Shoulders & abs', short: 'Shoulder', muscles: ['shoulders'], patterns: ['shoulders','lateral','core','core','rearDelt','triceps'] },
  upper: { label: 'Chest, back & shoulders', short: 'Upper', muscles: ['chest','back'], patterns: ['push','pull','shoulders','biceps','triceps','core'] },
  lower: { label: 'Legs, glutes & core', short: 'Lower', muscles: ['legs'], patterns: ['hinge','squat','unilateral','core','calves','hinge'] },
}
function permutations<T>(items: T[]): T[][] {
  return items.length <= 1 ? [items] : items.flatMap((item,index)=>permutations(items.filter((_,i)=>i!==index)).map(rest=>[item,...rest]))
}
/** Arrange repeated primary-muscle days around actual weekdays, including Sunday→Monday. */
export function coachSplit(profile: UserProfile) {
  const prefs = profile.strengthCoach!
  const days = [...prefs.days].sort((a,b)=>a-b)
  const muscleDays = (prefs.split ?? 'muscle-days') === 'muscle-days'
  const names = days.length === 2 ? ['full','full'] : !muscleDays ? days.length === 3 ? ['full','full','full'] : days.length === 4 ? ['upper','lower','upper','lower'] : ['upper','lower','upper','lower','shoulders'] : days.length === 3 ? ['chest','back','legs'] : days.length === 4 ? ['chest','back','legs','shoulders'] : ['chest','back','legs','upper','lower']
  const score = (order: string[]) => order.reduce((total,name,i)=>total + order.slice(i+1).reduce((sum,other,j)=>{
    const gap = Math.abs(days[i]-days[i+j+1]), spacing = Math.min(gap,7-gap)
    return sum + (spacing<2 ? SPLIT_DAYS[name].muscles.filter(m=>SPLIT_DAYS[other].muscles.includes(m)).length * 100 : 0)
  },0),0)
  const arrangements = permutations(names)
  // Stable ties preserve familiar Chest→Back→Legs order whenever recovery permits.
  const order = arrangements.reduce((best,candidate)=>score(candidate)<score(best)?candidate:best,names)
  return { days: days.map((day,i)=>({ day, ...SPLIT_DAYS[order[i]] })), tightRecovery: score(order)>0, muscleDays }
}
export function coachExercise(pattern: Pattern, profile: UserProfile, variant = 0): ActivityDef | undefined {
  const prefs = profile.strengthCoach!
  const eligible = choices[pattern][prefs.gym ? 'gym' : 'home'].map(id => ACTIVITIES.find(item => item.id === id)).filter((item): item is ActivityDef => Boolean(item && (prefs.gym || canUseEquipment(item, profile.homeEquipment ?? []))))
  // Home priority prefers actual available equipment; variation must not select an unavailable implement.
  return eligible[Math.min(variant, Math.max(0, eligible.length - 1))]
}
export function coachDay(profile: UserProfile, date: string, sessions: PlanSession[]) {
  const prefs = profile.strengthCoach
  if (!prefs || !validCoachDays(prefs.days,prefs.split) || !prefs.clearance || profile.age < 18 || todayISO(parseISO(prefs.startDate)) !== prefs.startDate || todayISO(parseISO(date)) !== date) return null
  const days = [...prefs.days].sort((a,b) => a-b)
  const index = days.indexOf(mondayIndex(date))
  const week = Math.max(0, Math.floor(daysBetween(startOfWeek(prefs.startDate), startOfWeek(date))/7))
  const rest = index < 0 || date < prefs.startDate
  const split = coachSplit(profile), splitDay = split.days[index]
  const patterns: Pattern[] = rest ? [] : splitDay.patterns
  const count = prefs.minutes === 30 ? 4 : prefs.minutes === 45 ? 5 : 6
  const used = new Set<string>()
  const exercises = patterns.slice(0,count).flatMap((pattern) => {
    const item = Array.from({length:6},(_,variant)=>coachExercise(pattern,profile,variant)).find(candidate=>candidate&&!used.has(candidate.id))
    if (!item || used.has(item.id)) return []
    used.add(item.id)
    const recent = sessions.filter(s => s.completed && s.date < date && s.strengthLog?.exerciseId === item.id).sort((a,b) => (b.loggedAt ?? b.date).localeCompare(a.loggedAt ?? a.date))[0]
    const held = item.id.includes('plank')
    const compound = ['push','pull','squat','hinge','shoulders','unilateral'].includes(pattern)
    const sets = prefs.experience === 'new' ? 2 : prefs.minutes === 30 && !compound ? 2 : prefs.focus === 'muscle' && prefs.minutes === 60 && compound ? 4 : 3
    const key = `${date}:${item.id}`
    const logged = sessions.find(s => s.completed && s.date === date && (s.coachKey === key || s.strengthLog?.exerciseId === item.id))
    return [{ item, key, sets, pattern, reps: held ? 25 : prefs.focus === 'muscle' ? 10 : 12, held, rest: compound ? 120 : 90, recent, logged }]
  })
  // Perform the major loaded movements before isolation/core work, not after fatigued arms.
  const mainLift = (pattern: Pattern) => ['push','pull','squat','hinge','shoulders','unilateral'].includes(pattern)
  exercises.sort((a,b)=>Number(mainLift(b.pattern))-Number(mainLift(a.pattern)))
  const limitedPull = !prefs.gym && !['dumbbell','kettlebell'].some(gear => profile.homeEquipment?.includes(gear as 'dumbbell'|'kettlebell'))
  const title = rest ? 'Recovery day' : splitDay.label === 'Full body' ? limitedPull ? 'Full-body basics' : 'Full body · chest, back & legs' : splitDay.label
  const hardRun = sessions.some(s => s.date === date && s.type === 'run' && (['interval','long','tempo'].includes(s.runKind ?? '') || /interval|long|tempo|hill/i.test(s.title)))
  const yesterdayStrength = sessions.some(s => s.date === addDays(date,-1) && s.completed && s.type === 'strength')
  // Supersets are optional time-saving execution, not a promise of better hypertrophy.
  const techniquesAllowed = prefs.experience === 'regular' && prefs.techniques !== 'straight' && !hardRun && !split.tightRecovery && !yesterdayStrength
  const supersetPairs: { first: string; second: string; rounds: number; rest: number }[] = []
  if (techniquesAllowed && prefs.minutes <= 45) {
    const accessory = exercises.find(e=>['biceps','triceps','calves','lateral'].includes(e.pattern))
    const core = exercises.find(e=>e.pattern==='core')
    if (accessory && core && accessory.sets===core.sets) supersetPairs.push({first:accessory.item.id,second:core.item.id,rounds:core.sets,rest:120})
    else if (splitDay?.short==='Upper' || splitDay?.short==='Full') {
      const press=exercises.find(e=>e.pattern==='push'),pull=exercises.find(e=>e.pattern==='pull')
      if(press&&pull&&press.sets===pull.sets&&!limitedPull) supersetPairs.push({first:press.item.id,second:pull.item.id,rounds:press.sets,rest:120})
    }
  }
  const dropSet = techniquesAllowed && prefs.focus==='muscle' && prefs.gym && prefs.minutes===60
    ? [...exercises].reverse().find(e=>['gym_pec_deck','gym_triceps_pushdown','gym_leg_curl'].includes(e.item.id)) : undefined
  // Conservative time accounting includes warm-up, set execution, rests, transitions,
  // unilateral repetitions and an optional drop. It is an estimate, not a stopwatch.
  function estimateMinutes() {
    return Math.ceil((480 + exercises.reduce((seconds,e)=>{
      const unilateral=/single.arm|split squat|lunge/i.test(e.item.label)?2:1
      const work=e.held?30:15*3*unilateral
      return seconds+e.sets*work+(e.sets-1)*e.rest+45
    },0)+(dropSet?60:0))/60)
  }
  while(estimateMinutes()>prefs.minutes){
    const reducible=[...exercises].reverse().find(e=>e.sets>2 && !supersetPairs.some(pair=>pair.first===e.item.id||pair.second===e.item.id))
    if(reducible){reducible.sets--;continue}
    if(exercises.length>3){exercises.pop();continue}
    break
  }
  const retainedIds=new Set(exercises.map(e=>e.item.id))
  const validPairs=supersetPairs.filter(pair=>retainedIds.has(pair.first)&&retainedIds.has(pair.second))
  const validDrop=dropSet&&retainedIds.has(dropSet.item.id)?dropSet.item.id:null
  const nextSearchStart = date < prefs.startDate ? addDays(prefs.startDate,-1) : date
  return { title, shortTitle: rest ? 'Rest' : splitDay.short, split, exercises, supersetPairs: validPairs, dropSetExercise: validDrop, estimatedMinutes: rest?0:estimateMinutes(),
    volumeReason: prefs.experience==='new'?'Starter volume: 2 working sets to learn the movements. Warm-up sets are separate.':prefs.minutes===30?'Short session: prioritise the main lifts; accessories use less volume.':'Main lifts get 3–4 working sets; accessories and total volume stay within your time budget.',
    rest, week, hardRun, recoveryWarning: !rest && ((days.length === 2 || !split.muscleDays && days.length === 3) && yesterdayStrength || split.tightRecovery),
    completed: exercises.length > 0 && exercises.every(e => e.logged), gym: prefs.gym,
    limitedPull: limitedPull && patterns.some(p=>p==='pull'||p==='rearDelt'), limitedExercises: !rest && exercises.length < Math.min(count,patterns.length),
    nextDate: Array.from({length:7},(_,i)=>addDays(nextSearchStart,i+1)).find(day => days.includes(mondayIndex(day)))! }
}
