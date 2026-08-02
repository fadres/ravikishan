// Quiz engine: attempts, auto-grading, leaderboards and analytics.
// Grading rules:
//   mcq / true_false  — exact option match (case-insensitive for TF)
//   fill_blank        — normalized text match against correct answer
//   short_answer      — normalized keyword overlap scoring

import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { addXp } from './gamification.js';
import { recordEvent } from './progress.js';

export const QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank', 'short_answer'];

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}|/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(s) {
  return normalizeText(s).split(' ').filter(Boolean);
}

export function keywordOverlap(candidate, reference) {
  const a = new Set(words(candidate));
  const b = words(reference);
  if (b.length === 0) return 0;
  const hits = b.filter((w) => a.has(w)).length;
  return hits / b.length;
}

export function gradeAnswer(question, answer) {
  const correct = String(question.correctAnswer ?? '').trim();
  const given = String(answer ?? '').trim();

  switch (question.questionType) {
    case 'true_false':
      return normalizeText(given) === normalizeText(correct) ? question.points : 0;
    case 'fill_blank': {
      if (!given) return 0;
      const accepted = correct.split('|').map(normalizeText).filter(Boolean);
      return accepted.includes(normalizeText(given)) ? question.points : 0;
    }
    case 'short_answer': {
      if (!given) return 0;
      // 60% keyword overlap counts as correct; partial credit below that.
      const overlap = keywordOverlap(given, correct);
      if (overlap >= 0.6) return question.points;
      if (overlap >= 0.3) return Math.max(1, Math.round(question.points / 2));
      return 0;
    }
    case 'mcq':
    default:
      return given === correct ? question.points : 0;
  }
}

// Builds the attempt payload for the question set, honouring shuffle.
export function buildQuestionPayload(questions, shuffle = true) {
  const ordered = shuffle ? [...questions].sort(() => Math.random() - 0.5) : questions;
  return ordered.map((q) => ({
    id: q.id,
    questionType: q.questionType,
    question: q.question,
    options: q.options ?? null,
    points: q.points,
  }));
}

// Fetches a published quiz with its questions (no answers exposed).
export async function getQuizForTake(quizId) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      subject: { select: { id: true, name: true, slug: true } },
      chapter: { select: { id: true, title: true, slug: true } },
      topic: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!quiz || quiz.status !== 'published') {
    throw new AppError(404, 'Quiz not found');
  }
  return quiz;
}

export async function startAttempt(userId, quizId) {
  const quiz = await getQuizForTake(quizId);
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      status: 'in_progress',
      totalQuestions: quiz.questions.length,
      totalPoints: quiz.questions.reduce((s, q) => s + q.points, 0),
      answers: buildQuestionPayload(quiz.questions, quiz.shuffle),
    },
    include: {
      quiz: { select: { id: true, title: true, isTimed: true, timeLimitSeconds: true } },
    },
  });
  await recordEvent(userId, 'quiz.started', undefined, undefined, { quizId });
  return attempt;
}

export async function submitAttempt(userId, attemptId, submittedAnswers = [], timeSpentSeconds = 0) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId, status: 'in_progress' },
    include: {
      quiz: { include: { questions: true } },
    },
  });
  if (!attempt) throw new AppError(404, 'Active attempt not found');

  const questionById = new Map(attempt.quiz.questions.map((q) => [q.id, q]));
  const byId = new Map((submittedAnswers || []).map((a) => [String(a.questionId), a.answer]));

  let score = 0;
  let correctCount = 0;
  const graded = [];

  for (const q of attempt.quiz.questions) {
    const given = byId.get(q.id);
    const points = gradeAnswer(q, given);
    score += points;
    if (points > 0) correctCount += 1;
    graded.push({
      questionId: q.id,
      answer: given ?? '',
      correct: points > 0,
      pointsEarned: points,
    });
  }

  const xpEarned = Math.round(score * 2);
  const completed = await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      status: 'completed',
      submittedAt: new Date(),
      score,
      correctCount,
      answers: graded,
      timeSpentSeconds: Math.min(Math.max(timeSpentSeconds, 0), 86400),
      xpEarned,
    },
    include: {
      quiz: { select: { id: true, title: true } },
    },
  });

  await addXp(userId, xpEarned, 'quiz', completed.quizId, { quizTitle: completed.quiz.title });
  await recordEvent(userId, 'quiz.completed', undefined, undefined, {
    quizId: attempt.quizId,
    score,
    correctCount,
  });
  return completed;
}

export async function abandonAttempt(userId, attemptId) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId, status: 'in_progress' },
  });
  if (!attempt) throw new AppError(404, 'Active attempt not found');
  return prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: { status: 'abandoned', submittedAt: new Date() },
  });
}

// ── Attempt history & analytics ─────────────────────

export async function listAttempts(userId, page = 1, perPage = 15) {
  const skip = (page - 1) * perPage;
  const [attempts, total] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId, status: { not: 'in_progress' } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            subject: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.quizAttempt.count({ where: { userId, status: { not: 'in_progress' } } }),
  ]);
  return { attempts, total, page, totalPages: Math.ceil(total / perPage) };
}

export async function getAttemptDetail(userId, attemptId) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          isTimed: true,
          timeLimitSeconds: true,
          questions: { orderBy: { sortOrder: 'asc' } },
          subject: { select: { name: true, slug: true } },
          chapter: { select: { title: true, slug: true } },
        },
      },
    },
  });
  if (!attempt) throw new AppError(404, 'Attempt not found');
  return attempt;
}

export async function getQuizAnalytics(userId) {
  const completed = await prisma.quizAttempt.findMany({
    where: { userId, status: 'completed' },
    select: { score: true, totalPoints: true, correctCount: true, totalQuestions: true },
  });
  const attempts = completed.length;
  const totalScore = completed.reduce((s, a) => s + a.score, 0);
  const totalPossible = completed.reduce((s, a) => s + a.totalPoints, 0);
  const totalCorrect = completed.reduce((s, a) => s + a.correctCount, 0);
  const totalQuestions = completed.reduce((s, a) => s + a.totalQuestions, 0);

  // Per-subject breakdown for the radar of what to revise next.
  const recent = await prisma.quizAttempt.findMany({
    where: { userId, status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { quiz: { select: { subject: { select: { name: true } } } } },
  });
  const bySubject = {};
  for (const a of recent) {
    const name = a.quiz.subject?.name || 'General';
    bySubject[name] = bySubject[name] || { attempts: 0, score: 0, possible: 0 };
    bySubject[name].attempts += 1;
    bySubject[name].score += a.score;
    bySubject[name].possible += a.totalPoints;
  }

  return {
    attempts,
    averagePercent: attempts ? Math.round((totalScore / Math.max(totalPossible, 1)) * 100) : 0,
    totalCorrect,
    totalQuestions,
    accuracyPercent: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    bySubject: Object.entries(bySubject).map(([name, v]) => ({
      subject: name,
      attempts: v.attempts,
      percent: v.possible ? Math.round((v.score / v.possible) * 100) : 0,
    })),
  };
}

// ── Leaderboard ─────────────────────────────────────

export async function getLeaderboard(limit = 25) {
  const users = await prisma.user.findMany({
    where: { totalXp: { gt: 0 } },
    orderBy: [{ totalXp: 'desc' }, { updatedAt: 'asc' }],
    take: Math.min(limit, 100),
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      totalXp: true,
      studyStreak: { select: { streak: true } },
      _count: { select: { quizAttempts: { where: { status: 'completed' } } } },
    },
  });
  return users.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    displayName: u.displayName || 'Anonymous',
    avatarUrl: u.avatarUrl,
    xp: u.totalXp,
    streak: u.studyStreak?.streak ?? 0,
    quizzesCompleted: u._count.quizAttempts,
  }));
}
