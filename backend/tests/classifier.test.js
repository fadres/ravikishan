import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyContent, suggestForSubject } from '../src/services/classifier.js';

// ── classifyContent: rule priority important > example > concept > topic ──

test('important marker at the start wins over other signals', () => {
  const r = classifyContent({ content: 'Note: this formula is central, for example in unit conversion.' });
  assert.equal(r.blockType, 'note_important');
  assert.match(r.reason, /important/i);
});

test('warning symbol is treated as important', () => {
  const r = classifyContent({ content: '⚠ Remember to include units in every answer.' });
  assert.equal(r.blockType, 'note_important');
});

test('example signals map to note_example', () => {
  for (const signal of ['e.g. v = u + at', 'For example, water boils at 100°C.', 'such as friction and gravity', 'for instance, a falling ball']) {
    assert.equal(classifyContent({ content: signal }).blockType, 'note_example', `signal: ${signal}`);
  }
});

test('definition phrasing maps to note_concept', () => {
  for (const text of [
    'Velocity is defined as the rate of change of displacement.',
    'Acceleration refers to the change in velocity per unit time.',
    'A force means any push or pull on an object.',
  ]) {
    assert.equal(classifyContent({ content: text }).blockType, 'note_concept', `text: ${text}`);
  }
});

test('short title-like text without punctuation maps to note_topic', () => {
  assert.equal(classifyContent({ title: 'Kinematics', content: '' }).blockType, 'note_topic');
  assert.equal(classifyContent({ title: 'The Selfish Giant' }).blockType, 'note_topic');
});

test('long declarative sentences with no signals fall back to note_statement', () => {
  const r = classifyContent({
    content: 'The acceleration due to gravity acts downward on all falling bodies near the surface.',
  });
  assert.equal(r.blockType, 'note_statement');
});

test('punctuated or comma-heavy short text is not treated as a topic', () => {
  assert.equal(classifyContent({ title: 'Physics, Chemistry.' }).blockType, 'note_statement');
});

test('empty input falls back to note_statement', () => {
  assert.equal(classifyContent({}).blockType, 'note_statement');
});

// ── suggestForSubject: coercion to the subject allowed set ───────────────

test('suggestion is kept when the subject allows the type', () => {
  const r = suggestForSubject('science_math', '', 'For example, v = u + at.');
  assert.equal(r.blockType, 'note_example');
  assert.equal(r.coerced, false);
});

test('suggestion is coerced when the subject does not allow the type', () => {
  const r = suggestForSubject('english', 'Kinematics', '');
  assert.equal(r.blockType, 'important_points');
  assert.equal(r.coerced, true);
});

test('nepali always coerces to byakaran', () => {
  const r = suggestForSubject('nepali', '', 'Something entirely different.');
  assert.equal(r.blockType, 'byakaran');
  assert.equal(r.coerced, true);
});

test('biology keeps concept suggestions', () => {
  const r = suggestForSubject('biology', '', 'A cell is defined as the basic unit of life.');
  assert.equal(r.blockType, 'note_concept');
  assert.equal(r.coerced, false);
});
