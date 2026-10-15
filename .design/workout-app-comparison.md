# Workout app comparison for FitCore

Research date: 2026-10-15. App identities supplied by the user from the PCMag article. No access to PCMag was attempted after the browser site-safety denial. No native packages, authenticated flows, subscriptions, trials, purchases or private APIs were accessed. These are public product/documentation observations, not a complete reverse engineering of each app.

## Nike Training Club

Source: https://www.nike.com/ntc-app

Observed: Public page describes progressive programs, scheduling, varied workouts and recovery/nutrition guidance. Paid/native workout flow not exercised.

Evidence: ev_412a5fc5eae906cb60593dedc72d0a6627103a2c68baae8bccbf84ec76040435 (public page observed). Capture limited to an isolated public page in Chromium; page content does not establish paid app behavior or internal algorithms.

FitCore design proposal (not observed vendor implementation): Clear session previews: equipment, duration, target muscles, movement demos and warm-up/working sets/recovery.

## Apple Fitness+

Source: https://support.apple.com/en-mide/guide/fitness-plus/apdf222051d8/ios

Observed: Official guide documents selectable weekly days, daily duration, program length, activity types and a review/edit stage. Public page describes history/preferences-based recommendations.

Evidence: ev_9e6d6f52cb7f8a0db494d2e3ed16fe83567697a5555c19804b05bd450c821995 (official guide + public page observed). Capture limited to an isolated public page in Chromium; page content does not establish paid app behavior or internal algorithms.

FitCore design proposal (not observed vendor implementation): A reviewable weekly training calendar; edit one day without regenerating or erasing the rest.

## Future Pro

Source: https://future.co/

Observed: Public page explicitly describes human coach programming, check-ins, schedule changes, evolving plans, demos and voice cues. Human judgement cannot be inferred from a webpage or replicated by a deterministic planner.

Evidence: ev_e270a137b4ea7be0aefdb4139c8391e6d2a9a67a5c48bce669c3b7a623a40cd9 (public page observed). Capture limited to an isolated public page in Chromium; page content does not establish paid app behavior or internal algorithms.

FitCore design proposal (not observed vendor implementation): Structured feedback loop after training; transparent rule-based suggestions tied to actual logs, never pretend human oversight.

## Peloton Strength+

Source: https://www.onepeloton.com/strength-plus-app

Observed: Official page documents custom muscle/equipment/duration-focused workouts, coach programs, audio cues, demos, swaps and progress stats. REA capture was limited to the country-choice dialog: no app content observed at runtime.

Evidence: ev_edd1b47f5bfa24f638b23eb3339a10e08d8f5df9f935cadd76bb11096a1eaa22 (official document observed; runtime restricted to locale dialog). Capture limited to an isolated public page in Chromium; page content does not establish paid app behavior or internal algorithms.

FitCore design proposal (not observed vendor implementation): Similar-movement swaps for occupied equipment; preserve completed sets, log units clearly and show real session progress.

## Aaptiv

Source: https://support.aaptiv.com/kb/what-is-the-adaptive-training-plan-smartcoach

Observed: Official support describes a goals/fitness/preferences survey and a plan that adjusts over time. Exact adjustment algorithm and paid audio experience not observed.

Evidence: ev_e05c531da24b344143cfa061caffc32a697301e7e4c750fdbe8ab179d44981e7 (official support page observed). Capture limited to an isolated public page in Chromium; page content does not establish paid app behavior or internal algorithms.

FitCore design proposal (not observed vendor implementation): Optional concise audio cues and low-screen-use controls; explicit effort feedback for subsequent plan suggestions.

## Recommended original FitCore implementation order

1. Today’s training: clear session prescription, existing guided workout entry, weekly calendar and explicit day-only edits.
2. Replace an exercise with an equipment-compatible similar movement, preserving already logged work.
3. Post-session feedback: effort, completion and optional constraints. Suggestions cite actual input; pain is a stop/review signal, not an invitation to auto-prescribe around an injury.
4. Optional audio instructions with mute, replay and timers; no claim of reliable lock-screen/background audio until device testing.
5. Weekly recap showing actual sessions, sets, comparable load/reps and log coverage, rather than fabricated fitness improvement.

Implementation update 2026-10-15: day-only time/volume adjustments, compatible movement swaps, persisted effort/pain feedback and conditional progression, optional spoken exercise introductions, and Home direct workout entry are implemented and exercised with isolated synthetic logs. Existing week/progression views retained. See coach-adaptation.md for evidence, exact scope and test results. Automatic rescheduling, human coaching, proprietary algorithms, background audio and full product parity are not claimed. REA should not be run on FitCore’s full source repository merely for architecture analysis.

