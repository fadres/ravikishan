// Env-dependent registry/client tests. This file has NO static imports of
// app modules: everything is loaded via cache-busted dynamic imports AFTER
// the test environment is set, so module-load-time env reads stay truthful.
// (A static import would evaluate sections.config.js with a bare process.env
// and poison the module cache for db.js's internal import.)

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test';

import test from 'node:test';
import assert from 'node:assert/strict';

test('prismaForSection returns the same cached client per section', async () => {
  const { prismaForSection, prisma } = await import('../src/config/db.js?section-clients=1');
  const a = prismaForSection('class-11');
  const b = prismaForSection('class-11');
  assert.equal(a, b, 'clients are cached per section');
  assert.notEqual(a, prisma, 'section clients are distinct from the global client');
  await a.$disconnect();
  await prisma.$disconnect();
});

test('prismaForSection fails fast for unknown sections — no client is ever created', async () => {
  const { prismaForSection } = await import('../src/config/db.js?section-clients=2');
  assert.throws(() => prismaForSection('class-12-test'), { code: 'UNKNOWN_SECTION' });
  assert.throws(() => prismaForSection(''), { code: 'UNKNOWN_SECTION' });
});

test('searchWithinSection fails fast for unknown sections — no search is ever run', async () => {
  const { searchWithinSection } = await import('../src/services/search.js?section-search=1');
  await assert.rejects(() => searchWithinSection('class-12-test', 'kinematics', 4, {}), { code: 'UNKNOWN_SECTION' });
  await assert.rejects(() => searchWithinSection('', 'kinematics', 4, {}), { code: 'UNKNOWN_SECTION' });
});

test('askSection fails fast for unknown sections — no AI request is ever made', async () => {
  const { askSection } = await import('../src/services/ai.js?section-ai=1');
  await assert.rejects(() => askSection('user-1', 'class-12-test', { question: 'What is kinematics?' }), { code: 'UNKNOWN_SECTION' });
  await assert.rejects(() => askSection('user-1', '', { question: 'What is kinematics?' }), { code: 'UNKNOWN_SECTION' });
});

test('searchAcrossSections tolerates a failing section without a failing search', async () => {
  // Simulate a section whose DB is unreachable: the merged result must
  // still return, with the section listed in `failed`.
  const { searchAcrossSections } = await import('../src/services/search.js?fanout=1');
  // No query suffix here: the search chain imports db.js without one, so
  // this resolves to the SAME module instance (and client cache) it uses.
  const { prismaForSection } = await import('../src/config/db.js');
  const realClient = prismaForSection('class-11');
  const original = realClient.$queryRaw.bind(realClient);
  realClient.$queryRaw = async () => {
    throw new Error('connection refused (simulated)');
  };
  try {
    const out = await searchAcrossSections('kinematics', 4, {});
    assert.ok(Array.isArray(out.failed), 'failures are surfaced, not thrown');
    assert.ok(
      out.failed.length > 0 && out.failed[0].sectionId === 'class-11',
      'the broken section is reported in failed',
    );
  } finally {
    realClient.$queryRaw = original;
    await realClient.$disconnect();
  }
});

test('registry resolves NEON_CLASS11_URL when set, else falls back to DATABASE_URL', async () => {
  const prevNeon = process.env.NEON_CLASS11_URL;
  const prevDb = process.env.DATABASE_URL;
  try {
    process.env.NEON_CLASS11_URL = 'postgresql://neon-explicit';
    process.env.DATABASE_URL = 'postgresql://db-fallback';
    const m1 = await import('../src/lib/sections.config.js?env=neon');
    assert.equal(m1.sections[0].dbUrl, 'postgresql://neon-explicit');

    delete process.env.NEON_CLASS11_URL;
    process.env.DATABASE_URL = 'postgresql://db-fallback';
    const m2 = await import('../src/lib/sections.config.js?env=fallback');
    assert.equal(m2.sections[0].dbUrl, 'postgresql://db-fallback');
  } finally {
    if (prevNeon === undefined) delete process.env.NEON_CLASS11_URL;
    else process.env.NEON_CLASS11_URL = prevNeon;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
  }
});
