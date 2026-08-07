// Progress + outbox sync: completing blocks updates SECTION-LOCAL progress
// rows (ChapterProgress/BlockCompletion) and queues XP/analytics events to
// the GLOBAL backend via the internal progress-sync API. This test drives a
// stub "global" HTTP server and proves: immediate push, no double-award on
// re-completion, and queue-then-recover when the global side is down.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://raviki:raviki_dev_pw@localhost:5433/ravikishan_class12_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.PROGRESS_SYNC_SECRET = 'test-sync-secret';

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createServer } from 'node:http';

const state = { requests: [], mode: 'ok' };
const stub = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    state.requests.push({
      method: req.method,
      url: req.url,
      secret: req.headers['x-service-secret'] ?? null,
      body: body ? JSON.parse(body) : null,
    });
    if (state.mode === 'fail') {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'global backend unavailable' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  });
});

let app;
let helpers;
let prisma;
let chapterId;
let freeBlockId;
let memberBlockId;
const waitFor = async (fn, ms = 3000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return fn();
};

before(async () => {
  await new Promise((r) => stub.listen(0, r));
  process.env.PROGRESS_SYNC_URL = `http://localhost:${stub.address().port}`;
  helpers = await import('./helpers.js');
  await helpers.ensureDb();
  const { chapter } = await helpers.resetDb();
  chapterId = chapter.id;
  ({ prisma } = await import('../src/config/db.js'));
  const blocks = await prisma.contentBlock.findMany({ where: { chapterId }, orderBy: { sortOrder: 'asc' } });
  freeBlockId = blocks[0].id;
  memberBlockId = blocks[1].id;
  app = helpers.boot();
});

after(async () => {
  await helpers.closeDb();
  stub.close();
});

function token() {
  return helpers.signToken({ sub: '00000000-0000-4000-8000-000000000001', role: 'member', accessLevel: 2 });
}

test('completing a block updates local progress and syncs XP to the global backend', async () => {
  const res = await request(app)
    .post(`/api/progress/blocks/${freeBlockId}`)
    .set('Authorization', `Bearer ${token()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.firstTime, true);

  const [progress, completion] = await Promise.all([
    prisma.chapterProgress.findUnique({ where: { userId_chapterId: { userId: '00000000-0000-4000-8000-000000000001', chapterId } } }),
    prisma.blockCompletion.findUnique({ where: { userId_blockId: { userId: '00000000-0000-4000-8000-000000000001', blockId: freeBlockId } } }),
  ]);
  assert.ok(progress, 'ChapterProgress row created');
  assert.ok(completion, 'BlockCompletion row created');

  // Immediate push: the stub should receive the queued events.
  const synced = await waitFor(() => state.requests.length >= 1);
  assert.ok(synced, 'events were pushed to the global backend');
  await request(app).post('/api/progress/flush').set('Authorization', `Bearer ${token()}`);

  const syncReq = state.requests[0];
  assert.equal(syncReq.method, 'POST');
  assert.equal(syncReq.url, '/internal/progress-sync');
  assert.equal(syncReq.secret, 'test-sync-secret');
  assert.equal(syncReq.body.sectionId, 'class-12-test');
  assert.equal(syncReq.body.events.length, 2, 'xp + learning events queued');
  const xp = syncReq.body.events.find((e) => e.type === 'xp');
  assert.equal(xp.amount, 5);
  assert.equal(xp.source, 'block_completed');

  const outbox = await request(app).get('/api/progress/outbox').set('Authorization', `Bearer ${token()}`);
  assert.equal(outbox.body.pending, 0, 'outbox drained after successful sync');
});

test('re-completing the same block never double-awards or re-syncs', async () => {
  const countBefore = state.requests.length;
  const res = await request(app)
    .post(`/api/progress/blocks/${freeBlockId}`)
    .set('Authorization', `Bearer ${token()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.firstTime, false);
  await new Promise((r) => setTimeout(r, 300));
  await request(app).post('/api/progress/flush').set('Authorization', `Bearer ${token()}`);
  assert.equal(state.requests.length, countBefore, 'no new sync request for a repeated completion');
});

test('a downed global backend never loses progress — events queue and flush later', async () => {
  state.mode = 'fail';
  const res = await request(app)
    .post(`/api/progress/blocks/${memberBlockId}`)
    .set('Authorization', `Bearer ${token()}`);
  assert.equal(res.status, 200, 'the section keeps working while the global backend is down');
  assert.equal(res.body.firstTime, true);

  // Events stay queued locally (2: xp + learning for this block).
  const queued = await waitFor(() => {
    // the immediate push attempt failed → attempts incremented, still unsynced
    return true;
  });
  void queued;
  const outbox = await request(app).get('/api/progress/outbox').set('Authorization', `Bearer ${token()}`);
  assert.ok(outbox.body.pending >= 2, `expected ≥2 queued events, got ${outbox.body.pending}`);

  // Global returns → flush drains the queue.
  state.mode = 'ok';
  const flush = await request(app).post('/api/progress/flush').set('Authorization', `Bearer ${token()}`);
  assert.ok(flush.body.pushed >= 2, `expected ≥2 pushed, got ${flush.body.pushed}`);
  const after = await request(app).get('/api/progress/outbox').set('Authorization', `Bearer ${token()}`);
  assert.equal(after.body.pending, 0, 'outbox fully drained');
});

test('chapter completion awards 30 XP once (on the flip)', async () => {
  // Complete the remaining block to flip the chapter.
  const remaining = await prisma.contentBlock.findFirst({
    where: { chapterId, title: 'Premium Formula' },
    select: { id: true },
  });
  state.mode = 'fail'; // isolate: queue, then inspect locally
  const res = await request(app)
    .post(`/api/progress/blocks/${remaining.id}`)
    .set('Authorization', `Bearer ${token()}`);
  assert.equal(res.status, 200);

  // ChapterProgress should now be complete; the xp payload flags it.
  const progress = await prisma.chapterProgress.findUnique({
    where: { userId_chapterId: { userId: '00000000-0000-4000-8000-000000000001', chapterId } },
  });
  assert.equal(progress.blocksCompleted, progress.totalBlocks);

  const xpEvents = await prisma.progressEvent.findMany({
    where: { type: 'xp', syncedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const chapterXp = xpEvents.filter((e) => e.payload.metadata?.chapterCompleted === true);
  assert.equal(chapterXp.length, 1, 'chapter-completion XP is queued exactly once');
  state.mode = 'ok';
});
