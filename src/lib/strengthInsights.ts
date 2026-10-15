import type { PlanSession, UserProfile } from '../types'
import { ACTIVITIES, activityTracking, type MuscleGroup } from './activities'
import { addDays, startOfWeek } from './date'
import { coachDay } from './strengthCoach'

/** Evidence-informed decision support, not inferred fitness or automatic load increases. */
export function liftNextStep(id: string, date: string, sessions: PlanSession[], plannedSets: number, focus: string, feedback: UserProfile['strengthFeedback'] = []) {
  const low = focus === 'muscle' ? 8 : 10, high = focus === 'muscle' ? 12 : 15
  const seen = new Set<string>()
  const history = sessions.filter(s => s.completed && s.date < date && s.strengthLog?.exerciseId === id && s.strengthLog.sets.length > 0)
    .sort((a,b) => b.date.localeCompare(a.date) || (b.loggedAt ?? '').localeCompare(a.loggedAt ?? ''))
    .filter(s => { if (seen.has(s.date)) return false; seen.add(s.date); return true })
  const recent = history[0]?.strengthLog
  const checkIn=feedback?.filter(f=>f.date<date&&f.exerciseIds.includes(id)).sort((a,b)=>b.date.localeCompare(a.date))[0]
  if(checkIn?.pain) return {title:'Review pain before progressing',detail:'Pain was reported in a session containing this exercise. Do not progress or push through it. Stop painful movements and seek appropriate professional guidance for persistent or recurring pain. This app cannot assess recovery.',history,low,high}
  if(checkIn?.effort==='hard' && (!history[0] || checkIn.date>=history[0].date)) return {title:'Hold or reduce, not more kg',detail:'Your latest comparable session felt too hard. Repeat a manageable load or reduce it; use fewer working sets if needed. Keep technique controlled before building back up.',history,low,high}
  const activity = ACTIVITIES.find(item=>item.id===id)
  if (activity && activityTracking(activity)==='hold') return { title: 'Build a controlled hold', detail: 'Use the listed hold duration, not a rep target. End the set before your position breaks down; longer holds are optional only with good control.', history, low, high }
  if (!recent) return { title: 'Find your starting load', detail: `Start light. Aim for ${low}–${high} controlled reps with 2–3 reps left in reserve.`, history, low, high }
  if (recent.mode === 'hold') return { title: 'Repeat a controlled hold', detail: 'Use the listed hold range. Stop before your position breaks down; seconds alone do not prove better technique.', history, low, high }
  const lastWeight = recent.sets[0].weightKg
  const same = (log: NonNullable<PlanSession['strengthLog']>) => log.mode === 'reps' && log.implementCount === recent.implementCount && log.calorieEstimate?.sides === recent.calorieEstimate?.sides && log.sets.length >= plannedSets && log.sets.every(s => Number.isFinite(s.weightKg) && s.weightKg === lastWeight && s.reps >= high + 1)
  const eligible = lastWeight > 0 && history.length >= 2 && same(recent) && same(history[1].strengthLog!)
  if (eligible) return { title: 'Consider a small load increase', detail: 'Two logged sessions exceeded the rep range at the same load. Only if form stayed controlled and you had reps in reserve, try the smallest available increase (about 2–5%). Return to the lower rep range. Otherwise repeat.', history, low, high }
  return { title: 'Build reps before load', detail: `Repeat a manageable load and work toward ${high} reps in each working set. If the last session felt too hard or form broke down, reduce the load.`, history, low, high }
}

export function strengthWeek(profile: UserProfile, date: string, sessions: PlanSession[]) {
  const start = startOfWeek(date)
  const days = Array.from({length:7},(_,i) => { const day = addDays(start,i); return {date:day, plan:coachDay(profile,day,sessions)} })
  const groups: MuscleGroup[] = ['chest','back','legs','shoulders','arms','abs']
  const coverage = groups.map(group => {
    const exposures = days.map(day => day.plan?.exercises.filter(e => e.item.muscles?.includes(group)) ?? [])
    const logged = sessions.filter(s => s.completed && s.date >= start && s.date <= addDays(start,6) && s.strengthLog && ACTIVITIES.find(a=>a.id===s.strengthLog!.exerciseId)?.muscles?.includes(group))
    return {group, days:exposures.filter(e=>e.length).length, planned:exposures.flat().reduce((n,e)=>n+e.sets,0), logged:logged.reduce((n,s)=>n+s.strengthLog!.sets.length,0)}
  })
  return { start, days, coverage, planned:days.filter(d=>d.plan&&!d.plan.rest).length, completed:days.filter(d=>d.plan&&!d.plan.rest&&(d.plan.quickComplete||d.plan.exercises.every(e=>e.logged))).length }
}
