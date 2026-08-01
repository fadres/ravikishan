import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { recordAudit } from './audit.js';

// ── UserProgress ────────────────────────────────────

export async function getProgress(userId, chapterId) {
  const progress = await prisma.userProgress.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
    include: { chapter: { select: { id: true, title: true, slug: true, subject: { select: { name: true } } } } },
  });
  return progress;
}

export async function listUserProgress(userId) {
  const progress = await prisma.userProgress.findMany({
    where: { userId },
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          slug: true,
          subject: { select: { name: true, slug: true } },
          blocks: { select: { id: true } },
        },
      },
    },
    orderBy: { lastAccessedAt: 'desc' },
  });
  return progress;
}

export async function updateProgress(userId, chapterId, data) {
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const totalBlocks = await prisma.contentBlock.count({ where: { chapterId } });

  const progress = await prisma.userProgress.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    create: {
      userId,
      chapterId,
      blocksCompleted: data.blocksCompleted ?? 0,
      totalBlocks,
      lastBlockId: data.lastBlockId ?? null,
      lastAccessedAt: new Date(),
      completedAt: data.completed ? new Date() : null,
    },
    update: {
      blocksCompleted: data.blocksCompleted ?? undefined,
      totalBlocks,
      lastBlockId: data.lastBlockId ?? undefined,
      lastAccessedAt: new Date(),
      completedAt: data.completed ? new Date() : undefined,
    },
    include: { chapter: { select: { id: true, title: true, slug: true } } },
  });
  return progress;
}

export async function completeBlock(userId, chapterId, blockId) {
  const progress = await prisma.userProgress.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    create: {
      userId,
      chapterId,
      blocksCompleted: 1,
      totalBlocks: 1,
      lastBlockId: blockId,
      lastAccessedAt: new Date(),
      completedAt: null,
    },
    update: {
      blocksCompleted: { increment: 1 },
      totalBlocks: { increment: 1 },
      lastBlockId: blockId,
      lastAccessedAt: new Date(),
    },
    include: { chapter: { select: { id: true, title: true, slug: true } } },
  });
  return progress;
}

// ── Bookmarks ──────────────────────────────────────

export async function listBookmarks(userId) {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      chapter: { select: { id: true, title: true, slug: true, subject: { select: { name: true } } } },
      block: { select: { id: true, title: true, blockType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return bookmarks;
}

export async function createBookmark(userId, chapterId, blockId, label) {
  const bookmark = await prisma.bookmark.upsert({
    where: { userId_chapterId_blockId: { userId, chapterId, blockId: blockId ?? '' } },
    create: { userId, chapterId, blockId: blockId ?? null, label: label ?? null },
    update: { label: label ?? undefined },
    include: { chapter: { select: { id: true, title: true, slug: true } } },
  });
  return bookmark;
}

export async function deleteBookmark(userId, chapterId, blockId) {
  await prisma.bookmark.deleteMany({
    where: { userId, chapterId, blockId: blockId ?? null },
  });
  return { ok: true };
}

// ── Study Streak ────────────────────────────────────

export async function getStreak(userId) {
  let streak = await prisma.studyStreak.findUnique({ where: { userId } });
  if (!streak) {
    streak = await prisma.studyStreak.create({
      data: { userId, streak: 1, lastDate: new Date(), longestStreak: 1 },
    });
  }
  return streak;
}

export async function updateStreak(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.studyStreak.upsert({
    where: { userId },
    create: { userId, streak: 1, lastDate: today, longestStreak: 1 },
    update: {},
  });

  const lastDate = new Date(streak.lastDate);
  lastDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

  let newStreak = streak.streak;
  if (diffDays === 1) {
    newStreak = streak.streak + 1;
  } else if (diffDays > 1) {
    newStreak = 1;
  }

  const updated = await prisma.studyStreak.update({
    where: { userId },
    data: {
      streak: newStreak,
      lastDate: today,
      longestStreak: Math.max(streak.longestStreak, newStreak),
    },
  });
  return updated;
}

// ── Learning Analytics ──────────────────────────────

export async function recordEvent(userId, eventType, data = {}) {
  const event = await prisma.learningAnalytics.create({
    data: {
      userId,
      eventType,
      chapterId: data.chapterId ?? null,
      blockId: data.blockId ?? null,
      timeSpent: data.timeSpent ?? 0,
      metadata: data.metadata ?? null,
    },
  });
  return event;
}

export async function getUserAnalytics(userId, limit = 50) {
  const events = await prisma.learningAnalytics.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      chapter: { select: { id: true, title: true } },
      block: { select: { id: true, title: true, blockType: true } },
    },
  });
  return events;
}

export async function getAnalyticsSummary(userId) {
  const totalTime = await prisma.learningAnalytics.aggregate({
    where: { userId },
    _sum: { timeSpent: true },
  });
  const totalEvents = await prisma.learningAnalytics.count({ where: { userId } });
  const chaptersVisited = await prisma.learningAnalytics.count({
    where: { userId, chapterId: { not: null } },
    distinct: ['chapterId'],
  });
  const blocksVisited = await prisma.learningAnalytics.count({
    where: { userId, blockId: { not: null } },
    distinct: ['blockId'],
  });
  return {
    totalTimeSeconds: totalTime._sum.timeSpent ?? 0,
    totalEvents,
    chaptersVisited,
    blocksVisited,
  };
}