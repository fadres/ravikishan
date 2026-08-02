import bcrypt from 'bcryptjs';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { ensureBadges } from './services/badges.js';

// Ensure the owner account exists and can always log in (idempotent). Uses
// OWNER_EMAIL / OWNER_PASSWORD from the environment — the same values seed.js
// uses, so production needs no one-off seed run to get an admin. Silently
// skipped when no password is configured (e.g. tests). Repairs an existing
// account too: missing hashes are created, and a non-owner email is upgraded,
// so the owner can never be locked out by a half-finished migration.
async function ensureOwner() {
  if (!env.ownerPassword) return;
  const email = env.ownerEmail.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordHashes: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (existing) {
    const patch = {};
    if (existing.role !== 'owner') patch.role = 'owner';
    if (!existing.isApproved) patch.isApproved = true;
    if (!existing.emailVerified) patch.emailVerified = true;
    if (existing.accessLevel !== 1) patch.accessLevel = 1;
    // Only bootstrap a hash when the account has none at all — the root cause
    // of lock-outs. Once hashes exist (owner changed the password via the UI)
    // we never clobber them: login picks the newest hash.
    const hasAnyHash = existing.passwordHashes.length > 0;
    if (Object.keys(patch).length > 0 || !hasAnyHash) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...patch,
          ...(hasAnyHash
            ? {}
            : {
                passwordHashes: {
                  create: {
                    hash: await bcrypt.hash(env.ownerPassword, 12),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  },
                },
              }),
        },
      });
      console.log(`Owner account ${email} repaired (role/perms/hash verified).`);
    }
    return;
  }
  const hash = await bcrypt.hash(env.ownerPassword, 12);
  await prisma.user.create({
    data: {
      email,
      role: 'owner',
      isApproved: true,
      emailVerified: true,
      accessLevel: 1,
      displayName: 'Ravikishan',
      passwordHashes: {
        create: { hash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      },
    },
  });
  console.log(`Owner account ensured for ${email}`);
}

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Ravikishan API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

startScheduler();
ensureBadges().catch((err) => {
  console.error('Badge seed failed:', err);
});

ensureOwner().catch((err) => {
  console.error('Owner bootstrap failed:', err);
});

async function shutdown() {
  console.log('Shutting down…');
  stopScheduler();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
