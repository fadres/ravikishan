// Content classification engine — the deterministic half of the AI content
// pipeline. Every raw educational chunk that enters the system is classified
// into the canonical schema (see src/lib/sections.js) so that no manual
// sorting is ever required.
//
// Mapping table (educational content type → block type):
//   definition / explanation        → note_concept
//   formula / equation              → formula
//   numerical problem               → solved_example
//   question (Q&A)                  → pyq | solved_example
//   bullet list of facts            → important_points
//   memory trick / recall / keyword → mind_recall
//   advanced / deep content         → premium_expansion
//   learning objective              → learning_outcome
//   source / reference              → reference
//   closing recap                   → revision_summary

import { sectionIndexForBlockType } from '../lib/sections.js';

// ── Import-notes classifier (7-tab taxonomy) ──────────────────────────────
//
// classify() is a pure function used by prisma/import-notes.js. The folder
// path is the PRIMARY, deterministic signal — a file inside .../pyqs/ is a
// PYQ no matter what its text says. Content heuristics only run when the
// path is ambiguous (file directly in the chapter folder) or the file sits
// in the generic notes/ folder that could hold mixed types.
//
// Tab types (7):
//   concept → core explanatory notes   example → worked/solved examples
//   note    → quick-reference notes    formula → equations only
//   pyq     → previous-year questions  set     → grouped drill question sets
//   mindmap → concept-relationship maps

export const TAB_TYPES = ['concept', 'note', 'example', 'formula', 'pyq', 'set', 'mindmap', 'graph'];

// Default tab presentation order for a chapter (overridable per chapter via
// chapter.metadata.tabOrder; block rendering still follows sectionIndex).
export const DEFAULT_TAB_ORDER = ['concept', 'note', 'example', 'formula', 'pyq', 'set', 'mindmap', 'graph'];

// Tab type → existing BlockType enum (extend, don't replace).
export const TAB_TO_BLOCK_TYPE = {
  concept: 'note_concept',
  note: 'note_important',
  example: 'note_example',
  formula: 'formula',
  pyq: 'pyq',
  set: 'solved_example',
  mindmap: 'mindmap',
  graph: 'graph',
};

// Tab type → access tier (3 = free, 2 = member, 1 = premium).
export const TAB_ACCESS_LEVEL = {
  concept: 3,
  note: 2,
  example: 2,
  formula: 1,
  pyq: 2,
  set: 2,
  mindmap: 1,
  graph: 1,
};

// Confidence below this is flagged for manual review instead of importing.
export const CLASSIFICATION_THRESHOLD = 0.7;

// Type-folder names (canonical + common variants) → tab type. The type
// folder is the 4th path level: class/subject/chapter/<type>/file.json.
const FOLDER_TYPE_MAP = {
  concepts: 'concept',
  concept: 'concept',
  notes: 'note',
  note: 'note',
  examples: 'example',
  example: 'example',
  formula: 'formula',
  formulas: 'formula',
  pyqs: 'pyq',
  pyq: 'pyq',
  sets: 'set',
  set: 'set',
  mindmap: 'mindmap',
  mindmaps: 'mindmap',
  'mind-map': 'mindmap',
  graph: 'graph',
  graphs: 'graph',
  plot: 'graph',
  plots: 'graph',
  diagram: 'graph',
  diagrams: 'graph',
};

/**
 * Deterministic folder signal. Returns the tab type when the path carries a
 * recognized type folder (level 4), otherwise { type: null }.
 */
export function tabTypeFromFolder(filePath) {
  const segs = String(filePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
  // class / subject / chapter / <typeFolder> / file.json  → ≥ 5 segments.
  if (segs.length < 5) return { type: null, folder: null };
  const folder = segs[segs.length - 2].toLowerCase();
  return { type: FOLDER_TYPE_MAP[folder] ?? null, folder: segs[segs.length - 2] };
}

/**
 * Strict flat-schema validation: { title: string, notes: string[] } plus the
 * optional per-type fields (order: int, year, examSource, latex: bool,
 * type, graph). "graph" files carry a GraphSpec in place of (or alongside)
 * prose. Invalid files are rejected — no silent coercion.
 */
export function validateNoteSchema(note) {
  if (typeof note !== 'object' || note === null || Array.isArray(note)) {
    return { valid: false, errors: ['note must be a JSON object'] };
  }
  const errors = [];
  if (typeof note.title !== 'string' || !note.title.trim()) {
    errors.push('"title" must be a non-empty string');
  }
  if (note.graph === undefined) {
    if (!Array.isArray(note.notes) || note.notes.length === 0) {
      errors.push('"notes" must be a non-empty array of strings');
    } else if (!note.notes.every((n) => typeof n === 'string')) {
      errors.push('every entry in "notes" must be a string');
    }
  } else if (typeof note.graph !== 'object' || note.graph === null || Array.isArray(note.graph)) {
    errors.push('"graph" must be a JSON object (GraphSpec)');
  } else if (note.notes !== undefined) {
    if (!Array.isArray(note.notes) || !note.notes.every((n) => typeof n === 'string')) {
      errors.push('"notes" must be an array of strings');
    }
  }
  if (note.order !== undefined && (!Number.isInteger(note.order) || note.order < 0)) {
    errors.push('"order" must be a non-negative integer');
  }
  if (note.type !== undefined && !TAB_TYPES.includes(note.type)) {
    errors.push(`"type" must be one of: ${TAB_TYPES.join(', ')}`);
  }
  if (note.noteType !== undefined && (!Number.isInteger(note.noteType) || note.noteType < 1 || note.noteType > 99)) {
    errors.push('"noteType" must be an integer between 1 and 99 (draft type: 1 = first draft)');
  }
  if (note.latex !== undefined && typeof note.latex !== 'boolean') {
    errors.push('"latex" must be a boolean');
  }
  return { valid: errors.length === 0, errors };
}

// ── Content signals (heuristic fallback) ──────────────────────────────────

const SIGNALS = {
  definition: /(is|are)\s+(defined\s+as|known\s+as|called|termed|referred\s+to\s+as)|refers\s+to\s+(a|the|an)|is\s+the\s+\w+\s+of/i,
  exampleHeading: /^\s*(worked\s*|solved\s*)?examples?\s*:?\s*$/im,
  workedExample: /worked\s+example|solved\s+example|example\s+\d+[.:)]/i,
  solution: /^\s*(solution|answer|sol\.?)\s*[:—–-]/im,
  question: /^\s*(q\d*|question\s*\d*)\s*[:.)-]/im,
  yearExam: /\b(pyq|past\s*year|previous\s*year|board\s+question|entrance\s+(exam|question)|neb\s+question|old\s+question|20\d\d\s+exam|exam\s+20\d\d)\b/i,
  setHeading: /^\s*(practice\s+set|question\s+set|drill|exercise\s+set|set\s+\d+)\s*[:—–-]/im,
  formulaHeading: /^\s*formulas?\s*[:—–-]/im,
  latex: /\$\$?[^$\n]+\$\$?/,
  equation: /(^|\n)\s*[a-zA-Z]\s*=\s*[^\n=]{1,40}(?:$|\n)/,
  keyPoints: /^\s*(key\s+points?|important\s+points?|quick\s+(notes?|revision|reference)|rapid\s+revision|must\s+remember|mnemonic|trick)\s*[:—–-]/im,
  mapHeading: /^\s*(mind\s*map|concept\s*map)\s*[:—–-]/im,
};

// Baseline 0.2 everywhere; strong signals push a type past the threshold.
function contentScores(text, metadata) {
  const s = { concept: 0.2, note: 0.2, example: 0.2, formula: 0.2, pyq: 0.2, set: 0.2, mindmap: 0.2 };
  const lines = text.split('\n');
  const bullets = (text.match(/^\s*[-•*]\s+/gm) || []).length;
  const questionCount = (text.match(/^\s*(q\d*|question\s*\d*)\s*[:.)-]/gim) || []).length;
  const eqLines = lines.filter((l) => SIGNALS.equation.test(l)).length;
  const has = (k) => SIGNALS[k].test(text);

  if (has('mapHeading') || (bullets >= 4 && lines.some((l) => /→|->/i.test(l)))) s.mindmap = 0.92;
  if (has('latex')) s.formula = Math.max(s.formula, 0.95);
  if (has('formulaHeading') || (eqLines >= 2 && eqLines / lines.length >= 0.4)) s.formula = Math.max(s.formula, 0.85);
  if (has('yearExam')) s.pyq = Math.max(s.pyq, 0.9);
  if (has('workedExample')) s.example = Math.max(s.example, 0.9);
  if (has('exampleHeading')) s.example = Math.max(s.example, 0.75);
  if (has('setHeading')) s.set = Math.max(s.set, 0.88);
  if (questionCount >= 5 && has('solution')) s.set = Math.max(s.set, 0.8);
  if (questionCount >= 1 && has('solution')) s.example = Math.max(s.example, 0.7);
  if (questionCount >= 2 && !has('solution') && s.pyq === 0.2) s.pyq = Math.max(s.pyq, 0.6);
  if (has('keyPoints') || (bullets >= 3 && !questionCount && !has('solution'))) s.note = Math.max(s.note, 0.8);
  if (has('definition')) s.concept = Math.max(s.concept, 0.85);
  if (
    text.length > 300 && !questionCount && !has('solution') && !has('latex') &&
    !has('equation') && !has('yearExam') && !has('mapHeading') && !has('keyPoints')
  ) {
    s.concept = Math.max(s.concept, 0.6);
  }

  if (metadata?.latex === true) s.formula = Math.max(s.formula, 0.95);
  if (metadata?.year || metadata?.examSource) s.pyq = Math.max(s.pyq, 0.9);
  return s;
}

// Ties resolve to the first type in this fixed order — always deterministic.
const TIEBREAK_ORDER = ['pyq', 'set', 'example', 'formula', 'concept', 'note', 'mindmap'];

/**
 * Pure, idempotent classifier for the import-notes pipeline.
 * @param {object} note     parsed note file ({ title, notes, ... })
 * @param {string} filePath path relative to the content root (folder-first)
 * @param {object} metadata optional frontmatter ({ type, year, examSource, latex })
 * @returns {{ type: string|null, confidence: number, reason: string, needsReview: boolean }}
 */
export function classify(note, filePath = '', metadata = {}) {
  const schema = validateNoteSchema(note);
  if (!schema.valid) {
    return { type: null, confidence: 0, reason: `schema-error: ${schema.errors.join('; ')}`, needsReview: true };
  }
  if (metadata?.type && TAB_TYPES.includes(metadata.type)) {
    return { type: metadata.type, confidence: 1, reason: 'explicit metadata.type', needsReview: false };
  }

  const folder = tabTypeFromFolder(filePath);
  if (folder.type && folder.type !== 'note') {
    // Deterministic: concepts/ examples/ formula/ pyqs/ sets/ mindmap/ are
    // always their type, whatever the text says.
    return { type: folder.type, confidence: 1, reason: `folder "${folder.folder}/"`, needsReview: false };
  }

  // Generic notes/ folder or no type folder → content heuristics decide.
  const text = Array.isArray(note.notes) ? note.notes.join('\n') : '';
  const scores = contentScores(text, metadata);
  let best = 'note';
  let bestScore = -1;
  for (const t of TIEBREAK_ORDER) {
    if (scores[t] > bestScore) {
      best = t;
      bestScore = scores[t];
    }
  }
  const needsReview = bestScore < CLASSIFICATION_THRESHOLD;
  const type = needsReview && folder.type ? folder.type : best;
  return {
    type,
    confidence: bestScore,
    reason: needsReview
      ? `weak content signals (best "${best}" @ ${bestScore.toFixed(2)} < ${CLASSIFICATION_THRESHOLD}); flagged for manual review`
      : `content heuristics: "${best}" detected`,
    needsReview,
  };
}

// ── Allowed types per subject (admin API validation + auto-coercion) ──────
export const ALLOWED_BLOCK_TYPES = {
  science_math: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'numerical', 'mindmap', 'formula', 'symbols', 'learning_outcome', 'mind_recall', 'pyq', 'solved_example', 'premium_expansion', 'reference', 'revision_summary', 'graph'],
  biology: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'diagram_compare', 'mindmap', 'learning_outcome', 'mind_recall', 'pyq', 'premium_expansion', 'revision_summary', 'graph'],
  english: ['summary', 'keywords', 'important_points', 'learning_outcome', 'pyq', 'revision_summary'],
  nepali: ['byakaran', 'learning_outcome', 'revision_summary'],
  general_knowledge: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'numerical', 'mindmap', 'learning_outcome', 'mind_recall', 'pyq', 'solved_example', 'premium_expansion', 'reference', 'revision_summary', 'graph'],
};

const FALLBACK_BY_SUBJECT = {
  science_math: 'note_statement',
  biology: 'note_statement',
  english: 'important_points',
  nepali: 'byakaran',
  general_knowledge: 'note_statement',
};

const IMPORTANT_RE = /^\s*(important|note|remember|key\s*points?|warning|caution|alert|common\s+mistakes?|misconceptions?|exceptions?|shortcuts?|examiner\s+traps?|tricks?)\s*[:—\-]/i;
const FORMULA_HEADING_RE = /^\s*(formulas?|equations?|derivations?)\s*[:—\-]/i;
const FORMULA_LINE_RE = /[a-zA-Z0-9)\]]\s*=\s*[a-zA-Z0-9(+\-]/;
const SYMBOLS_HEADING_RE = /^\s*(symbols?|notations?|units?|si\s*units?|sign\s*conventions?)\s*[:—\-]/i;
const CONCEPT_RE = /\b(is|are)\s+(defined\s+as|known\s+as|called|termed|referred\s+to)|refers\s+to|\bmeans\b/i;
const EXAMPLE_RE = /\b(e\.g\.|e\.g|eg\.|for\s+example|for\s+instance|such\s+as)\b/i;
const PYQ_RE = /\b(past\s+year|board\s+question|entrance\s+question|repeated\s+question|frequently\s+asked|pyq|previous\s+year|neb\s+question|old\s+question)\b/i;
const NUMERICAL_RE = /\b(calculate|compute|find|evaluate|determine|solve|derive|how\s+much|how\s+many)\b/i;
const QUESTION_RE = /^\s*(Q\d*|Question\s*\d*)\s*[:.)-]|^\s*\d+[.)]\s*\S.*\?\s*$/i;
const ANSWER_RE = /^\s*(answer|solution|sol\.?)\s*[:—\-]|\*\*(answer|solution)\*\*|^#{0,3}\s*answer\b/im;
const RECALL_RE = /\b(mind\s+recall|quick\s+recall|memory\s+(trick|hack|aid)|remember\s+this|revision\s+points|flashcard|one-line|rapid\s+revision)\b/i;
const KEYWORD_RE = /^\s*(keywords?|key\s+terms?|vocabulary|glossary)\s*[:—\-]/i;
const ADVANCED_RE = /\b(advanced|deeper|higher\s+level|premium|additional\s+solved|deep\s+dive|bonus|challenging|difficult\s+mcq)\b/i;
const OUTCOME_RE = /^\s*(learning\s+outcomes?|objectives?|you\s+will\s+learn|what\s+you'?ll\s+learn)\s*[:—\-]/i;
const REFERENCE_RE = /^\s*(references?|sources?|further\s+reading|bibliography)\s*[:—\-]/i;
const SUMMARY_RE = /^\s*(summary|recap|revision\s+summary|key\s+takeaways?|conclusion)\s*[:—\-]/i;
const MAX_TOPIC_WORDS = 8;

// Normalized text used for duplicate detection (also used by the importer).
export function normalizeContent(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ── Block classification (canonical-schema aware) ─────────────────────────
// Returns { blockType, sectionIndex, reason }.
export function classifyBlock({ title = '', content = '' } = {}) {
  const titleText = (title || '').trim();
  const contentText = (content || '').trim();
  const firstLine = contentText.split(/\r?\n/)[0].trim();
  const headline = `${titleText}\n${firstLine}`.trim();
  const lower = contentText.toLowerCase();

  // Bare section-keyword titles (from bold/markdown headings like
  // "**Important:**"): "Important", "Summary", "Examples", …
  const BARE_TITLE_RE = /^(important|important\s+points?|key\s+points?|summary|recap|revision\s+summary|examples?|solved\s+examples?|answers?|solutions?|keywords?|symbols?|units?|formulas?|equations?|derivations?|references?|sources?|learning\s+outcomes?|objectives?|mind\s+recall|past\s+year\s+questions?|numericals?)$/i;

  if (contentText.includes('⚠') || IMPORTANT_RE.test(headline) || IMPORTANT_RE.test(titleText)) {
    return { blockType: 'important_points', reason: 'Important / mistakes / traps marker' };
  }
  if (BARE_TITLE_RE.test(titleText)) {
    const keyword = titleText.toLowerCase();
    if (keyword.startsWith('important') || keyword.includes('key point') || keyword.startsWith('recap') || keyword.startsWith('revision')) {
      return { blockType: 'important_points', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('summary')) {
      return { blockType: 'revision_summary', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('example')) {
      return { blockType: 'note_example', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.includes('solved') || keyword.includes('answer') || keyword.includes('solution')) {
      return { blockType: 'solved_example', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.includes('past year')) {
      return { blockType: 'pyq', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('keyword') || keyword.startsWith('mind recall')) {
      return { blockType: 'mind_recall', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('symbol') || keyword.startsWith('unit')) {
      return { blockType: 'symbols', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('formula') || keyword.startsWith('equation') || keyword.startsWith('derivation')) {
      return { blockType: 'formula', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('reference') || keyword.startsWith('source')) {
      return { blockType: 'reference', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.includes('learning outcome') || keyword.startsWith('objective')) {
      return { blockType: 'learning_outcome', reason: `Bare section heading "${titleText}"` };
    }
    if (keyword.startsWith('numerical')) {
      return { blockType: 'solved_example', reason: `Bare section heading "${titleText}"` };
    }
  }
  // Graph / plot blocks — carry a structured GraphSpec in diagramData.graph.
  if (/^(graph|plot|curve)\b/i.test(firstLine) || /\bgraph\b/i.test(titleText)) {
    return { blockType: 'graph', reason: 'Graph / plot heading or title' };
  }
  if (OUTCOME_RE.test(firstLine)) {
    return { blockType: 'learning_outcome', reason: 'Learning outcomes heading' };
  }
  if (REFERENCE_RE.test(firstLine)) {
    return { blockType: 'reference', reason: 'Reference / sources heading' };
  }
  if (SUMMARY_RE.test(firstLine)) {
    return { blockType: 'revision_summary', reason: 'Summary / recap heading' };
  }
  if (RECALL_RE.test(lower)) {
    return { blockType: 'mind_recall', reason: 'Mind recall / memory aid markers' };
  }
  if (KEYWORD_RE.test(firstLine)) {
    return { blockType: 'keywords', reason: 'Keywords heading' };
  }
  if (PYQ_RE.test(lower)) {
    return { blockType: 'pyq', reason: 'Past-year / board / entrance question markers' };
  }
  if (SYMBOLS_HEADING_RE.test(firstLine)) {
    return { blockType: 'symbols', reason: 'Symbols / notation heading' };
  }
  if (EXAMPLE_RE.test(contentText)) {
    // Example signals ("e.g.", "for example", …) beat equation detection so
    // an example line containing a formula stays an example.
    return { blockType: 'note_example', reason: 'Contains an example signal' };
  }
  if (NUMERICAL_RE.test(lower) && /\d/.test(contentText)) {
    // Numerical problems beat plain equations: "Calculate F if F = ma …"
    // is a solved example, not a formula reference.
    return { blockType: 'solved_example', reason: 'Numerical / calculation problem' };
  }
  if (FORMULA_HEADING_RE.test(firstLine) || FORMULA_LINE_RE.test(firstLine)) {
    return { blockType: 'formula', reason: 'Equation-style line' };
  }
  if (QUESTION_RE.test(firstLine) || /[?]\s*$/.test(firstLine)) {
    if (ANSWER_RE.test(contentText)) {
      return { blockType: 'solved_example', reason: 'Question with answer (solved example)' };
    }
    return { blockType: 'pyq', reason: 'Question line detected' };
  }
  if (ADVANCED_RE.test(lower) && lower.length > 40) {
    return { blockType: 'premium_expansion', reason: 'Advanced / deep content markers' };
  }
  if (CONCEPT_RE.test(headline)) {
    return { blockType: 'note_concept', reason: 'Definition-style phrasing' };
  }
  const heading = titleText || firstLine;
  const words = heading.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= MAX_TOPIC_WORDS && !/[.?!…]$/.test(heading) && !heading.includes(',')) {
    return { blockType: 'note_topic', reason: `Short title-like text (${words.length} words)` };
  }
  return { blockType: 'note_statement', reason: 'Declarative statement' };
}

// ── Legacy API (admin CMS): subject-aware suggestion ──────────────────────
/**
 * Classify content, coercing to a type the subject accepts. Never rejects.
 * @param {string} subjectType science_math | biology | english | nepali | general_knowledge
 * @returns {{ blockType: string, reason: string, coerced: boolean }}
 */
export function classifyContent({ title = '', content = '' } = {}) {
  const { blockType, reason } = classifyBlock({ title, content });
  return { blockType, reason };
}

export function suggestForSubject(subjectType, title, content) {
  const { blockType, reason } = classifyBlock({ title, content });
  const allowed = ALLOWED_BLOCK_TYPES[subjectType] ?? ALLOWED_BLOCK_TYPES.science_math;
  if (allowed.includes(blockType)) return { blockType, reason, coerced: false };
  const coercedType = FALLBACK_BY_SUBJECT[subjectType] ?? 'note_statement';
  return {
    blockType: coercedType,
    reason: `${reason}; "${blockType}" is not available for ${subjectType}, using "${coercedType}"`,
    coerced: true,
  };
}

// ── Heading-driven section splitter ───────────────────────────────────────
//
// Splits a long raw notes blob into blocks by recognized section headings
// (### Example, **Important:**, <h2>…</h2>, 📘 markers, all-caps lines, …).
// Every chunk is then classified. Used by the importer so contributors can
// paste raw material (HTML or markdown) and get the standard hierarchy back.

const SECTION_MARKER_RE = /^(════+|📘|📝|💡|⚡|🔥|⚖️|📐|🧪|🔬|🔑|🌡|⚠|✅|🎯|🧠|📌|SECTION\s+[A-Z]|[A-Z][A-Z0-9 .:'"—]{14,})/;
const EMOJI_PREFIX_RE = /^[📘📝💡⚡🔥⚖️📐🧪🔬🔑🌡⚠✅🎯🧠📌]+\s*/;
const MAX_CHUNK_CHARS = 9000; // hard cap for a single block
const PART_TARGET_CHARS = 2600;
const MAX_PARTS = 16;

function detectHeading(line) {
  const html = line.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>/is);
  if (html) return html[2].replace(/<[^>]+>/g, '').trim();
  const md =
    line.match(/^#{1,4}\s+(.*)$/) ||
    // Bold marker headings only when the whole line is the marker: a
    // standalone "**Summary**" or "**Important:**" (closing stars may sit
    // before the colon or after the last word). Bold phrases that continue
    // with inline text — "**Answer:** Given", "**Example:** text…" — are
    // paragraph content, never headings: treating them as headings would
    // split the section at every answer and discard the text after the
    // closing stars.
    line.match(/^\*\*([^*]+)[:\u2014-]\*\*\s*$/) ||
    line.match(/^\*\*([^*]+)\*\*\s*$/);
  if (md) return (md[1] || '').trim();
  const trimmed = line.trim();
  // Section markers and all-caps titles (legacy text corpus style). Skip
  // sentence-like all-caps lines (ending in .?!…) and over-long lines.
  if (
    trimmed.length <= 80 &&
    !/[.?!…]$/.test(trimmed) &&
    SECTION_MARKER_RE.test(trimmed)
  ) {
    return trimmed.replace(EMOJI_PREFIX_RE, '').slice(0, 90);
  }
  return null;
}

export function splitIntoSections(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  const flush = () => {
    if (current && current.content.trim()) sections.push(current);
  };

  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      flush();
      current = { title: heading, content: '' };
      continue;
    }
    if (!current) current = { title: '', content: '' };
    current.content += `${line}\n`;
  }
  flush();

  // Enforce the size cap: over-long sections are re-partitioned into 2–4
  // roughly equal paragraph groups so no single block can ever exceed
  // MAX_CHUNK_CHARS (this is what created 90 KB monsters before).
  const out = [];
  let partNo = 0;
  for (const section of sections) {
    const total = section.content.length;
    if (total <= MAX_CHUNK_CHARS) {
      out.push(section);
      continue;
    }
    let paragraphs = section.content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    // Single giant paragraph (no blank lines): fall back to line groups.
    if (paragraphs.length <= 1) {
      paragraphs = section.content.split('\n').map((p) => p.trim()).filter(Boolean);
    }
    if (paragraphs.length <= 1) {
      // One huge single-line blob: break it by words instead of giving up.
      const words = section.content.split(/\s+/).filter(Boolean);
      const groups = [];
      let acc = '';
      for (const w of words) {
        if (w.length > PART_TARGET_CHARS) {
          if (acc) {
            groups.push(acc);
            acc = '';
          }
          for (let i = 0; i < w.length; i += PART_TARGET_CHARS) {
            groups.push(w.slice(i, i + PART_TARGET_CHARS));
          }
          continue;
        }
        if (acc && acc.length + w.length + 1 > PART_TARGET_CHARS) {
          groups.push(acc);
          acc = w;
        } else {
          acc = acc ? `${acc} ${w}` : w;
        }
      }
      if (acc) groups.push(acc);
      groups.forEach((g) => {
        partNo += 1;
        const base = section.title.replace(/\s*—\s*Part \d+$/, '') || 'Notes';
        out.push({ title: `${base} — Part ${partNo}`, content: g });
      });
      continue;
    }
    // Break up any paragraph that alone exceeds the target size so no group
    // can silently balloon to MAX_CHUNK_CHARS.
    const pieces = [];
    for (const p of paragraphs) {
      if (p.length <= PART_TARGET_CHARS) {
        pieces.push(p);
        continue;
      }
      const sub = p.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      if (sub.length <= 1) {
        pieces.push(p.slice(0, PART_TARGET_CHARS - 1));
        pieces.push(p.slice(PART_TARGET_CHARS - 1));
        continue;
      }
      let acc = '';
      for (const s of sub) {
        if (acc && acc.length + s.length > PART_TARGET_CHARS) {
          pieces.push(acc);
          acc = s;
        } else {
          acc = acc ? `${acc} ${s}` : s;
        }
      }
      if (acc) pieces.push(acc);
    }
    const parts = Math.min(MAX_PARTS, Math.max(2, Math.ceil(total / PART_TARGET_CHARS)));
    const target = total / parts;
    const groups = Array.from({ length: parts }, () => []);
    let gi = 0;
    let acc2 = 0;
    for (const p of pieces) {
      groups[gi].push(p);
      acc2 += p.length + 2;
      if (acc2 >= target && gi < parts - 1) {
        gi += 1;
        acc2 = 0;
      }
    }
    groups.filter((g) => g.length).forEach((g) => {
      partNo += 1;
      const base = section.title.replace(/\s*—\s*Part \d+$/, '') || 'Notes';
      out.push({ title: `${base} — Part ${partNo}`, content: g.join('\n\n') });
    });
  }
  return out.filter((s) => s.content.trim());
}

// Classify a whole topic's raw notes into canonical blocks.
// Returns [{ title, content, blockType, sectionIndex, accessLevel }].
export function structureTopic(title, rawNotes) {
  const chunks = splitIntoSections(rawNotes);
  if (!chunks.length) return [];
  return chunks.map((chunk, i) => {
    const chunkTitle = chunk.title || (i === 0 ? title : `${title} — Part ${i + 1}`);
    const c = classifyBlock({ title: chunkTitle, content: chunk.content });
    return {
      title: chunkTitle,
      content: chunk.content.trim(),
      blockType: c.blockType,
      sectionIndex: sectionIndexForBlockType(c.blockType),
      classifiedReason: c.reason,
    };
  });
}
