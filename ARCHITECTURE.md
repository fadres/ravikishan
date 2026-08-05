# Ravikishan — Multi-Section Architecture

> **Read this first.** This document is the canonical reference for how the
> Ravikishan platform is structured around *sections*. If you are about to
> touch DB-related code, the section registry, or the import pipeline, stop
> and read this first. Any future opencode session, contributor, or future-you
> opening this repo cold should be able to tell instantly that this
> architecture is intentional and already in effect.

Declared: **2026-08-05** (see git history for the commit that added this file,
`docs: declare section-based architecture …`).

---

## 1. What a "section" is

A **section** is a fully independent study track with its own:

- **own database** (its own Neon project/account — never shared),
- **own content** (its own `content/<section-id>/` import tree),
- **own import pipeline** (same `import-notes` script, driven by the section
  registry, connecting only to its own DB),
- **own content classifier** (identical classification *rules* for every
  section — it is only the DB target that changes),
- **own storage quota** (per-section object storage),
- **own local AI search/chatbot instance**, scoped to only that section's
  content (smaller retrieval surface, faster answers).

Today, exactly **one section exists: Class 11** (`id: "class-11"`). Class 12
and any other track are **not built yet** — the architecture below is the
shape they must follow when they are.

A section is *not* the same thing as a "content section" inside a topic
(`src/lib/sections.js` — the Concept / Examples / PYQ / … blocks of the 7-tab
note taxonomy). That file has nothing to do with the multi-section
architecture and must not be confused with it.

---

## 2. Global vs section-scoped systems

| System | Scope | Notes |
|---|---|---|
| User accounts / auth (JWT, sessions, password) | **Global** | one account works across all sections |
| Progress tracking (UserProgress, Bookmark, LearningAnalytics) | **Global** | records stay on the global layer |
| Gamification (XP, streaks, badges) | **Global** | |
| Notifications (in-app + push) | **Global** | |
| Admin core / CMS (users, requests, audit log) | **Global** | |
| Audit log | **Global** | |
| Content tables (Class, Subject, Chapter, ContentBlock, Topic, versions, publish decisions, content tags) | **Section-scoped** | each section's content lives in that section's DB |
| Quizzes / flashcards / planner decks that reference content | **Global (structural), FK-ing into content** | global tables with nullable FKs into section content |
| Content import pipeline | **Section-scoped** | one pipeline, driven by the registry |
| Content classifier | **Section-scoped (rules shared)** | identical rules; DB target differs |
| Local AI search / chatbot | **Section-scoped** | retrieval only over its own content |
| Global AI fan-out search | **Global** | fans out to every active section's local AI in parallel |

### Why

A student's account, progress and achievements are *theirs*, not the
property of one track — they must follow the student everywhere. Content is
the thing that differs between tracks (different syllabi, different boards,
different exam patterns), so content is where the boundary goes. Splitting
content by section at the **database** level (not just a column) gives
bullet-proof isolation: a bug in Class 12's import script literally cannot
touch Class 11's data, because it is a different connection string entirely.

---

## 3. Current state — two layers, one physical deployment

As of this declaration, there are only **two layers in play**:

1. the **global layer** (auth / progress / XP / notifications / admin /
   audit), and
2. the one existing section, **Class 11**.

Both currently live in the **same physical infrastructure**:

- the **same Neon project** (env var `DATABASE_URL`, aliased going forward as
  `NEON_CLASS11_URL`), and
- the **same Render web service** (`ravikishan-api`).

No split has happened yet. This is the **starting point**, not the final
shape. The global tables and Class 11's content tables share one PostgreSQL
database today, and that is intentional — separating them physically is only
required when a *second* section is introduced (see §5).

## 4. Current deployment inventory

| Section | DB | Backend | Status |
|---|---|---|---|
| **Class 11** (+ global layer, co-located for now) | existing Neon — `NEON_CLASS11_URL` (alias of `DATABASE_URL`) | existing Render service `ravikishan-api` | **active** |
| *Class 12* *(placeholder — expected shape)* | *brand-new Neon project/account — never `NEON_CLASS11_URL`* | *brand-new Render project/account* | not yet built |
| *Other exam tracks* *(placeholder)* | *brand-new Neon project/account each* | *brand-new Render project/account each* | not yet built |

**Hard rule:** every future section gets its **own separate Render account**
and its **own separate Neon account/project** — never reusing Class 11's or
the global layer's. A new section **never touches `NEON_CLASS11_URL`**, never
reads from or writes to Class 11's database, and never depends on Class 11's
Render service. The two-layer setup above is the starting point, not the
final shape.

---

## 5. Where the registry lives and how the seam works

The single seam of this architecture is the **section registry**:

- `backend/src/lib/sections.config.js` — the `sections` array (one entry per
  section) plus lookups (`getSection`, `requireSection`, `activeSections`).
  This is where a section's DB URL, AI endpoint, class slug and status are
  declared.
- `backend/src/config/db.js` — the global Prisma client (`prisma`) and the
  per-section client factory (`prismaForSection`), keyed by the registry.

Every route/service that needs to know *"which section's DB do I hit"* reads
from the registry. There are **no hardcoded Class 11 references** scattered
through the codebase. Adding a new section is purely additive: provision its
own new Neon, add one registry entry, add its content folder — Class 11's
systems are never touched.

### Prisma schema files

- `backend/prisma/schema.prisma` — generator + datasource + shared enums.
- `backend/prisma/schema.global.prisma` — global tables (see table in §2).
- `backend/prisma/schema.class11.prisma` — Class 11 content tables.

Today both content and global schemas point at the same `NEON_CLASS11_URL`
(`DATABASE_URL`). When a second section is introduced, its content schema
points at a *different* `DATABASE_URL` — and its content tables are created
in its own Neon from day one, never in Class 11's. The global schema stays
where it is (this DB effectively becomes the permanent global DB too).

---

## 6. How to add a new section (canonical checklist)

> This is the canonical reference for every future section. Follow it in
> order; do not skip steps; do not modify Class 11 or the global layer.

1. **Provision infrastructure — brand-new accounts/projects only.**
   - Create a **new Neon account** (or a brand-new project on a *separate*
     account) and note its connection string. **Never** reuse the
     `NEON_CLASS11_URL` project.
   - Deploy the backend as a **new, separate Render service** (own account),
     with `DATABASE_URL` set to the new Neon string.
2. **Register the section** — add an entry to
   `backend/src/lib/sections.config.js`:
   ```js
   {
     id: 'class-12',                    // URL-safe slug used in routes/API
     label: 'Class 12',
     classSlug: 'class-12',             // the Class row slug inside its DB
     contentDir: 'content/class-12',
     dbUrl: process.env.CLASS12_DB_URL, // NEW env var — NEVER NEON_CLASS11_URL
     aiEndpoint: process.env.CLASS12_AI_ENDPOINT || process.env.AI_ENDPOINT,
     aiApiKey: process.env.AI_API_KEY,  // same provider/key unless overridden
     aiModel: process.env.AI_MODEL,
     status: 'active',                  // 'active' to join search fan-out
   },
   ```
3. **Add the content folder** — `backend/content/class-12/…` following the
   exact `classSlug → subject → chapter → <type-folder> → file.json` taxonomy
   (see `docs/README.md` → "Importing notes").
4. **Import** — `npm run import-notes -- --section class-12 --apply` (dry-run
   first, as always). The script resolves the section's client from the
   registry and only ever writes to that section's DB.
5. **Verify isolation** — confirm the new section's import and local AI only
   touch its own Neon; confirm Class 11's `NEON_CLASS11_URL` connection string
   appears nowhere in the new section's config, scripts or CI.
6. **Frontend** — add the section to `frontend/src/lib/sectionLinks.js` (and
   any landing-page cards); routes are already section-namespaced, so
   `/class-12/physics/…` works with zero router changes.

**Zero changes are allowed** to: global auth, progress, gamification, admin
core, or audit code. If you need to change those, you are doing it wrong.

### Per-section AI

Each section gets its own local AI instance: `searchWithinSection(sectionId,
…)` retrieves only against that section's content and answers through the
section's `aiEndpoint` (defaults to the shared `AI_ENDPOINT`, same provider /
key — only override when a section genuinely needs a different provider).
For queries not known to be section-specific, `searchAcrossSections(…)`
fans out to every `active` section in parallel and merges results.

### Safety rules that apply to all new scripts and code

- All new scripts support `--dry-run` before any DB write (same convention
  as the import-notes pipeline).
- Unknown section ids fail **fast and safely** (error + non-zero exit, no DB
  writes) — never fall back to Class 11's DB by accident.
- Never leak section DB URLs through public API responses.
