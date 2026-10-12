import model from '../../data/coach-research/models/strength-progress-ridge.json'
import { daysBetween, isLogDate } from './date'

export type ProgressMachine = 1001 | 3001 | 5001
export type MachineObservation = { date: string; loadKg: number; durationSeconds: number }
export type ProgressInput = {
  age: number; sex: 'male' | 'female'; machine: ProgressMachine
  studyProtocol: boolean; observations: MachineObservation[]
  historyCount: number; firstDate: string
}
export const PROGRESS_MACHINES = [{ code: 1001, name: 'Leg press' }, { code: 3001, name: 'Chest press' }, { code: 5001, name: 'Lat pulldown' }] as const

/** Experimental observed-load forecast. Never returned as a prescribed weight. */
export function strengthProgress(input: ProgressInput): { error: string } | { changePercent: number; typicalError: number } {
  if (!input.studyProtocol) return { error: 'This model only covers supervised, slow, single-set machine training. It does not cover ordinary multi-set or home workouts.' }
  if (!Number.isFinite(input.age) || input.age < 18 || input.age > 90 || !['male', 'female'].includes(input.sex)) return { error: 'This experiment needs an adult profile aged 18–90 with sex recorded.' }
  if (!PROGRESS_MACHINES.some(m => m.code === input.machine)) return { error: 'Choose one of the three supported machines.' }
  if (input.observations.length !== 3 || !Number.isInteger(input.historyCount) || input.historyCount < 3 || input.historyCount > 372) return { error: 'Enter three recent observations and your total sessions on this machine (3–372).' }
  const cap = input.machine === 1001 ? 200 : 116
  for (const row of input.observations) {
    if (!isLogDate(row.date) || !Number.isFinite(row.loadKg) || row.loadKg <= 0 || row.loadKg > cap || (input.machine !== 1001 && row.loadKg === cap)
      || !Number.isFinite(row.durationSeconds) || row.durationSeconds < 10 || row.durationSeconds > 300) return { error: `Enter real past dates, a supported machine load (${input.machine === 1001 ? 'up to 200' : 'below 116'} kg), and measured set durations of 10–300 seconds.` }
  }
  const [oldest, previous, current] = input.observations
  const gap = daysBetween(previous.date, current.date), priorGap = daysBetween(oldest.date, previous.date)
  if (gap < 1 || gap > 21 || priorGap < 1 || priorGap > 21) return { error: 'Put the sessions in date order, 1–21 days apart. Longer breaks are outside this forecast.' }
  if (!isLogDate(input.firstDate) || input.firstDate > oldest.date || (input.historyCount === 3 && input.firstDate !== oldest.date)) return { error: 'Enter when your training on this machine began. For three total sessions, use the oldest observation date.' }
  const elapsed = daysBetween(input.firstDate, current.date)
  if (elapsed > 2464 || elapsed < input.historyCount - 1) return { error: 'Training history is inconsistent or outside the study duration.' }
  const trend = 100 * (current.loadKg / previous.loadKg - 1)
  const trend2 = 100 * (previous.loadKg / oldest.loadKg - 1)
  const values: Record<string, number> = {
    age: input.age, female: Number(input.sex === 'female'), log_load: Math.log(current.loadKg),
    exerciseDuration: current.durationSeconds, previous_duration: previous.durationSeconds,
    duration_over_120: Math.max(current.durationSeconds - 120, 0), duration_under_90: Math.max(90 - current.durationSeconds, 0),
    gap_days: gap, trend, trend2, trend_mean: (trend + trend2) / 2,
    log_history: Math.log1p(input.historyCount), log_elapsed: Math.log1p(elapsed),
  }
  for (const { code } of PROGRESS_MACHINES) {
    values[`machine_${code}`] = Number(code === input.machine)
    values[`duration_machine_${code}`] = current.durationSeconds * Number(code === input.machine)
  }
  const changePercent = model.features.reduce((sum, key, index) => sum + ((values[key] - model.mean[index]) / model.scale[index]) * model.coefficients[index], model.intercept)
  if (!Number.isFinite(changePercent)) return { error: 'These observations cannot produce a valid forecast.' }
  // Test MAE in percentage points. Not a confidence interval or safe increase limit.
  return { changePercent, typicalError: 1.7245885909062013 }
}
