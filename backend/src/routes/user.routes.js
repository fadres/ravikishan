import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recordAudit } from '../services/audit.js';
import { publicUser } from './auth.routes.js';
import { getUploadUrl, validateFile } from '../services/r2.js';

const router = Router();

const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// GET /api/users/me — full profile for the authenticated user.
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      studyStreak: true,
      _count: {
        select: {
          userProgress: true,
          bookmarks: true,
          userBadges: true,
          quizAttempts: true,
          flashcardDecks: true,
        },
      },
    },
  });
  if (!user) throw new AppError(404, 'User not found');
  res.json({
    user: publicUser(user),
    stats: user._count,
    streak: user.studyStreak,
  });
});

// PATCH /api/users/me — update display name, bio.
const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(300).optional().or(z.literal('')),
});

router.patch('/me', requireAuth, validate(profileSchema), async (req, res) => {
  const data = {};
  if (req.body.displayName !== undefined) data.displayName = req.body.displayName;
  if (req.body.bio !== undefined) data.bio = req.body.bio || null;
  if (Object.keys(data).length === 0) throw new AppError(400, 'Nothing to update');
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
  });
  await recordAudit(req.user, 'user.profile_updated', 'User', user.id, data);
  res.json({ user: publicUser(user) });
});

// POST /api/users/me/avatar — presign an R2 upload for the avatar.
const avatarPresignSchema = z.object({
  fileName: z.string().trim().max(255),
  contentType: z.string().trim().max(100),
  fileSize: z.number().int().positive().max(MAX_AVATAR_BYTES),
});

router.post('/me/avatar/presign', requireAuth, validate(avatarPresignSchema), async (req, res) => {
  const { fileName, contentType } = req.body;
  if (!AVATAR_MIME.has(contentType)) {
    throw new AppError(415, 'Avatars must be a JPEG, PNG, WEBP or GIF image');
  }
  validateFile({ name: fileName, type: contentType, size: req.body.fileSize });
  const { url, key, duplicate, existingFile } = await getUploadUrl(fileName, contentType, undefined);
  res.json({ url, key, duplicate, existingFile });
});

// POST /api/users/me/avatar — attach an already-uploaded R2 file as the avatar.
const avatarConfirmSchema = z.object({
  key: z.string().trim().min(1),
});

router.post('/me/avatar', requireAuth, validate(avatarConfirmSchema), async (req, res) => {
  const upload = await prisma.r2Upload.findFirst({
    where: { key: req.body.key, uploadedById: req.user.id, status: 'complete' },
  });
  if (!upload) throw new AppError(404, 'Upload not found — confirm it first');
  if (!AVATAR_MIME.has(upload.mimeType)) {
    throw new AppError(415, 'Avatars must be a JPEG, PNG, WEBP or GIF image');
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: upload.fileUrl },
  });
  await recordAudit(req.user, 'user.avatar_updated', 'User', user.id, { key: upload.key });
  res.json({ user: publicUser(user) });
});

export default router;
