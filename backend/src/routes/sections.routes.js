// Section-scoped API — the registry-facing surface of the multi-section
// architecture (see ARCHITECTURE.md). Every section-scoped capability
// (search, AI, import) resolves the section through src/lib/sections.config.js
// and only ever touches that section's own database.
//
// NOTE: /search and other fixed segment paths MUST be registered before
// /:sectionId (a single segment matches any id, including "search").
import { Router } from 'express';
import { getSection, activeSections } from '../lib/sections.config.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Never leak connection strings or AI keys — public listing carries only
// identity + status.
const safeSection = (s) => ({
  id: s.id,
  label: s.label,
  classSlug: s.classSlug,
  status: s.status,
});

// GET /api/sections — public: the active section registry (ids the frontend
// uses to namespace routes and API calls).
router.get('/', (_req, res) => {
  res.json({ sections: activeSections().map(safeSection) });
});

// GET /api/sections/:sectionId — public: one section's identity.
router.get('/:sectionId', (req, res) => {
  const section = getSection(req.params.sectionId);
  if (!section) throw new AppError(404, `Unknown section: ${req.params.sectionId}`);
  res.json({ section: safeSection(section) });
});

export default router;
