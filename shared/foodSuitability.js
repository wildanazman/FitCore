// Conservative exclusion, not halal certification. Unknown preparation still needs checking.
export function hasExcludedIngredients(value) {
  return /\b(pork|babi|bacon|ham|lard|wine|beer|bir|arak|rum|vodka|whisky|whiskey|brandy|mirin|sake|alcohol|alkohol|liqueur|liquor|gelatin|gelatine|char siu|char siew|bak kut teh|blood|darah|porc|jambon|lardon|schwein|cerdo|cerveza)\b|猪肉|豬肉|猪油|豬油/i.test(String(value || ''))
}
