#!/usr/bin/env python3
"""Reproduce the serving-calorie import from the 2016 JKN Selangor PDF.

Requires pdfplumber and Node. Pass a downloaded PDF; no network requests occur.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
URL = "https://jknselangor.moh.gov.my/documents/pdf/2016/info/bank_kalori_makanan.pdf"


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def import_pdf(path):
    rows, rejected, duplicates = [], [], []
    seen = set()
    original = 0
    page_counts = []
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            count = 0
            for table_number, table in enumerate(page.extract_tables(), 1):
                parent, parent_reference = "", ""
                for row_number, cells in enumerate(table, 1):
                    if clean(cells[0]) == "Makanan":
                        assert [clean(c) for c in cells] == [
                            "Makanan", "Hidangan", "Berat (g)", "Kalori (kcal)", "Rujukan"
                        ], (page_number, cells)
                        continue
                    original += 1
                    count += 1
                    locator = {"page": page_number, "table": table_number, "row": row_number}
                    if len(cells) != 5:
                        rejected.append({**locator, "cells": cells, "reason": "Expected five source columns"})
                        continue
                    name, serving, weight, calories, reference = map(clean, cells)
                    warnings, aliases = [], []
                    if not name:
                        # Visually confirmed: KFC name/reference cell spans thigh and breast rows.
                        assert page_number == 3 and serving == "1 ketul (dada)" and parent == "Ayam goreng KFC"
                        name, reference = parent, parent_reference
                        warnings.append("Nama dan rujukan diwarisi daripada sel bercantum dalam sumber.")
                    elif name.startswith("+"):
                        aliases.append(name)
                        name = f"{name.lstrip('+').strip()} (tambahan untuk {parent})"
                        reference = reference or parent_reference
                        warnings.append(f"Komponen tambahan untuk {parent}; kalori ini untuk komponen sahaja.")
                    else:
                        parent, parent_reference = name, reference
                    if not name or not serving or not re.fullmatch(r"\d+(?:\.\d+)?", calories):
                        rejected.append({**locator, "cells": cells, "reason": "Missing name/serving or missing/non-numeric kcal"})
                        continue
                    kcal = float(calories)
                    kcal = int(kcal) if kcal.is_integer() else kcal
                    amount = float(weight) if weight else None
                    if amount is not None and amount.is_integer():
                        amount = int(amount)
                    if not weight:
                        warnings.append("Berat tidak dinyatakan dalam sumber; tiada penukaran per 100 g.")
                    if page_number in (19, 20) and (page_number == 19 and table_number == 2 or page_number == 20 and table_number == 1):
                        warnings.append("Sumber menyatakan berat dalam g, termasuk minuman; bukan isipadu ml.")
                    if "*" in name:
                        warnings.append("Nota sumber: kalori dikira menggunakan susu pekat manis.")
                    if parent in ("Teh tarik", "Teh tarik kurang manis", "Teh O/ Kopi O", "Teh/ Kopi", "Teh/Kopi") and not aliases:
                        warnings.append("Nilai 0 kcal yang diterbitkan adalah asas minuman; gula/susu/krimer disenaraikan berasingan. Jangan anggap jumlah minuman siap ialah 0 kcal.")
                    if name in ("Kari telur", "Cucur lemak manis"):
                        warnings.append("Ketumpatan kalori diterbitkan melebihi 600 kcal/100 g; nilai sumber dikekalkan tanpa pembetulan.")
                    if "fTE mata" in name or " + timu " in name:
                        warnings.append("Nama mengandungi ejaan/teks luar biasa dalam sumber; dikekalkan tanpa tekaan.")
                    key = (name, serving, weight, kcal)
                    if key in seen:
                        duplicates.append({**locator, "name": name, "serving": serving, "weightText": weight, "kcal": kcal})
                        continue
                    seen.add(key)
                    digest = hashlib.sha256(json.dumps(key, ensure_ascii=False).encode()).hexdigest()[:16]
                    rows.append({
                        "id": f"kkm-selangor-{digest}", "name": name, "aliases": aliases,
                        "serving": serving, "weightText": weight, "amount": amount,
                        "unit": "g" if amount is not None else None, "kcal": kcal,
                        "sourceReference": reference, "page": page_number,
                        "sourceUrl": f"{URL}#page={page_number}", "warnings": warnings,
                    })
            page_counts.append(count)
        pages = len(pdf.pages)
    # Use the application rule itself, rather than duplicating its regex in Python.
    node = shutil.which("node") or str(Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node")
    result = subprocess.run([
        node, "--input-type=module", "-e",
        "import {hasExcludedIngredients} from './shared/foodSuitability.js'; "
        "let s=''; for await(const c of process.stdin)s+=c; "
        "console.log(JSON.stringify(JSON.parse(s).map(r=>hasExcludedIngredients([r.name,...r.aliases].join(' ')))));"
    ], cwd=ROOT, input=json.dumps(rows), capture_output=True, text=True, check=True)
    excluded_flags = json.loads(result.stdout)
    excluded = [row for row, flag in zip(rows, excluded_flags) if flag]
    included = [row for row, flag in zip(rows, excluded_flags) if not flag]
    report = {
        "sourceUrl": URL, "sourceSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "sourcePages": pages, "originalRows": original, "pageRowCounts": page_counts,
        "parsedRows": original - len(rejected), "rejectedRows": rejected,
        "exactDuplicates": duplicates, "excludedRows": excluded, "includedRows": len(included),
    }
    assert original == len(included) + len(excluded) + len(duplicates) + len(rejected)
    assert len({r['id'] for r in included}) == len(included)
    return included, report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "src/data/kkm-selangor-foods.json")
    parser.add_argument("--report", type=Path, default=Path("/private/tmp/fitcore-kkm-selangor/import-report.json"))
    args = parser.parse_args()
    records, report = import_pdf(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k not in ("rejectedRows", "exactDuplicates", "excludedRows")}))
    print(f"Rejected: {len(report['rejectedRows'])}; exact duplicates: {len(report['exactDuplicates'])}; excluded: {len(report['excludedRows'])}")
