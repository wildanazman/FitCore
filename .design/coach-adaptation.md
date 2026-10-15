# Training coach: practical adaptation

## One-day venue and scheduling extension

Keep the existing semantic palette and compact disclosure. Location and equipment precede time/volume; postponement is a separate explicit action. Rebuild remaining work when changing venue, preserve completed logs, and explain that a one-day custom list is replaced. Move pending prescriptions only to an unoccupied later day, preserving sets/reps/rest. Do not merge workouts, transfer kg, or modify the repeating routine. Show source/destination notices and warn that nearby recovery still needs review. No changes are made until the user chooses a venue or confirms a move.

Direction: preserve FitCore's blue/white/gold and all semantic themes. Keep the current typeface. A clear session prescription leads; a compact 'Make today fit' control sits before Start. In-workout swaps use a bounded, searchable movement list, not the whole exercise catalogue. Feedback ends the session with a visible next step.

Public research: see workout-app-comparison.md. These are original implementations informed by public documentation, not copies of proprietary algorithms. Future's human coaching is not replicated.

Implementation acceptance:
- Day-only time/volume adjustments preserve completed exercises and do not change weekly preferences.
- Similar swaps require a known movement family, compatible equipment and no duplicates. Working kg is never copied across exercises.
- Feedback is optional, persisted and influences subsequent advice. Pain prevents progression advice; it does not trigger injury-treatment prescriptions.
- Only actual saved sets count toward progress and estimated calories. A checked day is not evidence of measured performance.
- No artificial 'thinking' delay. Explain the decision inputs instead.

Evidence: ACSM 2026 https://acsm.org/resistance-training-guidelines-update-2026/ ; progression https://pubmed.ncbi.nlm.nih.gov/19204579/ ; RIR trial https://pubmed.ncbi.nlm.nih.gov/38393985/ . Two comparable sessions and day-only time reduction are conservative product policies, not validated individual prescriptions. Technique, recovery and equipment still require user judgement.

Visual checks: mobile 320/390, desktop, all semantic themes; 44px controls; visible focus; no animation dependency. Do not publish until requested.

Implemented 2026-10-15: day-only time/volume controls, movement-family swaps with confirmation and blank load, optional spoken exercise introductions (foreground only), persisted effort/pain feedback, feedback-gated progression visible before each lift, Home direct workout entry, preservation of previously logged exercises through customization/reset, backup validation. Existing week/progression views retained. This is rule-based decision support, not trained ML or human coaching.

Verified: TypeScript; production Vite build; scripts/test-coach-adaptation.ts bundled and executed; isolated Playwright session with synthetic data tested adjustment → swap → finish sets → end session → feedback → reload → Home start. All five themes tested for overflow at 320/390/1024. Screenshots reviewed: day controls, swaps, summary. Corrected home-equipment labels after screenshot critique. No real user logs changed. Audio playback/background and physical iPhone hardware not verified. Existing bundle-size warnings remain.

Not claimed: proprietary-app parity, human coach supervision, adaptive medical programming, automatic injury clearance, native lock-screen audio, or schedule rescheduling. Weekly days can still be edited through existing setup. No push/deployment performed in this pass.

Extension completed 2026-10-15: “Make today fit” now supports a date-only Gym / At home choice and available home equipment. Changing location rebuilds remaining exercises and replaces that day's custom list; saved logs and the recurring routine stay intact, and working kg is not transferred. Explicit postponement moves only unfinished strength prescriptions and pending cardio to an unoccupied later date within 21 days. It snapshots sets/reps/rest, retains the source template and title, shows source/destination notices, and rejects occupied or invalid dates without changes. Recovery and nearby workouts require user review; there is no automatic recovery rescheduling or weekly rebalancing. This supersedes the earlier exclusion of schedule rescheduling only for this explicit one-day move.

Extension verification: functional flow and pure workout-move tests passed, covering day-only equipment, unchanged routine, preserved logs, exact prescription snapshots, conflict rejection, repeat moves, next-date navigation and backup round trip. Date overrides and snapshots are included in backup validation. The finish review accepted the visible keyboard-focus fix for DayFit controls. The existing semantic themes, typography and design system remain unchanged; DESIGN.md and .impeccable/design.json were preserved. No publication or deployment performed.
