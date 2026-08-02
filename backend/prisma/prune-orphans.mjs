// Drop DB chapters that no longer exist in the content folders / navigation.
// Run after: npm run content:restructure → npm run content:import.
//
// Run:  npm run content:prune

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const HERE = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const SUBJECTS = ['physics', 'chemistry', 'mathematics', 'biology', 'english', 'nepali', 'loksewa', 'general-knowledge'];

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// A chapter is kept when its slug appears in the navigation JSON or as a
// content folder on disk. Anything else is an orphan.
const keepBySubject = new Map();
for (const id of SUBJECTS) {
  const keep = new Set();
  const navFile = join(HERE, 'import-data', 'navigation', `${id}.json`);
  if (existsSync(navFile)) {
    const nav = JSON.parse(readFileSync(navFile, 'utf8'));
    for (const c of nav.chapters || []) keep.add(slugify(c.id));
  }
  const dir = join(HERE, 'import-data', 'content', id);
  if (existsSync(dir)) {
    for (const folder of readdirSync(dir)) keep.add(slugify(folder));
  }
  keepBySubject.set(id, keep);
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
