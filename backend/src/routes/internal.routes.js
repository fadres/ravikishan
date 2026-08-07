// Internal service-to-service API — reachable ONLY by registered section
// services (backend-class12-test/ etc.), never by browsers.
//
// POST /internal/progress-sync — section services push their progress
// outbox here (see backend-class12-test/src/services/progressSync.js).
// Auth: `x-service-secret` header must equal PROGRESS_SYNC_SECRET (a
// dedicated S2S secret, deliberately separate from JWT_ACCESS_SECRET).
// The section service writes events FIRST, then pushes; the outbox marks
// them synced only on a 2xx, so a lost response may redeliver. Guards are:
//   • the section never re-queues award events (its local first-time flip),
//   • unknown users are skipped here instead of erroring (deleted accounts),
//   • the global side applies the same award rules via the shared
//     gamification/progress services, so XP, badges and streaks stay
//     consistent with first-party flows.
//
// Event types understood (see backend-class12-test §progressSync):
//   xp       { userId, amount, source, sourceId?, chapterId?, metadata? }
//   minutes  { userId, amount }
//   streak   { userId }
//   learning { userId, ... }   — accepted + acknowledged (analytics only)

import { Router } from 'express';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/error.js';
import { addXp, bumpDailyStudy } from '../services/gamification.js';
import { updateStreak } from '../services/progress.js';

const router = Router();

// Strict, bounded event schema — the section service is trusted-ish but the
// payload crosses a network boundary, so shape and size are still checked.
const eventSchema = z
  .object({
    userId: z.string().uuid(),
    type: z.enum(['xp', 'minutes', 'streak', 'learning']),
    amount: z.number().int().min(1).max(600).optional(),
    source: z.string().max(60).optional(),
    sourceId: z.string().max(64).optional(),
    chapterId: z.string().max(64).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

const syncSchema = z.object({
  sectionId: z.string().trim().min(1).max(80),
  events: z.array(eventSchema).max(500),
});

function serviceSecretAuth(req, res, next) {
  const provided = String(req.headers['x-service-secret'] ?? '');
  const expected = env.progressSyncSecret;
  if (!expected || !provided) {
    return res.status(401).json({ error: 'Missing service secret' });
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return res.status(403).json({ error: 'Invalid service secret' });
  next();
}

router.post('/progress-sync', serviceSecretAuth, validate(syncSchema), async (req, res) => {
  const { sectionId, events } = req.validated;
  let processed = 0;
  let skipped = 0;
  const failures = [];

  for (const event of events) {
    try {
      const user = await prisma.user.findUnique({ where: { id: event.userId }, select: { id: true } });
      if (!user) {
        // Deleted/never-registered account — drop the event, don't burn the
        // section service's retry budget on it.
        skipped += 1;
        continue;
      }

      switch (event.type) {
        case 'xp': {
          await addXp(event.userId, event.amount ?? 0, event.source ?? 'section_progress', event.sourceId ?? null, {
            sectionId,
            chapterId: event.chapterId ?? null,
            ...(event.metadata ?? {}),
          });
          break;
        }
        case 'minutes': {
          await bumpDailyStudy(event.userId, { minutes: event.amount ?? 0 });
          break;
        }
        case 'streak': {
          await updateStreak(event.userId);
          break;
        }
        case 'learning': {
          // Analytics-only — acknowledged, nothing persisted globally.
          break;
        }
        default: {
          skipped += 1;
          continue;
        }
      }
      processed += 1;
    } catch (err) {
      // Transient failures bubble up as a 500 → the section service retries.
      failures.push({ userId: event.userId, type: event.type, error: err.message });
      break;
    }
  }

  if (failures.length > 0) {
    const err = new AppError(502, `Failed to apply ${failures.length} event(s): ${failures[0].error}`);
    err.details = failures;
    throw err;
  }

  res.json({ ok: true, sectionId, processed, skipped });
});

export default router;
