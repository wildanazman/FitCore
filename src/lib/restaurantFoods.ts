/** Offline Malaysia restaurant snapshot. A missing value means unknown, never zero.
 * Sources are kept per item so a menu change can be audited before an update.
 * KFC and McDonald's publish complete nutrition; MOH's calorie bank is kcal-only.
 */
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'
export type RestaurantBrand = 'KFC' | "McDonald's" | 'Pizza Hut' | 'Subway' | 'ZUS Coffee' | 'CHAGEE' | 'Marrybrown'

export interface RestaurantFood {
  brand: RestaurantBrand
  name: string
  serving: string
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  sourceUrl: string
  sourceLabel: string
  /** Data date or caveat; not a claim that the item is currently on sale. */
  note?: string
}

const kfcSource = 'https://kfc.com.my/nutrition-facts'
const mcdSource = 'https://www.mcdonalds.com.my/menu'
const mohSource = 'https://hq.moh.gov.my/nutrition/wp-content/uploads/2025/10/Bank-Calorie-Bahagian-Pemakanan-merged.pdf'
const subwaySource = 'https://subway.com.my/wraps/italian-b-m-t'
const zusSource = 'https://zuscoffee.com/menu/'
const chageeSource = 'https://chagee.com.my/product/milk-tea-series'

const kfc = (name: string, serving: string, kcal: number, protein: number, carbs: number, fat: number): RestaurantFood => ({ brand: 'KFC', name, serving, kcal, protein, carbs, fat, sourceUrl: kfcSource, sourceLabel: 'KFC Malaysia nutrition facts' })
const mcd = (name: string, slug: string, serving: string, kcal: number, protein: number, carbs: number, fat: number): RestaurantFood => ({ brand: "McDonald's", name, serving, kcal, protein, carbs, fat, sourceUrl: `${mcdSource}/${slug}`, sourceLabel: "McDonald's Malaysia nutrition facts", note: 'Brand nutrition table states figures were correct as of October 2020; check current portions.' })
const moh = (brand: RestaurantBrand, name: string, serving: string, kcal: number): RestaurantFood => ({ brand, name, serving, kcal, protein: null, carbs: null, fat: null, sourceUrl: mohSource, sourceLabel: 'Malaysia MOH calorie bank', note: 'Calorie-only reference; recipe/menu may have changed. Macros unavailable.' })
const menu = (brand: RestaurantBrand, name: string, sourceUrl: string): RestaurantFood => ({ brand, name, serving: 'Size/customisation not specified', kcal: null, protein: null, carbs: null, fat: null, sourceUrl, sourceLabel: `${brand} Malaysia menu`, note: 'No verified Malaysia calorie value in this offline snapshot.' })

export const RESTAURANT_FOODS: RestaurantFood[] = [
  kfc('Original Recipe Chicken — drumstick', '1 piece', 160, 16, 7, 8),
  kfc('Original Recipe Chicken — thigh', '1 piece', 287, 20, 11, 18),
  kfc('Original Recipe Chicken — rib', '1 piece', 275, 27, 8, 15),
  kfc('Original Recipe Chicken — breast', '1 piece', 342, 38, 15, 15),
  kfc('Original Recipe Chicken — wing', '1 piece', 188, 14, 6, 13),
  kfc('Hot & Spicy Chicken — drumstick', '1 piece', 179, 13, 8, 10),
  kfc('Hot & Spicy Chicken — thigh', '1 piece', 313, 21, 9, 22),
  kfc('Hot & Spicy Chicken — rib', '1 piece', 328, 28, 10, 20),
  kfc('Hot & Spicy Chicken — breast', '1 piece', 353, 32, 16, 18),
  kfc('Hot & Spicy Chicken — wing', '1 piece', 204, 12, 8, 14),
  kfc('Crispy Fillet Burger', '146 g', 410, 18, 39, 20),
  kfc('Zinger Cheezy', '206.5 g', 551, 24, 50, 28),
  kfc('Zinger Classic', '196.5 g', 573, 24, 49, 31),
  kfc('Zinger Stacker', '307.5 g', 879, 41, 65, 50),
  kfc('Zinger Cheezilla', '281 g', 733, 36, 59, 38),
  kfc('Colonel Classic', '157 g', 406, 16, 46, 18),
  kfc('Colonel Stacker', '224 g', 573, 28, 56, 26),
  kfc('Zinger Double Down', '221 g', 669, 38, 29, 45),
  kfc('Whipped Potato 4 oz', '95 g', 60, 2, 13, 0),
  kfc('Coleslaw 4 oz', '80 g', 150, 1, 5, 14),
  kfc('Wedges medium', '90 g', 209, 3, 24, 11),
  mcd('Big Mac', 'big-mac', '210 g', 491, 26, 45, 23.4),
  mcd('McChicken', 'mcchicken', '173 g', 418, 18, 47.2, 17.1),
  mcd('Filet-O-Fish', 'filet-o-fish', '139 g', 341, 15, 40.2, 13.1),
  mcd('Cheeseburger', 'cheeseburger', '117 g', 297, 15.7, 32.8, 11.7),
  mcd('Double Cheeseburger', 'double-cheeseburger', '169 g', 435, 26.3, 34.5, 21.6),
  mcd('Nasi Lemak McD', 'nasi-lemak-mcd', '345 g', 593, 18.6, 81.4, 21.4),
  mcd('GCB Grilled Chicken Burger', 'gcb-grilled-chicken-burger', '185 g', 393, 22.2, 35.3, 17.7),
  moh('Pizza Hut', 'Pan Pizza Chicken Supreme — large', '1 slice · 116 g', 270),
  moh('Pizza Hut', 'Pan Pizza Chicken Supreme — regular', '1 slice · 79 g', 190),
  moh('Pizza Hut', 'Pan Pizza Chicken Supreme — personal', '1 slice · 62 g', 150),
  moh('Pizza Hut', 'Pan Pizza Island Supreme — large', '1 slice · 113 g', 300),
  moh('Pizza Hut', 'Pan Pizza Island Supreme — regular', '1 slice · 78 g', 210),
  moh('Pizza Hut', 'Pan Pizza Super Supreme — large', '1 slice · 109 g', 260),
  moh('Pizza Hut', 'Pan Pizza Super Supreme — regular', '1 slice · 76 g', 180),
  moh('Pizza Hut', 'Pan Pizza Thai Seafood — large', '1 slice · 117 g', 290),
  moh('Pizza Hut', 'Pan Pizza Thai Seafood — regular', '1 slice · 81 g', 200),
  moh('Pizza Hut', 'Stuffed Crust Hawaiian Chicken — large', '1 slice · 151 g', 350),
  moh('Pizza Hut', 'Stuffed Crust Hawaiian Chicken — regular', '1 slice · 108 g', 270),
  moh('Pizza Hut', 'Stuffed Crust Island Supreme — large', '1 slice · 125 g', 330),
  moh('Pizza Hut', 'Stuffed Crust Island Supreme — regular', '1 slice · 93 g', 250),
  moh('Pizza Hut', 'Stuffed Crust Pepperoni Delight — large', '1 slice · 107 g', 280),
  moh('Pizza Hut', 'Stuffed Crust Pepperoni Delight — regular', '1 slice · 80 g', 210),
  moh('Pizza Hut', 'Stuffed Crust Veggie Lover — large', '1 slice · 137 g', 300),
  moh('Pizza Hut', 'Stuffed Crust Veggie Lover — regular', '1 slice · 100 g', 200),
  moh('Pizza Hut', 'Mushroom Soup', '1 serving · 224 g', 70),
  moh('Marrybrown', 'Chicken Burger', '1 burger · 156 g', 326),
  moh('Marrybrown', 'Fish Fillet Burger', '1 burger · 158 g', 371),
  moh('Marrybrown', 'Hotouch Burger', '1 burger · 171 g', 453),
  moh('Marrybrown', 'Lucky Plate Original', '1 serving · 454 g', 844),
  menu('Subway', 'Italian B.M.T. wrap', subwaySource),
  menu('ZUS Coffee', 'Iced Spanish Latté', zusSource),
  menu('ZUS Coffee', 'CEO Latté', zusSource),
  menu('ZUS Coffee', 'Iced Matcha Latté', zusSource),
  menu('ZUS Coffee', 'Buttercrème Latté', zusSource),
  menu('ZUS Coffee', 'Iced ZUS Gula Melaka', zusSource),
  menu('CHAGEE', 'BO·YA Jasmine Green Milk Tea', chageeSource),
  menu('CHAGEE', 'White Peach Oolong Milk Tea', chageeSource),
  menu('CHAGEE', 'Da Hong Pao Milk Tea', chageeSource),
  menu('CHAGEE', 'Tie Guan Yin Milk Tea', chageeSource),
  menu('CHAGEE', 'Osmanthus Long Jing Milk Tea', chageeSource),
  menu('CHAGEE', 'Camellia Oolong Milk Tea', chageeSource),
]

export const RESTAURANT_BRANDS: RestaurantBrand[] = ['KFC', "McDonald's", 'Pizza Hut', 'Subway', 'ZUS Coffee', 'CHAGEE', 'Marrybrown']

function normalizeRestaurantText(value: string): string {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function hasCompleteMacros(item: RestaurantFood): item is RestaurantFood & { kcal: number; protein: number; carbs: number; fat: number } {
  return item.kcal !== null && item.protein !== null && item.carbs !== null && item.fat !== null
}

export function searchRestaurantFoods(query: string, brand: RestaurantBrand | null = null, limit = 50): RestaurantFood[] {
  const q = normalizeRestaurantText(query)
  const terms = q ? q.split(' ') : []
  return RESTAURANT_FOODS
    .filter(food => !hasExcludedIngredients(food.name))
    .filter((food) => !brand || food.brand === brand)
    .map((food) => {
      const hay = normalizeRestaurantText(`${food.brand} ${food.name}`)
      const score = terms.every((term) => hay.includes(term)) ? terms.reduce((sum, term) => sum + term.length, 0) : -1
      return { food, score }
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || Number(hasCompleteMacros(b.food)) - Number(hasCompleteMacros(a.food)) || a.food.brand.localeCompare(b.food.brand) || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map(({ food }) => food)
}

/** Exact names only: an unqualified dish must never inherit a chain's recipe. */
export function matchRestaurantFood(query: string): RestaurantFood | null {
  const needle = normalizeRestaurantText(query)
  if (!needle) return null
  return RESTAURANT_FOODS.find((food) => !hasExcludedIngredients(food.name) && normalizeRestaurantText(`${food.brand} ${food.name}`) === needle) ?? null
}
