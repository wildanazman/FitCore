# Running progression and weight feedback

Mode: Operate. Preserve the FitCore chalk/navy/cobalt visual world.

## Direction contract

THESIS: A weekly training ledger, not a stack of coaching essays. A runner can find today's type, pace, distance and main set before reading methodology.

OWN-WORLD: Inherit chalk, navy, cobalt and Hanken Grotesk. Open dated rows, a restrained white schedule surface, pressed cobalt controls and tabular measurements. No new identity or illustration assets.

STORY: Enter actual ability, choose an ambition, fit running into a real week, inspect the generated block, then complete dated sessions. Preserve historical records.

FIRST VIEWPORT: Shared header and four compact route controls, goal line, week navigation, week workload strip, then the first dated workout. Build Plan opens with a four-stage progress rail and current ability fields, not race targets.

FORM: Precisely scoped restructuring of the existing running surface; no concept seed needed. Signature interaction is a validated four-step draft with editable review and live week-one pace preview. Full progression has a dedicated view rather than preceding every daily agenda.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, verdict and route-local documentation. This is restructuring within the incumbent world: preserve DESIGN.md and .impeccable/design.json. Review screenshots are evidence, not shipping raster assets; no shipping raster is introduced.

Workout naming: lead with Easy Run, Long Run, Tempo Run, Interval Run, Race Pace Run or Benchmark Run, then a short modifier. Do not call conventional intervals Fartlek or pace-based easy runs MAF: those names imply different workout rules. Structured runKind metadata drives longest-session evaluation; no planner logic should depend on a display title. Short foundation sessions are Easy Run · longer base session, not a claimed race-preparation Long Run. Weekly table and session detail use the same titles.

Running sessions expose pace ranges, distance, warm-up, main set, recovery and cool-down as labelled rows rather than prose. Initial ability accepts finish time or min/km for 5K, 10K, HM and FM; entering it enables pace prescriptions automatically. Require recent weekly mileage, recent frequency, experience and longest comfortable run. Planned pace progression is a conditional target, not measured fitness: quality progresses gently by runner level/goal, easy more gently, recovery weeks ease off, and hard/missed feedback holds progression and reduces volume. Actual results recalibrate future weeks; completed sessions retain original data. HM/FM benchmarks schedule shorter 10K checks, never a repeated full marathon.

An evaluation layer checks missing runner information, minimum block length and actual generated peak endurance. Standard planning minima are 8/10/12/16 weeks for 5K/10K/HM/FM, informed by Runna recommendations; shorter HM/FM blocks have explicit FitCore experience/mileage/long-run gates. Do not imply these gates are a universal medical standard. Underprepared blocks are visibly base-building, not race-ready, and do not get a race taper. Show the actual peak longest session and its week. Low-mileage returning runners ramp frequency, not four tiny sessions immediately. Scaling volume must preserve the longest-session identity so the table never loses it.

Research: Garmin Run Coach uses fitness/recovery metrics; FitCore does not have those watch inputs and must not claim equivalent adaptive coaching. Strava running plans now route to Runna. Runna documents current ability, mileage, frequency and longest run as planning inputs. B.A.A. plans illustrate structured preparation, build, race-specific work and taper; do not copy their protected training schedules. References: https://www.garmin.com/en-US/garmin-technology/garmin-coach/garmin-run-coach/ ; https://support.strava.com/en-us/articles/15401942-training-plans-for-runners ; https://support.runna.com/en/articles/8975787-how-long-should-i-make-my-runna-training-plan ; https://support.runna.com/en/articles/6205998-adjusting-your-estimated-race-time-and-pace-targets ; https://www.baa.org/races/boston-marathon/info-for-athletes/boston-marathon-training/

Weight feedback appears on Home and Body after two distinct-date weigh-ins. Celebrate movement in the selected lose/gain direction, not loss for everyone. Show estimated maintenance, configured daily target and planned balance. Sum only days with food logs between the measurements, label potential incompleteness, never treat missing days as fasting, and never infer calorie deficit directly from scale loss. Rapid weight changes include possible water/glycogen/food shifts. The energy-equivalent conversion is not measured fat change. Under-20 profiles have no calculated feedback; underweight loss is not celebrated.

Verification: scripts/check-running-weight.mjs checks four race distances, weekly pace changes, initial pace/time conversion, HM/FM input, experienced HM/FM endurance peaks, low-mileage foundation classification, hard-week response, measured checkpoint updates, loss/gain direction, missing logs, historical date cutoff, browser errors and overflow at 320/469/1200 px.

## Shipped running structure · 2026-10-08

Running has four labelled, pressed-state destinations: This week, Full plan, Paces and Build a plan. A saved plan opens This week; a runner without a start date enters Build a plan. This week presents the goal, selected week, phase and workload before dated workout rows. The full progression table and readiness explanation belong to Full plan. Paces exposes the current prescription and optional methodology.

Build a plan is a reversible four-stage draft: Runner (actual ability), Goal, Week and Review. Forward navigation validates the current stage; future rail stages remain disabled. Earlier stages and review edit actions preserve the draft. Runner accepts a recent finish time or min/km at 5K, 10K, half marathon or marathon, or an explicit No result yet selection; weekly mileage, recent frequency, longest comfortable run and experience remain required. A known result shows starting easy, tempo and interval ranges immediately. Preview generation includes running even when it is not yet present in the saved sports selection.

Review shows the chosen goal, days and duration, starting load, actual generated peak run/week, readiness classification and dated week-one session/pace preview before saving. Conditional training targets remain distinct from measured ability. Saving replaces upcoming prescriptions while retaining completed runs and manual activity logs; unmatched earlier-plan completions appear in Previous completed runs rather than impersonating a new prescription.

Week validates exact preferred-day count, profile-specific minimum duration and a maximum 26-week event block. An event more than 181 days after the start exposes a suggested closer start and blocks continuation/save until the dates fit. The suggestion changes the draft only when the runner clicks it. Older saved plans over 26 weeks stay readable and receive a rebuild prompt.

The weekly ledger uses compact daily spacing and shorter rest rows. Weekday choices remain at least 44px wide and tall; all seven choices scroll horizontally inside their own region at narrow widths. Fields become one column below 360px and workout instruction labels stack. This adapts the existing focused shell, shared header, chalk/navy/cobalt palette and Hanken type without creating global design primitives.

Final evidence uses running-ledger, running-builder and running-review screenshots at 320, 469 and 1200px under .impeccable/review/. The documentation handoff is .impeccable/review/running-revamp-documentation.md; its validation and verdict claims are attributed to the implementation and independent finish review.
