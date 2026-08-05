import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, getSection, requireSection, activeSections } from '../src/lib/sections.config.js';

// ── Registry contents (the seam of the multi-section architecture) ────────
// Env-dependent behaviour (dbUrl resolution, per-section Prisma clients)
// lives in tests/section-clients.test.js — this file must stay free of
// static imports whose evaluation depends on process.env.

test('registry declares exactly one section today: class-11 (active)', () => {
  assert.equal(sections.length, 1);
  const c11 = sections[0];
  assert.equal(c11.id, 'class-11');
  assert.equal(c11.label, 'Class 11');
  assert.equal(c11.classSlug, 'class-11');
  assert.equal(c11.status, 'active');
  assert.ok(c11.aiEndpoint !== undefined, 'aiEndpoint must default to the shared AI_ENDPOINT');
});

test('getSection finds registered ids and returns null for others', () => {
  assert.equal(getSection('class-11').id, 'class-11');
  assert.equal(getSection('class-12-test'), null);
  assert.equal(getSection(''), null);
});

test('requireSection throws UNKNOWN_SECTION for unregistered ids — never falls back to Class 11', () => {
  assert.throws(() => requireSection('class-12-test'), { code: 'UNKNOWN_SECTION' });
  assert.throws(() => requireSection(''), { code: 'UNKNOWN_SECTION' });
  assert.doesNotThrow(() => requireSection('class-11'));
});

test('activeSections only includes status=active sections', () => {
  assert.deepEqual(activeSections().map((s) => s.id), ['class-11']);
});
