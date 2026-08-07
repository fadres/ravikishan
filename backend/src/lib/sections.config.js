// ─────────────────────────────────────────────────────────────────────────
// Section registry — the seam of the multi-section architecture.
// See ARCHITECTURE.md at the repo root for the full design (global vs
// section-scoped systems, and the "how to add a new section" checklist).
//
// NOTE: this is NOT the topic-content sections file (src/lib/sections.js —
// the Concept / Examples / PYQ / … note taxonomy). That file is unrelated.
//
// Every route/service that needs to know "which section's DB do I hit"
// reads from this registry — no hardcoded Class 11 references anywhere.
// ─────────────────────────────────────────────────────────────────────────

export const sections = [
  {
    id: 'class-11',
    label: 'Class 11',
    // The Class row slug inside this section's own database.
    classSlug: 'class-11',
    // Canonical import tree (relative to backend/): content/<section-id>/…
    contentDir: 'content/class-11',
    // The existing Neon — the official Class 11 database. ALIASED, never
    // duplicated or migrated. Falls back to DATABASE_URL so the current
    // deployment keeps working unchanged until NEON_CLASS11_URL is set.
    dbUrl: process.env.NEON_CLASS11_URL || process.env.DATABASE_URL,
    // Own local AI endpoint; defaults to the shared AI_ENDPOINT (same
    // provider/key unless a section explicitly needs a different one).
    // '' means offline-first mode (see src/services/ai.js).
    aiEndpoint: process.env.CLASS11_AI_ENDPOINT || process.env.AI_ENDPOINT || '',
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
    status: 'active',
  },
  // ── Future sections are appended here — each with its OWN brand-new Neon
  // project/account and its own working systems (own import pipeline, own
  // local AI, own storage), NEVER sharing NEON_CLASS11_URL. See the
  // checklist in ARCHITECTURE.md before adding one.

  // Independent-service section: Class 12 (test fork). Unlike class-11,
  // this section does NOT run inside the global backend — it is its own
  // service (backend-class12-test/) with its own Neon (NEON_CLASS12_URL),
  // its own AI endpoint and its own progress outbox. The global backend
  // NEVER connects to its database; it proxies content/search/AI calls to
  // section.backendUrl and receives study events via the internal
  // progress-sync API (PROGRESS_SYNC_SECRET). See ARCHITECTURE.md §6.
  {
    id: 'class-12-test',
    label: 'Class 12 (test)',
    classSlug: 'class-12',
    contentDir: 'content/class-12-test',
    // Own Neon — the global backend must NEVER open a connection to it.
    // (Kept for deploy/render tooling and the import pipeline.)
    dbUrl: process.env.NEON_CLASS12_URL || '',
    // Base URL of the independent section service. When set, every
    // content/search/AI request is proxied to it instead of being served
    // from a section DB connection inside this process.
    backendUrl: process.env.CLASS12_BACKEND_URL || '',
    aiEndpoint: process.env.CLASS12_AI_ENDPOINT || process.env.AI_ENDPOINT || '',
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
    status: 'active',
  },
];

const INDEX = new Map(sections.map((s) => [s.id, s]));

/** Look up a section by id. Returns null when the id is not registered. */
export function getSection(id) {
  return INDEX.get(id) ?? null;
}

/**
 * Look up a section by id, failing loudly on unknown ids. This is the
 * fail-safe seam: an unknown section must NEVER silently fall back to
 * Class 11's DB (or any other section's). Throws a plain Error with
 * `code = 'UNKNOWN_SECTION'` — HTTP layers map it to 404 themselves.
 */
export function requireSection(id) {
  const section = getSection(id);
  if (!section) {
    const err = new Error(
      `Unknown section "${id}" — registered: ${sections.map((s) => s.id).join(', ') || '(none)'}`,
    );
    err.code = 'UNKNOWN_SECTION';
    throw err;
  }
  return section;
}

/** Sections that are currently live (participate in cross-section fan-out). */
export function activeSections() {
  return sections.filter((s) => s.status === 'active');
}
