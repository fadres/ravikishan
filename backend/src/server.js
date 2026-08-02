import bcrypt from 'bcryptjs';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { ensureBadges } from './services/badges.js';

// Ensure the owner account exists (idempotent). Uses OWNER_EMAIL /
// OWNER_PASSWORD from the environment — the same values seed.js uses, so
// production needs no one-off seed run to get an admin. Silently skipped when
// no password is configured (e.g. tests). Only creates if missing — it never
// demotes or re-points an existing account.
async function ensureOwner() {
  if (!env.ownerPassword) return;
  const email = env.ownerEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'owner') {
      console.warn(`Owner email ${email} already exists with role "${existing.role}" — leaving it untouched.`);
    }
    return;
  }
  const hash = await bcrypt.hash(env.ownerPassword, 12);
  await prisma.user.create({
    data: {
      email,
      role: 'owner',
      isApproved: true,
      displayName: 'Ravikishan',
      accessLevel: 1,
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
