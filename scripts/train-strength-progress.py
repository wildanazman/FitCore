"""Offline research only. Learn observed next-session machine-load change, not a plan.

Run with bundled Python (numpy/pandas). No app logs, network calls or raw IDs exported.
Authors' data/code: https://osf.io/jn6ay/ (CC BY 4.0, Steele et al.).
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/coach-research/private/fit20_final.csv"
OUT = ROOT / "data/coach-research/models"
MACHINES = {1001: "leg press", 3001: "chest press", 5001: "pulldown"}


def metrics(y, prediction):
    error = prediction - y
    return {"mae_percentage_points": float(np.mean(np.abs(error))),
            "rmse_percentage_points": float(np.sqrt(np.mean(error ** 2))),
            "bias_percentage_points": float(np.mean(error))}


def main():
    if SOURCE.stat().st_size != 349831841:
        raise ValueError("Incomplete/unexpected source file; check OSF metadata")
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if source_hash != "1897b2e555dd6124302583a6116aa5cd72f965817a5a25f74026c91461eb7ea2":
        raise ValueError("Source hash changed; review upstream data before fitting")
    cols = ["memberId", "sessionDate", "birthMonth", "machineId",
            "exerciseWeight", "exerciseDuration", "sessionNumber", "Sex"]
    d = pd.read_csv(SOURCE, usecols=cols)
    audit = {"raw_rows": len(d), "raw_participants": int(d.memberId.nunique()),
             "raw_missing_fraction": d.isna().mean().to_dict()}
    d["date"] = pd.to_datetime(d.sessionDate.str[:10], errors="coerce")
    born = pd.to_datetime(d.birthMonth + "-01", errors="coerce")
    d["age"] = (d.date - born).dt.days / 365.25
    # Source authors excluded >=2017: sensor introduction changed load recording.
    # Retain adults with known sex, the three machines and authors' load caps.
    valid = (d.date.gt("2009-01-01") & d.date.lt("2017-01-01")
             & d.age.between(18, 90) & d.Sex.isin(["MALE", "FEMALE"])
             & d.machineId.isin(MACHINES) & d.exerciseWeight.gt(0)
             & np.where(d.machineId.eq(1001), d.exerciseWeight.le(200),
                        d.exerciseWeight.lt(116))
             & d.exerciseDuration.between(10, 300) & d.sessionNumber.ge(1))
    d = d.loc[valid].copy()
    audit["after_validity_filters"] = len(d)
    # Do not guess which same-day duplicate exercise record is correct.
    duplicates = d.duplicated(["memberId", "machineId", "date"], keep=False)
    audit["ambiguous_same_day_rows_removed"] = int(duplicates.sum())
    d = d.loc[~duplicates].sort_values(["memberId", "machineId", "date"])
    g = d.groupby(["memberId", "machineId"], sort=False)
    d["previous_load"] = g.exerciseWeight.shift(1)
    d["previous_date"] = g.date.shift(1)
    d["previous_duration"] = g.exerciseDuration.shift(1)
    d["previous2_load"] = g.exerciseWeight.shift(2)
    d["next_load"] = g.exerciseWeight.shift(-1)
    d["next_date"] = g.date.shift(-1)
    d["history_count"] = g.cumcount() + 1
    d["elapsed_days"] = (d.date - g.date.transform("min")).dt.days
    d["gap_days"] = (d.date - d.previous_date).dt.days
    d["target_gap"] = (d.next_date - d.date).dt.days
    d = d.loc[d.history_count.ge(3) & d.gap_days.between(1, 21)
              & d.target_gap.between(1, 21)].copy()
    # Next-session values are targets only. Never use next_date/gap/load as features.
    d["target"] = 100 * (d.next_load / d.exerciseWeight - 1)
    # No clipping of target outliers to make results look artificially good.
    d["trend"] = 100 * (d.exerciseWeight / d.previous_load - 1)
    d["trend2"] = 100 * (d.previous_load / d.previous2_load - 1)
    d["log_load"] = np.log(d.exerciseWeight)
    d["log_history"] = np.log1p(d.history_count)
    d["log_elapsed"] = np.log1p(d.elapsed_days)
    d["female"] = d.Sex.eq("FEMALE").astype(float)
    d["duration_over_120"] = np.maximum(d.exerciseDuration - 120, 0)
    d["duration_under_90"] = np.maximum(90 - d.exerciseDuration, 0)
    d["trend_mean"] = (d.trend + d.trend2) / 2
    for code in MACHINES:
        d[f"machine_{code}"] = d.machineId.eq(code).astype(float)
        d[f"duration_machine_{code}"] = d.exerciseDuration * d[f"machine_{code}"]
    features = ["age", "female", "log_load", "exerciseDuration", "previous_duration",
                "duration_over_120", "duration_under_90", "gap_days", "trend",
                "trend2", "trend_mean", "log_history", "log_elapsed"]
    features += [f"machine_{code}" for code in MACHINES]
    features += [f"duration_machine_{code}" for code in MACHINES]
    d = d.loc[np.isfinite(d[features + ["target"]]).all(axis=1)].copy()
    audit["eligible_prediction_pairs"] = len(d)
    audit["eligible_participants"] = int(d.memberId.nunique())
    # Stable participant partition; chronological test is strictly after cutoff.
    def partition(value):
        return int(hashlib.sha256(f"fitcore-v1:{int(value)}".encode()).hexdigest()[:8], 16) % 100
    buckets = {person: partition(person) for person in d.memberId.unique()}
    bucket = d.memberId.map(buckets)
    cutoff = d.date.quantile(.8).normalize()
    masks = {"train": (bucket < 70) & d.next_date.le(cutoff),
             "validation": bucket.between(70, 84) & d.next_date.le(cutoff),
             "test": (bucket >= 85) & d.date.gt(cutoff)}
    groups = {name: set(d.loc[mask, "memberId"]) for name, mask in masks.items()}
    assert not (groups["train"] & groups["validation"] or groups["train"] & groups["test"]
                or groups["validation"] & groups["test"])
    assert d.loc[masks["train"], "next_date"].max() < d.loc[masks["test"], "date"].min()
    assert all(mask.sum() >= 1000 for mask in masks.values())
    print(json.dumps({"audit": audit, "split_rows": {k: int(v.sum()) for k, v in masks.items()} }), flush=True)
    raw_x = d[features].to_numpy(dtype=float)
    y = d.target.to_numpy(dtype=float)
    mean = raw_x[masks["train"]].mean(axis=0)
    scale = raw_x[masks["train"]].std(axis=0)
    scale[scale < 1e-8] = 1
    x = np.column_stack([np.ones(len(d)), (raw_x - mean) / scale])
    xt, yt = x[masks["train"]], y[masks["train"]]
    gram, rhs = xt.T @ xt, xt.T @ yt
    candidates = []
    for alpha in [1, 100, 10000, 100000]:
        penalty = np.eye(x.shape[1]) * alpha
        penalty[0, 0] = 0
        beta = np.linalg.solve(gram + penalty, rhs)
        score = metrics(y[masks["validation"]], x[masks["validation"]] @ beta)
        candidates.append((score["rmse_percentage_points"], alpha, beta, score))
    _, alpha, beta, _ = min(candidates, key=lambda row: row[0])
    prediction = x @ beta
    residual90 = float(np.quantile(np.abs(y[masks["validation"]] - prediction[masks["validation"]]), .9))
    results = {}
    constant = float(np.mean(yt))
    for name, mask in masks.items():
        actual, pred = y[mask], prediction[mask]
        results[name] = {"rows": int(mask.sum()), "participants": len(groups[name]),
                         "model": metrics(actual, pred),
                         "keep_same_load": metrics(actual, np.zeros(len(actual))),
                         "training_mean": metrics(actual, np.full(len(actual), constant)),
                         "repeat_previous_change": metrics(actual, d.loc[mask, "trend"].to_numpy()),
                         "interval90_empirical_coverage": float(np.mean(np.abs(pred - actual) <= residual90)),
                         "actual_zero_change_fraction": float(np.mean(actual == 0))}
    subgroups = {}
    for label, subgroup in {**{v: d.machineId.eq(k) for k, v in MACHINES.items()},
                            "female": d.Sex.eq("FEMALE"), "male": d.Sex.eq("MALE"),
                            "age_18_39": d.age.lt(40), "age_40_59": d.age.between(40, 59.999),
                            "age_60_90": d.age.ge(60)}.items():
        mask = masks["test"] & subgroup
        if mask.sum():
            subgroups[label] = {"rows": int(mask.sum()), "model": metrics(y[mask], prediction[mask]),
                               "keep_same_load": metrics(y[mask], np.zeros(int(mask.sum())))}
    # MAE matters: most observations repeat load. RMSE alone may prefer overprescribing.
    t = results["test"]
    beats_baseline = (t["model"]["mae_percentage_points"] < t["keep_same_load"]["mae_percentage_points"]
                      and t["model"]["rmse_percentage_points"] < t["keep_same_load"]["rmse_percentage_points"])
    report = {"schema_version": 1, "activated_in_app": False,
              "target": "Observed next-session machine-load percent change within 1–21 days",
              "not_a_prescription": True, "source": "https://osf.io/jn6ay/", "license": "CC-BY-4.0",
              "attribution": "Steele, Fisher, Giessing, Androulakis-Korakakis, Wolf, Kroeske, Reuters",
              "source_sha256": source_hash, "audit": audit, "cutoff": str(cutoff.date()),
              "split": "Disjoint participants; training/validation targets <= cutoff, test inputs > cutoff",
              "leakage_checks": {"participant_groups_disjoint": True, "test_strictly_future": True},
              "selected_alpha": alpha, "validation_candidates": [{"alpha": c[1], **c[3]} for c in candidates],
              "results": results, "test_subgroups": subgroups,
              "residual90_percentage_points": residual90,
              "beats_persistence_on_mae_and_rmse": bool(beats_baseline),
              "deployment_blockers": ["Study machines and slow single-set protocol differ from FitCore workouts",
                 "No labels for optimal exercise selection, sets, reps, frequency or hypertrophy",
                 "Observed chosen load is not physiological readiness or safe recommended load",
                 "No causal comparison of alternative programmes; no injury-risk validation",
                 "Pooled interval calibration does not guarantee individual or subgroup coverage"]}
    model = {"kind": "standardized-ridge-regression", "experimental_only": True,
             "activated_in_app": False, "features": features, "mean": mean.tolist(),
             "scale": scale.tolist(), "intercept": float(beta[0]), "coefficients": beta[1:].tolist(),
             "target_unit": "percentage_points", "supported_machine_codes": MACHINES,
             "source_sha256": source_hash, "alpha": alpha}
    # Serialized weights must reproduce in-memory predictions without pickle/code execution.
    saved = json.loads(json.dumps(model))
    sample = raw_x[masks["test"]][:100]
    roundtrip = saved["intercept"] + ((sample - np.array(saved["mean"]))
                 / np.array(saved["scale"])) @ np.array(saved["coefficients"])
    np.testing.assert_allclose(roundtrip, prediction[masks["test"]][:100], atol=1e-10)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "strength-progress-ridge.json").write_text(json.dumps(model, indent=2) + "\n")
    (OUT / "strength-progress-evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"selected_alpha": alpha, "test": results["test"],
                      "beats_persistence": bool(beats_baseline), "activated_in_app": False}), flush=True)


if __name__ == "__main__":
    main()
