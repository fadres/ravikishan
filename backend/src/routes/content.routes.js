import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { searchContent, recommendBlocks } from '../services/search.js';

const router = Router();

const CLASS_SELECT = {
  id: true,
  name: true,
  slug: true,
  sortOrder: true,
  subjects: {
    orderBy: { sortOrder: 'asc' },
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

// GET /api/subjects/:slug — public: chapters + titles + lock state.
router.get('/subjects/:slug', async (req, res) => {
  const subject = await prisma.subject.findFirst({
    where: { slug: req.params.slug },
    select: subjectSelect,
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  res.json({ subject });
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
  const subject = await prisma.subject.findFirst({
    where: { slug: req.params.subjectSlug },
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
});

// GET /api/search?q= — live search, ranked by ts_rank, grouped client-side.
// Snippets are gated per block by the viewer's access level (default 3).
router.get('/search', authenticate, validate(searchSchema, 'query'), async (req, res) => {
  const q = req.validated.q;
  const viewerLevel = req.user?.accessLevel ?? 3;
  const results = await searchContent(q, viewerLevel);
  const recommendations =
    results.length < 3
      ? await recommendBlocks(results.map((r) => r.id), viewerLevel)
      : [];

  res.json({ query: q, results, recommendations });
});

export default router;
