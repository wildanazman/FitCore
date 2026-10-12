# JKN Selangor food-calorie import

Source: [Bank Kalori Makanan, 2016 URL](https://jknselangor.moh.gov.my/documents/pdf/2016/info/bank_kalori_makanan.pdf).
Retrieved 2026-10-12. PDF contains 22 pages. SHA-256:
`b3e2f45ab4675f4b84e2bf8e186440e2d00d5f6f1467d3bd57337380bed04cee`.

## Result and accounting

909 original food/component rows across all source tables; 905 parsed rows;
94 exact within-source duplicates removed; 0 excluded by the current
`shared/foodSuitability.js` rule; **811 import records**.
Accounting: 909 = 811 imported + 94 duplicates + 4 incomplete rows.

Per-page original row counts (pages 1-22):
41, 45, 38, 36, 41, 39, 43, 38, 41, 38, 46, 47, 46, 47, 47, 44, 44, 37, 41, 38, 44, 28.

The 4 rejected rows are on page 19: Air barli (1 gelas, 200 g, blank kcal),
Air limau nipis (1 gelas, 250 g, blank kcal), Milo O's + gula (1 sudu teh,
blank weight/kcal), and Milo O's + serbuk coklat (2 sudu makan, blank
weight/kcal). Ingredient component rows with complete values remain useful
and are retained individually. No calories were inferred by summing them.

No explicit pork/alcohol names matched the application's shared exclusion
rule. Cuisine labels, vegetarian substitutes and generic sausages are not
independently treated as pork. This is an ingredient-name filter, not halal
certification.

## Interpretation and provenance

- Values are **kcal for the exact published household serving**, not kcal per
  100 g. Every table has columns Makanan, Hidangan, Berat (g), Kalori (kcal),
  Rujukan. Drink weights also use g; ml is not inferred.
- Wrapped cells are joined with spaces. Source spelling and values remain
  unchanged. There are no invented translations, macros or zero-filled macros.
- The merged KFC name/reference cell on page 3 is propagated to its breast
  row, preserving both thigh (65 g, 110 kcal) and breast (55 g, 160 kcal).
- Components prefixed by `+` get contextual names such as
  `susu pekat manis (tambahan untuk Teh tarik)`, retaining the source `+` text
  in aliases. Their calories describe the component alone.
- Teh tarik and other page-20 tea/coffee bases retain the published 0 kcal
  with warnings: sugar, milk and creamer have separate component rows.
  These zero values must not be presented as calories for a finished drink.
- The starred milky-drink footnote says calories use sweetened condensed milk;
  it recommends replacing this with low-fat milk. This note is retained in warnings.
- One row lacks a weight: Nasi lemak rendang ayam/ daging + timu + sambal,
  1 set, 420 kcal, page 3. Its amount/unit remain null, so per-100-g conversion
  is unavailable. Its source spelling `timu`, and the source text `fTE mata`
  in another rice row, are preserved and flagged.
- Kari telur (20 g, 130 kcal) and Cucur lemak manis (30 g, 200 kcal) have
  unusually high published calorie density and are flagged without correction.
- Exact deduplication key is name + household portion + weight text + kcal.
  The first occurrence provides page/reference provenance. Different calories,
  weights or portions remain separate; cross-source dedup is outside this import.
- 68 retained records carry warnings. References preserve printed text:
  NP = Nutritionist Pro 2.1.13; NC = Nutrient Composition of Malaysian Foods,
  fourth edition, 1997; Atlas = Atlas Makanan: Saiz Pertukaran & Porsi, 2009.
  Printed variants such as NC. and Altas are not silently corrected.

## Verification

All 22 pages were extracted using pdfplumber's ruled table cells. Complete
pages 3, 19, 20 and 22 were rendered with PDFium and visually inspected,
confirming the merged KFC rows, blank drink calories, separate ingredient
components, g headers, footnotes and references. Poppler was attempted but
its bundled font configuration failed; PDFium provided the verified renders.

The following published associations were checked against extracted records:

| Page | Food | Serving | Weight | kcal |
| --- | --- | --- | --- | --- |
| 1 | Bihun bandung | 1 mangkuk | 450 g | 490 |
| 3 | Nasi lemak rendang ayam/ daging + timu + sambal | 1 set | blank | 420 |
| 3 | Ayam goreng KFC (breast) | 1 ketul (dada) | 55 g | 160 |
| 5 | Kari telur | ½ biji | 20 g | 130 |
| 19 | Jus anggur, tanpa gula | 1 gelas | 250 g | 250 |
| 20 | Teh tarik (published base) | 1 cawan | 200 g | 0 |
| 20 | + susu pekat manis for Teh tarik | 3 sudu teh | 29 g | 96 |
| 22 | Vegetarian pasta | 1 senduk | 112 g | 125 |

The importer asserts five source columns, the known merged-name context,
unique IDs and complete count accounting. The eight record spot checks pass.

## Reproduction

Run `scripts/import-kkm-selangor.py PATH_TO_DOWNLOADED_PDF` using Python
with pdfplumber. It writes `src/data/kkm-selangor-foods.json` and defaults
its detailed rejection/duplicate/exclusion report to
`/private/tmp/fitcore-kkm-selangor/import-report.json`. Node is required to
apply the shared ingredient rule; the bundled Codex runtime is a fallback.
Use `--output` and `--report` to verify reproducibility in temporary paths.
The source PDF and intermediate render files are temporary and not committed.
