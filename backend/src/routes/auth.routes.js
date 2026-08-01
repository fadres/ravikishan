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
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/tokens.js';

const router = Router();

async function issueTokens(user) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });
  return {
    accessToken: signAccessToken(user),
    refreshToken,
    refreshExpiresAt: expiresAt.toISOString(),
  };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    accessLevel: user.accessLevel ?? 3,
    isApproved: user.isApproved,
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

  const tokens = await issueTokens(user);
  res.status(201).json({ user: publicUser(user), ...tokens });
});

router.post('/login', validate(credentialsSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AppError(401, 'Invalid email or password');
  const pwHash = await prisma.passwordHash.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!pwHash || !(await bcrypt.compare(password, pwHash.hash))) {
    throw new AppError(401, 'Invalid email or password');
  }

  const tokens = await issueTokens(user);
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
    data: { revoked: true },
  });
  const tokens = await issueTokens(stored.user);
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

export default router;
