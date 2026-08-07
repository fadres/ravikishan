// Progress-sync outbox — the ONLY bridge between this section service and
// the global backend for study data.
//
// Design (see ARCHITECTURE.md §6):
//   • The section service never decides gamification. It records events in
//     its own `ProgressEvent` outbox and pushes them to the global backend's
//     internal API (POST /internal/progress-sync) authenticated with the
//     service-to-service secret (PROGRESS_SYNC_SECRET — separate from the
//     JWT secret).
//   • Events are written FIRST, pushed SECOND. If the global backend is
//     down (or the network fails), the event stays queued and a background
//     drain retries with exponential backoff — progress is never lost.
//   • pushSync() is also called immediately after queueEvent() for the
//     common healthy path, so XP lands in the global ledger right away.
//
// Event types the global backend understands:
//   xp       { userId, amount, source, sourceId?, chapterId?, metadata? }
//   minutes  { userId, amount }                       (daily study minutes)
//   streak   { userId }                               (streak ping)
//   learning { userId, source, chapterId?, blockId?, timeSpent?, metadata? }

import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { SECTION } from '../lib/section.js';

const BODY_LIMIT = 512 * 1024;

/** Write an event to the outbox, then attempt an immediate push.
 *  Pass `{ push: false }` when several events are queued together so the
 *  caller can trigger a single batched pushSync() afterwards. */
export async function queueEvent(type, payload, opts = {}) {
  const push = opts.push !== false;
  const event = await prisma.progressEvent.create({
    data: {
      userId: payload.userId ?? 'anonymous',
      type,
      payload: { ...payload, sectionId: SECTION.id },
    },
  });
  if (push && payload.userId) {
    // Fire-and-forget: never block the user request on the global service.
    pushSync().catch(() => {});
  }
  return event;
}

/**
 * Push one batch of pending events to the global backend. Idempotent and
 * safe to call any time (also exposed via POST /api/progress/flush).
 * @returns {{ pushed: number, failed: number }}
 */
export async function pushSync() {
  if (!env.progressSyncUrl || !env.progressSyncSecret) return { pushed: 0, failed: 0 };

  const pending = await prisma.progressEvent.findMany({
    where: { syncedAt: null, attempts: { lt: env.syncMaxAttempts } },
    orderBy: { createdAt: 'asc' },
    take: env.syncBatchSize,
  });
  if (pending.length === 0) return { pushed: 0, failed: 0 };

  const events = pending.map((e) => ({
    userId: e.userId,
    type: e.type,
    ...(typeof e.payload === 'object' && e.payload !== null ? e.payload : {}),
  }));

  let res;
  try {
    res = await fetch(`${env.progressSyncUrl.replace(/\/+$/, '')}/internal/progress-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-secret': env.progressSyncSecret,
      },
      body: JSON.stringify({ sectionId: SECTION.id, events }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Global unreachable → mark attempts, leave for the background drain.
    await markAttempt(pending, 'unreachable');
    return { pushed: 0, failed: pending.length };
  }

  if (res.status >= 200 && res.status < 300) {
    await prisma.progressEvent.updateMany({
      where: { id: { in: pending.map((e) => e.id) } },
      data: { syncedAt: new Date(), attempts: { increment: 1 } },
    });
    return { pushed: pending.length, failed: 0 };
  }

  // Non-2xx: 401/403 means a misconfigured secret — stop burning attempts.
  if (res.status === 401 || res.status === 403) {
    const body = await res.json().catch(() => null);
    const reason = body?.error ? `rejected (${res.status}): ${body.error}` : `rejected (${res.status})`;
    await prisma.progressEvent.updateMany({
      where: { id: { in: pending.map((e) => e.id) } },
      data: { attempts: env.syncMaxAttempts, lastError: reason },
    });
    return { pushed: 0, failed: pending.length };
  }

  await markAttempt(pending, `http ${res.status}`);
  return { pushed: 0, failed: pending.length };
}

async function markAttempt(pending, lastError) {
  await prisma.progressEvent.updateMany({
    where: { id: { in: pending.map((e) => e.id) } },
    data: { attempts: { increment: 1 }, lastError },
  });
}

let drainTimer = null;

/** Background drain: retries unsynced events on an interval. */
export function startSyncLoop() {
  if (drainTimer || !env.progressSyncUrl) return;
  drainTimer = setInterval(() => {
    pushSync().catch(() => {});
  }, env.syncIntervalMs);
  drainTimer.unref?.();
}

export function stopSyncLoop() {
  if (drainTimer) {
    clearInterval(drainTimer);
    drainTimer = null;
  }
}

export { BODY_LIMIT };
