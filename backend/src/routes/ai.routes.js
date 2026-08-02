import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  solveDoubt,
  summarizeNotes,
  explainConcept,
  revisionNotes,
  generateQuestions,
  checkAnswer,
  studyRecommendations,
} from '../services/ai.js';

const router = Router();
router.use(requireAuth);

const doubtSchema = z.object({
  question: z.string().trim().min(5).max(2000),
  chapterId: z.string().uuid().optional(),
});

router.post('/doubt', validate(doubtSchema), async (req, res) => {
  const result = await solveDoubt(req.user.id, req.body);
  res.json(result);
});

const summarizeSchema = z.object({
  chapterId: z.string().uuid(),
  level: z.enum(['short', 'medium', 'detailed']).default('short'),
});

router.post('/summarize', validate(summarizeSchema), async (req, res) => {
  const result = await summarizeNotes(req.user.id, req.body);
  res.json(result);
});

const explainSchema = z.object({
  concept: z.string().trim().min(2).max(200),
  chapterId: z.string().uuid().optional(),
});

router.post('/explain', validate(explainSchema), async (req, res) => {
  const result = await explainConcept(req.user.id, req.body);
  res.json(result);
});

const revisionSchema = z.object({
  chapterId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
});

router.post('/revision-notes', validate(revisionSchema), async (req, res) => {
  const result = await revisionNotes(req.user.id, req.body);
  res.json(result);
});

const generateSchema = z.object({
  chapterId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  count: z.number().int().min(1).max(20).default(5),
  types: z.array(z.enum(['mcq', 'true_false', 'fill_blank', 'short_answer'])).max(4).optional(),
});

router.post('/generate-questions', validate(generateSchema), async (req, res) => {
  const result = await generateQuestions(req.user.id, req.body);
  res.json(result);
});

const checkSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  modelAnswer: z.string().trim().min(3).max(8000),
  userAnswer: z.string().trim().min(1).max(8000),
});

router.post('/check-answer', validate(checkSchema), async (req, res) => {
  const result = await checkAnswer(req.user.id, req.body);
  res.json(result);
});

router.get('/recommendations', async (req, res) => {
  const result = await studyRecommendations(req.user.id);
  res.json(result);
});

export default router;
