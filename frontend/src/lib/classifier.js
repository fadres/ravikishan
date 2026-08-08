// Mirror of backend/src/services/classifier.js — used by the admin BlockEditor
// to preview the auto-detected block type live, before saving. The backend
// re-runs the same rules on save (single source of truth on the server).

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

export function classifyBlock({ title = '', content = '' } = {}) {
  const titleText = (title || '').trim();
  const contentText = (content || '').trim();
  const firstLine = contentText.split(/\r?\n/)[0].trim();
  const headline = `${titleText}\n${firstLine}`.trim();
  const lower = contentText.toLowerCase();

  if (contentText.includes('⚠') || IMPORTANT_RE.test(headline)) {
    return { blockType: 'important_points', reason: 'Important / mistakes / traps marker' };
  }
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
  if (FORMULA_HEADING_RE.test(firstLine) || FORMULA_LINE_RE.test(firstLine)) {
    return { blockType: 'formula', reason: 'Equation-style line' };
  }
  if (QUESTION_RE.test(firstLine) || /[?]\s*$/.test(firstLine)) {
    if (ANSWER_RE.test(contentText)) {
      return { blockType: 'solved_example', reason: 'Question with answer (solved example)' };
    }
    return { blockType: 'pyq', reason: 'Question line detected' };
  }
  if (NUMERICAL_RE.test(lower) && /\d/.test(contentText)) {
    return { blockType: 'solved_example', reason: 'Numerical / calculation problem' };
  }
  if (ADVANCED_RE.test(lower) && lower.length > 40) {
    return { blockType: 'premium_expansion', reason: 'Advanced / deep content markers' };
  }
  if (CONCEPT_RE.test(headline)) {
    return { blockType: 'note_concept', reason: 'Definition-style phrasing' };
  }
  if (EXAMPLE_RE.test(contentText)) {
    return { blockType: 'note_example', reason: 'Contains an example signal' };
  }
  const heading = titleText || firstLine;
  const words = heading.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= MAX_TOPIC_WORDS && !/[.?!…]$/.test(heading) && !heading.includes(',')) {
    return { blockType: 'note_topic', reason: `Short title-like text (${words.length} words, no punctuation)` };
  }
  return {
    blockType: 'note_statement',
    reason: 'No structural signals detected — declarative statement',
  };
}
