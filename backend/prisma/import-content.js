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
import {
  sectionIndexForBlockType,
  sectionKeyForBlockType,
  sectionLabelForBlockType,
} from '../src/lib/sections.js';
import { structureTopic } from '../src/services/classifier.js';
import { validateBlocks, serializeReport } from '../src/services/contentValidator.js';
import { defaultBlockMetadata, defaultTopicMetadata } from '../src/ai/contentTemplate.js';

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
  loksewa: { name: 'Loksewa Knowledge', subjectType: 'general_knowledge', icon: 'scale', themeColor: '#f59e0b' },
  'general-knowledge': { name: 'General Knowledge', subjectType: 'general_knowledge', icon: 'globe', themeColor: '#22d3ee' },
};

// Default renamable custom subjects per section (dashboard cards).
const CUSTOM_SUBJECT_DEFAULTS = {
  loksewa: ['Nepal Constitution', 'Public Administration', 'Current Affairs', 'Nepal Geography'],
  'general-knowledge': ['World Geography', 'Science & Technology', 'History & Culture', 'Current Affairs'],
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
  general_knowledge: {
    notes: 'note_topic', examples: 'note_example', practice: 'note_example',
    numericals: 'note_example', quiz: 'note_example', formulas: 'note_important',
    keyPoints: 'note_important', summary: 'note_important',
    flashcards: 'note_important', mindmap: 'mindmap',
  },
};

const DATA_DIR = process.env.DATA_DIR || join(HERE, 'import-data');
const BATCH_SIZE = 500;
const MAX_BLOCK_CHARS = 9000; // hard safety cap for a single section
const PART_TARGET_CHARS = 2600; // split long sections into ~equal parts of this size
const MAX_PARTS = 4;            // at most 1.1 … 1.4 for one section

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

// ── Paragraph flow ─────────────────────────────────────────────────────────
//
// Conceptual paragraphs: one empty line between paragraphs, and the text of a
// paragraph flows continuously ("leaving a line empty, start writing from the
// previous end"). Hard line breaks inside a paragraph are joined with a space
// so no sentence is ever split mid-flow. Structural lines (lists, tables,
// headings, code fences, blockquotes) keep their own line structure.

const STRUCTURAL_LINE_RE = /^\s*(?:[-*•]\s|\d+[.)]\s|#+\s|\|.*\|$|`{3}|>\s)/;

function flowParagraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split('\n');
      if (lines.length <= 1) return paragraph;
      if (lines.some((l) => STRUCTURAL_LINE_RE.test(l))) return paragraph;
      return lines.map((l) => l.trim()).join(' ').replace(/\s+/g, ' ');
    })
    .join('\n\n');
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
  return collapseBlankLines(flowParagraphs(md));
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
  return collapseBlankLines(flowParagraphs(out.join('\n')));
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

// ── Equal-part splitting for long sections ────────────────────────────────

// Re-partition over-long sections into 2–4 roughly equal paragraph groups.
// Parts keep the original title with a dotted suffix (1.1, 1.2, …); the
// suffix counter runs across the whole topic so numbers never repeat.
function splitLongSections(sections, topicTitle) {
  const out = [];
  let partNo = 0;
  for (const section of sections) {
    const total = section.content.length;
    if (total <= PART_TARGET_CHARS) {
      out.push(section);
      continue;
    }
    const paragraphs = section.content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length <= 1) {
      out.push(section);
      continue;
    }
    const parts = Math.min(MAX_PARTS, Math.max(2, Math.ceil(total / PART_TARGET_CHARS)));
    const base = section.title.replace(/\s*—\s*Part \d+$/, '') || topicTitle;
    const target = total / parts;
    const groups = Array.from({ length: parts }, () => []);
    let gi = 0;
    let acc = 0;
    for (const p of paragraphs) {
      groups[gi].push(p);
      acc += p.length + 2;
      if (acc >= target && gi < parts - 1) {
        gi += 1;
        acc = 0;
      }
    }
    groups.filter((g) => g.length).forEach((g) => {
      partNo += 1;
      out.push({ title: `${base} 1.${partNo}`, content: g.join('\n\n') });
    });
  }
  return out;
}

// ── Mindmap helpers ───────────────────────────────────────────────────────

function convertMindmap(node) {
  const out = { name: truncate(node.title || node.name || 'Untitled', 100) };
  if (node.details) out.name = truncate(`${out.name}: ${node.details}`, 100);
  if (Array.isArray(node.children) && node.children.length) {
    out.children = node.children.map(convertMindmap);
  }
  if (Array.isArray(node.legend) && node.legend.length) out.legend = node.legend.slice(0, 12);
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

// ── Auto diagram generation ───────────────────────────────────────────────
// Every theoretical topic (notes content) gets a hierarchical diagram even
// when the content file has no explicit "mindmap" field: the notes' HTML
// structure is parsed (headings → sections → key points), the central point
// of each section is marked with ★, and the symbols used in the text are
// collected into a legend that the frontend renders below the diagram.
// New content files therefore automatically get diagrams on import.

const GLYPH_MEANINGS = {
  'Δ': 'change in / difference of a quantity',
  'Σ': 'sum of a series of terms',
  '∝': 'proportional to',
  '√': 'square root of',
  'θ': 'theta — angle',
  'λ': 'lambda — wavelength',
  'π': 'pi ≈ 3.14159 (circle ratio)',
  '∞': 'infinity',
  '±': 'plus or minus — uncertainty / tolerance',
  '⇌': 'reversible reaction',
  '↑': 'increases / rises',
  '↓': 'decreases / falls',
  'Ω': 'ohm — electrical resistance',
  'µ': 'micro — one millionth (10⁻⁶)',
  '°': 'degree (angle or temperature)',
};

const QTY_MEANINGS = {
  F: 'force', m: 'mass', v: 'velocity', a: 'acceleration', t: 'time',
  T: 'temperature', E: 'energy', P: 'power / pressure', W: 'work',
  Q: 'heat / charge', H: 'enthalpy', K: 'equilibrium constant',
  k: 'constant (spring / Boltzmann)', R: 'gas constant', N: 'normal force / count',
  n: 'number of moles', g: 'acceleration due to gravity', c: 'speed of light',
  V: 'potential difference / volume', I: 'electric current', C: 'capacitance',
  B: 'magnetic field', r: 'radius', d: 'distance / diameter', f: 'frequency',
};

const SYMBOL_STOPLIST = new Set(['a', 'i', 'u', 'e', 'o', 's']);

function elementText(node) {
  const parts = [];
  const walk = (n) => {
    if (n.type === 'text') parts.push(n.data);
    else if (n.children) n.children.forEach(walk);
  };
  walk(node);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function collectSymbolLegend(text) {
  const legend = [];
  for (const [glyph, meaning] of Object.entries(GLYPH_MEANINGS)) {
    if (text.includes(glyph)) {
      legend.push(`${glyph} = ${meaning}`);
      if (legend.length >= 7) break;
    }
  }
  const counts = {};
  for (const token of text.split(/\s+/)) {
    if (/^[A-Za-z]$/.test(token)) counts[token] = (counts[token] || 0) + 1;
  }
  for (const [sym, meaning] of Object.entries(QTY_MEANINGS)) {
    if (!SYMBOL_STOPLIST.has(sym) && (counts[sym] || 0) >= 3) {
      legend.push(`${sym} = ${meaning}`);
      if (legend.length >= 10) break;
    }
  }
  return legend;
}

function buildAutoMindmap(topic, topicTitle) {
  const notes = Array.isArray(topic.notes) ? topic.notes : topic.notes ? [topic.notes] : [];
  const html = notes.filter(Boolean).join('\n');
  const root = { name: topicTitle, children: [] };
  let current = root;
  let firstInSection = true;
  let starUsed = false;

  const clean = (t) => String(t).replace(/\s+/g, ' ').trim();
  const trunc = (t, n = 58) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
  const pushNode = (name) => {
    name = clean(name);
    if (!name || name.length < 2) return null;
    const cap = current === root ? 20 : 16;
    if (current.children.length >= cap) return null;
    const node = { name: trunc(name) };
    current.children.push(node);
    return node;
  };
  const pushPoint = (name) => {
    name = clean(name);
    if (!name) return;
    if (firstInSection) {
      starUsed = true;
      pushNode(`★ ${trunc(name, 56)}`);
      firstInSection = false;
    } else {
      pushNode(name);
    }
  };

  const handleChildren = (els) => {
    for (const el of els || []) {
      if (el.type !== 'tag') continue;
      const tag = el.name.toLowerCase();
      if (tag === 'h1' || tag === 'h2') {
        const heading = clean(elementText(el));
        if (tag === 'h1' && heading.toLowerCase() === clean(root.name).toLowerCase()) continue; // repeats the title — skip
        current = { name: trunc(heading), children: [] };
        root.children.push(current);
        firstInSection = true;
        continue; // content following the heading flows into it until the next heading
      }
      if (tag === 'h3') {
        const sub = pushNode(elementText(el));
        if (sub) firstInSection = false;
        continue;
      }
      if (tag === 'ul' || tag === 'ol') {
        const items = [];
        const collect = (n) => {
          if (n.type === 'tag' && n.name.toLowerCase() === 'li') items.push(elementText(n));
          (n.children || []).forEach(collect);
        };
        collect(el);
        for (const item of items) pushPoint(item);
        continue;
      }
      if (tag === 'p' || tag === 'blockquote') {
        const t = clean(elementText(el));
        if (!t) continue;
        pushPoint(t.split(/(?<=[.!?])\s+/)[0]);
        continue;
      }
      if (el.children) handleChildren(el.children);
    }
  };

  handleChildren(parseDocument(html).children);

  if (!root.children.length) return null;
  const legend = ['→ = leads to / flows into'];
  if (starUsed) legend.push('★ = central / most important point');
  legend.push(...collectSymbolLegend(html.replace(/<[^>]*>/g, ' ')));
  if (legend.length) root.legend = legend;
  return root;
}

// Fallback diagram for topics with no notes (numerical-only, quiz-only, GK
// cards…): the hierarchy is derived from the topic's own blocks — section
// label as the middle tier, then the block titles as leaves. Symbols and a
// legend are included so the diagram stays consistent with notes-based maps.
function buildBlockDiagram(topicTitle, blocks) {
  const bySection = new Map();
  for (const b of blocks) {
    const key = sectionKeyForBlockType(b.blockType);
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(b);
  }
  const root = { name: truncate(topicTitle, 60), children: [] };
  let starUsed = false;
  for (const [key, group] of bySection) {
    const label = sectionLabelForBlockType(group[0].blockType);
    const sectionNode = { name: label, children: [] };
    group.slice(0, 10).forEach((b, i) => {
      const name = truncate(String(b.title || 'Untitled').replace(/\s+/g, ' ').trim(), 52);
      if (!name) return;
      if (i === 0 && !starUsed) {
        starUsed = true;
        sectionNode.children.push({ name: `★ ${name}` });
      } else {
        sectionNode.children.push({ name });
      }
    });
    if (sectionNode.children.length) root.children.push(sectionNode);
  }
  if (!root.children.length) return null;
  const legend = ['→ = leads to / flows into', 'Grouped by section of the topic'];
  if (starUsed) legend.push('★ = first / most important item in the section');
  root.legend = legend;
  return root;
}

// ── Topic file → blocks ───────────────────────────────────────────────────

// Returns { blocks, topicMeta } where blocks already carry sectionIndex and
// topicMeta carries the topic-level metadata (tags, outcomes, difficulty).
function buildBlocks(topic, subjectType, topicTitle) {
  const blocks = [];
  const topicMeta = defaultTopicMetadata({});
  const push = (kind, title, content, extra = {}) => {
    const text = String(content || '').trim();
    if (!text) return;
    const blockType = BLOCK_TYPES[subjectType][kind];
    const sectionIndex = sectionIndexForBlockType(blockType);
    blocks.push({
      blockType,
      title,
      contentRichtext: text,
      accessLevel: LEVELS[kind],
      sectionIndex,
      metadata: defaultBlockMetadata({ source: 'import' }),
      ...extra,
    });
  };

  // Keywords from keyPoints/tags feed search + topic metadata.
  if (Array.isArray(topic.keyPoints)) {
    topicMeta.tags = topic.keyPoints
      .map((k) => String(k).replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim())
      .filter((k) => k && k.length < 40)
      .slice(0, 12);
  }

  const notes = Array.isArray(topic.notes) ? topic.notes : topic.notes ? [topic.notes] : [];
  const isText = notes.length > 0 && !isHtml(notes.join(''));
  const canUseStatement = subjectType === 'science_math' || subjectType === 'biology';
  if (notes.length) {
    // Every notes blob is run through the classifier so the canonical section
    // structure is enforced automatically (headings → sections → blocks).
    // HTML blobs are converted to markdown first so heading detection and the
    // stored content stay clean.
    const raw = isText ? normalizeText(notes.join('\n\n')) : htmlToMarkdown(notes.join('\n\n'));
    const structured = structureTopic(topicTitle, raw);
    if (structured.length) {
      structured.forEach((s, i) => {
        const blockType = s.blockType;
        const sectionIndex = s.sectionIndex;
        const block = {
          blockType,
          title: s.title || (i === 0 ? topicTitle : `${topicTitle} — Part ${i + 1}`),
          contentRichtext: s.content,
          accessLevel: sectionIndex <= 1 ? 3 : sectionIndex <= 4 ? 2 : 1,
          sectionIndex,
          metadata: { ...defaultBlockMetadata({ source: 'import' }), classifiedReason: s.classifiedReason },
        };
        blocks.push(block);
      });
    } else {
      const sections = splitLongSections(splitNotes(notes, topicTitle, isText), topicTitle);
      sections.forEach((s, i) => {
        const title = s.title || (i === 0 ? topicTitle : `${topicTitle} — Part ${i + 1}`);
        const topicLike = title.split(/\s+/).length <= 8 && !/[.?!…]$/.test(title) && !title.includes(',');
        const blockType = topicLike || !canUseStatement ? BLOCK_TYPES[subjectType].notes : 'note_statement';
        const sectionIndex = sectionIndexForBlockType(blockType);
        blocks.push({
          blockType,
          title,
          contentRichtext: s.content,
          accessLevel: sectionIndex <= 1 ? 3 : sectionIndex <= 4 ? 2 : 1,
          sectionIndex,
          metadata: { ...defaultBlockMetadata({ source: 'import' }), classifiedReason: 'legacy-split' },
        });
      });
    }
  }

  if (topic.numericals) {
    const list = Array.isArray(topic.numericals) ? topic.numericals : [];
    list.forEach((item, i) => {
      const q = truncate(item.question, 90);
      const solution = Array.isArray(item.solution) ? item.solution.join('\n') : item.solution || '';
      const blockType = subjectType === 'science_math' ? 'numerical' : 'solved_example';
      blocks.push({
        blockType,
        title: `Solved ${i + 1}: ${q}`,
        contentRichtext: `**Question:** ${item.question}\n\n**Solution:**\n${solution}\n\n**Answer:** ${item.answer}`,
        accessLevel: 2,
        sectionIndex: sectionIndexForBlockType(blockType),
        metadata: { ...defaultBlockMetadata({ source: 'import' }), classifiedReason: 'numerical-section' },
      });
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
        sectionIndex: sectionIndexForBlockType('mindmap'),
        metadata: { ...defaultBlockMetadata({ source: 'import' }), classifiedReason: 'mindmap-section' },
        mindmapJson: json,
      });
    }
  } else {
    // EVERY topic gets a hierarchical diagram in the premium-only diagram
    // section: from the notes when available, otherwise derived from the
    // topic's own blocks. The symbol legend rides along in both cases.
    let json = null;
    if (topic.notes) {
      json = buildAutoMindmap(topic, topicTitle);
      if (!json) json = buildBlockDiagram(topicTitle, blocks);
    } else {
      json = buildBlockDiagram(topicTitle, blocks);
    }
    if (json) {
      if (subjectType === 'english' || subjectType === 'nepali') {
        push('mindmap', `Diagram: ${json.name}`, flattenMindmap(json).join('\n'));
      } else {
        blocks.push({
          blockType: BLOCK_TYPES[subjectType].mindmap,
          title: `Diagram: ${json.name}`,
          accessLevel: LEVELS.mindmap,
          sectionIndex: sectionIndexForBlockType('mindmap'),
          metadata: { ...defaultBlockMetadata({ source: 'import' }), classifiedReason: 'auto-diagram' },
          mindmapJson: json,
        });
      }
    }
  }

  if (subjectType === 'nepali') {
    for (const b of blocks) b.subLevel = topicTitle;
  }

  return { blocks, topicMeta };
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

  // Class 12 placeholder (content to be added later).
  await prisma.class.upsert({
    where: { slug: 'class-12' },
    update: { name: 'Class 12', sortOrder: 2 },
    create: { name: 'Class 12', slug: 'class-12', sortOrder: 2 },
  });

  const chapterGroups = listContentFiles();

  // Syllabus ordering: chapters come from the navigation JSONs (the syllabus
  // defines the order). Groups are sorted by nav index, then assigned that
  // index as sortOrder so the API renders chapters exactly as the syllabus.
  for (const group of chapterGroups) {
    const nav = existsSync(join(DATA_DIR, 'navigation', `${group.subjectId}.json`))
      ? loadJson(join(DATA_DIR, 'navigation', `${group.subjectId}.json`))
      : null;
    group.navIndex = nav?.chapters?.findIndex((c) => slugify(c.id) === slugify(group.chapterName));
    group.navIndex = group.navIndex !== undefined && group.navIndex >= 0 ? group.navIndex : Number.MAX_SAFE_INTEGER;
  }
  chapterGroups.sort((a, b) => a.navIndex - b.navIndex);

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
      update: { ...subjectCfg, status: 'published' },
      create: { ...subjectCfg, classId: klass.id, slug: group.subjectId, status: 'published' },
    });

    // Default custom subjects per section (seeded once — renames are preserved
    // on re-imports because we only create when the section has none yet).
    const customDefaults = CUSTOM_SUBJECT_DEFAULTS[group.subjectId];
    if (customDefaults?.length) {
      const existing = await prisma.customSubject.count({ where: { subjectId: subject.id } });
      if (existing === 0) {
        await prisma.customSubject.createMany({
          data: customDefaults.map((name, i) => ({ name, subjectId: subject.id, sortOrder: i })),
        });
        console.log(`  ✓ seeded ${customDefaults.length} custom subjects for ${group.subjectId}`);
      }
    }

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
      update: {
        title: chapterTitle(group.chapterName, nav),
        sortOrder: group.navIndex === Number.MAX_SAFE_INTEGER ? stats.chapters : group.navIndex,
        status: 'published',
      },
      create: {
        subjectId: subject.id,
        title: chapterTitle(group.chapterName, nav),
        slug: chapterSlug,
        sortOrder: group.navIndex === Number.MAX_SAFE_INTEGER ? stats.chapters : group.navIndex,
        isLocked: true,
        status: 'published',
      },
    });

    const beforeCount = await prisma.contentBlock.count({ where: { chapterId: chapter.id } });
    const beforeTopics = await prisma.topic.count({ where: { chapterId: chapter.id } });
    await prisma.contentBlock.deleteMany({ where: { chapterId: chapter.id } });
    await prisma.topic.deleteMany({ where: { chapterId: chapter.id } });

    const chapterBlocks = [];
    const chapterTopics = [];
    let fileIndex = 0;
    for (const file of group.files) {
      const topic = loadJson(file);
      if (!topic) continue;
      const title = topicTitle(file, nav, chapterSlug);
      const { blocks, topicMeta } = buildBlocks(topic, subjectCfg.subjectType, title);
      if (!blocks.length) continue;

      const slug = slugify(title);
      let topicRow = chapterTopics.find((t) => t.slug === slug);
      if (!topicRow) {
        topicRow = {
          title,
          slug,
          sortOrder: fileIndex,
          metadata: topicMeta,
          status: 'published',
          blocks: [],
        };
        chapterTopics.push(topicRow);
      }
      topicRow.blocks.push(...blocks.map((b, i) => ({ ...b, sortOrder: topicRow.blocks.length + i })));
      fileIndex += 1;
    }

    // Persist topics first (blocks need their ids), then blocks with topicId.
    for (const t of chapterTopics) {
      const report = serializeReport(validateBlocks(t.blocks));
      const created = await prisma.topic.create({
        data: {
          chapterId: chapter.id,
          title: t.title,
          slug: t.slug,
          sortOrder: t.sortOrder,
          status: t.status,
          metadata: { ...t.metadata, tags: t.metadata.tags || [] },
          validationReport: report,
        },
      });
      t.dbId = created.id;
    }

    const topicBySlug = new Map(chapterTopics.map((t) => [t.slug, t.dbId]));
    const flat = [];
    for (const t of chapterTopics) {
      for (const b of t.blocks) {
        flat.push({ ...b, topicId: topicBySlug.get(t.slug) });
      }
    }

    for (let i = 0; i < flat.length; i += BATCH_SIZE) {
      const batch = flat
        .slice(i, i + BATCH_SIZE)
        .map((b, offset) => ({ ...b, chapterId: chapter.id, classifiedBy: 'auto', sortOrder: i + offset }));
      await prisma.contentBlock.createMany({ data: batch });
    }

    stats.chapters += 1;
    stats.blocks += flat.length;
    for (const b of flat) stats.byLevel[b.accessLevel] += 1;
    if (flat.length !== beforeCount || chapterTopics.length !== beforeTopics) {
      changedChapters.push({
        subject: subjectCfg.name,
        chapter: chapter.title,
        before: beforeCount,
        after: flat.length,
        beforeTopics,
        afterTopics: chapterTopics.length,
      });
    }
    console.log(`  ✓ ${subjectCfg.name} / ${chapter.title}: ${flat.length} blocks, ${chapterTopics.length} topics`);
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
