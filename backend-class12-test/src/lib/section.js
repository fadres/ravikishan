// Single-section registry — the section backend serves exactly ONE section
// (its identity comes from the environment). This mirrors the shape of the
// global backend's sections.config.js so section-shaped code (import-notes,
// services) reads identically, but the section service never hosts a
// multi-section registry: unknown ids fail fast.
import { env } from '../config/env.js';

export const SECTION = {
  id: env.sectionId,
  label: env.sectionLabel,
  classSlug: env.sectionClassSlug,
  contentDir: env.sectionContentDir,
  aiEndpoint: env.aiEndpoint,
  aiApiKey: env.aiApiKey,
  aiModel: env.aiModel,
  status: 'active',
};

const INDEX = new Map([[SECTION.id, SECTION]]);

/** Look up a section by id. Returns null when the id is not this service's. */
export function getSection(id) {
  return INDEX.get(id) ?? null;
}

/**
 * Fail-fast lookup: this service only serves its own section. Unknown ids
 * throw a plain Error with `code = 'UNKNOWN_SECTION'` — never silently fall
 * back to any other section's data.
 */
export function requireSection(id) {
  const section = getSection(id);
  if (!section) {
    const err = new Error(
      `Unknown section "${id}" — this service only serves "${SECTION.id}"`,
    );
    err.code = 'UNKNOWN_SECTION';
    throw err;
  }
  return section;
}

/** The single section this service serves (when active). */
export function activeSections() {
  return SECTION.status === 'active' ? [SECTION] : [];
}
