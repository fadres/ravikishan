// Rule-based content-type classifier (spec 4c).
//
// When a block is created without an explicit blockType, these rules decide
// the type. Priority order: important → example → concept → topic → statement.
// The module is intentionally isolated and pure so it is easy to extend
// (add signals, tweak priority) without touching routes or schema.

// Which block types are acceptable per subject_type — also used by the admin
// content routes to validate explicit picks and to coerce auto suggestions.
export const ALLOWED_BLOCK_TYPES = {
  science_math: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'numerical', 'mindmap'],
  biology: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'diagram_compare', 'mindmap'],
  english: ['summary', 'keywords', 'important_points'],
  nepali: ['byakaran'],
};

// When the detected type is not available for the subject, fall back to this
// closest declarative type instead of failing the request.
const FALLBACK_BY_SUBJECT = {
  science_math: 'note_statement',
  biology: 'note_statement',
  english: 'important_points',
  nepali: 'byakaran',
};

// "Note:", "Important:", "Remember:", "Key point:", "⚠", …
const IMPORTANT_RE = /^\s*(important|note|remember|key\s*point|warning|caution|alert)\s*[:—\-]/i;

// "e.g.", "eg.", "for example", "for instance", "such as"
const EXAMPLE_RE = /\b(e\.g\.|e\.g|eg\.|for\s+example|for\s+instance|such\s+as)\b/i;

// Definition phrasing: "X is defined as …", "X refers to …", "X means …", …
const CONCEPT_RE =
  /\b(is|are)\s+(defined\s+as|known\s+as|called|termed|referred\s+to)|refers\s+to|\bmeans\b/i;

const MAX_TOPIC_WORDS = 8;

/**
 * Classify a piece of content into a BlockType.
 * @param {{ title?: string|null, content?: string|null }} input
 * @returns {{ blockType: string, reason: string }}
 */
export function classifyContent({ title = '', content = '' } = {}) {
  const titleText = (title || '').trim();
  const contentText = (content || '').trim();
  const firstLine = contentText.split(/\r?\n/)[0].trim();
  // Headline = title, else the opening line — where "what this block is about"
  // signals live (important markers, definition phrasing, short titles).
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

/**
 * Same as classifyContent, but coerces the suggestion to a type the subject
 * actually accepts. Used by the admin API; never rejects.
 * @param {string} subjectType science_math | biology | english | nepali
 * @returns {{ blockType: string, reason: string, coerced: boolean }}
 */
export function suggestForSubject(subjectType, title, content) {
  const { blockType, reason } = classifyContent({ title, content });
  const allowed = ALLOWED_BLOCK_TYPES[subjectType] ?? ALLOWED_BLOCK_TYPES.science_math;
  if (allowed.includes(blockType)) return { blockType, reason, coerced: false };

  const coercedType = FALLBACK_BY_SUBJECT[subjectType] ?? 'note_statement';
  return {
    blockType: coercedType,
    reason: `${reason}; "${blockType}" is not available for ${subjectType}, using "${coercedType}"`,
    coerced: true,
  };
}
