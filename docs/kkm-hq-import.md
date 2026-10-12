# KKM HQ 2025 calorie-bank import

Source: [Bank Kalori Makanan dan Minuman di Malaysia](https://hq.moh.gov.my/nutrition/wp-content/uploads/2025/10/Bank-Calorie-Bahagian-Pemakanan-merged.pdf). Imported 2026-10-12.

## Reproduce

`python3 scripts/import-kkm-hq.py --pdf /private/tmp/fitcore-kkm-hq/source.pdf` (requires pdfplumber). If the PDF is absent, the importer downloads the exact URL. It writes the catalog and a detailed JSON audit at `/private/tmp/fitcore-kkm-hq/audit.json`; use `--output` and `--audit` to override. Raw PDF and rendered QA pages remain outside the repository.

PDF SHA-256: `a1d75c7136517d03284c6dc6e86b3d13c0ed27f3657498efc1f25833936600f2`.
Catalog SHA-256: `1ffa5f568aabd953eba6b51251c6ea09604813a854e907e8c3b58ad0e5cbfc1a`.

108 PDF pages: page 1 is a cover; pages 2-108 each have one ruled data table. 2618 food rows = 2547 imported + 69 ingredient-policy exclusions + 2 rejected ambiguous/incomplete rows + 0 exact duplicates. 96 imported rows carry warnings.

## Method and data contract

pdfplumber discovers ruled table cell boundaries and reads each of the five columns separately. Wrapped text stays in its cell; calorie values cannot be taken from a name or adjacent serving. Whitespace is flattened for readable fields. Malay names are retained; English names/variants after printed bilingual separators become search aliases. Printed household serving, gram/ml weight text, calorie precision, reference abbreviation and one-based PDF page survive the import. Recognized explicit g/ml weights become amount/unit; unitless weights remain null and are never assumed to be grams. No protein/carbohydrate/fat is inferred.

IDs use a stable hash of name + household serving + weight text + calories. Exact deduplication uses those fields; different portions and calorie alternatives survive. Every row has a source URL with `#page=N`. Source-reference abbreviations on page 108: SFC Singapore Food Composition; NP Nutritionist Pro; EVENT Majlis kelolaan Bahagian Pemakanan; Brand Pelabelan Produk; KMK Komposisi Makanan Kelantan; MFC Malaysian Food Composition; IKU Institut Kesihatan Umum. Restaurant-specific reference labels are retained as printed.

Suspicious source values are preserved with warnings: weights <=2g for a household portion; energy >9 kcal/g; missing/nonstandard weight units, missing serving/reference, and a per100g basis printed next to a household set. Abok Abok Sago remains 1 biji / 1g / 5 kcal. Missing units such as Nasi Arab's printed 400 are not guessed. Source typos and inconsistent capitalization are retained.

Ingredient filtering excludes explicit pork/khinzir/ham/alcohol terms, with narrow exemptions for vegetarian versions, Chicken Ham, Turkey Bacon and Ham Chi Peng pastry. Independent explicit pork/alcohol terms override those exemptions. Plain Gelatin is conservatively excluded because animal source is unverified, not declared categorically haram. This is an ingredient policy, not halal certification. Ethnicity is never a filter.

## Rendered page checks

Complete pages 2, 8, 13, 51, 66, 68 and 108 were rendered and visually inspected. All retained row/column associations in the checks below match the visible cells. Page 13 contains an invisible/overprinted second food name, mass and calorie value in the Bingka Labu cell; the whole cell is rejected. Its Bingka Pulut cell extracts the same serving twice although one serving is visibly printed: the importer explicitly transcribes the single visible `1 potong ǀ 1 slice` and attaches an extraction warning. Page 66 ends with an English alias/serving clipped in the original PDF; retained visible text has a clipping warning.

| PDF page | Food | Printed household serving / weight | kcal | Audit result |
| --- | --- | --- | ---: | --- |
| 2 | Abok Abok Sago | 1 biji / 1g | 5 | Kept with suspicious-weight warning |
| 2 | Achar Nyonya | 1 senduk / 30g | 27 | Wrapped English alias remains associated with this row |
| 2 | Air Kosong | 1 gelas / 250ml | 0 | Zero kcal retained |
| 8 | Ayam Seroja | 1 ketul / 100g | blank | Rejected; no calorie estimate |
| 13 | Bingka Labu / hidden Bingka Pandan | conflicting overprinted values | ambiguous | Rejected |
| 51 | Kuih Bakul Goreng | 1 keping / 50g | 508 | Kept with >9 kcal/g warning |
| 66 | Nasi Arab | 1 set / 400 (unit absent) | 840 | Weight text kept, amount/unit null |
| 68 | Nasi Lemak | 1 pinggan / 230g | 389 | Kept |
| 68 | Nasi Lemak + Ayam goreng | 1 set / 350g | 729 | Missing reference warning |
| 68 | Nasi Lemak + Sambal Udang | 1 pinggan / 250g | 427.992 | Decimal precision kept |
| 108 | Yong Tauhu, Taukee dengan Isi Ikan, Rebus | 1 biji / 9g | 20 | Kept; wrapped text checked |

## Rejected rows

- Page 8, table row 8: Missing or ambiguous numeric calorie value. Raw cells: ["Ayam Seroja","1 ketul ǀ 1 piece","100g","","NP"].
- Page 13, table row 2: Overprinted/invisible Bingka Labu and Bingka Pandan text shares a cell; weights 2450gg, kcal 5835 and references EVNEPNT cannot be reliably associated. Raw cells: ["BBiinnggkkaa LPaabnud a|n B ǀi nBginkgak Laa Pbaundan","1 potong ǀ 1 slice","2450gg","5835","EVNEPNT"].

## Excluded rows

- Page 2: Agar Agar Kosong  /  Plain Gelatin. Gelatin animal source unverified; conservatively excluded under existing food policy.
- Page 9: Bak Kwa (Pork)  /  Pork Bak kwa. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 9: Ban Ham dan Keju  /  Ham and Cheese Bun. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 10: Ban Pork Floss  /  Pork Floss Bun. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 10: Bebola Khinzir Direbus  /  Boiled Pork Ball. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 11: Bergedel Khinzir yang Disalut  /  Fried Pork Cutlet. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 13: Bir  /  Beer. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 15: Brandi atau Whisky atau Rumatau Gin atau Vodka  /  Brandi or Whisky or Rumatau Gin or Vodka. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 15: Buah Kundur & Daging Khinzir Cincang Goreng dalam Sos Tiram  /  Stir Fried Winter Melon & Minced pork with in Osyter Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 16: Bubur Daging Babi dengan Kacang Tanah  /  Pork Porridge with Peanut. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 16: Bubur dengan Daging Khinzir  /  Pork Porridge. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 19: Char Siew Goreng, Kering  /  Stir Fried Char Siew Dried Noodles. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 20: Chee Cheong Fun dengan Inti Char Siew  /  Chee Cheong Fun with Char Siew Filling. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Dicincang Kukus dengan Ikan Masin  /  Steamed Ground Pork Meat with Salted Fish. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Goreng dengan Bawang Hijau  /  Stir Fried Pork wih Green Onion. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Goreng dengan Petola  /  Stir Fry Pork with Angled Loofah. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Goreng dengan Sayur Szechuan  /  Stir Fried Pork with Szechuan Style Pickled Vegetable. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Kukus dengan Ubi Keladi  /  Steamed Pork with Yam. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Masak dengan Masam Manis  /  Sweet & Sour Pork. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 23: Daging Khinzir Rendidid dengan Fungus Hitam  /  Braised Pork with Black Fungus. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 25: Dim Sum, Char Siew Soh  /  Dim Sum, Char Siew Soh. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 25: Dim Sum, Dumpling Khinzir, dengan Telur Ketam, Kukus  /  Dim Sum, Pork Dumpling with Crab Roe. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 26: Dim Sum, Tart BBQ Khinzir  /  Dim Sum, Barbequed Pork Tart. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 29: Hati Khinzir Goreng bersama Halia dengan Bawang  /  Stir Fry Pork Liver with Ginger and Onion. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 30: Hum Sui Kok (Dumpling Daging Khinzir Goreng)  /  Hum Sui Kok (Fried Pork Dumpling). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 37: Jeruk Sayur Goreng dengan Daging Khinzir  /  Stir Fried Chinese Pickles (Chinese Preserved Vegetables) with Pork. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 37: Jeruk Sayur, dengan Daging Khinzir, Kukus  /  Steamed Chinese Pickles (Preserved Chinese Vegetable) with pork. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 48: Khinzir Muda Panggang  /  Roasted Suckling Pig. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 50: Kubis Cina Goreng dengan Daging Khinzir I Stir Fried Chinese Cabbage with Pork. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 54: Kway Chap (Mi bersama Rendidih Kulit, Usus & Daging Khinzir)  /  Kway Chap ( Pork Skin, Intestine & Meat Stewed Noodless). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 56: Loh Bak Spice Pork Roll  /  Loh Bak Spice Pork Roll. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 62: Mi, Cendawan & Daging Khinzir Cincang, Kering  /  Mushroom & Minced Pork Noodles (Dry). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 62: Mi, Kering dengan Telur, Taugeh & Char Siew  /  Noodles with Egg, Bean Sprout & Char Siew (Dry). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 62: Mi, Pork Ribs, Kering  /  Pork Ribs Noodles (Dry). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 64: Minuman Liqueur  /  Liqour Drink. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 65: Mutton Vindaloo (Daging Kambing Masak Cuka/ Wine & Bawang Putih)  /  Mutton Vindaloo (Mutton with Vinegar/ Wine & Garlic). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 66: Nasi Char Siew  /  Char Siew Rice. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 71: Paru Khinzir dalam Sos Gelap  /  Pork Lung in Dark Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 72: Pau Bak  /  Steamed Bak Bun (Pork Meat Pau). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 72: Pau Char Siew  /  Steamed Char Siew Bun (Pau). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 73: Penang/ Nyonya Lo Bak (5 Spice Powder Pork Roll)  /  Penang/ Nyonya Lo Bak ( 5 Spice Powder Pork Roll). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 73: Peria Goreng, bersama Daging Khinzir Panggang I Stir Fried Bittergourd With Roasted Pork. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 74: Perut Khinzir dalam Sos Gelap  /  Pork's Stomach in Dark Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 74: Perut Khinzir Panggang  /  Roasted Pork Belly. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 75: Piza, Ham & Nanas, Beku dan Dibakar  /  Frozen Ham & Pineapple Pizza (Baked). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 80: Rendidih Bebola Khinzir & Gamat  /  Stewed Pork Ball & Sea Cucumber. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Bebola Khinzir dengan Kubis China  /  Stewed Pork Ball with Chinese Cabbage. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Kaki Khinzir dengan Cendawan  /  Pig’s Trotter Braised with Mushroom. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Kaki Khinzir dengan Cuka  /  Pig’s Trotter Braised with Vinegar. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Khinzir dengan Fungus Hitam  /  Braised Pork with Black Fungus. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Kulit Khinzir dengan Kicap Pekat  /  Braised Pork Skin with Sweet Soy Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Lidah Khinzir dengan Kicap Pekat  /  Braised Pig's Tongue in Sweet Soy Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Tulang Khinzir dengan Cendawan  /  Braised Pork Ribs with Black Mushroom. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 81: Rendidih Usus Khinzir dengan Kicap Pekat  /  Braised Pig's Small Intestine in Sweet Soy Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 84: Rusuk Khinzir Goreng dengan Bawang Putih  /  Deep Fried Porks Spare Rib with Garlic. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 84: Rusuk Khinzir Masak dengan Sos Manis  /  Braised Pork Spare Ribs with Sweet Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 89: Sate Khinzir  /  Pork Satay. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 89: Sate Khinzir bersama Kuah Kacang  /  Pork Satay with Peanut Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 91: Serunding Daging (Pork)  /  Pork floss. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 91: Singapore Lor Bak (Braised Pork Belly with Dark Soy Sauce)  /  Singapore Lor Bak (Braised Pork Belly with Dark Soy Sauce). Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 95: Stik Khinzir dengan Sos Masam Manis  /  Sweet & Sour Pork Chop. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 95: Stik Khinzir disalut Tepung dan Goreng  /  Deep Fried Battered Pork Chop. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 97: Sup Pork Ball and Tofu  /  Pork Ball & Tofu Soup. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 101: Taukwa (Pork) dengan Sos  /  Taukwa with Pork & Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 103: Terung Goreng dengan Daging Khinzir Cincang dalam Sos Kacang Pedas  /  Stir Fried Brinjal With Minced Pork in Hot Bean Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 104: Tulang Khinzir Dikukus dengan Kacang Hitam Masin  /  Steamed Pork Ribs with Salted Black Bean. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 104: Tulang Khinzir Dikukus dengan Sos Plum  /  Steamed Pork Ribs with Plum Sauce. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 104: Tulang Khinzir Goreng dengan Kacang Hitam Masin  /  Stir Fried Pork Ribs with Salted Black Bean. Source explicitly identifies pork/ham or alcohol; user ingredient policy.
- Page 104: Tumis Daging Babi dalam Soya dengan Telur  /  Braised Pork in Soy with Egg. Source explicitly identifies pork/ham or alcohol; user ingredient policy.

## Per-page audit

| PDF page | Source rows | Imported | Excluded | Rejected | Exact duplicates |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 | 0 | 0 |
| 2 | 27 | 26 | 1 | 0 | 0 |
| 3 | 26 | 26 | 0 | 0 | 0 |
| 4 | 29 | 29 | 0 | 0 | 0 |
| 5 | 20 | 20 | 0 | 0 | 0 |
| 6 | 25 | 25 | 0 | 0 | 0 |
| 7 | 23 | 23 | 0 | 0 | 0 |
| 8 | 24 | 23 | 0 | 1 | 0 |
| 9 | 32 | 30 | 2 | 0 | 0 |
| 10 | 27 | 25 | 2 | 0 | 0 |
| 11 | 29 | 28 | 1 | 0 | 0 |
| 12 | 21 | 21 | 0 | 0 | 0 |
| 13 | 29 | 27 | 1 | 1 | 0 |
| 14 | 30 | 30 | 0 | 0 | 0 |
| 15 | 22 | 20 | 2 | 0 | 0 |
| 16 | 26 | 24 | 2 | 0 | 0 |
| 17 | 27 | 27 | 0 | 0 | 0 |
| 18 | 27 | 27 | 0 | 0 | 0 |
| 19 | 23 | 22 | 1 | 0 | 0 |
| 20 | 27 | 26 | 1 | 0 | 0 |
| 21 | 27 | 27 | 0 | 0 | 0 |
| 22 | 22 | 22 | 0 | 0 | 0 |
| 23 | 22 | 15 | 7 | 0 | 0 |
| 24 | 21 | 21 | 0 | 0 | 0 |
| 25 | 17 | 15 | 2 | 0 | 0 |
| 26 | 22 | 21 | 1 | 0 | 0 |
| 27 | 28 | 28 | 0 | 0 | 0 |
| 28 | 24 | 24 | 0 | 0 | 0 |
| 29 | 26 | 25 | 1 | 0 | 0 |
| 30 | 22 | 21 | 1 | 0 | 0 |
| 31 | 23 | 23 | 0 | 0 | 0 |
| 32 | 21 | 21 | 0 | 0 | 0 |
| 33 | 22 | 22 | 0 | 0 | 0 |
| 34 | 20 | 20 | 0 | 0 | 0 |
| 35 | 21 | 21 | 0 | 0 | 0 |
| 36 | 30 | 30 | 0 | 0 | 0 |
| 37 | 27 | 25 | 2 | 0 | 0 |
| 38 | 29 | 29 | 0 | 0 | 0 |
| 39 | 24 | 24 | 0 | 0 | 0 |
| 40 | 21 | 21 | 0 | 0 | 0 |
| 41 | 24 | 24 | 0 | 0 | 0 |
| 42 | 29 | 29 | 0 | 0 | 0 |
| 43 | 32 | 32 | 0 | 0 | 0 |
| 44 | 29 | 29 | 0 | 0 | 0 |
| 45 | 22 | 22 | 0 | 0 | 0 |
| 46 | 22 | 22 | 0 | 0 | 0 |
| 47 | 30 | 30 | 0 | 0 | 0 |
| 48 | 26 | 25 | 1 | 0 | 0 |
| 49 | 27 | 27 | 0 | 0 | 0 |
| 50 | 20 | 19 | 1 | 0 | 0 |
| 51 | 24 | 24 | 0 | 0 | 0 |
| 52 | 21 | 21 | 0 | 0 | 0 |
| 53 | 31 | 31 | 0 | 0 | 0 |
| 54 | 27 | 26 | 1 | 0 | 0 |
| 55 | 30 | 30 | 0 | 0 | 0 |
| 56 | 31 | 30 | 1 | 0 | 0 |
| 57 | 24 | 24 | 0 | 0 | 0 |
| 58 | 24 | 24 | 0 | 0 | 0 |
| 59 | 22 | 22 | 0 | 0 | 0 |
| 60 | 22 | 22 | 0 | 0 | 0 |
| 61 | 23 | 23 | 0 | 0 | 0 |
| 62 | 17 | 14 | 3 | 0 | 0 |
| 63 | 24 | 24 | 0 | 0 | 0 |
| 64 | 25 | 24 | 1 | 0 | 0 |
| 65 | 25 | 24 | 1 | 0 | 0 |
| 66 | 27 | 26 | 1 | 0 | 0 |
| 67 | 24 | 24 | 0 | 0 | 0 |
| 68 | 22 | 22 | 0 | 0 | 0 |
| 69 | 24 | 24 | 0 | 0 | 0 |
| 70 | 28 | 28 | 0 | 0 | 0 |
| 71 | 26 | 25 | 1 | 0 | 0 |
| 72 | 27 | 25 | 2 | 0 | 0 |
| 73 | 21 | 19 | 2 | 0 | 0 |
| 74 | 29 | 27 | 2 | 0 | 0 |
| 75 | 16 | 15 | 1 | 0 | 0 |
| 76 | 16 | 16 | 0 | 0 | 0 |
| 77 | 22 | 22 | 0 | 0 | 0 |
| 78 | 26 | 26 | 0 | 0 | 0 |
| 79 | 30 | 30 | 0 | 0 | 0 |
| 80 | 29 | 28 | 1 | 0 | 0 |
| 81 | 22 | 14 | 8 | 0 | 0 |
| 82 | 23 | 23 | 0 | 0 | 0 |
| 83 | 27 | 27 | 0 | 0 | 0 |
| 84 | 26 | 24 | 2 | 0 | 0 |
| 85 | 21 | 21 | 0 | 0 | 0 |
| 86 | 20 | 20 | 0 | 0 | 0 |
| 87 | 27 | 27 | 0 | 0 | 0 |
| 88 | 29 | 29 | 0 | 0 | 0 |
| 89 | 22 | 20 | 2 | 0 | 0 |
| 90 | 23 | 23 | 0 | 0 | 0 |
| 91 | 25 | 23 | 2 | 0 | 0 |
| 92 | 28 | 28 | 0 | 0 | 0 |
| 93 | 19 | 19 | 0 | 0 | 0 |
| 94 | 19 | 19 | 0 | 0 | 0 |
| 95 | 24 | 22 | 2 | 0 | 0 |
| 96 | 25 | 25 | 0 | 0 | 0 |
| 97 | 24 | 23 | 1 | 0 | 0 |
| 98 | 21 | 21 | 0 | 0 | 0 |
| 99 | 23 | 23 | 0 | 0 | 0 |
| 100 | 26 | 26 | 0 | 0 | 0 |
| 101 | 27 | 26 | 1 | 0 | 0 |
| 102 | 27 | 27 | 0 | 0 | 0 |
| 103 | 26 | 25 | 1 | 0 | 0 |
| 104 | 24 | 20 | 4 | 0 | 0 |
| 105 | 22 | 22 | 0 | 0 | 0 |
| 106 | 28 | 28 | 0 | 0 | 0 |
| 107 | 24 | 24 | 0 | 0 | 0 |
| 108 | 5 | 5 | 0 | 0 | 0 |

Verification: all food-table cells have the expected five columns except the explicitly rejected overprinted content; valid imported calorie values are finite and nonnegative; IDs are unique. Full cell arrays for rejected, excluded and duplicate rows are recorded in the reproducible audit output. Visual QA is representative, not a claim that every printed source value is accurate.
