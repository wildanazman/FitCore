import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import handler, { rankOSM, distanceKm } from '../api/nearby-restaurants.js'
const opts = { radiusKm:5 }
const center = { latitude:3.15, longitude:101.7 }
const place = (id, extra={}) => ({ id:Number(id), type:'node', lat:center.latitude+Number(id)*.0001, lon:center.longitude, tags:{name:`Synthetic test restaurant ${id}`,amenity:'restaurant','addr:street':'Test fixture address'}, ...extra })
assert.equal(distanceKm(center,center),0)
assert.deepEqual(rankOSM([place(1),place(2,{tags:{name:'Pork house',amenity:'restaurant'}}),place(3,{tags:{name:'Test',amenity:'restaurant',alcohol:'yes'}}),place(4,{lat:4,lon:102}),place(1),place(5,{tags:{name:'Test',amenity:'restaurant','drink:beer':'yes'}})],center,5).map(p=>p.id),['osm:node:1'])
assert.equal(rankOSM(Array.from({length:20},(_,i)=>place(i)),center,5).length,20)
assert.equal(rankOSM([place(1,{type:'way',lat:undefined,lon:undefined,center:{lat:3.15,lon:101.7}})],center,5).length,1)
assert.equal(rankOSM([place(1,{lat:NaN})],center,5).length,0)
async function request(body, method='POST') { let result; const res={ setHeader(){}, end(text){result={status:this.statusCode,body:JSON.parse(text)}} };await handler({method,body},res);return result }
assert.equal((await request({},'GET')).status,405)
assert.equal((await request({...opts,latitude:3.15,longitude:101.7,radiusKm:51})).status,400)
assert.equal((await request({...opts,latitude:Infinity,longitude:101.7})).status,400)
const originalFetch=globalThis.fetch,originalNow=Date.now;let testClock=originalNow();Date.now=()=>testClock
try {
  const calls=[]
  globalThis.fetch=async(url,o)=>{calls.push({url,body:String(o.body||'')});return {ok:true,json:async()=>url.includes('photon')?{features:[{geometry:{coordinates:[101.7,3.15]},properties:{name:'Test area',countrycode:'MY'}}]}:{elements:[place(1)]}}}
  assert.equal((await request({...opts,area:'Shah Alam'})).body.places.length,1)
  assert.equal(calls.length,2);assert.ok(decodeURIComponent(calls[1].body).includes('around:5000,3.15,101.7'))
  assert.ok(calls.every(c=>!c.url.includes('googleapis')))
  assert.equal((await request({...opts,area:'Shah Alam'})).status,200);assert.equal(calls.length,2)
  assert.equal((await request({...opts,area:'Another area'})).status,429)
  testClock+=4000
  globalThis.fetch=async()=>({ok:false})
  assert.equal((await request({...opts,latitude:3.15,longitude:101.7})).status,502)
  testClock+=4000;globalThis.fetch=async()=>({ok:true,json:async()=>({features:[{geometry:{coordinates:[101.7,3.15]},properties:{countrycode:'SG'}}]})})
  assert.equal((await request({...opts,area:'Wrong country'})).status,404)
} finally {globalThis.fetch=originalFetch;Date.now=originalNow}
console.log('PASS backend: nearest/radius/dedup/max10, prohibited tags, node/way, Malaysian area, no Google calls, caching/throttle/provider errors; synthetic only.')

// Existing bundled browser harness fallback: Python Playwright is not installed.
const {chromium}=await import(process.env.FITCORE_PLAYWRIGHT_MODULE || '/Users/wildan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const browser=await chromium.launch({headless:true,executablePath:process.env.FITCORE_CHROMIUM || '/Users/wildan/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'})
const source=readFileSync(new URL('../src/lib/storage.ts',import.meta.url),'utf8')
const profile=Function(`return (${source.split('export const DEFAULT_PROFILE: UserProfile = ')[1].split('\n}\n')[0]+'\n}'})`)()
const captures=new URL('../.impeccable/review/',import.meta.url);mkdirSync(captures,{recursive:true})
const fixtures=Array.from({length:10},(_,i)=>({...rankOSM([place(i)],center,5)[0],name:`Synthetic test restaurant ${i+1}`}))
const errors=[]
try {
 for(const width of [320,390,469,1440]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:width===320?'reduce':'no-preference',timezoneId:'Asia/Kuala_Lumpur'})
  await context.addInitScript(profile=>localStorage.setItem('fitcore.state.v1',JSON.stringify({v:1,profile:{...profile,onboarded:true,name:'Test'},foods:[],sessions:[],weights:[],photos:[],dietTasks:[],streakMilestonesSeen:[]})),profile)
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));let mode='success',requests=[]
  await page.route('**/api/nearby-restaurants',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:mode==='error'?503:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'Free map service is busy. Please retry later.'}:{places:mode==='empty'?[]:fixtures,locationLabel:'Synthetic test area',source:'OpenStreetMap'})})})
  await page.goto('http://127.0.0.1:5180/#/eat-out?date=2026-10-06');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready)
  assert.equal(await page.getByLabel('Google rating',{exact:true}).count(),0)
  await page.screenshot({path:new URL(`eat-out-free-start-${width}.png`,captures).pathname,fullPage:true})
  await page.getByLabel('Or search a Malaysian area').fill('Test area')
  await page.getByRole('button',{name:'Search',exact:true}).click()
  await page.getByRole('heading',{name:'10 places. Your call.'}).waitFor()
  assert.equal(await page.locator('.eat-out-list li').count(),10)
  assert.equal(await page.getByRole('button',{name:/Spin all/}).isDisabled(),false)
  for (const checkbox of await page.locator('.eat-out-list input').all()) await checkbox.uncheck()
  assert.equal(await page.getByRole('button',{name:/Spin all/}).isDisabled(),true)
  await page.locator('.eat-out-list input').nth(2).check()
  await page.locator('.eat-out-list input').nth(5).check()
  await page.getByRole('button',{name:/Spin all/}).click()
  await page.getByRole('dialog').waitFor()
  const chosen=await page.getByRole('dialog').locator('h2').innerText();assert.ok([3,6].some(n=>chosen.includes(`restaurant ${n}`)))
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fitcore.state.v1')).foods.length),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  assert.equal(await page.getByText('Free OpenStreetMap search',{exact:false}).count(),1)
  assert.equal(await page.getByText('Google 4.5 / 5',{exact:false}).count(),0)
  await page.getByRole('dialog').screenshot({path:new URL(`eat-out-free-result-${width}.png`,captures).pathname,animations:'disabled'})
  await page.getByRole('dialog').getByRole('button',{name:'Close your pick'}).click()
  await page.locator('.eat-out-list li').first().screenshot({path:new URL(`eat-out-free-place-${width}.png`,captures).pathname,style:'.home-dock{visibility:hidden!important}'})
  await page.getByRole('button',{name:'Spin again',exact:true}).click();await page.getByRole('dialog').waitFor()
  await page.getByRole('dialog').getByRole('button',{name:'Find food to log'}).click()
  assert.ok(page.url().includes('date=2026-10-06'))
  assert.ok(page.url().includes('add=1'))
  await page.goto('http://127.0.0.1:5180/#/eat-out');await page.waitForLoadState('networkidle')
  if(width===390) {
   await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(ok,fail)=>fail({code:1})},configurable:true}))
   await page.getByRole('button',{name:'Use my location',exact:true}).click();await page.getByText('Could not get your location.',{exact:false}).waitFor()
   await page.getByLabel('Or search a Malaysian area').fill('Test area');mode='error';await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('Free map service is busy. Please retry later.').waitFor()
   await page.locator('.eat-out-error').screenshot({path:new URL('eat-out-free-unavailable-390.png',captures).pathname,style:'.home-dock{visibility:hidden!important}'})
   mode='empty';await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('heading',{name:'No matches this time.'}).waitFor()
   assert.equal(await page.locator('.eat-out-wheel').count(),0)
  }
  assert.deepEqual(errors,[]);await context.close()
 }
 console.log('PASS browser: four widths/reduced motion; free source/no rating filters, shortlist inclusion, repeated spin, no auto-log, dated handoff, denied location, provider error and empty state; no page errors.')
} finally {await browser.close()}
