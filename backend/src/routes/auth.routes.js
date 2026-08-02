import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.js';
import {
  issueVerificationToken,
  verifyEmail,
  issuePasswordResetToken,
  resetPassword,
  recordLogin,
  listLoginHistory,
} from '../services/security.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/tokens.js';

const router = Router();

const MAX_ACTIVE_SESSIONS = 10;

function clientInfo(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers['user-agent'] || '';
  return { ip, userAgent };
}

async function issueTokens(user, req) {
  // Rotate the oldest session out when a user exceeds the session cap.
  const active = await prisma.refreshToken.count({
    where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
  });
  if (active >= MAX_ACTIVE_SESSIONS) {
    const oldest = await prisma.refreshToken.findFirst({
      where: { userId: user.id, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (oldest) {
      await prisma.refreshToken.update({
        where: { id: oldest.id },
        data: { revoked: true },
      });
    }
  }

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
  const { ip, userAgent } = clientInfo(req);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt,
      ip,
      userAgent: String(userAgent).slice(0, 300),
    },
  });
  return {
    accessToken: signAccessToken(user),
    refreshToken,
    refreshExpiresAt: expiresAt.toISOString(),
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    accessLevel: user.accessLevel ?? 3,
    isApproved: user.isApproved,
    emailVerified: user.emailVerified,
    totalXp: user.totalXp ?? 0,
    createdAt: user.createdAt,
  };
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(80).optional(),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password, displayName } = req.body;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      displayName: displayName || null,
      role: 'guest',
      isApproved: false,
      passwordHashes: {
        create: { hash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      },
    },
  });

  await issueVerificationToken(user).catch(() => {});
  await recordAudit(user, 'auth.register', 'User', user.id, { email: user.email });
  const tokens = await issueTokens(user, req);
  res.status(201).json({ user: publicUser(user), ...tokens });
});

router.post('/login', validate(credentialsSchema), async (req, res) => {
  const { email, password } = req.body;
  const { ip, userAgent } = clientInfo(req);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AppError(401, 'Invalid email or password');
  const pwHash = await prisma.passwordHash.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!pwHash || !(await bcrypt.compare(password, pwHash.hash))) {
    await recordLogin(user.id, ip, userAgent, false).catch(() => {});
    throw new AppError(401, 'Invalid email or password');
  }

  await recordLogin(user.id, ip, userAgent, true).catch(() => {});
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });
  const tokens = await issueTokens(user, req);
  res.json({ user: publicUser(user), ...tokens });
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body;
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { user: true },
  });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  // Rotate: revoke the old token, issue a fresh pair.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true, lastUsedAt: new Date() },
  });
  await prisma.user.update({
    where: { id: stored.userId },
    data: { lastActiveAt: new Date() },
  });
  const tokens = await issueTokens(stored.user, req);
  res.json({ user: publicUser(stored.user), ...tokens });
});

router.post('/logout', validate(refreshSchema), async (req, res) => {
  const { refreshToken } = req.body;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    data: { revoked: true },
  });
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user: publicUser(user) });
});

// ── Email verification ──────────────────────────────

const verifyEmailSchema = z.object({ token: z.string().trim().min(20) });

router.post('/verify-email', validate(verifyEmailSchema), async (req, res) => {
  const user = await verifyEmail(req.body.token);
  await recordAudit(user, 'auth.email_verified', 'User', user.id);
  res.json({ ok: true, message: 'Email verified successfully' });
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, 'User not found');
  if (user.emailVerified) throw new AppError(400, 'Email is already verified');
  await issueVerificationToken(user);
  res.json({ ok: true, message: 'Verification email sent' });
});

// ── Password reset ──────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  await issuePasswordResetToken(req.body.email);
  res.json({
    ok: true,
    message: 'If that email is registered, a reset link has been sent.',
  });
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(8).max(128),
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  const user = await resetPassword(req.body.token, req.body.password);
  await recordAudit(user, 'auth.password_reset', 'User', user.id);
  res.json({ ok: true, message: 'Password updated — you can log in now.' });
});

router.post('/change-password', requireAuth, validate(z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const pwHash = await prisma.passwordHash.findFirst({
    where: { userId: req.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!pwHash || !(await bcrypt.compare(currentPassword, pwHash.hash))) {
    throw new AppError(400, 'Current password is incorrect');
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.passwordHash.create({
      data: {
        userId: req.user.id,
        hash,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revoked: false },
      data: { revoked: true },
    }),
  ]);
  await recordAudit(req.user, 'auth.password_changed', 'User', req.user.id);
  res.json({ ok: true, message: 'Password changed. Log in again on other devices.' });
});

// ── Session management ──────────────────────────────

router.get('/sessions', requireAuth, async (req, res) => {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId: req.user.id, revoked: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
      userAgent: true,
      ip: true,
    },
  });
  res.json({ sessions });
});

const sessionIdSchema = z.object({ id: z.string().uuid() });

router.delete('/sessions/:id', requireAuth, validate(sessionIdSchema, 'params'), async (req, res) => {
  const session = await prisma.refreshToken.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!session) throw new AppError(404, 'Session not found');
  await prisma.refreshToken.update({
    where: { id: session.id },
    data: { revoked: true },
  });
  await recordAudit(req.user, 'auth.session_revoked', 'RefreshToken', session.id);
  res.json({ ok: true });
});

router.delete('/sessions', requireAuth, async (req, res) => {
  const { refreshToken } = req.body ?? {};
  // Revoke everything except the session that issued this request.
  await prisma.refreshToken.updateMany({
    where: {
      userId: req.user.id,
      revoked: false,
      ...(refreshToken ? { tokenHash: { not: hashRefreshToken(refreshToken) } } : {}),
    },
    data: { revoked: true },
  });
  await recordAudit(req.user, 'auth.sessions_revoked_other', 'User', req.user.id);
  res.json({ ok: true });
});

// ── Login history ───────────────────────────────────

router.get('/login-history', requireAuth, async (req, res) => {
  const history = await listLoginHistory(req.user.id);
  res.json({ history });
});

export default router;
