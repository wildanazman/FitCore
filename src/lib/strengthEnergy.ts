// Heuristic, not a validated per-exercise calorimeter. MET references:
// https://pacompendium.com/conditioning-exercise/
// Work uses generic resistance effort; rest is an explicit 1.3-MET assumption.
// External kg is recorded as lifting volume, never converted directly into kcal.
export function estimateStrengthEnergy({ bodyWeightKg, sets, mode, tempoSeconds, restSeconds, sides, effort, kind = 'resistance' }: {
  bodyWeightKg: number
  sets: { reps: number; holdSeconds: number }[]
  mode: 'reps' | 'hold'
  tempoSeconds: number
  restSeconds: number
  sides: number
  effort: 'moderate' | 'hard'
  kind?: 'resistance' | 'compound' | 'bodyweight' | 'hold' | 'kettlebell-swing'
}) {
  const workSeconds = sets.reduce((sum, set) => sum + (mode === 'hold' ? set.holdSeconds : set.reps * tempoSeconds) * sides, 0)
  const betweenSetSeconds = Math.max(0, sets.length - 1) * restSeconds
  const met = kind==='kettlebell-swing'?9.8:kind==='hold'?2.8:kind==='bodyweight'?(effort==='hard'?6.5:3):effort==='hard'?6:kind==='compound'?5:3.5
  // Net/active energy excludes the resting 1 MET already in daily maintenance.
  const factor = 3.5 * bodyWeightKg / 200 / 60
  const rawKcal = ((met - 1) * workSeconds + 0.3 * betweenSetSeconds) * factor
  return { kcal: Math.round(rawKcal), durationMin: (workSeconds + betweenSetSeconds) / 60, workSeconds, restSeconds: betweenSetSeconds, met }
}
