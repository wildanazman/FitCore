import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const scratch = await mkdtemp(join(tmpdir(), 'fitcore-coach-check-'))
try {
  const output = join(scratch, 'coach.mjs')
  await build({ stdin: { contents: "export * from './src/lib/strengthCoach'; export * from './src/lib/activities'; export * from './src/lib/storage'; export * from './src/lib/backup';", resolveDir: process.cwd() }, outfile: output, bundle: true, platform: 'node', format: 'esm' })
  const { coachDay, validCoachDays, canUseEquipment, DEFAULT_PROFILE, emptyState, makeBackup, parseBackup } = await import(pathToFileURL(output).href)
  const date = '2026-10-12'
  const base = { ...DEFAULT_PROFILE, onboarded: true, age: 30, homeEquipment: [], strengthCoach: { gym: false, experience: 'new', days: [0,2,4], minutes: 45, focus: 'balanced', startDate: date, clearance: true } }
  assert.equal(coachDay(DEFAULT_PROFILE, date, []), null)
  assert.equal(coachDay({ ...base, age: 16 }, date, []), null)
  assert.equal(coachDay({ ...base, strengthCoach: { ...base.strengthCoach, clearance: false } }, date, []), null)
  assert.equal(validCoachDays([0,1]), false)
  assert.equal(validCoachDays([0,6]), false)
  assert.equal(validCoachDays([0,2,4]), true)
  assert.equal(validCoachDays([0,1,3,4]), true)
  for (const gear of [[], ['mat'], ['dumbbell'], ['mat','dumbbell'], ['bench','dumbbell'], ['mat','kettlebell'], ['mat','bench','dumbbell','kettlebell']]) {
    const p = { ...base, homeEquipment: gear }
    const plan = coachDay(p, date, [])
    assert.ok(plan.exercises.length >= 3)
    assert.ok(plan.exercises.every(e => canUseEquipment(e.item, gear)))
    assert.equal(new Set(plan.exercises.map(e => e.item.id)).size, plan.exercises.length)
    assert.ok(plan.exercises.every(e => e.sets === 2))
    assert.deepEqual(plan.exercises.map(e=>e.sets), coachDay(p,'2027-01-11',[]).exercises.map(e=>e.sets))
  }
  assert.equal(coachDay(base, '2026-10-13', []).rest, true)
  assert.equal(coachDay(base, '2026-09-28', []).rest, true)
  assert.equal(coachDay(base, '2026-09-28', []).nextDate, date)
  assert.equal(coachDay(base, coachDay(base, '2026-09-28', []).nextDate, []).rest, false)
  const gym = { ...base, strengthCoach: { ...base.strengthCoach, gym: true, days: [0,1,3,4], experience: 'regular', minutes: 60, focus: 'muscle' } }
  assert.equal(coachDay(gym,date,[]).title, 'Chest, back & shoulders')
  assert.equal(coachDay(gym,'2026-10-13',[]).title, 'Legs, glutes & core')
  assert.ok(coachDay(gym,date,[]).exercises.every(e => e.item.id.startsWith('gym_') && e.sets === 3))
  const e = coachDay(gym,date,[]).exercises[0]
  const completed = { id: 'test', date, completed: true, type:'strength', coachKey:e.key, strengthLog:{exerciseId:e.item.id,sets:[]} }
  assert.ok(coachDay(gym,date,[completed]).exercises[0].logged)
  assert.equal(coachDay(gym,date,[{...completed,completed:false}]).exercises[0].logged, undefined)
  assert.equal(coachDay(gym,date,[completed]).exercises[0].recent, undefined)
  assert.equal(coachDay({...base,strengthCoach:{...base.strengthCoach,startDate:'2026-99-99'}},date,[]),null)
  assert.equal(coachDay(base,'2026-99-99',[]),null)
  const state = { ...emptyState(), profile: gym }
  const restored = parseBackup(JSON.stringify(makeBackup(state,'blue')))
  assert.deepEqual(restored.state.profile.strengthCoach, gym.strengthCoach)
  const invalid = makeBackup(state,'blue'); invalid.state.profile = {...gym,strengthCoach:{...gym.strengthCoach,days:[0,1]}}
  assert.throws(()=>parseBackup(JSON.stringify(invalid)))
  console.log('Strength coach checks passed: equipment, schedule, recovery, volume, completion, invalid dates and backup round-trip.')
} finally {
  await rm(scratch, { recursive: true, force: true })
}
