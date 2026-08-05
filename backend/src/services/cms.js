import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { recordAudit } from './audit.js';

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

// ── Topics ──────────────────────────────────────────────────

export async function listTopics(chapterId, userId) {
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  const topics = await prisma.topic.findMany({
    where: { chapterId },
    orderBy: { sortOrder: 'asc' },
  });
  return { chapter, topics };
}

export async function createTopic(chapterId, data, user) {
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  const slug = data.slug || slugify(data.title);
  const existing = await prisma.topic.findUnique({
    where: { chapterId_slug: { chapterId, slug } },
  });
  if (existing) throw new AppError(409, `Topic with slug "${slug}" already exists in this chapter`);
  const count = await prisma.topic.count({ where: { chapterId } });
  const topic = await prisma.topic.create({
    data: {
      chapterId,
      title: data.title,
      slug,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? count,
      status: data.status ?? 'draft',
    },
  });
  await recordAudit(user, 'topic.created', 'Topic', topic.id, { title: topic.title, chapterId });
  return topic;
}

export async function updateTopic(id, data, user) {
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) throw new AppError(404, 'Topic not found');
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.synonyms !== undefined) {
    // Synonyms live inside the topic's metadata JSON (no schema migration).
    updateData.metadata = {
      ...(topic.metadata || {}),
      synonyms: data.synonyms,
    };
  }
  const updated = await prisma.topic.update({ where: { id }, data: updateData });
  await recordAudit(user, 'topic.updated', 'Topic', topic.id, updateData);
  return updated;
}

export async function deleteTopic(id, user) {
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) throw new AppError(404, 'Topic not found');
  await prisma.topic.delete({ where: { id } });
  await recordAudit(user, 'topic.deleted', 'Topic', topic.id, { title: topic.title });
  return { ok: true };
}

// ── Content Versions ────────────────────────────────────────

export async function listVersions(blockId) {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new AppError(404, 'Content block not found');
  const versions = await prisma.contentVersion.findMany({
    where: { blockId },
    orderBy: { version: 'desc' },
    include: { user: { select: { id: true, displayName: true, email: true } } },
  });
  return { block, versions };
}

export async function createVersion(blockId, data, user) {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new AppError(404, 'Content block not found');
  const maxVersion = await prisma.contentVersion.aggregate({
    where: { blockId },
    _max: { version: true },
  });
  const nextVersion = (maxVersion._max.version ?? 0) + 1;
  const version = await prisma.contentVersion.create({
    data: {
      block: { connect: { id: blockId } },
      version: nextVersion,
      title: data.title ?? block.title,
      contentRichtext: data.contentRichtext ?? block.contentRichtext,
      contentCode: data.contentCode ?? block.contentCode,
      codeLanguage: data.codeLanguage ?? block.codeLanguage,
      mindmapJson: data.mindmapJson ?? block.mindmapJson,
      diagramData: data.diagramData ?? block.diagramData,
      subLevel: data.subLevel ?? block.subLevel,
      ...(user ? { changedBy: user.id, user: { connect: { id: user.id } } } : {}),
    },
  });
  await recordAudit(user, 'version.created', 'ContentVersion', version.id, {
    blockId,
    version: nextVersion,
  });
  return version;
}

// ── Tags ────────────────────────────────────────────────────

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}

export async function createTag(name, user) {
  const slug = slugify(name);
  const existing = await prisma.tag.findUnique({ where: { slug } });
  if (existing) throw new AppError(409, `Tag "${slug}" already exists`);
  const tag = await prisma.tag.create({ data: { name, slug } });
  await recordAudit(user, 'tag.created', 'Tag', tag.id, { name });
  return tag;
}

export async function deleteTag(id, user) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) throw new AppError(404, 'Tag not found');
  await prisma.tag.delete({ where: { id } });
  await recordAudit(user, 'tag.deleted', 'Tag', tag.id, { name: tag.name });
  return { ok: true };
}

// ── Block Tags ──────────────────────────────────────────────

export async function setBlockTags(blockId, tagIds, user) {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new AppError(404, 'Content block not found');
  await prisma.blockTag.deleteMany({ where: { blockId } });
  if (tagIds && tagIds.length > 0) {
    await prisma.blockTag.createMany({
      data: tagIds.map((tagId) => ({ blockId, tagId })),
    });
  }
  await recordAudit(user, 'block.tags_updated', 'ContentBlock', blockId, { tagIds });
  return { ok: true };
}

// ── Subject CMS (draft/publish workflow) ────────────────────

export async function publishSubject(id, user) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) throw new AppError(404, 'Subject not found');
  const updated = await prisma.subject.update({
    where: { id },
    data: { status: 'published' },
  });
  await recordAudit(user, 'subject.published', 'Subject', subject.id, { status: 'published' });
  return updated;
}

export async function archiveSubject(id, user) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) throw new AppError(404, 'Subject not found');
  const updated = await prisma.subject.update({
    where: { id },
    data: { status: 'archived' },
  });
  await recordAudit(user, 'subject.archived', 'Subject', subject.id, { status: 'archived' });
  return updated;
}

// ── Chapter CMS (draft/publish workflow) ────────────────────

export async function publishChapter(id, user) {
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  const updated = await prisma.chapter.update({
    where: { id },
    data: { status: 'published' },
  });
  await recordAudit(user, 'chapter.published', 'Chapter', chapter.id, { status: 'published' });
  return updated;
}

export async function archiveChapter(id, user) {
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) throw new AppError(404, 'Chapter not found');
  const updated = await prisma.chapter.update({
    where: { id },
    data: { status: 'archived' },
  });
  await recordAudit(user, 'chapter.archived', 'Chapter', chapter.id, { status: 'archived' });
  return updated;
}