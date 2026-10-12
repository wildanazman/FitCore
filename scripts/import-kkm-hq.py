#!/usr/bin/env python3
"""Import the 2025 KKM HQ bank using ruled PDF table cell coordinates.

Requires pdfplumber. Downloads only when --pdf does not exist. The audit contains
every rejected, excluded and duplicate row; no nutrient estimates are produced.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import urllib.request

import pdfplumber

URL = "https://hq.moh.gov.my/nutrition/wp-content/uploads/2025/10/Bank-Calorie-Bahagian-Pemakanan-merged.pdf"
ROOT = Path(__file__).resolve().parents[1]
SEPARATOR = re.compile(r"\s*[|ǀ│]\s*|\s+I\s+")
EXCLUDED = re.compile(r"\b(pork|babi|khinzir|bacon|ham|lard|wine|beer|bir|arak|rum|vodka|whisky|whiskey|brandy|mirin|sake|alcohol|alkohol|liqueur|liquor|gelatin|gelatine|char siu|char siew|bak kut teh|blood|darah)\b", re.I)


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def excluded(name):
    # These source names explicitly describe a plant/poultry version or a fried
    # dough pastry. Their English words do not identify pork ingredients.
    if re.search(r"\b(pork|babi|lard|wine|beer|bir|arak|vodka|whisky|whiskey|alcohol|alkohol)\b", name, re.I):
        return True
    if re.search(r"vegetarian|ham chi peng|ham-chi-peng|ham ayam|chicken ham|turkey bacon", name, re.I):
        return False
    return bool(EXCLUDED.search(name))


def run(pdf_path, output, audit_path):
    if not pdf_path.exists():
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, pdf_path)
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    foods, seen = [], set()
    audit = {"sourceUrl": URL, "pdfSha256": digest, "pages": [], "rejected": [], "excluded": [], "duplicates": []}
    with pdfplumber.open(pdf_path) as pdf:
        audit["pdfPages"] = len(pdf.pages)
        for number, page in enumerate(pdf.pages, 1):
            tables = page.find_tables()  # Ruled cell boundaries, not text-line parsing.
            counts = {"page": number, "tables": len(tables), "rows": 0, "imported": 0, "rejected": 0, "excluded": 0, "duplicates": 0}
            for table in tables:
                for index, raw in enumerate(table.extract()):
                    row = [clean(x) for x in raw]
                    if row and row[0] == "NAMA MAKANAN":
                        continue
                    counts["rows"] += 1
                    detail = {"page": number, "row": index + 1, "cells": row}
                    reason = None
                    if len(row) != 5:
                        reason = "Expected five separately bounded table cells."
                    elif number == 13 and row[0].startswith("BBiinnggkkaa"):
                        reason = "Overprinted/invisible Bingka Labu and Bingka Pandan text shares a cell; weights 2450gg, kcal 5835 and references EVNEPNT cannot be reliably associated."
                    elif not row[0]:
                        reason = "Missing food name."
                    elif not re.fullmatch(r"\d+(?:\.\d+)?", row[3]):
                        reason = "Missing or ambiguous numeric calorie value."
                    if reason:
                        audit["rejected"].append({**detail, "reason": reason})
                        counts["rejected"] += 1
                        continue
                    name_cell, serving, weight, calories, reference = row
                    if excluded(name_cell):
                        reason = "Gelatin animal source unverified; conservatively excluded under existing food policy." if re.search(r"gelatin|gelatine", name_cell, re.I) else "Source explicitly identifies pork/ham or alcohol; user ingredient policy."
                        audit["excluded"].append({**detail, "reason": reason})
                        counts["excluded"] += 1
                        continue
                    parts = [x.strip() for x in SEPARATOR.split(name_cell) if x.strip()]
                    name = parts[0]
                    aliases = list(dict.fromkeys(x for x in parts[1:] if x.casefold() != name.casefold()))
                    warnings = []
                    # A duplicated hidden serving line in this cell is visually
                    # one serving. No mass/calorie corrections are applied.
                    if number == 13 and name == "Bingka Pulut":
                        serving = "1 potong ǀ 1 slice"
                        warnings.append("Duplicate overlapping serving text in PDF extraction; visible serving transcribed from the rendered cell.")
                    measurement = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(g|ml)", weight)
                    amount = float(measurement[1]) if measurement else None
                    unit = measurement[2] if measurement else None
                    if amount is not None and amount.is_integer():
                        amount = int(amount)
                    kcal = float(calories)
                    if kcal.is_integer():
                        kcal = int(kcal)
                    if not measurement:
                        warnings.append("Weight unit missing or nonstandard in source; no gram/ml amount inferred." if weight else "Weight missing in source.")
                    if not serving:
                        warnings.append("Household serving missing in source; use the stated weight/volume only.")
                    if not reference:
                        warnings.append("Table reference missing in source.")
                    if amount is not None and amount <= 2 and serving:
                        warnings.append("Suspiciously small printed weight for a household serving; source value preserved.")
                    if unit == "g" and amount and kcal / amount > 9:
                        warnings.append("Printed energy exceeds 9 kcal/g; possible source error, value preserved.")
                    if weight.startswith("per"):
                        warnings.append("Source weight states a per-weight basis despite household serving; do not treat calories as a full set.")
                    if name == "Nasi Claypot bersama Sayur Campur" and number == 66:
                        warnings.append("English name and serving are clipped at the source page bottom; visible text preserved.")
                    if re.search(r"gelatin|gelatine|ham|bacon|char siew|khinzir", name_cell, re.I):
                        warnings.append("Name includes gelatin or an explicitly plant/poultry version of a pork-associated term; preparation and certification remain unverified.")
                    key = (name.casefold(), serving, weight, kcal)
                    if key in seen:
                        audit["duplicates"].append({**detail, "reason": "Exact name + household serving + weight + calories already imported."})
                        counts["duplicates"] += 1
                        continue
                    seen.add(key)
                    identifier = hashlib.sha256(json.dumps(key, ensure_ascii=False).encode()).hexdigest()[:16]
                    foods.append({"id": f"kkm-hq-{identifier}", "name": name, "aliases": aliases, "serving": serving, "weightText": weight, "amount": amount, "unit": unit, "kcal": kcal, "sourceReference": reference, "page": number, "sourceUrl": f"{URL}#page={number}", "warnings": warnings})
                    counts["imported"] += 1
            audit["pages"].append(counts)
    assert all(math.isfinite(f["kcal"]) and f["kcal"] >= 0 for f in foods)
    assert len({f["id"] for f in foods}) == len(foods)
    audit["summary"] = {"imported": len(foods), "sourceRows": sum(p["rows"] for p in audit["pages"]), "rejected": len(audit["rejected"]), "excluded": len(audit["excluded"]), "duplicates": len(audit["duplicates"]), "withWarnings": sum(bool(f["warnings"]) for f in foods)}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(foods, ensure_ascii=False, indent=2) + "\n")
    audit["outputSha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({**audit["summary"], "pdfSha256": digest, "outputSha256": audit["outputSha256"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=Path("/private/tmp/fitcore-kkm-hq/source.pdf"))
    parser.add_argument("--output", type=Path, default=ROOT / "src/data/kkm-hq-foods.json")
    parser.add_argument("--audit", type=Path, default=Path("/private/tmp/fitcore-kkm-hq/audit.json"))
    args = parser.parse_args()
    run(args.pdf, args.output, args.audit)
