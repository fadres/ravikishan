// Background scheduler for study reminders and revision nudges.
// Runs on an interval (hourly in production, every 15 min in dev), is a
// no-op in tests, and never throws — a failed run logs and moves on.

import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { createNotification } from './notifications.js';

const CHECK_INTERVAL_MS = env.nodeEnv === 'production' ? 60 * 60 * 1000 : 15 * 60 * 1000;

function hhmmToDate(hhmm, day) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

async function runOnce(now = new Date()) {
  const inAnHour = new Date(now.getTime() + 60 * 60 * 1000);

  // 1. Plan-item reminders due within the next hour.
  const dueItems = await prisma.studyPlanItem.findMany({
    where: {
      reminderEnabled: true,
      completedAt: null,
      date: { gte: new Date(now.getTime() - 60 * 60 * 1000), lte: inAnHour },
    },
    select: { id: true, userId: true, title: true, time: true, date: true },
    take: 200,
  });
  for (const item of dueItems) {
    const reminderAt = hhmmToDate(item.time, item.date) ?? item.date;
    if (reminderAt <= now && reminderAt > new Date(now.getTime() - 60 * 60 * 1000)) {
      await createNotification(
        item.userId,
        'reminder',
        `Study reminder: ${item.title}`,
        'Your planned revision session is due — even 10 focused minutes count.',
        '/planner',
        '⏰',
      ).catch(() => {});
    }
  }

  // 2. Flashcards due for spaced repetition (daily nudge at most).
  const dueBatches = await prisma.flashcard.groupBy({
    by: ['deckId'],
    where: { dueAt: { lte: now } },
    _count: true,
    orderBy: { _count: { deckId: 'desc' } },
    take: 50,
  });
  if (dueBatches.length) {
    const decks = await prisma.flashcardDeck.findMany({
      where: { id: { in: dueBatches.map((b) => b.deckId) } },
      select: { id: true, userId: true, title: true },
    });
    const deckById = new Map(decks.map((d) => [d.id, d]));
    const userIds = [...new Set(decks.map((d) => d.userId))];
    const recent = userIds.length
      ? await prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            type: 'reminder',
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
          select: { userId: true, title: true },
        })
      : [];
    for (const batch of dueBatches) {
      const deck = deckById.get(batch.deckId);
      if (!deck) continue;
      const alreadyNudged = recent.some(
        (n) => n.userId === deck.userId && n.title.includes(deck.title),
      );
      if (!alreadyNudged) {
        await createNotification(
          deck.userId,
          'reminder',
          `Revision due: ${deck.title}`,
          `${batch._count} flashcard${batch._count === 1 ? '' : 's'} are due — a quick review keeps them fresh.`,
          '/flashcards',
          '🔄',
        ).catch(() => {});
      }
    }
  }

  // 3. Exam countdown reminders (7 and 1 day before).
  const soonExams = await prisma.exam.findMany({
    where: {
      examDate: { gte: now, lte: inAnHour },
    },
    select: { id: true, userId: true, title: true, examDate: true },
    take: 100,
  });
  for (const exam of soonExams) {
    const days = Math.ceil((new Date(exam.examDate) - now) / (1000 * 60 * 60 * 24));
    if (days === 7 || days === 1) {
      await createNotification(
        exam.userId,
        'reminder',
        `Exam in ${days} day${days === 1 ? '' : 's'}: ${exam.title}`,
        days === 1 ? 'Tomorrow is the big day — final revision tonight.' : 'One week to go — lock in your revision plan.',
        '/planner',
        '📅',
      ).catch(() => {});
    }
  }
}

let timer = null;

export function startScheduler() {
  if (env.nodeEnv === 'test') return;
  if (timer) return;
  timer = setInterval(async () => {
    try {
      await runOnce();
    } catch (err) {
      console.error('scheduler run failed:', err);
    }
  }, CHECK_INTERVAL_MS);
  timer.unref?.();
  console.log(`Scheduler started (every ${CHECK_INTERVAL_MS / 60000} min)`);
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export { runOnce as runSchedulerOnce };
