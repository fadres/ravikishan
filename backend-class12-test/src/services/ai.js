// Section-scoped AI learning engine (offline-first).
//
// Same design as the global backend's src/services/ai.js, scoped to THIS
// section: retrieval runs only against this section's own database and the
// optional LLM pass uses this section's own AI endpoint (own env). The
// viewer level comes from the shared-JWT payload (req.user.accessLevel) —
// there is no user table here, so gating never queries a database for the
// viewer.

import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { env } from '../config/env.js';
import { SECTION } from '../lib/section.js';
import { normalizeText, words, keywordOverlap, gradeAnswer } from './quiz.js';
import { queueEvent } from './progressSync.js';

const BLOCK_TEXT_FIELDS = ['contentRichtext', 'contentCode'];

function cleanText(s) {
  return String(s || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`~>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s, n = 600) {
  const t = cleanText(s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function sentences(s) {
  return cleanText(s)
    .split(/[.!?]+(?=\s|$)/)
    .map((x) => x.trim())
    .filter((x) => x.length > 12);
}

// ── Library access (viewer-gated by the token's accessLevel) ─────────────

async function loadChapter(viewerLevel, chapterId) {
  if (!chapterId) return null;
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      subject: { select: { id: true, name: true, slug: true, class: { select: { slug: true } } } },
      blocks: {
        where: { accessLevel: { gte: viewerLevel } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!chapter) return null;
  const link = {
    classSlug: chapter.subject?.class?.slug ?? null,
    subjectSlug: chapter.subject?.slug ?? null,
    chapterSlug: chapter.slug ?? null,
  };
  return { ...chapter, blocks: chapter.blocks.map((b) => ({ ...b, link })) };
}

async function loadLibrary(viewerLevel, { subjectId, chapterId, limit = 60 } = {}) {
  const blocks = await prisma.contentBlock.findMany({
    where: {
      accessLevel: { gte: viewerLevel },
      ...(subjectId ? { chapter: { subjectId } } : {}),
      ...(chapterId ? { chapterId } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    take: limit,
    select: {
      id: true,
      blockType: true,
      title: true,
      contentRichtext: true,
      contentCode: true,
      chapter: {
        select: {
          id: true,
          title: true,
          slug: true,
          subject: { select: { slug: true, class: { select: { slug: true } } } },
        },
      },
    },
  });
  return blocks.map((b) => {
    const { chapter, ...rest } = b;
    return {
      ...rest,
      chapter,
      link: {
        classSlug: chapter?.subject?.class?.slug ?? null,
        subjectSlug: chapter?.subject?.slug ?? null,
        chapterSlug: chapter?.slug ?? null,
      },
    };
  });
}

// ── Optional LLM upgrade ──────────────────────────────────────────────────

async function callLlm(messages, { temperature = 0.4, maxTokens = 900 } = {}, ai = env) {
  if (!ai.aiEndpoint || !ai.aiApiKey) return null;
  try {
    const res = await fetch(ai.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ai.aiApiKey}`,
      },
      body: JSON.stringify({
        model: ai.aiModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function llmOr(grounding, messages) {
  const llm = await callLlm(messages, {}, env);
  return llm ? { generated: true, content: llm } : grounding;
}

// ── 1. Doubt solver (section-scoped) ──────────────────────────────────────

export async function solveDoubt(viewerLevel, { question, chapterId, subjectId }) {
  if (!question) throw new AppError(400, 'Question is required');
  const q = String(question).slice(0, 2000);
  const qWords = new Set(words(q).filter((w) => w.length > 3));
  const blocks = chapterId
    ? (await loadChapter(viewerLevel, chapterId))?.blocks ?? []
    : await loadLibrary(viewerLevel, { subjectId, limit: 80 });

  const scored = blocks
    .map((b) => {
      const text = [b.title, b.contentRichtext, b.contentCode].filter(Boolean).join(' ');
      const textWords = new Set(words(text));
      const hits = [...qWords].filter((w) => textWords.has(w)).length;
      return { block: b, score: hits / Math.max(qWords.size, 1) };
    })
    .filter((x) => x.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const passages = scored.map(({ block, score }) => ({
    id: block.id,
    title: block.title,
    blockType: block.blockType,
    passage: truncate([block.contentRichtext, block.contentCode].filter(Boolean).join('\n'), 900),
    match: Math.round(score * 100),
    link: block.link ?? null,
  }));

  const grounding = {
    answer: passages.length
      ? `Based on your ${SECTION.label} study notes${chapterId ? ' for this chapter' : ''}, here is the most relevant material:\n\n${passages.map((p, i) => `${i + 1}. ${p.title}: ${p.passage}`).join('\n\n')}\n\nTip: if this does not fully answer your doubt, rephrase your question around the key term you are stuck on.`
      : 'I could not find a strong match in the study library yet. Try asking about a specific topic or chapter so I can pull the right notes.',
    sources: passages,
  };

  const result = await llmOr(grounding, [
    { role: 'system', content: 'You are a patient tutor for a Class 11/12 student. Answer the doubt concisely using the provided notes as grounding. Reply in the same language as the question.' },
    { role: 'user', content: `Notes:\n${passages.map((p) => `${p.title}: ${p.passage}`).join('\n---\n')}\n\nStudent's doubt: ${q}` },
  ]);

  await queueEvent('learning', { source: 'ai.doubt', chapterId: chapterId ?? null, metadata: { question: q } }).catch(() => {});
  return { sectionId: SECTION.id, sectionLabel: SECTION.label, tool: 'doubt_solver', query: q, ...result };
}

// ── 2. Note summarizer ────────────────────────────────────────────────────

export async function summarizeNotes(viewerLevel, { chapterId, level = 'short' }) {
  const chapter = await loadChapter(viewerLevel, chapterId);
  if (!chapter) throw new AppError(404, 'Chapter not found');

  const allText = chapter.blocks.map((b) => cleanText(b.contentRichtext || b.contentCode || '')).filter(Boolean);
  const joined = allText.join(' ');
  const totalWords = joined.split(/\s+/).filter(Boolean).length;
  const ratio = level === 'detailed' ? 0.35 : level === 'medium' ? 0.2 : 0.1;
  const target = Math.min(400, Math.max(80, Math.round(totalWords * ratio)));

  const allSentences = chapter.blocks.flatMap((b) =>
    sentences(b.contentRichtext || b.contentCode || '').map((s) => ({
      s,
      type: b.blockType,
      title: b.title,
    })),
  );
  const keywords = extractKeywords(chapter.blocks);
  const scored = allSentences.map(({ s, type, title }) => {
    let score = 0;
    if (/is defined as|is the|refers to|means|state[s]? that|states? that/i.test(s)) score += 3;
    if (type === 'note_important' || type === 'important_points' || type === 'summary') score += 2;
    if (type === 'formula' || type === 'symbols') score += 1.5;
    const hits = keywords.filter((k) => s.toLowerCase().includes(k)).length;
    score += hits;
    return { s, type, title, score: score + Math.random() * 0.001 };
  });

  const selected = [];
  let budget = 0;
  for (const item of scored.sort((a, b) => b.score - a.score)) {
    if (budget >= target) break;
    selected.push(item);
    budget += item.s.split(' ').length;
  }
  const ordered = selected.sort((a, b) => allSentences.indexOf(a) - allSentences.indexOf(b));
  const summary = ordered.map(({ s }) => `• ${s.trim()}.`).join('\n');

  const grounding = {
    summary: summary || 'No summarisable content found in this chapter yet.',
    stats: { totalWords, summaryWords: ordered.length, level },
  };

  const result = await llmOr(grounding, [
    { role: 'system', content: `Summarize the following class notes into ${level === 'detailed' ? 'a detailed but structured' : level === 'medium' ? 'a concise' : 'a very short bullet-point'} summary covering the key definitions, formulas and important points.` },
    { role: 'user', content: truncate(joined, 12000) },
  ]);

  await queueEvent('learning', { source: 'ai.summarize', chapterId, metadata: { level } }).catch(() => {});
  return { sectionId: SECTION.id, sectionLabel: SECTION.label, tool: 'summarizer', chapter: chapter.title, ...result };
}

// ── 3. Concept explainer ──────────────────────────────────────────────────

export async function explainConcept(viewerLevel, { concept, chapterId }) {
  if (!concept) throw new AppError(400, 'Concept is required');
  const conceptLower = concept.toLowerCase();
  const blocks = chapterId
    ? (await loadChapter(viewerLevel, chapterId))?.blocks ?? []
    : await loadLibrary(viewerLevel, { limit: 100 });

  const match = blocks
    .map((b) => {
      const text = cleanText(b.contentRichtext || b.contentCode || '');
      const idx = text.toLowerCase().indexOf(conceptLower);
      return { block: b, idx, text };
    })
    .filter((x) => x.idx >= 0)
    .sort((a, b) => (a.idx === -1 ? 1 : a.idx) - (b.idx === -1 ? 1 : b.idx))[0];

  const definition = match
    ? `${match.block.title ? `**${match.block.title}** — ` : ''}${match.text.slice(Math.max(0, match.idx - 80), match.idx + 320).trim()}`
    : null;

  const grounding = {
    explanation: definition
      ? `**${concept}**\n\n${definition}\n\nTo master this concept: (1) write it in your own words, (2) teach it to someone else, (3) solve a related numerical or example question.`
      : `**${concept}**\n\nThis concept is not yet covered in the study library. Try searching the chapter for related terms, or ask me to explain it with a broader term.`,
    found: Boolean(definition),
    source: match ? { id: match.block.id, title: match.block.title, link: match.block.link ?? null } : null,
  };

  const result = await llmOr(grounding, [
    { role: 'system', content: 'Explain this concept simply for a high-school student: definition, key idea, one analogy and one example. Use plain language.' },
    { role: 'user', content: `Concept: ${concept}\nGrounding notes:\n${definition || '(none found)'}` },
  ]);

  await queueEvent('learning', { source: 'ai.explain', chapterId: chapterId ?? null, metadata: { concept } }).catch(() => {});
  return { sectionId: SECTION.id, sectionLabel: SECTION.label, tool: 'concept_explainer', concept, ...result };
}

// ── 4. Revision notes ─────────────────────────────────────────────────────

function extractKeywords(blocks, limit = 12) {
  const freq = new Map();
  const stop = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'the', 'and', 'for', 'are', 'was', 'not', 'but', 'can', 'its', 'has']);
  for (const b of blocks) {
    for (const w of words(`${b.title || ''} ${b.contentRichtext || ''} ${b.contentCode || ''}`)) {
      if (w.length < 4 || stop.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}

export async function revisionNotes(viewerLevel, { chapterId, subjectId }) {
  const blocks = chapterId
    ? (await loadChapter(viewerLevel, chapterId))?.blocks ?? []
    : await loadLibrary(viewerLevel, { subjectId, limit: 80 });

  const keywords = extractKeywords(blocks);
  const important = blocks
    .filter((b) => ['note_important', 'important_points', 'summary', 'keywords', 'formula', 'symbols'].includes(b.blockType))
    .map((b) => ({ type: b.blockType, title: b.title, text: truncate(b.contentRichtext || b.contentCode || '', 260) }))
    .slice(0, 12);
  const definitions = blocks
    .map((b) => cleanText(b.contentRichtext || b.contentCode || ''))
    .flatMap(sentences)
    .filter((s) => /is defined as|is the|refers to|means|states? that/i.test(s))
    .slice(0, 8);
  const formulas = blocks
    .filter((b) => b.blockType === 'formula' || b.blockType === 'symbols')
    .map((b) => truncate(b.contentRichtext || b.contentCode || '', 200))
    .slice(0, 10);

  return {
    sectionId: SECTION.id,
    sectionLabel: SECTION.label,
    tool: 'revision_notes',
    keywords,
    important,
    definitions,
    formulas,
    note: 'Review these in 2-minute bursts, then self-test with the quiz generator.',
  };
}

// ── 5. Question generator ─────────────────────────────────────────────────

export async function generateQuestions(viewerLevel, { chapterId, subjectId, count = 5, types }) {
  const blocks = chapterId
    ? (await loadChapter(viewerLevel, chapterId))?.blocks ?? []
    : await loadLibrary(viewerLevel, { subjectId, limit: 80 });
  if (blocks.length === 0) throw new AppError(404, 'No content found to generate questions from');

  const wantTypes = types && types.length ? new Set(types) : new Set(['mcq', 'true_false', 'fill_blank', 'short_answer']);
  const statements = blocks.flatMap((b) =>
    sentences(b.contentRichtext || b.contentCode || '')
      .filter((s) => s.length > 30 && s.length < 300)
      .map((s) => ({ s, block: b })),
  );
  if (statements.length === 0) throw new AppError(400, 'Not enough content to generate questions');

  const pool = [...statements].sort(() => Math.random() - 0.5);
  const questions = [];
  const used = new Set();

  for (const { s, block } of pool) {
    if (questions.length >= count) break;
    if (used.has(s)) continue;
    used.add(s);

    const w = words(s);
    const nouns = w.filter((x) => x.length > 4 && !new Set(['which', 'there', 'these', 'those', 'their', 'about', 'because', 'between', 'through', 'during']).has(x));

    if (wantTypes.has('fill_blank') && nouns.length >= 2) {
      const blank = nouns[Math.floor(Math.random() * nouns.length)];
      questions.push({
        questionType: 'fill_blank',
        question: `Fill in the blank: "${s.replace(new RegExp(blank, 'i'), '________')}"`,
        correctAnswer: blank,
        explanation: `Original sentence: ${s}`,
        source: block.title ?? null,
      });
      continue;
    }
    if (wantTypes.has('true_false') && s.includes(' is ') && s.length < 180) {
      const negation = s.replace(/\bis\b/, 'is not');
      questions.push({
        questionType: 'true_false',
        question: `True or False: ${negation}`,
        correctAnswer: 'false',
        explanation: `Original statement: ${s}`,
        source: block.title ?? null,
      });
      continue;
    }
    if (wantTypes.has('mcq') && nouns.length >= 2) {
      const term = nouns[Math.floor(Math.random() * nouns.length)];
      const distractors = pool
        .flatMap((p) => words(p.s).filter((x) => x.length > 4 && x !== term))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      if (distractors.length >= 3) {
        const options = [...distractors, term].sort(() => Math.random() - 0.5);
        questions.push({
          questionType: 'mcq',
          question: `Which of the following best completes or matches: "${s}" — the key term is "${term}"?`,
          options,
          correctAnswer: term,
          explanation: `The correct term is "${term}". ${s}`,
          source: block.title ?? null,
        });
        continue;
      }
    }
    if (wantTypes.has('short_answer') && s.length > 50) {
      const lead = s.split(' ').slice(0, 8).join(' ');
      questions.push({
        questionType: 'short_answer',
        question: `Explain in your own words: what does the following note say?\n"${s}"`,
        correctAnswer: s,
        explanation: `Model answer: ${s}`,
        source: block.title ?? null,
      });
    }
  }

  await queueEvent('learning', { source: 'ai.questions', chapterId: chapterId ?? null, metadata: { count: questions.length } }).catch(() => {});
  return { sectionId: SECTION.id, sectionLabel: SECTION.label, tool: 'question_generator', count: questions.length, questions };
}

// ── 6. Answer checker ─────────────────────────────────────────────────────

export async function checkAnswer(viewerLevel, { question, modelAnswer, userAnswer }) {
  if (!question || !modelAnswer || !userAnswer) {
    throw new AppError(400, 'question, modelAnswer and userAnswer are required');
  }
  const overlap = keywordOverlap(userAnswer, modelAnswer);
  const normalized = normalizeText(userAnswer) === normalizeText(modelAnswer);
  const percentage = Math.round(overlap * 100);
  const verdict = normalized || percentage >= 70 ? 'correct' : percentage >= 40 ? 'partial' : 'incorrect';
  const feedback =
    verdict === 'correct'
      ? 'Great job — your answer covers the key points.'
      : verdict === 'partial'
        ? `Close! You covered about ${percentage}% of the key points. Compare with the model answer below and fill the gaps.`
        : `Your answer is missing most of the key points (${percentage}% overlap). Study the model answer and retry.`;

  const result = await llmOr(
    {
      verdict,
      score: percentage,
      feedback,
      missingPoints: words(modelAnswer).filter((w) => !words(userAnswer).includes(w)).slice(0, 8),
      modelAnswer: truncate(modelAnswer, 900),
    },
    [
      { role: 'system', content: 'You are an exam grader. Mark the student answer against the model answer. Respond with: verdict (correct/partial/incorrect), score 0-100, and 2-3 sentences of encouraging, specific feedback.' },
      { role: 'user', content: `Question: ${question}\nModel answer: ${modelAnswer}\nStudent answer: ${userAnswer}` },
    ],
  );

  await queueEvent('learning', { source: 'ai.check_answer', metadata: { verdict } }).catch(() => {});
  return { sectionId: SECTION.id, sectionLabel: SECTION.label, tool: 'answer_checker', question, ...result };
}

// Answer-check helper used by quiz.js-like code (exported for reuse).
export { gradeAnswer as checkShortAnswer };
