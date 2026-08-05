// In-app notification service. Push (web-push) is attempted when a
// VAPID key is configured and the user has an active subscription; failures
// are silent so notifications never break the main request.

import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

export async function createNotification(userId, type, title, body, link, icon) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title: String(title).slice(0, 160),
      body: body ? String(body).slice(0, 500) : null,
      link: link ?? null,
      icon: icon ?? null,
    },
  });
  // Best-effort browser push alongside the in-app notification.
  sendPushToUser(userId, {
    title: notification.title,
    body: notification.body,
    icon,
    link,
    notificationId: notification.id,
    type,
  }).catch(() => {});
  return notification;
}

export async function listNotifications(userId, { limit = 30, unreadOnly = false } = {}) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
}

export async function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId, id) {
  const n = await prisma.notification.findFirst({ where: { id, userId } });
  if (!n) throw Object.assign(new Error('Notification not found'), { status: 404 });
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

// ── Push subscriptions ──────────────────────────────

export async function savePushSubscription(userId, subscription) {
  if (!subscription?.endpoint) return null;
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: subscription.endpoint },
  });
  if (existing) {
    if (existing.userId !== userId) {
      await prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: { userId },
      });
    }
    return existing;
  }
  return prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys ?? {},
    },
  });
}

export async function deletePushSubscription(endpoint, userId) {
  if (!endpoint) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}

// Best-effort web push when configured; never throws to the caller.
export async function sendPushToUser(userId, payload) {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  try {
    const webpush = await import('web-push');
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    for (const sub of subs) {
      webpush.sendNotification(sub, JSON.stringify(payload)).catch(() => {});
    }
    return subs.length > 0;
  } catch {
    return false;
  }
}
