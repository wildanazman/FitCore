import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { hasExcludedIngredients } from '../shared/foodSuitability.js'

for (const name of ['Chicken ham', 'Ham ayam', 'Turkey bacon', 'Pau Char Siew Vegetarian', 'Ham Chi Peng']) assert.equal(hasExcludedIngredients(name), false, name)
for (const name of ['Chicken ham with pork', 'Vegetarian ham with lard', 'Beer', 'Gelatin', 'Babi', 'Vegetarian wine sauce']) assert.equal(hasExcludedIngredients(name), true, name)
for (const [file, count] of [['kkm-hq-foods.json',2547],['kkm-selangor-foods.json',811]]) {
  const rows = JSON.parse(await readFile(`src/data/${file}`, 'utf8'))
  assert.equal(rows.length, count)
  assert.equal(new Set(rows.map(row => row.id)).size, count)
  for (const row of rows) {
    assert.ok(Number.isFinite(row.kcal) && row.kcal >= 0)
    assert.ok(row.sourceUrl.endsWith(`#page=${row.page}`))
    assert.ok(Array.isArray(row.warnings))
    assert.ok(!('protein' in row))
  }
}
const temp = await mkdtemp(join(tmpdir(),'fitcore-kkm-'))
try {
  const output = join(temp,'catalog.mjs')
  await build({entryPoints:['src/lib/kkmFoods.ts'],bundle:true,platform:'node',format:'esm',outfile:output})
  const { KKM_FOODS, searchKKMFoods } = await import(pathToFileURL(output).href)
  assert.deepEqual(searchKKMFoods(''), [])
  for (const query of ['nasi arab', 'nasi lemak', 'bihun bandung']) assert.ok(searchKKMFoods(query).length > 0, query)
  const arab = searchKKMFoods('nasi arab').find(row => row.kcal === 840)
  assert.ok(arab)
  assert.ok(!arab.serving.includes('400 g'))
  assert.ok(arab.note.includes('unit missing'))
  const lemak = searchKKMFoods('nasi lemak').find(row => row.kcal === 389)
  assert.ok(lemak.serving.includes('230 g'))
  assert.ok(KKM_FOODS.every(row => row.protein === null && row.carbs === null && row.fat === null))
  console.log(`KKM checks passed: ${KKM_FOODS.length} searchable calorie references; source portions, warnings and unknown macros preserved.`)
} finally { await rm(temp,{recursive:true,force:true}) }
