import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'fitcore-workout-check-'))
try {
  const output=join(dir,'energy.mjs')
  await build({entryPoints:['src/lib/strengthEnergy.ts'],outfile:output,bundle:true,platform:'node',format:'esm'})
  const {estimateStrengthEnergy:estimate}=await import(pathToFileURL(output).href)
  const input={bodyWeightKg:70,sets:[{reps:12,holdSeconds:0},{reps:12,holdSeconds:0}],mode:'reps',tempoSeconds:3,restSeconds:120,sides:1,effort:'moderate'}
  const two=estimate(input), three=estimate({...input,sets:[...input.sets,input.sets[0]]})
  assert.equal(two.durationMin,3.2)
  assert.equal(three.durationMin,5.8)
  assert.ok(three.kcal>two.kcal)
  assert.equal(estimate({...input,actualMinutes:6}).kcal,18)
  assert.equal(estimate({...input,actualMinutes:6,effort:'hard'}).kcal,37)
  // Actual time supersedes inferred time; don't add rest a second time.
  assert.equal(estimate({...input,actualMinutes:6,restSeconds:600}).kcal,18)
  assert.equal(estimate({...input,actualMinutes:6}).durationMin,6)
  assert.equal(estimate({...input,actualMinutes:6,bodyWeightKg:140}).kcal,37)
  const clockOutput=join(dir,'clock.mjs')
  await build({entryPoints:['src/lib/workoutClock.ts'],outfile:clockOutput,bundle:true,platform:'node',format:'esm'})
  const {elapsedWorkoutMs,workoutTime}=await import(pathToFileURL(clockOutput).href)
  assert.equal(elapsedWorkoutMs(2000,10000,15000),7000)
  assert.equal(elapsedWorkoutMs(7000,null,99999),7000)
  assert.equal(elapsedWorkoutMs(7000,99999,102999),10000)
  assert.equal(elapsedWorkoutMs(0,50000,40000),0)
  assert.equal(workoutTime(125.9),'02:05')
  assert.equal(workoutTime(-20),'00:00')
  console.log('PASS actual duration, 2→3 sets, effort/body mass, and no duplicate rest energy.')
}finally{await rm(dir,{recursive:true,force:true})}
