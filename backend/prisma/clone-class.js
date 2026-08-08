// ─────────────────────────────────────────────────────────────────────────
// clone-class.js — create Class 11E as a one-time snapshot of Class 11.
//
// Class 11E is a content-variant section of the SAME Class 11 database:
// an exact copy of Class 11's content tree (subjects, custom subjects,
// chapters, topics, blocks) under a new Class row with slug `class-11e`.
// The extra solutions then get added to 11E on top of the copy — via the
// import-notes pipeline (`--section class-11e`) or the admin CMS.
//
// What is copied (content only, per design):
//   • Class row            slug `class-11e`, name "Class 11E"
//   • Subjects             same slugs under the new class
//   • CustomSubjects       one-to-one per subject
//   • Chapters             same slugs per subject
//   • Topics               same slugs per chapter (ids remapped)
//   • ContentBlocks        matched by (chapter, blockType, title) like the
//                          import pipeline; topicId remapped to the copy
//
// What is NOT copied: quizzes, flashcard decks, exams, user progress,
// bookmarks, content versions, decision makers, tags. 11E is an
// independent snapshot — study features and future edits on either class
// never touch the other.
//
// Idempotent: safe to run repeatedly. The Class/subject/chapter/topic rows
// are upserted by slug; blocks are upserted by (chapter, blockType, title).
// A re-run REFRESHES the copy from Class 11 (recent edits on the source
// propagate, while 11E-only edits are kept — a new source block is created,
// an existing 11E block with the same key is overwritten). Use --apply to
// write; default is a read-only dry-run.
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { requireSection } from '../src/lib/sections.config.js';
import { prismaForSection } from '../src/config/db.js';

const SOURCE_SECTION = 'class-11';
const TARGET_SLUG = 'class-11e';
const TARGET_NAME = 'Class 11E';
const TARGET_SORT = 3;

const flags = { apply: false };
for (const arg of process.argv.slice(2)) {
  if (arg === '--apply') flags.apply = true;
  else if (arg === '--dry-run') flags.apply = false;
  else {
    console.error(`✗ unknown flag: ${arg}\n  run: node prisma/clone-class.js [--apply] [--dry-run]`);
    process.exit(1);
  }
}

const db = prismaForSection(SOURCE_SECTION);
const report = { subjects: 0, customSubjects: 0, chapters: 0, topics: 0, blocks: 0, skippedBlocks: 0 };

async function clone() {
  const source = await db.class.findUnique({ where: { slug: SOURCE_SECTION } });
  if (!source) {
    console.error(`✗ Class row "${SOURCE_SECTION}" not found in section "${SOURCE_SECTION}" database — run the seed first.`);
    process.exit(1);
  }

  // Class row (upsert — idempotent).
  const target = await db.class.upsert({
    where: { slug: TARGET_SLUG },
    update: { name: TARGET_NAME, sortOrder: TARGET_SORT },
    create: { name: TARGET_NAME, slug: TARGET_SLUG, sortOrder: TARGET_SORT },
  });
  if (!flags.apply) console.log(`[dry-run] would create class ${TARGET_SLUG} (${TARGET_NAME})`);

  const sourceSubjects = await db.subject.findMany({
    where: { classId: source.id },
    include: { customSubjects: true },
    orderBy: { sortOrder: 'asc' },
  });

  for (const s of sourceSubjects) {
    // ── Subject ──────────────────────────────────────────────────────────
    const subject = await db.subject.upsert({
      where: { classId_slug: { classId: target.id, slug: s.slug } },
      update: {
        name: s.name, subjectType: s.subjectType, icon: s.icon, themeColor: s.themeColor,
        isLocked: s.isLocked, sortOrder: s.sortOrder, status: s.status, description: s.description,
        difficulty: s.difficulty,
      },
      create: {
        classId: target.id, name: s.name, slug: s.slug, subjectType: s.subjectType,
        icon: s.icon, themeColor: s.themeColor, isLocked: s.isLocked, sortOrder: s.sortOrder,
        status: s.status, description: s.description, difficulty: s.difficulty,
      },
    });
    report.subjects += 1;
    if (!flags.apply) console.log(`  [dry-run] subject ${s.slug}`);

    // ── Custom subjects ──────────────────────────────────────────────────
    for (const cs of s.customSubjects) {
      await db.customSubject.upsert({
        where: { id: `clone:${cs.id}` },
        update: { name: cs.name, subjectId: subject.id, sortOrder: cs.sortOrder },
        create: { id: `clone:${cs.id}`, name: cs.name, subjectId: subject.id, sortOrder: cs.sortOrder },
      });
      report.customSubjects += 1;
    }

    // ── Chapters ─────────────────────────────────────────────────────────
    const sourceChapters = await db.chapter.findMany({
      where: { subjectId: s.id },
      orderBy: { sortOrder: 'asc' },
    });
    for (const ch of sourceChapters) {
      const chapter = await db.chapter.upsert({
        where: { subjectId_slug: { subjectId: subject.id, slug: ch.slug } },
        update: {
          title: ch.title, isLocked: ch.isLocked, sortOrder: ch.sortOrder, status: ch.status,
          prerequisites: ch.prerequisites, readingTime: ch.readingTime, metadata: ch.metadata ?? undefined,
        },
        create: {
          subjectId: subject.id, title: ch.title, slug: ch.slug, isLocked: ch.isLocked,
          sortOrder: ch.sortOrder, status: ch.status, prerequisites: ch.prerequisites,
          readingTime: ch.readingTime, metadata: ch.metadata ?? undefined,
        },
      });
      report.chapters += 1;
      if (!flags.apply) console.log(`    [dry-run] chapter ${ch.slug}`);

      // ── Topics (remap ids for blocks) ──────────────────────────────────
      const sourceTopics = await db.topic.findMany({
        where: { chapterId: ch.id },
        orderBy: { sortOrder: 'asc' },
      });
      const topicIdMap = new Map();
      for (const t of sourceTopics) {
        const topic = await db.topic.upsert({
          where: { chapterId_slug: { chapterId: chapter.id, slug: t.slug } },
          update: {
            title: t.title, description: t.description, sortOrder: t.sortOrder, status: t.status,
            metadata: t.metadata ?? undefined, validationReport: t.validationReport ?? undefined,
          },
          create: {
            chapterId: chapter.id, title: t.title, slug: t.slug, description: t.description,
            sortOrder: t.sortOrder, status: t.status, metadata: t.metadata ?? undefined,
            validationReport: t.validationReport ?? undefined,
          },
        });
        topicIdMap.set(t.id, topic.id);
        report.topics += 1;
      }

      // ── Blocks (upsert by chapter + blockType + title, like import) ───
      const sourceBlocks = await db.contentBlock.findMany({
        where: { chapterId: ch.id },
        orderBy: { sortOrder: 'asc' },
      });
      for (const b of sourceBlocks) {
        const existing = await db.contentBlock.findFirst({
          where: { chapterId: chapter.id, blockType: b.blockType, title: b.title },
          orderBy: { createdAt: 'asc' },
        });
        const payload = {
          chapterId: chapter.id,
          topicId: b.topicId ? (topicIdMap.get(b.topicId) ?? null) : null,
          blockType: b.blockType,
          status: b.status,
          accessLevel: b.accessLevel,
          difficulty: b.difficulty,
          title: b.title,
          contentRichtext: b.contentRichtext,
          contentCode: b.contentCode,
          codeLanguage: b.codeLanguage,
          mindmapJson: b.mindmapJson ?? undefined,
          diagramData: b.diagramData ?? undefined,
          subLevel: b.subLevel,
          classifiedBy: b.classifiedBy,
          sectionIndex: b.sectionIndex,
          metadata: b.metadata ?? undefined,
          isDuplicateOf: b.isDuplicateOf,
          sortOrder: b.sortOrder,
        };
        if (existing) {
          await db.contentBlock.update({ where: { id: existing.id }, data: payload });
        } else {
          await db.contentBlock.create({ data: payload });
        }
        report.blocks += 1;
      }
    }
  }

  console.log(
    `\n  summary (${flags.apply ? 'apply' : 'dry-run'}): ` +
      `subjects=${report.subjects} customSubjects=${report.customSubjects} chapters=${report.chapters} ` +
      `topics=${report.topics} blocks=${report.blocks}`,
  );
  if (!flags.apply) console.log('\n  dry-run: no DB writes performed. Re-run with --apply to clone.');
  console.log('  Class 11E is now an independent snapshot — add its extra solutions via');
  console.log('  npm run import-11e (files under backend/content/class-11e) or the admin CMS.');
}

clone()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
