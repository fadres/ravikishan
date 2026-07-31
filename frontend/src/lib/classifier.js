// Mirror of backend/src/services/classifier.js — used by the admin BlockEditor
// to preview the auto-detected block type live, before saving. The backend
// re-runs the same rules on save (single source of truth on the server).

const IMPORTANT_RE = /^\s*(important|note|remember|key\s*point|warning|caution|alert)\s*[:—\-]/i;
const EXAMPLE_RE = /\b(e\.g\.|e\.g|eg\.|for\s+example|for\s+instance|such\s+as)\b/i;
const CONCEPT_RE =
  /\b(is|are)\s+(defined\s+as|known\s+as|called|termed|referred\s+to)|refers\s+to|\bmeans\b/i;
const MAX_TOPIC_WORDS = 8;

export function classifyBlock({ title = '', content = '' } = {}) {
  const titleText = (title || '').trim();
  const contentText = (content || '').trim();
  const firstLine = contentText.split(/\r?\n/)[0].trim();
  const headline = `${titleText}\n${firstLine}`.trim();

  if (contentText.includes('⚠') || IMPORTANT_RE.test(headline)) {
    return {
      blockType: 'note_important',
      reason: 'Starts with an "important/note/remember" marker or contains a warning symbol',
    };
  }
  if (EXAMPLE_RE.test(contentText)) {
    return {
      blockType: 'note_example',
      reason: 'Contains an example signal ("e.g.", "for example", "such as", …)',
    };
  }
  if (CONCEPT_RE.test(headline)) {
    return {
      blockType: 'note_concept',
      reason: 'Definition-style phrasing detected ("is defined as", "refers to", "means", …)',
    };
  }
  const heading = titleText || firstLine;
  const words = heading.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= MAX_TOPIC_WORDS && !/[.?!…]$/.test(heading) && !heading.includes(',')) {
    return {
      blockType: 'note_topic',
      reason: `Short title-like text (${words.length} words, no punctuation)`,
    };
  }
  return {
    blockType: 'note_statement',
    reason: 'No structural signals detected — declarative statement',
  };
}
