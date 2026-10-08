// Reviewed exclusions, not a halal allowlist. Do not infer suitability from cuisine.
// Evidence is retained so exclusions can be rechecked when outlets change.
export const restaurantExclusions = [
  { name: 'AH YIP HERBAL SOUP', source: 'https://www.shopklcc.com/shop/ah-yip-herbal-soup-plaza-low-yat', reason: 'Malaysia menu lists pork bladder chicken' },
  { name: 'SUSHI JIRO', source: 'https://www.malaymail.com/news/life/2021/03/25/klang-valley-sushi-chain-refutes-womans-claims-that-it-secretly-serves-pork/1960924', reason: 'Reported alcohol service, not inferred from certification alone' },
  { name: 'JU BANQUET & RESTAURANT', source: 'https://www.lemon8-app.com/%40malaysianfoodie/7671310212351017490?region=my', reason: 'IOI outlet pork and baijiu dining event' },
  { name: 'SUSHI ZANMAI', source: 'https://visitshahalam.com/shop/sushi-zanmai-sunway-pyramid', reason: 'Malaysia menu includes beer and sake' },
  { name: 'RAKUZEN', source: 'https://halalketak.com/brands/japanese/', reason: 'Malaysia drinks menu serves alcohol' },
  { name: 'SUSHI TEI', source: 'https://www.tripadvisor.ca/Restaurant_Review-g298570-d7191679-Reviews-Sushi_Tei-Kuala_Lumpur_Wilayah_Persekutuan.html', reason: 'Malaysia outlet serves beer' },
  { name: 'IPPUDO', source: 'https://www.ippudo.com.my/our-menu', reason: 'Pork dishes' },
  { name: 'DRAGON-I', source: 'https://www.ioicitymall.com.my/blog/?pagedetail=1001%2F1000', reason: 'Mall explicitly identifies non-halal outlet' },
  { name: 'GO NOODLE HOUSE', source: 'https://www.ioicitymall.com.my/about-tenant/?pid=813', reason: 'Wine broth; mall also lists pork dishes' },
  { name: 'SOUPER TANG', source: 'https://www.soupertang.com/SalePage/Index/317364', reason: 'Pork dishes' },
  { name: 'ZOK NOODLE HOUSE', source: 'https://www.zoknoodlehouse.com.my/', reason: 'Pork belly noodles' },
  { name: 'HAIDILAO', source: 'https://www.foodpanda.my/restaurant/v8xp/haidilao-hai-di-lao-ioi-city-mall', reason: 'IOI outlet menu lists pork collar' },
  { name: 'HO MIN SAN', source: 'https://erisgoesto.com/2025/07/12/ho-min-san-ioi-city-mall-putrajaya/', reason: 'IOI outlet pork bone broth' },
  { name: 'MO-MO PARADISE', source: 'https://www.malaysianfoodie.com/2022/11/mo-mo-paradise-opens-in-isetan-the-gardens.html', reason: 'Malaysia menu serves pork' },
  { name: 'YING XIAN CANTON CUISINE', source: 'https://wanderlog.com/place/details/13686919/ying-xian-canton-cuisine-%25E8%25B5%25A2%25E9%25B2%259C%25E6%25B5%25B7%25E9%25B2%259C%25E5%25A4%25A7%25E6%258E%2592%25E6%25A1%25A3ioi-city-mall-2', reason: 'IOI outlet pork lard dishes' },
]
export const restaurantNameKey = name => String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
export const isNonFoodBusiness = name => /\buptown sports\b|\bsporting goods\b|\bsports? (shop|store|equipment|centre|center)\b|\b(hardware|pharmacy|dental|car wash|fitness centre|gymnasium|vape shop)\b/i.test(name)
export const isExcludedRestaurant = name => {
  const key = ` ${restaurantNameKey(name)} `
  return restaurantExclusions.some(item => key.includes(` ${restaurantNameKey(item.name)} `)) || /restaurant\s*&\s*bar|wine bar|\bpub\b|\bbrewery\b|\bthe barn\b/i.test(name)
}
