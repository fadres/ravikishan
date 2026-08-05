import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classify,
  validateNoteSchema,
  tabTypeFromFolder,
  CLASSIFICATION_THRESHOLD,
  TAB_TYPES,
} from '../src/services/classifier.js';
import {
  discoverNoteFiles,
  pathParts,
  extractOrder,
  contentHash,
  buildMindmapTree,
  buildBlockData,
  parseArgs,
  resolveSectionFromFlags,
  isSectionFile,
} from '../prisma/import-notes.js';
import { sections } from '../src/lib/sections.config.js';

const CONCEPTS_PATH = 'class-11/physics/thermodynamics/concepts/01-first-law.json';
const PYG_PATH = 'class-11/physics/thermodynamics/pyqs/01-neb-2023.json';

const validNote = { title: 'First Law', notes: ['The first law of thermodynamics states that energy is conserved.'] };

// ── Folder-first determinism: the path wins, whatever the content says ────

test('folder path is the primary signal for all 7 types', () => {
  const noteWithNoteSignals = { title: 'Recap', notes: ['- Point one\n- Point two\n- Point three', 'Quick revision.'] };
  const cases = [
    ['class-11/physics/thermodynamics/concepts/x.json', 'concept', validNote, true],
    ['class-11/physics/thermodynamics/notes/x.json', 'note', noteWithNoteSignals, false],
    ['class-11/physics/thermodynamics/examples/x.json', 'example', validNote, true],
    ['class-11/physics/thermodynamics/formula/x.json', 'formula', validNote, true],
    ['class-11/physics/thermodynamics/pyqs/x.json', 'pyq', validNote, true],
    ['class-11/physics/thermodynamics/sets/x.json', 'set', validNote, true],
    ['class-11/physics/thermodynamics/mindmap/x.json', 'mindmap', validNote, true],
  ];
  for (const [filePath, type, note, expectFull] of cases) {
    const r = classify(note, filePath);
    assert.equal(r.type, type, `folder → ${type}`);
    if (expectFull) {
      assert.equal(r.confidence, 1, `folder confidence for ${type}`);
      assert.equal(r.needsReview, false);
      assert.match(r.reason, /folder/);
    }
  }
  // notes/ is the generic folder: heuristics run, so confidence is earned,
  // but note-flagged content still resolves to note.
  const notesCase = classify(noteWithNoteSignals, 'class-11/physics/thermodynamics/notes/x.json');
  assert.equal(notesCase.type, 'note');
  assert.equal(notesCase.needsReview, false);
  assert.ok(notesCase.confidence >= CLASSIFICATION_THRESHOLD);
});

test('pyqs/ folder is a PYQ even when the text looks like a formula sheet', () => {
  const note = { title: 'Deceptive', notes: ['v = u + at', 'F = ma', 'E = mc²'] };
  const r = classify(note, PYG_PATH);
  assert.equal(r.type, 'pyq');
  assert.equal(r.confidence, 1);
});

test('concepts/ folder stays concept even when the text is question-like', () => {
  const note = { title: 'Deceptive', notes: ['Q1. Define work. Q2. State the first law.'] };
  const r = classify(note, CONCEPTS_PATH);
  assert.equal(r.type, 'concept');
});

test('explicit metadata.type overrides everything', () => {
  const r = classify(validNote, CONCEPTS_PATH, { type: 'set' });
  assert.equal(r.type, 'set');
  assert.equal(r.confidence, 1);
});

// ── Content heuristics: no type folder → text decides ────────────────────

test('heuristic detection for all 7 types without a type folder', () => {
  const cases = [
    [{ title: 'Definition', notes: ['Force is defined as any push or pull on an object.'] }, 'concept'],
    [{ title: 'Key Points', notes: ['- Point one\n- Point two\n- Point three', 'Quick revision of the whole chapter.'] }, 'note'],
    [{ title: 'Worked Example', notes: ['Worked example 1: A ball is dropped from 10 m.\nSolution: v = sqrt(2gh).'] }, 'example'],
    [{ title: 'Equations', notes: ['v = u + at', 's = ut + ½at²'] }, 'formula'],
    [{ title: 'PYQ', notes: ['Past year question 2023: State the first law of thermodynamics.'] }, 'pyq'],
    [{ title: 'Drill', notes: ['Practice set — MCQ drill:\nQ1. Define heat?\nAnswer: …'] }, 'set'],
    [{ title: 'Map', notes: ['- Laws', '  - First law → energy', '  - Second law → entropy', '  - Zeroth law → temperature'] }, 'mindmap'],
  ];
  for (const [note, type] of cases) {
    const r = classify(note, 'class-11/physics/thermodynamics/root-file.json');
    assert.equal(r.type, type, `heuristic → ${type}`);
    assert.ok(r.confidence >= CLASSIFICATION_THRESHOLD, `${type} confidence ${r.confidence} >= threshold`);
    assert.equal(r.needsReview, false);
  }
});

test('pyq frontmatter (year/examSource) boosts to pyq', () => {
  const r = classify(validNote, 'class-11/physics/thermodynamics/root-file.json', { year: 2023, examSource: 'NEB' });
  assert.equal(r.type, 'pyq');
  assert.ok(r.confidence >= 0.9);
});

test('latex frontmatter boosts to formula', () => {
  const r = classify(validNote, 'class-11/physics/thermodynamics/root-file.json', { latex: true });
  assert.equal(r.type, 'formula');
  assert.ok(r.confidence >= 0.9);
});

test('generic notes/ folder falls back to content heuristics', () => {
  const pyqInNotes = classify(
    { title: 'PYQ', notes: ['Previous year question: State the first law.'] },
    'class-11/physics/thermodynamics/notes/01-pyq.json',
  );
  assert.equal(pyqInNotes.type, 'pyq');
  assert.equal(pyqInNotes.needsReview, false);

  const noteInNotes = classify(
    { title: 'Recap', notes: ['- Simple point\n- Another point\n- Third point'] },
    'class-11/physics/thermodynamics/notes/01-recap.json',
  );
  assert.equal(noteInNotes.type, 'note');
});

// ── Ambiguous content → flagged, never silently imported ─────────────────

test('ambiguous content in a generic location is flagged needs-review', () => {
  const r = classify(
    { title: 'Mixed', notes: ['Q1. Define heat. Q2. State the second law.'] },
    'class-11/physics/thermodynamics/extra.json',
  );
  assert.equal(r.needsReview, true);
  assert.ok(r.confidence < CLASSIFICATION_THRESHOLD);
});

test('ambiguous content in notes/ defaults to note but stays flagged', () => {
  const r = classify(
    { title: 'Mixed', notes: ['Q1. Define heat. Q2. State the second law.'] },
    'class-11/physics/thermodynamics/notes/01-mixed.json',
  );
  assert.equal(r.type, 'note');
  assert.equal(r.needsReview, true);
});

test('classification is idempotent — same input always yields the same result', () => {
  const a = classify(validNote, PYG_PATH);
  const b = classify(validNote, PYG_PATH);
  assert.deepEqual(a, b);
});

// ── Malformed schema ──────────────────────────────────────────────────────

test('malformed schemas are rejected, never coerced', () => {
  assert.equal(classify({}, 'x/y/z/concepts/a.json').type, null);
  assert.equal(classify(null, 'x/y/z/concepts/a.json').type, null);
  assert.equal(classify({ title: 'No notes' }, 'x/y/z/concepts/a.json').type, null);
  assert.equal(classify({ title: '', notes: [] }, 'x/y/z/concepts/a.json').type, null);
  assert.equal(classify({ title: 'T', notes: ['ok', 42] }, 'x/y/z/concepts/a.json').type, null);
});

test('validateNoteSchema accepts the flat schema and optional fields', () => {
  assert.equal(validateNoteSchema(validNote).valid, true);
  assert.equal(validateNoteSchema({ title: 'T', notes: ['a'], order: 3, year: 2023, examSource: 'NEB', latex: false }).valid, true);
  assert.equal(validateNoteSchema({ title: 'T', notes: ['a'], type: 'pyq' }).valid, true);
  assert.equal(validateNoteSchema({ title: 'T', notes: ['a'], type: 'nonsense' }).valid, false);
  assert.equal(validateNoteSchema({ title: 'T', notes: ['a'], order: 1.5 }).valid, false);
  assert.equal(validateNoteSchema({ title: 'T', notes: 'string' }).valid, false);
});

// ── tabTypeFromFolder ─────────────────────────────────────────────────────

test('tabTypeFromFolder only recognizes the 4th path level', () => {
  assert.equal(tabTypeFromFolder(CONCEPTS_PATH).type, 'concept');
  assert.equal(tabTypeFromFolder('class-11/physics/thermodynamics/01-x.json').type, null);
  assert.equal(tabTypeFromFolder('class-11/physics/notes/01-x.json').type, null);
  assert.equal(tabTypeFromFolder('').type, null);
  assert.equal(tabTypeFromFolder('class-11\\physics\\thermodynamics\\pyqs\\01.json').type, 'pyq');
});

// ── pathParts / extractOrder / contentHash / mindmap tree ─────────────────

test('pathParts splits class/subject/chapter/type/file', () => {
  assert.deepEqual(pathParts(CONCEPTS_PATH), {
    classSlug: 'class-11',
    subjectSlug: 'physics',
    chapterSlug: 'thermodynamics',
    typeFolder: 'concepts',
    fileName: '01-first-law.json',
  });
  const shallow = pathParts('class-11/physics/thermodynamics/01-x.json');
  assert.equal(shallow.typeFolder, null);
  assert.equal(shallow.fileName, '01-x.json');
  assert.equal(pathParts('class-11/x.json'), null);
});

test('extractOrder: explicit order wins, then filename prefix, then fallback', () => {
  assert.equal(extractOrder('99-last.json', { order: 2 }, 0), 2);
  assert.equal(extractOrder('03-middle.json', {}, 0), 3);
  assert.equal(extractOrder('first-no-number.json', {}, 7), 7);
});

test('contentHash is stable for identical content and changes on edit', () => {
  const a = buildBlockData(validNote, { type: 'concept', confidence: 1, reason: 'x' }, 'import-notes:k', 0);
  const b = buildBlockData(validNote, { type: 'concept', confidence: 1, reason: 'x' }, 'import-notes:k', 0);
  assert.equal(a.metadata.contentHash, b.metadata.contentHash);
  const edited = buildBlockData({ ...validNote, notes: ['Edited content.'] }, { type: 'concept', confidence: 1, reason: 'x' }, 'import-notes:k', 0);
  assert.notEqual(a.metadata.contentHash, edited.metadata.contentHash);
});

test('buildMindmapTree parses indented "- " lines into a nested tree', () => {
  const tree = buildMindmapTree(['- Thermodynamics', '  - Laws', '    - First law → energy', '  - Processes']);
  assert.equal(tree.name, 'Thermodynamics');
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].name, 'Laws');
  assert.equal(tree.children[0].children[0].name, 'First law → energy');
  assert.equal(buildMindmapTree(['just one line']), null);
});

test('buildBlockData maps tabs to the existing BlockType enum', () => {
  const cases = [
    ['concept', 'note_concept'],
    ['note', 'note_important'],
    ['example', 'note_example'],
    ['formula', 'formula'],
    ['pyq', 'pyq'],
    ['set', 'solved_example'],
    ['mindmap', 'mindmap'],
  ];
  for (const [type, blockType] of cases) {
    const data = buildBlockData(validNote, { type, confidence: 1, reason: 'x' }, 'import-notes:k', 0);
    assert.equal(data.blockType, blockType, `${type} → ${blockType}`);
    assert.ok(data.sectionIndex >= 0);
    assert.ok(data.accessLevel >= 1 && data.accessLevel <= 3);
  }
});

test('discoverNoteFiles walks recursively and sorts deterministically', () => {
  const dir = mkdtempSync(join(tmpdir(), 'import-notes-test-'));
  try {
    writeFileSync(join(dir, 'a.json'), '{}');
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'nested', 'b.json'), '{}');
    writeFileSync(join(dir, 'skip.txt'), 'x');
    const files = discoverNoteFiles(dir);
    assert.equal(files.length, 2);
    assert.deepEqual(files.map((f) => f.relPath), ['a.json', 'nested/b.json']);
    assert.equal(discoverNoteFiles(join(dir, 'missing')).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Sanity: the exported taxonomy is exactly the 7 tab types.
test('TAB_TYPES contains exactly the 7 required tab types', () => {
  assert.deepEqual(TAB_TYPES, ['concept', 'note', 'example', 'formula', 'pyq', 'set', 'mindmap']);
});

// ── Section-awareness (Task 3: --section flag, fail-fast, tree guard) ─────

test('parseArgs defaults to the class-11 section and accepts --section', () => {
  const base = parseArgs(['node', 'import-notes.js']);
  assert.equal(base.section, 'class-11');
  assert.equal(base.dir, null, 'content dir resolves from the registry when unset');

  const viaSpace = parseArgs(['node', 'import-notes.js', '--section', 'class-11']);
  assert.equal(viaSpace.section, 'class-11');

  const viaEquals = parseArgs(['node', 'import-notes.js', '--section=class-11']);
  assert.equal(viaEquals.section, 'class-11');

  const other = parseArgs(['node', 'import-notes.js', '--section', 'class-12']);
  assert.equal(other.section, 'class-12');
});

test('resolveSectionFromFlags fails fast (exit code 1, no section) for unknown ids', () => {
  const prevCode = process.exitCode;
  try {
    process.exitCode = 0;
    const result = resolveSectionFromFlags({ section: 'class-12-test' });
    assert.equal(result, null);
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = prevCode;
  }
  const ok = resolveSectionFromFlags({ section: 'class-11' });
  assert.equal(ok.id, 'class-11');
});

test('isSectionFile keeps only the section-owned tree (foreign trees are skipped, never imported)', () => {
  const section = sections[0];
  assert.equal(section.classSlug, 'class-11');
  assert.equal(isSectionFile(pathParts('class-11/physics/thermo/concepts/a.json'), section), true);
  assert.equal(isSectionFile(pathParts('class-11/physics/thermo/pyqs/01.json'), section), true);
  assert.equal(isSectionFile(pathParts('class-12/physics/thermo/concepts/a.json'), section), false);
  assert.equal(isSectionFile(pathParts('class-12/physics/thermo/pyqs/01.json'), section), false);
});
