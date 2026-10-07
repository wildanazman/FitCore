import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { chromium } from '/Users/wildan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const code=ts.transpile(readFileSync(new URL('../src/lib/nutrition.ts',import.meta.url),'utf8'),{module:ts.ModuleKind.ESNext})
const {intakeBalance,tdee}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const source=readFileSync(new URL('../src/lib/storage.ts',import.meta.url),'utf8')
const profile={...Function(`return (${source.split('export const DEFAULT_PROFILE: UserProfile = ')[1].split('\n}\n')[0]+'\n}'})`)(),age:30,sex:'male',heightCm:175,startWeightKg:80,activity:'sedentary',onboarded:true,calorieTargetOverride:1700}
const maintenance=tdee(profile,80)
assert.equal(intakeBalance(profile,80,maintenance).weeklyEnergyKg,0)
assert.equal(intakeBalance(profile,80,maintenance+550).weeklyEnergyKg,.5)
assert.equal(intakeBalance(profile,80,maintenance-550).weeklyEnergyKg,-.5)
assert.equal(intakeBalance({...profile,calorieTargetOverride:999},80,maintenance).maintenance,maintenance)
assert.equal(intakeBalance({...profile,age:16},80,2000),null)
assert.equal(intakeBalance(profile,80,NaN),null)
assert.ok(tdee({...profile,sex:'female'},80)<maintenance)
const browser=await chromium.launch({headless:true,executablePath:'/Users/wildan/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'})
try {
 for(const [label,intake,width] of [['empty',0,320],['over-diet',maintenance-200,469],['gain',maintenance+550,320],['maintenance',maintenance,1200]]) {
  const context=await browser.newContext({viewport:{width,height:895},reducedMotion:'reduce'})
  await context.addInitScript(({profile,intake})=>localStorage.setItem('fitcore.state.v1',JSON.stringify({v:1,profile,foods:intake?[{id:'test',name:'Complete day fixture',date:'2026-10-07',loggedAt:'2026-10-07T12:00:00',slot:'lunch',kcal:intake,protein:0,carbs:0,fat:0,servings:1}]:[],sessions:[],weights:[],photos:[],dietTasks:[],streakMilestonesSeen:[]})),{profile,intake})
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5182/#/food?date=2026-10-07');await page.waitForLoadState('networkidle')
  const insight=page.locator('.food-maintenance');await insight.waitFor()
  const text=await insight.innerText()
  assert.ok(text.includes(maintenance.toLocaleString()))
  if(label==='empty')assert.ok(text.includes('No food logged'))
  if(label==='over-diet')assert.ok(text.includes('over your diet target, but still below'))
  if(label==='gain')assert.ok(text.includes('0.50 kg gain per week'))
  if(label==='maintenance')assert.ok(text.includes('Close to maintenance'))
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.locator('.food-score').screenshot({path:`/private/tmp/fitcore-maintenance-${label}.png`,animations:'disabled'})
  assert.deepEqual(errors,[]);await context.close()
  console.log(`PASS ${label}: calculation, display, ${width}px, no errors/overflow`)
 }
} finally {await browser.close()}
