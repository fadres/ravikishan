import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.js';
import {
  getUploadUrl,
  confirmUpload,
  listFiles,
  getFileDetails,
  getDownloadUrl,
  deleteFile,
  validateFile,
  getAllowedMimeTypes,
} from '../services/r2.js';

const router = Router();

const presignSchema = z.object({
  fileName: z.string().trim().max(255),
  contentType: z.string().trim().max(100),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
});

const confirmSchema = z.object({
  key: z.string().trim(),
  fileName: z.string().trim().max(255),
  contentType: z.string().trim().max(100),
  fileSize: z.number().int().positive(),
});

router.post('/presigned-url', requireAuth, validate(presignSchema), async (req, res) => {
  const { fileName, contentType, fileSize } = req.body;
  validateFile({ name: fileName, type: contentType, size: fileSize });
  const { url, key } = await getUploadUrl(fileName, contentType);
  await prisma.r2Upload.create({
    data: {
      key,
      originalFilename: fileName,
      mimeType: contentType,
      fileSize,
      status: 'pending',
      uploadedById: req.user.id,
    },
  });
  await recordAudit(req.user, 'upload.presigned', 'R2Upload', null, {
    fileName,
    contentType,
    fileSize,
    key,
  });
  res.json({ url, key });
});

router.post('/confirm', requireAuth, validate(confirmSchema), async (req, res) => {
  const { key, fileName, contentType, fileSize } = req.body;
  const confirmed = await confirmUpload(key, fileName, contentType, fileSize, req.user.id);
  await recordAudit(req.user, 'upload.confirmed', 'R2Upload', confirmed.id, {
    fileName,
    contentType,
    fileSize,
    key,
  });
  res.json({ file: confirmed });
});

router.get('/files', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const perPage = Math.min(parseInt(req.query.perPage || '20', 10), 100);
  const result = await listFiles(req.user.id, page, perPage);
  res.json(result);
});

router.get('/files/:id', requireAuth, async (req, res) => {
  const file = await getFileDetails(req.params.id, req.user.id);
  res.json({ file });
});

router.get('/files/:id/download', requireAuth, async (req, res) => {
  const { url, key, originalFilename } = await getDownloadUrl(req.params.id, req.user.id);
  await recordAudit(req.user, 'file.downloaded', 'R2Upload', req.params.id, {
    key,
    originalFilename,
  });
  res.json({ url, key, originalFilename });
});

router.delete('/files/:id', requireAuth, async (req, res) => {
  const result = await deleteFile(req.params.id, req.user.id);
  await recordAudit(req.user, 'file.deleted', 'R2Upload', req.params.id, result);
  res.json(result);
});

router.get('/meta', (_req, res) => {
  res.json({
    maxFileSize: 50 * 1024 * 1024,
    allowedMimeTypes: getAllowedMimeTypes(),
    presignedUrlTtlSeconds: 300,
  });
});

export default router;
