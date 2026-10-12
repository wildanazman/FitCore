// Heuristic, not a validated per-exercise calorimeter. MET references:
// https://pacompendium.com/conditioning-exercise/
// Category-average MET applied to the exercise block including between-set rests.
// External kg is recorded as lifting volume, never converted directly into kcal.
export function estimateStrengthEnergy({ bodyWeightKg, sets, mode, tempoSeconds, restSeconds, sides, effort, kind = 'resistance', actualMinutes }: {
  bodyWeightKg: number
  sets: { reps: number; holdSeconds: number }[]
  mode: 'reps' | 'hold'
  tempoSeconds: number
  restSeconds: number
  sides: number
  effort: 'moderate' | 'hard'
  actualMinutes?: number
  kind?: 'resistance' | 'compound' | 'bodyweight' | 'hold' | 'kettlebell-swing'
}) {
  const workSeconds = sets.reduce((sum, set) => sum + (mode === 'hold' ? set.holdSeconds : set.reps * tempoSeconds) * sides, 0)
  const betweenSetSeconds = Math.max(0, sets.length - 1) * restSeconds
  const met = kind==='kettlebell-swing'?9.8:kind==='hold'?2.8:kind==='bodyweight'?(effort==='hard'?6.5:3):effort==='hard'?6:kind==='compound'?5:3.5
  // Net/active energy excludes the resting 1 MET already in daily maintenance.
  const factor = 3.5 * bodyWeightKg / 200 / 60
  // Compendium resistance METs describe a training period, not kcal per rep.
  // Use the exercise block (sets + between-set rests); never add rest again.
  const durationMin = actualMinutes ?? (workSeconds + betweenSetSeconds) / 60
  const rawKcal = (met - 1) * durationMin * 60 * factor
  return { kcal: Math.round(rawKcal), durationMin, workSeconds, restSeconds: betweenSetSeconds, met }
}
