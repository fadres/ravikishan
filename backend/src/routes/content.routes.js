import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { searchContent, recommendBlocks } from '../services/search.js';

const router = Router();

const CLASS_SELECT = {
  id: true,
  name: true,
  slug: true,
  sortOrder: true,
  subjects: {
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
      _count: { select: { chapters: true } },
    },
  },
};

// GET /api/classes — public: structure (names/slugs/icons) only, never content.
router.get('/classes', async (_req, res) => {
  const classes = await prisma.class.findMany({
    orderBy: { sortOrder: 'asc' },
    select: CLASS_SELECT,
  });
  res.json({ classes });
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
    where: { slug: req.params.slug },
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
  blockType: true,
  accessLevel: true,
  title: true,
  contentRichtext: true,
  contentCode: true,
  codeLanguage: true,
  mindmapJson: true,
  diagramData: true,
  subLevel: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

// Metadata-only projection for blocks the viewer cannot read. Content fields
// (contentRichtext, contentCode, codeLanguage, mindmapJson, diagramData)
// never leave the server for inaccessible blocks.
const blockMetaOnly = (b) => ({
  id: b.id,
  blockType: b.blockType,
  accessLevel: b.accessLevel,
  title: b.title,
  subLevel: b.subLevel,
  sortOrder: b.sortOrder,
});

// GET /api/subjects/:subjectSlug/chapters/:chapterSlug
// Access tiers (spec): each block carries accessLevel 1 (most premium) – 3
// (free). A block is readable when accessLevel >= the viewer's accessLevel.
// Everything else about the subject/chapter is public — visitors see the
// whole structure, titles and lock state, and only premium *content* is gated.
router.get('/subjects/:subjectSlug/chapters/:chapterSlug', authenticate, async (req, res) => {
  const classSlug = typeof req.query.class === 'string' ? req.query.class.trim() : '';
  const subject = await prisma.subject.findFirst({
    where: {
      slug: req.params.subjectSlug,
      ...(classSlug ? { class: { slug: classSlug } } : {}),
    },
    orderBy: { class: { sortOrder: 'asc' } },
    include: { chapters: { where: { slug: req.params.chapterSlug } } },
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  const chapter = subject.chapters[0];
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const viewerLevel = req.user?.accessLevel ?? 3;

  const blocks = await prisma.contentBlock.findMany({
    where: { chapterId: chapter.id },
    // Content flow: free (3) → members (2) → premium (1), then manual order.
    orderBy: [{ accessLevel: 'desc' }, { sortOrder: 'asc' }],
    select: blockFullSelect,
  });

  res.json({
    chapter: {
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      viewerAccessLevel: viewerLevel,
      canRead: true, // gating now happens per block, not per chapter
    },
    subject: { id: subject.id, name: subject.name, slug: subject.slug, themeColor: subject.themeColor },
    blocks: blocks.map((b) => (b.accessLevel >= viewerLevel ? b : blockMetaOnly(b))),
  });
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  subject: z.string().trim().optional(),
  class: z.string().trim().optional(),
  type: z.string().trim().optional(),
  access: z.number().int().min(1).max(3).optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(50).optional(),
});

// GET /api/search?q= — live search, ranked by ts_rank, grouped client-side.
// Snippets are gated per block by the viewer's access level (default 3).
router.get('/search', authenticate, validate(searchSchema, 'query'), async (req, res) => {
  const q = req.validated.q;
  const viewerLevel = req.user?.accessLevel ?? 3;
  const filters = {
    subjectSlug: req.validated.subject,
    classSlug: req.validated.class,
    blockType: req.validated.type,
    accessLevel: req.validated.access,
    page: req.validated.page,
    perPage: req.validated.perPage,
  };
  const data = await searchContent(q, viewerLevel, filters);
  const recommendations =
    data.results.length < 3
      ? await recommendBlocks(data.results.map((r) => r.id), viewerLevel)
      : [];

  res.json({ query: q, results: data.results, totalCount: data.totalCount, page: data.page, totalPages: data.totalPages, recommendations });
});

export default router;
