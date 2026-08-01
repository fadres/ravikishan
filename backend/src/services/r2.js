import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';

const r2 = new S3Client({
  region: 'auto',
  endpoint: env.r2Endpoint,
  credentials: {
    accessKeyId: env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

const BUCKET = env.r2Bucket;
const UPLOAD_TTL_SECONDS = 300;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DEDUP_LOOKUP_WINDOW_MS = 60 * 60 * 1000;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
]);

export function validateFile(file) {
  if (!file || !file.name || !file.type) {
    throw new AppError(400, 'Invalid file: name and type are required');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(413, `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new AppError(415, `Unsupported file type: "${file.type}". Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`);
  }
  const ext = file.name.split('.').pop().toLowerCase();
  const dangerousExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'py', 'js', 'html', 'css'];
  if (dangerousExts.includes(ext)) {
    throw new AppError(415, `File extension ".${ext}" is not allowed for security reasons`);
  }
}

export function getAllowedMimeTypes() {
  return [...ALLOWED_MIME_TYPES];
}

function generateKey(fileName, contentType) {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${fileName}`;
}

export async function getUploadUrl(fileName, contentType, fileHash) {
  if (!BUCKET) throw new AppError(500, 'R2 bucket is not configured');
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new AppError(415, `Unsupported content type: "${contentType}"`);
  }

  const existing = fileHash
    ? await prisma.r2Upload.findFirst({
        where: {
          fileHash,
          status: 'complete',
          createdAt: { gte: new Date(Date.now() - DEDUP_LOOKUP_WINDOW_MS) },
        },
        select: { id: true, key: true, fileUrl: true, originalFilename: true },
      })
    : null;

  if (existing) {
    return { url: null, key: existing.key, duplicate: true, existingFile: existing };
  }

  const key = generateKey(fileName, contentType);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(r2, command, { expiresIn: UPLOAD_TTL_SECONDS });
  return { url, key, duplicate: false };
}

export async function confirmUpload(key, originalFilename, contentType, fileSize, uploadedById, fileHash) {
  const existing = await prisma.r2Upload.findFirst({
    where: { key, uploadedById, status: 'pending' },
  });
  if (!existing) throw new AppError(404, 'Upload record not found or already confirmed');

  const fileUrl = `${env.r2Endpoint}/${BUCKET}/${key}`;
  const upload = await prisma.r2Upload.update({
    where: { id: existing.id },
    data: {
      originalFilename,
      fileUrl,
      bucket: BUCKET,
      fileSize,
      mimeType: contentType,
      fileHash,
      status: 'complete',
    },
  });
  return upload;
}

export async function listFiles(userId, page = 1, perPage = 20) {
  const skip = (page - 1) * perPage;
  const [files, total] = await Promise.all([
    prisma.r2Upload.findMany({
      where: { uploadedById: userId, status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true,
        key: true,
        originalFilename: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        fileHash: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.r2Upload.count({
      where: { uploadedById: userId, status: { not: 'deleted' } },
    }),
  ]);
  return { files, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getFileDetails(id, userId) {
  const file = await prisma.r2Upload.findFirst({
    where: { id, uploadedById: userId },
    select: {
      id: true,
      key: true,
      originalFilename: true,
      fileUrl: true,
      bucket: true,
      fileSize: true,
      mimeType: true,
      fileHash: true,
      status: true,
      uploadedById: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!file) throw new AppError(404, 'File not found');
  return file;
}

export async function getDownloadUrl(id, userId) {
  const file = await prisma.r2Upload.findFirst({
    where: { id, uploadedById: userId, status: 'complete' },
  });
  if (!file) throw new AppError(404, 'File not found');

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: file.key,
  });
  const url = await getSignedUrl(r2, command, { expiresIn: UPLOAD_TTL_SECONDS });
  return { url, key: file.key, originalFilename: file.originalFilename };
}

export async function getPreviewUrl(id, userId) {
  const file = await prisma.r2Upload.findFirst({
    where: { id, uploadedById: userId, status: 'complete' },
  });
  if (!file) throw new AppError(404, 'File not found');

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isText = file.mimeType.startsWith('text/') || file.mimeType === 'application/json' || file.mimeType === 'text/csv';

  if (!isImage && !isPdf && !isText) {
    throw new AppError(400, `Preview not supported for "${file.mimeType}"`);
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: file.key,
  });
  const url = await getSignedUrl(r2, command, { expiresIn: UPLOAD_TTL_SECONDS });
  return { url, key: file.key, originalFilename: file.originalFilename, mimeType: file.mimeType, previewType: isImage ? 'image' : isPdf ? 'pdf' : 'text' };
}

export async function deleteFile(id, userId) {
  const file = await prisma.r2Upload.findFirst({
    where: { id, uploadedById: userId },
  });
  if (!file) throw new AppError(404, 'File not found');
  if (file.status === 'deleted') throw new AppError(409, 'File already deleted');

  let r2Deleted = false;
  let r2Error = null;

  if (BUCKET) {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: file.key,
      });
      await r2.send(deleteCommand);
      r2Deleted = true;
    } catch (err) {
      r2Error = err.message;
    }
  }

  await prisma.r2Upload.update({
    where: { id: file.id },
    data: { status: 'deleted' },
  });

  return { deleted: true, key: file.key, r2Deleted, r2Error };
}
