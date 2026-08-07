import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET'];
if (process.env.NODE_ENV === 'production') {
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 16) {
    throw new Error('JWT_ACCESS_SECRET must be at least 16 characters in production');
  }
  if (!process.env.PROGRESS_SYNC_URL) {
    throw new Error('Missing required environment variable: PROGRESS_SYNC_URL (the global backend base URL)');
  }
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  // MUST be identical to the global backend's JWT_ACCESS_SECRET — this
  // service verifies tokens issued by the global auth service. It never
  // signs anything.
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  // The global backend base URL + service-to-service secret (separate from
  // JWT_ACCESS_SECRET) for the internal progress-sync API.
  progressSyncUrl: process.env.PROGRESS_SYNC_URL || '',
  progressSyncSecret: process.env.PROGRESS_SYNC_SECRET || '',
  syncBatchSize: parseInt(process.env.SYNC_BATCH_SIZE || '50', 10),
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10),
  syncMaxAttempts: parseInt(process.env.SYNC_MAX_ATTEMPTS || '10', 10),
  corsOrigins: (process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  port: parseInt(process.env.PORT || '4100', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  aiRateLimit: parseInt(process.env.AI_RATE_LIMIT || '40', 10),
  // Section identity — this service serves exactly one section.
  sectionId: process.env.SECTION_ID || 'class-12-test',
  sectionLabel: process.env.SECTION_LABEL || 'Class 12 (test)',
  sectionClassSlug: process.env.SECTION_CLASS_SLUG || 'class-12-test',
  sectionContentDir: process.env.SECTION_CONTENT_DIR || 'content/class-12-test',
  aiEndpoint: process.env.AI_ENDPOINT || '',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  r2Endpoint: process.env.R2_ENDPOINT || '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  r2Bucket: process.env.R2_BUCKET || '',
};
