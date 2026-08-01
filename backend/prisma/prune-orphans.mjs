// Drop DB chapters that no longer exist in the restructured content folders.
// Run after: npm run content:restructure → npm run content:import.
//
// Run:  npm run content:prune

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const HERE = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const SUBJECTS = ['physics', 'chemistry', 'mathematics', 'biology'];

const keepBySubject = new Map();
for (const id of SUBJECTS) {
  const nav = JSON.parse(readFileSync(join(HERE, 'import-data', 'navigation', `${id}.json`), 'utf8'));
  keepBySubject.set(id, new Set(nav.chapters.map((c) => c.id)));
}

const klass = await prisma.class.findUnique({ where: { slug: 'class-11' } });
if (!klass) {
  console.log('✗ class-11 not found');
  process.exit(0);
}

for (const subjectSlug of SUBJECTS) {
  const subject = await prisma.subject.findUnique({
    where: { classId_slug: { classId: klass.id, slug: subjectSlug } },
  });
  if (!subject) continue;
  const chapters = await prisma.chapter.findMany({
    where: { subjectId: subject.id },
    select: { id: true, slug: true, _count: { select: { blocks: true } } },
  });
  const keep = keepBySubject.get(subjectSlug);
  const orphans = chapters.filter((c) => !keep.has(c.slug));
  if (!orphans.length) {
    console.log(`  ${subjectSlug}: all ${chapters.length} chapters mapped ✓`);
    continue;
  }
  for (const c of orphans) {
    await prisma.chapter.delete({ where: { id: c.id } });
    console.log(`  ✗ deleted orphan chapter "${c.slug}" (${c._count.blocks} blocks)`);
  }
}

console.log('\nPrune done.');
