import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { queueEvent, pushSync } from '../services/progressSync.js';

const router = Router();
router.use(requireAuth);

// POST /api/progress/blocks/:blockId — mark a block complete in THIS
// section. Local ChapterProgress/BlockCompletion rows are updated (they FK
// into this section's own content rows — the global DB cannot host them),
// and an XP event is queued to the global backend via the internal
// progress-sync API. Re-completing the same block never double-awards.
router.post('/blocks/:blockId', async (req, res) => {
  const block = await prisma.contentBlock.findUnique({
    where: { id: req.params.blockId },
    select: { id: true, chapterId: true },
  });
  if (!block) throw new AppError(404, 'Block not found');

  const existing = await prisma.blockCompletion.findUnique({
    where: { userId_blockId: { userId: req.user.id, blockId: block.id } },
  });
  const totalBlocks = await prisma.contentBlock.count({ where: { chapterId: block.chapterId } });
  const completedCount = await prisma.blockCompletion.count({
    where: { userId: req.user.id, chapterId: block.chapterId },
  });

  const progress = await prisma.chapterProgress.upsert({
    where: { userId_chapterId: { userId: req.user.id, chapterId: block.chapterId } },
    create: {
      userId: req.user.id,
      chapterId: block.chapterId,
      blocksCompleted: completedCount,
      totalBlocks,
      lastBlockId: block.id,
      lastAccessedAt: new Date(),
    },
    update: {
      totalBlocks,
      lastBlockId: block.id,
      lastAccessedAt: new Date(),
    },
    include: { chapter: { select: { id: true, title: true, slug: true } } },
  });

  if (!existing) {
    await prisma.blockCompletion.create({
      data: { userId: req.user.id, blockId: block.id, chapterId: block.chapterId },
    });
    const newCount = completedCount + 1;
    const completedAt = newCount >= totalBlocks ? new Date() : null;
    await prisma.chapterProgress.update({
      where: { id: progress.id },
      data: { blocksCompleted: newCount, completedAt },
    });
    await queueEvent(
      'xp',
      {
        userId: req.user.id,
        amount: 5,
        source: 'block_completed',
        sourceId: block.id,
        chapterId: block.chapterId,
        metadata: { blockId: block.id, chapterCompleted: Boolean(completedAt) },
      },
      { push: false }
    );
    await queueEvent('learning', {
      userId: req.user.id,
      source: 'block_completed',
      chapterId: block.chapterId,
      blockId: block.id,
    });
    // One batched push for both events.
    pushSync().catch(() => {});
  }

  res.json({
    progress: {
      ...progress,
      blocksCompleted: existing ? progress.blocksCompleted : completedCount + 1,
      totalBlocks,
      completed: (existing ? progress.blocksCompleted : completedCount + 1) >= totalBlocks,
    },
    firstTime: !existing,
  });
});

// POST /api/progress/chapters/:chapterId/complete — chapter completion
// award (30 XP) is queued only when the chapter flips to completed.
router.post('/chapters/:chapterId/complete', async (req, res) => {
  const chapter = await prisma.chapter.findUnique({
    where: { id: req.params.chapterId },
    select: { id: true, title: true },
  });
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const totalBlocks = await prisma.contentBlock.count({ where: { chapterId: chapter.id } });
  const completedCount = await prisma.blockCompletion.count({
    where: { userId: req.user.id, chapterId: chapter.id },
  });
  const done = completedCount >= totalBlocks;

  const progress = await prisma.chapterProgress.upsert({
    where: { userId_chapterId: { userId: req.user.id, chapterId: chapter.id } },
    create: {
      userId: req.user.id,
      chapterId: chapter.id,
      blocksCompleted: completedCount,
      totalBlocks,
      lastAccessedAt: new Date(),
      completedAt: done ? new Date() : null,
    },
    update: {
      blocksCompleted: completedCount,
      totalBlocks,
      completedAt: done ? new Date() : null,
      lastAccessedAt: new Date(),
    },
  });

  // Award only on the flip — never on repeat requests.
  if (done && !progress.completedAt) {
    await prisma.chapterProgress.update({
      where: { id: progress.id },
      data: { completedAt: new Date() },
    });
    await queueEvent('xp', {
      userId: req.user.id,
      amount: 30,
      source: 'chapter_completed',
      sourceId: chapter.id,
      chapterId: chapter.id,
      metadata: { chapterTitle: chapter.title },
    }).catch(() => {});
  }

  res.json({ progress, completed: done });
});

// GET /api/progress/chapters/:chapterId — this section's local progress
// read. Note: totals/streaks/XP live on the global backend.
router.get('/chapters/:chapterId', async (req, res) => {
  const progress = await prisma.chapterProgress.findUnique({
    where: { userId_chapterId: { userId: req.user.id, chapterId: req.params.chapterId } },
    include: { chapter: { select: { id: true, title: true, slug: true } } },
  });
  res.json({ progress: progress ?? null });
});

const minutesSchema = z.object({
  minutes: z.number().int().min(1).max(600),
});

// POST /api/progress/minutes — report study minutes; queued to the global
// DailyStudy aggregation.
router.post('/minutes', validate(minutesSchema), async (req, res) => {
  await queueEvent('minutes', { userId: req.user.id, amount: req.body.minutes }).catch(() => {});
  res.json({ ok: true });
});

// POST /api/progress/flush — force a sync drain of the outbox (used by the
// acceptance flow and diagnostics).
router.post('/flush', async (req, res) => {
  const result = await pushSync();
  res.json(result);
});

// GET /api/progress/outbox — observability: how many events are pending.
router.get('/outbox', async (req, res) => {
  const [pending, failed] = await Promise.all([
    prisma.progressEvent.count({ where: { syncedAt: null, attempts: { lt: 10 } } }),
    prisma.progressEvent.count({ where: { syncedAt: null, attempts: { gte: 10 } } }),
  ]);
  res.json({ pending, failed });
});

export default router;
