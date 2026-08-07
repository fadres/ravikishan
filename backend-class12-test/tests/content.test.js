// Content serving + per-block degradation, gated by the accessLevel carried
// in the shared-JWT payload (the section service never asks a database who
// the viewer is).

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { ensureDb, boot, resetDb, signToken, closeDb } from './helpers.js';

let app;

before(async () => {
  await ensureDb();
  await resetDb();
  app = boot();
});

after(async () => {
  await closeDb();
});

test('GET /api/classes lists the section structure (no secrets)', async () => {
  const res = await request(app).get('/api/classes');
  assert.equal(res.status, 200);
  assert.equal(res.body.classes.length, 1);
  assert.equal(res.body.classes[0].slug, 'class-12');
  const subject = res.body.classes[0].subjects[0];
  assert.equal(subject.slug, 'physics');
  assert.equal(subject._count.chapters, 1);
});

test('unknown class returns 404', async () => {
  const res = await request(app).get('/api/classes/class-99');
  assert.equal(res.status, 404);
});

test('chapter endpoint hides out-of-tier block content', async () => {
  const memberToken = signToken({ role: 'member', accessLevel: 2 });

  const res = await request(app)
    .get('/api/subjects/physics/chapters/demo-chapter')
    .set('Authorization', `Bearer ${memberToken}`);

  assert.equal(res.status, 200);
  const blocks = res.body.blocks;
  const free = blocks.find((b) => b.title === 'Free Intro');
  const member = blocks.find((b) => b.title === 'Member Concept');
  const premium = blocks.find((b) => b.title === 'Premium Formula');

  assert.ok(free.contentRichtext, 'free block content is visible');
  assert.ok(member.contentRichtext, 'member-level block content is visible');
  // Level 2 may see the section slot but never the premium block content.
  assert.equal(premium.contentRichtext, undefined, 'premium content must be hidden');
  assert.equal(premium.accessLevel, 1);
});

test('premium viewer (level 1) sees everything', async () => {
  const premiumToken = signToken({ role: 'owner', accessLevel: 1 });
  const res = await request(app)
    .get('/api/subjects/physics/chapters/demo-chapter')
    .set('Authorization', `Bearer ${premiumToken}`);
  assert.equal(res.status, 200);
  const premium = res.body.blocks.find((b) => b.title === 'Premium Formula');
  assert.ok(premium.contentRichtext, 'premium content is visible to level 1');
});

test('anonymous viewer sees only public content (degradation)', async () => {
  const res = await request(app).get('/api/subjects/physics/chapters/demo-chapter');
  assert.equal(res.status, 200);
  const blocks = res.body.blocks;
  const free = blocks.find((b) => b.title === 'Free Intro');
  const member = blocks.find((b) => b.title === 'Member Concept');
  assert.ok(free.contentRichtext, 'public block content is visible');
  assert.equal(member.contentRichtext, undefined, 'member content must be hidden from anonymous');
  assert.equal(res.body.chapter.viewerAccessLevel, 4);
});

test('GET /api/search searches this section and tags results with the section id', async () => {
  const token = signToken({ role: 'owner', accessLevel: 1 });
  const res = await request(app)
    .get('/api/search')
    .query({ q: 'concept' })
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.results.length > 0, 'expected at least one search result');
  const hit = res.body.results.find((r) => r.kind === 'block');
  assert.ok(hit, 'expected a block result');
  assert.equal(hit.sectionId, 'class-12-test');
});
