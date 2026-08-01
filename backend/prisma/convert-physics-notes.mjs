// Converts the user's physics-notes data (chapters → level/parent topic tree
// → definition/examples/questions) into the standard import corpus:
//   import-data/content/physics/<chapter>/<topic>.json
// plus a per-chapter "Topic Map" mindmap (the topic graph) and navigation
// entries in navigation/physics.json.
//
// Level plan: notes/definition = level 3 (free, simple knowledge for viewers),
// Q&A examples = level 2 (members), keyPoints/summary = level 1 (owner).
// Run:  node prisma/convert-physics-notes.mjs

import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, 'import-data');
const require = createRequire(import.meta.url);
const raw = require(join(DATA_DIR, 'raw', 'physics-notes.cjs'));

const SUBJECT = 'physics';

// ── helpers ──────────────────────────────────────────────────────────────

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

function truncate(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function h(level, text) {
  return `<h${level}>${text}</h${level}>`;
}

function li(text) {
  return `<li>${text}</li>`;
}

function p(text) {
  return `<p>${text}</p>`;
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── topic → corpus topic file ────────────────────────────────────────────

function topicFile(topic) {
  const questions = Array.isArray(topic.questions) ? topic.questions : [];
  const qa = questions
    .map((item, i) => `**Q${i + 1}: ${item.q}**\n\n**Answer:** ${item.a}`)
    .filter(Boolean);

  const examples = Array.isArray(topic.examples) ? topic.examples : [];
  const examplesHtml = examples.length
    ? `${h(2, 'Examples')}\n<ul>\n${examples.map((e) => `  ${li(esc(e))}`).join('\n')}\n</ul>`
    : '';

  const notes = [
    `${h(1, 'Definition')}\n${p(esc(topic.definition))}`,
    ...(examplesHtml ? [examplesHtml] : []),
  ];

  const keyPoints = [
    `- **Definition:** ${topic.definition}`,
    ...examples.slice(0, 4).map((e) => `- **Example:** ${e}`),
  ];

  const summary = `${topic.definition}${examples.length ? ` Key examples include ${truncate(examples.join('; '), 160)}.` : ''} Includes ${qa.length} short-answer practice questions.`;

  return {
    title: topic.title,
    notes,
    examples: qa,
    keyPoints,
    summary,
  };
}

// ── topic tree → mindmap (the graph) ─────────────────────────────────────

function buildMindmap(chapterTitle, topics) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const childrenOf = new Map();
  for (const t of topics) {
    const parentId = t.parent && byId.has(t.parent) ? t.parent : null;
    if (parentId) {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId).push(t);
    }
  }
  const roots = topics.filter((t) => !t.parent || !byId.has(t.parent));
  const node = (t) => {
    const nodeOut = { name: truncate(t.title, 100) };
    const kids = childrenOf.get(t.id) || [];
    if (kids.length) nodeOut.children = kids.map(node);
    return nodeOut;
  };
  return { name: chapterTitle, children: roots.map(node) };
}

// ── main ─────────────────────────────────────────────────────────────────

const navPath = join(DATA_DIR, 'navigation', `${SUBJECT}.json`);
const nav = existsSync(navPath) ? JSON.parse(readFileSync(navPath, 'utf8')) : { name: 'Physics', chapters: [] };

let totalTopics = 0;

for (const chapter of raw.chapters) {
  const chapterFolder = chapter.chapterTitle.replace(/^Unit \d+: /, '').replace(/^Chapter \d+: /, '');
  const chapterSlug = slugify(chapterFolder);
  const dir = join(DATA_DIR, 'content', SUBJECT, chapterFolder);
  mkdirSync(dir, { recursive: true });

  const topics = chapter.topics;
  for (const topic of topics) {
    const file = join(dir, `${topic.id}.json`);
    writeFileSync(file, JSON.stringify(topicFile(topic), null, 2));
    totalTopics += 1;
  }

  const mapFile = join(dir, 'topic-map.json');
  writeFileSync(mapFile, JSON.stringify({
    title: `Topic Map — ${chapterFolder}`,
    mindmap: buildMindmap(chapterFolder, topics),
  }, null, 2));

  nav.chapters = nav.chapters.filter((c) => c.id !== chapterSlug);
  nav.chapters.push({
    id: chapterSlug,
    title: chapterFolder,
    description: `${topics.length} topics, ${topics.reduce((n, t) => n + (t.questions?.length || 0), 0)} practice questions.`,
    topics: topics.map((t) => ({ id: t.id, title: t.title })),
  });

  console.log(`✓ ${chapterFolder}: ${topics.length} topics + topic map`);
}

writeFileSync(navPath, JSON.stringify(nav, null, 2));
console.log(`✓ navigation/physics.json updated (${nav.chapters.length} chapters)`);
console.log(`✓ ${totalTopics} topic files written → ${join(DATA_DIR, 'content', SUBJECT)}`);
