// Auth security helpers: one-time token lifecycle, login history and
// device parsing. Keeps auth routes thin and the token rules testable.

import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { generateOpaqueToken, hashOpaqueToken } from '../utils/tokens.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './mailer.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function parseDevice(userAgent = '') {
  const ua = String(userAgent).slice(0, 300);
  let device = 'Unknown device';
  if (/iPhone|iPad/i.test(ua)) device = 'iOS device';
  else if (/Android/i.test(ua)) device = 'Android device';
  else if (/Macintosh|Mac OS X/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux device';
  return { userAgent: ua, device };
}

// ── Email verification ──────────────────────────────

export async function issueVerificationToken(user) {
  const token = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashOpaqueToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  await sendVerificationEmail(user.email, user.displayName, token);
  return true;
}

export async function verifyEmail(rawToken) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'Invalid or expired verification link');
  }
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
  ]);
  return record.user;
}

// ── Password reset ──────────────────────────────────

export async function issuePasswordResetToken(email) {
  const user = await prisma.user.findUnique({
    where: { email: String(email || '').toLowerCase() },
  });
  // Always report success so the endpoint cannot be used to enumerate
  // registered addresses.
  if (!user) return false;
  const token = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashOpaqueToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  await sendPasswordResetEmail(user.email, user.displayName, token);
  return true;
}

export async function resetPassword(rawToken, newPassword) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'Invalid or expired reset link');
  }
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordHash.create({
      data: {
        userId: record.userId,
        hash,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    }),
    // Revoke every session so a stolen token cannot be reused.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    }),
  ]);
  return record.user;
}

// ── Login history ───────────────────────────────────

export async function recordLogin(userId, ip, userAgent, success = true) {
  const { device, userAgent: ua } = parseDevice(userAgent);
  try {
    await prisma.loginHistory.create({
      data: { userId, ip, userAgent: ua, device, success },
    });
  } catch {
    // history is best-effort — never break login for it
  }
}

export async function listLoginHistory(userId, limit = 30) {
  return prisma.loginHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
}
