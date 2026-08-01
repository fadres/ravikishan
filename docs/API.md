# Ravikishan API Reference

Base URL: `http://localhost:4000` (dev) / `https://ravikishan-api.onrender.com` (prod).

All request/response bodies are JSON (`Content-Type: application/json`).
Auth uses `Authorization: Bearer <accessToken>` headers. Refresh tokens are
sent in JSON bodies (cross-origin SPA friendly).

## Conventions

- **Errors**: `{ "error": string, "details"?: object }` with status 400/401/403/404/409/500.
- **Roles**: `owner` > `admin` > `member` > `guest`.
- **Access levels** (per block): `1` = Premium (owner), `2` = Members
  (approved), `3` = Free (everyone). A block is readable when
  `block.accessLevel >= viewer.accessLevel` (anonymous viewers default to
  `3`). Unreadable blocks always return **titles + metadata only** —
  `contentRichtext`, `contentCode`, `codeLanguage`, `mindmapJson` and
  `diagramData` are omitted server-side, never hidden in the response.
- Access-level policy: approving an access request sets the user to
  `member` + level `2`; only the owner may grant level `1`; a role change
  nudges the level (owner/admin → 1, member → 2, guest → 3) unless an
  explicit level is given.
- Rate limits: global 300 req/15 min; auth 20/15 min; access requests 5/hour.

---

## Auth

### POST `/api/auth/register`
Create a guest account (approval required for content access).
| Field | Type | Rules |
|---|---|---|
| `email` | string | required, valid email, ≤254 |
| `password` | string | required, 8–128 |
| `displayName` | string | optional, 2–80 |

**201** → `{ user, accessToken, refreshToken, refreshExpiresAt }`
**409** → email already registered.

### POST `/api/auth/login`
**200** → `{ user, accessToken, refreshToken, refreshExpiresAt }`
**401** → invalid credentials.

### POST `/api/auth/refresh`
Rotates the refresh token (old one is revoked).
Body: `{ refreshToken: string }`
**200** → `{ user, accessToken, refreshToken, refreshExpiresAt }`
**401** → invalid, expired or replayed token.

### POST `/api/auth/logout`
Body: `{ refreshToken: string }` — revokes it. **204**.

### GET `/api/auth/me` *(auth)*
**200** → `{ user: { id, email, displayName, role, accessLevel, isApproved, createdAt } }`

---

## Access requests

### POST `/api/access-requests` *(rate-limited: 5/hour)*
Body:
- Authenticated: `{ message }` (5–2000 chars)
- Anonymous: `{ email, displayName, message }` — creates the account
  (random password) and logs the visitor in automatically.

**201** → `{ request: { id, status, requestedAt }, user, created, accessToken?, refreshToken? }`
**409** → a pending request already exists.

---

## Content (public structure)

### GET `/api/classes`
**200** → `{ classes: [{ id, name, slug, sortOrder, subjects: [{ id, name, slug, subjectType, icon, themeColor, isLocked, sortOrder, _count: { chapters } }] }] }`

### GET `/api/classes/:slug`
**200** → `{ klass: … }` (same shape). **404** → unknown slug.

### GET `/api/subjects/:slug`
**200** → `{ subject: { …, chapters: [{ id, title, slug, isLocked, sortOrder, _count: { blocks } }] } }`

### GET `/api/subjects/:subjectSlug/chapters/:chapterSlug`
The heart of the access rule: every block carries its own `accessLevel`.

**200** →
```json
{
  "chapter": { "id", "title", "slug", "viewerAccessLevel": 3, "canRead": true },
  "subject": { "id", "name", "slug", "themeColor" },
  "blocks": [
    {
      "id", "blockType", "accessLevel": 2, "title", "subLevel", "sortOrder"
    }
  ]
}
```
Blocks with `accessLevel <= viewerAccessLevel` additionally include
`contentRichtext`, `contentCode`, `codeLanguage`, `mindmapJson`,
`diagramData`, `classifiedBy` ("auto" | "manual" | null), `createdAt`,
`updatedAt`. Everything else is public — structure, titles and lock state
are always visible.

Blocks are arranged by the content flow: **free (3) → members (2) →
premium (1)**, then by `sortOrder` within each tier, so every viewer reads
the free sections first and premium ones last.

**404** → subject or chapter not found.

### GET `/api/search?q=…`
Full-text search over `tsvector` (`english` + `simple` configs), ranked by
`ts_rank`. Snippets (`ts_headline`) are included only when
`accessLevel >= viewer level`; unreadable results carry
`"locked": true` and `snippet: null`.
When fewer than 3 results match, `recommendations` returns sibling topics.

**200** → `{ query, results: [{ id, title, blockType, subLevel, chapter: { title, slug }, subject: { name, slug }, klass: { name, slug }, rank, locked, snippet }], recommendations: [same shape] }`

---

## Admin (`/api/admin/*`) — requires `owner` or `admin`

### Access requests

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/admin/requests?status=pending\|approved\|denied` | — | `{ requests: [{ id, email, message, status, requestedAt, resolvedAt, user: {…}, resolvedBy: {…} }] }` |
| POST | `/api/admin/requests/:id/approve` | — | 200 `{ request }`; sets status, promotes user to `member`, `isApproved=true`; audit `access.approved` |
| POST | `/api/admin/requests/:id/deny` | — | 200 `{ request }`; audit `access.denied` |

409 → request already resolved.

### Users

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/admin/users` | — | `{ users: [{ id, email, displayName, role, accessLevel, isApproved, createdAt, _count: { accessRequests } }] }` |
| PATCH | `/api/admin/users/:id` | `{ role?: "owner"\|"admin"\|"member"\|"guest", isApproved?: boolean, accessLevel?: 1\|2\|3 }` | 200 `{ user }`; admins cannot grant owner/admin or level `1` (owner-only); a role change nudges the level (owner/admin → 1, member → 2, guest → 3) unless explicit. The owner account cannot be demoted by others. Audit `user.updated`. |

### Lock toggles

`isLocked` on subjects/chapters is a legacy display flag — it no longer gates
content. Gating is per block via `accessLevel` (see the chapter endpoint).

| Method | Path | Body | Result |
|---|---|---|---|
| PATCH | `/api/admin/subjects/:id` | `{ isLocked: boolean }` | 200 `{ subject }`; audit `subject.lock_toggled` |
| PATCH | `/api/admin/chapters/:id` | `{ isLocked: boolean }` | 200 `{ chapter }`; audit `chapter.lock_toggled` |

### Audit trail

**GET `/api/admin/audit?limit=100`** (max 500) →
`{ logs: [{ id, action, actorEmail, actorId, targetType, targetId, detail, createdAt }] }`

Actions: `access.approved`, `access.denied`, `access.requested`,
`user.updated`, `subject.lock_toggled`, `chapter.lock_toggled`,
`subject.created/updated`, `chapter.created/deleted/reordered`,
`block.created/updated/deleted`.

### Content CRUD

**Block types by subject type** (enforced server-side):

| subjectType | allowed blockTypes |
|---|---|
| `science_math` | `note_topic, note_statement, note_example, note_concept, note_important, numerical, mindmap, formula, symbols` |
| `biology` | `note_topic, note_statement, note_example, note_concept, note_important, diagram_compare, mindmap` |
| `english` | `summary, keywords, important_points` |
| `nepali` | `byakaran` |

Block body fields:
`blockType` (optional — see auto-classification below), `accessLevel` (`1` Premium / `2` Members / `3` Free, defaults to `3`),
`title` (≤200),
`contentRichtext` (≤100k, markdown),
`contentCode` (≤100k), `codeLanguage` (≤50; e.g. `javascript, typescript, python, json, html, css, sql, java, c, cpp, bash`),
`mindmapJson` `{ name, children[] }`, `diagramData`
`{ left: { name, points[] }, right: { name, points[] }, similarities[], differences[{ left, right }] }`,
`subLevel` (≤300, Nepali byakaran nesting), `sortOrder` (int ≥ 0).

**Auto-classification (spec 4c):** when `blockType` is omitted on create, a
rule-based classifier (`backend/src/services/classifier.js`) picks the type
from the title/content and the block is stored with `classifiedBy: "auto"`.
When `blockType` is sent explicitly, `classifiedBy: "manual"`. The classifier
priority: important markers (`Note:`, `Important:`, `⚠`, …) → example signals
(`e.g.`, `for example`, `such as`) → definition phrasing (`is defined as`,
`refers to`, `means`) → short title-like text → `note_statement` fallback.
Suggestions are coerced to the subject's allowed set (e.g. an `english`
subject always lands on `important_points`). On update, a content-only edit
keeps the original `classifiedBy`; changing `blockType` marks it `manual`.

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/admin/chapters/:id/blocks` | — | `{ chapter, blocks: [full] }` |
| POST | `/api/admin/chapters/:id/blocks` | block fields (`blockType` optional) | 201 `{ block }`; audit `block.created` (includes `classifiedBy` + classifier reason) |
| PATCH | `/api/admin/blocks/:id` | partial block fields | 200 `{ block }`; audit `block.updated` |
| DELETE | `/api/admin/blocks/:id` | — | 204; audit `block.deleted` |
| POST | `/api/admin/chapters/:id/blocks/reorder` | `{ orderedIds: string[] }` (all blocks of the chapter) | 200 `{ ok: true }`; audit `chapter.reordered` |

### Subject & chapter management

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/api/admin/subjects` | `{ classSlug, name, slug?, subjectType, icon?, themeColor?, isLocked? }` | 201 `{ subject }`; slug auto-generated from name if omitted |
| PATCH | `/api/admin/subjects/:id/meta` | `{ name?, icon?, themeColor?, sortOrder? }` | 200 `{ subject }` |
| POST | `/api/admin/chapters` | `{ subjectId, title, slug?, isLocked? }` | 201 `{ chapter }` |
| DELETE | `/api/admin/chapters/:id` | — | 204 (cascades blocks) |

---

## Misc

### GET `/health`
`{ status: "ok", service: "ravikishan-api" }` — use with UptimeRobot (free)
to keep the Render free web service awake.
