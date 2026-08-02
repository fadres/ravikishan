import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  savePushSubscription,
  deletePushSubscription,
} from '../services/notifications.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { limit, unread } = req.query;
  const notifications = await listNotifications(req.user.id, {
    limit: parseInt(limit || '30', 10),
    unreadOnly: unread === 'true',
  });
  const count = await unreadCount(req.user.id);
  res.json({ notifications, unreadCount: count });
});

router.post('/:id/read', async (req, res) => {
  const notification = await markRead(req.user.id, req.params.id);
  res.json({ notification });
});

router.post('/read-all', async (req, res) => {
  const { count } = await markAllRead(req.user.id);
  res.json({ ok: true, count });
});

// ── Push subscriptions (PWA) ────────────────────────

const pushSchema = z.object({
  endpoint: z.string().trim().url().max(500),
  keys: z.record(z.string()).optional(),
});

router.post('/push/subscribe', validate(pushSchema), async (req, res) => {
  const sub = await savePushSubscription(req.user.id, req.body);
  res.status(201).json({ ok: true, subscription: sub });
});

router.post('/push/unsubscribe', validate(z.object({ endpoint: z.string().trim().max(500) })), async (req, res) => {
  await deletePushSubscription(req.body.endpoint);
  res.json({ ok: true });
});

export default router;
