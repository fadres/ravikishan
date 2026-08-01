import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

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

export async function getUploadUrl(fileName, contentType) {
  const key = `${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(r2, command, { expiresIn: UPLOAD_TTL_SECONDS });
  return { url, key };
}
