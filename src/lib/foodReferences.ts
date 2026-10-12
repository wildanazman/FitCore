import { searchLocalFoods } from './localFoods'
import { searchRestaurantFoods, type RestaurantBrand, type RestaurantFood } from './restaurantFoods'
import { sourceLabel, type LookupResult } from './foodLookup'

export interface FoodReference {
  id:string; name:string; serving:string; kcal:number|null
  protein?:number; carbs?:number; fat?:number
  sourceLabel:string; sourceUrl?:string; note?:string; imageUrl?:string
  kind:'meal'|'drink'
}
export function referenceWarning(item:FoodReference):string|undefined {
  if(/asas minuman/i.test(item.note??''))return 'Base only — milk, sugar and creamer are NOT included.'
  if(/tambahan untuk|Komponen tambahan/i.test(`${item.name} ${item.note??''}`))return 'Ingredient addition only — not the whole drink or meal.'
  if(/suspicious|suspiciously/i.test(item.note??''))return 'Source value flagged. Check its source before using.'
  if(/weight unit missing/i.test(item.note??''))return 'Weight unit not stated in source; portion is not a measured gram amount.'
  return undefined
}
export function foodKind(name:string,category?:string):FoodReference['kind'] {
  if(/\b(cake|bread|cookie|croissant|kek|roti|biskut)\b/i.test(name))return 'meal'
  if(/\bmilk tea\b|\blatt[eé](?:\s|$)|\bcappuccino\b|\bamericano\b/i.test(name))return 'drink'
  return category==='Drink'||/^(?:.*? · )?(air\b|teh\b|kopi\b|coffee\b|tea\b|jus\b|juice\b|susu\b|milk\b|milo\b|latte\b|cappuccino\b|espresso\b|matcha\b|smoothie\b|iced\b|hot chocolate\b)/i.test(name.trim())?'drink':'meal'
}
export function publishedReference(item:RestaurantFood):FoodReference {
  const name=item.brand==='KKM'?item.name:`${item.brand} · ${item.name}`
  return {id:`${item.sourceUrl}:${name}:${item.serving}:${item.kcal}`,name,serving:item.serving,kcal:item.kcal,protein:item.protein??undefined,carbs:item.carbs??undefined,fat:item.fat??undefined,sourceLabel:item.sourceLabel,sourceUrl:item.sourceUrl,note:item.note,kind:foodKind(name)}
}
export function offlineReferences(query:string,brand:RestaurantBrand|null,kkm:RestaurantFood[]):FoodReference[] {
  const local=!brand&&query.trim()?searchLocalFoods(query,45).map(item=>({id:`local:${item.name}:${item.serving}`,name:item.name,serving:item.serving,kcal:item.kcal,protein:item.protein,carbs:item.carbs,fat:item.fat,sourceLabel:item.nutritionSource??'Local serving estimate',sourceUrl:item.nutritionSourceUrl,kind:foodKind(item.name,item.category)})):[]
  const published=query.trim()||brand?[...searchRestaurantFoods(query,brand,45),...(!brand?kkm:[])].map(publishedReference):[]
  return [...published,...local]
}
export function onlineReference(item:LookupResult):FoodReference {
  return {...item,sourceUrl:item.sourceUrl&&/^https:\/\//i.test(item.sourceUrl)?item.sourceUrl:undefined,id:`${item.source}:${item.name}:${item.serving}`,sourceLabel:sourceLabel(item.source),kind:foodKind(item.name)}
}
export function referenceGrams(serving:string):number|undefined {
  const match=/(?:^|·\s*)(\d+(?:\.\d+)?)\s*g\s*$/i.exec(serving)
  return match?Number(match[1]):undefined
}
