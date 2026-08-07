// Quick Review pool for THIS section (Class 12) — mirrors the global
// backend's quickQuestions service, minus the quiz-MCQ source (this section's
// schema has no QuizQuestion model). The global backend's
// getQuickQuestionsAcrossSections proxies to this endpoint so the
// home-page / dashboard boxes draw from every section's contents.
//
// Every question carries exactly 4 options with one correct answer:
//   • term     — "which term appears in chapter X?" from keywords blocks
//   • formula  — "which formula is studied in chapter X?" from formula blocks
//   • concept  — "which concept belongs to chapter X?" from concept/statement blocks
// Distractors are pulled from OTHER chapters so the correct one is unique.

import { prisma } from '../config/db.js';

const TERM_SOURCES = ['keywords', 'formula', 'note_concept', 'note_statement', 'note_topic', 'note_important'];

const QUESTION_LABEL = {
  keywords: { kind: 'term', label: 'key term' },
  formula: { kind: 'formula', label: 'formula' },
  note_concept: { kind: 'concept', label: 'concept' },
  note_statement: { kind: 'concept', label: 'concept' },
  note_topic: { kind: 'concept', label: 'topic' },
  note_important: { kind: 'concept', label: 'concept' },
};

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

function makeOptions(correct, distractors) {
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.findIndex((o) => normalize(o) === normalize(correct)) };
}

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

  const statements = [];
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

  for (const s of statements) {
    const others = statements.filter((x) => x.chapterId !== s.chapterId && x.blockType === s.blockType);
    const distractors = pickDistinct(others.map((x) => x.text), s.text, 3);
    if (distractors.length < 3) continue;

    const { options, correctIndex } = makeOptions(s.text, distractors);
    if (correctIndex < 0) continue;

    const meta = QUESTION_LABEL[s.blockType];
    const qKind = s.blockType === 'keywords' ? 'term' : s.blockType === 'formula' ? 'formula' : 'concept';
    const chapterName = s.chapterTitle || 'this chapter';
    const question =
      qKind === 'term'
        ? `Which of these is ${/^[aeiou]/i.test(meta.label) ? 'an' : 'a'} ${meta.label} used in "${chapterName}"?`
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
    });
  }

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
