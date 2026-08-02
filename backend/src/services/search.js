import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

const SNIPPET_OPTIONS = 'MaxWords=25, MinWords=6, MaxFragments=1, StartSel=<<, StopSel=>>';

function filterSql(filters) {
  const { subjectSlug, classSlug, blockType, accessLevel } = filters;
  const parts = [];
  if (subjectSlug) parts.push(Prisma.sql`AND s.slug = ${subjectSlug}`);
  if (classSlug) parts.push(Prisma.sql`AND c.slug = ${classSlug}`);
  if (blockType) parts.push(Prisma.sql`AND cb."blockType" = ${blockType}`);
  if (accessLevel !== undefined) parts.push(Prisma.sql`AND cb."accessLevel" <= ${accessLevel}`);
  return parts.length ? Prisma.join(parts, ' ') : Prisma.empty;
}

export async function searchContent(q, viewerLevel = 3, filters = {}) {
  const { subjectSlug, classSlug, blockType, accessLevel, page = 1, perPage = 25 } = filters;
  const offset = (page - 1) * perPage;

  const englishQuery = prisma.$queryRaw`
    SELECT cb.id,
           cb.title,
           cb."blockType",
           cb."subLevel",
           cb."accessLevel",
           cb."difficulty",
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
    ${filterSql(filters)}
    ORDER BY rank DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const simpleQuery = prisma.$queryRaw`
    SELECT cb.id,
           cb.title,
           cb."blockType",
           cb."subLevel",
           cb."accessLevel",
           cb."difficulty",
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
    ${filterSql(filters)}
    ORDER BY rank DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const [english, simple] = await Promise.all([englishQuery, simpleQuery]);

  const merged = new Map();
  for (const row of [...english, ...simple]) {
    const existing = merged.get(row.id);
    if (!existing || (row.rank ?? 0) > (existing.rank ?? 0)) merged.set(row.id, row);
  }

  const results = [...merged.values()]
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .map((row) => {
      const readable = (row.accessLevel ?? 3) >= viewerLevel;
      const headline = row.snippetEn || row.snippetSimple || '';
      return {
        id: row.id,
        title: row.title ?? '',
        blockType: row.blockType,
        accessLevel: row.accessLevel ?? 3,
        difficulty: row.difficulty ?? 'easy',
        subLevel: row.subLevel ?? null,
        chapter: { title: row.chapterTitle, slug: row.chapterSlug },
        subject: { name: row.subjectName, slug: row.subjectSlug },
        klass: { name: row.className, slug: row.classSlug },
        rank: Number(row.rank ?? 0),
        locked: !readable,
        snippet: readable ? stripHeadline(headline) : null,
      };
    });

  const totalCount = await prisma.contentBlock.count({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { contentRichtext: { contains: q, mode: 'insensitive' } },
      ],
    },
  });

  return { results, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) };
}

export async function searchGlobal(q, viewerLevel = 3) {
  const [blocks, topics, tags] = await Promise.all([
    searchContent(q, viewerLevel),
    prisma.topic.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        chapter: { select: { id: true, title: true, slug: true, subject: { select: { name: true, slug: true } } } },
      },
      take: 10,
    }),
    prisma.tag.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 10,
    }),
  ]);

  return {
    blocks: blocks.results,
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: 'topic',
      chapter: { title: t.chapter.title, slug: t.chapter.slug },
      subject: { name: t.chapter.subject.name, slug: t.chapter.subject.slug },
    })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, type: 'tag' })),
  };
}

export async function getSearchSuggestions(q, viewerLevel = 3) {
  if (q.length < 2) return [];
  const [blockTitles, topicTitles, tagNames] = await Promise.all([
    prisma.contentBlock.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      select: { title: true },
      take: 5,
    }),
    prisma.topic.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      select: { title: true },
      take: 5,
    }),
    prisma.tag.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { name: true },
      take: 5,
    }),
  ]);
  return [
    ...blockTitles.map((b) => ({ text: b.title, type: 'block' })),
    ...topicTitles.map((t) => ({ text: t.title, type: 'topic' })),
    ...tagNames.map((t) => ({ text: t.name, type: 'tag' })),
  ];
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
    difficulty: row.difficulty ?? 'easy',
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
