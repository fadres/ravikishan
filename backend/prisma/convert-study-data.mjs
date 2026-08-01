// StudyVault data.js → ravikishan corpus converter.
//
// Reads the copy of the user's StudyVault source kept at
// import-data/study-data.js and materializes its TOPIC_CONTENT entries as
// topic JSON files under import-data/content/<subject>/<chapter>/ following
// the same corpus format as the legacy "data copy" files, so the regular
// content importer (import-content.js) handles them unchanged.
//
// Run:  node prisma/convert-study-data.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STUDY_DATA, TOPIC_CONTENT } from './import-data/study-data.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'import-data', 'content');

// data.js "subject__chapter__topic" prefix → target corpus folder.
// Topics are merged into existing chapters when our corpus already has that
// chapter; otherwise a new chapter folder (folder name = chapter title).
const MAPPING = {
  'physics__chapter-1': 'physics/mechanics',
  'chemistry__gas-laws': 'chemistry/state of matter (gaseous state)',
  'chemistry__states-of-matter': 'chemistry/States of Matter',
  'chemistry__classification-of-matter': 'chemistry/Classification of Matter',
  'chemistry__compounds': 'chemistry/Compounds & Chemical Bonding',
  'chemistry__atomic-structure': 'chemistry/atomic structure',
  'chemistry__atomic-mass-definitions': 'chemistry/Atomic Mass & Atomic Mass Unit',
  'chemistry__molecular-mass': 'chemistry/Relative Molecular Mass & Formula Mass',
  'chemistry__organic-chemistry-basics': 'chemistry/Organic Chemistry Foundations',
  'chemistry__atomic-models': 'chemistry/Atomic Models & Isotopic Species',
  'biology__bio-molecules': 'biology/Bio-molecules & Chemical Basis of Life',
  'english__grammar-vocabulary': 'english/Grammar & Vocabulary Syllabus',
  'english__writing-tasks': 'english/Writing & Literature Tasks',
  'english__subject-verb-agreement': 'english/Subject-Verb Agreement Masterclass',
  'nepali__bhashatattva': 'nepali/bhashattattva',
  'nepali__thap-abhyas': 'nepali/bhashattattva',
  'mathematics__chapter-2': 'mathematics/calculus',
};

function topicTitle(subjectId, chapterId, topicId) {
  const ch =
    STUDY_DATA[subjectId]?.chapters?.find((c) => c.id === chapterId) ||
    STUDY_DATA[subjectId]?.chapters?.find((c) => c.id === chapterId.replace('bhashatattva', 'bhashattattva'));
  return ch?.topics?.find((t) => t.id === topicId)?.title?.trim() || null;
}

function normalizeExamples(items) {
  return (items || [])
    .map((item) => {
      if (typeof item === 'string') return item;
      const title = item.title ? `**${item.title}**` : '';
      const parts = [title, item.problem, item.solution ? `**Solution:** ${item.solution}` : ''].filter(Boolean);
      return parts.join('\n\n');
    })
    .filter(Boolean);
}

function normalizePractice(practice) {
  if (!practice) return [];
  if (Array.isArray(practice)) return practice.filter(Boolean);
  const { mcqs = [], short = [], long = [], numericals = [] } = practice;
  return [...mcqs, ...short, ...long, ...numericals].filter(Boolean);
}

function normalizeFormulas(items) {
  return (items || [])
    .map((item) => {
      if (typeof item === 'string') return item;
      return item.name && item.expression ? `**${item.name}:** ${item.expression}` : String(item.expression || item.name || '');
    })
    .filter(Boolean);
}

let written = 0;
let skipped = 0;

for (const key of Object.keys(TOPIC_CONTENT)) {
  const [subjectId, chapterId, topicId] = key.split('__');
  const target = MAPPING[`${subjectId}__${chapterId}`];
  if (!target) {
    skipped += 1;
    console.log(`  ↷ skip ${key} (no mapping)`);
    continue;
  }

  const entry = TOPIC_CONTENT[key];
  const out = {
    title: topicTitle(subjectId, chapterId, topicId) || topicId,
    notes: Array.isArray(entry.notes) ? entry.notes : entry.notes ? [entry.notes] : [],
    examples: normalizeExamples(entry.examples),
    practice: normalizePractice(entry.practice),
    formulas: normalizeFormulas(entry.formulas),
    keyPoints: Array.isArray(entry.keyPoints) ? entry.keyPoints : entry.keyPoints ? [entry.keyPoints] : [],
    summary: entry.summary || '',
  };
  if (Object.values(out).every((v) => (Array.isArray(v) ? v.length === 0 : !v))) {
    skipped += 1;
    console.log(`  ↷ skip ${key} (no content)`);
    continue;
  }

  const dir = join(OUT, target);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${topicId}.json`), JSON.stringify(out, null, 2));
  written += 1;
  console.log(`  ✓ ${target}/${topicId}.json — ${out.notes.length} notes, ${out.examples.length} examples, ${out.practice.length} practice, ${out.formulas.length} formulas`);
}

console.log(`\nDone — wrote ${written} topic files, skipped ${skipped}.`);
