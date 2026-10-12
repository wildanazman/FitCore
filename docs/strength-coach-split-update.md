# Strength coach: muscle-day splits and set methods

12 October 2026. User requested a stronger plan UI, named chest/back/leg days, support for 4–5 training days and situation-dependent sets/supersets/drop sets. Scope expands beyond the earlier UI-only brief. Logs and backup remain intact; no publish requested.

## Implemented planning behavior

- Muscle days: two full-body sessions; three chest/back/legs sessions; four adds shoulders/abs; five uses chest/back/legs/upper/lower.
- Alternative balanced routine: 2–3 full body, 4 upper/lower, 5 upper/lower plus shoulders/abs.
- Schedule permutes these session types over the actual selected weekdays to minimize repeat primary-muscle days less than two calendar days apart, including the week boundary. This does not model complete biological recovery or all secondary muscle fatigue. Close spacing is warned, not called safe.
- Equipment eligibility is hard-filtered. A sparse body-part day can remain short when equipment is insufficient. Do not fill it with unrelated movements or pretend bodyweight back control equals resisted pulling.
- Beginner/returning profile: two working sets as starter volume, with warm-up sets separate. Regular profile: 3–4 compound working sets and 2–3 accessory sets, reduced to fit session time. This is an initial heuristic, not a claim that every user should train the same volume or that two sets are ineffective.
- Conservative duration estimate accounts for warm-up, transitions, performed reps, unilateral sides and between-set rest; trims volume or the final exercise to fit time. Actual session time varies.
- Experienced, recovered users with <=45 minutes may see an optional accessory/core or antagonist press/pull superset. Round count matches prescribed set counts. Standard rests remain the fallback. A superset is not extra sets.
- Experienced, recovered gym users with a 60-minute muscle-focus session may see one optional machine-isolation drop set. No novice, home-equipment, major free-weight lift, hard-running or close-spacing automatic drop sets. One approximately 20% drop, 8–12 controlled reps, 1–2 reps in reserve. These are conservative app heuristics, not an optimal protocol established by the cited studies. User logs additional work manually.
- Straight-sets-only preference disables both methods. These are recommendations; the app does not infer that they were performed.

## Scientific context and limits

[ACSM 2026 guidance](https://acsm.org/resistance-training-guidelines-update-2026/) emphasizes regular training of major muscle groups and individual goals. Around 10 weekly sets per muscle is a hypertrophy guide, not a universal beginner minimum. Three- and four-day body-part splits here may give only one dedicated session per major group. Users can choose full body/upper-lower instead; the app must not advertise the body-part split as inherently superior.

[2025 superset meta-analysis](https://pubmed.ncbi.nlm.nih.gov/39903375/) supports improved time efficiency with similar longer-term adaptations and greater perceived effort. [2023 drop-set meta-analysis](https://pubmed.ncbi.nlm.nih.gov/37523092/) did not establish superior hypertrophy, with limited evidence. The choices above are conditional execution options, not mandatory advanced techniques or clinical prescriptions.

The trained Fit20 predictor still does not prescribe exercises, volume or load. Current plan selection is a transparent rule-based starter system. It is not a fully trained/validated personal trainer and does not have sufficient injury/readiness, goal-specific outcome or RIR feedback data to claim optimal individual adaptation.

## Media

Release follow-up: eight matching Your Move free app-use clips were visually reviewed and added on 12 October. The lat pulldown uses a rope grip; it is a variant of the same movement, not a claim to show every attachment. Moving coverage is now 30/92; 62 remain without a moving demo. The free-exercise-db-api video library was rejected because its maintainer explicitly cannot establish the footage's ownership. No paid library was bought. Full coverage remains an unresolved media requirement; photos are retained as an honest fallback.

Ten visually reviewed licensed wger MP4s were added to the earlier eight assets, with full-frame rendering and attribution. One misleading provider record was mapped to dumbbell RDL rather than barbell RDL; an overhead cable-extension clip was rejected rather than labelled pushdown. This is not 100% exercise coverage. A coverage audit lists remaining missing moving demos; two-position photos remain honestly labelled and are not counted as videos. Do not replace an exercise with a different movement merely to make coverage look complete.
