import type { PlanSession } from '../types'
/** Compact display name only. Scheduling still uses structured runKind. */
export function coachRunLabel(run:PlanSession) {
  if(run.title.startsWith('Fartlek'))return 'Fartlek run'
  if(run.title.startsWith('Race Pace'))return 'Race-pace run'
  if(run.runKind==='event')return run.title
  if(run.runKind==='long')return run.distanceKm!==undefined&&run.distanceKm<5?'Longer easy run':'Long run'
  if(run.runKind==='interval')return 'Interval run'
  if(run.runKind==='tempo')return 'Tempo run'
  if(run.runKind==='benchmark')return 'Benchmark run'
  return run.title.startsWith('Recovery')?'Recovery run':'Easy run'
}
