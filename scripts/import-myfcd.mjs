import { mkdir, writeFile } from 'node:fs/promises'

const base = 'https://myfcd.moh.gov.my/myfcdcurrent'
const listingUrl = `${base}/index.php/ajax/datatable_data`

function category(group, name) {
  const n = name.toLowerCase()
  if (group.startsWith('2.1') || /kuih|cake|dessert|pudding|bubur|dodol|bahulu|karipap|samosa|donut|pastry/.test(n)) return 'Snack'
  if (/rice|nasi|briyani|dagang|kerabu|arab/.test(n)) return 'Rice'
  if (/chicken|beef|meat|rendang|satay|sausage/.test(n)) return 'Meat'
  if (/fish|prawn|crab|cuttlefish|eel|seafood|anchovy|shellfish|sotong|kerang|stingray/.test(n)) return 'Seafood'
  if (/vegetable|cabbage|spinach|kale|kangkung|corn|capsicum/.test(n)) return 'Vegetable'
  if (/milk|yogurt|cheese|cream|ice-cream/.test(n)) return 'Basics'
  if (/tea|coffee|drink|juice|chocolate|isotonic|cordial|beverage|soya/.test(n)) return 'Drink'
  return 'Basics'
}

function number(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const listingResponse = await fetch(listingUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest' },
  body: 'postData%5Bstart%5D=0&postData%5Blength%5D=-1&postData%5Bmy_food_group%5D=0&postData%5Bmy_manufacturer%5D=0&postData%5Bsearch%5D%5Bvalue%5D=&postData%5Bdraw%5D=1',
})
if (!listingResponse.ok) throw new Error(`MyFCD listing failed: ${listingResponse.status}`)
const listing = await listingResponse.json()
const foods = []

for (const [index, row] of (listing.data || []).entries()) {
  const [id, name, group] = row
  try {
    const response = await fetch(`${base}/index.php/site/detail_product/${id}/0/10/-1/0/0/`)
    const html = await response.text()
    const match = html.match(/var product_nutrients =\s+({[\s\S]*?});\s*\n/)
    if (!match) continue
    const nutrients = JSON.parse(match[1])
    const kcal = number(nutrients.Energy?.value)
    if (!name || kcal <= 0) continue
    foods.push({
      name: String(name).replace(/\s+/g, ' ').trim(), emoji: '🍽️', category: category(String(group), String(name)),
      serving: '100 g', kcal: Math.round(kcal), protein: Math.round(number(nutrients.Protein?.value)),
      carbs: Math.round(number(nutrients.Carbohydrate?.value)), fat: Math.round(number(nutrients.Fat?.value)), aka: [String(id)],
    })
  } catch (error) {
    console.warn(`Skipped ${id}: ${error.message}`)
  }
  if ((index + 1) % 25 === 0) console.log(`Imported ${index + 1}/${listing.data.length}`)
}

const output = `// Generated from the Malaysian Food Composition Database (MyFCD), Ministry of Health Malaysia.\n// Values are per 100 g. Re-run scripts/import-myfcd.mjs to refresh this snapshot.\nimport type { LocalFood } from './localFoods'\n\nexport const MYFCD_FOODS: LocalFood[] = ${JSON.stringify(foods, null, 2)}\n`
await mkdir('src/lib', { recursive: true })
await writeFile('src/lib/myfcdFoods.ts', output, 'utf8')
console.log(`Wrote ${foods.length} MyFCD foods to src/lib/myfcdFoods.ts`)
