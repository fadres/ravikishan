import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { authenticate, canReadLocked } from '../middleware/auth.js';
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

const blockListSelect = {
  id: true,
  blockType: true,
  title: true,
  subLevel: true,
  sortOrder: true,
};

const blockFullSelect = {
  id: true,
  blockType: true,
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

// GET /api/subjects/:subjectSlug/chapters/:chapterSlug
// THE locked-content rule lives here: when the subject or chapter is locked
// and the caller is not an approved reader (owner/admin/member), only block
// metadata is returned — content fields never leave the server.
router.get('/subjects/:subjectSlug/chapters/:chapterSlug', authenticate, async (req, res) => {
  const subject = await prisma.subject.findFirst({
    where: { slug: req.params.subjectSlug },
    include: { chapters: { where: { slug: req.params.chapterSlug } } },
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  const chapter = subject.chapters[0];
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const locked = subject.isLocked || chapter.isLocked;
  const readable = !locked || canReadLocked(req.user);

  const blocks = await prisma.contentBlock.findMany({
    where: { chapterId: chapter.id },
    orderBy: { sortOrder: 'asc' },
    select: readable ? blockFullSelect : blockListSelect,
  });

  res.json({
    chapter: {
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      isLocked: locked,
      canRead: readable,
    },
    subject: { id: subject.id, name: subject.name, slug: subject.slug, themeColor: subject.themeColor },
    blocks,
  });
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

// GET /api/search?q= — live search, ranked by ts_rank, grouped client-side.
router.get('/search', authenticate, validate(searchSchema, 'query'), async (req, res) => {
  const q = req.validated.q;
  const canRead = canReadLocked(req.user);
  const results = await searchContent(q, canRead);
  const recommendations =
    results.length < 3
      ? await recommendBlocks(results.map((r) => r.id), canRead)
      : [];

  res.json({ query: q, results, recommendations });
});

export default router;
