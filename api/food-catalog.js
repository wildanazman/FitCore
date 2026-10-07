export const config = { maxDuration: 20 }
import { hasExcludedIngredients } from '../shared/foodSuitability.js'
const cache = new Map(), usage = new Map()
const send = (res, status, body) => { res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body)) }
const number = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null
const text = (v, max=500) => typeof v === 'string' ? v.trim().slice(0,max) : ''
const excluded = { test: hasExcludedIngredients }
const validMacros = n => Object.values(n).every(v=>v!==null && Number.isFinite(v) && v>=0 && v<=10000)
export function normalizeProduct(p) {
  const n=p.nutriments||{}, macros={kcal:number(n['energy-kcal_100g']),protein:number(n.proteins_100g),carbs:number(n.carbohydrates_100g),fat:number(n.fat_100g)}
  const name=[text(Array.isArray(p.brands)?p.brands.join(', '):p.brands,100),text(p.product_name,200)].filter(Boolean).join(' · ')
  if(!name || !validMacros(macros) || excluded.test(`${name} ${p.ingredients_text||''} ${(p.ingredients_tags||[]).join(' ')} ${(p.allergens_tags||[]).join(' ')}`))return null
  const code=/^\d{8,14}$/.test(String(p.code))?String(p.code):''
  return {id:`off:${code||name}`,name,...macros,basis:'100 g / ml (match the label)',unit:'g / ml',source:'Open Food Facts',sourceUrl:code?`https://world.openfoodfacts.org/product/${code}`:'https://world.openfoodfacts.org',ingredients:text(p.ingredients_text),allergens:(p.allergens_tags||[]).map(v=>text(v).replace(/^\w{2}:/,'')).join(', '),labelServing:text(p.serving_size,80),note:'Community-contributed label data. Confirm against your packet. No halal or allergen-free certification.'}
}
export function normalizeUSDA(p) {
  const value=ids=>number((p.foodNutrients||[]).find(n=>ids.includes(Number(n.nutrientId)))?.value)
  const macros={kcal:value([1008,2047,2048]),protein:value([1003]),carbs:value([1005]),fat:value([1004])}
  const name=text(p.description,200)
  if(!name || !validMacros(macros) || !Number.isInteger(p.fdcId) || excluded.test(name))return null
  return {id:`usda:${p.fdcId}`,name,...macros,basis:'100 g',unit:'g',source:'USDA FoodData Central',sourceUrl:`https://fdc.nal.usda.gov/food-details/${p.fdcId}/nutrients`,ingredients:'',allergens:'',labelServing:'',note:`${text(p.dataType,80)} reference. Match raw/cooked preparation; not a Malaysian restaurant portion.`}
}
export function normalizeRecipe(p) {
  const ingredients=Array.from({length:20},(_,i)=>({name:text(p[`strIngredient${i+1}`],100),amount:text(p[`strMeasure${i+1}`],100)})).filter(i=>i.name)
  if(!p.idMeal || !p.strMeal || excluded.test(`${p.strMeal} ${ingredients.map(i=>i.name).join(' ')}`))return null
  return {id:String(p.idMeal),name:text(p.strMeal,200),ingredients,instructions:text(p.strInstructions,7000),source:'TheMealDB',sourceUrl:`https://www.themealdb.com/meal.php?c=${encodeURIComponent(p.idMeal)}`,note:'Recipe inspiration only. Nutrition is not supplied; ingredient screening does not certify halal.'}
}
async function read(url) {
  const r=await fetch(url,{headers:{'User-Agent':'FitCore/1.0 (personal nutrition app; https://fit-core-five.vercel.app)'},signal:AbortSignal.timeout(10000)})
  if(!r.ok)throw new Error(r.status===429?'Provider rate limit reached. Please wait before retrying.':'Food database is unavailable. Try again later.')
  return r.json()
}
export default async function handler(req,res) {
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'Use POST.'})}
  let b;try{b=typeof req.body==='string'?JSON.parse(req.body):req.body??{}}catch{return send(res,400,{error:'Invalid request.'})}
  if(!['products','barcode','ingredients','recipes'].includes(b.mode))return send(res,400,{error:'Choose a food source.'})
  const q=text(b.query,121)
  if(q.length>120 || (b.mode==='barcode'?!/^\d{8,14}$/.test(q):q.length<2))return send(res,400,{error:b.mode==='barcode'?'Enter an 8–14 digit barcode.':'Enter 2–120 characters to search.'})
  if(hasExcludedIngredients(q))return send(res,400,{error:'This food is excluded by FitCore’s halal-only food policy.'})
  const recipeKey=process.env.THEMEALDB_API_KEY || (process.env.NODE_ENV==='development'?'1':'')
  if(b.mode==='recipes'&&(!recipeKey||recipeKey==='1'&&process.env.NODE_ENV!=='development'))return send(res,503,{error:'Recipe search needs a licensed TheMealDB production key. Its public test key is development-only.'})
  const key=`${b.mode}:${q.toLowerCase()}`,now=Date.now(),cached=cache.get(key)
  if(cached&&cached.until>now)return send(res,200,cached.data)
  const provider=b.mode==='products'||b.mode==='barcode'?'off':b.mode
  const rate=usage.get(provider)
  if(rate&&now-rate.last<(b.mode==='barcode'?4100:6500))return send(res,429,{error:'Please wait a few seconds before another database search.'})
  if(b.mode==='ingredients'&&!process.env.USDA_FDC_API_KEY&&rate&&now-rate.dayStart<86400000&&(rate.count>=50||now-rate.hourStart<3600000&&rate.hourCount>=30))return send(res,429,{error:'USDA demo quota reached. Add a free USDA API key for regular use, or retry later.'})
  usage.set(provider,{last:now,dayStart:rate&&now-rate.dayStart<86400000?rate.dayStart:now,hourStart:rate&&now-rate.hourStart<3600000?rate.hourStart:now,count:rate&&now-rate.dayStart<86400000?rate.count+1:1,hourCount:rate&&now-rate.hourStart<3600000?rate.hourCount+1:1})
  try {
    let raw=[],normalizer,license,notice=''
    if(b.mode==='products'||b.mode==='barcode'){
      const fields='code,product_name,brands,nutriments,ingredients_text,ingredients_tags,allergens_tags,serving_size'
      const url=b.mode==='barcode'?`https://world.openfoodfacts.org/api/v3/product/${q}?fields=${fields}`:`https://search.openfoodfacts.org/search?${new URLSearchParams({q,page_size:'12'})}`
      const data=await read(url);raw=b.mode==='barcode'?(data.product?[data.product]:[]):data.hits||[];normalizer=normalizeProduct;license='Open Food Facts · ODbL / Database Contents License';
    }else if(b.mode==='ingredients'){
      const data=await read(`https://api.nal.usda.gov/fdc/v1/foods/search?${new URLSearchParams({api_key:process.env.USDA_FDC_API_KEY||'DEMO_KEY',query:q,pageSize:'12',dataType:'Foundation,SR Legacy,FNDDS'})}`);raw=data.foods||[];normalizer=normalizeUSDA;license='USDA FoodData Central · public domain / CC0';if(!process.env.USDA_FDC_API_KEY)notice='USDA demo access has a small shared quota. A free personal API key is recommended.'
    }else{
      const data=await read(`https://www.themealdb.com/api/json/v1/${encodeURIComponent(recipeKey)}/search.php?s=${encodeURIComponent(q)}`);raw=data.meals||[];normalizer=normalizeRecipe;license='TheMealDB · recipe content; terms apply';if(recipeKey==='1')notice='Development-only test access. A licensed key is required before public release.'
    }
    if(!Array.isArray(raw))throw new Error('Unexpected food database response.')
    const items=raw.map(normalizer).filter(Boolean).slice(0,12),data={items,license,notice,omitted:raw.length-items.length}
    if(cache.size>=100)cache.clear();cache.set(key,{until:now+90000,data})
    return send(res,200,data)
  }catch(e){return send(res,502,{error:e instanceof Error?e.message:'Food database is unavailable.'})}
}
