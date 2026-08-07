import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTION_ORDER,
  sectionIndexForBlockType,
  viewerSectionLimit,
  isSectionVisible,
  coverageForTopic,
} from '../src/lib/sections.js';
import { structureTopic, splitIntoSections, classifyBlock } from '../src/services/classifier.js';
import { validateBlocks, serializeReport, isTopicComplete } from '../src/services/contentValidator.js';

// ── sections.js ────────────────────────────────────────────────────────────

test('section mapping is complete and sequential', () => {
  assert.equal(SECTION_ORDER.length, 11);
  assert.equal(sectionIndexForBlockType('note_topic'), 0);
  assert.equal(sectionIndexForBlockType('learning_outcome'), 1);
  assert.equal(sectionIndexForBlockType('mindmap'), 2);
  assert.equal(sectionIndexForBlockType('note_concept'), 3);
  assert.equal(sectionIndexForBlockType('important_points'), 5);
  assert.equal(sectionIndexForBlockType('mind_recall'), 6);
  assert.equal(sectionIndexForBlockType('pyq'), 7);
  assert.equal(sectionIndexForBlockType('solved_example'), 8);
  assert.equal(sectionIndexForBlockType('premium_expansion'), 9);
  assert.equal(sectionIndexForBlockType('reference'), 10);
});

test('unknown types default to the topic section (0)', () => {
  assert.equal(sectionIndexForBlockType('mystery_type'), 0);
});

test('viewerSectionLimit: public sees 1 section, L3 sees 3, L2 sees 5, L1 sees all', () => {
  assert.equal(viewerSectionLimit(0), 1);
  assert.equal(viewerSectionLimit(3), 3);
  assert.equal(viewerSectionLimit(2), 5);
  assert.equal(viewerSectionLimit(1), 10);
});

test('isSectionVisible respects the section limit', () => {
  assert.equal(isSectionVisible(0, 3, 3), true);
  assert.equal(isSectionVisible(3, 3, 3), true);
  assert.equal(isSectionVisible(4, 3, 3), false);
  assert.equal(isSectionVisible(5, 3, 2), true);
  assert.equal(isSectionVisible(8, 3, 2), false);
});

test('isSectionVisible gates premium blocks behind viewer level', () => {
  assert.equal(isSectionVisible(3, 3, 3), true);
  assert.equal(isSectionVisible(2, 2, 3), false);
  assert.equal(isSectionVisible(2, 2, 2), true);
});

test('coverageForTopic: premium sees 100%, guests see a fraction', () => {
  const blocks = [
    { sectionIndex: 0, accessLevel: 3 },
    { sectionIndex: 1, accessLevel: 3 },
    { sectionIndex: 3, accessLevel: 2 },
    { sectionIndex: 4, accessLevel: 2 },
    { sectionIndex: 5, accessLevel: 2 },
    { sectionIndex: 6, accessLevel: 1 },
    { sectionIndex: 7, accessLevel: 1 },
  ];
  assert.equal(coverageForTopic(blocks, 1), 100);
  assert.equal(coverageForTopic(blocks, 3), 29);
  assert.equal(coverageForTopic([], 1), 0);
});

// ── classifier: structuring raw notes ─────────────────────────────────────

test('splitIntoSections recognizes markdown headings', () => {
  const sections = splitIntoSections('### Example 1\n\ntext one\n\n### Example 2\n\ntext two');
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, 'Example 1');
  assert.equal(sections[1].title, 'Example 2');
});

test('splitIntoSections recognizes HTML headings and strips tags', () => {
  const sections = splitIntoSections('<h2>Definition</h2>\n\nVelocity is <b>rate</b>.');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, 'Definition');
  assert.match(sections[0].content, /rate/);
});

test('splitIntoSections keeps inline bold markers as content, not headings', () => {
  const sections = splitIntoSections('### Example 1\n\n**Answer:** Given\n\n$$A = 6 \\times 7.203^2$$');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, 'Example 1');
  assert.match(sections[0].content, /\*\*Answer:\*\* Given/);
  assert.match(sections[0].content, /\$A = 6/);
});

test('splitIntoSections keeps standalone bold markers as headings', () => {
  const sections = splitIntoSections('**Important:**\n\nAlways use SI units.');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, 'Important');
  assert.match(sections[0].content, /SI units/);
});

test('splitIntoSections caps oversized sections into parts', () => {
  const big = `${'word '.repeat(1000)} ${'x'.repeat(9500)}`;
  const sections = splitIntoSections(`### Huge\n\n${big}`);
  assert.ok(sections.length > 1, 'oversized section should be split into parts');
  for (const s of sections) assert.ok(s.content.length < 12000, `part too large: ${s.content.length}`);
});

test('structureTopic classifies chunks into canonical blocks', () => {
  const blocks = structureTopic('Kinematics', [
    '### Velocity\n\nVelocity is defined as displacement per unit time.',
    '### Example\n\nFor example, a car moving at 10 m/s.',
    '**Important:**\n\nAlways use SI units.',
  ].join('\n\n'));
  assert.ok(blocks.length >= 3);
  const concept = blocks.find((b) => b.blockType === 'note_concept');
  const example = blocks.find((b) => b.blockType === 'note_example');
  const important = blocks.find((b) => b.blockType === 'important_points');
  assert.ok(concept && example && important, 'expected concept, example and important blocks');
  assert.equal(concept.sectionIndex, 3);
  assert.equal(example.sectionIndex, 4);
  assert.equal(important.sectionIndex, 5);
});

test('structureTopic titles unheaded first chunk with the topic title', () => {
  const blocks = structureTopic('Vectors', 'A vector has magnitude and direction.');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].title, 'Vectors');
});

test('classifyBlock maps past-year questions to pyq', () => {
  const r = classifyBlock({ content: '**Past year question:** Define Newton\u2019s first law.' });
  assert.equal(r.blockType, 'pyq');
});

test('classifyBlock maps numerical problems to solved_example', () => {
  const r = classifyBlock({ content: 'Calculate the work done if F = 5 N and d = 2 m.' });
  assert.equal(r.blockType, 'solved_example');
});

// ── contentValidator.js ────────────────────────────────────────────────────

// The validator derives section keys from blockType (the single source of
// truth), so the helper maps a section index to a type in that section.
const TYPE_BY_SECTION = {
  0: 'note_topic', 1: 'learning_outcome', 2: 'mindmap', 3: 'note_concept', 4: 'note_example',
  5: 'important_points', 6: 'mind_recall', 7: 'pyq', 8: 'solved_example',
  9: 'premium_expansion', 10: 'reference',
};

function block(sectionIndex, extra = {}) {
  return {
    blockType: TYPE_BY_SECTION[sectionIndex] ?? 'note_statement',
    sectionIndex,
    contentRichtext: 'text',
    metadata: {},
    ...extra,
  };
}

test('validateBlocks flags missing topic and concept sections', () => {
  const report = validateBlocks([block(4), block(6)]);
  assert.ok(report.missing.includes('topic'));
  assert.ok(report.missing.includes('concept'));
  assert.equal(report.valid, false);
});

test('validateBlocks detects out-of-order sections', () => {
  const report = validateBlocks([block(3), block(0)]);
  assert.equal(report.orderingIssues.length, 1);
});

test('validateBlocks flags duplicates by fingerprint', () => {
  const report = validateBlocks([
    block(2, { title: 'A', contentRichtext: 'repeated sentence that is long enough to fingerprint', metadata: {} }),
    block(3, { title: 'B', contentRichtext: 'repeated sentence that is long enough to fingerprint', metadata: {} }),
  ]);
  assert.equal(report.duplicates.length, 1);
  assert.equal(report.duplicates[0].duplicateOf, undefined);
});

test('serializeReport produces a stable JSON-safe shape', () => {
  const json = serializeReport(validateBlocks([block(0), block(3)]));
  assert.equal(json.valid, true);
  assert.equal(typeof json.blockCount, 'number');
  assert.ok(Array.isArray(json.missing));
  assert.ok(Array.isArray(json.duplicates));
  assert.doesNotThrow(() => JSON.stringify(json));
});

test('isTopicComplete requires topic, concept, examples, important and mind_recall', () => {
  const incomplete = validateBlocks([block(0), block(3)]);
  assert.equal(isTopicComplete(incomplete), false);
  const complete = validateBlocks([block(0), block(3), block(4), block(5), block(6)]);
  assert.equal(isTopicComplete(complete), true);
});
