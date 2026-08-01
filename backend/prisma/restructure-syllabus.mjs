// Restructure legacy content folders into official-syllabus unit chapters.
//
//  * Creates one chapter folder per syllabus unit (physics/chemistry/biology)
//    or area (mathematics), named after the official syllabus.
//  * Writes a "Syllabus Overview" topic file (syllabus-topics.json) into each
//    chapter listing the official topics + teaching hours.
//  * Moves existing topic files from the legacy chapter folders into the
//    matching syllabus units.
//  * Deletes legacy duplicate files (repeats of content that already exists
//    in the new units).
//  * Rewrites navigation/<subject>.json to the new unit structure.
//
// Run:  npm run content:restructure   (then npm run content:import,
//       then npm run content:prune to drop orphan chapters from the DB)

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import physicsSyllabus from './import-data/raw/syllabus/physics.mjs';
import mathematicsSyllabus from './import-data/raw/syllabus/mathematics.mjs';
import chemistrySyllabus from './import-data/raw/syllabus/chemistry.mjs';
import biologySyllabus from './import-data/raw/syllabus/biology.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'import-data');
const CONTENT = join(DATA, 'content');
const NAV = join(DATA, 'navigation');

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const titleOf = (file) => {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (parsed && parsed.title) return String(parsed.title).trim();
  } catch {
    /* fall through */
  }
  return basename(file, extname(file)).replace(/-/g, ' ');
};

const human = (s) => String(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ── Syllabus → chapter builders ────────────────────────────────────────────

const unitChapter = (prefix, unit, blurb) => ({
  id: `${prefix}${unit.unitNumber}-${slugify(unit.unitTitle)}`,
  title: `Unit ${unit.unitNumber}: ${unit.unitTitle}`,
  blurb,
});

const SUBJECTS = [
  {
    id: 'physics',
    name: 'Physics',
    syllabus: physicsSyllabus,
    chapters: (syl) =>
      syl.areas.flatMap((area) =>
        area.units.map((u) => unitChapter('unit-', u, `${area.area} · ${u.teachingHours} teaching hours`)),
      ),
    syllabusItems: (syl) => syl.areas.flatMap((area) => area.units.map((u) => u)),
    moves: [
      { from: 'Physical Quantities', to: 'unit-1-physical-quantities', all: true },
      { from: 'Vectors', to: 'unit-2-vectors', all: true },
      { from: 'mechanics', to: 'unit-1-physical-quantities', files: ['s-f-rules.json', 'm,p-errors.json', 'numerical-p.json', 'c,q-and-mcq.json', 'l,s,a,q-and-n.json'] },
      { from: 'mechanics', to: 'unit-2-vectors', files: ['vector.json'] },
      { from: 'mechanics', drop: ['dimensions.json', 'errors.json', 'topic-1.json', 'dimensional-analysis-practice-set-1.json', 'dimensional-analysis-practice-set-2.json', 'physical-quantity.json'] },
      { from: 'heat', to: 'unit-9-heat-and-temperature', files: ['h-and-t.json', 'heat-and-temperature.json', 'temperature-scales.json'] },
      { from: 'heat', to: 'unit-11-quantity-of-heat', files: ['quantity-of-heat.json'] },
      { from: 'optics', to: 'unit-14-reflection-at-curved-mirror', files: ['n1.json', 'opticsn1.json', 'reflection-at-curve-surface.json'] },
      { from: 'optics', to: 'unit-17-lenses', files: ['on1.json', 'n2.json', 'n3.json'] },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    syllabus: chemistrySyllabus,
    chapters: (syl) =>
      syl.areas.flatMap((area) =>
        area.units.map((u) => unitChapter('unit-', u, `${area.area} · ${u.teachingHours} teaching hours`)),
      ),
    syllabusItems: (syl) => syl.areas.flatMap((area) => area.units.map((u) => u)),
    moves: [
      { from: 'foundation and fundamentals', to: 'unit-1-foundation-and-fundamentals', all: true },
      { from: 'Classification of Matter', to: 'unit-1-foundation-and-fundamentals', all: true },
      { from: 'stoichiometry', to: 'unit-2-stoichiometry', all: true },
      { from: 'Relative Molecular Mass & Formula Mass', to: 'unit-2-stoichiometry', all: true },
      { from: 'atomic structure', to: 'unit-3-atomic-structure', all: true },
      { from: 'Atomic Models & Isotopic Species', to: 'unit-3-atomic-structure', all: true },
      { from: 'Atomic Mass & Atomic Mass Unit', to: 'unit-3-atomic-structure', all: true },
      { from: 'Compounds & Chemical Bonding', to: 'unit-5-chemical-bonding-and-shapes-of-molecules', all: true },
      { from: 'gaseous-state', to: 'unit-7-states-of-matter', all: true },
      { from: 'state of matter (gaseous state)', to: 'unit-7-states-of-matter', all: true },
      { from: 'States of Matter', to: 'unit-7-states-of-matter', all: true },
      { from: 'Organic Chemistry Foundations', to: 'unit-12-basic-concept-of-organic-chemistry', all: true },
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    syllabus: mathematicsSyllabus,
    chapters: (syl) =>
      syl.areas.map((a) => ({
        id: slugify(a.area),
        title: a.area,
        blurb: `${a.workingHours} working hours`,
      })),
    syllabusItems: (syl) => syl.areas,
    moves: [
      { from: 'matrix (algebra)', to: 'algebra', all: true },
      { from: 'analytical-geometry', to: 'analytic-geometry', all: true },
      { from: 'calculus', to: 'calculus', all: true },
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    syllabus: biologySyllabus,
    chapters: (syl) =>
      syl.parts.flatMap((part) =>
        part.units.map((u) => unitChapter('unit-', u, `${part.part.replace('Part ', '')} · ${u.teachingHours} teaching hours`)),
      ),
    syllabusItems: (syl) => syl.parts.flatMap((part) => part.units),
    moves: [
      { from: 'Bio-molecules & Chemical Basis of Life', to: 'unit-1-biomolecules-and-cell-biology', all: true },
      { from: 'Cell Biology', to: 'unit-1-biomolecules-and-cell-biology', all: true },
      { from: 'botany', to: 'unit-2-floral-diversity', all: true },
      { from: 'zoology', deleteFolder: true },
    ],
  },
];

// ── Overview topic file ────────────────────────────────────────────────────

function overviewJson(subject, chapter, unitOrArea) {
  const topics = unitOrArea.topics || [];
  const hourLine = chapter.blurb;
  const list = topics.map((t) => `  <li>${t}</li>`).join('\n');
  return {
    title: `${chapter.title} — Syllabus Overview`,
    syllabus: subject.syllabus.code,
    notes: [
      `<p><strong>${chapter.title}</strong> &middot; ${hourLine}</p>`,
      `<h2>Syllabus Topics</h2>`,
      `<ul>\n${list}\n</ul>`,
    ],
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

for (const subject of SUBJECTS) {
  const contentDir = join(CONTENT, subject.id);
  const movedByChapter = new Map();
  const legacyDirs = new Set(subject.moves.map((m) => m.from));

  console.log(`\n=== ${subject.name} ===`);

  // 1. Create chapter folders + write syllabus overview topics.
  const chapterDefs = subject.chapters(subject.syllabus);
  const syllabusItems = subject.syllabusItems(subject.syllabus);
  for (let i = 0; i < chapterDefs.length; i++) {
    const ch = chapterDefs[i];
    const dir = join(contentDir, ch.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'syllabus-topics.json'),
      JSON.stringify(overviewJson(subject, ch, syllabusItems[i]), null, 2),
    );
  }

  // 2. Move / drop legacy files.
  for (const move of subject.moves) {
    const fromDir = join(contentDir, move.from);
    if (!existsSync(fromDir)) {
      if (move.deleteFolder) continue;
      console.warn(`  ⚠ missing legacy folder: ${move.from}`);
      continue;
    }
    const files = readdirSync(fromDir).filter((f) => f.toLowerCase().endsWith('.json'));
    if (move.all) {
      for (const f of files) {
        const target = join(contentDir, move.to, f);
        renameSync(join(fromDir, f), target);
        movedByChapter.get(move.to).push(f);
        console.log(`  → ${move.from}/${f} → ${move.to}/`);
      }
    } else if (move.files) {
      for (const f of move.files) {
        const src = join(fromDir, f);
        if (!existsSync(src)) {
          console.warn(`  ⚠ missing file: ${move.from}/${f}`);
          continue;
        }
        renameSync(src, join(contentDir, move.to, f));
        movedByChapter.get(move.to).push(f);
        console.log(`  → ${move.from}/${f} → ${move.to}/`);
      }
    }
    if (move.drop) {
      for (const f of move.drop) {
        const src = join(fromDir, f);
        if (existsSync(src)) {
          rmSync(src);
          console.log(`  ✗ dropped duplicate: ${move.from}/${f}`);
        }
      }
    }
    if (move.deleteFolder) {
      rmSync(fromDir, { recursive: true, force: true });
      console.log(`  ✗ removed empty folder: ${move.from}`);
    }
  }

  // 3. Remove legacy folders that are now empty.
  for (const dirName of legacyDirs) {
    const dir = join(contentDir, dirName);
    if (!existsSync(dir)) continue;
    const remaining = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.json'));
    if (remaining.length === 0) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`  ✗ removed empty folder: ${dirName}`);
    } else {
      console.warn(`  ? legacy folder ${dirName} still has ${remaining.length} unmapped files`);
    }
  }

  // 4. Rewrite navigation (topics = actual files in each chapter folder).
  const navChapters = chapterDefs.map((ch) => {
    const dir = join(contentDir, ch.id);
    const jsonFiles = readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .map((f) => f.replace(/\.json$/i, ''))
      .sort();
    const topics = ['syllabus-topics', ...jsonFiles.filter((f) => f !== 'syllabus-topics')];
    return {
      id: ch.id,
      title: ch.title,
      description: ch.blurb,
      topics: topics.map((f) => ({ id: f, title: titleOf(join(dir, `${f}.json`)) })),
    };
  });
  try {
    writeFileSync(join(NAV, `${subject.id}.json`), JSON.stringify({ name: subject.name, chapters: navChapters }, null, 2));
    console.log(`  ✓ navigation/${subject.id}.json (${navChapters.length} chapters)`);
  } catch (err) {
    const fallback = join('C:\\Users\\ASUS\\AppData\\Local\\Temp\\opencode', `nav-${subject.id}.json`);
    writeFileSync(fallback, JSON.stringify({ name: subject.name, chapters: navChapters }, null, 2));
    console.warn(`  ⚠ nav write failed for ${subject.id} (locked by editor) → dumped to ${fallback}`);
  }
}

console.log('\nDone. Next: npm run content:import  →  npm run content:prune');
