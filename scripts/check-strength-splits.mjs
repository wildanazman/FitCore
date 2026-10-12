import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const temp=await mkdtemp(join(tmpdir(),'fitcore-splits-'))
try {
  const output=join(temp,'split.mjs')
  await build({stdin:{contents:"export * from './src/lib/strengthCoach';export * from './src/lib/storage';export * from './src/lib/backup';export * from './src/lib/activities';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:output})
  const {coachDay,coachSplit,validCoachDays,DEFAULT_PROFILE,emptyState,makeBackup,parseBackup,canUseEquipment}=await import(pathToFileURL(output).href)
  const base={...DEFAULT_PROFILE,onboarded:true,age:35,homeEquipment:['mat','dumbbell','bench'],strengthCoach:{gym:true,experience:'regular',focus:'muscle',split:'muscle-days',techniques:'auto',minutes:45,days:[0,2,4],clearance:true,startDate:'2026-10-12'}}
  for(const [days,labels] of [[[0,2,4],['Chest','Back','Legs']],[[0,1,3,5],['Chest','Back','Legs','Shoulder']],[[0,1,2,3,4],['Chest','Back','Legs','Upper','Lower']]]){
    const p={...base,strengthCoach:{...base.strengthCoach,days}}
    assert.equal(validCoachDays(days),true)
    assert.deepEqual(coachSplit(p).days.map(d=>d.short).sort(),labels.sort())
    for(const day of coachSplit(p).days){
      const date=`2026-10-${12+day.day}`,plan=coachDay(p,date,[])
      assert.equal(plan.shortTitle,day.short)
      assert.ok(plan.exercises.length>=3)
      assert.ok(plan.exercises.every(e=>e.sets>=2&&e.sets<=4))
      assert.equal(new Set(plan.exercises.map(e=>e.item.id)).size,plan.exercises.length)
      assert.ok(plan.estimatedMinutes<=45)
      assert.ok(plan.supersetPairs.every(pair=>plan.exercises.some(e=>e.item.id===pair.first)&&plan.exercises.some(e=>e.item.id===pair.second)))
    }
    const backup=makeBackup({...emptyState(),profile:p},'blue');assert.deepEqual(parseBackup(JSON.stringify(backup)).state.profile.strengthCoach,p.strengthCoach)
  }
  assert.equal(validCoachDays([0,1,2,3,4,5]),false)
  assert.equal(validCoachDays([0,0,2]),false)
  assert.equal(validCoachDays([0,1,2],'balanced'),false)
  for(const equipment of [[],['mat'],['dumbbell'],['mat','dumbbell'],['mat','bench','dumbbell'],['mat','kettlebell']]){
    const p={...base,homeEquipment:equipment,strengthCoach:{...base.strengthCoach,gym:false}}
    for(const day of [12,14,16])assert.ok(coachDay(p,`2026-10-${day}`,[]).exercises.every(e=>canUseEquipment(e.item,equipment)))
  }
  const beginner={...base,strengthCoach:{...base.strengthCoach,experience:'new',minutes:60}}
  assert.equal(coachDay(beginner,'2026-10-12',[]).supersetPairs.length,0)
  assert.equal(coachDay(beginner,'2026-10-12',[]).dropSetExercise,null)
  assert.ok(coachDay(beginner,'2026-10-12',[]).exercises.every(e=>e.sets===2))
  const experienced={...base,strengthCoach:{...base.strengthCoach,minutes:60}}
  const heavy=coachDay(experienced,'2026-10-12',[])
  assert.ok(heavy.exercises.some(e=>e.sets===4));assert.ok(['gym_pec_deck','gym_triceps_pushdown'].includes(heavy.dropSetExercise))
  const straight=coachDay({...experienced,strengthCoach:{...experienced.strengthCoach,techniques:'straight'}},'2026-10-12',[])
  assert.equal(straight.dropSetExercise,null);assert.equal(straight.supersetPairs.length,0)
  const run={id:'r',date:'2026-10-12',type:'run',runKind:'interval',title:'Intervals',completed:false}
  assert.equal(coachDay(experienced,'2026-10-12',[run]).dropSetExercise,null)
  const SundayMonday={...base,strengthCoach:{...base.strengthCoach,days:[0,1,3,4,6]}}
  const split=coachSplit(SundayMonday)
  for(let i=0;i<split.days.length;i++)for(let j=i+1;j<split.days.length;j++){
    const a=split.days[i],b=split.days[j],gap=Math.min(Math.abs(a.day-b.day),7-Math.abs(a.day-b.day))
    if(a.muscles.some(m=>b.muscles.includes(m)))assert.ok(gap>=2||split.tightRecovery)
  }
  console.log('PASS: 3/4/5-day muscle splits, actual dates, weekly boundary spacing, equipment, volume/time budget, advanced-technique gates, five-day backup')
}finally{await rm(temp,{recursive:true,force:true})}
