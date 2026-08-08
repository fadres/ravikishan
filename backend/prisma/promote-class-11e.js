// ─────────────────────────────────────────────────────────────────────────
// promote-class-11e.js — copy one Class 11E draft type into Class 11.
//
// Class 11E is the staging area: every note is saved as type 1, type 2, ...
// (ContentBlock.noteType). When the owner decides a draft is the final
// "original", this script pastes every block of that type into its
// respective place in Class 11 (same subject slug + chapter slug), stored
// as noteType 1 with status "published".
//
// Matching is exactly like the import pipeline: upsert by
// (chapter, blockType, title). A matching Class 11 block is overwritten —
// that is the point of "paste the original into Class 11".
//
// Usage: node prisma/promote-class-11e.js --type <N> [--apply] [--dry-run]
//
// Idempotent: re-running the same type re-pastes the same content (no-op
// when nothing changed). Dry-run by default — use --apply to write.
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { prismaForSection } from '../src/config/db.js';

const flags = { type: null, apply: false };
for (const arg of process.argv.slice(2)) {
  if (arg === '--apply') flags.apply = true;
  else if (arg === '--dry-run') flags.apply = false;
  else if (arg === '--type') flags.type = null; // consumed below (two-arg form)
  else if (/^--type=(\d+)$/.test(arg)) flags.type = Number(arg.match(/^--type=(\d+)$/)[1]);
  else if (flags.type === null && /^\d+$/.test(arg)) flags.type = Number(arg);
  else {
    console.error(`✗ unknown flag: ${arg}\n  run: node prisma/promote-class-11e.js --type <N> [--apply] [--dry-run]`);
    process.exit(1);
  }
}
if (!flags.type) {
  console.error('✗ missing --type <N> (the Class 11E draft type to promote into Class 11)');
  process.exit(1);
}

const e = prismaForSection('class-11e');
const c = prismaForSection('class-11');
const report = { blocks: 0, created: 0, updated: 0, skippedNoChapter: 0, skippedDraftOnly: 0 };

async function promote() {
  const srcClass = await e.class.findUnique({ where: { slug: 'class-11e' } });
  if (!srcClass) throw new Error('Class 11E row not found — run the clone first (npm run clone:11e -- --apply)');
  const subjects = await e.subject.findMany({
    where: { classId: srcClass.id },
    include: { chapters: { include: { blocks: { where: { noteType: flags.type } } } } },
  });

  for (const subject of subjects) {
    const dstSubject = await c.subject.findUnique({ where: { classId_slug: { classId: (await c.class.findUnique({ where: { slug: 'class-11' } })).id, slug: subject.slug } } });
    if (!dstSubject) {
      console.log(`  [skip] subject ${subject.slug} has no Class 11 counterpart`);
      continue;
    }
    for (const chapter of subject.chapters) {
      if (!chapter.blocks.length) continue;
      const dstChapter = await c.chapter.findUnique({
        where: { subjectId_slug: { subjectId: dstSubject.id, slug: chapter.slug } },
      });
      if (!dstChapter) {
        report.skippedNoChapter += chapter.blocks.length;
        console.log(`  [skip] chapter ${subject.slug}/${chapter.slug} not found in Class 11`);
        continue;
      }
      for (const b of chapter.blocks) {
        const existing = await c.contentBlock.findFirst({
          where: { chapterId: dstChapter.id, blockType: b.blockType, title: b.title, noteType: 1 },
          orderBy: { createdAt: 'asc' },
        });
        let dstTopicId = null;
        if (b.topicId) {
          const srcTopic = await e.topic.findUnique({ where: { id: b.topicId } });
          if (srcTopic) {
            const dstTopic = await c.topic.findUnique({
              where: { chapterId_slug: { chapterId: dstChapter.id, slug: srcTopic.slug } },
            });
            dstTopicId = dstTopic?.id ?? null;
          }
        }
        const payload = {
          topicId: dstTopicId,
          blockType: b.blockType,
          noteType: 1,
          status: 'published',
          accessLevel: b.accessLevel,
          difficulty: b.difficulty,
          title: b.title,
          contentRichtext: b.contentRichtext,
          contentCode: b.contentCode,
          codeLanguage: b.codeLanguage,
          mindmapJson: b.mindmapJson ?? undefined,
          diagramData: b.diagramData ?? undefined,
          subLevel: b.subLevel,
          classifiedBy: 'auto',
          sectionIndex: b.sectionIndex,
          metadata: { ...(b.metadata ?? {}), promotedFrom: 'class-11e', noteType: flags.type },
          isDuplicateOf: b.isDuplicateOf,
          sortOrder: b.sortOrder,
        };
        if (flags.apply) {
          if (existing) {
            await c.contentBlock.update({ where: { id: existing.id }, data: payload });
            report.updated += 1;
          } else {
            await c.contentBlock.create({ data: { ...payload, chapterId: dstChapter.id } });
            report.created += 1;
          }
        }
        report.blocks += 1;
      }
    }
  }

  console.log(
    `\n  summary (${flags.apply ? 'apply' : 'dry-run'}): promoted type ${flags.type} blocks=${report.blocks} ` +
      `created=${report.created} updated=${report.updated} skippedNoChapter=${report.skippedNoChapter}`,
  );
  if (!flags.apply) console.log('\n  dry-run: no DB writes performed. Re-run with --apply to promote.');
}

promote()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await e.$disconnect();
    await c.$disconnect();
  });
