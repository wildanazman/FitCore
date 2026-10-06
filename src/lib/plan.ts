// Distance-specific heuristic running plans. General guidance, not a performance guarantee.
import type { HalfMarathonGoal, PlanSession, RaceType, UserProfile } from '../types'
import { addDays, daysBetween, mondayIndex, startOfWeek, todayISO, uid } from './date'
import { activityById, caloriesFromMet, metForRun } from './activities'

export const RACE_OPTIONS: { id: RaceType; label: string; km: number; weeks: number; presets: number[] }[] = [
  { id: '5k', label: '5K', km: 5, weeks: 8, presets: [20, 25, 30, 35] },
  { id: '10k', label: '10K', km: 10, weeks: 10, presets: [45, 50, 60, 70] },
  { id: 'half-marathon', label: 'Half marathon', km: 21.1, weeks: 14, presets: [105, 120, 150, 180] },
  { id: 'marathon', label: 'Marathon', km: 42.2, weeks: 18, presets: [180, 240, 270, 300] },
]
const LEGACY: Record<HalfMarathonGoal, number | null> = { finish:null, sub245:165, sub240:160, sub235:155, sub230:150, sub215:135, sub200:120, sub145:105 }
export function raceDistanceKm(type: RaceType) { return RACE_OPTIONS.find(r => r.id === type)?.km ?? 21.1 }
export function raceLabel(type: RaceType) { return RACE_OPTIONS.find(r => r.id === type)?.label ?? 'Half marathon' }
export function formatPace(seconds: number) {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2,'0')}/km`
}
export function formatFinishTime(minutes: number) {
  const seconds = Math.round(minutes * 60), hours = Math.floor(seconds / 3600), mins = Math.floor(seconds % 3600 / 60)
  return hours ? `${hours}:${String(mins).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}` : `${mins}:${String(seconds % 60).padStart(2,'0')}`
}
export function parseRunTime(text: string): number | null {
  if (!/^\d{1,3}:\d{2}(:\d{2})?$/.test(text.trim())) return null
  const values = text.trim().split(':').map(Number)
  if (values.slice(1).some(v => v >= 60)) return null
  const seconds = values.length === 3 ? values[0]*3600+values[1]*60+values[2] : values[0]*60+values[1]
  return seconds > 0 && seconds <= 86400 ? seconds / 60 : null
}
export function halfMarathonGoalMinutes(goal: HalfMarathonGoal) { return LEGACY[goal] }
export function halfMarathonGoalLabel(goal: HalfMarathonGoal) { return LEGACY[goal] ? `Sub ${formatFinishTime(LEGACY[goal]!)}` : 'Finish strong' }
export function halfMarathonGoalPace(goal: HalfMarathonGoal) { return LEGACY[goal] ? LEGACY[goal]! * 60 / 21.1 : null }
export const HALF_MARATHON_GOALS = Object.keys(LEGACY) as HalfMarathonGoal[]
export function trainingDays(p: UserProfile) { return Math.max(3, Math.min(6, Math.round(p.trainingDaysPerWeek || 3))) }
export function planWeeks(p: UserProfile) {
  if (p.raceDate && p.planStartDate) return Math.max(1, Math.min(52, Math.ceil((daysBetween(p.planStartDate, p.raceDate)+1)/7)))
  return Math.max(4, Math.min(26, p.runPlanWeeks || RACE_OPTIONS.find(r => r.id === p.raceType)!.weeks))
}
export function assessRunning(p: UserProfile) {
  const raceKm = raceDistanceKm(p.raceType), benchmarkKm = p.runBenchmarkDistanceKm === 10 ? 10 : 5
  const benchmarkPace = Math.max(120, Math.min(1800, benchmarkKm === 10 ? p.bestTenKmPaceSecPerKm : p.bestFiveKmPaceSecPerKm))
  const baselineSeconds = benchmarkKm * benchmarkPace * Math.pow(raceKm / benchmarkKm, 1.06)
  const selectedGoalMin = Number.isFinite(p.runGoalTimeMin) && p.runGoalTimeMin! > 0 ? p.runGoalTimeMin : null
  const difficulty = !p.runBenchmarkKnown ? 'unknown' : !selectedGoalMin ? 'finish' : selectedGoalMin*60 < baselineSeconds*.95 ? 'unrealistic' : selectedGoalMin*60 < baselineSeconds ? 'stretch' : 'realistic'
  const planSeconds = selectedGoalMin && (difficulty === 'realistic' || difficulty === 'stretch') ? selectedGoalMin*60 : baselineSeconds
  const longestKm = Math.max(1, p.bestRunDistanceKm || 3)
  const capacityWarning = p.raceType === 'marathon' && longestKm < 15 ? 'Build a running base first. A marathon needs much more endurance than a short timed result can predict.' : p.raceType === 'half-marathon' && longestKm < 6 ? 'Your current longest run suggests a base-building block before a half-marathon build.' : null
  return { raceKm, baselineFinishMin:baselineSeconds/60, realisticFinishMin:baselineSeconds/60, selectedGoalMin,
    selectedGoalLabel:selectedGoalMin ? `Sub ${formatFinishTime(selectedGoalMin)}` : 'Finish without a time target',
    planPace:Math.round(planSeconds/raceKm), realisticPace:Math.round(baselineSeconds/raceKm), difficulty,
    capacityWarning, weeksAvailable:planWeeks(p), benchmarkPace, benchmarkKm }
}
export function planCapability(p: UserProfile) {
  const assessment = assessRunning(p), bestKm = Math.max(1, p.bestRunDistanceKm || 3)
  const fivePace = assessment.benchmarkPace * Math.pow(5/assessment.benchmarkKm,.06)
  const tenPace = assessment.benchmarkPace * Math.pow(10/assessment.benchmarkKm,.06)
  return { raceKm:assessment.raceKm, bestKm, bestPace:assessment.benchmarkPace, easyPace:Math.round(tenPace+80),
    tempoPace:Math.round(tenPace+15), intervalPace:Math.round(fivePace), targetPace:assessment.planPace,
    assessment, selectedGoalMin:assessment.selectedGoalMin, selectedGoalLabel:assessment.selectedGoalLabel,
    selectedGoalPace:assessment.selectedGoalMin ? assessment.selectedGoalMin*60/assessment.raceKm : null,
    projectedFinishMin:assessment.planPace*assessment.raceKm/60 }
}
export function kcalActivity(weightKg: number, id: string, min: number, km = 0) {
  const item = activityById(id)
  return caloriesFromMet(weightKg, item.type === 'run' ? metForRun(km,min,item.met) : item.met,min)
}
export function suggestPlanStart() { return startOfWeek(todayISO()) }
export function raceDateForPlanStart(start: string, weeks: number) { return addDays(start,weeks*7-1) }
export function planPhase(week: number, weeks: number) {
  return week >= weeks-1 ? 'Taper & sharpen' : week <= Math.max(2,Math.floor(weeks*.25)) ? 'Build your base' : week <= Math.floor(weeks*.65) ? 'Develop endurance' : 'Race-specific practice'
}
function selectedWeekdays(p: UserProfile) {
  const days = [...new Set(p.runPreferredDays)].filter(d => Number.isInteger(d) && d>=0 && d<=6).sort((a,b)=>a-b).slice(0,trainingDays(p))
  for (const d of [1,3,5,6,0,4,2]) if(days.length < trainingDays(p) && !days.includes(d)) days.push(d)
  return days.sort((a,b)=>a-b)
}
function runningSession(date:string,title:string,detail:string,minutes:number,km:number,weight:number,zone:string): PlanSession {
  return { id:uid(),date,type:'run',title,detail,durationMin:Math.round(minutes),distanceKm:Math.round(km*100)/100,kcal:Math.round(weight*km*1.03),completed:false,plan:'running',icon:'directions_run',zone }
}
function qualityWorkout(p:UserProfile,week:number,cap:ReturnType<typeof planCapability>) {
  const early=week<2
  if (!p.runBenchmarkKnown || early) {
    const min = p.runBenchmarkKnown ? 25 : 20
    return { title:'Easy + relaxed strides',detail:`${min} min conversational run/walk. If comfortable: 4 × 15 sec relaxed strides, 60–90 sec walking recovery. Never sprint.`,min,km:min*60/cap.easyPace,zone:'Easy' }
  }
  // Warm-up, repetitions, jog recoveries and cool-down are included in every total.
  const tempo = week%2===1
  let reps:number,workMin:number,recoveryMin:number,title:string,pace:number
  if (tempo) {
    reps=p.raceType==='5k'?2:p.raceType==='10k'?3:p.raceType==='half-marathon'?3:2
    workMin=p.raceType==='5k'?6:p.raceType==='10k'?7:p.raceType==='half-marathon'?8:12
    recoveryMin=3;title=p.raceType==='marathon'?'Controlled endurance blocks':'Tempo blocks'
    pace=p.raceType==='marathon'?Math.max(cap.tempoPace,cap.targetPace):cap.tempoPace
  } else {
    reps=p.raceType==='5k'?5:p.raceType==='10k'?4:3
    workMin=p.raceType==='5k'?2:p.raceType==='10k'?4:6
    recoveryMin=2;title=p.raceType==='5k'?'5K interval practice':p.raceType==='10k'?'10K interval practice':'Cruise intervals'
    pace=p.raceType==='5k'?cap.intervalPace:cap.tempoPace
  }
  const warm=10,cool=10,rest=(reps-1)*recoveryMin,min=warm+cool+reps*workMin+rest
  const km=(warm+cool+rest)*60/cap.easyPace+reps*workMin*60/pace
  const goalSpecific = !tempo && p.runGoalTimeMin !== null && !cap.assessment.capacityWarning && ['realistic','stretch'].includes(cap.assessment.difficulty) && week >= Math.floor(planWeeks(p)*.6)
  if (goalSpecific) {
    pace = cap.targetPace
    title = `${raceLabel(p.raceType)} goal-pace repetitions`
    const goalKm = (warm+cool+rest)*60/cap.easyPace+reps*workMin*60/pace
    return { title, detail:`10 min easy warm-up → ${reps} × ${workMin} min at ${formatPace(pace)} (target race pace, only if controlled), ${recoveryMin} min easy jog between → 10 min easy cool-down. Total ≈ ${min} min. Slow down for heat, fatigue or poor recovery.`, min, km:goalKm, zone:'Intervals' }
  }
  return { title,detail:`10 min easy warm-up → ${reps} × ${workMin} min at ${formatPace(pace)} (controlled effort), ${recoveryMin} min easy jog between → 10 min easy cool-down. Total ≈ ${min} min.`,min,km,zone:tempo?'Tempo':'Intervals' }
}
export function generatePlan(p: UserProfile,weightKg:number): PlanSession[] {
  if (!p.planStartDate || !p.sports.includes('running')) return []
  const start=p.planStartDate,weeks=planWeeks(p),last=p.raceDate ?? addDays(start,weeks*7-1)
  if (daysBetween(start,last)<0 || daysBetween(start,last)>365) return []
  const cap=planCapability(p),days=selectedWeekdays(p),longDay=days.includes(5)?5:days[days.length-1]
  const qualityDay=days.find(d=>d!==longDay && Math.min(Math.abs(d-longDay),7-Math.abs(d-longDay))>=2)
  const peak=p.raceType==='5k'?8:p.raceType==='10k'?13:p.raceType==='half-marathon'?21:32
  const initial=Math.min(peak,Math.max(1,cap.bestKm))
  const out:PlanSession[]=[]
  for(let offset=0;offset<=daysBetween(start,last);offset++) {
    const date=addDays(start,offset),week=Math.floor(offset/7),day=mondayIndex(date)
    const remaining=daysBetween(date,last),taper=week>=weeks-1
    if(p.raceDate && date===p.raceDate) { out.push(runningSession(date,`${raceLabel(p.raceType)} event`,`${cap.raceKm} km. ${p.runGoalTimeMin ? `Goal ${cap.selectedGoalLabel}; ${formatPace(p.runGoalTimeMin*60/cap.raceKm)} is the required average, not a promise.` : 'Start controlled; finish comfortably.'}`,cap.raceKm*cap.targetPace/60,cap.raceKm,weightKg,'Event'));continue }
    if(!days.includes(day))continue
    if(p.raceDate && remaining<=2) { if(remaining===2)out.push(runningSession(date,'Pre-race easy shakeout','15 min easy. Rest the day before your event.',15,15*60/cap.easyPace,weightKg,'Easy'));continue }
    const longKm=Math.min(peak,initial*Math.pow(1.08,Math.min(week,weeks-2)))*(week%3===2?.8:1)*(taper?.65:1)
    if(day===longDay) {
      const km=Math.round(longKm*10)/10,min=km*cap.easyPace/60
      out.push(runningSession(date,'Easy endurance run',`${km} km conversational run/walk${p.runBenchmarkKnown?` · guide ${formatPace(cap.easyPace)}`:''}. Keep it easy; walk breaks are welcome.`,min,km,weightKg,'Easy'))
    } else if(day===qualityDay && !taper) {
      const q=qualityWorkout(p,week,cap);out.push(runningSession(date,q.title,q.detail,q.min,q.km,weightKg,q.zone))
    } else {
      const min=Math.min(45,Math.max(15,initial*cap.easyPace/60*.55+(week*1.5)))*(taper?.7:1)
      out.push(runningSession(date,'Easy / recovery run',`${Math.round(min)} min at conversational effort${p.runBenchmarkKnown?` · guide ${formatPace(cap.easyPace)}`:''}. Finish feeling you could do more.`,min,min*60/cap.easyPace,weightKg,'Easy'))
    }
  }
  return out
}
export function sessionsForWeek(sessions:PlanSession[],anchor:string) {
  const start=startOfWeek(anchor),end=addDays(start,7)
  return sessions.filter(s=>s.date>=start&&s.date<end).sort((a,b)=>a.date.localeCompare(b.date))
}
export function planMeta(p:UserProfile,sessions:PlanSession[],today:string) {
  if(!p.planStartDate || !sessions.some(s=>s.plan==='running'))return null
  const totalWeeks=planWeeks(p),week=Math.max(1,Math.min(totalWeeks,Math.floor(daysBetween(p.planStartDate,today)/7)+1))
  return { week,totalWeeks,daysLeft:p.raceDate?Math.max(0,daysBetween(today,p.raceDate)):null,raceLabel:raceLabel(p.raceType),phase:planPhase(week,totalWeeks) }
}
