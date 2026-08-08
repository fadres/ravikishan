// Registry endpoints need no DB fixtures — boot the app directly (no
// helpers.js) so this file never races api.test.js's migrate/resetDb on the
// shared test database. Env must be set before the app modules load.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://raviki:raviki_dev_pw@localhost:5433/ravikishan_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

let app;

before(async () => {
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

after(async () => {
  const { prisma } = await import('../src/config/db.js');
  await prisma.$disconnect();
});

test('GET /api/sections lists the active section registry (no secrets leaked)', async () => {
  const res = await request(app).get('/api/sections');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.sections));
  assert.deepEqual(res.body.sections.map((s) => s.id), ['class-11', 'class-11e', 'class-12-test']);
  for (const s of res.body.sections) {
    assert.equal(s.status, 'active');
    assert.ok(!('dbUrl' in s), 'dbUrl must never be exposed');
    assert.ok(!('aiEndpoint' in s), 'aiEndpoint must never be exposed');
  }
  const c11 = res.body.sections[0];
  assert.equal(c11.label, 'Class 11');
  assert.equal(c11.backendUrl, null, 'local sections expose no backendUrl');
  const c11e = res.body.sections[1];
  assert.equal(c11e.label, 'Class 11E');
  assert.equal(c11e.classSlug, 'class-11e');
  assert.equal(c11e.backendUrl, null, 'local sections expose no backendUrl');
  const c12 = res.body.sections[2];
  assert.equal(c12.label, 'Class 12');
  assert.equal(c12.classSlug, 'class-12');
});

test('GET /api/sections/class-11 returns the section identity', async () => {
  const res = await request(app).get('/api/sections/class-11');
  assert.equal(res.status, 200);
  assert.equal(res.body.section.id, 'class-11');
  assert.equal(res.body.section.classSlug, 'class-11');
});

test('GET /api/sections/class-12-test returns the independent section identity', async () => {
  const res = await request(app).get('/api/sections/class-12-test');
  assert.equal(res.status, 200);
  assert.equal(res.body.section.id, 'class-12-test');
  assert.equal(res.body.section.classSlug, 'class-12');
});

test('GET /api/sections/<unknown> returns 404 (fail-fast, no fallback)', async () => {
  const res = await request(app).get('/api/sections/class-12');
  assert.equal(res.status, 404);
  const res2 = await request(app).get('/api/sections/class-13');
  assert.equal(res2.status, 404);
});
