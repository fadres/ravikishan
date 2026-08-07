import { Router } from 'express';
import { SECTION, getSection } from '../lib/section.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// GET /api/sections — public: this service's own registry entry (mirrors
// the global backend's registry shape so clients treat both identically).
router.get('/', (_req, res) => {
  res.json({
    sections: [
      {
        id: SECTION.id,
        label: SECTION.label,
        classSlug: SECTION.classSlug,
        status: SECTION.status,
      },
    ],
  });
});

// GET /api/sections/:sectionId — public: identity (only this section).
router.get('/:sectionId', (req, res) => {
  const section = getSection(req.params.sectionId);
  if (!section) throw new AppError(404, `Unknown section: ${req.params.sectionId}`);
  res.json({
    section: {
      id: section.id,
      label: section.label,
      classSlug: section.classSlug,
      status: section.status,
    },
  });
});

export default router;
