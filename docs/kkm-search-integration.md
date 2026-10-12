# KKM calorie references in Search food

12 October 2026. Both user-supplied PDFs are imported locally: 811 Selangor records and 2,547 HQ records. The merged searchable catalog currently has 3,357 records after exact cross-source duplicate removal and the shared ingredient filter. These are reference portions, not measurements or halal certifications of the user's food.

Search food loads this catalog on demand, rather than adding it to the initial Home bundle. Matching considers names and English aliases. Results retain household serving, explicit g/ml weights, calorie values, source page links and extraction/source warnings. Missing weight units remain unknown; no 400 g portion is inferred for HQ Nasi Arab. Different portion/calorie alternatives remain separate.

Neither PDF supplies protein, carbohydrate or fat here. All three remain null in the reference catalog, blank in Review portion, and absent from the protein preview until entered. The current logging model requires users to supply missing macros before saving a calorie-only reference; no automatic zero macros are created. Source links survive saving through the existing custom-food workflow.

Ingredient filtering uses narrow poultry/vegetarian and Ham Chi Peng exceptions; independent pork, lard and alcohol terms still exclude a result. This filter does not verify restaurant certification or preparation.

Verification: `scripts/check-kkm-foods.mjs` checks source counts, unique IDs, source-page links, calories, explicit missing macros, the Nasi Arab missing-unit warning, Nasi Lemak 230 g / 389 kcal, keyword search and ingredient exceptions. Live local Search food and Nasi Arab Review portion were checked without saving or changing user logs. Broader food-catalog browser automation could not launch its Chromium in the sandbox; its preceding normalization checks passed. Type checking and production build pass.

Import methods and source caveats are documented separately in `kkm-selangor-import.md` and `kkm-hq-import.md`.
