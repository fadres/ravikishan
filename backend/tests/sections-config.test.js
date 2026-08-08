import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, getSection, requireSection, activeSections } from '../src/lib/sections.config.js';

// ── Registry contents (the seam of the multi-section architecture) ────────
// Env-dependent behaviour (dbUrl resolution, per-section Prisma clients)
// lives in tests/section-clients.test.js — this file must stay free of
// static imports whose evaluation depends on process.env.

test('registry declares the three live sections: class-11 + class-11e (local) + class-12-test (independent service)', () => {
  assert.equal(sections.length, 3);
  const [c11, c11e, c12] = sections;
  assert.equal(c11.id, 'class-11');
  assert.equal(c11.label, 'Class 11');
  assert.equal(c11.classSlug, 'class-11');
  assert.equal(c11.status, 'active');
  assert.ok(c11.aiEndpoint !== undefined, 'aiEndpoint must default to the shared AI_ENDPOINT');
  assert.equal(c11e.id, 'class-11e');
  assert.equal(c11e.label, 'Class 11E');
  assert.equal(c11e.classSlug, 'class-11e');
  assert.equal(c11e.status, 'active');
  assert.equal(c12.id, 'class-12-test');
  assert.equal(c12.status, 'active');
});

test('getSection finds registered ids and returns null for others', () => {
  assert.equal(getSection('class-11').id, 'class-11');
  assert.equal(getSection('class-11e').id, 'class-11e');
  assert.equal(getSection('class-12-test').id, 'class-12-test');
  assert.equal(getSection('class-12'), null, 'only class-12-test is registered, never class-12');
  assert.equal(getSection(''), null);
});

test('requireSection throws UNKNOWN_SECTION for unregistered ids — never falls back to Class 11', () => {
  assert.throws(() => requireSection('class-12'), { code: 'UNKNOWN_SECTION' });
  assert.throws(() => requireSection(''), { code: 'UNKNOWN_SECTION' });
  assert.doesNotThrow(() => requireSection('class-11'));
  assert.doesNotThrow(() => requireSection('class-11e'));
  assert.doesNotThrow(() => requireSection('class-12-test'));
});

test('activeSections only includes status=active sections', () => {
  assert.deepEqual(activeSections().map((s) => s.id), ['class-11', 'class-11e', 'class-12-test']);
});
