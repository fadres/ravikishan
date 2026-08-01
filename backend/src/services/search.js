import { prisma } from '../config/db.js';

const SNIPPET_OPTIONS = 'MaxWords=25, MinWords=6, MaxFragments=1, StartSel=<<, StopSel=>>';

// Full-text search over content_blocks using Postgres tsvector + ts_rank.
// `viewerLevel` (1 = most premium … 3 = free) decides which blocks include
// snippets: a block is readable when accessLevel >= viewerLevel. Titles and
// metadata are always returned; content snippets never leak for higher tiers.
export async function searchContent(q, viewerLevel = 3) {
  const englishQuery = prisma.$queryRaw`
    SELECT cb.id,
           cb.title,
           cb."blockType",
           cb."subLevel",
           cb."accessLevel",
           ch.title AS "chapterTitle",
           ch.slug   AS "chapterSlug",
           s.name    AS "subjectName",
           s.slug    AS "subjectSlug",
           c.slug    AS "classSlug",
           c.name    AS "className",
           ts_headline(
             'english',
             coalesce(cb.title, '') || ' ' || coalesce(cb."contentRichtext", ''),
             plainto_tsquery('english', ${q}),
             ${SNIPPET_OPTIONS}
           ) AS "snippetEn",
           ts_rank(cb.search_vector_english, plainto_tsquery('english', ${q})) AS rank
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE cb.search_vector_english @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT 25
  `;

  const simpleQuery = prisma.$queryRaw`
    SELECT cb.id,
           cb.title,
           cb."blockType",
           cb."subLevel",
           cb."accessLevel",
           ch.title AS "chapterTitle",
           ch.slug   AS "chapterSlug",
           s.name    AS "subjectName",
           s.slug    AS "subjectSlug",
           c.slug    AS "classSlug",
           c.name    AS "className",
           ts_headline(
             'simple',
             coalesce(cb.title, '') || ' ' || coalesce(cb."contentRichtext", ''),
             plainto_tsquery('simple', ${q}),
             ${SNIPPET_OPTIONS}
           ) AS "snippetSimple",
           ts_rank(cb.search_vector_simple, plainto_tsquery('simple', ${q})) AS rank
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE cb.search_vector_simple @@ plainto_tsquery('simple', ${q})
    ORDER BY rank DESC
    LIMIT 25
  `;

  const [english, simple] = await Promise.all([englishQuery, simpleQuery]);

  const merged = new Map();
  for (const row of [...english, ...simple]) {
    const existing = merged.get(row.id);
    if (!existing || (row.rank ?? 0) > (existing.rank ?? 0)) merged.set(row.id, row);
  }

  return [...merged.values()]
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 25)
    .map((row) => {
      const readable = (row.accessLevel ?? 3) >= viewerLevel;
      const headline = row.snippetEn || row.snippetSimple || '';
      return {
        id: row.id,
        title: row.title ?? '',
        blockType: row.blockType,
        accessLevel: row.accessLevel ?? 3,
        subLevel: row.subLevel ?? null,
        chapter: { title: row.chapterTitle, slug: row.chapterSlug },
        subject: { name: row.subjectName, slug: row.subjectSlug },
        klass: { name: row.className, slug: row.classSlug },
        rank: Number(row.rank ?? 0),
        locked: !readable,
        snippet: readable ? stripHeadline(headline) : null,
      };
    });
}

// Recommendations when the user gets few/no results: sibling blocks from the
// same chapters as whatever did match (falling back to the same subjects).
// Only blocks the viewer could actually read are recommended.
export async function recommendBlocks(excludeIds = [], viewerLevel = 3, limit = 6) {
  const excluded = excludeIds.length ? { id: { notIn: excludeIds } } : {};
  const rows = await prisma.contentBlock.findMany({
    where: {
      ...excluded,
      accessLevel: { gte: viewerLevel },
    },
    include: {
      chapter: { include: { subject: { include: { class: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title ?? '',
    blockType: row.blockType,
    accessLevel: row.accessLevel ?? 3,
    subLevel: row.subLevel ?? null,
    chapter: { title: row.chapter.title, slug: row.chapter.slug },
    subject: { name: row.chapter.subject.name, slug: row.chapter.subject.slug },
    klass: { name: row.chapter.subject.class.name, slug: row.chapter.subject.class.slug },
    rank: 0,
    locked: false,
    snippet: null,
  }));
}

function stripHeadline(headline) {
  return headline
    .replaceAll('<<', '')
    .replaceAll('>>', '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
