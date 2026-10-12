import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import handler from '../api/cloud-backup.js'
import { validateCloudBackup, cloudOwner, CLOUD_LIMIT } from '../server/cloud-backup.js'
const backup={format:'fitcore-backup',version:1,state:{profile:{onboarded:true,anthropicApiKey:''},foods:[],weights:[],sessions:[],photos:[],dietTasks:[]}}
assert.equal(cloudOwner({id:'123'}),'google:123')
assert.throws(()=>cloudOwner({id:'bad&owner_id=eq.456'}))
assert.equal(validateCloudBackup({backup,expectedVersion:0}).expectedVersion,0)
assert.throws(()=>validateCloudBackup({backup,expectedVersion:-1}))
assert.throws(()=>validateCloudBackup({backup:{...backup,state:{...backup.state,profile:{onboarded:true,anthropicApiKey:'secret'}}},expectedVersion:0}))
assert.throws(()=>validateCloudBackup('x'.repeat(CLOUD_LIMIT+1)))
assert.throws(()=>validateCloudBackup('{"expectedVersion":0,"backup":{"format":"fitcore-backup","version":1,"state":{"profile":{"onboarded":true},"foods":[],"weights":[],"sessions":[],"photos":[],"dietTasks":[],"__proto__":{}}}}'))
process.env.SUPABASE_URL='https://testproject.supabase.co'
process.env.SUPABASE_SECRET_KEY='test-only-never-live'
process.env.UPSTASH_REDIS_REST_URL='https://redis.test'
process.env.UPSTASH_REDIS_REST_TOKEN='test-only'
const original=globalThis.fetch
let mode='ok',calls=[]
globalThis.fetch=async(url,options={})=>{
  calls.push({url,options})
  let value
  if(url==='https://redis.test'){
    const command=JSON.parse(options.body)
    value={result:command[0]==='GET'?JSON.stringify({id:'123',email:'test@example.com',expiresAt:Date.now()+60000}):command[0]==='INCR'?(mode==='rate'?21:1):1}
  }else if(url.includes('/rpc/')){
    if(mode==='conflict')return {ok:false,json:async()=>({code:'P0001'})}
    const value=JSON.parse(options.body);assert.equal(value.p_owner,'google:123');assert.equal(value.p_expected,0)
    return {ok:true,json:async()=>[{version:1,updated_at:'2026-10-12T00:00:00Z',bytes:123}]}
  }else{assert.ok(url.includes('owner_id=eq.google%3A123'));value=[]}
  return {ok:true,json:async()=>value}
}
async function run(method,headers={},body){
  const res={headers:{},setHeader(k,v){this.headers[k]=v},end(text){this.body=JSON.parse(text)}}
  await handler({method,url:'/api/cloud-backup',headers:{cookie:`__Host-fitcore_session=${'a'.repeat(64)}`,origin:'https://fit-core-five.vercel.app',...headers},body},res)
  return res
}
try{
  assert.equal((await run('GET',{cookie:''})).statusCode,401)
  assert.equal((await run('GET',{origin:'https://attacker.test'})).statusCode,403)
  assert.equal((await run('DELETE')).statusCode,405)
  const get=await run('GET');assert.equal(get.statusCode,200);assert.equal(get.body.backup,null)
  assert.equal((await run('PUT',{},{})).statusCode,415)
  const upload={backup,expectedVersion:0,owner:'google:456'}
  assert.equal((await run('PUT',{'content-type':'application/json'},upload)).statusCode,200)
  mode='conflict';assert.equal((await run('PUT',{'content-type':'application/json'},upload)).statusCode,409)
  mode='rate';calls=[];assert.equal((await run('PUT',{'content-type':'application/json'},upload)).statusCode,429);assert.ok(!calls.some(call=>call.url.includes('/rpc/')))
  const sql=await readFile('supabase/migrations/202610120001_cloud_backups.sql','utf8')
  assert.ok(sql.includes('enable row level security'));assert.ok(sql.includes('from public, anon, authenticated'))
  console.log('PASS cloud backup: identity isolation, credentials exclusion, size limits, authentication, origins, conflict checks, rate limits and restricted schema. All network calls mocked; no user data uploaded.')
}finally{globalThis.fetch=original}
