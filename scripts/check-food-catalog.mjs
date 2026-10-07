import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeProduct,normalizeUSDA,normalizeRecipe} from '../api/food-catalog.js'
import {hasExcludedIngredients} from '../shared/foodSuitability.js'
import {rankPlaces} from '../api/nearby-restaurants.js'
const nutrients={'energy-kcal_100g':100,proteins_100g:10,carbohydrates_100g:6,fat_100g:4}
const product={code:'12345678',product_name:'Synthetic test yogurt',nutriments:nutrients,ingredients_text:'Milk',allergens_tags:['en:milk']}
assert.equal(normalizeProduct(product).kcal,100)
assert.equal(normalizeProduct({...product,nutriments:{...nutrients,proteins_100g:undefined}}),null)
assert.equal(normalizeProduct({...product,ingredients_tags:['en:pork']}),null)
for(const word of ['pork','babi','bacon','lard','beer','arak','mirin','char siew','porc','猪肉'])assert.equal(hasExcludedIngredients(word),true)
assert.equal(hasExcludedIngredients('Chinese vegetarian rice'),false)
const usda={fdcId:123,description:'Synthetic test oats',dataType:'Foundation',foodNutrients:[{nutrientId:1008,value:100},{nutrientId:1003,value:10},{nutrientId:1005,value:6},{nutrientId:1004,value:4}]}
assert.equal(normalizeUSDA(usda).basis,'100 g');assert.equal(normalizeUSDA({...usda,foodNutrients:[]}),null)
assert.equal(normalizeRecipe({idMeal:'1',strMeal:'Test chicken',strIngredient1:'Wine'}),null)
assert.equal(normalizeRecipe({idMeal:'1',strMeal:'Test rice',strIngredient1:'Rice'}).ingredients.length,1)
const center={latitude:3,longitude:101},base={displayName:{text:'Chinese vegetarian restaurant'},location:center,businessStatus:'OPERATIONAL',rating:4.5,userRatingCount:200,currentOpeningHours:{openNow:true}}
assert.deepEqual(rankPlaces([{...base,id:'yes'},{...base,id:'wine',servesWine:true},{...base,id:'pork',displayName:{text:'Pork restaurant'}},{...base,id:'bar',types:['bar']}],center,{radiusKm:5,minRating:4,minReviews:20,openNow:true,price:'any'}).map(p=>p.id),['yes'])
console.log('PASS normalization: missing is not zero, ingredient and multilingual prohibited filters, recipe-only data, Chinese cuisine retained, known alcohol/pork/bar restaurants excluded.')
const {chromium}=await import('/Users/wildan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const browser=await chromium.launch({headless:true,executablePath:'/Users/wildan/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'})
const source=readFileSync(new URL('../src/lib/storage.ts',import.meta.url),'utf8'),profile=Function(`return (${source.split('export const DEFAULT_PROFILE: UserProfile = ')[1].split('\n}\n')[0]+'\n}'})`)()
const errors=[]
try {
 for(const width of [320,390,469,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',timezoneId:'Asia/Kuala_Lumpur'})
  await context.addInitScript(p=>localStorage.setItem('fitcore.state.v1',JSON.stringify({v:1,profile:{...p,onboarded:true,name:'Test'},foods:[],sessions:[],weights:[],photos:[],dietTasks:[],streakMilestonesSeen:[]})),profile)
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));let mode='success',requests=[]
  await page.route('**/api/food-catalog',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:mode==='error'?429:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'Please wait a few seconds before another database search.'}:{items:mode==='empty'?[]:[normalizeProduct(product)],license:'Open Food Facts · ODbL',notice:'Synthetic browser test fixture',omitted:0})})})
  await page.goto('http://127.0.0.1:5180/#/food?add=1&date=2026-10-06');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready)
  await page.getByRole('button',{name:/Free databases/}).click()
  await page.getByLabel('Food or ingredient name',{exact:true}).fill('test yogurt')
  assert.equal(requests.length,0)
  await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:/Synthetic test yogurt/}).click()
  const field=page.getByRole('spinbutton',{name:'Amount (g / ml)'})
  await field.fill('150');await page.getByText('150 kcal',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Log chosen portion'}).isDisabled(),true)
  await page.locator('.food-sources').screenshot({path:`.impeccable/review/food-sources-review-${width}.png`})
  await page.getByLabel('I checked the portion, label and halal suitability.').check()
  await page.getByRole('button',{name:'Log chosen portion'}).scrollIntoViewIfNeeded()
  await page.locator('.food-sources').screenshot({path:`.impeccable/review/food-sources-confirm-${width}.png`})
  await page.getByRole('button',{name:'Log chosen portion'}).click();await page.getByRole('dialog').waitFor({state:'detached'})
  const log=await page.evaluate(()=>JSON.parse(localStorage.getItem('fitcore.state.v1')).foods[0]);assert.equal(log.date,'2026-10-06');assert.equal(log.kcal,150);assert.equal(log.protein,15);assert.equal(log.nutritionSource,'Open Food Facts');assert.ok(log.nutritionSourceUrl.includes('12345678'))
  await page.getByRole('button',{name:'Search meals, drinks or restaurants'}).click();await page.getByRole('button',{name:/Free databases/}).click();await page.getByRole('button',{name:'Barcode',exact:true}).click();await page.getByLabel('Product barcode').fill('12345678');assert.equal(requests.length,1);mode='empty';await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText(/No usable matches/).waitFor()
  mode='error';await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('Please wait a few seconds before another database search.').waitFor()
  await page.locator('.food-sources').screenshot({path:`.impeccable/review/food-sources-error-${width}.png`})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.getByRole('button',{name:'Back to local Malaysian search'}).click();await page.getByRole('textbox',{name:'Search food or restaurant'}).fill('pork');assert.equal(await page.getByText('Char Siew Rice',{exact:true}).count(),0)
  await context.close()
 }
 assert.deepEqual(errors,[]);console.log('PASS browser: explicit submit only, scaled portion, confirmation gate, provenance and past date saved, barcode/empty/rate error/back/local filtering, four widths and no JS errors.')
}finally{await browser.close()}
