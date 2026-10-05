# Malaysia restaurant nutrition snapshot

FitCore bundles `src/lib/restaurantFoods.ts` for offline search. It is a **partial, source-linked snapshot**, not every current menu item. Restaurant recipes, serving sizes, promotions and drink customisations change. Do not fill gaps using nutrition from another country or make up macro grams from calories.

| Brand | Menu records | Calories | Full kcal + P/C/F | Source |
| --- | ---: | ---: | ---: | --- |
| KFC | 21 | 21 | 21 | [KFC Malaysia nutrition facts](https://kfc.com.my/nutrition-facts) |
| McDonald's | 7 | 7 | 7 | [McDonald's Malaysia product pages](https://www.mcdonalds.com.my/menu) (site states figures as of October 2020) |
| Pizza Hut | 18 | 18 | 0 | [Malaysia Ministry of Health calorie bank](https://hq.moh.gov.my/nutrition/wp-content/uploads/2025/10/Bank-Calorie-Bahagian-Pemakanan-merged.pdf) |
| Marrybrown | 4 | 4 | 0 | [Malaysia Ministry of Health calorie bank](https://hq.moh.gov.my/nutrition/wp-content/uploads/2025/10/Bank-Calorie-Bahagian-Pemakanan-merged.pdf) |
| Subway | 1 | 0 | 0 | [Malaysia menu example](https://subway.com.my/wraps/italian-b-m-t) |
| ZUS Coffee | 5 | 0 | 0 | [ZUS Coffee Malaysia menu](https://zuscoffee.com/menu/) |
| CHAGEE | 6 | 0 | 0 | [CHAGEE Malaysia menu](https://chagee.com.my/product/milk-tea-series) |

Items with complete nutrition can be logged immediately. Calorie-only/menu-only items prompt the user to supply missing numbers before logging, so `0 g` never silently means “unknown.” Each item has a source link in the food picker. A packaged or customised item should be checked against its actual nutrition label or portion.

To expand coverage, add one item with its Malaysian source URL, the exact serving/size, kcal, and either all three macros or `null` for each unknown macro. Verify each number against the source before merging, and update the counts above.
