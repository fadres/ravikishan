// Quick Review pool — powers the home-page "changing question" box.
//
// Every question is guaranteed to be answerable from the study library and
// always carries exactly 4 options with one correct answer:
//   • mcq      — real questions harvested from published quiz papers
//   • term     — "which term appears in chapter X?" from keywords blocks
//   • formula  — "which formula is studied in chapter X?" from formula blocks
//   • concept  — "which concept belongs to chapter X?" from concept/statement blocks
// Distractors are pulled from OTHER chapters so the correct one is unique.

import { prisma } from '../config/db.js';

const OPTION_SOURCES = {
  keywords: { kind: 'term', label: 'key term' },
  formula: { kind: 'formula', label: 'formula' },
  note_concept: { kind: 'concept', label: 'concept' },
  note_statement: { kind: 'concept', label: 'concept' },
  note_topic: { kind: 'concept', label: 'topic' },
  note_important: { kind: 'concept', label: 'concept' },
};

const TERM_SOURCES = ['keywords', 'formula', 'note_concept', 'note_statement', 'note_topic', 'note_important'];

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}|/\\\u2022-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistinct(pool, exclude, n) {
  const shuffled = shuffle(pool.filter((x) => normalize(x) !== normalize(exclude)));
  const out = [];
  for (const x of shuffled) {
    if (out.length >= n) break;
    if (!out.some((o) => normalize(o) === normalize(x))) out.push(x);
  }
  return out;
}

// A 4-option puzzle: [correct + 3 distractors] shuffled, returns the index.
function makeOptions(correct, distractors) {
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.findIndex((o) => normalize(o) === normalize(correct)) };
}

// Split a keywords/formula block into individual items (terms or formula lines).
function splitItems(block) {
  if (block.blockType === 'keywords') {
    return String(block.contentRichtext || '')
      .split(/\n|;/)
      .map((s) => s.replace(/^[-•*\d.)]\s*/, '').trim())
      .filter((s) => s.length > 1 && s.length < 80);
  }
  if (block.blockType === 'formula') {
    return String(block.contentRichtext || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => /[a-zA-Z0-9)\]]\s*=\s*[a-zA-Z0-9(+\-]/.test(s) && s.length < 80);
  }
  return [];
}

function shortText(s, n = 90) {
  if (!s) return '';
  const t = String(s).replace(/[#*_`~>|-]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export async function getQuickQuestions(viewerLevel = 3, { limit = 40 } = {}) {
  const questions = [];

  // ── 1. Real MCQs from published quizzes ──────────────────────────
  const mcqRows = await prisma.quizQuestion.findMany({
    where: { questionType: 'mcq', quiz: { status: 'published' } },
    orderBy: { createdAt: 'desc' },
    take: 120,
    select: {
      id: true,
      question: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      quiz: { select: { title: true, chapter: { select: { title: true } } } },
    },
  });
  for (const q of mcqRows) {
    const opts = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
    const correctIndex = opts.findIndex((o) => normalize(o) === normalize(q.correctAnswer));
    if (opts.length >= 2 && correctIndex >= 0) {
      questions.push({
        id: `mcq-${q.id}`,
        kind: 'mcq',
        question: q.question,
        options: opts.slice(0, 4),
        correctIndex: correctIndex < 4 ? correctIndex : null,
        source: q.quiz.title,
        chapterName: q.quiz.chapter?.title || '',
        explanation: shortText(q.explanation, 180) || undefined,
      });
    }
  }

  // ── 2. Knowledge-graph "belongs to chapter" questions ────────────────
  const blocks = await prisma.contentBlock.findMany({
    where: {
      accessLevel: { gte: Math.min(viewerLevel, 3) },
      blockType: { in: TERM_SOURCES },
      chapter: { status: 'published' },
    },
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: {
      id: true,
      blockType: true,
      title: true,
      contentRichtext: true,
      chapter: { select: { id: true, title: true, slug: true } },
    },
  });

  // Pre-digest every block into "statements" we can use as options.
  const statements = []; // { text, chapterTitle, chapterId, blockType }
  for (const b of blocks) {
    const items = splitItems(b);
    if (b.blockType === 'keywords' || b.blockType === 'formula') {
      for (const it of items) statements.push({ text: it, chapterId: b.chapter.id, chapterTitle: b.chapter.title, blockType: b.blockType });
      continue;
    }
    const text = shortText(b.contentRichtext || b.title, 70);
    if (text && text.length > 8) {
      statements.push({ text, chapterId: b.chapter.id, chapterTitle: b.chapter.title, blockType: b.blockType });
    }
  }

  const byChapter = new Map();
  for (const s of statements) {
    if (!byChapter.has(s.chapterId)) byChapter.set(s.chapterId, []);
    byChapter.get(s.chapterId).push(s);
  }

  for (const s of statements) {
    const others = statements.filter((x) => x.chapterId !== s.chapterId && x.blockType === s.blockType);
    const distractors = pickDistinct(others.map((x) => x.text), s.text, 3);
    if (distractors.length < 3) continue;

    const { options, correctIndex } = makeOptions(s.text, distractors);
    if (correctIndex < 0) continue;

    const meta = OPTION_SOURCES[s.blockType];
    const qKind = s.blockType === 'keywords' ? 'term' : s.blockType === 'formula' ? 'formula' : 'concept';
    const chapterName = s.chapterTitle || 'this chapter';
    const question =
      qKind === 'term'
        ? `Which of these is a key ${meta.label} used in "${chapterName}"?`
        : qKind === 'formula'
          ? `Which of these formulas is correct for "${chapterName}"?`
          : `Which ${meta.label} belongs to "${chapterName}"?`;
    questions.push({
      id: `${qKind}-${s.blockType}-${(s.chapterId + s.text).slice(0, 16)}`,
      kind: qKind,
      question,
      options,
      correctIndex,
      chapterName,
      occurrences: byChapter.get(s.chapterId).length,
    });
  }

  // Shuffle, de-dup and cap.
  const seen = new Set();
  const picked = [];
  for (const q of shuffle(questions)) {
    if (picked.length >= limit) break;
    if (q.correctIndex === null || q.correctIndex === undefined) continue;
    const key = `${q.kind}:${q.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(q);
  }

  return picked;
}