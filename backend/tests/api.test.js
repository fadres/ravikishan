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
  assert.equal(res.body.user.accessLevel, 3);
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

// ── ACCESS LEVELS ─────────────────────────────────────────────────────────
// Per-block tiers: 1 = most premium, 2 = approved members, 3 = free. A block
// is readable when block.accessLevel >= viewer.accessLevel. Content fields of
// higher tiers must never leave the server — not hidden anywhere in the body.

test('guest sees titles of premium blocks but never their content', async () => {
  const loginRes = await login('guest@test.ravikishan', 'testpass123');
  assert.equal(loginRes.body.user.accessLevel, 3);
  const res = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(loginRes.body.accessToken));
  assert.equal(res.status, 200);
  assert.equal(res.body.chapter.canRead, true);
  assert.equal(res.body.chapter.viewerAccessLevel, 3);

  const free = res.body.blocks.find((b) => b.title === 'Free Kinematics Intro');
  assert.equal(free.contentRichtext, 'Kinematics is the study of motion.');

  const secret = res.body.blocks.find((b) => b.title === 'Secret Topic');
  assert.ok(secret, 'premium block titles are still visible to guests');
  assert.equal(secret.accessLevel, 2);
  assert.equal(secret.contentRichtext, undefined);

  const ownerOnly = res.body.blocks.find((b) => b.title === 'Owner Strategy Notes');
  assert.equal(ownerOnly.accessLevel, 1);
  assert.equal(ownerOnly.contentRichtext, undefined);

  // Gated blocks must not smuggle content fields anywhere in their JSON.
  for (const gated of [secret, ownerOnly]) {
    const serialized = JSON.stringify(gated);
    for (const field of ['contentRichtext', 'contentCode', 'mindmapJson', 'diagramData', 'codeLanguage']) {
      assert.equal(
        serialized.includes(field),
        false,
        `gated block leaked "${field}"`,
      );
    }
  }

  // And the actual secret content never appears anywhere in the response.
  const serialized = JSON.stringify(res.body);
  assert.equal(serialized.includes('SUPER-SECRET-KINEMATICS-CONTENT'), false);
  assert.equal(serialized.includes('OWNER-ONLY-STRATEGY-CONTENT'), false);
});

test('member (level 2) reads premium blocks but not owner-only ones', async () => {
  const loginRes = await login('member@test.ravikishan', 'testpass123');
  assert.equal(loginRes.body.user.accessLevel, 2);
  const res = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(loginRes.body.accessToken));
  const secret = res.body.blocks.find((b) => b.title === 'Secret Topic');
  assert.equal(secret.contentRichtext, 'SUPER-SECRET-KINEMATICS-CONTENT');
  const ownerOnly = res.body.blocks.find((b) => b.title === 'Owner Strategy Notes');
  assert.equal(ownerOnly.accessLevel, 1);
  assert.equal(ownerOnly.contentRichtext, undefined);
});

test('owner (level 1) reads every block', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  assert.equal(loginRes.body.user.accessLevel, 1);
  const res = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(loginRes.body.accessToken));
  const ownerOnly = res.body.blocks.find((b) => b.title === 'Owner Strategy Notes');
  assert.equal(ownerOnly.contentRichtext, 'OWNER-ONLY-STRATEGY-CONTENT');
});

test('registered but unapproved guest stays at level 3', async () => {
  const loginRes = await login('guest@test.ravikishan', 'testpass123');
  assert.equal(loginRes.body.user.accessLevel, 3);
  const res = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(loginRes.body.accessToken));
  const secret = res.body.blocks.find((b) => b.title === 'Secret Topic');
  assert.equal(secret.contentRichtext, undefined);
});

test('chapter blocks are arranged free (3) → members (2) → premium (1)', async () => {
  const res = await request(app).get('/api/subjects/physics/chapters/kinematics');
  const levels = res.body.blocks.map((b) => b.accessLevel);
  assert.deepEqual(levels, [...levels].sort((a, b) => b - a), 'blocks must be ordered by level desc');
  assert.equal(res.body.blocks[0].accessLevel, 3, 'free blocks come first');
  assert.equal(res.body.blocks[res.body.blocks.length - 1].accessLevel, 1, 'premium blocks come last');
});

test('search hides snippets for premium tiers but keeps titles', async () => {
  const guestRes = await request(app).get('/api/search').query({ q: 'secret' });
  assert.equal(guestRes.status, 200);
  const secret = guestRes.body.results.find((r) => r.title === 'Secret Topic');
  assert.ok(secret, 'search must surface premium titles');
  assert.equal(secret.accessLevel, 2);
  assert.equal(secret.locked, true);
  assert.equal(secret.snippet, null);

  const memberRes = await request(app)
    .get('/api/search')
    .query({ q: 'secret' })
    .set(authHeaders((await login('member@test.ravikishan', 'testpass123')).body.accessToken));
  const memberHit = memberRes.body.results.find((r) => r.title === 'Secret Topic');
  assert.equal(memberHit.locked, false);
  assert.ok(memberHit.snippet);

  const ownerRes = await request(app)
    .get('/api/search')
    .query({ q: 'strategy' })
    .set(authHeaders((await login('owner@test.ravikishan', 'testpass123')).body.accessToken));
  const ownerHit = ownerRes.body.results.find((r) => r.title === 'Owner Strategy Notes');
  assert.equal(ownerHit.locked, false);
  assert.ok(ownerHit.snippet);
});

test('recommendations never include blocks above the viewer level', async () => {
  const guestRes = await request(app).get('/api/search').query({ q: 'zzzz-no-match' });
  assert.ok(guestRes.body.recommendations.every((r) => r.accessLevel <= 3));
  assert.ok(
    guestRes.body.recommendations.every((r) => r.accessLevel <= 3),
    'guests must only be recommended readable blocks',
  );
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
  assert.equal(approve.body.request.user.accessLevel, 2);
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

test('owner can create a block at any access level and it is gated per tier', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );

  const created = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ blockType: 'numerical', title: 'Premium Numerical', contentRichtext: 'Solve this.', accessLevel: 2 });
  assert.equal(created.status, 201);
  assert.equal(created.body.block.accessLevel, 2);

  const memberRes = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders((await login('member@test.ravikishan', 'testpass123')).body.accessToken));
  assert.equal(
    memberRes.body.blocks.find((b) => b.title === 'Premium Numerical').contentRichtext,
    'Solve this.',
  );

  const guestRes = await request(app).get('/api/subjects/physics/chapters/kinematics');
  const gated = guestRes.body.blocks.find((b) => b.title === 'Premium Numerical');
  assert.equal(gated.accessLevel, 2);
  assert.equal(gated.contentRichtext, undefined);
});

test('blocks created without a level default to level 3 (free)', async () => {
  const loginRes = await login('owner@test.ravikishan', 'testpass123');
  const chapter = (await request(app).get('/api/subjects/physics')).body.subject.chapters.find(
    (c) => c.slug === 'kinematics',
  );
  const created = await request(app)
    .post(`/api/admin/chapters/${chapter.id}/blocks`)
    .set(authHeaders(loginRes.body.accessToken))
    .send({ blockType: 'note_topic', title: 'Freebie', contentRichtext: 'Free for all.' });
  assert.equal(created.body.block.accessLevel, 3);
});

test('admin can change a user to level 2 or 3 but cannot grant level 1', async () => {
  const adminLogin = await login('admin@test.ravikishan', 'testpass123');
  const target = (await login('guest@test.ravikishan', 'testpass123')).body.user;

  const grantTwo = await request(app)
    .patch(`/api/admin/users/${target.id}`)
    .set(authHeaders(adminLogin.body.accessToken))
    .send({ accessLevel: 2 });
  assert.equal(grantTwo.status, 200);
  assert.equal(grantTwo.body.user.accessLevel, 2);

  const grantOne = await request(app)
    .patch(`/api/admin/users/${target.id}`)
    .set(authHeaders(adminLogin.body.accessToken))
    .send({ accessLevel: 1 });
  assert.equal(grantOne.status, 403);
});

test('only the owner can grant level 1, and it takes effect immediately (no re-login)', async () => {
  const ownerLogin = await login('owner@test.ravikishan', 'testpass123');
  const guestLogin = await login('guest@test.ravikishan', 'testpass123');
  const target = guestLogin.body.user;

  const grantOne = await request(app)
    .patch(`/api/admin/users/${target.id}`)
    .set(authHeaders(ownerLogin.body.accessToken))
    .send({ accessLevel: 1 });
  assert.equal(grantOne.status, 200);
  assert.equal(grantOne.body.user.accessLevel, 1);

  // The guest's existing token must pick up the new level from the DB.
  const immediate = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(guestLogin.body.accessToken));
  const strategy = immediate.body.blocks.find((b) => b.title === 'Owner Strategy Notes');
  assert.equal(strategy.contentRichtext, 'OWNER-ONLY-STRATEGY-CONTENT');

  const upgraded = await login('guest@test.ravikishan', 'testpass123');
  assert.equal(upgraded.body.user.accessLevel, 1);

  const ownerOnly = await request(app)
    .get('/api/subjects/physics/chapters/kinematics')
    .set(authHeaders(upgraded.body.accessToken));
  const strategy2 = ownerOnly.body.blocks.find((b) => b.title === 'Owner Strategy Notes');
  assert.equal(strategy2.contentRichtext, 'OWNER-ONLY-STRATEGY-CONTENT');

  // restore guest level for the other tests
  await request(app)
    .patch(`/api/admin/users/${target.id}`)
    .set(authHeaders(ownerLogin.body.accessToken))
    .send({ accessLevel: 3 });
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
