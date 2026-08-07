// The classification pipeline ships inside the section backend too — every
// section imports its own content through the identical deterministic
// classifier. These are the same assertions as the global backend's
// sections.test.js, proving the fork's pipeline is intact.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTION_ORDER,
  sectionIndexForBlockType,
  viewerSectionLimit,
  isSectionVisible,
} from '../src/lib/sections.js';
import { structureTopic, splitIntoSections, classifyBlock, classify } from '../src/services/classifier.js';

test('section mapping is complete and sequential', () => {
  assert.equal(SECTION_ORDER.length, 11);
  assert.equal(sectionIndexForBlockType('note_topic'), 0);
  assert.equal(sectionIndexForBlockType('mindmap'), 2);
  assert.equal(sectionIndexForBlockType('pyq'), 7);
});

test('viewerSectionLimit: public sees 1 section, L3 sees 3, L2 sees 5, L1 sees all', () => {
  assert.equal(viewerSectionLimit(4), 1);
  assert.equal(viewerSectionLimit(3), 3);
  assert.equal(viewerSectionLimit(2), 5);
  assert.equal(viewerSectionLimit(1), 10);
});

test('isSectionVisible gates premium blocks behind viewer level', () => {
  assert.equal(isSectionVisible(3, 3, 3), true);
  assert.equal(isSectionVisible(2, 2, 3), false);
  assert.equal(isSectionVisible(2, 2, 2), true);
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

test('splitIntoSections recognizes markdown headings', () => {
  const sections = splitIntoSections('### Example 1\n\ntext one\n\n### Example 2\n\ntext two');
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, 'Example 1');
});

test('classify is deterministic on the folder signal', () => {
  const note = { title: 'NEB 2023', notes: ['Some question text.'] };
  const r = classify(note, 'class-12-test/physics/mechanics/pyqs/01-neb.json');
  assert.equal(r.type, 'pyq');
  assert.equal(r.confidence, 1);
  assert.equal(r.needsReview, false);
});
