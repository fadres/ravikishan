// Section-scoped API — the registry-facing surface of the multi-section
// architecture (see ARCHITECTURE.md). Every section-scoped capability
// (search, AI) resolves the section through src/lib/sections.config.js and
// only ever touches that section's own database.
//
// ROUTE ORDER MATTERS: the single-segment /search fan-out is registered
// BEFORE the /:sectionId handlers — a single segment matches any id,
// including "search". The two-segment /:sectionId/search and
// /:sectionId/ai/ask cannot be swallowed by /:sectionId.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getSection, activeSections } from '../lib/sections.config.js';
import { AppError } from '../middleware/error.js';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { searchWithinSection, searchAcrossSections } from '../services/search.js';
import { askSection } from '../services/ai.js';
import { env } from '../config/env.js';

const router = Router();

// Never leak connection strings or AI keys — public listing carries only
// identity + status.
const safeSection = (s) => ({
  id: s.id,
  label: s.label,
  classSlug: s.classSlug,
  status: s.status,
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
  subject: z.string().trim().optional(),
  type: z.string().trim().optional(),
  section: z.enum(['topic', 'learning', 'diagram', 'concept', 'examples', 'important', 'mind_recall', 'pyq', 'solved', 'premium', 'references']).optional(),
  access: z.coerce.number().int().min(1).max(3).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(50).optional(),
});

// GET /api/sections — public: the active section registry (ids the frontend
// uses to namespace routes and API calls).
router.get('/', (_req, res) => {
  res.json({ sections: activeSections().map(safeSection) });
});

// ── Cross-section search (fan-out) ───────────────────────────────────────
// GET /api/sections/search?q= — MUST stay registered before /:sectionId.
// Fans out to every ACTIVE section in parallel (each on its own DB), merges
// ranked results, reports per-section failures in `failed` instead of
// erroring the whole request.
router.get('/search', authenticate, validate(searchSchema, 'query'), async (req, res) => {
  const viewerLevel = req.user?.accessLevel ?? 4;
  const filters = {
    subjectSlug: req.validated.subject,
    blockType: req.validated.type,
    section: req.validated.section,
    accessLevel: req.validated.access,
    page: req.validated.page,
    perPage: req.validated.perPage,
  };
  const data = await searchAcrossSections(req.validated.q, viewerLevel, filters);
  res.json({ query: req.validated.q, ...data });
});

// GET /api/sections/:sectionId — public: one section's identity.
router.get('/:sectionId', (req, res) => {
  const section = getSection(req.params.sectionId);
  if (!section) throw new AppError(404, `Unknown section: ${req.params.sectionId}`);
  res.json({ section: safeSection(section) });
});

// ── Section-scoped search ───────────────────────────────────────────────
// GET /api/sections/:sectionId/search?q= — same pipeline as the global
// search, but reads only the section's own database (every result is tagged
// with the sectionId). Same degradation rules as /api/search.
router.get('/:sectionId/search', authenticate, validate(searchSchema, 'query'), async (req, res) => {
  const section = getSection(req.params.sectionId);
  if (!section) throw new AppError(404, `Unknown section: ${req.params.sectionId}`);
  const viewerLevel = req.user?.accessLevel ?? 4;
  const filters = {
    subjectSlug: req.validated.subject,
    blockType: req.validated.type,
    section: req.validated.section,
    accessLevel: req.validated.access,
    page: req.validated.page,
    perPage: req.validated.perPage,
  };
  const data = await searchWithinSection(section.id, req.validated.q, viewerLevel, filters);
  res.json({ query: req.validated.q, ...data });
});

// ── Section-scoped AI ───────────────────────────────────────────────────
// POST /api/sections/:sectionId/ai/ask — grounded answer from the section's
// own content, answered through the section's own local AI endpoint
// (registry aiEndpoint). Auth required, same as the global /api/ai.

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.aiRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests — please wait a moment.' },
});

const askSchema = z.object({
  question: z.string().trim().min(5).max(2000),
  chapterId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
});

router.post('/:sectionId/ai/ask', aiLimiter, requireAuth, validate(askSchema), async (req, res) => {
  const section = getSection(req.params.sectionId);
  if (!section) throw new AppError(404, `Unknown section: ${req.params.sectionId}`);
  const result = await askSection(req.user.id, section.id, req.body);
  res.json(result);
});

export default router;
