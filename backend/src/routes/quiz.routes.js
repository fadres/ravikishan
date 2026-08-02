import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { authenticate, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.js';
import { createNotification } from '../services/notifications.js';
import {
  QUESTION_TYPES,
  getQuizForTake,
  startAttempt,
  submitAttempt,
  abandonAttempt,
  listAttempts,
  getAttemptDetail,
  getQuizAnalytics,
  getLeaderboard,
} from '../services/quiz.js';

const router = Router();

const quizListSchema = z.object({
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  type: z.enum(['mcq', 'true_false', 'fill_blank', 'short_answer']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(50).optional(),
});

// GET /api/quizzes — published quizzes, filterable by subject/chapter/topic.
router.get('/quizzes', authenticate, validate(quizListSchema, 'query'), async (req, res) => {
  const page = req.validated.page ?? 1;
  const perPage = req.validated.perPage ?? 20;
  const where = {
    status: 'published',
    ...(req.validated.subjectId ? { subjectId: req.validated.subjectId } : {}),
    ...(req.validated.chapterId ? { chapterId: req.validated.chapterId } : {}),
    ...(req.validated.topicId ? { topicId: req.validated.topicId } : {}),
  };
  const [quizzes, total] = await Promise.all([
    prisma.quiz.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        description: true,
        isTimed: true,
        timeLimitSeconds: true,
        shuffle: true,
        questionCount: true,
        createdAt: true,
        subject: { select: { id: true, name: true, slug: true } },
        chapter: { select: { id: true, title: true, slug: true } },
        topic: { select: { id: true, title: true, slug: true } },
        _count: { select: { attempts: { where: { status: 'completed' } } } },
      },
    }),
    prisma.quiz.count({ where }),
  ]);
  res.json({ quizzes, total, page, totalPages: Math.ceil(total / perPage) });
});

// GET /api/quizzes/leaderboard — global XP leaderboard (before :id routes).
router.get('/quizzes/leaderboard', requireAuth, async (_req, res) => {
  const leaderboard = await getLeaderboard();
  res.json({ leaderboard });
});

// GET /api/quizzes/analytics — personal quiz analytics (before :id routes).
router.get('/quizzes/analytics', requireAuth, async (req, res) => {
  const analytics = await getQuizAnalytics(req.user.id);
  res.json({ analytics });
});

// GET /api/quizzes/:id — quiz detail with questions (no answers).
router.get('/quizzes/:id', requireAuth, async (req, res) => {
  const quiz = await getQuizForTake(req.params.id);
  res.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isTimed: quiz.isTimed,
      timeLimitSeconds: quiz.timeLimitSeconds,
      shuffle: quiz.shuffle,
      subject: quiz.subject,
      chapter: quiz.chapter,
      topic: quiz.topic,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        questionType: q.questionType,
        question: q.question,
        options: q.options,
        points: q.points,
      })),
    },
  });
});

// POST /api/quizzes/:id/attempts — start a quiz attempt (questions are
// snapshot-shuffled server-side, answers never leave the server).
router.post('/quizzes/:id/attempts', requireAuth, async (req, res) => {
  const attempt = await startAttempt(req.user.id, req.params.id);
  res.status(201).json({ attempt });
});

const submitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answer: z.union([z.string().max(2000), z.null()]).optional(),
  })).max(200),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

router.post('/attempts/:attemptId/submit', requireAuth, validate(submitSchema), async (req, res) => {
  const attempt = await submitAttempt(req.user.id, req.params.attemptId, req.validated.answers, req.validated.timeSpentSeconds ?? 0);
  const perfect = attempt.totalPoints > 0 && attempt.score === attempt.totalPoints;
  if (perfect) {
    await createNotification(req.user.id, 'achievement', 'Perfect score!', `You scored ${attempt.score}/${attempt.totalPoints} on "${attempt.quiz.title}".`, '/quizzes/history', '💯').catch(() => {});
  }
  await recordAudit(req.user, 'quiz.submitted', 'QuizAttempt', attempt.id, { score: attempt.score });
  res.json({ attempt });
});

router.post('/attempts/:attemptId/abandon', requireAuth, async (req, res) => {
  const attempt = await abandonAttempt(req.user.id, req.params.attemptId);
  res.json({ attempt });
});

// GET /api/quizzes/attempts — attempt history (own).
router.get('/attempts', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const data = await listAttempts(req.user.id, page);
  res.json(data);
});

// GET /api/quizzes/attempts/:id — full attempt detail with explanations.
router.get('/attempts/:id', requireAuth, async (req, res) => {
  const attempt = await getAttemptDetail(req.user.id, req.params.id);
  const answerMap = new Map((attempt.answers ?? []).map((a) => [a.questionId, a]));
  const questions = attempt.quiz.questions.map((q) => {
    const given = answerMap.get(q.id);
    return {
      id: q.id,
      questionType: q.questionType,
      question: q.question,
      options: q.options,
      points: q.points,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      givenAnswer: given?.answer ?? null,
      correct: Boolean(given?.correct),
      pointsEarned: given?.pointsEarned ?? 0,
    };
  });
  res.json({ attempt: { ...attempt, quiz: { ...attempt.quiz, questions } } });
});

// ── Admin: quiz authoring ───────────────────────────

const questionSchema = z.object({
  questionType: z.enum(QUESTION_TYPES),
  question: z.string().trim().min(3).max(2000),
  options: z.array(z.string().trim().max(500)).min(2).max(6).optional(),
  correctAnswer: z.string().trim().min(1).max(2000),
  explanation: z.string().trim().max(2000).optional(),
  points: z.number().int().min(1).max(10).optional(),
});

const quizCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  isTimed: z.boolean().optional(),
  timeLimitSeconds: z.number().int().min(30).max(7200).optional(),
  shuffle: z.boolean().optional(),
  questions: z.array(questionSchema).min(1).max(100),
});

router.post('/quizzes', requireRole('owner', 'admin'), validate(quizCreateSchema), async (req, res) => {
  const { questions, ...quizData } = req.body;
  const quiz = await prisma.quiz.create({
    data: {
      ...quizData,
      status: 'published',
      createdById: req.user.id,
      questionCount: questions.length,
      questions: {
        create: questions.map((q, i) => ({ ...q, sortOrder: i })),
      },
    },
    include: { subject: { select: { name: true } }, chapter: { select: { title: true } } },
  });
  await recordAudit(req.user, 'quiz.created', 'Quiz', quiz.id, { title: quiz.title, questions: questions.length });
  res.status(201).json({ quiz });
});

export default router;
