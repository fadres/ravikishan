// AI Content Template — the internal instruction set for AI-assisted note
// generation. When contributors provide raw educational material, the
// pipeline (importer → classifier → validator) automatically structures it.
// When an LLM is configured (AI_ENDPOINT + AI_API_KEY), this template is the
// system prompt that forces the exact same schema.

// Metadata defaults applied to every block created by the pipeline.
export function defaultBlockMetadata({ source = 'import', year = null, examType = null } = {}) {
  return { source, year, examType };
}

// Topic-level metadata defaults.
export function defaultTopicMetadata({ difficulty = 'easy', estimatedStudyTimeMinutes = null, tags = [], learningOutcomes = [], prerequisites = [], relatedTopics = [] } = {}) {
  return { difficulty, estimatedStudyTimeMinutes, tags, learningOutcomes, prerequisites, relatedTopics };
}
