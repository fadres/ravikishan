// Ensures the owner accounts exist with the configured credentials and
// privileges. Runs on every deploy (part of `npm run migrate`) so the owners
// can always log in, even if the seed script was never run or the env vars
// changed since.
//
// Also repairs a pre-existing account: missing role/approval/verification/
// access-level are corrected, and a password hash is created when the account
// has none (a common lock-out cause after schema migrations). Existing hashes
// are never clobbered, so a password the owner set via the UI stays in effect.
//
// Run:  npm run ensure-owner

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const OWNERS = [
  {
    email: (process.env.OWNER_EMAIL || 'harindarsah98172@gmail.com').toLowerCase(),
    password: process.env.OWNER_PASSWORD || '',
    displayName: 'Ravikishan',
  },
  {
    email: (process.env.OWNER_EMAIL_2 || 'yashsah231@gmail.com').toLowerCase(),
    password: process.env.OWNER_PASSWORD_2 || '',
    displayName: 'Yash Sah',
  },
  {
    email: (process.env.OWNER_EMAIL_3 || 'sahrocky81@gmail.com').toLowerCase(),
    password: process.env.OWNER_PASSWORD_3 || '',
    displayName: 'Rocky Sah',
  },
];

async function ensureOwner({ email, password, displayName }) {
  if (!password) {
    console.warn(`  ⚠ ${email}: password not set — skipped.`);
    return;
  }
  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordHashes: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const patch = existing
    ? {
        role: existing.role !== 'owner' ? 'owner' : undefined,
        isApproved: !existing.isApproved ? true : undefined,
        emailVerified: !existing.emailVerified ? true : undefined,
        accessLevel: existing.accessLevel !== 1 ? 1 : undefined,
      }
    : {};

  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        displayName,
        role: 'owner',
        isApproved: true,
        emailVerified: true,
        accessLevel: 1,
        passwordHashes: {
          create: { hash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        },
      },
    });
    console.log(`✓ Owner account created: ${email}`);
    return;
  }

  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const hasAnyHash = existing.passwordHashes.length > 0;
  if (Object.keys(cleanPatch).length > 0 || !hasAnyHash) {
    const hash = hasAnyHash ? null : await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...cleanPatch,
        ...(hasAnyHash
          ? {}
          : {
              passwordHashes: {
                create: {
                  hash,
                  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                },
              },
            }),
      },
    });
    console.log(`✓ Owner account repaired: ${email} (${Object.keys(cleanPatch).join(', ') || 'missing hash added'})`);
  } else {
    console.log(`✓ Owner account ready: ${email}`);
  }
}

async function main() {
  for (const owner of OWNERS) {
    await ensureOwner(owner);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
