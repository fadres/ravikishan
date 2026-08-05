// ─────────────────────────────────────────────────────────────────────────
// Section registry — the seam of the multi-section architecture.
// See ARCHITECTURE.md at the repo root for the full design (global vs
// section-scoped systems, and the "how to add a new section" checklist).
//
// NOTE: this is NOT the topic-content sections file (src/lib/sections.js —
// the Concept / Examples / PYQ / … note taxonomy). That file is unrelated.
// ─────────────────────────────────────────────────────────────────────────

// TODO: not yet wired into routes — see ARCHITECTURE.md
// This stub declares the registry as a real, present file. Wiring (section
// lookups, per-section Prisma clients, section-scoped search/AI/import) is
// tracked in ARCHITECTURE.md and lands in the commits that follow this one.

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
    aiEndpoint: process.env.CLASS11_AI_ENDPOINT || process.env.AI_ENDPOINT,
    aiApiKey: process.env.AI_API_KEY,
    aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
    status: 'active',
  },
  // ── Future sections are appended here — each with its OWN brand-new Neon
  // project/account and its own working systems (own import pipeline, own
  // local AI, own storage), NEVER sharing NEON_CLASS11_URL. See the
  // checklist in ARCHITECTURE.md before adding one.
];
