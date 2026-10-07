# Free food API integration — 2026-10-07

Directory reviewed: https://freeapihub.com/categories/food-and-drink (seven listed resources). A directory's “free” label is not a license or a guarantee of production suitability.

| Provider | FitCore decision | Reason / authoritative reference |
| --- | --- | --- |
| Open Food Facts | Integrated: explicit packaged-food search, barcode lookup, ingredient/allergen preview and portion-scaled macros | https://openfoodfacts.github.io/openfoodfacts-server/api/ — community data, no accuracy guarantee; attribution/ODbL apply. |
| USDA FoodData Central | Integrated: multiple ingredient results, preparation review, per-100g scaling | https://fdc.nal.usda.gov/api-guide/ — public domain/CC0, free personal API key, demo access is limited. |
| TheMealDB | Optional recipe-only adapter; test key in local development, licensed server key required in production | https://www.themealdb.com/api.php and https://www.themealdb.com/terms_of_use.php — free key is for development/education, not an app-store production entitlement; recipes have no supplied calorie/macronutrient totals. |
| Foodish | Not integrated | https://foodish-api.com/ — random images, not recipe, nutrient or restaurant data. Using them as actual meal photos would mislead users. |
| TheCocktailDB | Not integrated | https://www.thecocktaildb.com/api.php — drinks/alcohol-oriented, no full meal nutrition and separate production access terms; does not fit the requested halal-only workflow. |
| Open Brewery DB | Not integrated | https://www.openbrewerydb.org/documentation — brewery directory, not a suitable restaurant/nutrition source. |
| TacoFancy | Not integrated | https://github.com/evz/tacofancy-api — self-hostable code, not the hosted JSON `/tacos` endpoint the directory implies. No verified suitable nutrition feed. |

## Usage and setup

Food → Add food → **Free databases & barcode lookup**. Search runs on explicit submit, never while typing. Local Malaysian references remain the default. Select a result, review preparation, choose grams (or label-matching volume for OFF), check the packet/suitability, then log to the selected date and meal slot. Source and source URL are retained in the log. Incomplete macro entries and obvious prohibited ingredients are excluded, not filled with zero. Allergen absence is unknown, not “allergen-free”.

Vite runs new `/api/food-catalog` and `/api/nearby-restaurants` functions locally. Server-only `.env.local` variables:

- `USDA_FDC_API_KEY`: obtain a free key from https://fdc.nal.usda.gov/api-guide/. Without it, DEMO_KEY has 30 requests/hour and 50/day per provider docs.
- `THEMEALDB_API_KEY`: licensed key for production. Local `NODE_ENV=development` alone permits test key 1. No public release/app-store license is implied.
- `GOOGLE_PLACES_API_KEY`: optional restaurant finder; not supplied by these seven APIs and not replaced by a free brewery/cocktail database.

No new credentials are put in browser storage or `VITE_` variables. Restart Vite after local key changes; deploying to Vercel requires corresponding server env configuration and a separately authorized push/deploy.

## Rate limits, storage and licensing

OFF docs currently specify 10 search requests/minute/IP and 15 product reads/minute/IP. New adapter uses short response caching and conservative process-local throttles; this is not a distributed limiter. Public multi-instance deployments must add a shared limiter to protect provider quotas. USDA demo counters are process-local, not a promise to reserve a shared upstream quota. Errors show retry guidance rather than silently substituting AI nutrition.

Name search uses the official Search-a-licious `/search?q=...` endpoint and its `hits` response; barcode reads use OFF v3. The older `/cgi/search.pl` endpoint failed in live verification, so it is not used. [Search-a-licious API reference](https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/). Local live verification passed for name search, barcode lookup and USDA ingredient search. Results still need explicit selection and label checks, not automatic logging or assumed relevance.

Only on-demand results are fetched, with a maximum of 12 candidates. No bulk crawling or merged offline database is created. OFF data remains source-labeled and transient in memory; a user's confirmed food log keeps its origin. Keep ODbL/Database Contents License attribution in any distribution or dataset export, and review share-alike requirements before creating a combined public database. Product images are not imported. USDA attribution remains visible though its data is CC0. TheMealDB source/copyright attribution is preserved; its recipes are never assigned invented nutrition or logged as zero-calorie meals.

## Halal-first policy

Shared exclusion covers obvious pork/babi/bacon/lard/alcohol ingredients and common equivalents, in offline search, API normalization, manual/ChatGPT import and camera-save guard. Known prohibited suggestions are removed; historical user records are preserved. Screening is not halal certification and cannot detect every language, hidden ingredient or preparation method. Foods still require packet/vendor checking. Restaurants follow the user's clarification: exclude explicit pork/alcohol names, bars and reported alcohol service, not Chinese cuisine or every place lacking a certificate. Unknown status is disclosed, not promoted as certified halal.
