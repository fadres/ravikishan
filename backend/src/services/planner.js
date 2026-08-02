// Study planner: daily/weekly/monthly goals, exam countdown and
// revision plan items with reminders.

import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { addXp, bumpDailyStudy } from './gamification.js';
import { createNotification } from './notifications.js';

export function startOfDay(d = new Date()) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function startOfWeek(d = new Date()) {
  const dt = startOfDay(d);
  const day = (dt.getDay() + 6) % 7; // Monday-first
  dt.setDate(dt.getDate() - day);
  return dt;
}

export function startOfMonth(d = new Date()) {
  const dt = startOfDay(d);
  dt.setDate(1);
  return dt;
}

export function endOfPeriod(start, period) {
  const dt = new Date(start);
  if (period === 'weekly') dt.setDate(dt.getDate() + 7);
  else if (period === 'monthly') dt.setMonth(dt.getMonth() + 1);
  else dt.setDate(dt.getDate() + 1);
  return dt;
}

// ── Goals ───────────────────────────────────────────

export async function listGoals(userId, { period } = {}) {
  const now = new Date();
  const ranges = {
    daily: { gte: startOfDay(now), lt: endOfPeriod(startOfDay(now), 'daily') },
    weekly: { gte: startOfWeek(now), lt: endOfPeriod(startOfWeek(now), 'weekly') },
    monthly: { gte: startOfMonth(now), lt: endOfPeriod(startOfMonth(now), 'monthly') },
  };
  return prisma.studyGoal.findMany({
    where: {
      userId,
      ...(period ? { period } : {}),
      OR: [
        { date: null },
        { date: { gte: ranges[period ?? 'daily'].gte, lt: ranges[period ?? 'daily'].lt } },
      ],
    },
    orderBy: [{ period: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createGoal(userId, data) {
  const goal = await prisma.studyGoal.create({
    data: {
      userId,
      title: data.title,
      period: data.period ?? 'daily',
      targetUnits: data.targetUnits ?? 1,
      unitType: data.unitType ?? 'minutes',
      date: data.date ? new Date(data.date) : null,
    },
  });
  await addXp(userId, 5, 'goal_created', goal.id, { goalTitle: goal.title });
  return goal;
}

export async function updateGoalProgress(userId, goalId, progress) {
  const goal = await prisma.studyGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new AppError(404, 'Goal not found');
  const completed = progress >= goal.targetUnits && !goal.completedAt;
  const updated = await prisma.studyGoal.update({
    where: { id: goalId },
    data: {
      progress,
      completedAt: completed ? new Date() : undefined,
    },
  });
  if (completed) {
    await addXp(userId, 15, 'goal_completed', goalId, { goalTitle: goal.title });
    await bumpDailyStudy(userId, { goals: 1 });
    await createNotification(userId, 'achievement', `Goal completed: ${goal.title}`, 'Keep the momentum going!', '/planner', '🎯').catch(() => {});
  }
  return updated;
}

export async function deleteGoal(userId, goalId) {
  const goal = await prisma.studyGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new AppError(404, 'Goal not found');
  await prisma.studyGoal.delete({ where: { id: goalId } });
  return { ok: true };
}

// ── Exams ───────────────────────────────────────────

export async function listExams(userId) {
  const [upcoming, past] = await Promise.all([
    prisma.exam.findMany({
      where: { userId, examDate: { gte: startOfDay() } },
      orderBy: { examDate: 'asc' },
      include: { subject: { select: { id: true, name: true } } },
    }),
    prisma.exam.findMany({
      where: { userId, examDate: { lt: startOfDay() } },
      orderBy: { examDate: 'desc' },
      take: 10,
      include: { subject: { select: { id: true, name: true } } },
    }),
  ]);
  return {
    upcoming: upcoming.map((e) => ({
      ...e,
      daysUntil: Math.max(0, Math.ceil((new Date(e.examDate) - new Date()) / (1000 * 60 * 60 * 24))),
    })),
    past,
  };
}

export async function createExam(userId, data) {
  const exam = await prisma.exam.create({
    data: {
      userId,
      title: data.title,
      subjectId: data.subjectId ?? null,
      examDate: new Date(data.examDate),
      notes: data.notes ?? null,
    },
  });
  const days = Math.ceil((new Date(exam.examDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days >= 0) {
    await createNotification(userId, 'planner', `Exam scheduled: ${exam.title}`, `${days} day${days === 1 ? '' : 's'} to go — start revising!`, '/planner', '📅').catch(() => {});
  }
  return exam;
}

export async function updateExam(userId, examId, data) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, userId } });
  if (!exam) throw new AppError(404, 'Exam not found');
  return prisma.exam.update({
    where: { id: examId },
    data: {
      title: data.title ?? undefined,
      subjectId: data.subjectId !== undefined ? data.subjectId : undefined,
      examDate: data.examDate ? new Date(data.examDate) : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
  });
}

export async function deleteExam(userId, examId) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, userId } });
  if (!exam) throw new AppError(404, 'Exam not found');
  await prisma.exam.delete({ where: { id: examId } });
  return { ok: true };
}

// ── Plan items (revision planner) ───────────────────

export async function listPlanItems(userId, { from, to } = {}) {
  return prisma.studyPlanItem.findMany({
    where: {
      userId,
      ...(from ? { date: { gte: startOfDay(new Date(from)) } } : {}),
      ...(to ? { date: { lt: endOfPeriod(startOfDay(new Date(to)), 'daily') } } : {}),
    },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  });
}

export async function createPlanItem(userId, data) {
  const item = await prisma.studyPlanItem.create({
    data: {
      userId,
      title: data.title,
      date: new Date(data.date),
      time: data.time ?? null,
      durationMinutes: data.durationMinutes ?? 30,
      chapterId: data.chapterId ?? null,
      topicId: data.topicId ?? null,
      reminderEnabled: data.reminderEnabled ?? false,
      reminderTime: data.reminderTime ?? null,
    },
  });
  await addXp(userId, 5, 'plan_item_created', item.id, { itemTitle: item.title });
  return item;
}

export async function togglePlanItem(userId, itemId) {
  const item = await prisma.studyPlanItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new AppError(404, 'Plan item not found');
  const completing = !item.completedAt;
  const updated = await prisma.studyPlanItem.update({
    where: { id: itemId },
    data: { completedAt: completing ? new Date() : null },
  });
  if (completing) {
    await addXp(userId, 10, 'plan_item_completed', itemId, { itemTitle: item.title });
    await bumpDailyStudy(userId, { minutes: item.durationMinutes });
  }
  return updated;
}

export async function deletePlanItem(userId, itemId) {
  const item = await prisma.studyPlanItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new AppError(404, 'Plan item not found');
  await prisma.studyPlanItem.delete({ where: { id: itemId } });
  return { ok: true };
}

// ── Weekly / monthly planner view ───────────────────

export async function getPlannerView(userId, { from, to } = {}) {
  const start = startOfDay(new Date(from || Date.now()));
  const end = to ? endOfPeriod(startOfDay(new Date(to)), 'daily') : endOfPeriod(start, 'weekly');
  const [items, exams, goals, daily] = await Promise.all([
    listPlanItems(userId, { from: start.toISOString(), to: end.toISOString() }),
    prisma.exam.findMany({
      where: { userId, examDate: { gte: start, lt: end } },
      orderBy: { examDate: 'asc' },
      include: { subject: { select: { name: true } } },
    }),
    listGoals(userId),
    prisma.dailyStudy.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Group plan items by day for a calendar-style response.
  const byDay = {};
  for (const item of items) {
    const key = startOfDay(new Date(item.date)).toISOString();
    byDay[key] = byDay[key] || [];
    byDay[key].push(item);
  }
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    days: Object.keys(byDay).map((k) => ({
      date: k,
      items: byDay[k],
      minutesPlanned: byDay[k].reduce((s, i) => s + i.durationMinutes, 0),
    })),
    exams,
    goals,
    dailyMinutes: daily.map((d) => ({ date: d.date, minutes: d.minutesStudied })),
  };
}
