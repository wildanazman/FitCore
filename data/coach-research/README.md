# FitCore strength-coach research data

Collected 12 October 2026. These files are offline research inputs, not app assets. An experimental next-session load predictor has now been trained, but no planning model is deployed. No user logs were read, uploaded or shared. No media was downloaded. The study authors' R code was downloaded as a read-only measurement reference, not executed.

## Imported and checked

| Dataset | Actual records | Declared license | Permitted research role | Not established |
|---|---:|---|---|---|
| [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) | 876 | Unlicense | Equipment, exercise/muscle metadata and publisher difficulty labels | Personalized programme quality or outcomes |
| [Exercises Dataset with Muscle Volume](https://github.com/smyrdev/exercises-dataset) | 1,324 | MIT | Movement hierarchy and publisher-authored muscle-involvement maps | Measured activation, universal fractional-set accuracy or training efficacy |
| [WodWiz Open WOD Database](https://github.com/WodWiz/open-wod-db) | 496 | CC BY 4.0 | Structured benchmark examples and prescription-schema tests | General beginner safety or personalized long-term strength plans |

Credit: Free Exercise DB contributors; smyrdev and the upstream hasaneyldrm exercise-metadata contributors; WodWiz Open WOD Database contributors. Upstream licenses accompany each raw JSON. Versions, source URLs, byte sizes and SHA-256 hashes are in `manifest.json`. Record counts, nonempty names and uniqueness of IDs were checked per dataset. Catalogues overlap; these counts must not be added together and described as unique exercises or independent participants. Descriptions and difficulty labels are publisher annotations, not independent coach approval.

The volume catalogue excludes upstream copyrighted Gym Visual media. Free Exercise DB JSON includes relative image references, but no image files were fetched. Keep media permission separate from metadata permission. WOD prescriptions may involve competition-level loads and skills: do not automatically assign them to ordinary app users.

## Actual participant-data candidate

[Steele et al., longitudinal minimal-dose resistance training study](https://pubmed.ncbi.nlm.nih.gov/35591809/) reports 14,690 participants under a particular supervised minimal-dose protocol. [The authors' OSF project](https://osf.io/jn6ay/) is public and licensed CC BY 4.0. The full 349,831,841-byte CSV has now been downloaded and inspected. It contains 3,675,994 raw rows and 80,700 member IDs, not the paper's final analytic cohort. Our conservative forecast filters leave 576,996 eligible pairs from 4,307 participants. Raw data stays in the ignored `private/` directory, outside `src/` and `public/`. The candidate record is in `fit20-study-candidate.json`.

Potential target: longitudinal strength/performance prediction within the study's supported domain. Not a source of optimal personalized-plan labels, not causal evidence that one arbitrary programme is best, and not a justification for prescribing the study's maximal-effort protocol to novices. Before training: inspect anonymization, columns, missingness, exercise/device units, target availability and population coverage; retain attribution and do not attempt re-identification. Raw participant data should remain out of the frontend bundle and public release repository.

## Held or excluded

- [600K Fitness Exercise & Workout Program Dataset](https://www.kaggle.com/datasets/adnanelouardi/600k-fitness-exercise-and-workout-program-dataset): primary card could not be read. Underlying platform rights and collection provenance remain unverified. A large row count is not evidence of a valid reuse license or measured outcomes. Not imported.
- [Fitbod adherence study](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2026.1855668/full): article available, participant data restricted by a data-sharing agreement. Not scraped or imported.
- Hevy observational scraping study: research identifies third-party account scraping; redistribution permission and an approved reusable dataset were not established. Not imported.
- Exercise motion/IMU/video datasets: movement-recognition labels do not establish programme effectiveness. No bulk video or motion download.
- Generated exercise/video collections with admitted uncertain footage ownership: no footage imported.

## Training gates

1. Specify a target actually observed in the chosen dataset. Exercise metadata alone can train annotation/retrieval tasks, not an effective individualized training policy.
2. Compare learned models with simple baselines. Split by participant and time for longitudinal data; never leak later sessions into earlier predictions. Hold out related programmes/exercise variants for catalogue tasks.
3. Evaluate uncertainty, missing-input behavior and out-of-domain cases—not just overall accuracy. Synthetic profiles exercise validation code; they are not evidence of real-person efficacy.
4. Keep equipment, availability, load-context and safety validation outside the learned model. No invented starting kg or automatic medical/rehabilitation prescription.
5. Do not activate an ML replacement until its target-specific evaluation is credible. A performance predictor is not itself a complete workout planner.

## Completed first experiment

Update: an opt-in experimental preview now runs the saved coefficients inside Activity → My plan, limited to three study machines. It does not generate plans, recommend kg or modify logs. The following training result still fails the coach activation gate; see the model card for the distinction.

`scripts/train-strength-progress.py` fits standardized ridge regression using NumPy/pandas. Training uses 315,090 pairs from 2,545 participants; validation uses 72,416 pairs from 584 separate participants; the final chronological test uses 16,886 pairs from 338 other participants. Targets in training/validation are before or on 2016-04-01, and all test input sessions are later. Participant IDs, birth months and session timestamps are not exported with the model. Hyperparameters and residual interval width use validation, never test outcomes.

Test MAE is **1.725 percentage points**, versus **1.104** for predicting no load change. RMSE improves slightly (3.570 vs 3.706), but the model fails the MAE-and-RMSE gate. Model weights and aggregate evaluation are in `models/`; see the [model card](../../../docs/strength-progress-model-card.md). Experimental local preview only: no production deployment and no claim that next-session chosen load is safe or optimal. Current app planner remains unchanged.
