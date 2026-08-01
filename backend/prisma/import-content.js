// Ravikishan content importer — pushes the legacy JSON corpus
// (backend/prisma/import-data/, a mirror of the old "data copy" folder) into
// the Prisma content model.
//
// Idempotent: upserts Class 11 subjects + chapters and refreshes every block
// of imported chapters (delete + recreate), so re-runs and re-deploys are safe.
// Content files stay the source of truth — same philosophy as prisma/seed.js.
//
// Run:  npm run content:import          (uses import-data/ next to this file)
//       DATA_DIR=/path/to/data npm run content:import

import { PrismaClient } from '@prisma/client';
import { parseDocument } from 'htmlparser2';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { notifyMembersImport } from '../src/services/mailer.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────

const SUBJECTS = {
  physics: { name: 'Physics', subjectType: 'science_math', icon: 'orbit', themeColor: '#38bdf8' },
  chemistry: { name: 'Chemistry', subjectType: 'science_math', icon: 'flask', themeColor: '#34d399' },
  mathematics: { name: 'Mathematics', subjectType: 'science_math', icon: 'ruler', themeColor: '#a78bfa' },
  biology: { name: 'Biology', subjectType: 'biology', icon: 'dna', themeColor: '#2dd4bf' },
  english: { name: 'English', subjectType: 'english', icon: 'book', themeColor: '#fbbf24' },
  nepali: { name: 'Nepali', subjectType: 'nepali', icon: 'pen', themeColor: '#fb7185' },
};

// Level plan (per user): level 3 = simple explanation, free for everyone;
// level 2 = better/deeper (examples, practice, numericals); level 1 = premium
// deep content: major formulas, concepts, condensed key points & short answers.
const LEVELS = {
  notes: 3, // wordy, simple meaning → free
  examples: 2, // worked examples → members
  practice: 2, // practice Q&A → members
  numericals: 2, // step-by-step problems → members
  quiz: 2, // self-test MCQs → members
  formulas: 1, // major formulas → premium
  keyPoints: 1, // condensed key points → premium
  summary: 1, // short recap → premium
  flashcards: 1, // short Q&A cards → premium
  mindmap: 1, // deep concept overview → premium
};

// Block type per subjectType; fallbacks when a type is not allowed there.
const BLOCK_TYPES = {
  science_math: {
    notes: 'note_topic', examples: 'note_example', practice: 'note_example',
    numericals: 'numerical', quiz: 'note_example', formulas: 'formula',
    keyPoints: 'note_important', summary: 'note_important',
    flashcards: 'note_important', mindmap: 'mindmap',
  },
  biology: {
    notes: 'note_topic', examples: 'note_example', practice: 'note_example',
    numericals: 'note_example', quiz: 'note_example', formulas: 'note_important',
    keyPoints: 'note_important', summary: 'note_important',
    flashcards: 'note_important', mindmap: 'mindmap',
  },
  english: {
    notes: 'summary', examples: 'important_points', practice: 'important_points',
    numericals: 'important_points', quiz: 'important_points', formulas: 'important_points',
    keyPoints: 'important_points', summary: 'summary',
    flashcards: 'important_points', mindmap: 'important_points',
  },
  nepali: {
    notes: 'byakaran', examples: 'byakaran', practice: 'byakaran',
    numericals: 'byakaran', quiz: 'byakaran', formulas: 'byakaran',
    keyPoints: 'byakaran', summary: 'byakaran',
    flashcards: 'byakaran', mindmap: 'byakaran',
  },
};

const DATA_DIR = process.env.DATA_DIR || join(HERE, 'import-data');
const BATCH_SIZE = 500;
const MAX_BLOCK_CHARS = 9000; // split over-long sections into "Part N" blocks

// ── Small helpers ─────────────────────────────────────────────────────────

function fixMojibake(str) {
  if (!/[\uFFFDâÃÂ€\u2019\u201c\u201d]/.test(str)) return str;
  try {
    const fixed = Buffer.from(str, 'latin1').toString('utf8');
    if (!fixed.includes('\uFFFD')) return fixed;
  } catch {
    /* keep original */
  }
  return str;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function humanize(name) {
  return String(name)
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function isHtml(text) {
  return /<[a-z][\s\S]*>/i.test(text);
}

function collapseBlankLines(text) {
  return String(text).replace(/\n{3,}/g, '\n\n').trim();
}

// ── HTML → markdown (htmlparser2) ─────────────────────────────────────────

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'center', 'figure', 'blockquote', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'form']);
const HEADING_LEVEL = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

function renderNode(node, ctx = {}) {
  if (!node) return '';
  if (node.type === 'text') return node.data;
  if (node.type !== 'tag') return '';
  const name = (node.name || '').toLowerCase();
  const childText = (nodes) => (nodes || []).map((n) => renderNode(n, ctx)).join('');

  switch (name) {
    case 'script':
    case 'style':
    case 'noscript':
    case 'svg':
    case 'img':
    case 'video':
    case 'iframe':
      return '';
    case 'br':
      return '\n';
    case 'hr':
      return '\n\n---\n\n';
    case 'b':
    case 'strong':
      return `**${childText(node.children)}**`;
    case 'i':
    case 'em':
      return `*${childText(node.children)}*`;
    case 'u':
    case 'sub':
    case 'sup':
    case 'small':
    case 'big':
    case 'span':
    case 'font':
    case 'a':
    case 'label':
      if (name === 'span' && /formula|math/i.test(node.attribs?.class || '')) {
        const inner = childText(node.children).trim();
        return inner ? `$${inner}$` : '';
      }
      return childText(node.children);
    case 'code':
      return `\`${childText(node.children)}\``;
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Math.min(HEADING_LEVEL[name], 3);
      return `\n\n${'#'.repeat(level)} ${childText(node.children).trim()}\n\n`;
    }
    case 'p':
      return `\n\n${childText(node.children)}\n\n`;
    case 'blockquote':
      return `\n\n> ${childText(node.children).replace(/\n+/g, ' ')}\n\n`;
    case 'ul':
    case 'ol':
      return renderList(node, ctx);
    case 'li':
      return renderListItem(node, ctx);
    case 'table':
      return renderTable(node);
    case 'tr':
    case 'td':
    case 'th':
    case 'thead':
    case 'tbody':
    case 'tfoot':
      return childText(node.children);
    case 'del':
    case 's':
      return childText(node.children);
    case 'pre':
      return `\n\n\`\`\`\n${childText(node.children).trim()}\n\`\`\`\n\n`;
    default:
      return BLOCK_TAGS.has(name) ? `\n\n${childText(node.children)}\n\n` : childText(node.children);
  }
}

function renderListItem(node, ctx) {
  const indent = '  '.repeat(ctx.listDepth || 0);
  const marker = ctx.listOrdered ? `${ctx.itemIndex + 1}.` : '-';
  let out = `${indent}${marker} `;
  const nextCtx = { ...ctx, listDepth: (ctx.listDepth || 0) + 1 };
  for (const child of node.children || []) {
    if (child.type === 'tag' && ['ul', 'ol'].includes((child.name || '').toLowerCase())) {
      out += renderList(child, nextCtx);
    } else {
      out += renderNode(child, ctx);
    }
  }
  return `${out.trimEnd()}\n`;
}

function renderList(node, ctx) {
  const ordered = (node.name || '').toLowerCase() === 'ol';
  let out = '\n';
  const items = (node.children || []).filter((c) => c.type === 'tag' && (c.name || '').toLowerCase() === 'li');
  items.forEach((li, index) => {
    out += renderListItem(li, { ...ctx, listOrdered: ordered, itemIndex: index });
  });
  return out;
}

function renderTable(node) {
  const rows = [];
  const collectRows = (nodes) => {
    for (const n of nodes || []) {
      if (n.type !== 'tag') continue;
      const name = (n.name || '').toLowerCase();
      if (name === 'tr') rows.push(n);
      else collectRows(n.children);
    }
  };
  collectRows(node.children);

  const cells = (tr) =>
    (tr.children || [])
      .filter((c) => c.type === 'tag' && ['td', 'th'].includes((c.name || '').toLowerCase()))
      .map((c) => renderNode(c, { listDepth: 0 }).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim());

  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = cells(rows[i]);
    if (!row.length) continue;
    lines.push(`| ${row.join(' | ')} |`);
    if (i === 0) lines.push(`| ${row.map(() => '---').join(' | ')} |`);
  }
  return lines.length ? `\n\n${lines.join('\n')}\n\n` : '';
}

function htmlToMarkdown(html) {
  const doc = parseDocument(fixMojibake(html), { decodeEntities: true });
  const md = (doc.children || []).map((n) => renderNode(n, { listDepth: 0 })).join('');
  return collapseBlankLines(md);
}

// ── Plain-text normalization (text-only source files) ─────────────────────

const SECTION_MARKER_RE = /^(════|📘|📝|💡|⚡|🔥|⚖️|📐|🧪|🔬|🔑|🌡|⚠|✅|🎯|🧠|📌|SECTION\s+[A-Z]|[A-Z][A-Z0-9 .:'"—]{14,})/;

function normalizeText(raw) {
  const text = fixMojibake(raw).replace(/\r\n/g, '\n');
  const out = [];
  for (const line of text.split('\n').map((l) => l.trimEnd())) {
    if (/^\s*\|/.test(line) && out.length && out[out.length - 1].trim() !== '') out.push('');
    out.push(line);
  }
  return collapseBlankLines(out.join('\n'));
}

// ── Section splitting for large notes arrays ──────────────────────────────

// Returns an array of { title, content } sections.
function splitNotes(notesArray, topicTitle, isText) {
  const sections = [];
  let current = null;
  let currentChars = 0;
  let part = 0;

  const flush = () => {
    if (current && current.content.trim()) sections.push(current);
    current = null;
    currentChars = 0;
  };
  const start = (title) => {
    flush();
    current = { title, content: '' };
  };

  for (const raw of notesArray) {
    const chunk = String(raw).trim();
    if (!chunk) continue;

    if (isText) {
      const sectiony = SECTION_MARKER_RE.test(chunk);
      if (sectiony || !current) {
        if (current && currentChars > MAX_BLOCK_CHARS) {
          part += 1;
          start(`${topicTitle} — Part ${part}`);
        } else if (sectiony) {
          const title = truncate(chunk.split('\n')[0].replace(/^[📘📝💡⚡🔥⚖️📐🧪🔬🔑🌡⚠✅🎯🧠📌]+\s*/, ''), 90);
          start(title || topicTitle);
        } else {
          start(topicTitle);
        }
      }
      const block = `\n\n${normalizeText(chunk)}`;
      current.content += block;
      currentChars += block.length;
      if (currentChars > MAX_BLOCK_CHARS) {
        flush();
        part += 1;
        start(`${topicTitle} — Part ${part}`);
      }
      continue;
    }

    // HTML chunk
    const heading = (chunk.match(/^<h([1-4])[^>]*>(.*?)<\/h\1>/is) || [])[2];
    if (heading) {
      const title = truncate(heading.replace(/<[^>]+>/g, ''), 90);
      start(title || topicTitle);
      const rest = chunk.replace(/^<h([1-4])[^>]*>.*?<\/h\1>/is, '').trim();
      if (rest) {
        current.content = `\n\n${htmlToMarkdown(rest)}`;
        currentChars = current.content.length;
      }
      if (currentChars > MAX_BLOCK_CHARS) flush();
      continue;
    }
    if (!current) start(topicTitle);
    const block = `\n\n${htmlToMarkdown(chunk)}`;
    if (currentChars + block.length > MAX_BLOCK_CHARS && currentChars > 0) {
      part += 1;
      flush();
      start(`${topicTitle} — Part ${part}`);
    }
    current.content += block;
    currentChars += block.length;
  }
  flush();
  return sections;
}

// ── Mindmap helpers ───────────────────────────────────────────────────────

function convertMindmap(node) {
  const out = { name: truncate(node.title || node.name || 'Untitled', 100) };
  if (node.details) out.name = truncate(`${out.name}: ${node.details}`, 100);
  if (Array.isArray(node.children) && node.children.length) {
    out.children = node.children.map(convertMindmap);
  }
  return out;
}

function flattenMindmap(node, depth = 0) {
  const lines = [];
  const name = node.title || node.name || 'Untitled';
  const label = node.details ? `${name} — ${node.details}` : name;
  lines.push(`${'  '.repeat(depth)}- ${label}`);
  for (const child of node.children || []) lines.push(...flattenMindmap(child, depth + 1));
  return lines;
}

// ── Topic file → blocks ───────────────────────────────────────────────────

function buildBlocks(topic, subjectType, topicTitle) {
  const blocks = [];
  const push = (kind, title, content, extra = {}) => {
    const text = String(content || '').trim();
    if (!text) return;
    const blockType = BLOCK_TYPES[subjectType][kind];
    blocks.push({ blockType, title, contentRichtext: text, accessLevel: LEVELS[kind], ...extra });
  };

  const notes = Array.isArray(topic.notes) ? topic.notes : topic.notes ? [topic.notes] : [];
  const isText = notes.length > 0 && !isHtml(notes.join(''));
  const canUseStatement = subjectType === 'science_math' || subjectType === 'biology';
  if (notes.length) {
    const sections = splitNotes(notes, topicTitle, isText);
    sections.forEach((s, i) => {
      const title = s.title || (i === 0 ? topicTitle : `${topicTitle} — Part ${i + 1}`);
      const topicLike = title.split(/\s+/).length <= 8 && !/[.?!…]$/.test(title) && !title.includes(',');
      push('notes', title, s.content, topicLike || !canUseStatement ? {} : { blockType: 'note_statement' });
    });
  }

  if (topic.numericals) {
    const list = Array.isArray(topic.numericals) ? topic.numericals : [];
    list.forEach((item, i) => {
      const q = truncate(item.question, 90);
      const solution = Array.isArray(item.solution) ? item.solution.join('\n') : item.solution || '';
      push('numericals', `Numerical ${i + 1}: ${q}`, `**Question:** ${item.question}\n\n**Solution:**\n${solution}\n\n**Answer:** ${item.answer}`);
    });
  }

  if (topic.examples) {
    const list = Array.isArray(topic.examples) ? topic.examples : [];
    list.forEach((item, i) => {
      const text = isHtml(item) ? htmlToMarkdown(item) : normalizeText(item);
      push('examples', `Example ${i + 1}`, text);
    });
  }

  if (topic.practice) {
    const list = Array.isArray(topic.practice)
      ? topic.practice
      : Object.values(topic.practice).flat().filter(Boolean);
    list.forEach((item, i) => {
      if (typeof item === 'string') {
        const q = truncate(item, 90);
        push('practice', `Practice ${i + 1}: ${q}`, item);
        return;
      }
      const q = truncate(item.question, 90);
      push('practice', `Practice ${i + 1}: ${q}`, `**Question:** ${item.question}\n\n**Answer:** ${item.answer}`);
    });
  }

  if (topic.quiz) {
    const list = Array.isArray(topic.quiz) ? topic.quiz : [];
    list.forEach((item, i) => {
      const options = (item.options || []).map((o, oi) => `${oi + 1}. ${o}`).join('\n');
      const correct = typeof item.answer === 'number' ? (item.options || [])[item.answer] : item.answer;
      push('quiz', `Quiz ${i + 1}: ${truncate(item.question, 80)}`, `**Question:** ${item.question}\n\n${options}\n\n**Answer:** ${correct}`);
    });
  }

  if (topic.formulas) {
    const list = Array.isArray(topic.formulas) ? topic.formulas : [];
    list.forEach((item, i) => {
      const f = String(item).trim();
      if (!f) return;
      // Wrap in display math only for compact math-y lines; keep prose
      // formulas (e.g. "**Name:** at constant T, P ∝ 1/V") as plain text.
      const text = /^\S+$/.test(f) && !f.includes('**') ? `$$${f.replace(/^\$+|\$+$/g, '')}$$` : f;
      push('formulas', `Formula ${i + 1}`, text);
    });
  }

  if (topic.keyPoints) {
    const list = Array.isArray(topic.keyPoints) ? topic.keyPoints : [];
    const bullets = list.filter(Boolean).map((k) => `- ${isHtml(k) ? htmlToMarkdown(k) : k}`).join('\n');
    push('keyPoints', 'Key Points', bullets);
  }

  if (topic.summary) {
    push('summary', 'Summary', isHtml(topic.summary) ? htmlToMarkdown(topic.summary) : topic.summary);
  }

  if (topic.flashcards) {
    const list = Array.isArray(topic.flashcards) ? topic.flashcards : [];
    const cards = list
      .map((c) => `- **${c.front}** — ${c.back}`)
      .join('\n');
    push('flashcards', 'Flashcards', cards);
  }

  if (topic.mindmap) {
    const json = convertMindmap(topic.mindmap);
    if (subjectType === 'english' || subjectType === 'nepali') {
      push('mindmap', `Mind map: ${json.name}`, flattenMindmap(topic.mindmap).join('\n'));
    } else {
      blocks.push({
        blockType: BLOCK_TYPES[subjectType].mindmap,
        title: `Mind map: ${json.name}`,
        accessLevel: LEVELS.mindmap,
        mindmapJson: json,
      });
    }
  }

  if (subjectType === 'nepali') {
    for (const b of blocks) b.subLevel = topicTitle;
  }

  return blocks;
}

// ── File discovery ────────────────────────────────────────────────────────

function loadJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`  ⚠ skipped unparseable JSON: ${file} (${err.message})`);
    return null;
  }
}

function listContentFiles() {
  const files = [];
  for (const subjectId of Object.keys(SUBJECTS)) {
    const subjectDir = join(DATA_DIR, 'content', subjectId);
    if (!existsSync(subjectDir)) continue;
    for (const chapterName of readdirSync(subjectDir)) {
      const chapterDir = join(subjectDir, chapterName);
      const entries = readdirSync(chapterDir, { withFileTypes: true });
      const jsons = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
        .map((e) => join(chapterDir, e.name));
      if (jsons.length) files.push({ subjectId, chapterName, files: jsons });
    }
  }
  return files;
}

function chapterTitle(chapterName, nav) {
  const navChapter = nav?.chapters?.find((c) => slugify(c.id) === slugify(chapterName));
  return (navChapter?.title || '').trim() || humanize(chapterName);
}

function topicTitle(file, nav, chapterId) {
  const parsed = loadJson(file);
  const topicName = basename(file, extname(file));
  if (parsed && parsed.title) return String(parsed.title).trim();
  const navTopic = nav?.chapters
    ?.find((c) => slugify(c.id) === chapterId)
    ?.topics?.find((t) => slugify(t.id) === slugify(topicName));
  return (navTopic?.title || '').trim() || humanize(topicName);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`✗ DATA_DIR not found: ${DATA_DIR}\n  Place the JSON corpus there or set DATA_DIR.`);
    process.exit(1);
  }

  console.log(`→ Importing content from ${DATA_DIR}`);

  const klass = await prisma.class.upsert({
    where: { slug: 'class-11' },
    update: { name: 'Class 11', sortOrder: 1 },
    create: { name: 'Class 11', slug: 'class-11', sortOrder: 1 },
  });

  const chapterGroups = listContentFiles();
  const stats = { blocks: 0, byLevel: { 1: 0, 2: 0, 3: 0 }, chapters: 0 };
  const changedChapters = [];

  for (const group of chapterGroups) {
    const subjectCfg = SUBJECTS[group.subjectId];
    if (!subjectCfg) continue;

    const nav = existsSync(join(DATA_DIR, 'navigation', `${group.subjectId}.json`))
      ? loadJson(join(DATA_DIR, 'navigation', `${group.subjectId}.json`))
      : null;

    const subject = await prisma.subject.upsert({
      where: { classId_slug: { classId: klass.id, slug: group.subjectId } },
      update: subjectCfg,
      create: { ...subjectCfg, classId: klass.id, slug: group.subjectId },
    });

    const chapterSlug = slugify(group.chapterName);
    const navChapter = nav?.chapters?.find((c) => slugify(c.id) === chapterSlug);
    if (navChapter?.topics?.length) {
      // Files in navigation order; topics missing from navigation follow after.
      const order = new Map(navChapter.topics.map((t, i) => [slugify(t.id), i]));
      group.files.sort((a, b) => {
        const ia = order.get(slugify(basename(a, extname(a))));
        const ib = order.get(slugify(basename(b, extname(b))));
        if (ia !== undefined && ib !== undefined) return ia - ib;
        if (ia !== undefined) return -1;
        if (ib !== undefined) return 1;
        return 0;
      });
    }
    const chapter = await prisma.chapter.upsert({
      where: { subjectId_slug: { subjectId: subject.id, slug: chapterSlug } },
      update: { title: chapterTitle(group.chapterName, nav), sortOrder: 1 },
      create: {
        subjectId: subject.id,
        title: chapterTitle(group.chapterName, nav),
        slug: chapterSlug,
        sortOrder: 1,
        isLocked: true,
      },
    });

    const beforeCount = await prisma.contentBlock.count({ where: { chapterId: chapter.id } });
    await prisma.contentBlock.deleteMany({ where: { chapterId: chapter.id } });

    const chapterBlocks = [];
    for (const file of group.files) {
      const topic = loadJson(file);
      if (!topic) continue;
      const title = topicTitle(file, nav, chapterSlug);
      const blocks = buildBlocks(topic, subjectCfg.subjectType, title);
      blocks.forEach((b) => chapterBlocks.push(b));
    }

    for (let i = 0; i < chapterBlocks.length; i += BATCH_SIZE) {
      const batch = chapterBlocks
        .slice(i, i + BATCH_SIZE)
        .map((b, offset) => ({ ...b, chapterId: chapter.id, classifiedBy: 'auto', sortOrder: i + offset }));
      await prisma.contentBlock.createMany({ data: batch });
    }

    stats.chapters += 1;
    stats.blocks += chapterBlocks.length;
    for (const b of chapterBlocks) stats.byLevel[b.accessLevel] += 1;
    if (chapterBlocks.length !== beforeCount) {
      changedChapters.push({
        subject: subjectCfg.name,
        chapter: chapter.title,
        before: beforeCount,
        after: chapterBlocks.length,
      });
    }
    console.log(`  ✓ ${subjectCfg.name} / ${chapter.title}: ${chapterBlocks.length} blocks`);
  }

  console.log(`✓ Import complete — ${stats.chapters} chapters, ${stats.blocks} blocks (free=${stats.byLevel[3]}, members=${stats.byLevel[2]}, premium=${stats.byLevel[1]})`);

  if (changedChapters.length) {
    const result = await notifyMembersImport({ changed: changedChapters, totalBlocks: stats.blocks });
    console.log(`✉ member digest sent: ${result.sent}/${result.total} recipients (${changedChapters.length} changed chapters)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
