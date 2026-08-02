import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listGoals,
  createGoal,
  updateGoalProgress,
  deleteGoal,
  listExams,
  createExam,
  updateExam,
  deleteExam,
  listPlanItems,
  createPlanItem,
  togglePlanItem,
  deletePlanItem,
  getPlannerView,
} from '../services/planner.js';

const router = Router();
router.use(requireAuth);

const goalSchema = z.object({
  title: z.string().trim().min(2).max(200),
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  targetUnits: z.number().int().min(1).max(100000),
  unitType: z.string().trim().max(50).default('minutes'),
  date: z.string().datetime().optional(),
});

const goalProgressSchema = z.object({
  progress: z.number().int().min(0).max(1000000),
});

const examSchema = z.object({
  title: z.string().trim().min(2).max(200),
  subjectId: z.string().uuid().nullable().optional(),
  examDate: z.string().datetime(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const planItemSchema = z.object({
  title: z.string().trim().min(2).max(200),
  date: z.string().datetime(),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(600).default(30),
  chapterId: z.string().uuid().nullable().optional(),
  topicId: z.string().uuid().nullable().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

// ── Goals ───────────────────────────────────────────

router.get('/goals', async (req, res) => {
  const goals = await listGoals(req.user.id, { period: req.query.period });
  res.json({ goals });
});

router.post('/goals', validate(goalSchema), async (req, res) => {
  const goal = await createGoal(req.user.id, req.body);
  res.status(201).json({ goal });
});

const planIdSchema = z.object({ id: z.string().uuid() });

router.patch('/goals/:id', validate(planIdSchema, 'params'), validate(goalProgressSchema), async (req, res) => {
  const goal = await updateGoalProgress(req.user.id, req.params.id, req.body.progress);
  res.json({ goal });
});

router.delete('/goals/:id', validate(planIdSchema, 'params'), async (req, res) => {
  await deleteGoal(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ── Exams ───────────────────────────────────────────

router.get('/exams', async (req, res) => {
  const exams = await listExams(req.user.id);
  res.json(exams);
});

router.post('/exams', validate(examSchema), async (req, res) => {
  const exam = await createExam(req.user.id, req.body);
  res.status(201).json({ exam });
});

router.patch('/exams/:id', validate(planIdSchema, 'params'), validate(examSchema.partial()), async (req, res) => {
  const exam = await updateExam(req.user.id, req.params.id, req.body);
  res.json({ exam });
});

router.delete('/exams/:id', validate(planIdSchema, 'params'), async (req, res) => {
  await deleteExam(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ── Plan items ──────────────────────────────────────

router.get('/plan', async (req, res) => {
  const items = await listPlanItems(req.user.id, {
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ items });
});

router.get('/planner', async (req, res) => {
  const view = await getPlannerView(req.user.id, {
    from: req.query.from,
    to: req.query.to,
  });
  res.json(view);
});

router.post('/plan', validate(planItemSchema), async (req, res) => {
  const item = await createPlanItem(req.user.id, req.body);
  res.status(201).json({ item });
});

router.post('/plan/:id/toggle', async (req, res) => {
  const item = await togglePlanItem(req.user.id, req.params.id);
  res.json({ item });
});

router.delete('/plan/:id', validate(planIdSchema, 'params'), async (req, res) => {
  await deletePlanItem(req.user.id, req.params.id);
  res.json({ ok: true });
});

export default router;
