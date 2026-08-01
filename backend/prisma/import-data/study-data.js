// src/data.js (or src/data.ts)
export const STUDY_DATA = {
  "physics": {
    "name": "Physics",
    "icon": "⚛️",
    "color": "#4f8bff",
    "color2": "#8b5cf6",
    "tagline": "Mechanics, Thermodynamics & Electromagnetism",
    "chapters": [
      {
        "id": "chapter-1",
        "title": "Units, Dimensions & Physical Quantities",
        "description": "Fundamental units, dimensional analysis, and error calculations.",
        "topics": [
          {
            "id": "topic-1",
            "title": "Physical Quantities & Dimensions",
            "description": "SI units, dimensional formulas, and principle of homogeneity."
          },
          {
            "id": "topic-2",
            "title": "Vectors & Scalar Fields",
            "description": "Vector addition, dot product, cross product, and resolution."
          },
          {
            "id": "topic-3",
            "title": "Errors & Measurements",
            "description": "Random and systematic errors, precision, and significant figures."
          }
        ]
      },
      {
        "id": "chapter-2",
        "title": "Newtonian Mechanics & Kinematics",
        "description": "Motion in 1D/2D, Newton's Laws, Momentum, and Friction.",
        "topics": [
          {
            "id": "topic-1",
            "title": "Equations of Motion & Projectile Motion",
            "description": "Trajectories, time of flight, horizontal range, and max height."
          }
        ]
      }
    ]
  },
  "chemistry": {
    "name": "Chemistry",
    "icon": "🧪",
    "color": "#a855f7",
    "color2": "#ec4899",
    "tagline": "Physical, Organic & Inorganic Principles",
    "chapters": [
      {
        "id": "gas-laws",
        "title": "Gas Laws & Kinetic Theory",
        "description": "Boyle's Law, Charles' Law, Ideal Gas Equation, and KMT postulates.",
        "topics": [
          {
            "id": "boyles-law",
            "title": "Boyle's Law & Kinetic Molecular Theory",
            "description": "Pressure-volume relationship and the 8 fundamental postulates of KMT."
          }
        ]
      },
      {
        "id": "states-of-matter",
        "title": "States of Matter",
        "description": "Characteristics of solids, liquids, gases, plasma, and BEC.",
        "topics": [
          {
            "id": "properties",
            "title": "Key Gas Properties (GMVTP)",
            "description": "Gaseous state, Mass, Volume, Temperature, and Pressure metrics."
          },
          {
            "id": "five-states",
            "title": "The Five States of Matter",
            "description": "Solid, Liquid, Gas, Plasma, and Bose-Einstein Condensate."
          }
        ]
      },
      {
        "id": "classification-of-matter",
        "title": "Classification of Matter",
        "description": "Physical vs chemical classification, pure substances, mixtures, and elements.",
        "topics": [
          {
            "id": "physical-chemical-classification",
            "title": "Physical & Chemical Classification",
            "description": "Pure vs impure substances and physical state splits."
          },
          {
            "id": "pure-substances-mixtures",
            "title": "Pure Substances & Mixtures",
            "description": "Elements, compounds, homogeneous and heterogeneous mixtures."
          },
          {
            "id": "metals-nonmetals-metalloids",
            "title": "Metals, Non-metals & Metalloids",
            "description": "Electropositivity, electronegativity, conductivity, and metalloid semiconductors."
          },
          {
            "id": "organic-inorganic-compounds",
            "title": "Organic & Inorganic Compounds",
            "description": "Hydrocarbons, derivatives, vital force disproof, and mineral compounds."
          }
        ]
      },
      {
        "id": "compounds",
        "title": "Compounds & Chemical Bonding",
        "description": "Composition, preparation, and isolation of fundamental molecules.",
        "topics": [
          {
            "id": "water",
            "title": "Water (H₂O) & Electrolysis",
            "description": "Dihydrogen monoxide structure, synthesis, and electrolytic decomposition."
          }
        ]
      },
      {
        "id": "atomic-structure",
        "title": "Atomic Structure & Mole Concept",
        "description": "Atoms, molecules, symbols, atomic mass, and gram atoms.",
        "topics": [
          {
            "id": "atoms-molecules",
            "title": "Atoms & Molecules",
            "description": "Homoatomic vs heteroatomic molecules and free state existence."
          },
          {
            "id": "symbols-of-elements",
            "title": "Symbols of Elements",
            "description": "Derivation rules, Latin names, qualitative and quantitative meaning."
          },
          {
            "id": "atomic-mass-gram-atom",
            "title": "Atomic Mass, Gram Atom & Isotopes",
            "description": "Mole concept, Avogadro's number, and average atomic mass calculations."
          }
        ]
      },
      {
        "id": "atomic-mass-definitions",
        "title": "Atomic Mass & Atomic Mass Unit",
        "description": "Historical Hydrogen standard and modern Carbon-12 standard.",
        "topics": [
          {
            "id": "atomic-mass-def",
            "title": "Atomic Mass / Relative Atomic Mass",
            "description": "1 amu definition (1.66 × 10⁻²⁴ g) and relative comparisons."
          }
        ]
      },
      {
        "id": "molecular-mass",
        "title": "Relative Molecular Mass & Formula Mass",
        "description": "Molar mass, gram mole, and formula mass for ionic crystals.",
        "topics": [
          {
            "id": "relative-molecular-mass",
            "title": "Relative Molecular Mass & Gram Mole",
            "description": "Calculating molecular mass for glucose, sucrose, H₂SO₄."
          },
          {
            "id": "formula-mass",
            "title": "Formula Mass of Ionic Compounds",
            "description": "NaCl, Na₂CO₃ formula mass in atomic mass units."
          }
        ]
      },
      {
        "id": "organic-chemistry-basics",
        "title": "Organic Chemistry Foundations",
        "description": "Carbon degree classification, vinylic/allylic groups, hybridization, and homologous series.",
        "topics": [
          {
            "id": "carbon-classification",
            "title": "Classifying Carbons (1°, 2°, 3°, 4°)",
            "description": "Primary, secondary, tertiary, and quaternary carbon identification."
          },
          {
            "id": "vinyl-vinylic-allylic",
            "title": "Vinyl, Vinylic & Allylic Groups",
            "description": "sp² double bond position vs sp³ adjacent allylic carbon."
          },
          {
            "id": "hybridization",
            "title": "Hybridization of Carbon (sp, sp², sp³)",
            "description": "Counting sigma bonds, pi bond rules, and molecular geometry."
          },
          {
            "id": "homologous-series",
            "title": "Homologous Series",
            "description": "CH₂ increment in alkanes and alcohol series."
          }
        ]
      },
      {
        "id": "atomic-models",
        "title": "Atomic Models & Isotopic Species",
        "description": "Dalton, Rutherford, Bohr models, subatomic particles, isotopes, isobars, isotones, isoelectronic, and isodiaphers.",
        "topics": [
          {
            "id": "daltons-theory",
            "title": "Dalton's Atomic Theory & Limitations",
            "description": "Original 1808 postulates and why nuclear physics modified them."
          },
          {
            "id": "subatomic-particles",
            "title": "Subatomic Particles & Specific Charge",
            "description": "Electron, proton, neutron properties, (q/m) ratios, Z, and A."
          },
          {
            "id": "rutherfords-model",
            "title": "Rutherford's Alpha Scattering Experiment",
            "description": "1911 gold foil experiment, ZnS screen, conclusions, and defects."
          },
          {
            "id": "bohrs-model",
            "title": "Bohr's Atomic Model & Planck's Quantum Theory",
            "description": "Fixed energy shells, ground vs excited state, and E = hc/λ."
          },
          {
            "id": "isotopes-isobars-isotones",
            "title": "Isotopes, Isobars, Isotones, Isoelectronic & Isodiaphers",
            "description": "Comprehensive breakdown of all subatomic relationship classes with worked tables."
          }
        ]
      }
    ]
  },
  "biology": {
    "name": "Biology",
    "icon": "🧬",
    "color": "#22c55e",
    "color2": "#14b8a6",
    "tagline": "Cellular Biology, Biomolecules & Genetics",
    "chapters": [
      {
        "id": "chapter-1",
        "title": "Cell Structure & Organization",
        "description": "Prokaryotic vs eukaryotic cells and organelle functions.",
        "topics": [
          {
            "id": "topic-1",
            "title": "Cell Membrane & Transport",
            "description": "Fluid mosaic model, passive diffusion, active transport."
          },
          {
            "id": "topic-2",
            "title": "Organelles & Cytoskeleton",
            "description": "Mitochondria, ER, Golgi apparatus, chloroplasts."
          },
          {
            "id": "topic-3",
            "title": "Cell Division & Mitosis",
            "description": "Cell cycle phases, mitosis, and meiosis."
          }
        ]
      },
      {
        "id": "bio-molecules",
        "title": "Bio-molecules & Chemical Basis of Life",
        "description": "Carbohydrates, proteins, nucleic acids, lipids, and enzymes.",
        "topics": [
          {
            "id": "mcqs1",
            "title": "Biomolecules MCQs - Set 1",
            "description": "High-yield practice set on glycosidic, peptide, and phosphodiester linkages."
          }
        ]
      }
    ]
  },
  "english": {
    "name": "English",
    "icon": "📚",
    "color": "#3b82f6",
    "color2": "#8b5cf6",
    "tagline": "Grammar Frameworks, Vocabulary & Applied Composition",
    "chapters": [
      {
        "id": "grammar-vocabulary",
        "title": "Grammar & Vocabulary Syllabus",
        "description": "Comprehensive 20-mark grammar and vocabulary specification.",
        "topics": [
          {
            "id": "grammar-rules",
            "title": "Grammar Frameworks & Mechanics (15 Marks)",
            "description": "Concord, modal auxiliaries, tense/aspect, gerunds, relative clauses, voice, and reported speech."
          },
          {
            "id": "vocabulary-study",
            "title": "Vocabulary Systems & Lexicon (5 Marks)",
            "description": "Sound system, roots, affixes, inflexion, phrasal verbs, idioms, and dictionary skills."
          }
        ]
      },
      {
        "id": "writing-tasks",
        "title": "Writing & Literature Tasks",
        "description": "Structured paragraph design, literature interpretations, formal correspondence, and essays.",
        "topics": [
          {
            "id": "task-group-1",
            "title": "Reading & Structured Writing (Tasks 1-4)",
            "description": "Reading comprehension up to 1700 words, literature answers (107-150 words), and graphic conversions."
          },
          {
            "id": "task-group-2",
            "title": "Applied Writing & Creative Compositions (Tasks 5-6)",
            "description": "Job applications, CV design, letters to editors, formal essays, reviews, and press releases."
          }
        ]
      },
      {
        "id": "subject-verb-agreement",
        "title": "Subject-Verb Agreement Masterclass",
        "description": "Tricky singular vs plural nouns and compound subjects.",
        "topics": [
          {
            "id": "looks-plural-is-singular",
            "title": "Looks Plural, Takes Singular Verb",
            "description": "Physics, Mathematics, News, Measles, United States, 10 dollars."
          },
          {
            "id": "looks-singular-is-plural",
            "title": "Looks Singular, Takes Plural Verb",
            "description": "Police, People, Cattle, Poultry, Clergy, Staff."
          },
          {
            "id": "compound-and-subjects",
            "title": "Compound Subjects Joined by 'And'",
            "description": "One single meal unit (bread and butter is) vs separate grocery items (are)."
          },
          {
            "id": "plural-only-nouns",
            "title": "Plural-Only Nouns: Clothing & Tools",
            "description": "Pants, jeans, scissors, pliers, glasses, headphones."
          }
        ]
      }
    ]
  },
  "nepali": {
    "name": "Nepali",
    "icon": "🇳🇵",
    "color": "#f43f5e",
    "color2": "#fb923c",
    "tagline": "नेपाली व्याकरण, भाषातत्त्व र अभ्यास",
    "chapters": [
      {
        "id": "bhashatattva",
        "title": "भाषातत्त्व र शब्द स्रोत",
        "description": "शब्द स्रोत, स्वर वर्ण, व्यञ्जन वर्ण, र वर्णको वर्गीकरण।",
        "topics": [
          {
            "id": "shabda-srot",
            "title": "शब्द स्रोत र तत्सम शब्द",
            "description": "संस्कृतबाट जस्ताको त्यस्तै आएका तत्सम शब्द चिन्ने आधारहरू।"
          },
          {
            "id": "tadbhav-shabda",
            "title": "तद्भव शब्द पहिचानका आधार",
            "description": "संस्कृतबाट रूप परिवर्तन भई आएका तद्भव शब्द।"
          },
          {
            "id": "aagantuk-shabda",
            "title": "स्वदेशी र विदेशी आगन्तुक शब्द",
            "description": "नेपाल भित्रका भाषा र विदेशी भाषाबाट आएका शब्दहरू।"
          },
          {
            "id": "swar-varna",
            "title": "उच्चार्य र लेख्य स्वर वर्ण",
            "description": "६ उच्चार्य र १३ लेख्य स्वर वर्णहरू।"
          },
          {
            "id": "vyanjan-varna",
            "title": "उच्चार्य र लेख्य व्यञ्जन वर्ण",
            "description": "२९ उच्चार्य र ३६ लेख्य व्यञ्जन वर्णहरू।"
          },
          {
            "id": "vyanjan-vargikaran",
            "title": "नेपाली व्यञ्जनको वर्गीकरण",
            "description": "उच्चारण स्थान, प्रयत्न, घोषत्व, र प्राणत्वका आधारमा वर्गीकरण।"
          }
        ]
      },
      {
        "id": "thap-abhyas",
        "title": "थप व्याकरण अभ्यास र समाधान",
        "description": "वर्ण वर्गीकरण, प्राणत्व, घोषत्व, र स्थान सम्बन्धी परीक्षा-केन्द्रित अभ्यास।",
        "topics": [
          {
            "id": "varnako-wargikaran",
            "title": "वर्ण वर्गीकरण अभ्यास (सेट १ र २)",
            "description": "परीक्षा उपयोगी अभ्यास सेटहरू र तिनका पूर्ण समाधानहरू।"
          }
        ]
      }
    ]
  },
  "mathematics": {
    "name": "Mathematics",
    "icon": "📐",
    "color": "#06b6d4",
    "color2": "#3b82f6",
    "tagline": "Calculus, Algebra & Mathematical Proofs",
    "chapters": [
      {
        "id": "chapter-1",
        "title": "Algebra & Polynomial Equations",
        "description": "Quadratic equations, complex numbers, and sequence/series.",
        "topics": [
          {
            "id": "topic-1",
            "title": "Complex Numbers & Argand Diagrams",
            "description": "Imaginary unit i, modulus, argument, and polar form."
          },
          {
            "id": "topic-2",
            "title": "Quadratic Equations & Roots",
            "description": "Discriminant, nature of roots, and Vieta's formulas."
          },
          {
            "id": "topic-3",
            "title": "Binomial Theorem & Pascal Triangle",
            "description": "General term, middle term, and coefficients."
          }
        ]
      },
      {
        "id": "chapter-2",
        "title": "Limits & Continuity",
        "description": "Evaluating limits: direct substitution, factoring, conjugates, trig limits, and L'Hôpital's Rule.",
        "topics": [
          {
            "id": "topic-1",
            "title": "Quiz -1 - Limit Evaluation Techniques",
            "description": "5 fundamental limit tools with step-by-step worked examples."
          },
          {
            "id": "topic-2",
            "title": "Limits Master Class & Intuition",
            "description": "Deep conceptual intuition behind indeterminate forms (0/0) and derivative limits."
          }
        ]
      }
    ]
  }
};

export const TOPIC_CONTENT = {
  "mathematics__chapter-2__topic-1": {
    "notes": [
      "<b>The Core Philosophy of Limits.</b> A limit asks: as <i>x</i> gets infinitely close to a number, what value is the function heading toward? Sometimes the function has a 'hole' at that exact spot — plugging the number in directly gives 0/0, called an <b>Indeterminate Form</b>. This does <u>not</u> mean the limit doesn't exist; it means the answer is hidden and needs algebra or calculus to expose it. Think of <b>Direct Substitution</b> as checking the front door: if it's unlocked (gives a real number), you walk right in. If it's locked with a 0/0 sign, you need the right tool to pick the lock.",
      "<b>Tool 1 — Direct Substitution (The Front Door).</b> When to use: always try this first, for smooth continuous functions. Example: <span class=\"formula\">lim(x→2) (3x² − 5x + 1) = 3(2)² − 5(2) + 1 = 3</span>.",
      "<b>Tool 2 — Factoring Method (The Common Factor Cleaner).</b> When to use: if direct substitution gives 0/0 and you see polynomial expressions that share a common factor. Example: <span class=\"formula\">lim(x→3) (x² − 9)/(x − 3) = lim(x→3) (x−3)(x+3)/(x−3) = lim(x→3) (x+3) = 6</span>.",
      "<b>Tool 3 — Conjugate Multiplication (The Radical Vaporizer).</b> When to use: if you get 0/0 and see a square root expression like √A − B. Multiply top and bottom by the conjugate (flip the sign): <span class=\"formula\">(√A − B)(√A + B) = A − B²</span>.",
      "<b>Tool 4 — Standard Trigonometric Limits (The Squeeze Anchors).</b> When to use: for sin(x) or tan(x) ratios approaching zero. The key rule: <span class=\"formula\">lim(θ→0) sin(θ)/θ = 1</span>.",
      "<b>Tool 5 — L'Hôpital's Rule (The Nuclear Option).</b> When to use: if you get 0/0 or ∞/∞ and know derivatives. Differentiate the top and bottom <i>separately</i> (not using the quotient rule), then re-evaluate: <span class=\"formula\">lim f(x)/g(x) = lim f'(x)/g'(x)</span>."
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Concept diagram: Limits approaching continuous vs indeterminate states."
    },
    "examples": [
      {
        "title": "Q1: Indeterminate Forms",
        "problem": "When evaluating a limit, which expression is considered an 'indeterminate form' requiring further algebraic manipulation or calculus — 5/0, 0/5, 5⁰, or 0/0?",
        "solution": "Answer: 0/0. An indeterminate form is one where the parts alone don't give enough information to determine the limit. 5/0 is undefined (tends to infinity); 0/5 is exactly 0; 5⁰ is exactly 1. But 0/0 could equal any real number depending on the function — that's what makes it indeterminate."
      },
      {
        "title": "Q2: Direct Substitution — First Step",
        "problem": "Find lim(x→2) (3x² − 5x + 1). What is the very first step you should always attempt?",
        "solution": "Answer: substitute x = 2 directly. Never start with factoring or advanced rules — always check if the function is continuous by plugging in the value first. 3(2)² − 5(2) + 1 = 12 − 10 + 1 = 3. Since 3 is a real number, no further work is needed."
      },
      {
        "title": "Q3: Direct Substitution — Continuous Trig",
        "problem": "Consider lim(x→0) (x + cos(x)). Which method should you use?",
        "solution": "Answer: Direct Substitution. Substituting x = 0 gives 0 + cos(0) = 0 + 1 = 1. Because the output is a single defined real number, the function is continuous at that point, so direct substitution is valid."
      },
      {
        "title": "Q4: Factoring Method",
        "problem": "Evaluate lim(x→3) (x² − 9)/(x − 3). What method should you try, and what is the result?",
        "solution": "Answer: Factoring; result = 6. Step 1: Direct substitution gives (3²−9)/(3−3) = 0/0 — indeterminate, so try another tool. Step 2: Factor the numerator as a difference of squares: x² − 9 = (x−3)(x+3). Step 3: Cancel the common (x−3) factor (valid since x ≠ 3 as we approach the limit), leaving lim(x→3)(x+3). Step 4: Substitute again: 3 + 3 = 6."
      },
      {
        "title": "Q5: Conjugate Multiplication",
        "problem": "Evaluate lim(x→4) (√x − 2)/(x − 4). What tool bypasses this radical roadblock?",
        "solution": "Answer: Conjugate Multiplication; result = 1/4. Step 1: Substituting x = 4 gives (√4−2)/(4−4) = 0/0. Step 2: Multiply top and bottom by the conjugate (√x + 2). Step 3: The numerator becomes (√x)² − 2² = x − 4 via the (A−B)(A+B) identity. Step 4: Cancel the matching (x−4) terms, leaving lim(x→4) 1/(√x+2) = 1/(2+2) = 1/4."
      },
      {
        "title": "Q6: Special Trigonometric Limits",
        "problem": "Find lim(x→0) sin(5x)/x.",
        "solution": "Answer: 5. Step 1: The base rule is lim(θ→0) sin(θ)/θ = 1. Step 2: The angle inside sine is 5x, but the denominator is only x — multiply top and bottom by 5 to match: 5 · sin(5x)/(5x). Step 3: Pull the constant 5 outside the limit: 5 · [lim(x→0) sin(5x)/5x]. Since x→0 implies 5x→0, the bracketed limit evaluates to 1. Step 4: 5 · 1 = 5."
      },
      {
        "title": "Q7: L'Hôpital's Rule",
        "problem": "Evaluate lim(x→0) (eˣ − 1)/x using L'Hôpital's Rule.",
        "solution": "Answer: 1. Step 1: Substituting x = 0 gives (e⁰−1)/0 = 0/0 — indeterminate, so L'Hôpital's Rule applies. Step 2: Differentiate top and bottom separately: d/dx(eˣ−1) = eˣ; d/dx(x) = 1. Step 3: Re-evaluate the new limit: lim(x→0) eˣ/1 = e⁰/1 = 1/1 = 1."
      }
    ],
    "practice": {
      "mcqs": [
        "Which expression is an indeterminate form: 5/0, 0/5, 5⁰, or 0/0?",
        "What is the first step to attempt for any limit problem?",
        "Evaluate lim(x→0) (x + cos(x)).",
        "Evaluate lim(x→3) (x² − 9)/(x − 3).",
        "Evaluate lim(x→4) (√x − 2)/(x − 4).",
        "Evaluate lim(x→0) sin(5x)/x.",
        "Evaluate lim(x→0) (eˣ − 1)/x using L'Hôpital's Rule."
      ],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "Direct Substitution",
        "expression": "lim(x→a) f(x) = f(a), when f is continuous at a"
      },
      {
        "name": "Factoring (difference of squares example)",
        "expression": "x² − a² = (x − a)(x + a)"
      },
      {
        "name": "Conjugate Identity",
        "expression": "(√A − B)(√A + B) = A − B²"
      },
      {
        "name": "Standard Trig Limit",
        "expression": "lim(θ→0) sin(θ)/θ = 1"
      },
      {
        "name": "L'Hôpital's Rule",
        "expression": "lim f(x)/g(x) = lim f'(x)/g'(x), for 0/0 or ∞/∞ forms"
      }
    ],
    "keyPoints": [
      "Always try Direct Substitution first — it's the fastest check.",
      "A result of 0/0 or ∞/∞ means 'indeterminate,' not 'no limit' — it signals you need another tool.",
      "Factoring works when polynomials share a cancellable common factor.",
      "Conjugate multiplication is the go-to move whenever a square root creates the 0/0 form.",
      "sin(θ)/θ → 1 as θ→0 is a memorized anchor — match the angle inside sin to the denominator by multiplying/dividing by a constant.",
      "L'Hôpital's Rule differentiates numerator and denominator separately (not the quotient rule) — reserve it for when you know derivatives and other tools are slower."
    ],
    "summary": "Limits describe the value a function approaches as x nears a point, even if the function isn't actually defined there. Start every problem with Direct Substitution; if it produces an indeterminate form like 0/0, pick the right follow-up tool — Factoring for polynomials, Conjugate Multiplication for square roots, the standard sin(θ)/θ → 1 identity for trig ratios, or L'Hôpital's Rule (differentiating top and bottom separately) when derivatives are available."
  },
  "mathematics__chapter-2__topic-2": {
    "notes": [
      "<b>The Core Philosophy of Limits.</b> A limit asks: as <i>x</i> gets infinitely close to a number, what value is the function heading toward? Sometimes the function has a physical 'hole' at that exact spot — plugging the number in gives 0/0, an <b>Indeterminate Form</b>. This does <u>not</u> mean the limit doesn't exist; the answer is hidden and needs algebra or calculus to reveal it. <b>Direct Substitution</b> is checking the front door: if it's unlocked (gives a real number) you walk right in; if it's locked with a 0/0 sign, you need the right tool to pick the lock.",
      "<b>Tool 1 — Direct Substitution (The Front Door).</b> When to use: always try this first — for polynomials, basic trig functions, exponentials, or any smooth, continuous function. <i>Intuition:</i> if the graph has no holes, gaps, or vertical asymptotes at your target point, the value <i>at</i> the point equals the value <i>approaching</i> it. Example: lim(x→2) (3x²−5x+1) → replace every x with 2 → 3(4)−10+1 = 3. A clean real number means you're done.",
      "<b>Tool 2 — Factoring Method (The Common Factor Cleaner).</b> When to use: direct substitution gives 0/0 <i>and</i> the equation is a standard polynomial (like x²−9). <i>Intuition:</i> the 0/0 happens because a 'zero-maker' factor is hiding in both top and bottom — e.g. if x→3, the factor (x−3) causes both to hit zero. Find it, factor it out, and cancel it. Example: lim(x→3) (x²−9)/(x−3) → factor x²−9 = (x−3)(x+3) → cancel (x−3) → lim(x→3)(x+3) = 6.",
      "<b>Tool 3 — Conjugate Multiplication (The Radical Vaporizer).</b> When to use: direct substitution gives 0/0 <i>and</i> there's a square root attached to a plus/minus sign (like √(x+4) − 2). <i>Intuition:</i> square roots are hard to factor directly, so multiply by the <b>conjugate</b> — for (A−B), that's (A+B) — since (A−B)(A+B) = A²−B², which vaporizes the square root. Example: lim(x→0) (√(x+4)−2)/x → multiply by (√(x+4)+2) → top becomes x → cancel x → lim(x→0) 1/(√(x+4)+2) = 1/4.",
      "<b>Tool 4 — Standard Trigonometric Limits (The Squeeze Anchors).</b> When to use: sin(x) or tan(x) approaching 0, with direct substitution giving 0/0. <i>Intuition:</i> as an angle x gets very close to 0, the arc length (x) and sin(x) become practically identical, so their ratio approaches 1. Golden Rule: lim(θ→0) sin(θ)/θ = 1. Example: lim(x→0) sin(4x)/x → multiply top and bottom by 4 to match the inner angle → lim(x→0) [sin(4x)/4x · 4] = 1 · 4 = 4.",
      "<b>Tool 5 — L'Hôpital's Rule (The Nuclear Option).</b> When to use: direct substitution gives 0/0 or ∞/∞, and derivatives are known. <i>Intuition:</i> if a fraction hits 0/0, its limit equals the limit of the derivatives of the top and bottom (their individual rates of change). Rule: if lim f(x)/g(x) = 0/0, then lim f(x)/g(x) = lim f'(x)/g'(x). Example: lim(x→3) (x²−9)/(x−3) → derivative of top is 2x, of bottom is 1 → new limit lim(x→3) 2x/1 = 2(3) = 6 (matches the factoring answer)."
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Concept diagram: Limits Master Class."
    },
    "examples": [
      {
        "title": "Worked Example — Direct Substitution",
        "problem": "lim(x→2) (3x² − 5x + 1)",
        "solution": "Replace every x with 2: 3(2)² − 5(2) + 1 = 12 − 10 + 1 = 3. A clean, real number means you're done — no further tools needed."
      },
      {
        "title": "Worked Example — Factoring Method",
        "problem": "lim(x→3) (x² − 9)/(x − 3)",
        "solution": "Plugging in 3 gives (3²−9)/(3−3) = 0/0. Factor the numerator as a difference of squares: x²−9 = (x−3)(x+3). Cancel (x−3) from top and bottom, leaving lim(x→3)(x+3) = 3+3 = 6."
      },
      {
        "title": "Worked Example — Conjugate Multiplication",
        "problem": "lim(x→0) (√(x + 4) − 2)/x",
        "solution": "Plugging in 0 gives (√4−2)/0 = 0/0. Multiply top and bottom by the conjugate √(x+4)+2. The top becomes (√(x+4))² − 2² = x+4−4 = x. The fraction becomes x / [x(√(x+4)+2)]; cancel x, leaving 1/(√(x+4)+2). Substitute 0: 1/(√4+2) = 1/4."
      },
      {
        "title": "Worked Example — Standard Trig Limit",
        "problem": "lim(x→0) sin(4x)/x",
        "solution": "Multiply top and bottom by 4 so the denominator matches the inner angle (4x): lim(x→0) [sin(4x)/4x · 4]. Since sin(4x)/4x → 1 as x→0, the result is 1 · 4 = 4."
      },
      {
        "title": "Worked Example — L'Hôpital's Rule",
        "problem": "lim(x→3) (x² − 9)/(x − 3), solved via derivatives instead of factoring",
        "solution": "Direct substitution gives 0/0. Differentiate top and bottom separately: derivative of x²−9 is 2x; derivative of x−3 is 1. New limit: lim(x→3) 2x/1 = 2(3) = 6 — the same answer factoring gave, confirming the rule works."
      }
    ],
    "practice": {
      "mcqs": [
        "Which expression is an indeterminate form, and why does it require further work?",
        "What is the very first step to attempt for any limit problem, regardless of its form?",
        "Why is direct substitution valid for lim(x→0) (x + cos(x))?"
      ],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "Direct Substitution",
        "expression": "lim(x→a) f(x) = f(a), when f is continuous at a"
      },
      {
        "name": "Factoring (difference of squares)",
        "expression": "x² − a² = (x − a)(x + a)"
      },
      {
        "name": "Conjugate Identity",
        "expression": "(A − B)(A + B) = A² − B²"
      },
      {
        "name": "Standard Trig Limit (Golden Rule)",
        "expression": "lim(θ→0) sin(θ)/θ = 1"
      },
      {
        "name": "L'Hôpital's Rule",
        "expression": "if lim f(x)/g(x) = 0/0, then lim f(x)/g(x) = lim f'(x)/g'(x)"
      }
    ],
    "keyPoints": [
      "An indeterminate form (0/0 or ∞/∞) means the answer is hidden, not that the limit doesn't exist.",
      "Direct Substitution works whenever the function has no holes, gaps, or asymptotes at that point — always try it first.",
      "Factoring removes a shared 'zero-maker' factor causing the 0/0 in polynomial fractions.",
      "The conjugate trick turns a subtracted square root into a clean polynomial via (A−B)(A+B) = A²−B².",
      "sin(θ)/θ → 1 as θ→0 because the arc length and the sine value become practically identical near zero.",
      "L'Hôpital's Rule differentiates the numerator and denominator independently."
    ],
    "summary": "This master class builds the intuition behind each limit-evaluation tool rather than just the mechanics: Direct Substitution, Factoring, Conjugate Multiplication, Trigonometric Limits, and L'Hôpital's Rule."
  },
  "biology__bio-molecules__mcqs1": {
    "notes": [
      "<h2>Introduction to Biomolecules</h2>\n<p>Biomolecules are organic molecules synthesized by living organisms, acting as the fundamental building blocks of life. They are broadly divided into four major classes: <b>Carbohydrates</b> (energy sources), <b>Proteins</b> (structural and catalytic units), <b>Nucleic Acids</b> (genetic blueprint), and <b>Lipids</b> (energy storage and cell membranes).</p>",
      "<h3>Key Monomer-Polymer Linkages to Remember:</h3>\n<ul>\n  <li><b>Carbohydrates:</b> Monosaccharides linked by <u>Glycosidic bonds</u>.</li>\n  <li><b>Proteins:</b> Amino acids linked by <u>Peptide bonds</u>.</li>\n  <li><b>Nucleic Acids:</b> Nucleotides linked by <u>Phosphodiester bonds</u>.</li>\n</ul>"
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Biomolecule structural classifications diagram."
    },
    "examples": [
      {
        "title": "Q1: Carbohydrate Linkages",
        "problem": "Which type of bond links individual monosaccharide units together to form a polysaccharide like starch or cellulose?",
        "solution": "Answer: Glycosidic bond. A glycosidic bond forms via a dehydration reaction between the hydroxyl groups of two saccharide molecules. Peptide bonds belong to proteins, phosphodiester bonds belong to nucleic acids, and ester linkages are found in lipids."
      },
      {
        "title": "Q2: Amino Acid Structure",
        "problem": "Every amino acid contains a central carbon atom bonded to a hydrogen atom, an amino group, a carboxyl group, and a variable side chain. What is this variable side chain called?",
        "solution": "Answer: R-group (or Side Chain). The R-group specifies the unique identity and chemical behavior of each of the 20 standard amino acids (e.g., whether it is polar, non-polar, acidic, or basic)."
      },
      {
        "title": "Q3: Nucleic Acid Components",
        "problem": "A nucleotide is the monomeric unit of nucleic acids (DNA and RNA). What three structural components make up a single nucleotide?",
        "solution": "Answer: A pentose sugar, a nitrogenous base, and a phosphate group. If the phosphate group is missing, the molecule is called a nucleoside instead."
      },
      {
        "title": "Q4: Protein Structure Levels",
        "problem": "The linear sequence of amino acids in a polypeptide chain represents which level of protein structure?",
        "solution": "Answer: Primary Structure. The primary structure is determined strictly by covalent peptide bonds. Folding into alpha-helices or beta-pleated sheets forms the secondary structure, while overall 3D structural folding represents the tertiary structure."
      },
      {
        "title": "Q5: RNA vs DNA Bases",
        "problem": "Which nitrogenous base is unique to RNA molecules and replaces thymine, which is found only in DNA?",
        "solution": "Answer: Uracil. Uracil pairs with adenine in RNA, just as thymine pairs with adenine in DNA. Cytosine and guanine are found in both DNA and RNA."
      }
    ],
    "practice": {
      "mcqs": [
        "Which type of bond links individual monosaccharide units together to form a polysaccharide?",
        "What is the variable side chain in an amino acid structural layout called?",
        "What three structural components make up a single nucleotide unit?",
        "The linear sequence of amino acids in a polypeptide chain represents which structural level?",
        "Which nitrogenous base is unique to RNA molecules and replaces thymine?"
      ],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "General Carbohydrate Formula",
        "expression": "Cn(H2O)n"
      },
      {
        "name": "Amino Acid General Structure",
        "expression": "H2N–CHR–COOH"
      }
    ],
    "keyPoints": [
      "Carbohydrates primarily serve as short-to-medium term energy storage (e.g., glycogen, starch).",
      "Proteins perform structural support, cellular signaling, transport, and enzymatic catalysis.",
      "DNA contains deoxyribose sugar and thymine; RNA contains ribose sugar and uracil.",
      "Lipids are hydrophobic or amphipathic macromolecules that do not form true polymeric chains."
    ],
    "summary": "This question set reviews the foundational concepts of Biomolecules—including structural monomer pairings, characteristic chemical bonds, and defining traits separating DNA, RNA, proteins, and carbohydrates."
  },
  "english__grammar-vocabulary__grammar-rules": {
    "notes": [
      "<h2>Grammar (15 Marks Total)</h2><p>The test item on grammar will cover the following contents:</p><ol type=\"a\"><li>Adjective and adverbs</li><li>Concord / subject-verb agreement</li><li>Preposition</li><li>Modal auxiliaries</li><li>Tense and aspects</li><li>Infinitive and gerunds</li><li>Conjunction</li><li>Relative clause</li><li>Voice</li><li>Reported speech</li></ol>"
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Grammar syllabus content map (a-j)."
    },
    "examples": [
      {
        "title": "Subject-Verb Agreement",
        "problem": "Correct the sentence: 'The collection of rare books are valuable.'",
        "solution": "Correction: 'The collection of rare books IS valuable.' Explanation: 'Collection' is a singular collective noun acting as the true subject; the intervening prepositional phrase does not change the singular requirement."
      },
      {
        "title": "Reported Speech Shift",
        "problem": "Convert to indirect speech: She said, 'I completed the assessment yesterday.'",
        "solution": "Answer: She said that she had completed the assessment the day before. Explanation: Tense shifts backwards (Past Simple → Past Perfect) and time markers update dynamically."
      }
    ],
    "practice": {
      "mcqs": [
        "Identify the correct option: Neither the teacher nor the students ______ (has/have) arrived.",
        "Choose the correct option: She is looking forward to ______ (meet/meeting) the new team.",
        "Select the correct relative pronoun: The author ______ book won the award will speak tonight."
      ],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [
      "The full grammar syllabus: adjectives/adverbs, concord, preposition, modal auxiliaries, tense/aspect, infinitives/gerunds, conjunction, relative clause, voice, reported speech.",
      "Concord states singular subjects take singular verbs; plural subjects take plural verbs.",
      "Gerunds function structurally as nouns within sentences while preserving verbal properties.",
      "Relative clauses use relative pronouns (who, which, that, whose) to contextualize or redefine nouns smoothly."
    ],
    "summary": "Covers all ten grammar content areas (a-j) as specified in the syllabus: adjectives/adverbs through reported speech."
  },
  "english__grammar-vocabulary__vocabulary-study": {
    "notes": [
      "<h2>Vocabulary (5 Marks)</h2><p>This section covers the following contents:</p><ol type=\"a\"><li>Sound system of English: consonants and vowels</li><li>Vocabulary study: stem/root, prefixes, inflexion, parts of speech, nouns number, suffixes, derivation, synonyms/antonyms, idioms and phrases, verb conjugation, spelling and punctuation</li><li>Dictionary use</li><li>Idioms and phrasal verbs</li></ol>"
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Vocabulary syllabus content map (a-d)."
    },
    "examples": [
      {
        "title": "Morphological Analysis",
        "problem": "Break down the word 'unbelievable' into its structural parts.",
        "solution": "Prefix: un- (not) | Stem/Root: believe (verb base) | Suffix: -able (capable of). Resulting in an adjective meaning 'unable to be believed'."
      },
      {
        "title": "Phrasal Verbs vs. Idioms",
        "problem": "Differentiate between 'bring up' (phrasal verb) and 'barking up the wrong tree' (idiom).",
        "solution": "A phrasal verb combines a base verb with a particle to build a new literal or figurative action (to raise a topic). An idiom is an established cultural phrase whose structural meaning cannot be deduced directly from its component words."
      }
    ],
    "practice": {
      "mcqs": [
        "What is the grammatical function added by the inflexion '-ed' in 'walked'?",
        "Which word part is the core stem/root inside the structural transformation 'discontinuity'?",
        "What is the contextually appropriate meaning of the phrasal verb 'call off'?"
      ],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [
      "Vocabulary syllabus covers: sound system, vocabulary study (roots/affixes/synonyms etc.), dictionary use, and idioms/phrasal verbs.",
      "Prefixes alter the core meaning of a stem; suffixes typically transform its part of speech.",
      "Inflexions adjust words for tense, case, or number without changing the foundational class.",
      "Dictionary use includes pronunciation guides, word origins, and part-of-speech markers."
    ],
    "summary": "Covers all four vocabulary content areas (a-d): sound system, vocabulary study, dictionary use, and idioms/phrasal verbs."
  },
  "english__writing-tasks__task-group-1": {
    "notes": [
      "<h2>Reading & Structured Writing (Tasks 1 - 4)</h2>\n<p>This section balances analytical processing of texts alongside foundational long-form document layout systems.</p>",
      "<h3>Task Breakdown:</h3>\n<ul>\n  <li><b>Task 1: Reading Comprehension & Literature (25 Marks Total):</b>\n    <br>• <i>Reading Comprehension:</i> Processing texts up to 1700 words ($3 \\times 5 = 15$ marks).\n    <br>• <i>Literature:</i> Long & short analytical items ($2 \\times 5 = 10$ marks) targeting text questions within 107-150 words.\n  </li>\n  <li><b>Writing Framework (Tasks 2, 3, 4):</b> Synthesizing short, descriptive reference blocks, paragraph variations, and graphic outlines into actionable paragraphs ($1 \\times 7 = 7$ marks). Includes graphic text conversions, story skeletons, and news reporting structures.</li>\n</ul>"
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Visual mapping: Reading metrics and primary paragraph structures."
    },
    "examples": [
      {
        "title": "Structuring a Short Literature Answer",
        "problem": "Draft a model response structure for a 107-150 word literary interpretation question.",
        "solution": "1. Thesis Statement (1-2 sentences): Directly address the prompt. 2. Textual Evidence (3-4 sentences): Bring in specific quotes or plot points. 3. Analysis/Synthesis (2-3 sentences): Connect the evidence back to your theme, ensuring clean structural flow without trailing sentences."
      }
    ],
    "practice": {
      "mcqs": [],
      "short": [
        "Outline the structural differences between interpreting a graphic chart vs. a skeleton story outline.",
        "Explain the target length and structural goals for standard literature responses based on the syllabus parameters."
      ],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [
      "Comprehension answers require extraction of direct explicit details and implicit conclusions.",
      "Skeleton stories require full logical expansions while maintaining chronological consistency.",
      "Graphic texts require translating quantitative visual trends into formal paragraphs."
    ],
    "summary": "Details core reading comprehension targets, short literature criteria, and structural guidelines for paragraph conversions, skeletal expansion, and news layout."
  },
  "english__writing-tasks__task-group-2": {
    "notes": [
      "<h2>Applied Writing & Creative Compositions (Tasks 5 - 6)</h2>\n<p>Focuses on advanced long-form writing proficiencies spanning professional, personal, and media communication fields.</p>",
      "<h3>Composition Modules:</h3>\n<ul>\n  <li><b>Task 5: Applied Correspondence ($1 \\times 8 = 8$ Marks):</b> Structuring formal applications, professional CV design, letters to editors, commercial/business letters, and personal communication.</li>\n  <li><b>Task 6: Extended Composition ($1 \\times 10 = 10$ Marks):</b> Creating structured essays, travel memoirs, review frameworks (books/films), biographies, diaries, press releases, and corporate communication updates.</li>\n</ul>"
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Standard formal block-letter layout vs. standard essay structure."
    },
    "examples": [
      {
        "title": "Formal Letter to the Editor Layout",
        "problem": "Outline the key structural parts needed in a formal Letter to the Editor.",
        "solution": "1. Sender's Info & Date\n2. Recipient Designation (The Editor, Newspaper Name, Address)\n3. Clear Subject Line (Underlined/Bold)\n4. Formal Salutation\n5. Body Paragraphs (Introduction, Cause/Impact, Suggested Solutions)\n6. Formal Sign-off (Yours sincerely, Signature, Full Name)"
      }
    ],
    "practice": {
      "mcqs": [],
      "short": [
        "What are the essential layout differences between a formal business letter and a personal letter?",
        "List the core formatting sections that must be present in a professional press release statement."
      ],
      "long": [
        "Draft a complete 250-word model essay structural outline highlighting the Introduction (Hook/Thesis), Body Paragraphs (Topic Sentences/Evidence), and Conclusion (Restatement/Final thought)."
      ],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [
      "Job application letters must include a clean structural layout paired with an organized CV profile.",
      "Review writing should balance objective summaries with critical analysis of themes or performances.",
      "Essays require an obvious progression from initial thesis definitions down to final thematic conclusions."
    ],
    "summary": "A practical guide outlining advanced writing topics like personal and corporate letters, custom resume designs, media press releases, essays, and creative memoirs."
  },
  "english__subject-verb-agreement__looks-plural-is-singular": {
    "notes": [
      "<h2>📚 School Subjects / Science</h2>\n<ul><li><strong>Physics</strong> is</li><li><strong>Mathematics</strong> is</li><li><strong>Economics</strong> is</li><li><strong>Genetics</strong> is</li><li><strong>Robotics</strong> is</li></ul>",
      "<h2>🩺 Diseases</h2>\n<ul><li><strong>Measles</strong> is</li><li><strong>Mumps</strong> is</li><li><strong>Diabetes</strong> is</li><li><strong>Rabies</strong> is</li></ul>",
      "<h2>🎲 Games / Sports</h2>\n<ul><li><strong>Darts</strong> is</li><li><strong>Billiards</strong> is</li><li><strong>Dominoes</strong> is</li><li><strong>Gymnastics</strong> is</li></ul>",
      "<h2>🌍 Countries / Places</h2>\n<ul><li><strong>The United States</strong> is</li><li><strong>The Netherlands</strong> is</li><li><strong>The Philippines</strong> is</li><li><strong>Headquarters</strong> is</li></ul>",
      "<h2>💰 Measurement Units (Time / Money / Distance)</h2>\n<ul><li><strong>Ten dollars</strong> is</li><li><strong>Five miles</strong> is</li><li><strong>Three hours</strong> is</li></ul>",
      "<h2>📰 Other Words</h2>\n<ul><li><strong>News</strong> is</li><li><strong>Series</strong> is</li><li><strong>Species</strong> is</li><li><strong>Crossroads</strong> is</li></ul>",
      "<h3>💡 Quick Example Sentences</h3>\n<ul><li><em>The news is good.</em></li><li><em>The United States is big.</em></li></ul>"
    ],
    "diagram": {
      "type": "svg",
      "label": "-s but Singular",
      "caption": "These end in -s but are treated as one subject → takes 'is/was'.",
      "svg": "<svg viewBox=\"0 0 480 140\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto;font-family:inherit\">\n      <g>\n        <circle cx=\"80\" cy=\"55\" r=\"28\" fill=\"#4f8bff\" opacity=\"0.15\"/>\n        <circle cx=\"80\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#4f8bff\" stroke-width=\"2\"/>\n        <text x=\"80\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#4f8bff\">Sci</text>\n        <foreignObject x=\"6\" y=\"89\" width=\"148\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Physics, Mathematics, Economics is...</div>\n        </foreignObject>\n      </g>\n      <g>\n        <circle cx=\"240\" cy=\"55\" r=\"28\" fill=\"#4f8bff\" opacity=\"0.15\"/>\n        <circle cx=\"240\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#4f8bff\" stroke-width=\"2\"/>\n        <text x=\"240\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#4f8bff\">Med</text>\n        <foreignObject x=\"166\" y=\"89\" width=\"148\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Measles, Mumps, Rabies is...</div>\n        </foreignObject>\n      </g>\n      <g>\n        <circle cx=\"400\" cy=\"55\" r=\"28\" fill=\"#4f8bff\" opacity=\"0.15\"/>\n        <circle cx=\"400\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#4f8bff\" stroke-width=\"2\"/>\n        <text x=\"400\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#4f8bff\">Gm</text>\n        <foreignObject x=\"326\" y=\"89\" width=\"148\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Billiards, Darts, News is...</div>\n        </foreignObject>\n      </g></svg>"
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Words ending in -s that still use 'is/was'."
  },
  "english__subject-verb-agreement__looks-singular-is-plural": {
    "notes": [
      "<h2>👥 Groups of People</h2>\n<ul><li><strong>Police</strong> are</li><li><strong>People</strong> are</li><li><strong>Clergy</strong> are</li><li><strong>Gentry</strong> are</li><li><strong>Folk</strong> are</li></ul>",
      "<h2>🐄 Animals / Livestock</h2>\n<ul><li><strong>Cattle</strong> are</li><li><strong>Poultry</strong> are</li><li><strong>Vermin</strong> are</li></ul>",
      "<h2>💼 Work Groups (when focusing on members)</h2>\n<ul><li><strong>Staff</strong> are</li><li><strong>Crew</strong> are</li></ul>",
      "<h3>💡 Quick Example Sentences</h3>\n<ul><li><em>The police are on their way.</em></li><li><em>The cattle are in the field.</em></li></ul>"
    ],
    "diagram": {
      "type": "svg",
      "label": "No -s but Plural",
      "caption": "Group / collective nouns with no -s that still take 'are/were'.",
      "svg": "<svg viewBox=\"0 0 480 140\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto;font-family:inherit\">\n      <g>\n        <circle cx=\"80\" cy=\"55\" r=\"28\" fill=\"#3b82f6\" opacity=\"0.15\"/>\n        <circle cx=\"80\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2\"/>\n        <text x=\"80\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#3b82f6\">Pp</text>\n        <foreignObject x=\"6\" y=\"89\" width=\"148\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Police, People, Clergy, Gentry are...</div>\n        </foreignObject>\n      </g>\n      <g>\n        <circle cx=\"240\" cy=\"55\" r=\"28\" fill=\"#3b82f6\" opacity=\"0.15\"/>\n        <circle cx=\"240\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2\"/>\n        <text x=\"240\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#3b82f6\">Am</text>\n        <foreignObject x=\"166\" y=\"89\" width=\"148\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Cattle, Poultry are...</div>\n        </foreignObject>\n      </g>\n      <g>\n        <circle cx=\"400\" cy=\"55\" r=\"28\" fill=\"#3b82f6\" opacity=\"0.15\"/>\n        <circle cx=\"400\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2\"/>\n        <text x=\"400\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#3b82f6\">Fk</text>\n        <foreignObject x=\"326\" y=\"89\" width=\"148\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Folk are...</div>\n        </foreignObject>\n      </g></svg>"
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Group nouns with no -s that still use 'are/were'."
  },
  "english__subject-verb-agreement__compound-and-subjects": {
    "notes": [
      "<h2>🍽️ One Single Meal / Dish → Singular Verb</h2>\n<p>These foods are served and eaten together as one dish, so they take <strong>is</strong>.</p>\n<ul><li><strong>Bread and butter</strong> is my daily breakfast.</li><li><strong>Rice and curry</strong> is a popular meal in Asia.</li><li><strong>Fish and chips</strong> is a famous British dish.</li><li><strong>Bacon and eggs</strong> is a heavy breakfast.</li><li><strong>Macaroni and cheese</strong> is comfort food.</li><li><strong>Strawberries and cream</strong> is served at tennis matches.</li></ul>",
      "<h2>🛒 Separate Food Items / Groceries → Plural Verb</h2>\n<p>Same-sounding pairs, but here they're two separate items, not one dish — so they take <strong>are</strong>.</p>\n<ul><li>Bread and butter <strong>are</strong> both on the shopping list.</li><li>Milk and cookies <strong>are</strong> in the kitchen.</li><li>Apples and oranges <strong>grow</strong> on trees.</li></ul>",
      "<h2>🤝 One Concept or Idiom → Singular Verb</h2>\n<ul><li><strong>Law and order</strong> is important for a safe city.</li><li><strong>Peace and quiet</strong> is all I need.</li><li><strong>Trial and error</strong> is a great way to learn.</li><li><strong>Slow and steady</strong> wins the race.</li><li><strong>All work and no play</strong> makes Jack a dull boy.</li></ul>",
      "<h2>👫 Distinct People or Roles → Plural Verb</h2>\n<ul><li>My mom and dad <strong>are</strong> coming.</li><li>The teacher and the student <strong>were</strong> talking.</li><li>Fire and water <strong>do not</strong> mix.</li></ul>"
    ],
    "diagram": {
      "type": "svg",
      "label": "'And' — 1 idea or 2?",
      "caption": "Joined by 'and': one combined dish takes a singular verb, two separate things take plural.",
      "svg": "<svg viewBox=\"0 0 480 268\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto;font-family:inherit\">\n      <rect x=\"10\" y=\"18\" width=\"220\" height=\"34\" rx=\"9\" fill=\"#3b82f6\"/>\n      <text x=\"120\" y=\"40\" text-anchor=\"middle\" font-size=\"13.5\" font-weight=\"700\" fill=\"#fff\">One idea → singular</text>\n      <rect x=\"10\" y=\"58\" width=\"220\" height=\"190\" rx=\"10\" fill=\"#1e293b\" stroke=\"#334155\"/>\n      <foreignObject x=\"22\" y=\"70\" width=\"196\" height=\"170\">\n        <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"font-size:11.5px;line-height:1.7;color:#e2e8f0;\">\n          <ul style=\"margin:0;padding-left:16px;\"><li>Bread and butter is...</li><li>Rice and curry is...</li><li>Fish and chips is...</li></ul>\n        </div>\n      </foreignObject>\n      <rect x=\"240\" y=\"18\" width=\"220\" height=\"34\" rx=\"9\" fill=\"#3b82f6\"/>\n      <text x=\"350\" y=\"40\" text-anchor=\"middle\" font-size=\"13.5\" font-weight=\"700\" fill=\"#fff\">Two things → plural</text>\n      <rect x=\"240\" y=\"58\" width=\"220\" height=\"190\" rx=\"10\" fill=\"#1e293b\" stroke=\"#334155\"/>\n      <foreignObject x=\"252\" y=\"70\" width=\"196\" height=\"170\">\n        <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"font-size:11.5px;line-height:1.7;color:#e2e8f0;\">\n          <ul style=\"margin:0;padding-left:16px;\"><li>A cup and a saucer are...</li><li>My brother and sister are...</li><li>The book and the pen are...</li></ul>\n        </div>\n      </foreignObject><line x1=\"240\" y1=\"10\" x2=\"240\" y2=\"260\" stroke=\"#334155\" stroke-width=\"1\" stroke-dasharray=\"4 4\"/></svg>"
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "When two nouns joined by 'and' count as one idea vs. two separate things."
  },
  "english__subject-verb-agreement__plural-only-nouns": {
    "notes": [
      "<h2>👖 Clothing and Underwear</h2>\n<p>These items cover two legs or sides of the body, so they're always plural.</p>\n<ul><li><strong>Pants</strong> — The pants <strong>are</strong> on the bed.</li><li><strong>Jeans</strong> — Blue jeans <strong>look</strong> great.</li><li><strong>Shorts</strong> — Running shorts <strong>are</strong> comfortable.</li><li><strong>Trousers</strong> — Black trousers <strong>match</strong> any shirt.</li></ul>",
      "<h2>✂️ Tools and Instruments</h2>\n<p>These tools have two connected blades, handles, or parts.</p>\n<ul><li><strong>Scissors</strong> — Large scissors <strong>cut</strong> thick paper.</li><li><strong>Pliers</strong> — Needle-nose pliers <strong>grip</strong> wires tightly.</li><li><strong>Tweezers</strong> — Metal tweezers <strong>pick</strong> up small items.</li></ul>",
      "<h2>🕶️ Gear for Eyes and Ears</h2>\n<ul><li><strong>Glasses / Spectacles</strong> — Reading glasses <strong>help</strong> you see.</li><li><strong>Sunglasses</strong> — Dark sunglasses <strong>block</strong> the sun.</li><li><strong>Headphones / Earphones</strong> — Wireless headphones <strong>play</strong> music clearly.</li></ul>"
    ],
    "diagram": {
      "type": "svg",
      "label": "Always Plural",
      "caption": "Two-part items — no singular form exists, always take 'are/were'.",
      "svg": "<svg viewBox=\"0 0 480 140\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto;font-family:inherit\">\n      <g>\n        <circle cx=\"120\" cy=\"55\" r=\"28\" fill=\"#3b82f6\" opacity=\"0.15\"/>\n        <circle cx=\"120\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2\"/>\n        <text x=\"120\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#3b82f6\">Cl</text>\n        <foreignObject x=\"6\" y=\"89\" width=\"228\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Pants, Jeans, Shorts, Trousers</div>\n        </foreignObject>\n      </g>\n      <g>\n        <circle cx=\"360\" cy=\"55\" r=\"28\" fill=\"#3b82f6\" opacity=\"0.15\"/>\n        <circle cx=\"360\" cy=\"55\" r=\"28\" fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2\"/>\n        <text x=\"360\" y=\"62\" text-anchor=\"middle\" font-size=\"17\" font-weight=\"700\" fill=\"#3b82f6\">Tl</text>\n        <foreignObject x=\"246\" y=\"89\" width=\"228\" height=\"46\">\n          <div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"text-align:center;font-size:11.5px;line-height:1.3;color:#e2e8f0;font-weight:600;\">Scissors, Pliers, Glasses</div>\n        </foreignObject>\n      </g></svg>"
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Two-part items that are always plural — no singular form exists."
  },
  "physics__chapter-1__topic-1": {
    "notes": [
      "<b>Physical Quantities & Dimensions.</b> Any measurable quantity in physics is called a physical quantity. They are classified into fundamental and derived quantities.",
      "<b>Fundamental Quantities:</b> Mass (kg), Length (m), Time (s), Electric Current (A), Temperature (K), Amount of Substance (mol), Luminous Intensity (cd).",
      "<b>Dimensional Analysis:</b> Expressing a derived quantity in terms of base dimensions [M^a L^b T^c]."
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Dimensional Analysis flowchart."
    },
    "examples": [
      {
        "title": "Force Dimension",
        "problem": "Derive the dimensional formula for Force (F = m · a).",
        "solution": "Mass = [M¹], Acceleration = [L¹ T⁻²]. Therefore [F] = [M¹ L¹ T⁻²]."
      }
    ],
    "practice": {
      "mcqs": [
        "What is the dimension of Kinetic Energy?",
        "Which of the following is dimensionless?"
      ],
      "short": [
        "State the Principle of Homogeneity of dimensions."
      ],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "Force",
        "expression": "[F] = M¹ L¹ T⁻²"
      },
      {
        "name": "Energy",
        "expression": "[E] = M¹ L² T⁻²"
      }
    ],
    "keyPoints": [
      "Quantities can only be added or subtracted if they have identical dimensions."
    ],
    "summary": "Basics of fundamental physical quantities, SI units, and dimensional formulas."
  },
  "chemistry__gas-laws__boyles-law": {
    "notes": [
      "<h2>Boyle's Law</h2><p>At constant temperature, the volume of a gas is inversely proportional to its pressure: <strong>P₁V₁ = P₂V₂</strong></p><h3>Mnemonic: P.I.G. V. K.I.R.E.</h3><p>Particles, Identical, Gravity-free, Volume negligible, Kinetic energy constant, Instability, Random motion, Elastic collisions</p><h3>The 8 Postulates of KMT</h3><ul><li><strong>Tiny Particles</strong> — gases are made of extremely tiny molecules or atoms.</li><li><strong>Identical Size & Shape</strong> — all molecules of a pure gas are identical.</li><li><strong>No Force</strong> — no gravitational or intermolecular forces act between particles.</li><li><strong>Negligible Volume</strong> — molecule volume is practically zero vs. the container.</li><li><strong>Kinetic Energy</strong> — proportional to absolute temperature.</li><li><strong>Perpetual Motion</strong> — molecules are never at rest.</li><li><strong>Random Path</strong> — straight-line, zigzag motion between collisions.</li><li><strong>Elastic Collisions</strong> — no kinetic energy lost in collisions.</li></ul>"
    ],
    "diagram": {
      "type": "svg",
      "label": "P–V Curve",
      "caption": "As pressure increases, volume decreases — P₁V₁ = P₂V₂ (constant T).",
      "svg": "<svg viewBox=\"0 0 480 250\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto;font-family:inherit\">\n      <line x1=\"60\" y1=\"210\" x2=\"430\" y2=\"210\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n      <line x1=\"60\" y1=\"210\" x2=\"60\" y2=\"30\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n      <path d=\"M 60,30 Q 120,130 430,188\" fill=\"none\" stroke=\"#a855f7\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n      <text x=\"245\" y=\"235\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"#e2e8f0\">Volume (V)</text>\n      <text x=\"20\" y=\"120\" text-anchor=\"middle\" font-size=\"12.5\" font-weight=\"700\" fill=\"#e2e8f0\" transform=\"rotate(-90 20 120)\">Pressure (P)</text>\n      <text x=\"245\" y=\"18\" text-anchor=\"middle\" font-size=\"11.5\" fill=\"#94a3b8\">Boyle's Law: P ∝ 1/V at constant temperature</text></svg>"
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "Boyle's Law Formula",
        "expression": "P₁V₁ = P₂V₂"
      }
    ],
    "keyPoints": [
      "Temperature remains constant.",
      "P vs V graph forms a rectangular hyperbola."
    ],
    "summary": "Pressure-volume relationship and kinetic molecular theory postulates."
  },
  "chemistry__states-of-matter__properties": {
    "notes": [
      "<h2>Key Properties of Gases</h2><div class=\"info-grid\"><div class=\"info-box\"><h4>Gaseous State</h4><p>Intermolecular distance is very high, so molecules are loosely packed. Examples: O₂, H₂, He, NH₃, CO₂.</p></div><div class=\"info-box\"><h4>Mass</h4><p>Measured in grams or kilograms. IUPAC recommends expressing amount in moles.<br><strong>n = mass ÷ molar mass</strong></p></div><div class=\"info-box\"><h4>Volume</h4><p>Equal to the container's volume. Units: mL, cm³, L, dm³.<br>1 L = 1000 mL</p></div><div class=\"info-box\"><h4>Temperature</h4><p>Average kinetic energy is proportional to absolute temperature, measured in Kelvin.</p></div><div class=\"info-box\"><h4>Pressure</h4><p>Force per unit area on container walls (P = F/A).<br>1 atm = 760 mmHg = 1.01325 × 10⁵ Pa</p></div></div>"
    ],
    "diagram": {
      "type": "svg",
      "label": "GMVTP",
      "caption": "The 5 measurable properties of a gas sample.",
      "svg": "<svg viewBox=\"0 0 480 180\" xmlns=\"http://www.w3.org/2000/svg\" style=\"width:100%;height:auto;\">\n      <circle cx=\"60\" cy=\"90\" r=\"30\" fill=\"#a855f7\" opacity=\"0.2\"/><text x=\"60\" y=\"96\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"700\" fill=\"#a855f7\">G</text>\n      <circle cx=\"150\" cy=\"90\" r=\"30\" fill=\"#a855f7\" opacity=\"0.2\"/><text x=\"150\" y=\"96\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"700\" fill=\"#a855f7\">M</text>\n      <circle cx=\"240\" cy=\"90\" r=\"30\" fill=\"#a855f7\" opacity=\"0.2\"/><text x=\"240\" y=\"96\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"700\" fill=\"#a855f7\">V</text>\n      <circle cx=\"330\" cy=\"90\" r=\"30\" fill=\"#a855f7\" opacity=\"0.2\"/><text x=\"330\" y=\"96\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"700\" fill=\"#a855f7\">T</text>\n      <circle cx=\"420\" cy=\"90\" r=\"30\" fill=\"#a855f7\" opacity=\"0.2\"/><text x=\"420\" y=\"96\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"700\" fill=\"#a855f7\">P</text>\n      </svg>"
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Gaseous state, mass, volume, temperature, and pressure fundamentals."
  },
  "chemistry__states-of-matter__five-states": {
    "notes": [
      "<h2>The Five States of Matter</h2><ul><li><b>1. Solid:</b> Definite shape & volume. Strong intermolecular attraction, low kinetic energy.</li><li><b>2. Liquid:</b> Indefinite shape, definite volume. Higher kinetic energy than solids.</li><li><b>3. Gas:</b> Indefinite shape & volume. Negligible attraction, perpetual motion.</li><li><b>4. Plasma:</b> Fourth state. Formed at high temperatures (~10,000°C) with free ionized electrons.</li><li><b>5. Bose-Einstein Condensate (BEC):</b> Fifth state. Boson gas cooled near absolute zero, forming a single 'super atom'.</li></ul>"
    ],
    "diagram": {
      "type": "placeholder",
      "caption": "Solid → Liquid → Gas → Plasma → BEC energy transition."
    },
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Overview of Solid, Liquid, Gas, Plasma, and Bose-Einstein Condensate."
  },
  "chemistry__classification-of-matter__physical-chemical-classification": {
    "notes": [
      "<h2>Classification of Matter</h2><p><b>Physical Classification:</b> Solid, Liquid, Gas, Plasma, BEC.<br><b>Chemical Classification:</b> Pure Substances (Elements and Compounds) vs Impure Substances (Mixtures).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Tree structure of physical and chemical classification."
  },
  "chemistry__classification-of-matter__pure-substances-mixtures": {
    "notes": [
      "<h2>Pure Substances vs Mixtures</h2><p><b>Elements:</b> 118 known, classified into Metals, Non-metals, Metalloids.<br><b>Compounds:</b> Chemically combined in fixed weight ratios (e.g. CO vs CO₂).<br><b>Mixtures:</b> Variable ratios, homogeneous (1 phase) or heterogeneous (2+ phases).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Elements, compounds, homogeneous and heterogeneous mixtures."
  },
  "chemistry__classification-of-matter__metals-nonmetals-metalloids": {
    "notes": [
      "<h2>Metals, Non-Metals & Metalloids</h2><ul><li><b>Metals:</b> Electropositive, lose electrons, malleable, ductile, conduct heat & electricity. (Hg is liquid).</li><li><b>Non-metals:</b> Electronegative, gain electrons, bad conductors (except graphite/graphene). Exist in solid (C, S, I₂), liquid (Br₂), and gas (O₂, N₂).</li><li><b>Metalloids:</b> Dual properties, semiconductors (Si, Ge, As, Sb).</li></ul>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Three physical/chemical element categories."
  },
  "chemistry__classification-of-matter__organic-inorganic-compounds": {
    "notes": [
      "<h2>Organic vs Inorganic Chemistry</h2><p><b>Organic Compounds:</b> Hydrocarbons and derivatives from living sources (disproved 'Vital Force' theory by Wöhler in 1828 with urea synthesis).<br><b>Inorganic Compounds:</b> Mineral-derived compounds from all elements in periodic table.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Organic hydrocarbons vs inorganic mineral compounds."
  },
  "chemistry__compounds__water": {
    "notes": [
      "<h2>Water (H₂O)</h2><p>Dihydrogen monoxide. 2 Hydrogen atoms + 1 Oxygen atom. Bent molecular structure with ~104.5° bond angle.<br><b>Electrolysis:</b> 2H₂O + electric current → 2H₂ + O₂.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Structure, synthesis, and electrolytic decomposition of water."
  },
  "chemistry__atomic-structure__atoms-molecules": {
    "notes": [
      "<h2>Atoms vs Molecules</h2><p><b>Atom:</b> Smallest part taking part in chemical reaction; does not exist freely.<br><b>Molecule:</b> Smallest particle existing in a free state.<br><b>Homoatomic:</b> He (monoatomic), H₂ (diatomic), P₄ (tetraatomic), S₈ (octaatomic).<br><b>Heteroatomic:</b> CO₂, H₂O, NH₃, CH₄, SF₆.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Definitions of atoms and homoatomic/heteroatomic molecules."
  },
  "chemistry__atomic-structure__symbols-of-elements": {
    "notes": [
      "<h2>Element Symbols</h2><p>Short representations of element names. Rules: Capital 1st letter, 2-letter combos (He, Mg), or Latin names (Na: Natrium, K: Kalium, Fe: Ferrum, Cu: Cuprum, Ag: Argentum, Au: Aurum, Pb: Plumbum, Sn: Stannum, Hg: Hydrargyrum, Sb: Stibium).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Derivation rules and Latin roots for chemical symbols."
  },
  "chemistry__atomic-structure__atomic-mass-gram-atom": {
    "notes": [
      "<h2>Gram Atom & Average Atomic Mass</h2><p>1 gram atom = 1 mole atom = 6.022 × 10²³ atoms.<br><b>Formula:</b> No. of gram atoms = Given weight (g) ÷ Atomic mass.<br><b>Average Atomic Mass:</b> Weighted sum of isotope abundances (e.g. Cl: 35.5 amu, B: 10.81 amu).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Gram atom, Avogadro's constant, and isotopic weighted averages."
  },
  "chemistry__atomic-mass-definitions__atomic-mass-def": {
    "notes": [
      "<h2>Atomic Mass Standards</h2><p><b>Hydrogen Standard:</b> Ratio to mass of 1 H atom.<br><b>Carbon-12 Standard (IUPAC):</b> Mass relative to 1/12th of a C-12 atom.<br><b>1 amu = 1.66 × 10⁻²⁴ g</b> (approx. mass of 1 proton).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Historical and modern carbon-12 atomic mass standards."
  },
  "chemistry__molecular-mass__relative-molecular-mass": {
    "notes": [
      "<h2>Relative Molecular Mass & Gram Mole</h2><p>Sum of atomic masses of all constituent atoms.<br>• Glucose (C₆H₁₂O₆) = 180 amu<br>• Sucrose (C₁₂H₂₂O₁₁) = 342 amu<br>• H₂SO₄ = 98 amu<br><b>No. of gram moles = Given weight (g) ÷ Molecular mass.</b></p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Molecular mass calculations and mole conversions."
  },
  "chemistry__molecular-mass__formula-mass": {
    "notes": [
      "<h2>Formula Mass for Ionic Compounds</h2><p>Used for ionic lattices where discrete single molecules don't exist.<br>• NaCl = 23 + 35.5 = 58.5 amu<br>• Na₂CO₃ = 2(23) + 12 + 3(16) = 106 amu</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Formula mass for ionic crystal units."
  },
  "chemistry__organic-chemistry-basics__carbon-classification": {
    "notes": [
      "<h2>Classifying Carbons (1°, 2°, 3°, 4°)</h2><p>• <b>1° (Primary):</b> Bonded to 1 other carbon.<br>• <b>2° (Secondary):</b> Bonded to 2 other carbons.<br>• <b>3° (Tertiary):</b> Bonded to 3 other carbons.<br>• <b>4° (Quaternary):</b> Bonded to 4 other carbons.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Degree of substitution on carbon atoms in aliphatic & cyclic structures."
  },
  "chemistry__organic-chemistry-basics__vinyl-vinylic-allylic": {
    "notes": [
      "<h2>Vinyl vs Allylic Carbons</h2><p><b>Vinyl Group:</b> CH₂=CH− (Vinylic carbon is directly part of C=C double bond, sp² hybridized).<br><b>Allylic Group:</b> CH₂=CH−CH₂− (Allylic carbon is adjacent to C=C double bond, sp³ hybridized).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Vinylic (sp²) vs Allylic (sp³) structural definitions."
  },
  "chemistry__organic-chemistry-basics__hybridization": {
    "notes": [
      "<h2>Carbon Hybridization (sp, sp², sp³)</h2><p>Calculated by counting σ (sigma) bonds and lone pairs (π bonds excluded!):<br>• <b>sp³:</b> 4 σ bonds (alkanes, tetrahedral, 109.5°)<br>• <b>sp²:</b> 3 σ bonds (alkenes, trigonal planar, 120°)<br>• <b>sp:</b> 2 σ bonds (alkynes, linear, 180°)</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Sigma bond counting rules for organic hybridization."
  },
  "chemistry__organic-chemistry-basics__homologous-series": {
    "notes": [
      "<h2>Homologous Series</h2><p>Series of compounds with the same functional group where consecutive members differ by a −CH₂− unit (14 amu molecular weight difference).<br>• <b>Alkanes:</b> CH₄, C₂H₆, C₃H₈, C₄H₁₀<br>• <b>Alcohols:</b> CH₃OH, C₂H₅OH, C₃H₇OH, C₄H₉OH</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Incremental structural progression in homologous series."
  },
  "chemistry__atomic-models__daltons-theory": {
    "notes": [
      "<h2>Dalton's Atomic Theory (1808)</h2><p><b>Postulates:</b> Atoms are indivisible spheres; atoms of an element are identical; combine in fixed ratios.<br><b>Why Disregarded:</b> Discovery of subatomic particles (e⁻, p⁺, n⁰), isotopes (same Z, diff A), isobars (diff Z, same A), and nuclear transformations.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Dalton's 1808 postulates and modern corrections."
  },
  "chemistry__atomic-models__subatomic-particles": {
    "notes": [
      "<h2>Subatomic Particles & Atomic Numbers</h2><p>• <b>Electron (e⁻):</b> −1.602×10⁻¹⁹ C, 9.1×10⁻³¹ kg, discovered by J.J. Thomson.<br>• <b>Proton (p⁺):</b> +1.602×10⁻¹⁹ C, 1.672×10⁻²⁷ kg, discovered by Rutherford.<br>• <b>Neutron (n⁰):</b> Neutral, 1.675×10⁻²⁷ kg, discovered by Chadwick.<br><b>Specific Charge (q/m) Order:</b> e⁻ > p⁺ > α²⁺ > n⁰.<br><b>Formulas:</b> Z = p⁺ = e⁻ (neutral); A = p⁺ + n; n = A − Z.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "e⁻, p⁺, n⁰ properties, q/m ratios, atomic number Z, mass number A."
  },
  "chemistry__atomic-models__rutherfords-model": {
    "notes": [
      "<h2>Rutherford's Alpha Scattering Experiment (1911)</h2><p>Bombarded thin gold foil (0.00004 cm) with α-particles (He²⁺) inside a lead chamber surrounded by a ZnS fluorescent screen.<br><b>Observations:</b> ~99% passed straight; some deflected; 1 in 20,000 bounced back.<br><b>Conclusions:</b> Most space is empty; small dense positively charged nucleus at center.<br><b>Defects:</b> Could not explain atomic collapse (Maxwell radiation theory) or hydrogen spectrum.</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "Gold foil experiment, ZnS screen, nuclear model, and planetary stability defect."
  },
  "chemistry__atomic-models__bohrs-model": {
    "notes": [
      "<h2>Bohr's Atomic Model & Planck's Equation</h2><p>Electrons orbit in stationary non-radiating energy shells (K, L, M, N... / n = 1, 2, 3...).<br>Energy changes occur during quantum jumps between ground and excited states.<br><b>Planck's Equation:</b> E = h·ν = hc/λ (h = 6.626×10⁻³⁴ J·s, c = 3×10⁸ m/s).</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "Planck's Energy Equation",
        "expression": "E = hc/λ"
      }
    ],
    "keyPoints": [],
    "summary": "Bohr's stationary orbits, quantum jumps, and photon energy."
  },
  "chemistry__atomic-models__isotopes-isobars-isotones": {
    "notes": [
      "<h2>Subatomic Relationship Classes</h2><ul><li><b>Isotopes:</b> Same Z (protons), diff A (neutrons). E.g. ¹H, ²H (Deuterium), ³H (Tritium - radioactive β-emitter).</li><li><b>Isobars:</b> Same A (mass), diff Z. E.g. ¹⁴C and ¹⁴N, ⁴⁰Ar and ⁴⁰Ca.</li><li><b>Isotones:</b> Same number of neutrons (n = A − Z). E.g. ³⁰Si, ³¹P, ³²S (all n = 16).</li><li><b>Isoelectronic:</b> Same electron count. 10-e⁻ series: N³⁻, O²⁻, F⁻, Ne, Na⁺, Mg²⁺, Al³⁺.</li><li><b>Isodiaphers:</b> Same neutron excess (A − 2Z or N − Z). E.g. ³H and ¹⁹F (both excess = 1).</li></ul>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [
      {
        "name": "Isotopic Excess",
        "expression": "Excess = A − 2Z"
      }
    ],
    "keyPoints": [],
    "summary": "Isotopes, Isobars, Isotones, Isoelectronic species, and Isodiaphers."
  },
  "nepali__bhashatattva__shabda-srot": {
    "notes": [
      "<p>शब्द भनेको एक वा एक भन्दा बढी अक्षरहरू मिलेर बनेको निश्चित, अर्थयुक्त भाषिक एकाइ हो। नेपाली भाषा संस्कृत भाषाबाट विकसित भएको हुनाले स्रोतका आधारमा नेपाली शब्दलाई ३ प्रकारमा विभाजन गरिन्छ:</p><h3>१. तत्सम शब्द</h3><p>संस्कृतबाट जस्ताको त्यस्तै नेपालीमा प्रयोग हुने शब्द (साहित्य, वेदना, ईश्वर, ऊर्जा, भूमि)।<br><b>पहिचान आधार:</b> 'व' लेखिने, 'श'/'ष' प्रयोग, विसर्ग (ः), ऋ/ञ/ण/क्ष/त्र/ज्ञ प्रयोग, र संस्कृत उपसर्ग (प्र, परा, अनु, वि, अधि)।</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "शब्दको परिभाषा र तत्सम शब्द पहिचानका आधारहरू।"
  },
  "nepali__bhashatattva__tadbhav-shabda": {
    "notes": [
      "<h2>तद्भव शब्द पहिचानका आधार</h2><p>संस्कृतबाट रूप परिवर्तन भई आएका शब्दहरू।<br><b>पहिचान आधार:</b> चन्द्रविन्दु (ँ) लागेका शब्द (आँखा, दाँत, गाउँ), सङ्ख्या (दुई, तीन, पाँच), नेपाली महिना (जेठ, असार, साउन), नाता सम्बन्ध (दाजु, भाइ, दिदी), सर्वनाम र क्रियापद (म, हामी, खान्छ)।</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "तद्भव शब्दका प्रमुख पहिचान सङ्केतहरू।"
  },
  "nepali__bhashatattva__aagantuk-shabda": {
    "notes": [
      "<h2>आगन्तुक शब्दका प्रकार</h2><p><b>१. स्वदेशी आगन्तुक:</b> नेपाल भित्रका जातजातिका भाषाबाट आएका (गुन्द्रुक, ढिँडो, झ्याल, खुकुरी).<br><b>२. विदेशी आगन्तुक:</b> अङ्ग्रेजी (स्कुल, डाक्टर, कम्प्युटर), अरबी/फारसी (अदालत, वकिल, सहर), पोर्चुगेली (साबुन, गमला), चिनियाँ (चिया, चौमिन), जापानी (रिक्सा, कराँते)।</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "स्वदेशी र विदेशी आगन्तुक शब्दहरूको वर्गीकरण।"
  },
  "nepali__bhashatattva__swar-varna": {
    "notes": [
      "<h2>स्वर वर्ण</h2><p>श्वासको गतिमा बाधा नभई उच्चारण हुने वर्ण।<br><b>उच्चार्य स्वर (६):</b> अ, आ, इ, उ, ए, ओ<br><b>लेख्य स्वर (१३):</b> अ, आ, इ, ई, उ, ऊ, ऋ, ए, ऐ, ओ, औ, अं, अः</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "उच्चार्य र लेख्य स्वर वर्ण।"
  },
  "nepali__bhashatattva__vyanjan-varna": {
    "notes": [
      "<h2>व्यञ्जन वर्ण</h2><p>स्वर वर्णको सहयोगले मात्र उच्चारण हुने वर्ण।<br><b>उच्चार्य व्यञ्जन (२९):</b> क-घ, ङ, च-झ, ट-ढ, त-न, प-म, य, र, ल, व, स, ह।<br><b>लेख्य व्यञ्जन (३६):</b> उच्चार्य + ञ, ण, श, ष, क्ष, त्र, ज्ञ।</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "उच्चार्य (२९) र लेख्य (३६) व्यञ्जन वर्ण।"
  },
  "nepali__bhashatattva__vyanjan-vargikaran": {
    "notes": [
      "<h2>व्यञ्जन वर्णको ४ आधारमा वर्गीकरण</h2><p><b>(क) स्थान:</b> कण्ठ्य (क-ङ), दन्तमूलीय (च, ट, न, र, ल, स), दन्त्य (त-ध), ओष्ठ्य (प-म, व), तालव्य (य), स्वरयन्त्रमुखी (ह)।<br><b>(ख) प्रयत्न:</b> स्पर्शी, स्पर्शसङ्घर्षी, सङ्घर्षी, नासिक्य, कम्पित, पार्श्विक, अर्धस्वर।<br><b>(ग) घोषत्व:</b> घोष vs अघोष।<br><b>(घ) प्राणत्व:</b> अल्पप्राण vs महाप्राण।</p>"
    ],
    "examples": [],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [],
    "summary": "उच्चारण स्थान, प्रयत्न, घोषत्व, र प्राणत्वका आधारमा वर्गीकरण।"
  },
  "nepali__thap-abhyas__varnako-wargikaran": {
    "notes": [
      "<p>यस पृष्ठमा नेपाली व्याकरणका वर्णहरूको <strong>उच्चारण स्थान</strong>, <strong>प्राणत्व</strong>, <strong>घोषत्व</strong>, र <strong>प्रयत्न</strong> सम्बन्धी थप अभ्यासहरूको समाधान समावेश छ।</p>"
    ],
    "examples": [
      {
        "title": "सेट १, प्रश्न १ — भ, म, र को पहिचान",
        "problem": "रेखाङ्कित वर्ण (भ, म, र) को उच्चारण स्थान, प्राणत्व, र प्रयत्न पहिचान गर्नुहोस्।",
        "solution": "भ: ओष्ठ्य, महाप्राण, स्पर्शी। म: ओष्ठ्य, अल्पप्राण, अनुनासिक। र: वत्सर्य, अल्पप्राण, प्रकम्पित।"
      },
      {
        "title": "सेट १, प्रश्न २ — क, ष, ज को प्राणत्व र घोषत्व",
        "problem": "रेखाङ्कित वर्ण (क, ष, ज) को प्राणत्व र घोषत्व पत्ता लगाउनुहोस्।",
        "solution": "क: अल्पप्राण, अघोष। ष: महाप्राण, अघोष। ज: अल्पप्राण, सघोष।"
      },
      {
        "title": "सेट २, प्रश्न १ — भ (भेडा), ज (जलस्रोतको)",
        "problem": "रेखाङ्कित वर्णको उच्चारण स्थान र प्रयत्न पत्ता लगाउनुहोस्।",
        "solution": "भ: ओष्ठ्य, स्पर्श। ज: तालव्य, स्पर्श।"
      }
    ],
    "practice": {
      "mcqs": [],
      "short": [],
      "long": [],
      "numericals": []
    },
    "formulas": [],
    "keyPoints": [
      "उच्चारण स्थान (कण्ठ्य, तालव्य, मूर्धन्य, दन्त्य, वत्सर्य, ओष्ठ्य)",
      "प्राणत्व (अल्पप्राण / महाप्राण)",
      "घोषत्व (घोष / अघोष)"
    ],
    "summary": "नेपाली व्यञ्जन वर्णका थप अभ्यास सेटहरू र पूर्ण समाधान।"
  }
};
