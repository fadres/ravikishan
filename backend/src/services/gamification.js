// Gamification engine: XP ledger, badges and daily-study aggregation.
// All award paths funnel through addXp so a single place owns the rules.

import { prisma } from '../config/db.js';
import { recordAudit } from './audit.js';
import { createNotification } from './notifications.js';
import { ensureBadges } from './badges.js';

export async function awardXp(userId, amount, source, sourceId, metadata) {
  const [entry, user] = await prisma.$transaction([
    prisma.xpEntry.create({
      data: { userId, amount, source, sourceId, metadata },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { totalXp: { increment: amount } },
      select: { totalXp: true },
    }),
  ]);
  return { entry, totalXp: user.totalXp };
}

// Call after any XP change; checks and grants every badge the user qualifies
// for. Returns the freshly earned badges.
export async function checkBadges(userId) {
  await ensureBadges();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalXp: true,
      studyStreak: { select: { streak: true } },
      _count: {
        select: {
          userBadges: true,
          quizAttempts: { where: { status: 'completed' } },
          flashcardDecks: true,
          userProgress: { where: { completedAt: { not: null } } },
        },
      },
    },
  });
  if (!user) return [];

  const reviews = await prisma.flashcard.aggregate({
    where: { deck: { userId }, timesReviewed: { gt: 0 } },
    _sum: { timesReviewed: true },
  });
  const perfectQuizzes = await prisma.quizAttempt.count({
    where: { userId, status: 'completed' },
  });

  const facts = {
    xp: user.totalXp,
    quizzes: user._count.quizAttempts,
    cards: user._count.flashcardDecks,
    reviews: reviews._sum.timesReviewed ?? 0,
    chapters: user._count.userProgress,
    goals: 0,
    streak: user.studyStreak?.streak ?? 0,
    perfect_quiz: perfectQuizzes,
  };
  const goalCount = await prisma.studyGoal.count({ where: { userId, completedAt: { not: null } } });
  facts.goals = goalCount;

  const all = await prisma.badge.findMany();
  const owned = new Set(
    (await prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } })).map((b) => b.badgeId),
  );

  const earned = [];
  for (const badge of all) {
    if (owned.has(badge.id)) continue;
    const c = badge.criteria || {};
    const value = facts[c.type] ?? 0;
    if (value >= (c.amount ?? 1)) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      });
      owned.add(badge.id);
      earned.push(badge);
      await createNotification(userId, 'achievement', `Badge earned: ${badge.name}`, badge.description, '/achievements', badge.icon).catch(() => {});
      await recordAudit({ id: userId }, 'gamification.badge', 'Badge', badge.id, { badgeCode: badge.code });
    }
  }
  return earned;
}

// Convenience: award XP then evaluate badges, and return both.
export async function addXp(userId, amount, source, sourceId, metadata) {
  if (amount <= 0) return { totalXp: (await prisma.user.findUnique({ where: { id: userId }, select: { totalXp: true } }))?.totalXp ?? 0, badges: [] };
  const { totalXp } = await awardXp(userId, amount, source, sourceId, metadata);
  const badges = await checkBadges(userId);
  return { totalXp, badges };
}

// ── Daily study aggregation (drives goals + gamification stats) ──

export function dayKey(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export async function bumpDailyStudy(userId, { minutes = 0, quizzes = 0, cards = 0, blocks = 0 } = {}) {
  const date = dayKey();
  const row = await prisma.dailyStudy.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, minutesStudied: minutes, quizzesTaken: quizzes, cardsReviewed: cards, blocksCompleted: blocks },
    update: {
      minutesStudied: { increment: minutes },
      quizzesTaken: { increment: quizzes },
      cardsReviewed: { increment: cards },
      blocksCompleted: { increment: blocks },
    },
  });
  return row;
}

export async function getGamificationSummary(userId) {
  const [user, badges, xpEntries, daily] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, studyStreak: { select: { streak: true, longestStreak: true } } },
    }),
    prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      include: { badge: true },
    }),
    prisma.xpEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.dailyStudy.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    }),
  ]);

  const allBadges = await prisma.badge.findMany({ orderBy: { code: 'asc' } });
  const owned = new Set(badges.map((b) => b.badgeId));

  // Simple level curve: level n requires n*100 cumulative XP.
  const totalXp = user?.totalXp ?? 0;
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const levelFloor = (level - 1) ** 2 * 100;
  const levelCeil = level ** 2 * 100;

  return {
    totalXp,
    level,
    levelProgress: levelCeil > levelFloor ? Math.round(((totalXp - levelFloor) / (levelCeil - levelFloor)) * 100) : 0,
    streak: user?.studyStreak?.streak ?? 0,
    longestStreak: user?.studyStreak?.longestStreak ?? 0,
    badges: badges.map((b) => ({ code: b.badge.code, name: b.badge.name, description: b.badge.description, icon: b.badge.icon, earnedAt: b.earnedAt })),
    lockedBadges: allBadges.filter((b) => !owned.has(b.id)).map((b) => ({ code: b.code, name: b.name, description: b.description, icon: b.icon })),
    recentXp: xpEntries,
    last30Days: daily.reverse().map((d) => ({ date: d.date, minutes: d.minutesStudied, quizzes: d.quizzesTaken, cards: d.cardsReviewed, blocks: d.blocksCompleted })),
  };
}
