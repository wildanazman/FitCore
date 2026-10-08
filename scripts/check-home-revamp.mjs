import assert from 'node:assert/strict'
import { chromium } from '/Users/wildan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const browser=await chromium.launch({headless:true,executablePath:'/Users/wildan/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'})
try {
  for(const width of [320,469,1440]) {
    const context=await browser.newContext({viewport:{width,height:895},timezoneId:'Asia/Kuala_Lumpur',reducedMotion:'reduce'})
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto('http://127.0.0.1:5182/')
    const dates=await page.evaluate(async()=>{
      const {DEFAULT_PROFILE}=await import('/src/lib/storage.ts')
      const {todayISO,addDays,startOfWeek}=await import('/src/lib/date.ts')
      const today=todayISO(),past=addDays(today,-7),week=startOfWeek(today)
      const profile={...DEFAULT_PROFILE,name:'Aiman',onboarded:true,sports:[],planStartDate:null,startWeightKg:80}
      const state={v:1,profile,foods:[],weights:[{id:'old',date:past,weightKg:78},{id:'new',date:today,weightKg:76}],sessions:[],photos:[],dietTasks:[],streakMilestonesSeen:[3,7,14,30]}
      localStorage.setItem('fitcore.state.v1',JSON.stringify(state))
      return {today,past,week}
    })
    await page.reload();await page.locator('.home-energy').waitFor();await page.evaluate(()=>document.fonts.ready)
    assert.equal(await page.locator('.show-up-actions').count(),0)
    assert.equal(await page.locator('.home-quick-actions>button').count(),2)
    const mealRect=await page.locator('.home-log-meal').boundingBox()
    await page.screenshot({path:`.impeccable/review/home-refined-empty-${width}.png`,animations:'disabled'})
    assert.ok(mealRect.y+mealRect.height<810,`logging hidden at ${width}: ${JSON.stringify(mealRect)}`)
    assert.ok((await page.locator('.home-body-value').innerText()).includes('76.0'))
    await page.screenshot({path:`.impeccable/review/home-refined-empty-${width}.png`,animations:'disabled'})
    await page.getByText('Explore your days',{exact:true}).click()
    await page.getByLabel('View a date',{exact:true}).fill(dates.past)
    assert.ok((await page.locator('.home-body-value').innerText()).includes('78.0'))
    assert.ok((await page.locator('.show-up-feedback').innerText()).includes('1 check-in'))
    await page.getByRole('button',{name:'View nutrition details'}).click()
    assert.ok(page.url().includes(`date=${dates.past}`))
    await page.goto('http://127.0.0.1:5182/#/')
    await page.evaluate(({today,week,past})=>{
      const s=JSON.parse(localStorage.getItem('fitcore.state.v1'))
      s.foods=[{id:'meal',date:today,loggedAt:`${today}T12:30:00`,name:'Nasi ayam panggang',slot:'lunch',kcal:650,protein:45,carbs:68,fat:20,servings:1,source:'manual'}]
      s.sessions=[{id:'run',date:today,plan:'running',type:'run',title:'Easy Run',detail:'30 min easy',durationMin:30,distanceKm:4,kcal:250,completed:false,icon:'directions_run'}]
      s.dietTasks=[{id:'task',date:today,title:'Pack lunch',completed:false}]
      localStorage.setItem('fitcore.state.v1',JSON.stringify(s))
    },dates)
    await page.reload();await page.locator('.home-entry').first().waitFor()
    await page.getByRole('button',{name:'Mark complete: Easy Run',exact:true}).click()
    assert.equal(await page.getByRole('button',{name:'Mark incomplete: Easy Run',exact:true}).getAttribute('aria-pressed'),'true')
    await page.getByLabel('Pack lunch',{exact:true}).check()
    assert.equal(await page.getByLabel('Pack lunch',{exact:true}).isChecked(),true)
    await page.getByRole('button',{name:'Meals',exact:true}).click()
    assert.equal(await page.locator('.home-entry-activity').count(),0)
    await page.getByRole('button',{name:'Everything',exact:true}).click()
    await page.locator('main').evaluate(el=>el.scrollTop=0)
    await page.screenshot({path:`.impeccable/review/home-refined-populated-${width}.png`,animations:'disabled'})
    await page.getByRole('button',{name:'Log activity Sets or duration',exact:true}).click()
    await page.locator('#home-activity-composer').waitFor()
    await page.getByRole('button',{name:'Close activity form'}).click()
    await page.waitForFunction(()=>!document.querySelector('#home-activity-composer'))
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fitcore.state.v1'));s.foods[0].kcal=4000;localStorage.setItem('fitcore.state.v1',JSON.stringify(s))})
    await page.reload()
    assert.ok((await page.locator('.home-energy').innerText()).includes('over target'))
    await page.locator('.home-balance-toggle').click()
    assert.ok((await page.locator('.home-balance-details').innerText()).includes('Estimated maintenance'))
    await page.locator('main').evaluate(el=>el.scrollTop=0)
    await page.screenshot({path:`.impeccable/review/home-refined-over-${width}.png`,animations:'disabled'})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    assert.equal(await page.locator('main').evaluate(el=>el.scrollWidth>el.clientWidth),false)
    assert.equal(errors.length,0,errors.join('\n'))
    console.log(`PASS ${width}px: visible actions, past-date weight/navigation/counts, timeline filters, session/task completion, activity form, surplus state`)
    await context.close()
  }
} finally {await browser.close()}
