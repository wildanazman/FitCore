# Working-set logging

The plan keeps its prescription, but completed rows show the actual saved set count, per-set reps/holds and energy. A planned two-set exercise can therefore finish with three sets without changing future prescriptions.

Plan logging requires checking each working set. Editing reps or kg clears that set's check. Add set copies the last load/reps but never its completion. Remove skipped sets before Finish exercise. Completion records the session once, shows an actual-result summary, updates progress and offers the next exercise. Reduced-motion mode retains feedback without scaling.

Barbell/Smith/EZ/trap-bar loads are total effective bar plus plates. Dumbbells/kettlebells are kg per implement with explicit one vs pair selection. Machine/cable settings are total stack kg, not per hand. For unilateral movements use one implement and select per-side repetitions if both sides are done.

Energy is a rough active-energy estimate, not a measurement. The model applies the Compendium category MET minus one resting MET to the exercise-block duration. Actual minutes override inferred reps × tempo plus between-set rest. Do not include a whole gym session in every exercise or log a second workout energy total. External load contributes to lifting volume, not a fabricated kcal/kg coefficient. Historical log calories are not recalculated.

Reference: https://pacompendium.com/conditioning-exercise/

## Guided Start workout

Start switches from the weekly plan into a dedicated one-exercise workspace, with a warm-up entry for new sessions. Continue goes to the next unsaved exercise. Completing a set starts the prescribed rest countdown; +30 sec and End rest are user-controlled. Pause and confirmation screens preserve the mounted draft and stop clocks. The exercise clock stops after all sets are checked, excluding post-exercise review time, and supplies duration-based energy unless manually overridden.

Finish exercise saves a real session, then shows its result before advancing. Skip and early finish require confirmation; skipped exercises remain available in the summary, and incomplete exercises are never marked done. The summary totals saved exercise energy without making a duplicate workout log. Completed logs survive leaving/reloading; unsaved drafts and live session clocks do not persist across reload. Browser unload warnings protect in-progress sessions where supported. Timers use timestamps rather than decrementing interval counters, so background throttling does not make them drift.
