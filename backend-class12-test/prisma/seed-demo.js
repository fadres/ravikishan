// Demo seed for the section backend — creates the section's Class row
// (required before import-notes can run) plus a small demo tree so the
// service can be exercised end-to-end: structure, gated blocks, search
// (tsvector columns are maintained here via raw SQL) and local AI.
//
// Run: npm run seed:demo   (idempotent — safe to re-run)

import 'dotenv/config';
import { prisma } from '../src/config/db.js';
import { SECTION } from '../src/lib/section.js';

async function main() {
  const klass = await prisma.class.upsert({
    where: { slug: SECTION.classSlug },
    create: { name: SECTION.label, slug: SECTION.classSlug, sortOrder: 1 },
    update: { name: SECTION.label },
  });
  console.log(`class ${klass.slug} ready`);

  const subject = await prisma.subject.upsert({
    where: { classId_slug: { classId: klass.id, slug: 'physics' } },
    create: {
      classId: klass.id,
      name: 'Physics',
      slug: 'physics',
      subjectType: 'science_math',
      icon: 'orbit',
      themeColor: '#38bdf8',
      isLocked: true,
      sortOrder: 1,
      status: 'published',
    },
    update: { status: 'published' },
  });
  console.log(`subject ${subject.slug} ready`);

  const chapter = await prisma.chapter.upsert({
    where: { subjectId_slug: { subjectId: subject.id, slug: 'test-chapter' } },
    create: {
      subjectId: subject.id,
      title: 'Test Chapter',
      slug: 'test-chapter',
      isLocked: true,
      sortOrder: 1,
      status: 'published',
      metadata: { demo: true },
    },
    update: { status: 'published' },
  });
  console.log(`chapter ${chapter.slug} ready`);

  const blocks = [
    { blockType: 'note_topic', title: 'Introduction', contentRichtext: 'Welcome to the Class 12 test section. This block demonstrates the independent section backend.', accessLevel: 3, sortOrder: 0 },
    { blockType: 'note_concept', title: 'A Demo Concept', contentRichtext: 'A concept is defined as a general idea understood from specific instances. This is a free public block.', accessLevel: 3, sortOrder: 1 },
    { blockType: 'note_example', title: 'A Worked Example', contentRichtext: 'For example, a car moving at a constant speed covers equal distances in equal intervals of time.', accessLevel: 2, sortOrder: 2 },
    { blockType: 'formula', title: 'Key Formula', contentRichtext: 'v = u + at', contentCode: 'v = u + a*t', accessLevel: 1, sortOrder: 3 },
    { blockType: 'note_important', title: 'Important Points', contentRichtext: 'Common mistake: forgetting units. Always express answers in SI units.', accessLevel: 2, sortOrder: 4 },
    { blockType: 'mindmap', title: 'Topic Map', contentRichtext: 'Test section -> content -> search -> AI -> progress sync', mindmapJson: { name: 'Demo', children: [{ name: 'content' }, { name: 'search' }, { name: 'AI' }, { name: 'progress sync' }] }, accessLevel: 1, sortOrder: 5 },
  ];

  for (const b of blocks) {
    const exists = await prisma.contentBlock.findFirst({
      where: { chapterId: chapter.id, title: b.title },
      select: { id: true },
    });
    if (!exists) {
      await prisma.contentBlock.create({
        data: { chapterId: chapter.id, status: 'published', ...b },
      });
    } else {
      await prisma.contentBlock.update({
        where: { id: exists.id },
        data: { status: 'published' },
      });
    }
  }

  // Maintain the full-text search vectors (mirrors what the global backend's
  // import pipeline does) so /api/search works out of the box.
  await prisma.$executeRawUnsafe(`
    UPDATE "ContentBlock" SET
      search_vector_english = to_tsvector('english', coalesce(title, '') || ' ' || coalesce("contentRichtext", '') || ' ' || coalesce("contentCode", '')),
      search_vector_simple  = to_tsvector('simple',  coalesce(title, '') || ' ' || coalesce("contentRichtext", '') || ' ' || coalesce("contentCode", ''))
    WHERE search_vector_english IS NULL OR search_vector_simple IS NULL OR to_tsvector('english', coalesce(title, '') || ' ' || coalesce("contentRichtext", '') || ' ' || coalesce("contentCode", '')) != search_vector_english
  `);

  const count = await prisma.contentBlock.count({ where: { chapterId: chapter.id } });
  console.log(`demo seed complete: 1 class / 1 subject / 1 chapter / ${count} blocks`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
