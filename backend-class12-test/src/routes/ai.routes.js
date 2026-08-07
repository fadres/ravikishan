import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import {
  solveDoubt,
  summarizeNotes,
  explainConcept,
  revisionNotes,
  generateQuestions,
  checkAnswer,
} from '../services/ai.js';

const router = Router();
router.use(requireAuth);

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.aiRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests — please wait a moment.' },
});
router.use(aiLimiter);

const askSchema = z.object({
  question: z.string().trim().min(5).max(2000),
  chapterId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
});

// POST /api/ai/ask — grounded answer from THIS section's own content,
// answered through this section's own local AI endpoint.
router.post('/ask', validate(askSchema), async (req, res) => {
  const result = await solveDoubt(req.user.accessLevel, req.body);
  res.json(result);
});

const summarizeSchema = z.object({
  chapterId: z.string().uuid(),
  level: z.enum(['short', 'medium', 'detailed']).default('short'),
});

router.post('/summarize', validate(summarizeSchema), async (req, res) => {
  const result = await summarizeNotes(req.user.accessLevel, req.body);
  res.json(result);
});

const explainSchema = z.object({
  concept: z.string().trim().min(2).max(200),
  chapterId: z.string().uuid().optional(),
});

router.post('/explain', validate(explainSchema), async (req, res) => {
  const result = await explainConcept(req.user.accessLevel, req.body);
  res.json(result);
});

const revisionSchema = z.object({
  chapterId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
});

router.post('/revision-notes', validate(revisionSchema), async (req, res) => {
  const result = await revisionNotes(req.user.accessLevel, req.body);
  res.json(result);
});

const generateSchema = z.object({
  chapterId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  count: z.number().int().min(1).max(20).default(5),
  types: z.array(z.enum(['mcq', 'true_false', 'fill_blank', 'short_answer'])).max(4).optional(),
});

router.post('/generate-questions', validate(generateSchema), async (req, res) => {
  const result = await generateQuestions(req.user.accessLevel, req.body);
  res.json(result);
});

const checkSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  modelAnswer: z.string().trim().min(3).max(8000),
  userAnswer: z.string().trim().min(1).max(8000),
});

router.post('/check-answer', validate(checkSchema), async (req, res) => {
  const result = await checkAnswer(req.user.accessLevel, req.body);
  res.json(result);
});

export default router;
