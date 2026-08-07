// Auth is payload-only: identity comes from the shared-JWT verification,
// never from a database lookup (this service has no user table). These
// tests prove: valid token → authenticated; expired token → rejected
// locally; wrong-secret token → rejected locally.

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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

test('valid shared-JWT token is accepted without any DB user lookup', async () => {
  const token = signToken({ role: 'member', accessLevel: 2 });
  const res = await request(app)
    .get('/api/progress/outbox')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { pending: 0, failed: 0 });
});

test('expired token is rejected locally (401)', async () => {
  const expired = signToken({ expiresIn: '-1s' });
  const res = await request(app)
    .get('/api/progress/outbox')
    .set('Authorization', `Bearer ${expired}`);
  assert.equal(res.status, 401);
});

test('token signed with a different secret is rejected locally (401)', async () => {
  const forged = jwt.sign(
    { sub: '00000000-0000-4000-8000-000000000099', role: 'owner', accessLevel: 1 },
    'some-other-secret-value',
    { expiresIn: '15m' },
  );
  const res = await request(app)
    .get('/api/progress/outbox')
    .set('Authorization', `Bearer ${forged}`);
  assert.equal(res.status, 401);
});

test('garbage token is rejected locally (401)', async () => {
  const res = await request(app)
    .get('/api/progress/outbox')
    .set('Authorization', 'Bearer not.a.jwt');
  assert.equal(res.status, 401);
});

test('no token → anonymous (401 on protected routes, 200 on public)', async () => {
  const protectedRes = await request(app).get('/api/progress/outbox');
  assert.equal(protectedRes.status, 401);

  const publicRes = await request(app).get('/api/sections');
  assert.equal(publicRes.status, 200);
  assert.equal(publicRes.body.sections[0].id, 'class-12-test');
});
