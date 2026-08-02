import { prisma } from './src/config/db.js';

const email = process.argv[2] || 'smoke@test.ravikishan';

const user = await prisma.user.update({
  where: { email },
  data: { role: 'admin', isApproved: true, accessLevel: 2 },
});
console.log(`promoted ${user.email} -> role=${user.role} accessLevel=${user.accessLevel}`);
await prisma.$disconnect();
