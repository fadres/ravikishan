// Pure text/grading helpers used by the AI tools (answer checker, question
// generator). Only the pure functions from the global quiz engine are
// ported — quizzes/attempts themselves stay on the GLOBAL backend (they FK
// into global User rows); this service has no quiz tables.
export const QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank', 'short_answer'];

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}|/\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(s) {
  return normalizeText(s).split(' ').filter(Boolean);
}

export function keywordOverlap(candidate, reference) {
  const a = new Set(words(candidate));
  const b = words(reference);
  if (b.length === 0) return 0;
  const hits = b.filter((w) => a.has(w)).length;
  return hits / b.length;
}

export function gradeAnswer(question, answer) {
  const correct = String(question.correctAnswer ?? '').trim();
  const given = String(answer ?? '').trim();

  switch (question.questionType) {
    case 'true_false':
      return normalizeText(given) === normalizeText(correct) ? question.points : 0;
    case 'fill_blank': {
      if (!given) return 0;
      const accepted = correct.split('|').map(normalizeText).filter(Boolean);
      return accepted.includes(normalizeText(given)) ? question.points : 0;
    }
    case 'short_answer': {
      if (!given) return 0;
      const overlap = keywordOverlap(given, correct);
      if (overlap >= 0.6) return question.points;
      if (overlap >= 0.3) return Math.max(1, Math.round(question.points / 2));
      return 0;
    }
    case 'mcq':
    default:
      return given === correct ? question.points : 0;
  }
}
