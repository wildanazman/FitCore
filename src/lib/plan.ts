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
export function formatPaceRange(seconds:number,spread=30) {
  return `${formatPace(Math.max(120,seconds-spread)).replace('/km','')}–${formatPace(seconds+spread)}`
}
/** Match a completion to the actual prescription, not merely its calendar day. */
export function scheduledRunKey(s:PlanSession) {
  const kind=s.runKind??(s.title==='Easy endurance run'||s.title==='Long Run'?'long':s.zone==='Intervals'?'interval':s.zone==='Tempo'?'tempo':s.zone==='Benchmark'?'benchmark':s.zone==='Event'?'event':'easy')
  return JSON.stringify([s.date,kind,s.durationMin,s.distanceKm??0,s.runBrief?.pace??s.detail])
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
export function parseCurrentRun(text:string):number|null {
  if(/^\d+(\.\d+)?$/.test(text.trim())) {
    const minutes=Number(text)
    return minutes>0&&minutes<=1440?minutes:null
  }
  return parseRunTime(text)
}
export function halfMarathonGoalMinutes(goal: HalfMarathonGoal) { return LEGACY[goal] }
export function halfMarathonGoalLabel(goal: HalfMarathonGoal) { return LEGACY[goal] ? `Sub ${formatFinishTime(LEGACY[goal]!)}` : 'Finish strong' }
export function halfMarathonGoalPace(goal: HalfMarathonGoal) { return LEGACY[goal] ? LEGACY[goal]! * 60 / 21.1 : null }
export const HALF_MARATHON_GOALS = Object.keys(LEGACY) as HalfMarathonGoal[]
export function trainingDays(p: UserProfile) { return Math.max(3, Math.min(6, Math.round(p.trainingDaysPerWeek || 3))) }
export function minimumPlanWeeks(p:UserProfile) {
  if(p.runBaseOnly)return p.runExperience==='new'?8:6
  const experienced=p.runExperience==='regular'
  if(p.raceType==='marathon')return experienced&&(p.runWeeklyKm??0)>=50&&p.bestRunDistanceKm>=25?12:16
  if(p.raceType==='half-marathon')return experienced&&(p.runWeeklyKm??0)>=30&&p.bestRunDistanceKm>=14?8:12
  return p.raceType==='10k'?10:8
}
export function planWeeks(p: UserProfile) {
  if (p.raceDate && p.planStartDate) return Math.max(1, Math.min(52, Math.ceil((daysBetween(p.planStartDate, p.raceDate)+1)/7)))
  return Math.max(4, Math.min(26, p.runPlanWeeks || RACE_OPTIONS.find(r => r.id === p.raceType)!.weeks))
}
export function assessRunning(p: UserProfile) {
  const raceKm = raceDistanceKm(p.raceType), benchmarkKm = [5,10,21.1,42.2].includes(p.runBenchmarkDistanceKm)?p.runBenchmarkDistanceKm:5
  const benchmarkPace = Math.max(120, Math.min(1800, p.runBenchmarkPaceSec??(benchmarkKm === 10 ? p.bestTenKmPaceSecPerKm : benchmarkKm===5?p.bestFiveKmPaceSecPerKm:p.bestFiveKmPaceSecPerKm*Math.pow(benchmarkKm/5,.06))))
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
function runningSession(date:string,title:string,detail:string,minutes:number,km:number,weight:number,zone:string,kind:PlanSession['runKind']=zone==='Tempo'?'tempo':zone==='Intervals'?'interval':zone==='Benchmark'?'benchmark':zone==='Event'?'event':'easy'): PlanSession {
  return { id:uid(),date,type:'run',title,detail,durationMin:Math.round(minutes),distanceKm:Math.round(km*100)/100,kcal:Math.round(weight*km*1.03),completed:false,plan:'running',icon:'directions_run',zone,runKind:kind }
}
export function weekCapability(p:UserProfile,week:number) {
  const checkpoint = [...(p.runCheckpoints ?? [])].filter(c=>c.fromWeek<=week && Number.isFinite(c.paceSec) && c.paceSec>=120 && c.paceSec<=1800).sort((a,b)=>b.fromWeek-a.fromWeek)[0]
  const current = checkpoint ? {...p,runBenchmarkKnown:true,runBenchmarkDistanceKm:checkpoint.distanceKm,runBenchmarkPaceSec:checkpoint.paceSec,...(checkpoint.distanceKm===5?{bestFiveKmPaceSecPerKm:checkpoint.paceSec}:checkpoint.distanceKm===10?{bestTenKmPaceSecPerKm:checkpoint.paceSec}:{})} : p
  const cap=planCapability(current)
  // A conditional workout progression, not a forecast of fitness improvement.
  // Limit one block to 5%; a new measured result is needed to unlock a bigger jump.
  const fraction=Math.min(1,Math.max(0,(week-(checkpoint?.fromWeek??0))/Math.max(1,planWeeks(p)-3)))
  const latestFeedback=[...(p.runWeekFeedback??[])].filter(f=>f.week<week).sort((a,b)=>b.week-a.week)[0]
  const hold=latestFeedback&&latestFeedback.response!=='comfortable'
  const ceiling=p.runExperience==='new'?.025:p.runExperience==='returning'?.035:.05
  const proposed=cap.selectedGoalPace?Math.max(0,Math.min(ceiling,1-cap.selectedGoalPace/cap.assessment.realisticPace)):.03
  const improvement=!hold?proposed*fraction:0
  const cutback=(week+1)%4===0?10:0
  return {...cap,easyPace:Math.round(cap.easyPace*(1-improvement*.6)+cutback),tempoPace:Math.round(cap.tempoPace*(1-improvement)),intervalPace:Math.round(cap.intervalPace*(1-improvement)),targetPace:Math.round(cap.targetPace*(1-improvement)),known:current.runBenchmarkKnown}
}
function qualityWorkout(p:UserProfile,week:number,cap:ReturnType<typeof weekCapability>) {
  const early=week<(p.runExperience==='new'?4:p.runExperience==='returning'?3:2)
  const feedback=[...(p.runWeekFeedback??[])].filter(f=>f.week<week).sort((a,b)=>b.week-a.week)[0]
  if (!cap.known || early || cap.assessment.capacityWarning || p.runBaseOnly || feedback&&feedback.response!=='comfortable') {
    const min = p.runBenchmarkKnown ? 25 : 20
    return { title:'Easy Run · optional strides',detail:`${min} min conversational run/walk. If comfortable: 4 × 15 sec relaxed strides, 60–90 sec walking recovery. Never sprint.`,min,km:min*60/cap.easyPace,zone:'Easy' }
  }
  if ((week+1)%4===0) {
    const km=cap.assessment.benchmarkKm<=10?cap.assessment.benchmarkKm:10
    const pace=cap.assessment.benchmarkPace*Math.pow(km/cap.assessment.benchmarkKm,.06),min=20+km*pace/60
    return {title:`Benchmark Run · ${km}K progress check`,detail:`10 min easy warm-up → ${km} km controlled timed run → 10 min easy cool-down. Record the result; skip if tired or unwell.`,min,km:km+20*60/cap.easyPace,zone:'Benchmark'}
  }
  // Warm-up, repetitions, jog recoveries and cool-down are included in every total.
  const tempo = week%2===1
  let reps:number,workMin:number,recoveryMin:number,title:string,pace:number
  if (tempo) {
    reps=p.raceType==='5k'?2:p.raceType==='10k'?3:p.raceType==='half-marathon'?3:2
    workMin=p.raceType==='5k'?6:p.raceType==='10k'?7:p.raceType==='half-marathon'?8:12
    recoveryMin=3;title=p.raceType==='marathon'?'Race Pace Run · controlled blocks':'Tempo Run · repeats'
    pace=p.raceType==='marathon'?Math.max(cap.tempoPace,cap.targetPace):cap.tempoPace
  } else {
    reps=p.raceType==='5k'?5:p.raceType==='10k'?4:3
    workMin=p.raceType==='5k'?2:p.raceType==='10k'?4:6
    recoveryMin=2;title=p.raceType==='5k'?'Interval Run · 5K repeats':p.raceType==='10k'?'Interval Run · 10K repeats':'Interval Run · longer repeats'
    pace=p.raceType==='5k'?cap.intervalPace:cap.tempoPace
  }
  const build=Math.min(2,Math.floor(week/4))
  reps+=build
  const warm=10,cool=10,rest=(reps-1)*recoveryMin,min=warm+cool+reps*workMin+rest
  const km=(warm+cool+rest)*60/cap.easyPace+reps*workMin*60/pace
  const goalSpecific = !tempo && p.runGoalTimeMin !== null && !cap.assessment.capacityWarning && ['realistic','stretch'].includes(cap.assessment.difficulty) && week >= Math.floor(planWeeks(p)*.6)
  if (goalSpecific) {
    pace = cap.selectedGoalPace!
    title = `Interval Run · ${raceLabel(p.raceType)} goal-pace repeats`
    const goalKm = (warm+cool+rest)*60/cap.easyPace+reps*workMin*60/pace
    return { title, detail:`10 min easy warm-up → ${reps} × ${workMin} min at ${formatPace(pace)} (target race pace, only if controlled), ${recoveryMin} min easy jog between → 10 min easy cool-down. Total ≈ ${min} min. Slow down for heat, fatigue or poor recovery.`, min, km:goalKm, zone:'Intervals' }
  }
  return { title,detail:`10 min easy warm-up → ${reps} × ${workMin} min at ${formatPace(pace)} (controlled effort), ${recoveryMin} min easy jog between → 10 min easy cool-down. Total ≈ ${min} min.`,min,km,zone:tempo?'Tempo':'Intervals' }
}
export function generatePlan(p: UserProfile,weightKg:number): PlanSession[] {
  if (!p.planStartDate || !p.sports.includes('running')) return []
  const start=p.planStartDate,weeks=planWeeks(p),last=p.raceDate ?? addDays(start,weeks*7-1)
  if (daysBetween(start,last)<0 || daysBetween(start,last)>365) return []
  const baseCap=planCapability(p),days=selectedWeekdays(p),longDay=days.includes(5)?5:days[days.length-1]
  const foundation=Boolean(p.runBaseOnly||weeks<minimumPlanWeeks(p)||baseCap.assessment.capacityWarning||(p.raceType==='half-marathon'&&(p.runWeeklyKm??15)<12)||(p.raceType==='marathon'&&(p.runWeeklyKm??30)<25))
  const qualityDay=days.find(d=>d!==longDay && Math.min(Math.abs(d-longDay),7-Math.abs(d-longDay))>=2)
  const peak=p.raceType==='5k'?8:p.raceType==='10k'?13:p.raceType==='half-marathon'?21:32
  const initial=Math.min(peak,Math.max(1,baseCap.bestKm))
  const out:PlanSession[]=[]
  for(let offset=0;offset<=daysBetween(start,last);offset++) {
    const date=addDays(start,offset),week=Math.floor(offset/7),day=mondayIndex(date)
    const cap=weekCapability(p,week),remaining=daysBetween(date,last),taper=!foundation&&week>=weeks-(p.raceType==='marathon'?3:p.raceType==='half-marathon'?2:1)
    if(p.raceDate && date===p.raceDate) { out.push(runningSession(date,`${raceLabel(p.raceType)} event`,`${cap.raceKm} km. ${p.runGoalTimeMin ? `Goal ${cap.selectedGoalLabel}; ${formatPace(p.runGoalTimeMin*60/cap.raceKm)} is the required average, not a promise.` : 'Start controlled; finish comfortably.'}`,cap.raceKm*cap.targetPace/60,cap.raceKm,weightKg,'Event'));continue }
    const recentDays=p.runRecentDaysPerWeek
    const dayCount=recentDays!==undefined&&recentDays>0?Math.min(days.length,Math.max(2,recentDays+1+Math.floor(week/3))):days.length
    const priorityDays=[longDay,...(qualityDay!==undefined?[qualityDay]:[]),...days.filter(d=>d!==longDay&&d!==qualityDay)].slice(0,dayCount)
    if(!priorityDays.includes(day))continue
    if(p.raceDate && remaining<=2) { if(remaining===2)out.push(runningSession(date,'Easy Run · pre-race shakeout','15 min easy. Rest the day before your event.',15,15*60/cap.easyPace,weightKg,'Easy'));continue }
    const cutback=(week+1)%4===0
    const longKm=Math.min(peak,initial*Math.pow(1.08,Math.min(week,foundation?weeks-1:weeks-2)))*(cutback?.8:1)*(taper?.65:1)
    if(day===longDay) {
      const km=Math.round(longKm*10)/10,min=km*cap.easyPace/60
      out.push(runningSession(date,'Long Run',`${km} km conversational run/walk${p.runBenchmarkKnown?` · guide ${formatPace(cap.easyPace)}`:''}. Keep it easy; walk breaks are welcome.`,min,km,weightKg,'Easy','long'))
      out[out.length-1].runBrief={pace:cap.known?formatPace(cap.easyPace):'Conversational',steps:[{label:'Distance',value:`${km} km`},{label:'Effort',value:'Full sentences · walk breaks OK'}],note:taper?'Taper: shorter, not faster.':cutback?'Recovery week: reduce distance.':'Build endurance, not speed.'}
    } else if(day===qualityDay && !taper) {
      const q=qualityWorkout(p,week,cap);out.push(runningSession(date,q.title,q.detail,q.min,q.km,weightKg,q.zone))
      const parts=q.detail.split(' → ')
      out[out.length-1].runBrief={pace:q.zone==='Benchmark'?'Controlled timed run':q.zone==='Easy'?(cap.known?formatPace(cap.easyPace):'Conversational'):formatPace(q.title.includes('goal-pace')?cap.selectedGoalPace!:q.zone==='Tempo'?p.raceType==='marathon'?Math.max(cap.tempoPace,cap.targetPace):cap.tempoPace:p.raceType==='5k'?cap.intervalPace:cap.tempoPace),steps:parts.length===3?[{label:'Warm-up',value:`10 min easy · ${cap.known?formatPace(cap.easyPace):'talk pace'}`},{label:'Main set',value:parts[1].replace(/ \(.*?\)/g,'')},{label:'Cool-down',value:'10 min easy'}]:[{label:'Run',value:`${Math.round(q.min)} min easy`},{label:'Optional strides',value:'4 × 15 sec · 60–90 sec walking recovery'}],note:q.zone==='Benchmark'?'Enter this result below to recalibrate future weeks.':cap.assessment.difficulty==='unrealistic'?'Conditional pace target. Repeat the week if effort is too hard.':'Controlled effort. Slow down in heat or fatigue.'}
    } else {
      const min=Math.min(45,Math.max(15,initial*cap.easyPace/60*.55+(week*1.5)))*(taper?.7:cutback?.8:1)
      out.push(runningSession(date,'Easy Run',`${Math.round(min)} min at conversational effort${p.runBenchmarkKnown?` · guide ${formatPace(cap.easyPace)}`:''}. Finish feeling you could do more.`,min,min*60/cap.easyPace,weightKg,'Easy'))
      out[out.length-1].runBrief={pace:cap.known?formatPace(cap.easyPace):'Conversational',steps:[{label:'Run',value:`${Math.round(min)} min · ≈ ${(min*60/cap.easyPace).toFixed(1)} km`},{label:'Effort',value:'Full sentences · relaxed'}],note:'Keep easy days easy. Do not chase race pace.'}
    }
  }
  // Keep total volume grounded in the runner's recent weekly mileage.
  // Scale all session components together so totals and instructions agree.
  if(p.runWeeklyKm!==undefined&&Number.isFinite(p.runWeeklyKm)&&p.runWeeklyKm>=0)for(let week=0;week<weeks;week++) {
    const weekRuns=out.filter(s=>Math.floor(daysBetween(start,s.date)/7)===week&&s.zone!=='Event')
    const sum=weekRuns.reduce((n,s)=>n+(s.distanceKm??0),0)
    const feedback=[...(p.runWeekFeedback??[])].filter(f=>f.week<week).sort((a,b)=>b.week-a.week)[0]
    const baseWeeks=p.runExperience==='new'?4:p.runExperience==='returning'?3:2
    const progressionWeek=feedback&&feedback.response!=='comfortable'?Math.max(0,feedback.week):week
    const peakWeekly=p.raceType==='5k'?30:p.raceType==='10k'?40:p.raceType==='half-marathon'?55:75
    const availableDays=p.runRecentDaysPerWeek??trainingDays(p)
    const ramp=availableDays<trainingDays(p)?Math.min(1,.8+week*.05):1
    let budget=Math.min(peakWeekly,Math.max(3,p.runWeeklyKm)*Math.pow(p.runExperience==='new'?1.04:1.06,Math.max(0,progressionWeek-baseWeeks+1)))*ramp
    if((week+1)%4===0)budget*=.85
    if(feedback?.response==='hard')budget*=.85
    if(feedback?.response==='missed')budget*=.75
    const taperWeeks=p.raceType==='marathon'?3:p.raceType==='half-marathon'?2:1
    if(!foundation&&week>=weeks-taperWeeks)budget*=Math.max(.45,1-(week-(weeks-taperWeeks)+1)*.18)
    const quality=weekRuns.filter(s=>s.zone==='Tempo'||s.zone==='Intervals'||s.zone==='Benchmark')
    const qualityKm=quality.reduce((n,s)=>n+(s.distanceKm??0),0),easyRuns=weekRuns.filter(s=>!quality.includes(s))
    const keepQuality=quality.length>0&&budget>=qualityKm+easyRuns.length*1.5
    const scale=Math.min(1,(budget-(keepQuality?qualityKm:0))/Math.max(.1,sum-(keepQuality?qualityKm:0)))
    if(scale<.98)for(const s of keepQuality?easyRuns:weekRuns) {
      s.distanceKm=Math.round((s.distanceKm??0)*scale*100)/100;s.durationMin=Math.max(1,Math.round(s.durationMin*scale));s.kcal=Math.round(weightKg*(s.distanceKm??0)*1.03)
      const isLong=s.runKind==='long'
      s.title=isLong?(s.distanceKm<5?'Easy Run · longer base session':'Long Run'):'Easy Run · base-building';s.zone='Easy';s.runKind=isLong?'long':'easy'
      const cap=weekCapability(p,week)
      s.runBrief={pace:cap.known?formatPace(cap.easyPace):'Conversational',steps:[{label:'Run',value:`${s.durationMin} min · ≈ ${s.distanceKm} km`},{label:'Effort',value:'Full sentences · walk breaks OK'}],note:isLong?'Longest easy session this week. Starting mileage limits its distance.':'Build easy volume first; run/walk is welcome.'}
    }
  }
  // Expose a usable range for every scheduled run, including warm-up/recovery.
  // Widths are FitCore coaching heuristics, not physiological zone measurements.
  for(const session of out) {
    const week=Math.floor(daysBetween(start,session.date)/7),cap=weekCapability(p,week)
    if(!cap.known)continue
    const easy=formatPaceRange(cap.easyPace,30)
    if(!session.runBrief)session.runBrief={pace:session.zone==='Event'?formatPaceRange(cap.targetPace,10):easy,steps:[{label:'Distance',value:`${session.distanceKm} km`}],note:'Suggested range, not a performance guarantee.'}
    const brief=session.runBrief
    if(session.zone==='Benchmark')brief.pace=`Start near ${formatPaceRange(cap.assessment.benchmarkPace*Math.pow((cap.assessment.benchmarkKm<=10?cap.assessment.benchmarkKm:10)/cap.assessment.benchmarkKm,.06),15)}`
    else {
      const paceMatch=brief.pace.match(/^(\d+):(\d{2})\/km$/)
      if(paceMatch)brief.pace=formatPaceRange(Number(paceMatch[1])*60+Number(paceMatch[2]),session.zone==='Easy'?30:session.zone==='Tempo'?15:10)
    }
    brief.steps=brief.steps.map(step=>({...step,value:step.label==='Warm-up'||step.label==='Cool-down'?`10 min easy · ${easy}`:step.value.replace(/\d+:\d{2}\/km/g,brief.pace)}))
    if(session.zone==='Intervals'||session.zone==='Tempo')brief.steps.push({label:'Recovery pace',value:`${easy} · walking OK`})
    session.detail=`${brief.pace} · ${brief.steps.map(step=>`${step.label}: ${step.value}`).join(' · ')}. ${brief.note}`
  }
  return out
}
export function evaluateRunningPlan(p:UserProfile,sessions:PlanSession[]) {
  const longRuns=sessions.filter(s=>s.runKind==='long'||s.title==='Easy endurance run')
  const peak=longRuns.reduce((best,s)=>(s.distanceKm??0)>(best?.distanceKm??0)?s:best,undefined as PlanSession|undefined)
  const expectedPeak=p.raceType==='marathon'?28:p.raceType==='half-marathon'?16:p.raceType==='10k'?10:6
  const peakKm=peak?.distanceKm??0
  const minimumWeeks=minimumPlanWeeks(p),tooShort=planWeeks(p)<minimumWeeks
  const needsBase=Boolean(p.runBaseOnly||tooShort||assessRunning(p).capacityWarning||peakKm<expectedPeak)
  const missingLoad=p.runWeeklyKm===undefined||p.runRecentDaysPerWeek===undefined||!p.runExperience
  const reason=missingLoad?'Recent weekly mileage, frequency and experience are missing.':tooShort?`This profile needs at least ${minimumWeeks} weeks for the selected block.`:needsBase?`This block peaks at ${peakKm.toFixed(1)} km long. It does not yet support the app’s ${expectedPeak} km endurance preparation checkpoint for ${raceLabel(p.raceType)}.`:null
  return {needsBase,missingLoad,minimumWeeks,tooShort,peakKm,peakWeek:peak&&p.planStartDate?Math.floor(daysBetween(p.planStartDate,peak.date)/7)+1:null,expectedPeak,reason,
    status:missingLoad?'Incomplete runner profile':needsBase?'Base-building · not race-ready':'Race build · readiness still needs review'}
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
