# Strength-progress experiment v1

Trained locally on 12 October 2026. **Experimental forecast preview only; never used to prescribe a plan or load.**

FitCore imports these coefficients through `src/lib/strengthProgress.ts` for an opt-in preview under Activity → My plan. Only the three study machine exercises are supported, regardless of the selected workout setup. Users enter three actual machine observations, measured durations and history, and confirm the study-specific protocol. Ordinary workout logs are not converted into study observations. Incompatible inputs receive no prediction. The preview states the failed baseline comparison and makes no plan/log changes. Training artifacts retain `activated_in_app: false` to record the failed automatic activation gate; this explicit preview is separate from coach activation.

## What was learned

Standardized ridge regression predicts observed next-session load change as a percentage of current machine load. Labels are actual subsequent records, not synthetic workout templates. Inputs use current and prior exercise loads/durations, prior intervals, age, sex, elapsed history and machine code. No later session values enter features. The model does not choose exercises, sets, reps, training frequency or safe starting weights.

Source: [Steele et al. study](https://pubmed.ncbi.nlm.nih.gov/35591809/), [authors' OSF data/code](https://osf.io/jn6ay/), CC BY 4.0. Credit James Steele, James P Fisher, Jurgen Giessing, Patroklos Androulakis-Korakakis, Milo Wolf, Bram Kroeske and Rob Reuters. This is a separate analysis, not the authors' published model or an endorsement.

## Data handling

Raw CSV: 3,675,994 rows, 80,700 member IDs; the paper's reported analytic cohort is 14,690. These are not interchangeable counts. Local forecast eligibility is stricter and serves a different target.

- Dates restricted to 2009-01-01 < date < 2017-01-01, following the authors' exclusion of the later sensor era.
- Leg press (1001): load >0 and <=200 kg. Chest press (3001) and pulldown (5001): load >0 and <116 kg, following authors' machine caps.
- Additional experimental rules: known sex, age 18–90, duration 10–300 seconds, positive session number. Body weight and height excluded because unknown/zero values are common.
- Remove all ambiguous same-day participant/machine duplicates rather than choosing a convenient row. This discards 135,699 otherwise eligible records.
- Require at least three historical machine observations and current/next intervals of 1–21 days. This is a conditional next-observed-session forecast, not a promised weekly forecast or adherence prediction.
- Keep 576,996 candidate pairs from 4,307 participants. Pairs outside the split's dates are not used for fitting or scoring. No target clipping.
- Raw pseudonymous participant data stays ignored and outside frontend/public assets. No attempts to identify participants and no FitCore user data used.

## Evaluation

Disjoint participant groups: training 315,090 pairs/2,545 participants, validation 72,416/584, test 16,886/338. Training/validation target dates <=2016-04-01; test input dates >2016-04-01. Four ridge penalties evaluated on validation RMSE, selected alpha 100. No parameter tuning after test inspection.

| Test result (percentage points) | Learned model | Keep same load |
|---|---:|---:|
| Mean absolute error | 1.725 | 1.104 |
| Root mean squared error | 3.570 | 3.706 |

82.7% of test pairs have unchanged load. The learned model reduces large-error sensitivity slightly but worsens typical absolute error. It fails the activation gate requiring both MAE and RMSE improvement. Sex, age and machine subgroup results are in the evaluation JSON; do not claim equal subgroup performance.

An exploratory pooled absolute-residual interval calibrated on validation covers 90.7% of test observations. This is not an individual safety/confidence guarantee. Observations cluster within participants and overlap histories; row counts are not independent sample sizes. No cluster confidence intervals or external validation were performed.

## Why it is not an app coach yet

Observed machine load reflects the supervised studio protocol, not a measured optimal recommendation. This observational dataset cannot identify which alternative split, volume or exercise maximizes outcomes. Slow single-set machine workouts do not establish generalization to dumbbell/home/multi-set training. No injury, readiness, pain, RIR or hypertrophy labels validate prescriptions. A statistical forecast must never be converted automatically into recommended kilograms.

Current FitCore workout planning is unchanged. This model is neither clinically validated nor a trained complete personal trainer. A next experiment needs a predeclared target, new evaluation protocol and evidence of an advantage over simple rules before any activation.

## Reproduction

Download `fit20_final.csv` from https://osf.io/download/w3vcn/ into `data/coach-research/private/`. Expected size 349,831,841 bytes; SHA-256 `1897b2e555dd6124302583a6116aa5cd72f965817a5a25f74026c91461eb7ea2`. Read-only authors' analysis reference: https://osf.io/download/j2cmv/.

Run `scripts/train-strength-progress.py` with Python, NumPy and pandas. It exports coefficients and aggregate metrics only, without participant records. Run `scripts/check-strength-progress.py` to verify the saved artifact structure, source hash and non-deployment gate. No paid AI call, remote model training or user-data upload is involved.
