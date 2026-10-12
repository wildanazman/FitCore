import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizeProduct } from '../api/food-catalog.js'
const dir=await mkdtemp(join(tmpdir(),'fitcore-food-corrections-'))
try{
const output=join(dir,'test.mjs')
await build({stdin:{contents:"export * from './src/lib/foodReferences';export * from './src/lib/mealComponents';export * from './src/lib/kkmFoods';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',define:{'import.meta.env.VITE_API_BASE_URL':'""'},outfile:output})
const {offlineReferences,foodKind,referenceGrams,componentTotals,scaleMealComponent,searchKKMFoods}=await import(pathToFileURL(output).href)
assert.equal(foodKind('Teh tarik'),'drink');assert.equal(foodKind('Nasi ayam kunyit'),'meal')
assert.equal(foodKind('Coffee latte'),'drink');assert.equal(referenceGrams('1 slice · 120 g'),120);assert.equal(referenceGrams('100 g / ml'),undefined)
const refs=offlineReferences('nasi arab',null,searchKKMFoods('nasi arab'))
assert.ok(refs.length>1);const calorieOnly=refs.find(r=>r.kcal===840);assert.ok(calorieOnly);assert.equal(calorieOnly.protein,undefined);assert.ok(calorieOnly.sourceUrl.includes('#page='))
const det={name:'Meal',emoji:'',kcal:900,protein:40,carbs:90,fat:30,confidence:.8,items:[{name:'Rice',kcal:300},{name:'Chicken',kcal:450}]}
const before=JSON.stringify(det)
const scaled=scaleMealComponent(det.items[0],2);assert.equal(scaled.kcal,600);assert.equal(scaled.protein,undefined)
const edited=componentTotals({...det,items:[scaled,det.items[1]]},true)
assert.equal(edited.kcal,1050);assert.equal(edited.macrosNeedReview,true);assert.equal(JSON.stringify(det),before)
const complete=componentTotals({...det,items:[{name:'Rice',kcal:300,protein:5,carbs:60,fat:1},{name:'Chicken',kcal:400,protein:35,carbs:5,fat:22}]},true)
assert.equal(complete.kcal,700);assert.equal(complete.protein,40);assert.equal(complete.carbs,65);assert.equal(complete.fat,23);assert.equal(complete.macrosNeedReview,false)
assert.throws(()=>scaleMealComponent(det.items[0],-1))
const product={code:'12345678',product_name:'Milk',nutriments:{'energy-kcal_100g':60,proteins_100g:3,carbohydrates_100g:5,fat_100g:3},image_front_small_url:'https://images.openfoodfacts.org/images/products/test.jpg'}
assert.equal(normalizeProduct(product).imageUrl,product.image_front_small_url)
assert.equal(normalizeProduct({...product,image_front_small_url:'https://attacker.invalid/image.jpg'}).imageUrl,undefined)
console.log('PASS unified references, drinks filter, serving units, unknown macros, component scaling/recalculation, provenance and safe product images.')
}finally{await rm(dir,{recursive:true,force:true})}
