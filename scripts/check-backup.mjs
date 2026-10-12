import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const temp=await mkdtemp(join(tmpdir(),'fitcore-backup-check-'))
try {
const output=join(temp,'backup.mjs')
await build({stdin:{contents:"export * from './src/lib/backup';export * from './src/lib/storage';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:output})
const exports=await import(pathToFileURL(output).href)
const defaults=exports.DEFAULT_PROFILE
const state={v:exports.STATE_VERSION,profile:{...defaults,name:'Backup test',onboarded:true,anthropicApiKey:'DO_NOT_EXPORT'},foods:[{id:'f',date:'2026-10-08',name:'Rice',emoji:'',loggedAt:'2026-10-08T12:00:00',slot:'lunch',kcal:200,protein:4,carbs:44,fat:1,servings:1,confidence:.8}],weights:[{id:'w',date:'2026-10-08',weightKg:70}],photos:[{id:'p',date:'2026-10-08',dataUrl:'data:image/jpeg;base64,AA=='}],sessions:[],dietTasks:[],streakMilestonesSeen:[3]}
const backup=exports.makeBackup(state,'volt')
assert.equal(backup.state.profile.anthropicApiKey,'')
assert.equal(state.profile.anthropicApiKey,'DO_NOT_EXPORT')
const restored=exports.parseBackup(JSON.stringify(backup))
assert.deepEqual(restored.state,backup.state)
assert.equal(restored.theme,'volt')
for(const mutation of [b=>b.version=99,b=>b.state.foods[0].kcal='bad',b=>b.state.weights[0].weightKg=-1,b=>b.state.photos[0].dataUrl='javascript:bad',b=>b.state.profile.wearables=null,b=>b.state.profile.units='bad',b=>b.state.foods.push({...b.state.foods[0]})]){const changed=structuredClone(backup);mutation(changed);assert.throws(()=>exports.parseBackup(JSON.stringify(changed)))}
assert.throws(()=>exports.parseBackup('not json'))
assert.throws(()=>exports.parseBackup('{"format":"fitcore-backup","__proto__":{}}'))
console.log('Backup round-trip, secret exclusion and invalid-file checks passed.')
} finally { await rm(temp,{recursive:true,force:true}) }
