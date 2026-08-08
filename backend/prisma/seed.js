// Ravikishan seed script — demo-ready content skeleton.
// Idempotent: safe to run repeatedly (upserts structure, refreshes seeded blocks).
// Owner account is created from OWNER_EMAIL / OWNER_PASSWORD env vars.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const ownerEmail = process.env.OWNER_EMAIL || 'harindarsah98172@gmail.com';
const ownerPassword = process.env.OWNER_PASSWORD || 'ravikishan-owner-2026';

async function upsertUser({ email, password, displayName, role, isApproved, accessLevel }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { passwordHashes: { take: 1 } },
  });
  if (existing) {
    const patch = { role, isApproved, ...(accessLevel !== undefined ? { accessLevel } : {}) };
    if (existing.passwordHashes.length === 0) {
      patch.passwordHashes = {
        create: { hash: passwordHash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      };
    }
    return prisma.user.update({ where: { email }, data: patch });
  }
  return prisma.user.create({
    data: {
      email,
      displayName,
      role,
      isApproved,
      accessLevel: accessLevel ?? 3,
      passwordHashes: {
        create: { hash: passwordHash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      },
    },
  });
}

async function upsertClass(name, slug, sortOrder) {
  return prisma.class.upsert({
    where: { slug },
    update: { name, sortOrder },
    create: { name, slug, sortOrder },
  });
}

async function upsertSubject(cls, { name, slug, subjectType, icon, themeColor, isLocked, sortOrder }) {
  return prisma.subject.upsert({
    where: { classId_slug: { classId: cls.id, slug } },
    update: { name, subjectType, icon, themeColor, isLocked, sortOrder },
    create: { classId: cls.id, name, slug, subjectType, icon, themeColor, isLocked, sortOrder },
  });
}

async function upsertChapter(subject, title, slug, sortOrder, isLocked = true) {
  return prisma.chapter.upsert({
    where: { subjectId_slug: { subjectId: subject.id, slug } },
    update: { title, sortOrder, isLocked, status: 'published' },
    create: { subjectId: subject.id, title, slug, sortOrder, isLocked, status: 'published' },
  });
}

// Replace all blocks of the given chapter with the provided ones (keeps seed idempotent).
async function seedBlocks(chapter, blocks) {
  await prisma.contentBlock.deleteMany({ where: { chapterId: chapter.id } });
  for (const [index, block] of blocks.entries()) {
    await prisma.contentBlock.create({
      data: { ...block, chapterId: chapter.id, sortOrder: index },
    });
  }
}

async function main() {
  console.log('→ Seeding users…');
  await upsertUser({
    email: ownerEmail,
    password: ownerPassword,
    displayName: 'Ravikishan',
    role: 'owner',
    isApproved: true,
  });
  const member = await upsertUser({
    email: 'member@ravikishan.com',
    password: 'member1234',
    displayName: 'Demo Member',
    role: 'member',
    isApproved: true,
    accessLevel: 2,
  });
  const pendingStudent = await upsertUser({
    email: 'student@ravikishan.com',
    password: 'student1234',
    displayName: 'Kiran Sharma',
    role: 'guest',
    isApproved: false,
  });
  await prisma.accessRequest.upsert({
    where: { id: `seed-request-${pendingStudent.id}` },
    update: {},
    create: {
      id: `seed-request-${pendingStudent.id}`,
      userId: pendingStudent.id,
      email: pendingStudent.email,
      message: 'Namaste! I am a Class 11 science student in Kathmandu. Would love access to the Physics and Chemistry notes.',
    },
  });

  console.log('→ Seeding classes…');
  const class11 = await upsertClass('Class 11', 'class-11', 1);
  const class12 = await upsertClass('Class 12', 'class-12', 2);

  console.log('→ Seeding Class 11 subjects…');
  const physics = await upsertSubject(class11, {
    name: 'Physics', slug: 'physics', subjectType: 'science_math',
    icon: 'orbit', themeColor: '#38bdf8', isLocked: true, sortOrder: 1,
  });
  const chemistry = await upsertSubject(class11, {
    name: 'Chemistry', slug: 'chemistry', subjectType: 'science_math',
    icon: 'flask', themeColor: '#34d399', isLocked: true, sortOrder: 2,
  });
  const mathematics = await upsertSubject(class11, {
    name: 'Mathematics', slug: 'mathematics', subjectType: 'science_math',
    icon: 'ruler', themeColor: '#a78bfa', isLocked: true, sortOrder: 3,
  });
  const biology = await upsertSubject(class11, {
    name: 'Biology', slug: 'biology', subjectType: 'biology',
    icon: 'dna', themeColor: '#2dd4bf', isLocked: true, sortOrder: 4,
  });
  const english = await upsertSubject(class11, {
    name: 'English', slug: 'english', subjectType: 'english',
    icon: 'book', themeColor: '#fbbf24', isLocked: false, sortOrder: 5,
  });
  const nepali = await upsertSubject(class11, {
    name: 'Nepali', slug: 'nepali', subjectType: 'nepali',
    icon: 'pen', themeColor: '#fb7185', isLocked: false, sortOrder: 6,
  });

  console.log('→ Seeding Class 11 chapters + content…');

  // ── Physics: Kinematics ────────────────────────────────────────────────
  const kinematics = await upsertChapter(physics, 'Kinematics', 'kinematics', 1);
  await seedBlocks(kinematics, [
    {
      blockType: 'note_topic', title: 'Scalar and Vector Quantities',
      contentRichtext:
        'Physical quantities are divided into **scalars** and **vectors**.\n\n- **Scalar**: has only magnitude (e.g. mass, time, speed, distance).\n- **Vector**: has magnitude and direction (e.g. velocity, force, displacement).\n\n> **Displacement** is the shortest straight-line distance between two points, in a specified direction — it is a vector.',
    },
    {
      blockType: 'note_statement', title: 'Equations of Motion (uniform acceleration)',
      contentRichtext:
        'For a body moving with uniform acceleration $a$:\n\n1. $v = u + at$\n2. $s = ut + \\frac{1}{2}at^2$\n3. $v^2 = u^2 + 2as$',
    },
    {
      blockType: 'note_concept', title: 'Speed vs Velocity',
      contentRichtext:
        '**Speed** is the rate of change of distance; it is always positive. **Velocity** is the rate of change of displacement; it carries a sign/direction. A body moving in a circle at constant speed has **changing velocity** (direction keeps changing), hence it accelerates.',
    },
    {
      blockType: 'note_important', title: 'Sign convention in free fall',
      contentRichtext:
        'Take upward as positive. Then $g = -9.8\\ \\text{m/s}^2$. At the highest point the velocity is zero but the **acceleration is still g** — a common exam trap.',
    },
    {
      blockType: 'note_example', title: 'Worked example: braking distance',
      contentRichtext:
        'A car moving at 20 m/s brakes uniformly and stops after 40 m. Find the retardation.\n\nUsing $v^2 = u^2 + 2as$ with $v=0$, $u=20$, $s=40$:\n\n$0 = 400 + 2a(40) \\Rightarrow a = -5\\ \\text{m/s}^2$ (retardation = 5 m/s²).',
    },
    {
      blockType: 'numerical', title: 'Practice numerical',
      contentRichtext:
        '**Question:** A stone is dropped from a tower of height 122.5 m. Find (a) the time taken to reach the ground and (b) its velocity just before impact. Take $g = 9.8\\ \\text{m/s}^2$.\n\n**Solution:**\n\n(a) $s = \\frac{1}{2}gt^2 \\Rightarrow 122.5 = \\frac{1}{2}(9.8)t^2 \\Rightarrow t = 5\\ \\text{s}$\n\n(b) $v = gt = 9.8 \\times 5 = 49\\ \\text{m/s}$ downward.',
    },
    {
      blockType: 'mindmap', title: 'Kinematics mind map',
      mindmapJson: {
        name: 'Kinematics',
        children: [
          {
            name: 'Fundamentals',
            desc: 'The ideas every motion problem starts from',
            children: [
              { name: 'Scalars', desc: 'Only magnitude — speed, distance' },
              { name: 'Vectors', desc: 'Magnitude + direction — velocity, force' },
              { name: 'Distance & Displacement', desc: 'Path length vs straight-line change' },
            ],
          },
          {
            name: 'Motion',
            desc: 'How position changes with time',
            children: [
              { name: 'Uniform motion', desc: 'Constant speed in a straight line' },
              {
                name: 'Uniform acceleration',
                desc: 'Constant rate of change of velocity',
                children: [{ name: 'Equations of motion' }, { name: 'Graphs (v–t, s–t)' }],
              },
              { name: 'Projectile motion', desc: 'Curved path under gravity only' },
            ],
          },
          {
            name: 'Applications',
            desc: 'Real situations solved with these rules',
            children: [{ name: 'Free fall', desc: 'Motion under gravity alone' }, { name: 'Relative velocity' }],
          },
        ],
      },
    },
  ]);

  // ── Chemistry: Some Basic Concepts of Chemistry ────────────────────────
  const chemBasics = await upsertChapter(chemistry, 'Some Basic Concepts of Chemistry', 'basic-concepts', 1);
  await seedBlocks(chemBasics, [
    {
      blockType: 'note_topic', title: 'The Mole Concept',
      contentRichtext:
        'A **mole** is the amount of substance that contains as many elementary entities as there are atoms in exactly **12 g of carbon-12** — i.e. $6.022 \\times 10^{23}$ entities (Avogadro constant).\n\n$n = \\frac{\\text{mass (g)}}{\\text{molar mass (g/mol)}} = \\frac{\\text{number of particles}}{6.022 \\times 10^{23}}$',
    },
    {
      blockType: 'note_important', title: 'Law of Conservation of Mass',
      contentRichtext:
        'Mass is neither created nor destroyed in a chemical reaction. Total mass of reactants = total mass of products. All chemical equations must therefore be **balanced**.',
    },
    {
      blockType: 'note_example', title: 'Calculate molar mass (code)',
      contentRichtext: 'Use this small calculator to find molar masses while solving problems:',
      contentCode:
        'def molar_mass(symbols, counts):\n    atomic = {"H": 1.008, "C": 12.011, "O": 15.999, "N": 14.007, "Na": 22.990, "Cl": 35.45}\n    total = sum(atomic[s] * c for s, c in zip(symbols, counts))\n    return round(total, 3)\n\n# H2O = 2×H + 1×O\nprint(molar_mass(["H", "O"], [2, 1]))   # 18.015\n\n# CO2 = 1×C + 2×O\nprint(molar_mass(["C", "O"], [1, 2]))   # 44.009',
      codeLanguage: 'python',
    },
    {
      blockType: 'numerical', title: 'Practice numerical',
      contentRichtext:
        '**Question:** How many moles are in 11 g of $\\text{CO}_2$? (molar mass = 44 g/mol)\n\n**Solution:**\n\n$n = \\frac{m}{M} = \\frac{11}{44} = 0.25\\ \\text{mol}$\n\nNumber of molecules $= 0.25 \\times 6.022 \\times 10^{23} = 1.51 \\times 10^{23}$ molecules.',
    },
  ]);

  // ── Mathematics: Sets and Functions ────────────────────────────────────
  const sets = await upsertChapter(mathematics, 'Sets and Functions', 'sets-functions', 1);
  await seedBlocks(sets, [
    {
      blockType: 'note_topic', title: 'Sets and Set Operations',
      contentRichtext:
        'A **set** is a well-defined collection of distinct objects. Set operations include **union ($A \\cup B$)**, **intersection ($A \\cap B$)** and **complement ($A\'$)**.\n\n- $A \\cup B = \\{x : x \\in A \\text{ or } x \\in B\\}$\n- $A \\cap B = \\{x : x \\in A \\text{ and } x \\in B\\}$\n- $|A \\cup B| = |A| + |B| - |A \\cap B|$',
    },
    {
      blockType: 'note_statement', title: 'Functions',
      contentRichtext:
        'A **function** $f: A \\to B$ is a rule that assigns to every element of set $A$ exactly one element of set $B$. $A$ is the domain and $B$ is the codomain.',
    },
    {
      blockType: 'note_example', title: 'JavaScript: filter even numbers from a set',
      contentRichtext: 'Union and intersection of two sets, computed in code:',
      contentCode:
        'const A = new Set([1, 2, 3, 4]);\nconst B = new Set([3, 4, 5, 6]);\n\nconst union = new Set([...A, ...B]);          // {1,2,3,4,5,6}\nconst intersection = new Set([...A].filter(x => B.has(x))); // {3,4}\n\nconsole.log("Union:", [...union]);\nconsole.log("Intersection:", [...intersection]);',
      codeLanguage: 'javascript',
    },
    {
      blockType: 'mindmap', title: 'Sets mind map',
      mindmapJson: {
        name: 'Sets',
        children: [
          {
            name: 'Notation',
            desc: 'The two standard ways to write a set',
            children: [{ name: 'Roster form', desc: 'List elements: {1, 2, 3}' }, { name: 'Set-builder form', desc: 'Rule: {x : x is a natural number}' }],
          },
          {
            name: 'Operations',
            desc: 'Combining sets to make new ones',
            children: [
              { name: 'Union', desc: 'All elements of A or B' },
              { name: 'Intersection', desc: 'Elements in both A and B' },
              { name: 'Complement', desc: 'Everything outside A' },
            ],
          },
          {
            name: 'Relations',
            desc: 'How sets compare to each other',
            children: [{ name: 'Subset', desc: 'Every element of A is in B' }, { name: 'Power set', desc: 'Set of all subsets, 2ⁿ of them' }],
          },
        ],
      },
    },
  ]);

  // ── Biology: Cell — The Unit of Life ───────────────────────────────────
  const cell = await upsertChapter(biology, 'Cell: The Unit of Life', 'cell-the-unit-of-life', 1);
  await seedBlocks(cell, [
    {
      blockType: 'note_topic', title: 'Cell Theory',
      contentRichtext:
        'Proposed by Schleiden and Schwann, completed by Virchow:\n\n1. All living organisms are composed of one or more cells.\n2. The cell is the basic structural and functional unit of life.\n3. All cells arise from pre-existing cells.',
    },
    {
      blockType: 'diagram_compare',
      title: 'Prokaryotic vs Eukaryotic cell',
      diagramData: {
        left: { name: 'Prokaryotic Cell', points: ['No true nucleus', 'No membrane-bound organelles', 'Smaller (1–10 µm)'] },
        right: { name: 'Eukaryotic Cell', points: ['True nucleus with nuclear envelope', 'Has mitochondria, ER, Golgi', 'Larger (10–100 µm)'] },
        similarities: ['Both have plasma membrane', 'Both contain ribosomes', 'Both store genetic material (DNA)'],
        differences: [
          { left: 'Nucleus absent', right: 'Nucleus present' },
          { left: 'Ribosomes 70S', right: 'Ribosomes 80S' },
          { left: 'No histones', right: 'Histone proteins present' },
          { left: 'Cell division: binary fission', right: 'Mitosis / meiosis' },
        ],
      },
    },
    {
      blockType: 'note_important', title: 'Ribosomes: 70S vs 80S',
      contentRichtext:
        'Prokaryotes have **70S** ribosomes (50S + 30S subunits); eukaryotic cytoplasm has **80S** ribosomes (60S + 40S). The S stands for **Svedberg unit** — sedimentation coefficient, not size. That is why 70S + 80S ≠ 150S.',
    },
    {
      blockType: 'mindmap', title: 'Cell structure mind map',
      mindmapJson: {
        name: 'Cell — The Unit of Life',
        desc: 'Complete classification: every box shows its meaning and its position (index badge) from the top.',
        children: [
          {
            name: 'Cell Theory',
            desc: 'The 3 rules that define what a cell is',
            children: [
              { name: 'Schleiden & Schwann', desc: '1838: all organisms are made of cells' },
              { name: 'Virchow', desc: '1855: cells arise from pre-existing cells' },
            ],
          },
          {
            name: 'Cell Types',
            desc: 'Two fundamental architectures of life',
            children: [
              {
                name: 'Prokaryotic',
                desc: 'No true nucleus — DNA floats free',
                children: [
                  { name: 'Bacteria', desc: '70S ribosomes, no organelles' },
                  { name: 'Archaea', desc: 'Like bacteria, distinct biochemistry' },
                ],
              },
              {
                name: 'Eukaryotic',
                desc: 'True nucleus + membrane-bound organelles',
                children: [
                  { name: 'Plant cell', desc: 'Cell wall, chloroplasts, big vacuole' },
                  { name: 'Animal cell', desc: 'No cell wall, has centrioles' },
                ],
              },
            ],
          },
          {
            name: 'Membrane systems',
            desc: 'The factory floor — work stations inside the cell',
            children: [
              {
                name: 'Plasma membrane',
                desc: 'Gatekeeper — selective barrier',
                children: [
                  { name: 'Fluid mosaic model', desc: 'Lipid bilayer + floating proteins' },
                  { name: 'Selective permeability', desc: 'Passes some molecules, blocks others' },
                ],
              },
              {
                name: 'Endomembrane system',
                desc: 'ER → Golgi → lysosomes: one transport chain',
                children: [
                  {
                    name: 'ER',
                    desc: 'Membrane factory for molecules',
                    children: [
                      { name: 'Rough ER', desc: 'Ribosome-studded — makes proteins' },
                      { name: 'Smooth ER', desc: 'Makes lipids, detoxifies' },
                    ],
                  },
                  { name: 'Golgi apparatus', desc: 'Packs and ships proteins' },
                  { name: 'Lysosomes', desc: 'Digest waste and invaders' },
                ],
              },
              { name: 'Vacuoles', desc: 'Storage tanks for water and waste' },
            ],
          },
          {
            name: 'Genetic material',
            desc: 'The blueprint of life, stored and read',
            children: [
              {
                name: 'Nucleus',
                desc: 'Brain of the cell — controls activities',
                children: [
                  { name: 'Nuclear envelope', desc: 'Double membrane with pores' },
                  { name: 'Nucleolus', desc: 'Makes ribosome subunits' },
                  { name: 'Chromatin', desc: 'DNA + histones → chromosomes' },
                ],
              },
              {
                name: 'Ribosomes',
                desc: 'Protein factories',
                children: [
                  { name: '70S', desc: 'Prokaryotic: 50S + 30S' },
                  { name: '80S', desc: 'Eukaryotic: 60S + 40S' },
                ],
              },
            ],
          },
          {
            name: 'Energy',
            desc: 'Powerhouses that make ATP',
            children: [
              {
                name: 'Mitochondria',
                desc: 'Powerhouse — makes ATP by respiration',
                children: [
                  { name: 'Cristae', desc: 'Folded inner membrane' },
                  { name: 'Matrix', desc: 'Holds Krebs cycle enzymes' },
                ],
              },
              {
                name: 'Chloroplasts',
                desc: 'Kitchen — traps sunlight to make food',
                children: [
                  { name: 'Thylakoids', desc: 'Discs that catch light' },
                  { name: 'Stroma', desc: 'Builds glucose (Calvin cycle)' },
                ],
              },
            ],
          },
          {
            name: 'Cell division',
            desc: 'How cells copy themselves',
            children: [
              {
                name: 'Mitosis',
                desc: 'Identical copies — growth and repair',
                children: [
                  { name: 'Prophase', desc: 'Chromosomes condense' },
                  { name: 'Metaphase', desc: 'Line up at the equator' },
                  { name: 'Anaphase', desc: 'Chromatids pulled apart' },
                  { name: 'Telophase', desc: 'Two nuclei form' },
                ],
              },
              {
                name: 'Meiosis',
                desc: 'Halves chromosome number — makes gametes',
                children: [
                  { name: 'Meiosis I', desc: 'Homologous pairs separate' },
                  { name: 'Meiosis II', desc: 'Four haploid cells' },
                ],
              },
            ],
          },
        ],
        legend: [
          'Index badge (1.2) = position counted from the top of the classification',
          'Grey line under a name = meaning of that box',
          'Tap any box → unit/topic position + full meaning',
        ],
      },
    },
  ]);

  // ── English: The Selfish Giant (unlocked — free to read) ───────────────
  const giant = await upsertChapter(english, 'The Selfish Giant', 'the-selfish-giant', 1, false);
  await seedBlocks(giant, [
    {
      blockType: 'summary',
      title: 'Summary',
      contentRichtext:
        'Oscar Wilde\'s "The Selfish Giant" is the story of a giant who returns from a seven-year visit to his friend, the Cornish ogre, and finds children playing in his beautiful garden. Furious, he drives them away and builds a high wall around it, posting a notice: **"Trespassers will be prosecuted."**\n\nSpring arrives everywhere in the country except the giant\'s garden — there it stays winter, with frost, snow and the North Wind. The giant finally understands his selfishness when he sees a little boy crying in a far corner of the garden. He helps the boy, knocks down the wall, and the children return. The little boy returns years later to take the giant to paradise as a reward for his kindness.',
    },
    {
      blockType: 'keywords',
      title: 'Keywords',
      contentRichtext:
        '- **Ogre** — a man-eating giant\n- **Trespassers** — people who enter without permission\n- **Hail** — frozen rain / to greet loudly\n- **Blossom** — a flower or mass of flowers\n- **Wither** — to dry up and die\n- **Lichen** — a small plant growing on walls/trees\n- **Piteous** — deserving pity\n- **Paradise** — heaven, a place of great beauty and happiness',
    },
    {
      blockType: 'important_points',
      title: 'Important points',
      contentRichtext:
        '1. The story teaches that **selfishness brings isolation and unhappiness**.\n2. The seasons in the garden are **symbolic**: winter = selfishness, spring = love/sharing.\n3. The little boy represents **Christ** — he has nail prints on his hands and feet, and takes the giant to paradise.\n4. The giant\'s transformation: selfish → loving → blessed.\n5. The wall symbolises the barrier the giant builds between himself and others.',
    },
  ]);

  // ── Nepali: व्याकरण (unlocked — free to read) ──────────────────────────
  const byakaran = await upsertChapter(nepali, 'व्याकरण (Grammar)', 'byakaran', 1, false);
  await seedBlocks(byakaran, [
    {
      blockType: 'byakaran', title: 'सन्धि (Sandhi)', subLevel: 'सन्धि',
      contentRichtext:
        'दुई वर्ण वा शब्दको मेल हुँदा अक्षरमा हुने परिवर्तनलाई **सन्धि** भनिन्छ। सन्धि तीन प्रकारका हुन्छन्: स्वर सन्धि, व्यञ्जन सन्धि र विसर्ग सन्धि।',
    },
    {
      blockType: 'byakaran', title: 'स्वर सन्धि (Swar Sandhi)', subLevel: 'सन्धि > स्वर सन्धि',
      contentRichtext:
        'स्वर + स्वरको मेलबाट हुने परिवर्तनलाई स्वर सन्धि भनिन्छ।\n\n- **उदाहरण:** विद्या + आलय = विद्यालय\n- विद्या (आ + आ) + आलय = विद्यालय',
    },
    {
      blockType: 'byakaran', title: 'स्वर सन्धिका भेद', subLevel: 'सन्धि > स्वर सन्धि > भेद',
      contentRichtext:
        'स्वर सन्धिका तीन भेद छन्:\n\n1. **दीर्घ सन्धि:** अ/आ + अ/आ = आ (जस्तै: राम + आयन = रामायन)\n2. **गुण सन्धि:** अ + इ = ए (जस्तै: नर + इन्द्र = नरेन्द्र)\n3. **वृद्धि सन्धि:** अ + ए = ऐ (जस्तै: एक + एक = एकैक, मत + एक = मतैक)',
    },
    {
      blockType: 'byakaran', title: 'व्यञ्जन सन्धि (Vyanjan Sandhi)', subLevel: 'सन्धि > व्यञ्जन सन्धि',
      contentRichtext:
        'व्यञ्जन + व्यञ्जन वा व्यञ्जन + स्वरको मेलबाट हुने परिवर्तनलाई व्यञ्जन सन्धि भनिन्छ।\n\n- **उदाहरण:** सत् + जन = सज्जन\n- सत् + चरित्र = सच्चरित्र\n- दिक् + गज = दिग्गज',
    },
    {
      blockType: 'byakaran', title: 'समास (Samas)', subLevel: 'समास',
      contentRichtext:
        'दुई वा दुईभन्दा बढी शब्द मिलेर एउटा नयाँ पद बन्ने प्रक्रियालाई **समास** भनिन्छ। समासका मुख्य भेदहरू: तत्पुरुष, कर्मधारय, द्विगु, द्वन्द्व, बहुव्रीहि।',
    },
    {
      blockType: 'byakaran', title: 'तत्पुरुष समास', subLevel: 'समास > तत्पुरुष',
      contentRichtext:
        'जुन समासमा पछिल्लो पद प्रधान हुन्छ र विभक्ति चिह्न (ले, को, मा, बाट…) लुकेको हुन्छ, त्यसलाई तत्पुरुष समास भनिन्छ।\n\n- विद्यालय + पुस्तक = विद्यालयको पुस्तक → **विद्यालयपुस्तक**\n- गाउँ + घर = गाउँको घर → **गाउँघर**',
    },
    {
      blockType: 'byakaran', title: 'कर्मधारय समास', subLevel: 'समास > कर्मधारय',
      contentRichtext:
        'जुन समासमा पहिलो पद विशेषण र दोस्रो पद विशेष्य हुन्छ, त्यसलाई कर्मधारय समास भनिन्छ।\n\n- नीलो + कमल = नीलो कमल → **नीलकमल**\n- महान + पुरुष = महान पुरुष → **महापुरुष**',
    },
  ]);

  // ── Class 12 skeleton (extensible, not yet fully seeded) ───────────────
  console.log('→ Seeding Class 12 skeleton…');
  const phys12 = await upsertSubject(class12, {
    name: 'Physics', slug: 'physics', subjectType: 'science_math',
    icon: 'orbit', themeColor: '#38bdf8', isLocked: true, sortOrder: 1,
  });
  const chapter12 = await upsertChapter(phys12, 'Rotational Dynamics', 'rotational-dynamics', 1);
  await seedBlocks(chapter12, [
    {
      blockType: 'note_topic', title: 'Moment of Inertia',
      contentRichtext:
        'Moment of inertia $I$ is the rotational analogue of mass: $I = \\sum m_i r_i^2$. It depends on the **mass distribution about the axis of rotation**. For a ring about its centre: $I = MR^2$; for a solid disc: $I = \\frac{1}{2}MR^2$.',
    },
  ]);
  for (const [name, slug, subjectType, icon, themeColor] of [
    ['Chemistry', 'chemistry', 'science_math', 'flask', '#34d399'],
    ['Mathematics', 'mathematics', 'science_math', 'ruler', '#a78bfa'],
    ['Biology', 'biology', 'biology', 'dna', '#2dd4bf'],
    ['English', 'english', 'english', 'book', '#fbbf24'],
    ['Nepali', 'nepali', 'nepali', 'pen', '#fb7185'],
  ]) {
    await upsertSubject(class12, { name, slug, subjectType, icon, themeColor, isLocked: true, sortOrder: 1 });
  }

  console.log('✓ Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
