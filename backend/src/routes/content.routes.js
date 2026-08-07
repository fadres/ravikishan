import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { searchContent, recommendBlocks } from '../services/search.js';
import { getQuickQuestionsAcrossSections } from '../services/quickQuestions.js';
import { sendJsonCached, clearCachedJson } from '../lib/jsonCache.js';
import {
  sectionIndexForBlockType,
  sectionLabelForBlockType,
  sectionKeyForBlockType,
  isSectionVisible,
  coverageForTopic,
} from '../lib/sections.js';

const router = Router();

const CLASS_SELECT = {
  id: true,
  name: true,
  slug: true,
  sortOrder: true,
  subjects: {
    where: { status: 'published' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      subjectType: true,
      icon: true,
      themeColor: true,
      isLocked: true,
      sortOrder: true,
      _count: {
        select: { chapters: { where: { status: 'published' } } },
      },
    },
  },
};

// GET /api/classes — public: structure (names/slugs/icons) only, never content.
// Cached in-memory (30s TTL + ETag) — this endpoint fires on every page load.
router.get('/classes', async (req, res) => {
  const classes = await prisma.class.findMany({
    orderBy: { sortOrder: 'asc' },
    select: CLASS_SELECT,
  });
  sendJsonCached(req, res, 'classes', { classes });
});

// GET /api/classes/:slug
router.get('/classes/:slug', async (req, res) => {
  const klass = await prisma.class.findUnique({
    where: { slug: req.params.slug },
    select: CLASS_SELECT,
  });
  if (!klass) throw new AppError(404, 'Class not found');
  res.json({ klass });
});

const subjectSelect = {
  id: true,
  name: true,
  slug: true,
  subjectType: true,
  icon: true,
  themeColor: true,
  isLocked: true,
  sortOrder: true,
  class: { select: { id: true, name: true, slug: true } },
  chapters: {
    where: { status: 'published' },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      title: true,
      slug: true,
      isLocked: true,
      sortOrder: true,
      _count: { select: { blocks: true } },
    },
  },
};

// GET /api/subjects/:slug?class=class-11 — public: chapters + titles + lock state.
// The optional ?class= param scopes the lookup to one class; without it the
// first class (lowest sortOrder) wins so same-slug subjects stay unambiguous.
router.get('/subjects/:slug', async (req, res) => {
  const classSlug = typeof req.query.class === 'string' ? req.query.class.trim() : '';
  const subject = await prisma.subject.findFirst({
    where: {
      slug: req.params.slug,
      status: 'published',
      ...(classSlug ? { class: { slug: classSlug } } : {}),
    },
    orderBy: { class: { sortOrder: 'asc' } },
    select: subjectSelect,
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  res.json({ subject });
});

// ── Custom subjects (owner-renamable cards under Loksewa / General Knowledge)
// GET /api/subjects/:slug/custom — public: the custom subject cards.
router.get('/subjects/:slug/custom', async (req, res) => {
  const subject = await prisma.subject.findFirst({
    where: { slug: req.params.slug, status: 'published' },
    orderBy: { class: { sortOrder: 'asc' } },
    select: { id: true },
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  const custom = await prisma.customSubject.findMany({
    where: { subjectId: subject.id },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, sortOrder: true },
  });
  res.json({ customSubjects: custom });
});

// POST /api/subjects/:slug/custom — owner/admin: add a custom subject.
router.post('/subjects/:slug/custom', requireRole('owner', 'admin'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new AppError(400, 'Name is required');
  if (name.length > 60) throw new AppError(400, 'Name must be 60 characters or fewer');
  const subject = await prisma.subject.findFirst({
    where: { slug: req.params.slug },
    orderBy: { class: { sortOrder: 'asc' } },
    select: { id: true },
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  const count = await prisma.customSubject.count({ where: { subjectId: subject.id } });
  if (count >= 12) throw new AppError(400, 'Maximum 12 custom subjects per section');
  const custom = await prisma.customSubject.create({
    data: { name, subjectId: subject.id, sortOrder: count },
    select: { id: true, name: true, sortOrder: true },
  });
  res.status(201).json({ customSubject: custom });
});

// PATCH /api/subjects/:slug/custom/:customId — owner/admin: rename.
router.patch('/subjects/:slug/custom/:customId', requireRole('owner', 'admin'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new AppError(400, 'Name is required');
  if (name.length > 60) throw new AppError(400, 'Name must be 60 characters or fewer');
  const custom = await prisma.customSubject.update({
    where: { id: req.params.customId },
    data: { name },
    select: { id: true, name: true, sortOrder: true },
  });
  res.json({ customSubject: custom });
});

// DELETE /api/subjects/:slug/custom/:customId — owner/admin: remove.
router.delete('/subjects/:slug/custom/:customId', requireRole('owner', 'admin'), async (req, res) => {
  await prisma.customSubject.delete({ where: { id: req.params.customId } });
  res.json({ ok: true });
});

const blockFullSelect = {
  id: true,
  topicId: true,
  blockType: true,
  accessLevel: true,
  title: true,
  contentRichtext: true,
  contentCode: true,
  codeLanguage: true,
  mindmapJson: true,
  diagramData: true,
  subLevel: true,
  sectionIndex: true,
  metadata: true,
  isDuplicateOf: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

// Metadata-only projection for blocks the viewer cannot read. Content fields
// (contentRichtext, contentCode, codeLanguage, mindmapJson, diagramData)
// never leave the server for inaccessible blocks.
const blockMetaOnly = (b) => ({
  id: b.id,
  topicId: b.topicId,
  blockType: b.blockType,
  accessLevel: b.accessLevel,
  title: b.title,
  subLevel: b.subLevel,
  sectionIndex: b.sectionIndex ?? sectionIndexForBlockType(b.blockType),
  sectionLabel: sectionLabelForBlockType(b.blockType),
  sectionKey: sectionKeyForBlockType(b.blockType),
  sortOrder: b.sortOrder,
});

const decorateBlock = (b, viewerLevel, dupInfo = new Map()) => {
  const sectionIndex = b.sectionIndex ?? sectionIndexForBlockType(b.blockType);
  const visible = isSectionVisible(sectionIndex, b.accessLevel, viewerLevel);
  const dup = dupInfo.get(b.id);
  const dupFields = dup
    ? { dupGroupId: dup.dupGroupId, dupTypeIndex: dup.dupTypeIndex, dupCount: dup.dupCount }
    : { dupGroupId: null, dupTypeIndex: null, dupCount: null };
  const base = {
    ...dupFields,
    id: b.id,
    topicId: b.topicId,
    blockType: b.blockType,
    accessLevel: b.accessLevel,
    title: b.title,
    subLevel: b.subLevel,
    sectionIndex,
    sectionLabel: sectionLabelForBlockType(b.blockType),
    sectionKey: sectionKeyForBlockType(b.blockType),
    sortOrder: b.sortOrder,
  };
  if (!visible) return base;
  return {
    ...base,
    contentRichtext: b.contentRichtext,
    contentCode: b.contentCode,
    codeLanguage: b.codeLanguage,
    mindmapJson: b.mindmapJson,
    diagramData: b.diagramData,
    metadata: b.metadata,
    isDuplicateOf: b.isDuplicateOf,
  };
};

// Duplicate detection: blocks whose normalized body is identical within the
// same topic are treated as repeated versions of one concept. The first is the
// original (type 1); repeats are type 2, 3, ... The API exposes dupGroupId,
// dupTypeIndex and dupCount so the frontend can collapse them into one box
// with per-version (Type 1/2/3) interfaces.
const normalizeBody = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

const computeDuplicateGroups = (blocks) => {
  const groups = new Map();
  for (const b of blocks) {
    const body = normalizeBody(b.contentRichtext);
    if (!body || body.length < 40) continue;
    const key = `${b.topicId || 'untitled'}|${b.blockType}|${body}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const info = new Map();
  let groupSeq = 0;
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const groupId = `dup-${++groupSeq}`;
    group.forEach((b, i) =>
      info.set(b.id, { dupGroupId: groupId, dupTypeIndex: i + 1, dupCount: group.length })
    );
  }
  return info;
};

// GET /api/subjects/:subjectSlug/chapters/:chapterSlug
// Structured-notes endpoint: blocks are returned grouped by topic and in
// canonical section order (sectionIndex, then sortOrder). Automatic content
// degradation: a viewer only receives the sections allowed by their tier
// (public ≈10% → premium 100%), combined with the per-block accessLevel gate.
router.get('/subjects/:subjectSlug/chapters/:chapterSlug', authenticate, async (req, res) => {
  const classSlug = typeof req.query.class === 'string' ? req.query.class.trim() : '';
  const subject = await prisma.subject.findFirst({
    where: {
      slug: req.params.subjectSlug,
      status: 'published',
      ...(classSlug ? { class: { slug: classSlug } } : {}),
    },
    orderBy: { class: { sortOrder: 'asc' } },
    include: { chapters: { where: { slug: req.params.chapterSlug, status: 'published' } } },
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  const chapter = subject.chapters[0];
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const viewerLevel = req.user?.accessLevel ?? 4;

  const [blocks, topics] = await Promise.all([
    prisma.contentBlock.findMany({
      where: { chapterId: chapter.id },
      // Canonical render order: topic → sectionIndex → manual order.
      orderBy: [{ topicId: 'asc' }, { sectionIndex: 'asc' }, { sortOrder: 'asc' }],
      select: blockFullSelect,
    }),
    prisma.topic.findMany({
      where: { chapterId: chapter.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        sortOrder: true,
        metadata: true,
        validationReport: true,
      },
    }),
  ]);

  // Degradation: compute per-topic coverage and hide out-of-tier sections.
  const dupInfo = computeDuplicateGroups(blocks);
  const topicCoverage = new Map();
  const blocksByTopic = new Map();
  for (const b of blocks) {
    const key = b.topicId || 'untitled';
    if (!blocksByTopic.has(key)) blocksByTopic.set(key, []);
    blocksByTopic.get(key).push(b);
  }
  for (const [key, topicBlocks] of blocksByTopic) {
    topicCoverage.set(key, coverageForTopic(topicBlocks, viewerLevel));
  }

  res.json({
    chapter: {
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      viewerAccessLevel: viewerLevel,
      canRead: true, // gating now happens per block, not per chapter
    },
    subject: { id: subject.id, name: subject.name, slug: subject.slug, themeColor: subject.themeColor },
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      sortOrder: t.sortOrder,
      metadata: t.metadata,
      validationReport: t.validationReport,
      coveragePercent: topicCoverage.get(t.id) ?? 0,
      premium: topicCoverage.get(t.id) === 100,
    })),
    blocks: blocks.map((b) => decorateBlock(b, viewerLevel, dupInfo)),
  });
});

// GET /api/quick/questions — home-page / dashboard quick review pool. Always
// 4 options, correct answer index included so the box can reveal it and keep
// a history. Questions come from published quiz MCQs + content blocks
// (keywords, formulas, concepts) across EVERY active section, gated by the
// viewer's access level.
router.get('/quick/questions', async (req, res) => {
  const viewerLevel = req.user?.accessLevel ?? 4;
  const limit = Math.min(60, Math.max(10, Number.parseInt(req.query.limit, 10) || 40));
  const questions = await getQuickQuestionsAcrossSections(viewerLevel, {
    limit,
    token: req.headers.authorization ?? null,
  });
  res.json({ questions, count: questions.length });
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  subject: z.string().trim().optional(),
  class: z.string().trim().optional(),
  type: z.string().trim().optional(),
  section: z.enum(['topic', 'learning', 'diagram', 'concept', 'examples', 'important', 'mind_recall', 'pyq', 'solved', 'premium', 'references']).optional(),
  access: z.coerce.number().int().min(1).max(3).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(50).optional(),
});

// GET /api/search?q= — live search, ranked by ts_rank, grouped client-side.
// Snippets are gated per block by the viewer's access level (default 3) and
// the viewer's section limit (automatic degradation).
router.get('/search', authenticate, validate(searchSchema, 'query'), async (req, res) => {
  const q = req.validated.q;
  const viewerLevel = req.user?.accessLevel ?? 4;
  const filters = {
    subjectSlug: req.validated.subject,
    classSlug: req.validated.class,
    blockType: req.validated.type,
    section: req.validated.section,
    accessLevel: req.validated.access,
    page: req.validated.page,
    perPage: req.validated.perPage,
  };
  const data = await searchContent(q, viewerLevel, filters);
  const recommendations =
    data.results.length < 3
      ? await recommendBlocks(data.results.map((r) => r.id), viewerLevel)
      : [];

  res.json({
    query: q,
    results: data.results,
    totalCount: data.totalCount,
    page: data.page,
    totalPages: data.totalPages,
    recommendations,
    suggestions: data.suggestions ?? [],
  });
});

export default router;
