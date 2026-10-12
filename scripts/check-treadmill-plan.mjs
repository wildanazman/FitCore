import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'fitcore-cardio-check-'))
try{
const output=join(dir,'plan.mjs')
await build({stdin:{contents:"export * from './src/lib/strengthCoach';export * from './src/lib/storage';export * from './src/lib/backup';export * from './src/lib/strengthEnergy';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:output})
const {coachDay,DEFAULT_PROFILE,emptyState,makeBackup,parseBackup,estimateStrengthEnergy}=await import(pathToFileURL(output).href)
const profile={...DEFAULT_PROFILE,onboarded:true,strengthCoach:{gym:true,experience:'regular',days:[0,2,4],minutes:45,focus:'muscle',clearance:true,startDate:'2026-10-12',treadmill:{mode:'walk',minutes:15,days:[0,1]}}}
const monday=coachDay(profile,'2026-10-12',[]),tuesday=coachDay(profile,'2026-10-13',[])
assert.equal(monday.cardio.item.id,'treadmill_walk');assert.equal(monday.cardio.minutes,15)
assert.equal(tuesday.rest,true);assert.equal(tuesday.shortTitle,'Cardio');assert.equal(tuesday.completed,false)
const treadmillLog={id:'test',date:'2026-10-13',completed:true,type:'sport',coachKey:'2026-10-13:treadmill_walk'}
assert.equal(coachDay(profile,'2026-10-13',[treadmillLog]).completed,true)
assert.equal(coachDay(profile,'2026-10-13',[{...treadmillLog,coachKey:'another'}]).completed,false)
assert.equal(coachDay(profile,'2026-10-14',[]).cardio,null)
assert.equal(coachDay({...profile,strengthCoach:{...profile.strengthCoach,gym:false}},'2026-10-13',[]).cardio,null)
assert.deepEqual(parseBackup(JSON.stringify(makeBackup({...emptyState(),profile},'classic'))).state.profile.strengthCoach.treadmill,profile.strengthCoach.treadmill)
const invalid=makeBackup({...emptyState(),profile},'classic');invalid.state.profile.strengthCoach.treadmill.days=[];assert.throws(()=>parseBackup(JSON.stringify(invalid)))
const input={bodyWeightKg:70,sets:[{reps:10,holdSeconds:0},{reps:10,holdSeconds:0}],mode:'reps',tempoSeconds:3,restSeconds:60,sides:1,effort:'moderate'}
const base=estimateStrengthEnergy(input)
assert.ok(estimateStrengthEnergy({...input,sets:[...input.sets,{reps:10,holdSeconds:0}]}).kcal>base.kcal)
assert.ok(estimateStrengthEnergy({...input,bodyWeightKg:90}).kcal>base.kcal)
assert.ok(estimateStrengthEnergy({...input,effort:'hard'}).kcal>base.kcal)
assert.equal(estimateStrengthEnergy({...input,kind:'compound'}).met,5)
assert.equal(estimateStrengthEnergy({...input,kind:'hold'}).met,2.8)
console.log('PASS treadmill schedule, completion isolation, rest days, gym-only settings, backup and live strength-energy inputs. No user records changed.')
}finally{await rm(dir,{recursive:true,force:true})}
