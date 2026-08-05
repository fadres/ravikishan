import { Prisma } from '@prisma/client';
import { prisma, prismaForSection } from '../config/db.js';
import { requireSection, activeSections } from '../lib/sections.config.js';
import {
  sectionIndexForBlockType,
  sectionLabelForBlockType,
  sectionKeyForBlockType,
  isSectionVisible,
} from '../lib/sections.js';

const SNIPPET_OPTIONS = 'MaxWords=25, MinWords=6, MaxFragments=1, StartSel=<<, StopSel=>>';

function filterSql(filters, viewerLevel) {
  const { subjectSlug, classSlug, blockType, accessLevel } = filters;
  const parts = [];
  if (subjectSlug) parts.push(Prisma.sql`AND s.slug = ${subjectSlug}`);
  if (classSlug) parts.push(Prisma.sql`AND c.slug = ${classSlug}`);
  if (blockType) parts.push(Prisma.sql`AND cb."blockType" = ${blockType}`);
  if (accessLevel !== undefined) {
    parts.push(Prisma.sql`AND cb."accessLevel" >= ${Math.max(accessLevel, viewerLevel)}`);
  }
  return parts.length ? Prisma.join(parts, ' ') : Prisma.empty;
}

const SECTION_TYPE_SQL = new Map([
  ['diagram', Prisma.sql`cb."blockType" = 'mindmap'`],
  ['concept', Prisma.sql`cb."blockType" IN ('note_concept','note_statement','formula','symbols','byakaran')`],
  ['examples', Prisma.sql`cb."blockType" IN ('note_example','numerical')`],
  ['important', Prisma.sql`cb."blockType" IN ('note_important','important_points')`],
  ['mind_recall', Prisma.sql`cb."blockType" IN ('keywords','mind_recall')`],
  ['pyq', Prisma.sql`cb."blockType" = 'pyq'`],
  ['solved', Prisma.sql`cb."blockType" = 'solved_example'`],
  ['premium', Prisma.sql`cb."blockType" = 'premium_expansion'`],
  ['references', Prisma.sql`cb."blockType" IN ('reference','revision_summary','summary')`],
  ['topic', Prisma.sql`cb."blockType" = 'note_topic'`],
  ['learning', Prisma.sql`cb."blockType" = 'learning_outcome'`],
]);

// The client is a parameter so section-scoped search can run against a
// section's own database (searchWithinSection) while the global endpoint
// keeps using the global client.
export async function searchContent(q, viewerLevel = 3, filters = {}, db = prisma) {
  const { subjectSlug, classSlug, blockType, accessLevel, section, page = 1, perPage = 25 } = filters;
  const offset = (page - 1) * perPage;
  const sectionFilter = section ? SECTION_TYPE_SQL.get(section) : null;

  // The 'english' tsvector only indexes latin text, so a Devanagari query can
  // never match it — skip that query (and its scan) entirely.
  const hasDevanagari = /[\u0900-\u097F]/.test(q);

  const englishQuery = hasDevanagari
    ? Promise.resolve([])
    : db.$queryRaw`
    SELECT cb.id,
           cb.title,
           cb."blockType",
           cb."subLevel",
           cb."accessLevel",
           cb."difficulty",
           cb."sectionIndex",
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
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
    ORDER BY rank DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const simpleQuery = db.$queryRaw`
    SELECT cb.id,
           cb.title,
           cb."blockType",
           cb."subLevel",
           cb."accessLevel",
           cb."difficulty",
           cb."sectionIndex",
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
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
    ORDER BY rank DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const countQuery = db.$queryRaw`
    SELECT COUNT(DISTINCT cb.id)::int AS total
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE (cb.search_vector_english @@ plainto_tsquery('english', ${q})
        OR cb.search_vector_simple @@ plainto_tsquery('simple', ${q}))
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
  `;

  const chapterRows = db.$queryRaw`
    SELECT ch.id, ch.title, ch.slug AS "chapterSlug",
           s.name AS "subjectName", s.slug AS "subjectSlug",
           c.slug AS "classSlug", c.name AS "className",
           (ch.title ILIKE ${q + '%'})::int AS "isPrefix"
    FROM "Chapter" ch
    JOIN "Subject" s ON s.id = ch."subjectId"
    JOIN "Class" c ON c.id = s."classId"
    WHERE ch.status = 'published' AND s.status = 'published'
      AND (ch.title ILIKE ${'%' + q + '%'} OR ch.slug ILIKE ${'%' + q + '%'})
    ${subjectSlug ? Prisma.sql`AND s.slug = ${subjectSlug}` : Prisma.empty}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
    ORDER BY "isPrefix" DESC, ch.title
    LIMIT 8
  `;

  const chapterCountRows = db.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM "Chapter" ch
    JOIN "Subject" s ON s.id = ch."subjectId"
    JOIN "Class" c ON c.id = s."classId"
    WHERE ch.status = 'published' AND s.status = 'published'
      AND (ch.title ILIKE ${'%' + q + '%'} OR ch.slug ILIKE ${'%' + q + '%'})
    ${subjectSlug ? Prisma.sql`AND s.slug = ${subjectSlug}` : Prisma.empty}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
  `;

  const subjectRows = db.$queryRaw`
    SELECT s.id, s.name, s.slug AS "subjectSlug",
           c.slug AS "classSlug", c.name AS "className",
           (s.name ILIKE ${q + '%'})::int AS "isPrefix"
    FROM "Subject" s
    JOIN "Class" c ON c.id = s."classId"
    WHERE s.status = 'published'
      AND s.name ILIKE ${'%' + q + '%'}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
    ORDER BY "isPrefix" DESC, s.name
    LIMIT 6
  `;

  const subjectCountRows = db.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM "Subject" s
    JOIN "Class" c ON c.id = s."classId"
    WHERE s.status = 'published'
      AND s.name ILIKE ${'%' + q + '%'}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
  `;

  const [english, simple, countRows, chapters, chapterCount, subjects, subjectCount] = await Promise.all([
    englishQuery,
    simpleQuery,
    countQuery,
    chapterRows,
    chapterCountRows,
    subjectRows,
    subjectCountRows,
  ]);

  const merged = new Map();
  for (const row of [...english, ...simple]) {
    const existing = merged.get(row.id);
    if (!existing || (row.rank ?? 0) > (existing.rank ?? 0)) merged.set(row.id, row);
  }

  // Chapters and subjects that match the query itself — ranked above content
  // blocks so "cell" surfaces the chapter, not just inner notes.
  for (const row of chapters) {
    merged.set(`chapter-${row.id}`, {
      id: row.id,
      kind: 'chapter',
      blockType: 'chapter',
      title: row.title ?? '',
      chapter: { title: row.title ?? '', slug: row.chapterSlug },
      subject: { name: row.subjectName, slug: row.subjectSlug },
      klass: { name: row.className, slug: row.classSlug },
      rank: row.isPrefix ? 1000 : 900,
      accessLevel: 3,
      locked: false,
      snippet: null,
      sectionIndex: null,
    });
  }
  for (const row of subjects) {
    merged.set(`subject-${row.id}`, {
      id: row.id,
      kind: 'subject',
      blockType: 'subject',
      title: row.name ?? '',
      chapter: { title: '', slug: '' },
      subject: { name: row.name ?? '', slug: row.subjectSlug },
      klass: { name: row.className, slug: row.classSlug },
      rank: row.isPrefix ? 950 : 850,
      accessLevel: 3,
      locked: false,
      snippet: null,
      sectionIndex: null,
    });
  }

  const results = [...merged.values()]
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .map((row) => {
      if (row.kind) return row;
      const blockAccess = row.accessLevel ?? 3;
      const sectionIndex = row.sectionIndex ?? sectionIndexForBlockType(row.blockType);
      const visible = isSectionVisible(sectionIndex, blockAccess, viewerLevel);
      const headline = row.snippetEn || row.snippetSimple || '';
      return {
        id: row.id,
        kind: 'block',
        title: row.title ?? '',
        blockType: row.blockType,
        accessLevel: blockAccess,
        difficulty: row.difficulty ?? 'easy',
        subLevel: row.subLevel ?? null,
        sectionIndex,
        sectionLabel: sectionLabelForBlockType(row.blockType),
        sectionKey: sectionKeyForBlockType(row.blockType),
        chapter: { title: row.chapterTitle, slug: row.chapterSlug },
        subject: { name: row.subjectName, slug: row.subjectSlug },
        klass: { name: row.className, slug: row.classSlug },
        rank: Number(row.rank ?? 0),
        locked: !visible,
        snippet: visible ? stripHeadline(headline) : null,
      };
    });

  const blockTotal = Number(countRows?.[0]?.total ?? 0);
  const totalCount =
    blockTotal +
    Number(chapterCount?.[0]?.total ?? 0) +
    Number(subjectCount?.[0]?.total ?? 0);

  return { results, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) };
}

/**
 * Section-scoped search: runs the full search pipeline against ONE section's
 * own database and answers only from that section's content. Unknown section
 * ids throw UNKNOWN_SECTION (never fall back to another section's DB). Every
 * result is tagged with sectionId so cross-section consumers (and the
 * frontend) can attribute it.
 */
export async function searchWithinSection(sectionId, q, viewerLevel = 3, filters = {}) {
  const section = requireSection(sectionId);
  const db = prismaForSection(section.id);
  const { results, ...rest } = await searchContent(q, viewerLevel, filters, db);
  return {
    ...rest,
    sectionId: section.id,
    sectionLabel: section.label,
    results: results.map((r) => ({ ...r, sectionId: section.id })),
  };
}

/**
 * Cross-section search: fans out to every ACTIVE section in parallel and
 * merges the ranked results. Each section is queried through its own client
 * (searchWithinSection) — one section's outage or unknown-id failure is
 * reported in `failed` and never takes the whole search down. Results keep
 * their sectionId tags so consumers can attribute them.
 */
export async function searchAcrossSections(q, viewerLevel = 3, filters = {}) {
  const sections = activeSections();
  const perSectionFilters = { ...filters, page: 1, perPage: Math.max(filters.perPage ?? 25, 100) };

  const settled = await Promise.allSettled(
    sections.map((s) => searchWithinSection(s.id, q, viewerLevel, perSectionFilters)),
  );

  const failed = [];
  const merged = new Map();
  let totalCount = 0;
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const outcome = settled[i];
    if (outcome.status === 'rejected') {
      failed.push({ sectionId: section.id, error: outcome.reason?.message ?? 'section search failed' });
      continue;
    }
    totalCount += outcome.value.totalCount;
    for (const result of outcome.value.results) {
      merged.set(`${section.id}:${result.kind}:${result.id}`, result);
    }
  }

  const all = [...merged.values()].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const offset = (page - 1) * perPage;

  return {
    sectionIds: sections.map((s) => s.id),
    results: all.slice(offset, offset + perPage),
    totalCount,
    page,
    perPage,
    totalPages: Math.ceil(totalCount / perPage),
    failed,
  };
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
