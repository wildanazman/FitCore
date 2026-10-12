# Workout customization

12 October 2026. The gym catalog now contains 51 strength choices, including conventional and sumo barbell deadlift, trap-bar deadlift, front/back squat, barbell RDL/row/hip thrust, flat/incline/close-grip bench, overhead press, EZ-bar work and landmine press. This is not an exhaustive gym library and not every movement has a moving demo.

My plan → Customize workout allows selecting, removing and reordering exercises for one date. The profile stores date-scoped IDs; logs are never removed. Restore coach workout clears only that date's override. A custom workout can be added on a rest day; removing every exercise makes that date a recovery day. Home routines exclude unavailable equipment and gym-only selections. New selections have starter set defaults; users record/edit actual sets, reps, load and rest in the existing logger. Custom sessions do not get automatic superset/drop-set recommendations or an implied coach-approved split. Time estimates are shown, not used to silently remove user-selected exercises.

My plan → Log my own activity opens a named manual activity with sets/reps, timed hold or duration tracking. It does not require a catalog match. Custom activities are saved as actual logs, not new reusable catalog entries or inferred completion of a prescribed exercise.

Tests: `scripts/check-custom-workouts.mjs` checks date isolation, ordering, rest-day additions, empty overrides, equipment checks, preserved logs, barbell tracking and backup round trips. Existing split and backup checks pass, as does production build. Local UI search for deadlift and the editing controls were checked without saving changes to the user's plan. Media audit now covers 106 named home/gym exercises: 30 moving demos, 76 without one.
