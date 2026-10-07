# Running restructuring documentation

Date: 2026-10-08. Mode: Operate. Classification: restructuring within FitCore's incumbent visual world.

## Authority and scope

Read PRODUCT.md, DESIGN.md, .impeccable/design.json, .impeccable/running-progression-brief.md, the Impeccable document reference, src/screens/Train.tsx and src/screens/running.css. The shared store's plan-regeneration path was inspected to confirm preservation language. This handoff updates only the running surface brief and this report. DESIGN.md and its sidecar remain authoritative and unchanged; source and CSS are outside this documenter's write boundary.

## Shipped behavior

The route separates This week, Full plan, Paces and Build a plan with labelled controls and aria-pressed state. Saved plans enter the weekly ledger; profiles without a start date enter the builder. This week prioritizes the goal, week navigation, phase and load totals followed by dated sessions. Workout names, pace ranges, labelled warm-up/main-set/recovery/cool-down rows and visible units make the next run legible. Full plan owns readiness and the horizontally contained progression table; selecting its week opens that week's ledger. Paces retains the prescription and collapsed methodology.

The builder proceeds through Runner → Goal → Week → Review. Forward movement validates the active stage, unreached progress controls are disabled, and Back/review edit actions retain draft values. Runner accepts finish time or min/km for 5K, 10K, HM or FM, or explicit No result yet. Recent weekly distance, recent frequency, experience and longest comfortable run are required; explicit zero values support a new runner. Known ability immediately produces starting easy/tempo/interval ranges. Preview calculation includes running before the saved sports selection contains it, so a new runner can inspect sessions before committing.

Review exposes goal, schedule, starting load, generated peak distance/week, base-versus-race assessment and dated week-one workout/pace rows. Save replaces upcoming prescriptions and returns to week one. Conditional pace progression is described as a target rather than measured fitness or a guaranteed finish.

Dates and available days are checked before review and again before saving. A focused event block can span at most 26 weeks (an event offset no greater than 181 days); profile-specific minima still apply. For a distant event, the inline suggested-start action moves the draft closer to the event only after a click. The dates otherwise remain visible and continuation is blocked. Existing longer saved plans stay accessible with a date-review prompt.

Completed history is retained by the store's regeneration path, including original completed session records and manual activity. The ledger merges matching completion state by scheduled-run identity and exposes unmatched earlier-plan completions in a separate native disclosure. Such history does not count as completing a replacement prescription. Saved feedback explicitly describes device-local persistence and retained history.

## Incumbent visual-system comparison

The structure implements PRODUCT's daily task hierarchy and DESIGN's daily digital ledger: shared TopBar, focused route shell, chalk ground, navy information, cobalt actions/selection, inherited Hanken Grotesk, tabular measurements, restrained white grouping and open divided rows. No concept seed, identity replacement or illustration is introduced. Route-specific chapter labels, workload arrangement and builder facts remain surface guidance rather than new system primitives.

Compact weekly spacing brings the first session forward; rest rows receive less vertical space than workout rows. The final scoped correction removes the weekly page tagline, places saved confirmation below the task and condenses the goal subtitle to its required pace/event information. Preferred-day controls preserve 44px width and minimum height through contained horizontal scrolling. Week navigation and completion buttons are 44×44px, builder actions at least 52px high, fields 50px high and route controls at least 48px high. Below 360px, fields become one column and instruction labels stack. Source exposes pressed/current-step state, labelled fields, alerts/status messages and visible cobalt focus outlines. These are inspected implementation properties, not a comprehensive WCAG or assistive-technology audit.

Advisory drift remains: the existing route CSS repeats literal palette/type values instead of uniformly binding shared tokens. Supporting ink (#526079), assessment ink (#244caa), field border (#ccd6e7), caution tones (#fff0e5 / #783719), incidental 9px corners and local type sizes/weights are not all normative DESIGN.md frontmatter primitives. Most literal cobalt/navy/line values match the incumbent world. These are pre-existing route variants and advisory token/type drift, not evidence of a new visual system. DESIGN.md's older Running navigation sentence still describes This week / Race & setup; the current four-destination structure is recorded in the surface brief without broadening this task into a global documentation rewrite. No drift was repaired.

## Verification and finish evidence

The implementation agent reports passing scripts/check-running-weight.mjs and isolated-browser verification at 320, 469 and 1200px, including the four builder stages, validation gates, backward editing, first-time live preview, saving, history preservation, weekday target sizing, contained scrolling and invalid/distant-event cases. TypeScript verification also passes. These results are supplied implementation evidence; this documenter did not rerun browser flows. The established script remains the regression reference for running and weight calculations. Evidence does not establish clinical readiness, personalized coaching equivalence, or complete accessibility conformance.

Final capture set: running-ledger-320.png, running-ledger-469.png, running-ledger-1200.png; running-builder-320.png, running-builder-469.png, running-builder-1200.png; running-review-320.png, running-review-469.png, running-review-1200.png. All are under .impeccable/review/ and are browser review evidence. The implementation agent reports that the final captures were refreshed after the bounded correction. The independent finish reviewer returned a scoped **ship** verdict: the previously flagged first-workout visibility at 320/1200px is resolved, and all previously reported findings are resolved. This is a verdict on the running restructuring and its final evidence, not a fresh audit of the entire app. Earlier running-goals/mobile/schedule and shared-header images are not the final revamp evidence.

## Asset provenance

No shipping raster asset was introduced. Header/logo and interface geometry remain code-led. The nine named PNGs are test captures for review and do not ship as interface artwork. Existing meal/progress photographs remain user content.
