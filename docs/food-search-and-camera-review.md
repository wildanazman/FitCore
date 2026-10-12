# Food search and component correction

Search food and camera component replacement share `FoodReferencePicker`: one search box, Food/Drinks filters, restaurant browsing, saved/offline references and deliberate online search. Results show reference portions, kcal, known macros and expandable provenance. KKM missing macros stay unknown. Blank initial queries do not show a long catalog. Online matches include multiple database/AI sources; typing alone never starts AI requests. Query changes and unmount abort obsolete responses.

Actual Open Food Facts product photos are shown when provided, restricted to its image host. Local dishes/KKM entries usually have no image. The interface does not invent photos or infer nutrition from a random image; the user's captured plate photo remains their photo. Reference images are labelled product references.

Each camera meal component has Change / serving, portion adjustment and removal/undo. Its inline replacement search supports local, KKM, restaurant, online and manual entries; serving multipliers and explicit gram references can be adjusted before apply. Missing food/drinks can be added independently. Known component nutrients scale with portions; calories are summed from the updated components. Per-component source links survive saving.

If a changed component lacks any macro, whole-meal macro totals are hidden and logging is blocked until the user enters/reviews all three totals. Unknown is never silently treated as zero. Whole-meal macro editing retains the component list. Corrections do not require rerunning paid photo analysis. Ingredient-policy checks apply to every saved component, not only the overall meal name.

Verification: `scripts/check-food-corrections.mjs` checks references/filtering, unambiguous gram portions, kcal-only records, scaling, recalculation, unknown macro review, immutable inputs and product-image host restrictions. No user meal is logged by tests; no photo is sent to AI for these checks.
