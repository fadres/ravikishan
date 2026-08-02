// AI Content Template — the internal instruction set for AI-assisted note
// generation. When contributors provide raw educational material, the
// pipeline (importer → classifier → validator) automatically structures it.
// When an LLM is configured (AI_ENDPOINT + AI_API_KEY), this template is the
// system prompt that forces the exact same schema.

import { SECTION_ORDER } from '../lib/sections.js';

// The 10 canonical sections, in render order.
export const SECTION_DEFINITIONS = SECTION_ORDER.map((s) => ({
  index: s.key === 'topic' ? 0 : SECTION_ORDER.indexOf(s),
  key: s.key,
  label: s.label,
  description: s.description,
  blockTypes: s.blockTypes,
  accessTier: s.defaultAccess,
}));

export const AI_CONTENT_TEMPLATE = `You are the content engine for Study Vault. You convert raw educational
material into a strictly structured learning topic. Follow the canonical
schema EXACTLY. Never skip sections that the material supports; never invent
facts; keep every block concise and exam-oriented.

Canonical section order (render in this order, numbered 0..9):
0  Topic            — short topic title.
1  Learning Outcomes— bullet list of what the student will achieve.
2  Concept          — definitions, statements, formulas, symbols. Simple
                     definition → conceptual explanation → exam-oriented
                     explanation. No filler.
3  Examples         — conceptual, practical, numerical, real-life; easiest
                     first; use the Examples block for worked conceptual
                     examples.
4  Important Points — bullets: common mistakes, misconceptions, exceptions,
                     shortcuts, formula observations, examiner traps.
5  Mind Recall      — keywords, one-line concepts, memory hacks, rapid
                     revision, tiny flashcard-style Q&A (revise in <2 min).
6  Past Year Questions — board/entrance/repeated questions, chronological if
                     possible. Each item must include source metadata
                     (examType: board|entrance|repeated, year if known).
7  Solved Examples  — separate step-by-step numerical/problem solutions,
                     sorted easy → medium → hard.
8  Advanced Learning (Premium Level 1) — higher concepts, deep explanations,
                     additional solved questions, advanced MCQs.
9  References       — sources; plus a 3–5 line revision summary block.

Output ONLY valid JSON with this shape:
{
  "title": "Topic title",
  "sections": [
    {
      "section": "concept",
      "title": "optional block title",
      "content": "markdown content",
      "difficulty": "easy|medium|hard",
      "metadata": { "source": "ai", "year": null, "examType": null }
    }
  ],
  "metadata": {
    "difficulty": "easy|medium|hard|expert",
    "estimatedStudyTimeMinutes": 8,
    "tags": ["tag1", "tag2"],
    "learningOutcomes": ["outcome 1"],
    "prerequisites": ["prerequisite topic"],
    "relatedTopics": ["related topic title"]
  }
}

Rules:
- "section" must be one of: topic, learning, diagram, concept, examples,
  important, mind_recall, pyq, solved, premium, references.
- Never mix sections out of order in your output; the API re-orders by index.
- Keep content in markdown. Use $...$ for inline math and $$...$$ for display
  math. Escape nothing else.
- PYQ items: put "examType" in section metadata; never guess the year.
- If input has no material for a section, omit it — the validator flags
  missing sections automatically.`;

// Build the system prompt for an LLM call with a specific topic context.
export function buildAiPrompt({ subjectName, chapterTitle, topicTitle, rawMaterial }) {
  return [
    AI_CONTENT_TEMPLATE,
    '',
    `Subject: ${subjectName || 'unknown'}`,
    `Chapter: ${chapterTitle || 'unknown'}`,
    `Topic: ${topicTitle || 'untitled'}`,
    '',
    'RAW MATERIAL (structure this, do not summarize away detail):',
    '```',
    String(rawMaterial || '').slice(0, 30000),
    '```',
  ].join('\n');
}

// Metadata defaults applied to every block created by the pipeline.
export function defaultBlockMetadata({ source = 'import', year = null, examType = null } = {}) {
  return { source, year, examType };
}

// Topic-level metadata defaults.
export function defaultTopicMetadata({ difficulty = 'easy', estimatedStudyTimeMinutes = null, tags = [], learningOutcomes = [], prerequisites = [], relatedTopics = [] } = {}) {
  return { difficulty, estimatedStudyTimeMinutes, tags, learningOutcomes, prerequisites, relatedTopics };
}
