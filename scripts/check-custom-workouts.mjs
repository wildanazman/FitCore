import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'fitcore-custom-workouts-'))
try{
  const path=join(dir,'test.mjs')
  await build({stdin:{contents:"export * from './src/lib/strengthCoach';export * from './src/lib/activities';export * from './src/lib/storage';export * from './src/lib/backup';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:path})
  const {coachDay,DEFAULT_PROFILE,ACTIVITIES,makeBackup,parseBackup,emptyState,activityTracking}=await import(pathToFileURL(path).href)
  const profile={...DEFAULT_PROFILE,onboarded:true,strengthCoach:{gym:true,experience:'regular',days:[0,2,4],minutes:60,focus:'muscle',clearance:true,startDate:'2026-10-12'},strengthWorkouts:{'2026-10-12':['deadlift','bench_press','gym_barbell_row']}}
  const oldLog={id:'logged',date:'2026-10-12',completed:true,strengthLog:{exerciseId:'deadlift',sets:[{reps:5,weightKg:80}]}}
  const logs=[oldLog],before=JSON.stringify(logs)
  const plan=coachDay(profile,'2026-10-12',logs)
  assert.deepEqual(plan.exercises.map(e=>e.item.id),['deadlift','bench_press','gym_barbell_row'])
  assert.equal(plan.exercises[0].logged,oldLog);assert.equal(JSON.stringify(logs),before)
  assert.equal(plan.customized,true);assert.equal(plan.dropSetExercise,null);assert.deepEqual(plan.supersetPairs,[])
  assert.equal(coachDay(profile,'2026-10-14',[]).customized,false)
  assert.equal(coachDay({...profile,strengthWorkouts:{'2026-10-13':['gym_front_squat']}},'2026-10-13',[]).rest,false)
  assert.equal(coachDay({...profile,strengthWorkouts:{'2026-10-12':[]}},'2026-10-12',[]).rest,true)
  assert.equal(coachDay({...profile,strengthCoach:{...profile.strengthCoach,gym:false},homeEquipment:[]},'2026-10-12',[]).exercises.length,0)
  for(const id of ['deadlift','gym_sumo_deadlift','gym_trap_deadlift','gym_front_squat','gym_barbell_overhead','gym_barbell_curl']){
    const item=ACTIVITIES.find(a=>a.id===id);assert.ok(item);assert.equal(activityTracking(item),'reps');assert.ok(item.load)
  }
  const backup=makeBackup({...emptyState(),profile},'classic')
  assert.deepEqual(parseBackup(JSON.stringify(backup)).state.profile.strengthWorkouts,profile.strengthWorkouts)
  const invalid=structuredClone(backup);invalid.state.profile.strengthWorkouts['2026-02-31']=['deadlift'];assert.throws(()=>parseBackup(JSON.stringify(invalid)))
  console.log(`PASS workout customization: order, additions, rest-day workout, empty recovery day, equipment guard, existing logs, barbell tracking and backup. ${ACTIVITIES.filter(a=>a.category==='gym'&&a.type==='strength').length} gym strength choices.`)
}finally{await rm(dir,{recursive:true,force:true})}
