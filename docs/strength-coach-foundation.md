# Personalized strength planning foundation

Research and implementation audit: 12 October 2026. Status: design/research, not a trained model or an implemented replacement planner. Current production planner remains the starter template.

## Evidence ledger

1. [ACSM 2026 official resistance-training summary](https://acsm.org/resistance-training-guidelines-update-2026/). Healthy adults; individualize goals, enjoyment and safety. Regular major-muscle training, including home/bodyweight training, matters. Muscle-growth guidance discusses higher weekly volume, approximately ten sets per muscle group; this is not a universal beginner starting dose or guarantee. Complex programming and failure are not essential for the average healthy adult. The full paper was payment-restricted during this review; this ledger is based on the official public summary, not a claim to have read the full paper.
2. [NSCA training-frequency guidance, 2017](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/). Frequency depends on experience, programme workload, other exercise and life demands. Nonconsecutive beginner full-body sessions and alternating upper/lower schedules are examples. Do not adopt its stronger frequency prescriptions as universal laws; newer evidence and the individual's recovery take priority.

Sources establish principles. Specific scheduling algorithms, time calculations, progression triggers and conservative defaults below are proposed FitCore policies, not direct scientific prescriptions.

## Confirmed weaknesses in the current code

- `src/lib/strengthCoach.ts`: day count directly selects a fixed split, and array order selects the first eligible exercise. Preferences, ability and prior tolerance do not rank alternatives.
- Sets are fixed at two or three; session length merely chooses four, five or six exercise patterns. No calculated warm-up, work, rest, side count or transition time fits the actual time budget.
- Weekly direct and indirect muscle exposure is not audited; truncated templates and insufficient pulling equipment can leave gaps.
- `week` does not alter prescriptions. There is no weekly review, fatigue-aware adjustment or versioned programme.
- `StrengthCoach.tsx` infers a progression hint from the calorie estimator's moderate/hard value. `ActivityComposer.tsx` defaults this field to moderate. This is not a confirmed report of repetitions in reserve, technique quality or pain.
- A blanket clearance checkbox cannot substitute for individual screening or establish a rehabilitation plan.

## Minimum assessment before prescribing

Use existing profile and actual logs; ask only for missing information. Store unknown explicitly, never as zero or a presumed capability.

- Goal priorities: strength, build/preserve muscle, general fitness; allow fat loss plus muscle training.
- Training history: consistent months, recent interruption, actual recent sessions and exercises the user can perform comfortably.
- Access: gym/home/both, available implements and their weights, smallest usable load increment. Gym membership is not proof that every machine exists.
- Schedule: available days, time budget, other sports/running and physically demanding work.
- Baseline: optional recent comfortable sets, load, repetitions and equipment context. Do not require a maximal lift from a novice or infer starting kg from body weight, age or sex.
- Recovery and tolerance: reported sleep, fatigue, soreness and current pain; restrictions requiring professional guidance must not receive invented medical substitutions.

## Decision pipeline

1. Check scope and missing inputs. An unknown baseline yields an explicitly labelled calibration session, not fake load precision.
2. Set a recoverable weekly structure based on availability, experience and combined workload; explain the choice.
3. Select movements by equipment, skill/tolerance, preferences and muscle coverage. Mark an unavailable pulling pattern as a limitation; bird-dog is not an equivalent replacement for a row.
4. Budget actual session time using warm-up, working sets, rest, unilateral work and transitions. If it does not fit, remove lower-priority assistance or reduce volume; retain essential coverage across the week.
5. Audit weekly direct muscle sets and secondary exposure separately, recovery intervals and conflicts with hard running. Count secondary involvement transparently; no undocumented double counting.
6. Validate all exercise IDs, equipment, positive finite values, feasible timing and scheduling before displaying the plan.
7. Show the prescription and concise reasons, plus assumptions and limitations. Processing may be quick; no artificial delay or fictitious 'AI thinking' stages.
8. Review actual performance and feedback, preserving a dated/versioned plan so changes cannot rewrite historical prescriptions or logs.

## Adaptation policies to implement and test

- Capture actual set outcomes and explicit effort/technique feedback separately from calorie-estimation effort.
- Suggest a small available load increase only after repeated comparable sessions at the upper rep target with reported reserve and controlled technique; lack of feedback means retain the load or request feedback. Do not silently upgrade.
- Compare like-for-like exercises and implement counts; a dumbbell per-hand load is not a barbell total. Bodyweight and held exercises use their own progression rules.
- Missed workouts are not a debt; resume or reschedule without stacking the same muscle workload.
- Pain prompts stopping the affected task and appropriate professional guidance, not a generic tougher/easier exercise claimed to treat an injury.
- Persistent poor recovery or performance decline prompts review and a conservative reduction option. Do not invent a universally mandatory deload every fixed number of weeks.
- Synthetic personas validate planner behavior, not real-world training outcomes or model accuracy.

## Acceptance scenarios

| Scenario | Required behavior |
|---|---|
| New user, no baseline | Calibration; no invented starting kg |
| Fat loss and muscle goal | Both priorities retained; no assumption that dieting excludes strength |
| Mat only | No weighted exercise; missing pulling stimulus disclosed |
| One fixed dumbbell | Respect available load; no suggestion of an unavailable next weight |
| Gym with a missing machine | Eligible alternative or explicit limitation |
| 30-minute window | Calculated session fits including warm-up and rest |
| Four days plus hard running | Combined workload/recovery reviewed, not merely a warning after assignment |
| Upper rep target with unknown effort | No load increase inferred from calorie-estimator defaults |
| Repeated controlled upper-range sets | Conditional next increment with explanation and user confirmation |
| Poor recovery or pain | Conservative review/stop guidance, no diagnosis |
| Missed week | No catch-up pile-up or automatic presumed fitness gain |
| Old logs and backup import | Preserve existing data; unknown new assessment fields request setup |

## Architecture

Keep an evidence-versioned local knowledge base, an explicit planning/validation engine, and actual per-user history separate. A language model, if added, can explain validated decisions; it must not bypass safety checks or fabricate baseline performance. No user health logs are used to train a shared model without separate consent. Research alone does not fine-tune Gemini or another foundation model.
