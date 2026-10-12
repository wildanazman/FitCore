// Conservative exclusion, not halal certification. Unknown preparation still needs checking.
export function hasExcludedIngredients(value) {
  const text = String(value || '')
    .replace(/\bham[\s-]+chi[\s-]+peng\b/gi, '')
    .replace(/\b(chicken|turkey|vegetarian|vegan|ayam|kalkun)[\s-]+(ham|bacon|char[\s-]+siew|char[\s-]+siu)\b/gi, '')
    .replace(/\b(ham|bacon|char[\s-]+siew|char[\s-]+siu)[\s-]+(chicken|turkey|vegetarian|vegan|ayam|kalkun)\b/gi, '')
  return /\b(pork|babi|khinzir|bacon|ham|lard|wine|beer|bir|arak|rum|vodka|whisky|whiskey|brandy|mirin|sake|alcohol|alkohol|liqueur|liquor|gelatin|gelatine|char siu|char siew|bak kut teh|blood|darah|porc|jambon|lardon|schwein|cerdo|cerveza)\b|猪肉|豬肉|猪油|豬油/i.test(text)
}
