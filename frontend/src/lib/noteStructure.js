// ── Syllabus-structured note system ────────────────────────────────────────
// Every note page is organized into a fixed 3-level hierarchy so a reader can
// always tell exactly where they are:
//   Unit / Chapter → A, B, C, D …    (centered heading, gold)
//   Topic          → 1, 2, 3, 4 …    (left-margin rail, sky/cyan)
//   Concept        → i, ii, iii …    (heading badge, violet)
// Each level has ONE fixed colour and the legend at the head of the page
// explains them. Every block is grouped to the syllabus topic it belongs to
// (Topic model), and within a topic each note_topic block opens a new concept
// group — so this system arranges both existing and freshly-added content
// into its proper syllabus position automatically.
// ───────────────────────────────────────────────────────────────────────────

export const STRUCTURE_COLORS = {
  chapter: '#fbbf24', // gold — all Unit/Chapter headings (A, B, C…)
  topic: '#38bdf8',   // cyan — all Topic rails (1, 2, 3…)
  concept: '#a78bfa', // violet — all Concept badges (i, ii, iii…)
};

export const STRUCTURE_LEGEND = [
  { symbol: 'A', color: STRUCTURE_COLORS.chapter, label: 'Unit / Chapter' },
  { symbol: '1', color: STRUCTURE_COLORS.topic, label: 'Topic' },
  { symbol: 'i', color: STRUCTURE_COLORS.concept, label: 'Concept' },
];

// Stable colour + short label per syllabus section, used for the section chip
// on every note block and the in-chapter Find filters. Mirrors the backend
// SECTION_ORDER keys 1:1 so any blockType/sectionKey is covered automatically.
export const SECTION_STYLE = {
  topic: { color: '#fbbf24', label: 'Topic' },
  learning: { color: '#4ade80', label: 'Learning Outcomes' },
  diagram: { color: '#818cf8', label: 'Topic Diagram' },
  concept: { color: '#a78bfa', label: 'Concept' },
  examples: { color: '#38bdf8', label: 'Examples' },
  important: { color: '#fb7185', label: 'Important Points' },
  mind_recall: { color: '#facc15', label: 'Mind Recall' },
  pyq: { color: '#f87171', label: 'Past Year Questions' },
  solved: { color: '#fb923c', label: 'Solved Examples' },
  premium: { color: '#e879f9', label: 'Advanced Learning' },
  references: { color: '#94a3b8', label: 'References' },
};

export function sectionStyleForKey(key) {
  return SECTION_STYLE[key] || { color: '#7dd3fc', label: key || 'Section' };
}

// Stable scroll anchor for a concept: "topic-2-concept-3" → #topic-2-concept-3
export function conceptAnchor(topicNumber, conceptIndex) {
  return `topic-${topicNumber}-concept-${conceptIndex + 1}`;
}

// 1 → A, 2 → B, … 26 → Z, 27 → AA (Excel-style column letters).
export function chapterLetter(n) {
  let out = '';
  let v = n;
  while (v > 0) {
    v -= 1;
    out = String.fromCharCode(65 + (v % 26)) + out;
    v = Math.floor(v / 26);
  }
  return out || 'A';
}

// 1 → i, 2 → ii, … classic lowercase roman numerals.
export function romanNumeral(n) {
  if (n <= 0) return '';
  const table = [
    [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'],
    [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'],
    [5, 'v'], [4, 'iv'], [1, 'i'],
  ];
  let out = '';
  let v = n;
  for (const [value, symbol] of table) {
    while (v >= value) {
      out += symbol;
      v -= value;
    }
  }
  return out;
}

// Split a topic's blocks into concepts: each note_topic block starts a new
// concept group; stray blocks before the first one form "i".
function splitConcepts(tBlocks) {
  const concepts = [];
  let current = null;
  for (const b of tBlocks) {
    if (b.blockType === 'note_topic') {
      current = { numeral: romanNumeral(concepts.length + 1), blocks: [] };
      concepts.push(current);
    }
    if (current === null) {
      current = { numeral: romanNumeral(1), blocks: [] };
      concepts.push(current);
    }
    current.blocks.push(b);
  }
  return concepts.length ? concepts : [{ numeral: romanNumeral(1), blocks: tBlocks }];
}

// Build the full display structure of one chapter (unit).
export function buildChapterStructure({ chapter, chapters = [], topics = [], blocks = [] }) {
  let unitNumber = 1;
  if (Array.isArray(chapters) && chapters.length) {
    const found = chapters.findIndex((c) => c.slug === chapter?.slug);
    if (found >= 0) unitNumber = found + 1;
  }
  const letter = chapterLetter(unitNumber);

  // Group blocks by topicId using the syllabus topic order.
  const byTopic = new Map();
  for (const b of blocks) {
    const key = b.topicId || 'untitled';
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key).push(b);
  }

  const orderedTopics = [...topics].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const resultTopics = [];

  orderedTopics.forEach((t, i) => {
    resultTopics.push({ topic: t, number: i + 1, concepts: splitConcepts(byTopic.get(t.id) || []) });
    byTopic.delete(t.id);
  });

  // Blocks with no syllabus topic land in a final "Other notes" rail so
  // nothing is ever hidden.
  const leftover = byTopic.get('untitled') || [];
  if (leftover.length > 0) {
    const last = orderedTopics[orderedTopics.length - 1];
    resultTopics.push({
      topic: { id: null, title: 'Other notes', description: null, sortOrder: (last?.sortOrder ?? 0) + 1 },
      number: resultTopics.length + 1,
      concepts: splitConcepts(leftover),
    });
  }

  return {
    unitLetter: letter,
    unitTitle: chapter?.title || '',
    topics: resultTopics.filter((t) => t.concepts.some((c) => c.blocks.length > 0)),
  };
}