// Published per-serving values, Singapore February 2022 (PDF page 1).
// Not verified Malaysia portions; no halal certification is inferred.
export const SUBWAY_SG_SOURCE = 'https://subwayisfresh.com.sg/wp-content/uploads/2022/02/Singapore-Nutrition-Information-Webguide-Feb-2022.pdf'
const cold = ['Chicken Ham','Cold Cut Trio (Turkey Bologna, Turkey Ham, Turkey Salami)','Egg & Mayo','Italian B.M.T. (Chicken Ham, Beef Salami, Beef Pepperoni)','Roast Beef','Subway Club (Turkey Breast, Chicken Ham, Roast Beef)','Tuna & Mayo','Turkey Breast','Spicy Italian (Beef Salami, Beef Pepperoni)','Veggie Delite']
const hot = ['Chicken Bulgogi','Chicken Cutlet','Chicken Teriyaki','Chunky Steak & Cheese','Meatball Marinara','Roasted Chicken Breast Patty','Subway Melt (Chicken Ham, Turkey Breast, Chicken Bacon)','Veggie Patty']
// weight g, kcal, protein g, total fat g, carbohydrates g
const groups: [string, string[], number[][]][] = [
  ['6-inch sub',cold,[[214,272,18.9,4.6,33.4],[214,272,19.8,4,33.7],[228,354,14,16.9,31.2],[220,330,20.4,10.5,33.4],[214,281,24.6,3.7,32.1],[214,270,20.7,3.7,33.1],[228,455,22.1,24.5,31.2],[214,264,19.6,3.3,33.5],[226,389,22,16.4,33.4],[154,207,10.2,2.2,31.1]]],
  ['6-inch sub',hot,[[247,328,27.1,4.4,38.8],[271,463,30.1,15.8,44.9],[247,320,27.2,4.1,38.2],[237,343,30.6,7.9,32.4],[259,381,22.8,12.4,40],[225,286,24.8,3.7,33.2],[241,326,24,7.4,34.8],[234,407,14.9,12.9,53.7]]],
  ['wrap',cold,[[209,268,14.4,7.7,33.4],[209,268,15.3,7.1,33.7],[223,350,9.5,20,31.1],[215,326,16,13.6,33.4],[209,277,20.1,6.8,32.5],[209,266,16.2,6.8,33.1],[223,451,17.6,26.1,31.2],[209,260,15.1,6.4,33.5],[221,385,17.5,19.5,33.3],[149,203,5.8,5.4,31.1]]],
  ['wrap',hot,[[241,324,22.7,7.5,38.5],[266,459,25.6,18.9,44.9],[241,316,22.7,7.2,38.2],[231,339,26.1,11,32.3],[254,377,18.3,15.5,40],[220,282,20.3,6.8,33.1],[235,322,19.5,10.5,34.8],[229,403,10.4,16,53.7]]],
  ['flat bread',cold,[[231,316,17.4,7.4,45.5],[231,316,18.4,6.7,45.9],[245,398,12.5,19.6,43.3],[237,374,19,13.2,45.5],[231,325,23.1,6.4,44.2],[231,314,19.2,6.5,45.5],[245,499,20.6,27.2,43.3],[231,308,18.2,6,45.7],[243,433,20.5,19.1,45.5],[171,251,8.8,5,43.2]]],
]
export const SUBWAY_SG_FOODS = groups.flatMap(([kind,names,rows]) => rows.map(([grams,kcal,protein,fat,carbs],index) => ({brand:'Subway' as const,name:`${names[index]} — ${kind} (Singapore)`,serving:`1 ${kind} · ${grams} g`,kcal,protein,fat,carbs,sourceUrl:SUBWAY_SG_SOURCE,sourceLabel:'Subway Singapore nutrition · February 2022',note:`Singapore 2022 reference, not Malaysia-specific. Includes listed vegetables on ${kind==='6-inch sub'?'multigrain bread':kind==='wrap'?'multigrain wrap':'flat bread'}. Custom cheese, sauces and extras can change totals. Check current ingredients and halal suitability.`})))
