// Shared test bootstrap for the section backend.
// Sets the test environment BEFORE any app module loads, ensures the test
// database exists (creates it on the dev Postgres if missing), applies the
// schema, and seeds a minimal fixture.
//
// NOTE: PROGRESS_SYNC_URL is intentionally NOT set here — tests that need a
// sync target set it before dynamically importing this module (see
// progress.test.js).

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://raviki:raviki_dev_pw@localhost:5433/ravikishan_class12_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.PROGRESS_SYNC_SECRET = 'test-sync-secret';
process.env.AI_RATE_LIMIT = '500';

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import jwt from 'jsonwebtoken';

const backendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Create the test database (if missing) and apply the schema. Idempotent.
// The app modules (db.js/app.js) must NOT be imported before this runs —
// the Prisma client requires a generated client + a valid DATABASE_URL.
export async function ensureDb() {
  // Generate the client FIRST — @prisma/client refuses to construct without it.
  execSync('npx prisma generate', { cwd: backendDir, env: process.env, stdio: 'pipe' });

  const url = new URL(process.env.DATABASE_URL);
  const dbName = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0]);
  const adminUrl = new URL(process.env.DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const { PrismaClient } = await import('@prisma/client');
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    if (!/already exists/i.test(err.message)) throw err;
  } finally {
    await admin.$disconnect();
  }
  execSync('npx prisma db push', { cwd: backendDir, env: process.env, stdio: 'pipe' });

  // Now that the client is generated, load the app modules (once).
  await loadAppModules();
}

let prisma = null;
let createApp = null;

// Lazily imports the app modules (once). Must be called after ensureDb().
async function loadAppModules() {
  if (!prisma) {
    ({ prisma } = await import('../src/config/db.js'));
    ({ createApp } = await import('../src/app.js'));
  }
  return { prisma, createApp };
}

export function boot() {
  if (!createApp) throw new Error('boot() called before ensureDb() — await ensureDb() first');
  return createApp();
}

export async function getPrisma() {
  if (!prisma) throw new Error('getPrisma() called before ensureDb()');
  return prisma;
}

// Sign an access token exactly like the global auth service does (shared
// JWT_ACCESS_SECRET). Payload mirrors signAccessToken in the global backend.
export function signToken({ sub = '00000000-0000-4000-8000-000000000001', email = 'member@test.ravikishan', role = 'member', accessLevel = 2, expiresIn = '15m' } = {}) {
  return jwt.sign({ sub, email, role, accessLevel }, process.env.JWT_ACCESS_SECRET, { expiresIn });
}

// Wipe all tables, then seed a minimal fixture:
// class-12-test / Physics / demo-chapter with a free, a member and a
// premium block (+ maintained tsvector columns so search works).
export async function resetDb() {
  await prisma.$transaction([
    prisma.progressEvent.deleteMany(),
    prisma.blockCompletion.deleteMany(),
    prisma.chapterProgress.deleteMany(),
    prisma.blockTag.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.contentVersion.deleteMany(),
    prisma.contentBlock.deleteMany(),
    prisma.topic.deleteMany(),
    prisma.chapter.deleteMany(),
    prisma.customSubject.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.class.deleteMany(),
  ]);

  const klass = await prisma.class.create({
    data: { name: 'Class 12 (test)', slug: 'class-12-test', sortOrder: 1 },
  });
  const subject = await prisma.subject.create({
    data: {
      classId: klass.id,
      name: 'Physics',
      slug: 'physics',
      subjectType: 'science_math',
      isLocked: true,
      sortOrder: 1,
      status: 'published',
    },
  });
  const chapter = await prisma.chapter.create({
    data: {
      subjectId: subject.id,
      title: 'Demo Chapter',
      slug: 'demo-chapter',
      isLocked: true,
      sortOrder: 1,
      status: 'published',
      metadata: { demo: true },
    },
  });

  const blocks = [
    { blockType: 'note_topic', title: 'Free Intro', contentRichtext: 'This is a free public block about demo concepts.', accessLevel: 3, sortOrder: 0 },
    { blockType: 'note_concept', title: 'Member Concept', contentRichtext: 'MEMBER-ONLY-CONCEPT-CONTENT for approved members.', accessLevel: 2, sortOrder: 1 },
    { blockType: 'formula', title: 'Premium Formula', contentRichtext: 'v = u + at (premium content).', accessLevel: 1, sortOrder: 2 },
  ];
  for (const b of blocks) {
    await prisma.contentBlock.create({
      data: { chapterId: chapter.id, status: 'published', ...b },
    });
  }

  // Maintain tsvector columns so /api/search works against the fixture.
  await prisma.$executeRawUnsafe(`
    UPDATE "ContentBlock" SET
      search_vector_english = to_tsvector('english', coalesce(title, '') || ' ' || coalesce("contentRichtext", '')),
      search_vector_simple  = to_tsvector('simple',  coalesce(title, '') || ' ' || coalesce("contentRichtext", ''))
  `);

  return { klass, subject, chapter };
}

export async function closeDb() {
  if (prisma) await prisma.$disconnect();
}
