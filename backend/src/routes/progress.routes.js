import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getProgress,
  listUserProgress,
  updateProgress,
  completeBlock,
  listBookmarks,
  createBookmark,
  deleteBookmark,
  getStreak,
  updateStreak,
  recordEvent,
  getUserAnalytics,
  getAnalyticsSummary,
} from '../services/progress.js';

const router = Router();

// ── Progress ──────────────────────────────────────

router.get('/progress', authenticate, async (req, res) => {
  const progress = await listUserProgress(req.user.id);
  res.json({ progress });
});

const chapterIdSchema = z.object({ chapterId: z.string().uuid() });
const chapterBlockSchema = z.object({ chapterId: z.string().uuid(), blockId: z.string().uuid() });

router.get('/progress/:chapterId', authenticate, validate(chapterIdSchema, 'params'), async (req, res) => {
  const progress = await getProgress(req.user.id, req.params.chapterId);
  if (!progress) throw new AppError(404, 'Progress not found');
  res.json({ progress });
});

const updateProgressSchema = z.object({
  blocksCompleted: z.number().int().min(0).optional(),
  lastBlockId: z.string().uuid().optional(),
  completed: z.boolean().optional(),
});

router.patch('/progress/:chapterId', authenticate, validate(chapterIdSchema, 'params'), validate(updateProgressSchema), async (req, res) => {
  const progress = await updateProgress(req.user.id, req.params.chapterId, req.validated);
  res.json({ progress });
});

router.post('/progress/:chapterId/block/:blockId', authenticate, validate(chapterBlockSchema, 'params'), async (req, res) => {
  const progress = await completeBlock(req.user.id, req.params.chapterId, req.params.blockId);
  res.json({ progress });
});

// ── Bookmarks ─────────────────────────────────────

router.get('/bookmarks', authenticate, async (req, res) => {
  const bookmarks = await listBookmarks(req.user.id);
  res.json({ bookmarks });
});

const bookmarkSchema = z.object({
  chapterId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  label: z.string().trim().max(100).optional(),
});

router.post('/bookmarks', authenticate, validate(bookmarkSchema), async (req, res) => {
  const bookmark = await createBookmark(req.user.id, req.validated.chapterId, req.validated.blockId, req.validated.label);
  res.status(201).json({ bookmark });
});

router.delete('/bookmarks/:chapterId', authenticate, validate(chapterIdSchema, 'params'), async (req, res) => {
  await deleteBookmark(req.user.id, req.params.chapterId, null);
  res.json({ ok: true });
});

router.delete('/bookmarks/:chapterId/block/:blockId', authenticate, validate(chapterBlockSchema, 'params'), async (req, res) => {
  await deleteBookmark(req.user.id, req.params.chapterId, req.params.blockId);
  res.json({ ok: true });
});

// ── Study Streak ─────────────────────────────────

router.get('/streak', authenticate, async (req, res) => {
  const streak = await getStreak(req.user.id);
  res.json({ streak });
});

router.post('/streak', authenticate, async (req, res) => {
  const streak = await updateStreak(req.user.id);
  res.json({ streak });
});

// ── Analytics ────────────────────────────────────

router.get('/analytics', authenticate, async (req, res) => {
  const summary = await getAnalyticsSummary(req.user.id);
  res.json({ summary });
});

router.get('/analytics/events', authenticate, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
  const events = await getUserAnalytics(req.user.id, limit);
  res.json({ events });
});

router.post('/analytics/events', authenticate, validate(z.object({
  eventType: z.string().trim().min(1).max(50),
  chapterId: z.string().uuid().optional(),
  blockId: z.string().uuid().optional(),
  timeSpent: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
})), async (req, res) => {
  const event = await recordEvent(req.user.id, req.validated.eventType, req.validated);
  res.status(201).json({ event });
});

// ── Admin analytics ──────────────────────────────

router.get('/admin/analytics', authenticate, requireRole('owner', 'admin'), async (_req, res) => {
  const activeUsers = await prisma.user.count({
    where: { lastActiveAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
  const totalProgress = await prisma.userProgress.count();
  const totalBookmarks = await prisma.bookmark.count();
  const totalEvents = await prisma.learningAnalytics.count();
  const avgTime = await prisma.learningAnalytics.aggregate({
    _avg: { timeSpent: true },
  });
  res.json({
    activeUsers,
    totalProgress,
    totalBookmarks,
    totalEvents,
    avgTimeSpent: Math.round(avgTime._avg.timeSpent ?? 0),
  });
});

export default router;