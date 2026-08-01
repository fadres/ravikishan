// Ensures the owner account exists with the configured credentials.
// Runs on every deploy (part of `npm run migrate`) so the owner can always
// log in with OWNER_EMAIL / OWNER_PASSWORD, even if the seed script was
// never run or the env vars changed since.
//
// Run:  npm run ensure-owner
// Fallbacks match prisma/seed.js.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const ownerEmail = (process.env.OWNER_EMAIL || 'owner@ravikishan.com').toLowerCase();
const ownerPassword = process.env.OWNER_PASSWORD || 'Ravikishan@2026!';

async function main() {
  const passwordHash = await bcrypt.hash(ownerPassword, 12);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { role: 'owner', isApproved: true, passwordHash },
    create: {
      email: ownerEmail,
      passwordHash,
      displayName: 'Ravikishan',
      role: 'owner',
      isApproved: true,
    },
  });
  console.log(`✓ Owner account ready: ${owner.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
