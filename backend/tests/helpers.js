// Shared test bootstrap.
// MUST be imported (or awaited) before the app modules so DATABASE_URL and
// secrets point at the test database before Prisma instantiates.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://raviki:raviki_dev_pw@localhost:5433/ravikishan_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
// Tests hammer /api/auth more than 20 times per window — raise the limit.
process.env.AUTH_RATE_LIMIT = '500';

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const backendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Apply migrations to the test database (idempotent).
execSync('npx prisma migrate deploy', { cwd: backendDir, env: process.env, stdio: 'pipe' });

const { prisma } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');

export async function boot() {
  return createApp();
}

// Wipe all tables, then seed a minimal fixture set.
export async function resetDb() {
  await prisma.$transaction([
    prisma.contentBlock.deleteMany(),
    prisma.chapter.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.class.deleteMany(),
    prisma.accessRequest.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('testpass123', 10);
  const owner = await prisma.user.create({
    data: {
      email: 'owner@test.ravikishan',
      passwordHash,
      displayName: 'Ravikishan Owner',
      role: 'owner',
      isApproved: true,
      accessLevel: 1,
    },
  });
  const member = await prisma.user.create({
    data: {
      email: 'member@test.ravikishan',
      passwordHash,
      displayName: 'Test Member',
      role: 'member',
      isApproved: true,
      accessLevel: 2,
    },
  });
  const guest = await prisma.user.create({
    data: {
      email: 'guest@test.ravikishan',
      passwordHash,
      displayName: 'Test Guest',
      role: 'guest',
      isApproved: false,
      accessLevel: 3,
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.ravikishan',
      passwordHash,
      displayName: 'Test Admin',
      role: 'admin',
      isApproved: true,
      accessLevel: 1,
    },
  });

  const klass = await prisma.class.create({
    data: { name: 'Class 11', slug: 'class-11', sortOrder: 1 },
  });
  const lockedSubject = await prisma.subject.create({
    data: {
      classId: klass.id,
      name: 'Physics',
      slug: 'physics',
      subjectType: 'science_math',
      isLocked: true,
      sortOrder: 1,
    },
  });
  const openSubject = await prisma.subject.create({
    data: {
      classId: klass.id,
      name: 'English',
      slug: 'english',
      subjectType: 'english',
      isLocked: false,
      sortOrder: 2,
    },
  });

  const lockedChapter = await prisma.chapter.create({
    data: {
      subjectId: lockedSubject.id,
      title: 'Kinematics',
      slug: 'kinematics',
      isLocked: true,
      sortOrder: 1,
    },
  });
  const openChapter = await prisma.chapter.create({
    data: {
      subjectId: openSubject.id,
      title: 'The Selfish Giant',
      slug: 'the-selfish-giant',
      isLocked: false,
      sortOrder: 1,
    },
  });

  // Kinematics: a free block, a premium block (level 2) and an owner-only
  // block (level 1) — the access-level ladder every gating test relies on.
  await prisma.contentBlock.create({
    data: {
      chapterId: lockedChapter.id,
      blockType: 'note_topic',
      title: 'Free Kinematics Intro',
      contentRichtext: 'Kinematics is the study of motion.',
      accessLevel: 3,
      sortOrder: 0,
    },
  });
  await prisma.contentBlock.create({
    data: {
      chapterId: lockedChapter.id,
      blockType: 'note_topic',
      title: 'Secret Topic',
      contentRichtext: 'SUPER-SECRET-KINEMATICS-CONTENT',
      accessLevel: 2,
      sortOrder: 1,
    },
  });
  await prisma.contentBlock.create({
    data: {
      chapterId: lockedChapter.id,
      blockType: 'note_topic',
      title: 'Owner Strategy Notes',
      contentRichtext: 'OWNER-ONLY-STRATEGY-CONTENT',
      accessLevel: 1,
      sortOrder: 2,
    },
  });
  await prisma.contentBlock.create({
    data: {
      chapterId: openChapter.id,
      blockType: 'summary',
      title: 'Public Summary',
      contentRichtext: 'This summary is free for everyone.',
      accessLevel: 3,
      sortOrder: 0,
    },
  });

  await prisma.accessRequest.create({
    data: {
      userId: guest.id,
      email: guest.email,
      message: 'Please let me in!',
      status: 'pending',
    },
  });

  return { owner, member, guest, admin, lockedSubject, openSubject, lockedChapter, openChapter };
}

export async function closeDb() {
  await prisma.$disconnect();
}
