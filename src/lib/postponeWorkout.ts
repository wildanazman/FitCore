import type { PlanSession, UserProfile } from '../types'
import { addDays, parseISO, todayISO } from './date'
import { coachDay } from './strengthCoach'

/** Move pending prescriptions, never logs or the recurring weekday schedule. */
export function postponeWorkout(profile:UserProfile,source:string,target:string,sessions:PlanSession[],today=todayISO()):{profile:UserProfile;error?:never}|{error:string;profile?:never}{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(target)||todayISO(parseISO(target))!==target||target<=source||target<today||target>addDays(source,21))return {error:'Choose a later date within the next 21 days.'}
  const from=coachDay(profile,source,sessions),to=coachDay(profile,target,sessions)
  if(!from||from.completed)return {error:'There is no unfinished workout to move.'}
  if(!to||to.exercises.length||to.cardio||to.quickComplete||sessions.some(s=>s.date===target&&(s.type==='strength'||s.type==='run')))return {error:'That day already has a workout. Choose a recovery day instead; nothing has been changed.'}
  const pending=from.exercises.filter(e=>!e.logged)
  const cardio=from.cardio&&!from.cardio.logged?from.cardio:null
  if(!pending.length&&!cardio)return {error:'There is no unfinished workout to move.'}
  const settings=profile.strengthDaySettings?.[source]??{}
  const moved={...settings,swaps:undefined,postponedTo:undefined,movedFrom:source,templateDate:settings.templateDate??source,title:from.title,
    prescriptions:Object.fromEntries(pending.map(e=>[e.item.id,{sets:e.sets,reps:e.reps,rest:e.rest}])),
    skipCardio:!cardio,cardio:cardio?{mode:cardio.item.id==='treadmill_run'?'run' as const:'walk' as const,minutes:cardio.minutes}:undefined}
  return {profile:{...profile,strengthWorkouts:{...profile.strengthWorkouts,[source]:from.exercises.filter(e=>e.logged).map(e=>e.item.id),[target]:pending.map(e=>e.item.id)},
    strengthDaySettings:{...profile.strengthDaySettings,[source]:{...settings,postponedTo:target,skipCardio:true},[target]:moved}}}
}
