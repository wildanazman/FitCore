import fs from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
const storage=fs.readFileSync('src/lib/storage.ts','utf8')
const profileText=storage.match(/export const DEFAULT_PROFILE: UserProfile = (\{[\s\S]*?\n\})/)[1]
const defaults=Function(`return (${profileText})`)()
const source=fs.readFileSync('src/lib/backup.ts','utf8').replace(/^import .*\n/gm,'')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
const exports={};Function('exports','DEFAULT_PROFILE','STATE_VERSION',js)(exports,defaults,1)
const state={v:1,profile:{...defaults,name:'Backup test',onboarded:true,anthropicApiKey:'DO_NOT_EXPORT'},foods:[{id:'f',date:'2026-10-08',name:'Rice',emoji:'',loggedAt:'2026-10-08T12:00:00',slot:'lunch',kcal:200,protein:4,carbs:44,fat:1,servings:1,confidence:.8}],weights:[{id:'w',date:'2026-10-08',weightKg:70}],photos:[{id:'p',date:'2026-10-08',dataUrl:'data:image/jpeg;base64,AA=='}],sessions:[],dietTasks:[],streakMilestonesSeen:[3]}
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
