import { Prisma } from '@prisma/client';
import { prisma, prismaForSection } from '../config/db.js';
import { requireSection, activeSections } from '../lib/sections.config.js';
import { remoteSectionSearch } from './remoteSection.js';
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

// ── Powerful query building ───────────────────────────────────────────────
// The raw query is tokenized (latin + Devanagari + digits), and every token
// becomes a PREFIX tsquery ("kinem" matches "kinematics"). Tokens are AND-ed
// for the strict pass; when that is too narrow, an OR pass widens the net.
// Every piece is passed as a bound parameter — never string-interpolated.

function tokenizeQuery(q) {
  return String(q || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ''))
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

// SQL expression: to_tsquery(config, 'token:*') joined with && or ||.
function tsquerySql(config, tokens, op) {
  if (!tokens.length) return Prisma.sql`''::tsquery`;
  const join = op === 'or' ? Prisma.sql` || ` : Prisma.sql` && `;
  return tokens
    .map((t) => Prisma.sql`to_tsquery(${config}::regconfig, ${`${t}:*`})`)
    .reduce((acc, piece) => Prisma.sql`${acc}${join}${piece}`);
}

const BLOCK_COLS = Prisma.sql`
       cb.id,
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
       c.name    AS "className"
`;

function blockSearchQuery(db, config, tokens, op, q, filters, viewerLevel, sectionFilter, perPage, offset, rankFactor = 1) {
  const tq = tsquerySql(config, tokens, op);
  const vector = config === 'english' ? Prisma.sql`cb.search_vector_english` : Prisma.sql`cb.search_vector_simple`;
  const snippetAlias = config === 'english' ? Prisma.sql`snippetEn` : Prisma.sql`snippetSimple`;
  return db.$queryRaw`
    SELECT ${BLOCK_COLS},
           ts_headline(
             ${config}::regconfig,
             coalesce(cb.title, '') || ' ' || coalesce(cb."contentRichtext", ''),
             ${tq},
             ${SNIPPET_OPTIONS}
           ) AS ${snippetAlias},
           ts_rank(${vector}, ${tq}) * ${rankFactor} AS rank
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE ${vector} @@ ${tq}
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
    ORDER BY rank DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;
}

function blockCountQuery(db, config, tokens, op, filters, viewerLevel, sectionFilter) {
  const tq = tsquerySql(config, tokens, op);
  const vector = config === 'english' ? Prisma.sql`cb.search_vector_english` : Prisma.sql`cb.search_vector_simple`;
  return db.$queryRaw`
    SELECT COUNT(DISTINCT cb.id)::int AS total
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE ${vector} @@ ${tq}
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
  `;
}

// Blocks whose TITLE matches the raw text — catches symbols, numbers and
// words the tsvector never indexed ("H₂O", "3.2", Devanagari titles).
function blockTitleQuery(db, q, filters, viewerLevel, sectionFilter) {
  return db.$queryRaw`
    SELECT ${BLOCK_COLS},
           (cb.title ILIKE ${`${q}%`})::int * 20 + 800 AS rank,
           cb.title AS "snippetSimple"
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE cb.title ILIKE ${`%${q}%`}
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
    ORDER BY rank DESC, cb.title
    LIMIT 12
  `;
}

function blockTitleCountQuery(db, q, filters, viewerLevel, sectionFilter) {
  return db.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM "ContentBlock" cb
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE cb.title ILIKE ${`%${q}%`}
    AND ch.status = 'published'
    AND s.status = 'published'
    ${sectionFilter ? Prisma.sql`AND ${sectionFilter}` : Prisma.empty}
    ${filterSql(filters, viewerLevel)}
  `;
}

function topicQuery(db, q, filters) {
  const { subjectSlug, classSlug } = filters;
  return db.$queryRaw`
    SELECT tp.id, tp.title, tp.description,
           ch.title AS "chapterTitle", ch.slug AS "chapterSlug",
           s.name AS "subjectName", s.slug AS "subjectSlug",
           c.slug AS "classSlug", c.name AS "className",
           (tp.title ILIKE ${`${q}%`})::int * 60 + 820 AS rank
    FROM "Topic" tp
    JOIN "Chapter" ch ON ch.id = tp."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE tp.status = 'published'
      AND ch.status = 'published'
      AND s.status = 'published'
      AND (tp.title ILIKE ${`%${q}%`} OR coalesce(tp.description, '') ILIKE ${`%${q}%`})
    ${subjectSlug ? Prisma.sql`AND s.slug = ${subjectSlug}` : Prisma.empty}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
    ORDER BY rank DESC, tp.title
    LIMIT 8
  `;
}

function topicCountQuery(db, q, filters) {
  const { subjectSlug, classSlug } = filters;
  return db.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM "Topic" tp
    JOIN "Chapter" ch ON ch.id = tp."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE tp.status = 'published'
      AND ch.status = 'published'
      AND s.status = 'published'
      AND (tp.title ILIKE ${`%${q}%`} OR coalesce(tp.description, '') ILIKE ${`%${q}%`})
    ${subjectSlug ? Prisma.sql`AND s.slug = ${subjectSlug}` : Prisma.empty}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
  `;
}

// Blocks carrying a Tag whose name matches the query ("tag:" style recall).
function tagBlockQuery(db, q, filters, viewerLevel) {
  return db.$queryRaw`
    SELECT ${BLOCK_COLS},
           t.name AS "tagName",
           t.name AS "snippetSimple",
           700::int AS rank
    FROM "ContentBlock" cb
    JOIN "BlockTag" bt ON bt."blockId" = cb.id
    JOIN "Tag" t ON t.id = bt."tagId"
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE t.name ILIKE ${`%${q}%`}
    AND ch.status = 'published'
    AND s.status = 'published'
    ${filterSql(filters, viewerLevel)}
    ORDER BY cb.title
    LIMIT 10
  `;
}

function tagCountQuery(db, q, filters) {
  const { subjectSlug, classSlug, blockType, accessLevel } = filters;
  const parts = [];
  if (subjectSlug) parts.push(Prisma.sql`AND s.slug = ${subjectSlug}`);
  if (classSlug) parts.push(Prisma.sql`AND c.slug = ${classSlug}`);
  if (blockType) parts.push(Prisma.sql`AND cb."blockType" = ${blockType}`);
  if (accessLevel !== undefined) parts.push(Prisma.sql`AND cb."accessLevel" >= ${accessLevel}`);
  const filterPart = parts.length ? Prisma.join(parts, ' ') : Prisma.empty;
  return db.$queryRaw`
    SELECT COUNT(DISTINCT cb.id)::int AS total
    FROM "ContentBlock" cb
    JOIN "BlockTag" bt ON bt."blockId" = cb.id
    JOIN "Tag" t ON t.id = bt."tagId"
    JOIN "Chapter" ch ON ch.id = cb."chapterId"
    JOIN "Subject" s  ON s.id = ch."subjectId"
    JOIN "Class" c    ON c.id = s."classId"
    WHERE t.name ILIKE ${`%${q}%`}
    AND ch.status = 'published'
    AND s.status = 'published'
    ${filterPart}
  `;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const curr = [i];
    for (let j = 1; j <= n; j += 1) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[n];
}

// "Did you mean" — when nothing matched, fetch short title candidates and
// return the closest by Levenshtein distance (typo tolerance).
async function fuzzySuggestions(db, q, tokens, limit = 4) {
  if (tokens.length !== 1) return [];
  const tok = tokens[0];
  if (tok.length < 3 || tok.length > 24) return [];
  const [titles, chapters, topics] = await Promise.all([
    db.$queryRaw`SELECT cb.title AS t FROM "ContentBlock" cb WHERE cb.title IS NOT NULL AND length(cb.title) <= 32 ORDER BY length(cb.title) LIMIT 300`,
    db.$queryRaw`SELECT ch.title AS t FROM "Chapter" ch WHERE ch.title IS NOT NULL AND length(ch.title) <= 32 LIMIT 150`,
    db.$queryRaw`SELECT tp.title AS t FROM "Topic" tp WHERE tp.title IS NOT NULL AND length(tp.title) <= 32 LIMIT 150`,
  ]);
  const maxDist = Math.max(1, Math.floor(tok.length / 4));
  const seen = new Set();
  const ranked = [];
  for (const row of [...titles, ...chapters, ...topics]) {
    const text = String(row.t || '').trim();
    if (!text || text.length < 2) continue;
    const lower = text.toLowerCase();
    if (lower.includes(tok) || seen.has(lower)) continue;
    const dist = levenshtein(tok, lower);
    if (dist <= maxDist) {
      seen.add(lower);
      ranked.push({ text, dist });
    }
  }
  return ranked
    .sort((a, b) => a.dist - b.dist || a.text.length - b.text.length)
    .slice(0, limit)
    .map((r) => ({ text: r.text }));
}

function mergeRows(rows) {
  const merged = new Map();
  for (const row of rows) {
    const existing = merged.get(row.id);
    if (!existing || (row.rank ?? 0) > (existing.rank ?? 0)) merged.set(row.id, row);
  }
  return [...merged.values()];
}

function plainText(s, n = 140) {
  const t = String(s || '')
    .replace(/[#*_`~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

// The client is a parameter so section-scoped search can run against a
// section's own database (searchWithinSection) while the global endpoint
// keeps using the global client.
export async function searchContent(q, viewerLevel = 3, filters = {}, db = prisma) {
  const { subjectSlug, classSlug, blockType, accessLevel, section, page = 1, perPage = 25 } = filters;
  const offset = (page - 1) * perPage;
  const sectionFilter = section ? SECTION_TYPE_SQL.get(section) : null;
  const tokens = tokenizeQuery(q);

  // The 'english' tsvector only indexes latin text, so a Devanagari query can
  // never match it — skip that query (and its scan) entirely.
  const hasDevanagari = /[\u0900-\u097F]/.test(q);
  const configs = hasDevanagari ? ['simple'] : ['english', 'simple'];

  // Pass 1 — strict AND, prefix-matched tokens.
  const pass1 = { rows: [], total: 0 };
  for (const cfg of configs) {
    const [rows, total] = await Promise.all([
      blockSearchQuery(db, cfg, tokens, 'and', q, filters, viewerLevel, sectionFilter, perPage, offset),
      blockCountQuery(db, cfg, tokens, 'and', filters, viewerLevel, sectionFilter),
    ]);
    pass1.rows.push(...rows);
    pass1.total += Number(total?.[0]?.total ?? 0);
  }

  let blockRows = mergeRows(pass1.rows);
  let blockTotal = pass1.total;

  // Pass 2 — relaxed OR fallback when strict matching was too narrow.
  if (blockRows.length < 3 && tokens.length > 1) {
    const pass2 = { rows: [], total: 0 };
    for (const cfg of configs) {
      const [rows, total] = await Promise.all([
        blockSearchQuery(db, cfg, tokens, 'or', q, filters, viewerLevel, sectionFilter, perPage, offset, 0.5),
        blockCountQuery(db, cfg, tokens, 'or', filters, viewerLevel, sectionFilter),
      ]);
      pass2.rows.push(...rows);
      pass2.total += Number(total?.[0]?.total ?? 0);
    }
    blockRows = mergeRows(pass2.rows);
    blockTotal = pass2.total;
  }

  const chapterRows = db.$queryRaw`
    SELECT ch.id, ch.title, ch.slug AS "chapterSlug",
           s.name AS "subjectName", s.slug AS "subjectSlug",
           c.slug AS "classSlug", c.name AS "className",
           (ch.title ILIKE ${`${q}%`})::int * 100 + 900 AS rank
    FROM "Chapter" ch
    JOIN "Subject" s ON s.id = ch."subjectId"
    JOIN "Class" c ON c.id = s."classId"
    WHERE ch.status = 'published' AND s.status = 'published'
      AND (ch.title ILIKE ${`%${q}%`} OR ch.slug ILIKE ${`%${q}%`})
    ${subjectSlug ? Prisma.sql`AND s.slug = ${subjectSlug}` : Prisma.empty}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
    ORDER BY rank DESC, ch.title
    LIMIT 8
  `;

  const chapterCountRows = db.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM "Chapter" ch
    JOIN "Subject" s ON s.id = ch."subjectId"
    JOIN "Class" c ON c.id = s."classId"
    WHERE ch.status = 'published' AND s.status = 'published'
      AND (ch.title ILIKE ${`%${q}%`} OR ch.slug ILIKE ${`%${q}%`})
    ${subjectSlug ? Prisma.sql`AND s.slug = ${subjectSlug}` : Prisma.empty}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
  `;

  const subjectRows = db.$queryRaw`
    SELECT s.id, s.name, s.slug AS "subjectSlug",
           c.slug AS "classSlug", c.name AS "className",
           (s.name ILIKE ${`${q}%`})::int * 100 + 850 AS rank
    FROM "Subject" s
    JOIN "Class" c ON c.id = s."classId"
    WHERE s.status = 'published'
      AND s.name ILIKE ${`%${q}%`}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
    ORDER BY rank DESC, s.name
    LIMIT 6
  `;

  const subjectCountRows = db.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM "Subject" s
    JOIN "Class" c ON c.id = s."classId"
    WHERE s.status = 'published'
      AND s.name ILIKE ${`%${q}%`}
    ${classSlug ? Prisma.sql`AND c.slug = ${classSlug}` : Prisma.empty}
  `;

  const [chapters, chapterCount, subjects, subjectCount, topics, topicCount, tagBlocks, tagCount, ilikeRows, ilikeCount, suggestions] =
    await Promise.all([
      chapterRows,
      chapterCountRows,
      subjectRows,
      subjectCountRows,
      topicQuery(db, q, filters),
      topicCountQuery(db, q, filters),
      tagBlockQuery(db, q, filters, viewerLevel),
      tagCountQuery(db, q, filters),
      blockTitleQuery(db, q, filters, viewerLevel, sectionFilter),
      blockTitleCountQuery(db, q, filters, viewerLevel, sectionFilter),
      fuzzySuggestions(db, q, tokens),
    ]);

  // Ranked merge: subjects/chapters/topics above blocks (a title match beats
  // an inner mention), tag + title-ILIKE blocks between them.
  const merged = new Map();
  for (const row of [...blockRows, ...ilikeRows, ...tagBlocks]) {
    const existing = merged.get(row.id);
    if (!existing || (row.rank ?? 0) > (existing.rank ?? 0)) merged.set(row.id, row);
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
      rank: Number(row.rank ?? 850),
      accessLevel: 3,
      locked: false,
      snippet: null,
    });
  }
  for (const row of chapters) {
    merged.set(`chapter-${row.id}`, {
      id: row.id,
      kind: 'chapter',
      blockType: 'chapter',
      title: row.title ?? '',
      chapter: { title: row.title ?? '', slug: row.chapterSlug },
      subject: { name: row.subjectName, slug: row.subjectSlug },
      klass: { name: row.className, slug: row.classSlug },
      rank: Number(row.rank ?? 900),
      accessLevel: 3,
      locked: false,
      snippet: null,
    });
  }
  for (const row of topics) {
    merged.set(`topic-${row.id}`, {
      id: row.id,
      kind: 'topic',
      blockType: 'topic',
      title: row.title ?? '',
      chapter: { title: row.chapterTitle, slug: row.chapterSlug },
      subject: { name: row.subjectName, slug: row.subjectSlug },
      klass: { name: row.className, slug: row.classSlug },
      rank: Number(row.rank ?? 820),
      accessLevel: 3,
      locked: false,
      snippet: row.description ? plainText(row.description) : null,
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
        matchedTag: row.tagName ?? null,
      };
    });

  const blockTotal2 = blockTotal +
    Number(ilikeCount?.[0]?.total ?? 0) +
    Number(tagCount?.[0]?.total ?? 0);
  const totalCount =
    blockTotal2 +
    Number(chapterCount?.[0]?.total ?? 0) +
    Number(subjectCount?.[0]?.total ?? 0) +
    Number(topicCount?.[0]?.total ?? 0);

  return { results, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage), suggestions };
}

/**
 * Section-scoped search: runs the full search pipeline against ONE section's
 * own database and answers only from that section's content. Unknown section
 * ids throw UNKNOWN_SECTION (never fall back to another section's DB). Every
 * result is tagged with sectionId so cross-section consumers (and the
 * frontend) can attribute it.
 */
export async function searchWithinSection(sectionId, q, viewerLevel = 3, filters = {}, ctx = {}) {
  const section = requireSection(sectionId);
  // Independent-service section → proxy to its own backendUrl (the global
  // backend never connects to a hosted section's database).
  if (section.backendUrl) {
    return remoteSectionSearch(section, q, viewerLevel, filters, ctx.token ?? null);
  }
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
export async function searchAcrossSections(q, viewerLevel = 3, filters = {}, ctx = {}) {
  const sections = activeSections();
  const perSectionFilters = { ...filters, page: 1, perPage: Math.max(filters.perPage ?? 25, 100) };

  const settled = await Promise.allSettled(
    sections.map((s) => searchWithinSection(s.id, q, viewerLevel, perSectionFilters, ctx)),
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
