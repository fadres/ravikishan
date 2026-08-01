import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.js';
import { notifyMembersContent } from '../services/mailer.js';
import { suggestForSubject, ALLOWED_BLOCK_TYPES } from '../services/classifier.js';

const router = Router();
router.use(requireRole('owner', 'admin'));

// ── Access requests ──────────────────────────────────────────────────────

router.get('/requests', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
  const requests = await prisma.accessRequest.findMany({
    where: { status },
    orderBy: { requestedAt: 'desc' },
    include: {
      user: {
        select: { id: true, email: true, displayName: true, role: true, accessLevel: true, isApproved: true, createdAt: true },
      },
      resolvedBy: { select: { id: true, email: true } },
    },
  });
  res.json({ requests });
});

router.post('/requests/:id/approve', async (req, res) => {
  const request = await prisma.accessRequest.findUnique({ where: { id: req.params.id } });
  if (!request) throw new AppError(404, 'Request not found');
  if (request.status !== 'pending') throw new AppError(409, 'Request already resolved');

  await prisma.$transaction([
    prisma.accessRequest.update({
      where: { id: request.id },
      data: { status: 'approved', resolvedAt: new Date(), resolvedById: req.user.id },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: { role: 'member', isApproved: true, accessLevel: 1 },
    }),
  ]);
  await recordAudit(req.user, 'access.approved', 'AccessRequest', request.id, { userId: request.userId });

  const updated = await prisma.accessRequest.findUnique({
    where: { id: request.id },
    include: {
      user: {
        select: { id: true, email: true, displayName: true, role: true, accessLevel: true, isApproved: true },
      },
    },
  });
  res.json({ request: updated });
});

router.post('/requests/:id/deny', async (req, res) => {
  const request = await prisma.accessRequest.findUnique({ where: { id: req.params.id } });
  if (!request) throw new AppError(404, 'Request not found');
  if (request.status !== 'pending') throw new AppError(409, 'Request already resolved');

  const updated = await prisma.accessRequest.update({
    where: { id: request.id },
    data: { status: 'denied', resolvedAt: new Date(), resolvedById: req.user.id },
  });
  await recordAudit(req.user, 'access.denied', 'AccessRequest', request.id, { userId: request.userId });
  res.json({ request: updated });
});

// ── Users ────────────────────────────────────────────────────────────────

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isApproved: true,
      accessLevel: true,
      createdAt: true,
      _count: { select: { accessRequests: true } },
    },
  });
  res.json({ users });
});

const userPatchSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'guest']).optional(),
  isApproved: z.boolean().optional(),
  accessLevel: z.number().int().min(1).max(3).optional(),
});

// Owners may assign any role; admins may only manage member/guest roles.
// Access levels: 1 (most premium) is reserved for the owner; admins may grant
// 2 or 3. A role change also nudges the default level unless one is explicit.
router.patch('/users/:id', validate(userPatchSchema), async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw new AppError(404, 'User not found');
  if (target.role === 'owner' && req.user.id !== target.id) {
    throw new AppError(403, 'You cannot modify the owner account');
  }
  if (req.user.role === 'admin' && (req.body.role === 'owner' || req.body.role === 'admin')) {
    throw new AppError(403, 'Admins cannot grant owner or admin roles');
  }
  if (req.body.accessLevel === 1 && req.user.role !== 'owner') {
    throw new AppError(403, 'Only the owner can grant premium level 1 access');
  }

  const data = {};
  if (req.body.role !== undefined) data.role = req.body.role;
  if (req.body.isApproved !== undefined) data.isApproved = req.body.isApproved;
  if (req.body.accessLevel !== undefined) {
    data.accessLevel = req.body.accessLevel;
  } else if (req.body.role !== undefined) {
    data.accessLevel = req.body.role === 'owner' || req.body.role === 'admin' ? 1 : req.body.role === 'member' ? 2 : 3;
  }

  const updated = await prisma.user.update({ where: { id: target.id }, data });
  await recordAudit(req.user, 'user.updated', 'User', target.id, {
    before: { role: target.role, isApproved: target.isApproved, accessLevel: target.accessLevel },
    after: data,
  });
  res.json({ user: updated });
});

// ── Lock toggles ─────────────────────────────────────────────────────────

const lockSchema = z.object({ isLocked: z.boolean() });

router.patch('/subjects/:id', validate(lockSchema), async (req, res) => {
  const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
  if (!subject) throw new AppError(404, 'Subject not found');
  const updated = await prisma.subject.update({
    where: { id: subject.id },
    data: { isLocked: req.body.isLocked },
  });
  await recordAudit(req.user, 'subject.lock_toggled', 'Subject', subject.id, {
    before: subject.isLocked,
    after: req.body.isLocked,
  });
  res.json({ subject: updated });
});

router.patch('/chapters/:id', validate(lockSchema), async (req, res) => {
  const chapter = await prisma.chapter.findUnique({ where: { id: req.params.id } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  const updated = await prisma.chapter.update({
    where: { id: chapter.id },
    data: { isLocked: req.body.isLocked },
  });
  await recordAudit(req.user, 'chapter.lock_toggled', 'Chapter', chapter.id, {
    before: chapter.isLocked,
    after: req.body.isLocked,
  });
  res.json({ chapter: updated });
});

// ── Audit trail ──────────────────────────────────────────────────────────

router.get('/audit', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { id: true, email: true } } },
  });
  res.json({ logs });
});

// ── Content CRUD ─────────────────────────────────────────────────────────

const BLOCK_TYPE_VALUES = [
  'note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important',
  'numerical', 'mindmap', 'diagram_compare', 'summary', 'keywords', 'important_points', 'byakaran',
  'formula', 'symbols',
];

const blockSchema = z.object({
  // Omit blockType to let the rule-based classifier (services/classifier.js)
  // decide; the saved block is then marked classifiedBy: "auto".
  blockType: z.enum(BLOCK_TYPE_VALUES).optional(),
  title: z.string().trim().max(200).nullish(),
  contentRichtext: z.string().max(100000).nullish(),
  contentCode: z.string().max(100000).nullish(),
  codeLanguage: z.string().trim().max(50).nullish(),
  mindmapJson: z
    .object({
      name: z.string().max(200),
      children: z.array(z.any()).nullish(),
    })
    .nullish(),
  diagramData: z
    .object({
      left: z.object({ name: z.string().max(200), points: z.array(z.string().max(500)).max(20) }),
      right: z.object({ name: z.string().max(200), points: z.array(z.string().max(500)).max(20) }),
      similarities: z.array(z.string().max(500)).max(20),
      differences: z.array(z.object({ left: z.string().max(500), right: z.string().max(500) })).max(20),
    })
    .nullish(),
  subLevel: z.string().trim().max(300).nullish(),
  sortOrder: z.number().int().min(0).nullish(),
  accessLevel: z.number().int().min(1).max(3).nullish(),
});

async function assertBlockTypeAllowed(subjectId, blockType) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw new AppError(404, 'Subject not found');
  const allowed = ALLOWED_BLOCK_TYPES[subject.subjectType] ?? [];
  if (!allowed.includes(blockType)) {
    throw new AppError(400, `Block type "${blockType}" is not allowed for subject type "${subject.subjectType}"`);
  }
  return subject;
}

router.get('/chapters/:id/blocks', async (req, res) => {
  const chapter = await prisma.chapter.findUnique({ where: { id: req.params.id } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  const blocks = await prisma.contentBlock.findMany({
    where: { chapterId: chapter.id },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ chapter, blocks });
});

router.post('/chapters/:id/blocks', validate(blockSchema), async (req, res) => {
  const chapter = await prisma.chapter.findUnique({
    where: { id: req.params.id },
    include: { subject: true },
  });
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const data = { ...req.body };
  let autoReason = null;
  if (data.blockType) {
    await assertBlockTypeAllowed(chapter.subjectId, data.blockType);
    data.classifiedBy = 'manual';
  } else {
    const suggestion = suggestForSubject(chapter.subject.subjectType, data.title, data.contentRichtext);
    data.blockType = suggestion.blockType;
    data.classifiedBy = 'auto';
    autoReason = suggestion.reason;
  }

  const maxOrder = await prisma.contentBlock.aggregate({
    where: { chapterId: chapter.id },
    _max: { sortOrder: true },
  });
  const block = await prisma.contentBlock.create({
    data: {
      ...data,
      chapterId: chapter.id,
      accessLevel: req.body.accessLevel ?? 3,
      sortOrder: req.body.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  await recordAudit(req.user, 'block.created', 'ContentBlock', block.id, {
    blockType: block.blockType,
    title: block.title,
    classifiedBy: block.classifiedBy,
    accessLevel: block.accessLevel,
    autoReason,
  });
  // Notify members by email (fire-and-forget, never blocks the response).
  notifyMembersContent({
    action: 'added',
    subjectName: chapter.subject.name,
    chapterTitle: chapter.title,
    blockTitle: block.title,
    accessLevel: block.accessLevel,
  }).catch(() => {});
  res.status(201).json({ block });
});

const blockPatchSchema = blockSchema.partial();

router.patch('/blocks/:id', validate(blockPatchSchema), async (req, res) => {
  const block = await prisma.contentBlock.findUnique({
    where: { id: req.params.id },
    include: { chapter: { include: { subject: true } } },
  });
  if (!block) throw new AppError(404, 'Block not found');

  const data = { ...req.body };
  // An explicit type change is a manual decision; content-only edits keep the
  // original classification (auto stays auto, manual stays manual).
  if (data.blockType !== undefined) {
    await assertBlockTypeAllowed(block.chapter.subjectId, data.blockType);
    data.classifiedBy = 'manual';
  }

  const updated = await prisma.contentBlock.update({
    where: { id: block.id },
    data,
    include: { chapter: true },
  });
  await recordAudit(req.user, 'block.updated', 'ContentBlock', block.id, {
    blockType: updated.blockType,
    title: updated.title,
    classifiedBy: updated.classifiedBy,
  });
  notifyMembersContent({
    action: 'updated',
    subjectName: block.chapter.subject.name,
    chapterTitle: block.chapter.title,
    blockTitle: updated.title,
    accessLevel: updated.accessLevel,
  }).catch(() => {});
  res.json({ block: updated });
});

router.delete('/blocks/:id', async (req, res) => {
  const block = await prisma.contentBlock.findUnique({ where: { id: req.params.id } });
  if (!block) throw new AppError(404, 'Block not found');
  await prisma.contentBlock.delete({ where: { id: block.id } });
  await recordAudit(req.user, 'block.deleted', 'ContentBlock', block.id, { blockType: block.blockType, title: block.title });
  res.status(204).end();
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

router.post('/chapters/:id/blocks/reorder', validate(reorderSchema), async (req, res) => {
  const chapter = await prisma.chapter.findUnique({ where: { id: req.params.id } });
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const existing = await prisma.contentBlock.findMany({ where: { chapterId: chapter.id } });
  const existingIds = new Set(existing.map((b) => b.id));
  if (req.body.orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds contains a block that does not belong to this chapter');
  }

  await prisma.$transaction(
    req.body.orderedIds.map((id, index) =>
      prisma.contentBlock.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  await recordAudit(req.user, 'chapter.reordered', 'Chapter', chapter.id, { count: req.body.orderedIds.length });
  res.json({ ok: true });
});

// ── Subject & chapter creation (panel forms) ─────────────────────────────

const subjectCreateSchema = z.object({
  classSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100).optional(),
  subjectType: z.enum(['science_math', 'biology', 'english', 'nepali']),
  icon: z.string().trim().max(50).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isLocked: z.boolean().optional(),
});

router.post('/subjects', validate(subjectCreateSchema), async (req, res) => {
  const klass = await prisma.class.findUnique({ where: { slug: req.body.classSlug } });
  if (!klass) throw new AppError(404, 'Class not found');
  const slug = req.body.slug || slugify(req.body.name);
  const existing = await prisma.subject.findUnique({ where: { classId_slug: { classId: klass.id, slug } } });
  if (existing) throw new AppError(409, `Subject with slug "${slug}" already exists in this class`);

  const subject = await prisma.subject.create({
    data: {
      classId: klass.id,
      name: req.body.name,
      slug,
      subjectType: req.body.subjectType,
      icon: req.body.icon ?? 'book',
      themeColor: req.body.themeColor ?? '#38bdf8',
      isLocked: req.body.isLocked ?? true,
    },
  });
  await recordAudit(req.user, 'subject.created', 'Subject', subject.id, { name: subject.name });
  res.status(201).json({ subject });
});

const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  icon: z.string().trim().max(50).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch('/subjects/:id/meta', validate(subjectUpdateSchema), async (req, res) => {
  const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
  if (!subject) throw new AppError(404, 'Subject not found');
  const updated = await prisma.subject.update({ where: { id: subject.id }, data: req.body });
  await recordAudit(req.user, 'subject.updated', 'Subject', subject.id, req.body);
  res.json({ subject: updated });
});

const chapterCreateSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  isLocked: z.boolean().optional(),
});

router.post('/chapters', validate(chapterCreateSchema), async (req, res) => {
  const subject = await prisma.subject.findUnique({ where: { id: req.body.subjectId } });
  if (!subject) throw new AppError(404, 'Subject not found');
  const slug = req.body.slug || slugify(req.body.title);
  const existing = await prisma.chapter.findUnique({
    where: { subjectId_slug: { subjectId: subject.id, slug } },
  });
  if (existing) throw new AppError(409, `Chapter with slug "${slug}" already exists in this subject`);

  const maxOrder = await prisma.chapter.aggregate({
    where: { subjectId: subject.id },
    _max: { sortOrder: true },
  });
  const chapter = await prisma.chapter.create({
    data: {
      subjectId: subject.id,
      title: req.body.title,
      slug,
      isLocked: req.body.isLocked ?? true,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  await recordAudit(req.user, 'chapter.created', 'Chapter', chapter.id, { title: chapter.title });
  res.status(201).json({ chapter });
});

router.delete('/chapters/:id', async (req, res) => {
  const chapter = await prisma.chapter.findUnique({ where: { id: req.params.id } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  await prisma.chapter.delete({ where: { id: chapter.id } });
  await recordAudit(req.user, 'chapter.deleted', 'Chapter', chapter.id, { title: chapter.title });
  res.status(204).end();
});

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

export default router;
