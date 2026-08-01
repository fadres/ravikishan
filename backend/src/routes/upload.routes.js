import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getUploadUrl } from '../services/r2.js';

const router = Router();

const uploadSchema = z.object({
  fileName: z.string().trim().max(200),
  contentType: z.string().trim().max(100),
});

router.post('/presigned-url', requireAuth, validate(uploadSchema), async (req, res) => {
  const { fileName, contentType } = req.body;
  const { url, key } = await getUploadUrl(fileName, contentType);
  await prisma.r2Upload.create({
    data: { key, contentType, uploadedById: req.user.id },
  });
  res.json({ url, key });
});

export default router;
