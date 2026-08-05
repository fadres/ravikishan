# Ravikishan

**Curated Class 11 & 12 exam prep — made with curiosity by Ravikishan.**

A full-stack, offline-first-feeling study platform with a deep-ocean theme:
Physics, Chemistry, Mathematics, Biology, English and Nepali notes with
typed content blocks (topics, statements, examples, concepts, important
points, numericals, mind maps, compare-diagrams, summaries, keywords and
nested Nepali *byakaran*), full-text search, role-based access control and a
working owner/admin panel.

![stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20PostgreSQL%20(Prisma)-0aa5c8)

---

## Architecture

```
┌────────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│  Cloudflare Pages  │  →    │  Render (free tier)  │  →    │  Neon / Supabase│
│  / Vercel (Hobby)  │  CORS │  Express + Prisma    │       │  PostgreSQL     │
│  React + Vite SPA  │       │  JWT auth + rate-    │       │  (permanent     │
│                    │       │  limited API         │       │   free tier)    │
└────────────────────┘       └──────────────────────┘       └─────────────────┘
        public pages                 /api/*                     tsvector
                                     /api/admin/*               search index
```

- **Frontend** — Vite + React + Tailwind CSS v4. Ocean/underwater theme,
  frosted-glass panels, gradient hero, streak bar, subject watermarks.
  Code blocks highlighted with Prism; mind maps are a custom collapsible
  SVG tree; math renders with KaTeX; Nepali (Devanagari) is fully supported
  (UTF-8 everywhere, `Noto Sans Devanagari` font).
- **Backend** — Node.js + Express 5 + Prisma ORM. JWT access tokens
  (15 min) with rotating refresh tokens (bcrypt-hashed passwords),
  `express-rate-limit` on credential and access-request endpoints, zod
  validation on every write, helmet + locked-down CORS.
- **Database** — PostgreSQL with Prisma migrations. Full-text search via
  `tsvector` generated columns (`english` + `simple` configs for Devanagari)
  ranked with `ts_rank`, plus recommendation fallbacks.
- **Access levels** — every content block carries an `accessLevel`:
  `1` Premium (owner), `2` Members (approved), `3` Free (everyone). A block
  is readable when `accessLevel >= viewer level` (anonymous = 3). The backend
  never returns `contentRichtext` / `contentCode` / `mindmapJson` /
  `diagramData` for unreadable blocks — not even hidden in the response —
  while titles and structure stay fully public. Approving an access request
  makes the user a member (level 2); only the owner can grant level 1.
  The frontend shows a per-block locked card with "Request access" and the
  owner's contact email for premium content. Enforced server-side and
  covered by automated tests (`backend/tests/api.test.js`).
- **Auto content-type detection (4c)** — the admin panel can create blocks
  without picking a type: a rule-based classifier (`backend/src/services/classifier.js`,
  mirrored live in the editor as `frontend/src/lib/classifier.js`) suggests
  the type from title/content (important markers → examples → definitions →
  short titles → statement fallback). Every block records `classifiedBy`
  (`"auto"` | `"manual"`) and the admin UI shows an "auto-detect" badge and
  reason, with a manual override always available.
- **End-of-section dividers (4d)** — a pure frontend rendering rule
  (nothing stored in the DB) inserts a subtle gradient line + "END" pill
  after each topic group and concept group, and a prominent
  "— END OF CHAPTER —" badge after the last block of a chapter.

---

## Project layout

```
ravikishan/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # models + enums
│   │   ├── migrations/            # versioned SQL migrations (incl. tsvector)
│   │   ├── import-data/           # content source of truth (navigation + topic JSONs)
│   │   ├── import-content.js      # pushes import-data/ into the DB (idempotent)
│   │   └── seed.js                # demo content skeleton (idempotent)
│   ├── src/
│   │   ├── server.js / app.js     # entry, middleware, rate limits
│   │   ├── config/                # env + Prisma client
│   │   ├── middleware/            # auth, roles, validation, errors
│   │   ├── routes/                # auth, access, content, admin, search
│   │   ├── services/              # audit, full-text search, content classifier
│   │   └── utils/                 # JWT + refresh-token helpers
│   ├── tests/                     # auth flow, locked-content rule, classifier tests
│   ├── render.yaml                # Render blueprint
│   └── .env.example
├── frontend/
│   ├── public/                    # favicon.svg, manifest.webmanifest, _redirects
│   └── src/
│       ├── api/client.js          # fetch + silent token refresh
│       ├── context/AuthContext.jsx
│       ├── components/            # Header, Footer, SearchBar, LockedCard…
│       │   └── blocks/            # note cards, CodeBlock, MindmapTree, DiagramCompare, SectionDivider…
│       ├── pages/                 # Home, Class, Subject, Chapter, Search, Login…
│       │   └── admin/             # Requests, Users, Content CRUD (auto-detect), Audit
│       └── lib/                   # markdown + KaTeX renderer, classifier mirror
├── docs/
│   ├── README.md                  # you are here
│   └── API.md                     # every endpoint
├── docker-compose.dev.yml         # local Postgres
└── .gitignore
```

---

## Local development

Prerequisites: Node.js ≥ 20, Docker (for local Postgres).

```bash
# 1. Database
docker compose -f docker-compose.dev.yml up -d          # Postgres on :5433

# 2. Backend
cd backend
cp .env.example .env            # fill in DATABASE_URL + JWT secrets
npm install
npx prisma migrate deploy       # apply migrations
npm run migrate                 # = migrations + content import (idempotent)
npm run seed                    # owner + demo content (idempotent)
npm test                        # 45 tests — auth, access levels, classifier
npm run dev                     # API on http://localhost:4000

# 3. Frontend
cd ../frontend
cp .env.example .env.local      # VITE_API_URL=http://localhost:4000
npm install
npm run dev                     # app on http://localhost:5173
```

**Demo accounts** (seeded):

| Email | Password | Role |
|---|---|---|
| `harindarsah98172@gmail.com` | `ravikishan-owner-2026` | owner |
| `member@ravikishan.com` | `member1234` | member |
| `student@ravikishan.com` | `student1234` | guest (has a pending request) |

The owner password comes from `OWNER_EMAIL`/`OWNER_PASSWORD` in `backend/.env`.

---

## Production deployment — $0 cost, permanent free tiers

> Every service below has a **permanent** free tier (no card, no 90-day
> expiry). The only quirk: Render's free web service **sleeps after ~15 min
> of inactivity** — the first request after idle takes ~30–60 s to wake.
> Add a free **UptimeRobot** monitor pinging `/health` every 5 minutes to
> keep it warm (free tier allows 50 monitors).

### 1. Database — Neon (or Supabase)

1. Sign up at [neon.tech](https://neon.tech) → create a project → copy the
   **connection string** (it looks like
   `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`).
   Keep `?sslmode=require` in production.
2. (Alternative: [supabase.com](https://supabase.com) → New project →
   Project Settings → Database → Connection string.)

### 2. Backend — Render

1. Push this repo to GitHub.
2. [render.com](https://render.com) → **New → Blueprint** → select the repo
   (uses `backend/render.yaml`) — or **New → Web Service**:
   - Root directory: `backend`
   - Build: `npm install && npx prisma generate`
   - Start: `npm run migrate && npm start`
   - Plan: **Free**
3. Add env vars (secret values, never commit them):
   - `DATABASE_URL` → your Neon/Supabase connection string
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` → `openssl rand -hex 64`
   - `CORS_ORIGIN` → `https://<your-site>.netlify.app` (your frontend URL;
     comma-separate multiple origins if needed)
   - `OWNER_EMAIL`, `OWNER_PASSWORD` → **auto-bootstrapped**: the server
      creates the owner account on startup if it doesn't exist (no one-off
      seed needed). `npm run seed` is only for optional demo content.
   - Member email notifications (optional): `SMTP_USER` (GMail address),
      `SMTP_PASS` (GMail **App Password**, not the account password),
      optionally `MAIL_FROM` and `SITE_URL`. Members get an email whenever a
      block is added/updated via the admin panel and when an import changes a
      chapter's block count. Leave `SMTP_PASS` empty to disable mail.
   - `NODE_ENV=production`
4. Content: `npm run migrate` also runs `prisma/import-content.js`, which
   upserts Class 11 subjects/chapters from `prisma/import-data/` and refreshes
   their blocks on every deploy (idempotent, ~1–2 min). To publish new or
   edited content, update the JSON files under `backend/prisma/import-data/`,
   commit, and redeploy — never edit imported blocks by hand (they are
   recreated from the files). Manual blocks added via the admin panel to
   non-imported chapters are untouched.
4. Note the API URL (e.g. `https://ravikishan-api.onrender.com`). On the free
   plan the service sleeps after ~15 min idle — step 4 keeps it warm.

### 3. Frontend — Netlify (or Cloudflare Pages / Vercel)

**Netlify:**
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an
   existing project** → repo.
2. Build settings are auto-detected from `frontend/netlify.toml`
   (build `npm run build`, publish `dist`).
3. Add the build-time env var: `VITE_API_URL=https://ravikishan-api.onrender.com`
   (Site settings → Environment variables).
4. Deploy. SPA routing is handled by `frontend/public/_redirects`.
5. Update the backend's `CORS_ORIGIN` to `https://<your-site>.netlify.app`.

**Cloudflare Pages (equivalent alternative):**
1. Dashboard → Workers & Pages → **Create → Pages → Connect to Git** → repo.
2. Build command: `npm run build` · Build directory: `frontend/dist`
   (root directory: `frontend`).
3. Environment variable: `VITE_API_URL=https://ravikishan-api.onrender.com`.
4. Deploy. SPA routing is handled by `frontend/public/_redirects`.
5. Update the backend's `CORS_ORIGIN` to `https://<project>.pages.dev`.

**Vercel (alternative):**
1. Import repo → framework: **Vite** · root directory: `frontend`.
2. Env var `VITE_API_URL` (build-time) as above. SPA fallback comes from
   `frontend/vercel.json`.

### 4. Keep the API awake

UptimeRobot (free) → new monitor → HTTP(S) → `https://ravikishan-api.onrender.com/health` → interval 5 min.

---

## Importing notes — 7-tab taxonomy pipeline

New-style content is imported by `prisma/import-notes.js` (a production-grade
alternative to the legacy `import-content` pipeline). It classifies every file
into one of **seven tab types**, driven primarily by the folder it sits in.

### Folder taxonomy (the classification backbone)

```
backend/content/
  class-11/                            ← the section's own folder
    physics/
      thermodynamics/
        concepts/01-first-law.json     → concept  (block: note_concept)
        notes/01-quick-revision.json   → note     (block: note_important)
        examples/01-heat-engine.json   → example  (block: note_example)
        formula/01-key-equations.json  → formula  (block: formula)
        pyqs/01-neb-2023.json          → pyq      (block: pyq)
        sets/01-drill-set.json         → set      (block: solved_example)
        mindmap/01-thermo-map.json     → mindmap  (block: mindmap)
```

- Path maps directly to `class → subject → chapter → contentType` (the
  section's classSlug folder is taken from the section registry — content
  of other sections is skipped, never read or written).
- **Every file is a flat JSON object** — strict schema, no coercion:
  `{ "title": string, "notes": string[], ... }`
- Optional per-type fields: `order` (int), `year` + `examSource` (pyq),
  `latex` (bool, formula), `type` (explicit classification override).
- Files that violate the schema are rejected at parse time (reported as
  errors, never silently fixed).

### Classification (`backend/src/services/classifier.js`)

`classify(note, filePath, metadata)` → `{ type, confidence, reason, needsReview }`

1. **Folder path is the primary signal** — a file inside `pyqs/` is always a
   PYQ, whatever its text says (confidence 1.0). The type folder is the 4th
   path level: `class/subject/chapter/<type>/file.json`.
2. **Content heuristics only run when the path is ambiguous** — files directly
   in the chapter folder, or in the generic `notes/` folder that may hold
   mixed types (a PYQ dropped in `notes/` is still detected as a PYQ).
3. **Confidence score (0–1)** per result; anything below the threshold
   (default 0.7) is flagged `needs-review` and never silently imported.
4. Idempotent: same input always yields the same classification.

### CLI

```bash
# Dry-run (default): full classification + diff report, zero DB writes
npm run import-notes -- --dry-run

# Real import: new blocks default to "draft"
npm run import-notes -- --apply

# Publish: new blocks are "published"; changed published blocks applied live
npm run import-notes -- --apply --publish

# Create missing subject/chapter records from the folder names
npm run import-notes -- --apply --allow-create

# Archive blocks whose source file was removed from the content dir
npm run import-notes -- --apply --archive-missing

# Target a different section (id from the section registry)
npm run import-notes -- --section class-12 --apply
```

| Flag | Meaning |
|---|---|
| `--section <id>` | section id from the registry (default `class-11`); unknown ids fail fast with exit 1 before any DB access |
| `--apply` | write to the DB (without it the run is read-only) |
| `--dry-run` | explicit dry-run (this is the default) |
| `--publish` | new imports get `status: published`; changed published blocks are applied in place |
| `--allow-create` | create missing subject/chapter records instead of failing |
| `--archive-missing` | mark previously imported blocks whose file vanished as `archived` |
| `--dir <path>` | content root (default `backend/content/`, env `NOTES_DIR`) |
| `--log-dir <path>` | run-log output dir (default `prisma/logs/`, env `NOTES_LOG_DIR`) |
| `--threshold <n>` | confidence threshold for `needs-review` (default 0.7) |

### Safety guarantees

- **Dry-run by default** — prints a `filepath → type → confidence → action`
  table and a summary (`created / updated / pending-version / archived /
  skipped / needs-review / errors`) before anything touches the DB.
- **Idempotent upserts** — stable key `chapterId + blockType + title`;
  unchanged blocks are skipped, so re-running writes nothing.
- **Published blocks are never silently altered** — a changed, published
  block gets a pending `ContentVersion` while its live content stays
  untouched until `--publish` or an admin-panel action applies it.
- **One bad file never aborts the run** — errors are collected and reported
  (`X imported, Y skipped, Z errors`); the process exits 1 if any occurred.
- **Audit trail** — every decision is written to
  `prisma/logs/import-notes-<timestamp>.log`, structured per line.

### Adding a new content type in future

1. `backend/src/services/classifier.js` — add the type to `TAB_TYPES`,
   `TAB_TO_BLOCK_TYPE` (reuse an existing `BlockType` enum value — new enum
   values need a schema migration) and `TAB_ACCESS_LEVEL`, then add a folder
   alias to `FOLDER_TYPE_MAP` and a content signal + score line in
   `contentScores`.
2. `backend/prisma/import-notes.js` — nothing to change; it is driven by the
   classifier tables.
3. `backend/tests/import-notes.test.js` — extend the folder/heuristic case
   tables.
4. README — document the new folder name in the taxonomy tree above.

---

## Common tasks

| Task | Command |
|---|---|
| Apply migrations + import content (prod/local) | `cd backend && npm run migrate` |
| New migration (local dev only) | `cd backend && npx prisma migrate dev --name <name>` |
| Regenerate Prisma client | `cd backend && npx prisma generate` |
| Re-import content from `import-data/` | `cd backend && npm run content:import` |
| Import notes (7-tab taxonomy, dry-run) | `cd backend && npm run import-notes -- --dry-run` |
| Import notes (apply + publish) | `cd backend && npm run import-notes -- --apply --publish --allow-create` |
| Re-seed demo content | `cd backend && npm run seed` |
| Run tests | `cd backend && npm test` |
| Build frontend | `cd frontend && npm run build` |

> Note: the tsvector columns are added by a hand-written migration
> (`*_add_search_vectors`). If `prisma migrate dev` warns it wants to drop
> them, ignore it — always deploy with `prisma migrate deploy`, which runs
> the SQL files verbatim.

## Cloudflare R2 file storage

The backend supports file uploads via Cloudflare R2 (S3-compatible object storage).
Files are uploaded directly from the client using presigned URLs — the server never
handles the file bytes, keeping it lightweight and scalable.

### How it works

1. **Client requests a presigned URL** — `POST /api/upload/presigned-url` with `{ fileName, contentType, fileSize }`
2. **Server generates a presigned PUT URL** — valid for 5 minutes, stored in R2
3. **Client uploads directly to R2** — using the presigned URL (no backend proxy)
4. **Client confirms the upload** — `POST /api/upload/confirm` with `{ key, fileName, contentType, fileSize }`
5. **Server saves metadata** to the `R2Upload` table and returns the file record

### Setting up a Cloudflare R2 bucket

1. Sign up at [cloudflare.com](https://cloudflare.com) (free tier includes R2).
2. Go to **R2** → **Create bucket** → choose a name and region.
3. Go to **Settings → API Tokens** → **Create Token**:
   - Permissions: `Object: Read, Write, Delete`
   - Scope: `Account` or specific bucket
   - Copy the `Access Key ID` and `Secret Access Key`
4. The bucket endpoint format is `https://<account-id>.r2.cloudflarestorage.com`.
   Find your account ID in the Cloudflare dashboard → Home → account ID.

### Required environment variables

| Variable | Description | Example |
|---|---|---|
| `R2_ENDPOINT` | R2 S3-compatible endpoint | `https://abc123.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 API key ID | `abc123def456...` |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key | `xyz789...` |
| `R2_BUCKET` | R2 bucket name | `ravikishan-uploads` |

### Local development

1. Copy `.env.example` to `.env` and fill in the R2 variables.
2. The R2 service is a no-op when `R2_ENDPOINT` is empty — upload endpoints return 500 with a clear message.
3. For local testing with a mock R2, set `R2_ENDPOINT` to a localstack or mock endpoint.

### Production deployment

Add the four R2 env vars to your Render dashboard (or `render.yaml`):
- `R2_ENDPOINT` — your R2 endpoint URL
- `R2_ACCESS_KEY_ID` — from Cloudflare API tokens
- `R2_SECRET_ACCESS_KEY` — from Cloudflare API tokens
- `R2_BUCKET` — your bucket name

The `render.yaml` blueprint includes all four as `sync: false` (set them in the Render dashboard after deployment).

### File constraints

- **Max file size**: 50 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `application/pdf`, `text/plain`, `text/markdown`, `application/json`, `text/csv`, `audio/mpeg`, `audio/wav`, `video/mp4`
- **Blocked extensions**: `.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.py`, `.js`, `.html`, `.css`
- **Presigned URL expiry**: 300 seconds (5 minutes)

---

## Security notes

- All write endpoints validate with zod (types, lengths, shapes, allowed
  block types per subject type) and reject hostile input server-side.
- Passwords are bcrypt-hashed (cost 12); refresh tokens are stored hashed
  (SHA-256) and rotated on every use.
- Login (20/15 min) and access-request (5/hour) endpoints are rate-limited.
- CORS is locked to the origins listed in `CORS_ORIGIN`.
- Secrets live only in environment variables — `.env` files are gitignored.

## License

© 2026 Ravikishan · Owner: Ravikishan · Curated & made with curiosity by
Ravikishan. All rights reserved.
