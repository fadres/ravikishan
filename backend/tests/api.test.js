import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { boot, resetDb, closeDb } from './helpers.js';

let app;

before(async () => {
  app = await boot();
  await resetDb();
});

after(async () => {
  await closeDb();
});

async function login(email, password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Auth flow ────────────────────────────────────────────────────────────

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('register creates a guest account and returns tokens', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'new@test.ravikishan', password: 'password123' });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'guest');
  assert.equal(res.body.user.isApproved, false);
  assert.ok(res.body.accessToken);
  assert.ok(res.body.refreshToken);
});

test('register rejects duplicate email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'new@test.ravikishan', password: 'password123' });
  assert.equal(res.status, 409);
});

test('login with wrong password is rejected', async () => {
  const res = await login('owner@test.ravikishan', 'wrong-password');
  assert.equal(res.status, 401);
});

test('login with correct credentials returns access + refresh tokens', async () => {
  const res = await login('owner@test.ravikishan', 'testpass123');
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.ok(res.body.refreshToken);
  assert.equal(res.body.user.role, 'owner');
});

test('refresh rotates the refresh token and issues a fresh access token', async () => {
  const first = await login('owner@test.ravikishan', 'testpass123');
  const refresh1 = first.body.refreshToken;

  const refreshed = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken: refresh1 });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.accessToken);
  assert.notEqual(refreshed.body.refreshToken, refresh1);

  // Reusing the old refresh token must fail (rotation).
  const replay = await request(app)
    .post('/api/auth/refresh')
    .send({ refreshToken: refresh1 });
  assert.equal(replay.status, 401);
});

test('unauthenticated /api/auth/me is rejected', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

// ── THE LOCKED-CONTENT RULE ──────────────────────────────────────────────
// A guest must never receive content fields for a locked subject — not in
// the body, not hidden anywhere in the response.

test('guest receives NO content for a locked subject — only titles', async () => {
  const res = await request(app).get('/api/subjects/physics/chapters/kinematics');
  assert.equal(res.status, 200);
  assert.equal(res.body.chapter.isLocked, true);
  assert.equal(res.body.chapter.canRead, false);
  assert.ok(res.body.blocks.length > 0);
  assert.equal(res.body.blocks[0].title, 'Secret Topic');

  const serialized = JSON.stringify(res.body);
  for (const field of ['contentRichtext', 'contentCode', 'mindmapJson', 'diagramData', 'codeLanguage']) {
    assert.equal(
      serialized.includes(field),
      false,
      `guest response leaked "${field}" for locked content`,
    );
  }
  assert.equal(serialized.includes('SUPER-SECRET-KINEMATICS-CONTENT'), false);
});

test('guest receives full content for an unlocked subject', async () => {
  const res = await request(app).get('/api/subjects/english/chapters/the-selfish-giant');
  assert.equal(res.status, 200);
  assert.equal(res.body.chapter.canRead, true);
  assert.equal(res.body.blocks[0].contentRichtext, 'This summary is free for everyone.');
});

test('member receives full content for a locked subject', async () => {
  const loginRes = await login('member@test.ravikishan', 'testpass123');
  const res = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(loginRes.body.accessToken));
  assert.equal(res.status, 200);
  assert.equal(res.body.chapter.canRead, true);
  assert.equal(res.body.blocks[0].contentRichtext, 'SUPER-SECRET-KINEMATICS-CONTENT');
});

test('search hides snippets from locked content for guests but shows titles', async () => {
  const guestRes = await request(app).get('/api/search').query({ q: 'secret kinematics' });
  assert.equal(guestRes.status, 200);
  const hit = guestRes.body.results.find((r) => r.title === 'Secret Topic');
  assert.ok(hit, 'search should surface titles of locked content');
  assert.equal(hit.locked, true);
  assert.equal(hit.snippet, null);

  const loginRes = await login('member@test.ravikishan', 'testpass123');
  const memberRes = await request(app)
    .get('/api/search')
    .query({ q: 'secret kinematics' })
    .set(authHeaders(loginRes.body.accessToken));
  const memberHit = memberRes.body.results.find((r) => r.title === 'Secret Topic');
  assert.equal(memberHit.locked, false);
  assert.ok(memberHit.snippet);
});

// ── Access requests & admin panel ────────────────────────────────────────

test('anonymous access request creates an account and a pending request', async () => {
  const res = await request(app).post('/api/access-requests').send({
    email: 'student@test.ravikishan',
    displayName: 'Kiran',
    message: 'I would like access to the Physics notes please.',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.request.status, 'pending');
  assert.equal(res.body.created, true);
  assert.ok(res.body.accessToken, 'anonymous requester should be auto-logged-in');
});

test('duplicate pending request is rejected', async () => {
  const res = await request(app).post('/api/access-requests').send({
    email: 'student@test.ravikishan',
    displayName: 'Kiran',
    message: 'I would like access to the Physics notes please.',
  });
  assert.equal(res.status, 409);
});

test('anonymous users cannot reach admin endpoints', async () => {
  const res = await request(app).get('/api/admin/requests');
  assert.equal(res.status, 401);
});

test('approving a request promotes the student to member', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');

  const pending = await request(app)
    .get('/api/admin/requests?status=pending')
    .set(authHeaders(loginRes.body.accessToken));
  const target = pending.body.requests.find((r) => r.user.email === 'student@test.ravikishan');
  assert.ok(target);

  const approve = await request(app)
    .post(`/api/admin/requests/${target.id}/approve`)
    .set(authHeaders(loginRes.body.accessToken));
  assert.equal(approve.status, 200);
  assert.equal(approve.body.request.status, 'approved');
  assert.equal(approve.body.request.user.role, 'member');
  assert.equal(approve.body.request.user.isApproved, true);
});

test('approving a request again is rejected (already resolved)', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const resolved = await request(app)
    .get('/api/admin/requests?status=approved')
    .set(authHeaders(loginRes.body.accessToken));
  const target = resolved.body.requests.find((r) => r.user.email === 'student@test.ravikishan');
  const res = await request(app)
    .post(`/api/admin/requests/${target.id}/approve`)
    .set(authHeaders(loginRes.body.accessToken));
  assert.equal(res.status, 409);
});

test('owner can toggle a subject lock; guests then see the content', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const subject = (await request(app).get('/api/subjects/physics')).body.subject;
  assert.equal(subject.isLocked, true);
  const chapter = subject.chapters.find((c) => c.slug === 'kinematics');
  assert.equal(chapter.isLocked, true);

  const toggleSubject = await request(app)
    .patch(`/api/admin/subjects/${subject.id}`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ isLocked: false });
  assert.equal(toggleSubject.status, 200);
  assert.equal(toggleSubject.body.subject.isLocked, false);

  const toggleChapter = await request(app)
    .patch(`/api/admin/chapters/${chapter.id}`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ isLocked: false });
  assert.equal(toggleChapter.status, 200);

  const guestRes = await request(app).get('/api/subjects/physics/chapters/kinematics');
  assert.equal(guestRes.body.chapter.canRead, true);
  assert.equal(guestRes.body.blocks[0].contentRichtext, 'SUPER-SECRET-KINEMATICS-CONTENT');

  // Lock it back for the other tests.
  await request(app)
    .patch(`/api/admin/subjects/${subject.id}`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ isLocked: true });
  await request(app)
    .patch(`/api/admin/chapters/${chapter.id}`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ isLocked: true });
});

test('admin can create a content block and it appears in the chapter', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );

  const created = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ blockType: 'numerical', title: 'New Numerical', contentRichtext: 'Solve this.' });
  assert.equal(created.status, 201);

  const memberRes = await login('member@test.ravikishan', 'testpass123');
  const blocks = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(memberRes.body.accessToken));
  assert.ok(blocks.body.blocks.some((b) => b.title === 'New Numerical'));
});

test('invalid block type for a subject is rejected', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );
  const res = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ blockType: 'diagram_compare', title: 'Nope' });
  assert.equal(res.status, 400);
});

// ── 4c: auto classification (classified_by) ──────────────────────────────

test('block created without a blockType is auto-classified', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );

  const res = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ title: 'Velocity', contentRichtext: 'Velocity is defined as the rate of change of displacement.' });
  assert.equal(res.status, 201);
  assert.equal(res.body.block.blockType, 'note_concept');
  assert.equal(res.body.block.classifiedBy, 'auto');
});

test('block created with an explicit type is marked manual', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );

  const res = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ blockType: 'note_important', title: 'Vectors', contentRichtext: 'Note: vectors add tip-to-tail.' });
  assert.equal(res.status, 201);
  assert.equal(res.body.block.classifiedBy, 'manual');
});

test('auto-classification is coerced to the subject allowed set', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/english')).body.subject.chapters.find(
    (c) => c.slug === 'the-selfish-giant',
  );

  const res = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ title: 'Examples', contentRichtext: 'For example, the children played in the garden.' });
  assert.equal(res.status, 201);
  assert.equal(res.body.block.blockType, 'important_points');
  assert.equal(res.body.block.classifiedBy, 'auto');
});

test('content-only edits keep auto classification; changing the type marks manual', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );

  const created = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ title: 'Motion Graphs', contentRichtext: 'A distance-time graph means the slope equals speed.' });
  assert.equal(created.body.block.classifiedBy, 'auto');
  const id = created.body.block.id;

  const contentEdit = await request(app)
    .patch(`/api/admin/blocks/${id}`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ contentRichtext: 'A distance-time graph means the slope equals speed. Updated text.' });
  assert.equal(contentEdit.status, 200);
  assert.equal(contentEdit.body.block.classifiedBy, 'auto', 'content-only edit must not change classification');

  const typeEdit = await request(app)
    .patch(`/api/admin/blocks/${id}`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ blockType: 'note_important' });
  assert.equal(typeEdit.body.block.blockType, 'note_important');
  assert.equal(typeEdit.body.block.classifiedBy, 'manual', 'explicit type change must be recorded as manual');
});

test('audit trail records who approved what', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const audit = await request(app)
    .get('/api/admin/audit')
    .set(authHeaders(loginRes.body.accessToken));
  assert.equal(audit.status, 200);
  assert.ok(audit.body.logs.some((l) => l.action === 'access.approved' && l.actorEmail === 'owner@test.ravikishan'));
});
