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
- **Locked-content rule** — anonymous visitors see subject/chapter
  navigation and block *titles* only. The backend never returns
  `contentRichtext` / `contentCode` / `mindmapJson` / `diagramData` for
  locked subjects (or locked chapters) to non-approved users — not even
  hidden in the response. This is enforced server-side and covered by an
  automated test (`backend/tests/api.test.js`).
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
npm run seed                    # owner + demo content (idempotent)
npm test                        # 20 tests — auth + locked-content rule
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
| `owner@ravikishan.com` | `ravikishan-owner-2026` | owner |
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
   - `NODE_ENV=production`
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

## Common tasks

| Task | Command |
|---|---|
| Apply migrations (prod/local) | `cd backend && npx prisma migrate deploy` |
| New migration (local dev only) | `cd backend && npx prisma migrate dev --name <name>` |
| Regenerate Prisma client | `cd backend && npx prisma generate` |
| Re-seed demo content | `cd backend && npm run seed` |
| Run tests | `cd backend && npm test` |
| Build frontend | `cd frontend && npm run build` |

> Note: the tsvector columns are added by a hand-written migration
> (`*_add_search_vectors`). If `prisma migrate dev` warns it wants to drop
> them, ignore it — always deploy with `prisma migrate deploy`, which runs
> the SQL files verbatim.

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
