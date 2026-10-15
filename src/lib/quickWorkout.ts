import type { PlanSession } from '../types'
import { isLogDate, timestampOnDate } from './date'
export const quickWorkoutKey = (date:string) => `${date}:strength-day-complete`
export function setQuickWorkout(sessions:PlanSession[],date:string,title:string,done:boolean):PlanSession[] {
  if(!isLogDate(date)) throw new Error('Choose today or a past date.')
  const key=quickWorkoutKey(date)
  if(done&&sessions.some(s=>s.coachKey===key&&s.completionOnly&&s.completed))return sessions
  const remaining=sessions.filter(s=>!(s.coachKey===key&&s.completionOnly))
  if(!done)return remaining
  return [...remaining,{id:`quick-strength-${date}`,coachKey:key,completionOnly:true,date,loggedAt:timestampOnDate(date),type:'strength',title:`${title} · completed`,detail:'Completion check-in only. Sets, load, duration and calories were not recorded.',durationMin:0,kcal:0,completed:true,plan:'manual',icon:'check_circle',manual:true}]
}
