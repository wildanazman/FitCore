# Nike Run Club: plan investigation

Date: 2026-10-15. Interpreted the user's 'night run club' as Nike Run Club (NRC), disclosed before research. Research only: no application edits or deployment in this pass.

## Evidence and scope

REA browser scenario: `ev_3e8986adf51b97217d2dc97e1a14e28e20a9fe873e9ccee5b226e238421e86d9`, controlled replay of https://www.nike.com/running/half-marathon-training-plan in a provider-owned Chromium process, empty storage, English/US, reduced motion, 1280×720. Final accessibility snapshot digest `102908ab2987392bc724698be506c1ad9006b62b8530028e849147da4c5f4f16`. Observed public plan overview, week samples, run categories and official PDF link. Location dialog also present. No Nike login, native application, private API, model weights or internal algorithm observed. The owned browser process was terminated by the provider. REA establishes this public rendered content, not native app personalization.

Official-document corroboration: Nike plan pages, Help and linked PDFs. A separate research worker reviewed current official scope and discrepancies. No paid trials or subscriptions started.

## Public program choices — answered

[Nike's public plan hub](https://www.nike.com/running/training-plans) lists 5K eight weeks, 10K eight weeks, half marathon fourteen weeks and marathon eighteen weeks. These are published program lengths, not universal minimum preparation times.

[5K](https://www.nike.com/running/5k-training-plan) and [10K](https://www.nike.com/running/10k-training-plan) pages show five-session examples. Their shorter-entry guidance is conditional on being able to perform the prescribed training; not permission for unprepared beginners to compress a plan.

[HM page](https://www.nike.com/running/half-marathon-training-plan) offers three, four or five runs weekly, with recovery, speed and long runs. Its opening example has short timed recovery runs, a timed interval workout, a fartlek session and a 5km long run. Every session has a recognizable job rather than an identical prescription renamed by week.

[Marathon page](https://www.nike.com/running/marathon-training-plan) also describes three to five weekly runs and flexible entry. Its shorter-entry language must not be treated as evidence of readiness for every runner.

## Baseline, pace and recovery — answered for published guidance

[HM PDF](https://www.nike.com/pdf/Nike-Run-Club-Half-Marathon-Training-Plan-Audio-Guided-Runs.pdf), pp3–14: choose a starting pace from a recent 1–2-month 5K/10K/HM/FM result, easy-run records or informed current-fitness estimate. Pace targets are range centres, not commands. Effort, weather and fatigue matter. Separate hard sessions with recovery/rest; avoid consecutive speed days. Pain means stop and reassess. The document permits user adjustments, but does not establish automatic missed-run rescheduling.

Its fourteen-week long-run series is 5, 6.4, 8, 10, 10, 12.5, 15, 16, 16, 13.1 and 20km, followed by 60 minutes, 11km and the event. This illustrates growth, relief and pre-event reduction, not a distance increase every single week.

## Marathon endurance — answered for this PDF edition

[Marathon PDF](https://www.nike.com/pdf/Nike-Run-Club-Marathon-Training-Plan-Audio-Guided-Runs.pdf), pp16–33: long runs begin at 8km, develop through longer distance and time-based sessions, and include reduction weeks. Five weeks to go lists 29–35km; subsequent distance prescriptions reduce to 24–26, 19–23 and 16km before the event week. This is a published example, not an instruction to copy 35km into every runner's plan. The weekly prescription also mixes easy/recovery work and quality sessions; the goal is not making every run harder.

## Native app interaction — partially answered

[Nike Help](https://www.nike.com/help/a/nrc-plan) documents selecting a plan on the phone and starting its individual sessions, including subsequent Apple Watch use. Audio Guided Runs provide coaching during sessions. This investigation did not verify the native UI, offline/background playback, the exact plan variant on a Malaysian account, or any private personalization engine.

Version discrepancy: [US Apple listing](https://apps.apple.com/us/app/nike-run-club-running-coach/id387771637) describes a twelve-week marathon journey while Nike's current public hub/Help say eighteen weeks. Do not silently combine these into one claimed native implementation. Automated adaptation, ML, goal-time optimization and automatic pace recalibration remain unverified.

## FitCore source comparison and synthetic reproduction

Read-only inspection: src/lib/plan.ts `weekCapability`, `generatePlan`, `evaluateRunningPlan`. Generated sessions in memory using DEFAULT_PROFILE and synthetic adult runner inputs; no real logs read or changed.

Common inputs: start 2026-10-12, no event date, running weekdays Mon/Wed/Fri/Sat, four requested days, three recent days, regular experience, known 5K benchmark.

- 5K: eight weeks, longest5km, recent15km/week, benchmark35min, desired25min. Long-session maximum7.45km. Existing code appropriately does not directly treat the aspirational25min as measured fitness.
- HM: fourteen weeks, longest10km, recent25km/week, benchmark30min. Maximum21km at week11, followed by16.8,13.7,13.7km. This is different from the official example, not automatically incorrect.
- FM: eighteen weeks, longest18km, recent40km/week, benchmark30min. Long-run series17.37,19.4,20.55,18.1,24.5,26.4,28.6,24.7,32,32,32,25.6,32,32,32,16.6,20.8,20.8km. The first32km appears at week9; fixed peak clamping creates repeated peaks; independent cutback/taper multipliers produce a later rebound. Readiness evaluation still labels this a race build. These facts reproduce the current formula; whether this exact workload suits an individual is not established.

Source inference: independent exponential distance growth, weekly-budget scaling and fixed cutback/taper multipliers can conflict. The current pace change is an explicit bounded product heuristic, not NRC's disclosed algorithm and not measured fitness improvement. Existing checkpoints and weekly feedback are valuable and should be preserved.

## Original FitCore recommendations — not claims about NRC internals

1. Separate current ability, desired result and expected training progression. Show each clearly; never promise a large finish-time jump.
2. Design the full block's workload first: entry requirements, build weeks, recovery weeks, endurance peak and race-specific taper. Validate the final assembled plan, not independent formulas alone.
3. Use separate race-specific rules for 5K/10K/HM/FM. Don't force long-distance endurance logic into 5K speed preparation.
4. Present each run as purpose + warm-up + main work + recovery + cool-down, with explicit units and a numeric range when the baseline supports it.
5. Support moving a session without putting hard efforts together, and review missed weeks rather than stacking make-up mileage.
6. Calibrate pace from new performance input when available. Label any planned faster range as conditional; effort and recovery can override it.
7. Add automated plan checks for early repeated endurance peaks, taper rebounds, excessive hard-session clustering, implausible time budgets and instructions inconsistent with totals.
8. Guided-run timing/audio should be original content; no copying Nike's recordings or implying Nike affiliation.

## Question closure

- Program selection/duration: answered for public editions; native regional/version discrepancy remains.
- Weekly structure, pace reference and long-run examples: answered for official documents.
- Public rendered page: observed with REA and corroborated.
- Internal adaptive/ML algorithm: unresolved, not inferred from marketing.
- FitCore implications: source-based recommendations with three synthetic reproductions; no implementation authorized or performed by this research-only request.

## Follow-up implementation after user said “copy”

Adapted published structural principles, not Nike branding, recordings, exact workout collection or undisclosed algorithm. `runningBlock` now plans the endurance envelope across the available build weeks instead of reaching a fixed cap early. Reduction weeks remain; the last build week is protected from an arbitrary cutback. The assembled taper is constrained after mileage budgeting so both weekly volume and long-session distance cannot rebound. These are explicit FitCore policies, not universally validated workload limits.

Added controlled fartlek variation, purposeful recovery weeks without mandatory timed tests, retained parentheses describing recoveries in main-set instructions, and purpose-oriented session notes. Baseline/checkpoint/feedback behaviour and completed-log preservation remain. New10K default is eight weeks; individual readiness still depends on inputs. Unknown-baseline sessions do not invent precise pace targets.

Regression reproduction: same synthetic FM profile now gives long sessions17.37,18.8,19.5,16.3,21.2,22.1,23,19.2,25,26.1,27.1,22.6,29.5,30.7,32,25.6,18.16,10.1km when no event date is set. With an event date, pre-event rest/shakeout rules can remove that last long session. No promise that this exact schedule suits every runner.

Verification: scripts/test-running-block.ts covers24 combinations of race distance, hard/missed feedback and event presence, plus beginner base mode, no fabricated goal-level ability, checkpoint date boundaries, day counts, finite totals and consistent displayed calorie accounting. Production build and TypeScript pass. Browser testing uses a separate synthetic profile; real logs are untouched. No push/deployment in this pass. Automatic rescheduling and a native NRC-like guided-run player are not implemented here.
