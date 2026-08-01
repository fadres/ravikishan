import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../utils/tokens.js';

const router = Router();

const requestSchema = z.object({
  email: z.string().trim().email().max(254).optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
  message: z.string().trim().min(5).max(2000),
});

async function issueTokens(user) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return {
    accessToken: signAccessToken(user),
    refreshToken,
  };
}

// POST /api/access-requests
// Authenticated users may send { message } only.
// Anonymous visitors send { email, displayName, message } — an account is
// created for them (random password) so the owner can approve it, and they
// are logged in automatically.
router.post('/', validate(requestSchema), async (req, res) => {
  const { email, displayName, message } = req.body;

  let user;
  if (req.user) {
    user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError(401, 'Account not found');
  } else {
    if (!email || !displayName) {
      throw new AppError(400, 'Email and display name are required for new visitors');
    }
    const normalized = email.toLowerCase();
    user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      // Random unguessable password — the account is activated when the owner
      // approves and the student uses the refresh token flow.
    const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    user = await prisma.user.create({
      data: {
        email: normalized,
        displayName,
        role: 'guest',
        isApproved: false,
        passwordHashes: {
          create: { hash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        },
      },
    });
    }
  }

  const existing = await prisma.accessRequest.findFirst({
    where: { userId: user.id, status: 'pending' },
  });
  if (existing) {
    return res.status(409).json({ error: 'You already have a pending request — the owner will respond soon.' });
  }

  const request = await prisma.accessRequest.create({
    data: { userId: user.id, email: user.email, message },
  });
  await recordAudit(user, 'access.requested', 'AccessRequest', request.id, { message });

  const tokens = req.user ? {} : { ...(await issueTokens(user)) };

  res.status(201).json({
    request: { id: request.id, status: request.status, requestedAt: request.requestedAt },
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    created: !req.user,
    ...tokens,
  });
});

export default router;
