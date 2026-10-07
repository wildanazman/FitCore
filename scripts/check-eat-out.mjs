import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import handler, { rankPlaces, distanceKm } from '../api/nearby-restaurants.js'
const opts = { radiusKm:5, minRating:4, minReviews:20, openNow:true, price:'any' }
const center = { latitude:3.15, longitude:101.7 }
const place = (id, extra={}) => ({ id, displayName:{text:`Synthetic test restaurant ${id}`}, location:center, formattedAddress:'Test fixture address', businessStatus:'OPERATIONAL', rating:4.5, userRatingCount:200, currentOpeningHours:{openNow:true}, ...extra })
assert.equal(distanceKm(center,center),0)
assert.deepEqual(rankPlaces([place('yes'),place('closed',{currentOpeningHours:{openNow:false}}),place('low',{rating:3}),place('few',{userRatingCount:2}),place('far',{location:{latitude:4,longitude:102}}),place('yes')],center,opts).map(p=>p.id),['yes'])
assert.equal(rankPlaces(Array.from({length:20},(_,i)=>place(String(i))),center,opts).length,10)
assert.equal(rankPlaces([place('unknown')],center,{...opts,price:'budget'}).length,0)
assert.equal(rankPlaces([place('budget',{priceLevel:'PRICE_LEVEL_INEXPENSIVE'})],center,{...opts,price:'budget'}).length,1)
async function request(body, method='POST') { let result; const res={ setHeader(){}, end(text){result={status:this.statusCode,body:JSON.parse(text)}} };await handler({method,body},res);return result }
assert.equal((await request({},'GET')).status,405)
assert.equal((await request({...opts,latitude:3.15,longitude:101.7,radiusKm:51})).status,400)
assert.equal((await request({...opts,latitude:Infinity,longitude:101.7})).status,400)
const originalKey=process.env.GOOGLE_PLACES_API_KEY, originalFetch=globalThis.fetch
try {
  delete process.env.GOOGLE_PLACES_API_KEY
  assert.equal((await request({...opts,area:'Shah Alam'})).body.code,'NOT_CONFIGURED')
  process.env.GOOGLE_PLACES_API_KEY='synthetic-test-key'
  const calls=[]
  globalThis.fetch=async(url,o)=>{calls.push({url,body:JSON.parse(o.body)});return {ok:true,json:async()=>url.endsWith('searchText')?{places:[place('area')]}:{places:[place('a')]}}}
  assert.equal((await request({...opts,area:'Shah Alam'})).body.places.length,1)
  assert.equal(calls.length,2);assert.equal(calls[1].body.locationRestriction.circle.radius,5000)
  globalThis.fetch=async()=>({ok:false})
  assert.equal((await request({...opts,latitude:3.15,longitude:101.7})).status,502)
} finally {globalThis.fetch=originalFetch; if(originalKey===undefined)delete process.env.GOOGLE_PLACES_API_KEY;else process.env.GOOGLE_PLACES_API_KEY=originalKey}
console.log('PASS backend: radius/rating/reviews/open/price/dedup/max10, area resolution, missing config, provider error; synthetic requests only.')

// Existing bundled browser harness fallback: Python Playwright is not installed.
const {chromium}=await import(process.env.FITCORE_PLAYWRIGHT_MODULE || '/Users/wildan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const browser=await chromium.launch({headless:true,executablePath:process.env.FITCORE_CHROMIUM || '/Users/wildan/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'})
const source=readFileSync(new URL('../src/lib/storage.ts',import.meta.url),'utf8')
const profile=Function(`return (${source.split('export const DEFAULT_PROFILE: UserProfile = ')[1].split('\n}\n')[0]+'\n}'})`)()
const captures=new URL('../.impeccable/review/',import.meta.url);mkdirSync(captures,{recursive:true})
const fixtures=Array.from({length:10},(_,i)=>({...rankPlaces([place(String(i))],center,opts)[0],name:`Synthetic test restaurant ${i+1}`,attributions:[]}))
const errors=[]
try {
 for(const width of [320,390,469,1440]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:width===320?'reduce':'no-preference',timezoneId:'Asia/Kuala_Lumpur'})
  await context.addInitScript(profile=>localStorage.setItem('fitcore.state.v1',JSON.stringify({v:1,profile:{...profile,onboarded:true,name:'Test'},foods:[],sessions:[],weights:[],photos:[],dietTasks:[],streakMilestonesSeen:[]})),profile)
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));let mode='success',requests=[]
  await page.route('**/api/nearby-restaurants',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:mode==='error'?503:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'Live restaurant search is not connected yet.'}:{places:mode==='empty'?[]:fixtures,locationLabel:'Synthetic test area'})})})
  await page.goto('http://127.0.0.1:5180/#/eat-out?date=2026-10-06');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready)
  await page.screenshot({path:new URL(`eat-out-start-${width}.png`,captures).pathname,fullPage:true})
  await page.getByLabel('Or search a Malaysian area').fill('Test area')
  await page.getByRole('button',{name:'Search',exact:true}).click()
  await page.getByRole('heading',{name:'10 places. Your call.'}).waitFor()
  assert.equal(await page.locator('.eat-out-list li').count(),10)
  assert.equal(await page.getByRole('button',{name:'Pick for me',exact:true}).isDisabled(),false)
  for (const checkbox of await page.locator('.eat-out-list input').all()) await checkbox.uncheck()
  assert.equal(await page.getByRole('button',{name:'Pick for me',exact:true}).isDisabled(),true)
  await page.locator('.eat-out-list input').nth(2).check()
  await page.locator('.eat-out-list input').nth(5).check()
  await page.getByRole('button',{name:'Pick for me',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.eat-out-result')?.classList.contains('has-winner'))
  const chosen=await page.locator('.eat-out-result h3').innerText();assert.ok([3,6].some(n=>chosen.includes(`restaurant ${n}.`)))
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fitcore.state.v1')).foods.length),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.locator('.eat-out-wheel-section').screenshot({path:new URL(`eat-out-spin-${width}.png`,captures).pathname})
  await page.locator('.eat-out-result').screenshot({path:new URL(`eat-out-result-${width}.png`,captures).pathname,style:'.home-dock{visibility:hidden!important}'})
  await page.locator('.eat-out-list li').first().screenshot({path:new URL(`eat-out-place-${width}.png`,captures).pathname,style:'.home-dock{visibility:hidden!important}'})
  await page.getByRole('button',{name:'Spin again',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.eat-out-result')?.classList.contains('has-winner'))
  await page.locator('.eat-out-result summary').click()
  await page.getByRole('button',{name:'Nasi Ayam',exact:true}).click()
  assert.ok(page.url().includes('date=2026-10-06'))
  assert.equal(await page.locator('input').evaluateAll(nodes=>nodes.some(n=>n.value==='Nasi Ayam')),true)
  assert.ok(page.url().includes('q=Nasi'))
  await page.goto('http://127.0.0.1:5180/#/eat-out');await page.waitForLoadState('networkidle')
  if(width===390) {
   await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(ok,fail)=>fail({code:1})},configurable:true}))
   await page.getByRole('button',{name:'Use my location',exact:true}).click();await page.getByText('Could not get your location.',{exact:false}).waitFor()
   await page.getByLabel('Or search a Malaysian area').fill('Test area');mode='error';await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('Live restaurant search is not connected yet.').waitFor()
   await page.locator('.eat-out-error').screenshot({path:new URL('eat-out-unavailable-390.png',captures).pathname,style:'.home-dock{visibility:hidden!important}'})
   mode='empty';await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('heading',{name:'No matches this time.'}).waitFor()
   assert.equal(await page.locator('.eat-out-wheel').count(),0)
  }
  assert.deepEqual(errors,[]);await context.close()
 }
 console.log('PASS browser: 320 reduced motion/390/469/1440; shortlist, reviewed eligibility, repeated spin, no auto-log, dated food handoff, denied location, missing config and empty state; no page errors.')
} finally {await browser.close()}
