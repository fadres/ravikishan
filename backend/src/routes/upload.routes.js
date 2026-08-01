import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
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
  getPreviewUrl,
  deleteFile,
  validateFile,
  getAllowedMimeTypes,
} from '../services/r2.js';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests — please wait a few minutes.' },
});

const presignSchema = z.object({
  fileName: z.string().trim().max(255),
  contentType: z.string().trim().max(100),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  fileHash: z.string().trim().length(64).optional(),
});

const confirmSchema = z.object({
  key: z.string().trim(),
  fileName: z.string().trim().max(255),
  contentType: z.string().trim().max(100),
  fileSize: z.number().int().positive(),
  fileHash: z.string().trim().length(64).optional(),
});

router.post('/presigned-url', requireAuth, uploadLimiter, validate(presignSchema), async (req, res) => {
  const { fileName, contentType, fileSize, fileHash } = req.body;
  validateFile({ name: fileName, type: contentType, size: fileSize });
  const { url, key, duplicate, existingFile } = await getUploadUrl(fileName, contentType, fileHash);

  if (duplicate && existingFile) {
    await recordAudit(req.user, 'upload.duplicate', 'R2Upload', existingFile.id, {
      fileName,
      contentType,
      fileSize,
      key,
    });
    return res.json({ url: null, key, duplicate: true, existingFile });
  }

  await prisma.r2Upload.create({
    data: {
      key,
      originalFilename: fileName,
      mimeType: contentType,
      fileSize,
      fileHash,
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
  res.json({ url, key, duplicate: false });
});

router.post('/confirm', requireAuth, validate(confirmSchema), async (req, res) => {
  const { key, fileName, contentType, fileSize, fileHash } = req.body;
  const confirmed = await confirmUpload(key, fileName, contentType, fileSize, req.user.id, fileHash);
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

router.get('/files/:id/preview', requireAuth, async (req, res) => {
  const preview = await getPreviewUrl(req.params.id, req.user.id);
  await recordAudit(req.user, 'file.previewed', 'R2Upload', req.params.id, {
    key: preview.key,
    originalFilename: preview.originalFilename,
  });
  res.json(preview);
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
    uploadLimit: { maxUploads: 20, windowMs: 15 * 60 * 1000 },
  });
});

export default router;
