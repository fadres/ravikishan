# Notes Corpus Factual Audit Report

**Date:** 2026-08-08
**Scope:** All JSON note files in this repository (Class 11 NEB curriculum study notes)
**Method:** Extracted all notes to plain text, ran automated structural checks, and reviewed every chapter for factual accuracy (formulas, constants, definitions, worked examples, MCQ keys, Q&A answers).

---

## 1. Corpus overview

| Subject | Files | Extract size | Reviewed |
|---|---|---|---|
| physics | 79 | 408 KB | yes |
| mathematics | 22 | 144 KB | yes |
| chemistry | 46 | 84 KB | yes |
| nepali | 12 | 19 KB | yes |
| biology | 15 | 45 KB | yes |
| english | 9 | 18 KB | yes |
| general-knowledge | 4 | 4 KB | yes |
| loksewa | 4 | 4 KB | yes |
| **Total** | **191** | **726 KB** | |

## 2. Structural health

Automated checks flagged **173 issues**, of which **all are cosmetic** and concentrated in two types:

- **double spaces** inside text (from HTML source formatting) — ~150 occurrences
- **un-decoded entities** flagged in `syllabus-topics.json` files — false positives (they are legitimate raw-HTML entities in the source)

**Zero** unbalanced math delimiters, HTML leftovers, junk characters, or empty files were found. The JSON structure is sound; only content quality needs attention.

## 3. Findings by subject

Severity key: **MAJOR** = factually wrong (formula, value, answer key, statement) · **MINOR** = misleading/imprecise · **TYPO** = spelling/formatting/garbled extraction.

### 3.1 Physics — 71 findings (19 MAJOR, 22 MINOR, 30 TYPO)

Most issues are concentrated in **unit-1 (physical quantities)** and **unit-14 (curved mirrors)**. Highlights:

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MAJOR | unit-1 sig-figs MCQ | Key says 0.80760 has least sig figs (it has 5, the most) | Answer should be 80200 (2–3 sig figs) |
| MAJOR | unit-1 dimensional MCQ | Key `[ML⁰T⁰]` for an angle; angle is dimensionless | `[M⁰L⁰T⁰]` |
| MAJOR | unit-1 dimensional MCQ | Momentum from F,V,D: key `[DV⁴F⁻¹]` has dimension MLT⁻³ | `[DV⁴F⁻³]` (not in options; fix options) |
| MAJOR | unit-1 dimensional MCQ | Length from F,a,T: key `[FA²]` | `[AT²]` |
| MAJOR | unit-1 dimensions | P = (b−x²)/at: key `[a] = [M⁻¹L⁰T²]` | `[a] = [M⁻¹L³T]` |
| MAJOR | unit-1 dimensions | P = (b−x²)/at: key `[b] = [M¹L²T⁰]` | `[b] = [L²]` (no mass) |
| MAJOR | unit-1 dims/vector | Position vector given `[MLT⁻²]` (that's force) | `[M⁰L¹T⁰]` |
| MAJOR | unit-1 error analysis | Area answer `(51.6 ± 0.6) cm²` contradicts its own solution | `(54.6 ± 2.1) cm²` |
| MAJOR | unit-1 arithmetic | 5.234 + 2.123 printed as 7.347 | 7.357 |
| MAJOR | unit-1 arithmetic | 10⁹ s printed as "31.75 years" | 31.71 years |
| MAJOR | unit-1 units | "1 Nm = 10⁻⁹ m" — Nm (joule) and nm (nanometre) conflated | Split into N·m = 1 J; 1 nm = 10⁻⁹ m |
| MAJOR | unit-1 MCQ | "fermi/angstrom: no dimension but unit" — both have dimension [L] | Rework question (plane angle is the right concept) |
| MAJOR | unit-1 dims | Plancton's constant answer contains stray `[y] = [t] = [ct²]` | Remove; end at `[h] = [ML²T⁻¹]` |
| MAJOR | unit-1 area | "A = 4 × side is the area of a square" | That's perimeter; use A = side² |
| MAJOR | unit-1 units | New-units conversion printed `N₂ = 9 × 10⁶` (even own numbers give 10⁶) | Recompute consistently |
| MAJOR | unit-1 dims | `1 N = 6.31 × 10⁴` "dyne-equivalent" matches nothing | 10³ (force) / 10⁵ (energy) new units |
| MAJOR | unit-14 | "Convex mirror magnification is always negative" — must be positive (erect) | Always positive; virtual ⇒ erect |
| MAJOR | unit-14 numerical | Key (c) 7.5 m for m=½, f=2.5 m convex | u = 2.5 m (option b) |
| MAJOR | unit-14 numerical | Convex R=20, image ½ object size ⇒ "u = 30 cm" | u = 10 cm, v = 5 cm |
| MAJOR | unit-14 numerical | m = 1/5, f = 10 cm ⇒ printed "10 cm, 1/2" | u = 40 cm, v = 8 cm |
| MAJOR | unit-14 numerical | Concave f=30, "real & magnified" ⇒ printed answer is a diminished virtual answer | Object between F and 2F (30 < u < 60) |
| MINOR | unit-11 | Water equivalent: "W = ms = 80 g" (0.2 × 400) | W = 80 J/K ≈ 19 g of water |
| MINOR | unit-9 | "liquid thermometers work to −1000°C to 1000°C" | ≈ −100°C to 100°C (Hg boils 357°C) |
| MINOR | unit-9 | Ethyl alcohol freezing point "−130°C" | −114°C |
| MINOR | unit-9 | 98.4°F → printed 36.8°C, 309.8 K | 36.9°C, 310 K |
| MINOR | unit-9 | "Temperature = average KE of all molecules" | ...per molecule |
| MINOR | unit-9 | "Heat = sum of KE of all molecules" | That's internal energy; heat is energy in transit |
| MINOR | unit-14 | Red lead oxide given as "PbO" | Pb₃O₄ (PbO is litharge) |
| MINOR | unit-14 | "concave mirror converges rays in different directions" | ...to the focus |
| MINOR | unit-14 | ∠ABC = ∠CBF "alternate angles" | Law of reflection (i = r) |
| MINOR | unit-14 | m = 1.4/24 printed "0.05" | ≈ 0.06 |
| MINOR | unit-14 | 150/7 − 50/3 printed "4.67 cm" | 4.76 cm |
| MINOR | unit-14 | Erect m = 3 noted as needing "virtual object" | Real object between pole and focus |
| MINOR | unit-14 | Erect 3× image labeled "m = −3" | m = +3 |
| MINOR | unit-2 | Q: "A−B = C and A−B = C" garbled; answer 0° doesn't follow | State the intended condition (|A+B|=|A−B| ⇒ 90°) |
| MINOR | unit-2 | "PN = B sinθ" in vector derivation | PN = B cosθ (NQ = B sinθ) |
| TYPO | unit-17 | File titled "Lens Numericals" is entirely about mirrors | Rename |
| TYPO | unit-17 | "f is a physical property of the glass" (mirror context) | Depends on curvature f = R/2 |
| TYPO | unit-14 | "principal axis" misspelled "principle axis"; several F vs f slips | Fix spelling/notation |
| TYPO | unit-1 | "Accuracy is not the same as accuracy" | ...as precision |
| TYPO | unit-1 | Several garbled precision/accuracy sentences | Rewrite |

Also: **unit-14 image-characteristic tables** lost comparison operators and merged rows during extraction (4 rows affected) — restore `u > 2f`, `f < u < 2f`, `u < f`, `|m| < 1` etc.

### 3.2 Chemistry — 5 findings (1 MAJOR, 4 MINOR)

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MAJOR | unit-7 (states of matter) | 10 g of NH₃ given as "= 0.5 mole (approx.)" | 10/17 ≈ 0.588 mol |
| MINOR | unit-2 (stoichiometry) | T₂ = 606 K = 333°C ignores the prior half-volume compression; unit-7's own version gives 1212 K | Verify; align with 1212 K |
| MINOR | unit-7 | "Plasma forms at ~10,000°C" treated as threshold | Plasma forms at much lower temps too |
| MINOR | unit-7 | Pressure unit "newton per meter" | newton per metre² (N/m²) |
| MINOR | unit-3 | Gold foil thickness 0.00006 cm vs 0.00004 cm in another file | Standardize (0.00006 cm is standard) |

12 of 17 units are completely clean.

### 3.3 Mathematics — 23 findings (6 MAJOR, 13 MINOR, 4 TYPO)

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MAJOR | calculus | Continuity condition written `f(a) = lim f(a)` (tautology) | `f(a) = lim f(x)` |
| MAJOR | calculus | Left limit `x→0⁻` of x/|x| written as "0/0" | −1 |
| MAJOR | calculus | `x→2⁻` branch kx+3 used for left limit (that's the right branch) | Left: 3x−1 → 5 |
| MAJOR | calculus | Pattern note sign error: "θ·f'(θ) − f(θ)" | f(θ) − θ·f'(θ) |
| MAJOR | algebra | det result sign error: printed `+2(a+b+c)(a²+b²+c²−ab−bc−ca)`, verified −36 vs +36 for a=1,2,3 | Add leading minus |
| MAJOR | algebra | 1/0 written "= ∞" (twice more) | "undefined" |
| MINOR | algebra | Determinant derivations use invalid row/column ops in 8 places (final results correct) | Fix intermediate steps (details per finding) |
| MINOR | calculus | `2·lim sin(x−y)/2...` dropped minus sign mid-derivation (final −sin y correct) | −2·… |
| MINOR | calculus | Sign of ±∞ for b≠1 limit unspecified | State −∞ for b>1, +∞ for b<1 |
| TYPO | calculus | Three piecewise-function definitions garbled (conditions/branches lost) | Restore full cases |
| TYPO | calculus | `if m  n` missing comparator | if m > n |
| TYPO | analytic-geometry | √(cos²θ + (−sin²θ)) — square missing | cos²θ + sin²θ |

statistics, trigonometry, vectors, computational methods: clean.

### 3.4 Biology — 14 findings (1 MAJOR, 11 MINOR, 2 TYPO)

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MAJOR | unit-1 | "Chromoplast: contains anthocyanin in vesicles" | Anthocyanin is vacuolar; chromoplasts contain carotenoids |
| MINOR | unit-1 | "~90% of protoplasm is water" | ~70–80% |
| MINOR | unit-1 | Centriole duplication placed in G2 phase | Occurs in S phase |
| MINOR | unit-1 | Flemming mitosis "1879" | 1882 |
| MINOR | unit-1 | Steward totipotency "1950" | 1958 |
| MINOR | unit-1 | Kölliker mitochondria "1880" | 1857/1888 (verify) |
| MINOR | unit-1 | Chloroplast "discovered by Leeuwenhoek (1679)" | Atypical attribution; verify |
| MINOR | unit-1 | Plasmodesmata listed as a cell-wall layer | They are cytoplasmic channels through the wall |
| MINOR | unit-1 | Cell coat described as salt/silica deposition | That's mineralized walls (e.g. diatoms); glycocalyx is carbohydrate |
| MINOR | unit-2 | "Mesokaryotes lack nuclear membrane" | Dinoflagellates have a nuclear membrane; mesokaryotic = condensed chromosomes, no histones |
| TYPO | unit-1 | "Omnis cellula-e cellula" | "Omnis cellula e cellula" |

8 of 10 units completely clean.

### 3.5 Nepali — 12 findings (4 MAJOR, 6 MINOR, 2 TYPO)

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MAJOR | bhashatattva | "लेख्य स्वर (१३)" — लेख्य स्वर ७ मात्र (ई, ऊ, ऋ, ऐ, औ, अं, अः); उच्चार्य + लेख्य = १३ | "लेख्य स्वर (७): ई, ऊ, ऋ, ऐ, औ, अं, अः" |
| MAJOR | bhashatattva | Varna classification: ट labelled दन्तमूलीय, न/ल/स दन्त्य, र वत्सर्य etc. mixed | ट = मूर्धन्य, न/ल/स = दन्त्य, र = वत्सर्य, चवर्ग = तालव्य |
| MAJOR | nepali-sahitya | "हिन्दी र बाङ्लापछि नेपाली तेस्रो ठूलो भाषा" | False claim (Punjabi, Marathi, Urdu etc. are larger); reword |
| MAJOR | nepali-sahitya | "'बीसौँ शताब्दीकी नायिका' पहिलो मनोवैज्ञानिक उपन्यास" | That is a Pārijāt poem; the first psychological novel is Koirala's 'तीन घुम्ती' |
| MINOR | bhashatattva | Word-type division given as 3 types | Standard: 4 (तत्सम, तद्भव, देशज, आगन्तुक) |
| MINOR | bhashatattva | गुन्द्रुक/ढिँडो/झ्याल/खुकुरी listed as "स्वदेशी आगन्तुक" | These are देशज in standard grammars; verify |
| MINOR | nepali-sahitya | 2015 Constitution described as declaring Nepali "आधिकारिक भाषा" | Constitution says राष्ट्रभाषा/राज्यको कामकाजको भाषा |
| MINOR | nepali-sahitya | Literature periods: "उत्तर आधुनिक (१९५० पछि)" only | Add समकालीन (1990 पछि) |
| TYPO | poems | "दुई प्रकारकी हुन्छन्" | "दुई प्रकारका हुन्छन्" |
| TYPO | nepali-sahitya | "विसं १९९०" | "वि.सं. १९९०" |

### 3.6 English — 2 findings (both MINOR)

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MINOR | short stories | "NEB = Nepal Education Board" | National Examination Board |
| MINOR | subject-verb agreement | Blanket rule that "species" is always singular | Number-neutral; can take plural verbs |

Grammar, vocabulary and writing-task files are clean.

### 3.7 General Knowledge & Loksewa — 6 findings (3 MAJOR, 3 MINOR)

| Severity | Location | Issue | Fix |
|---|---|---|---|
| MAJOR | loksewa | PSC "Part 17, Articles 242–245" | Part 23, Articles 242–244 (PSC established 1951) |
| MAJOR | loksewa | "First census year: 2068 BS (2011)" | First census: 1968 BS (1911 AD); 2068 was the 11th |
| MAJOR | general-knowledge | "Nepal has 4 World Heritage Sites in Kathmandu Valley + Lumbini" | Kathmandu Valley is one site; the 4 are KV, Lumbini, Sagarmatha NP, Chitwan NP |
| MINOR | general-knowledge | pH note garbled: "7 = neutral; 7 basic" | "<7 acidic; >7 basic" |
| MINOR | loksewa | Koshi/Gandaki/Karnali called "three sisters" | Not standard; say "three major river systems" |

## 4. Recommendations

1. **Fix MAJOR items first** — they are concentrated in ~10 files: `physics/unit-1-physical-quantities` MCQs and dimension problems, `physics/unit-14-reflection-at-curved-mirror` numerical keys, `mathematics/calculus` continuity limits, `mathematics/algebra` determinant sign, `nepali/bhashatattva` and `nepali/nepali-sahitya` facts, `loksewa` and `general-knowledge` fact files, `chemistry/unit-7` mole calculation.
2. **Re-check MCQ answer keys systematically** — several wrong keys were found (sig figs, dimensions, mirror numerics); consider an automated re-derivation pass for all numerical MCQs.
3. **Clean the extraction artifacts** — tables with stripped comparison operators (`u > 2f`, `|m| > 1`, `m > n`) and double spaces; these degrade the reading experience even though content is intact.
4. **Verify the "verify" items** — findings marked *verify* (dated attributions, contested classifications) need a source check before changing.

## 5. Verification

Reproduce the audit by re-running the extraction and reading the per-subject review extracts:

```
node C:\Users\ASUS\AppData\Local\Temp\opencode\extract-notes.cjs
# outputs to C:\Users\ASUS\AppData\Local\Temp\opencode\audit\<subject>.txt
```
