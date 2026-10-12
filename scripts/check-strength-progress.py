"""Validate research weights and the bounded, non-prescriptive app import."""
import hashlib
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
folder = root / "data/coach-research/models"
model = json.loads((folder / "strength-progress-ridge.json").read_text())
report = json.loads((folder / "strength-progress-evaluation.json").read_text())
assert model["activated_in_app"] is False and report["activated_in_app"] is False
assert model["experimental_only"] and report["not_a_prescription"]
assert all(report["leakage_checks"].values())
count = len(model["features"])
assert count == len(model["mean"]) == len(model["scale"]) == len(model["coefficients"])
assert all(math.isfinite(v) for key in ["mean", "scale", "coefficients"] for v in model[key])
assert all(v > 0 for v in model["scale"])
assert math.isfinite(model["intercept"])
assert not set(model["features"]) & {"memberId", "birthMonth", "next_load", "next_date", "target_gap", "target"}
assert set(model["supported_machine_codes"]) == {"1001", "3001", "5001"}
raw = root / "data/coach-research/private/fit20_final.csv"
assert raw.stat().st_size == 349831841
with raw.open("rb") as source:
    checksum = hashlib.file_digest(source, "sha256").hexdigest()
assert checksum == model["source_sha256"] == report["source_sha256"]
test = report["results"]["test"]
gate = all(test["model"][metric] < test["keep_same_load"][metric]
           for metric in ["mae_percentage_points", "rmse_percentage_points"])
assert gate == report["beats_persistence_on_mae_and_rmse"]
assert "data/coach-research/private/" in (root / ".gitignore").read_text()
for path in (root / "src").rglob("*"):
    if path.is_file() and path.suffix in {".ts", ".tsx", ".js", ".json"}:
        if "strength-progress-ridge" in path.read_text():
            assert path == root / "src/lib/strengthProgress.ts"
adapter = (root / "src/lib/strengthProgress.ts").read_text()
assert "studyProtocol" in adapter and "typicalError" in adapter
print("PASS: finite model, source checksum, no target leakage, honest gate, import restricted to experimental forecast")
