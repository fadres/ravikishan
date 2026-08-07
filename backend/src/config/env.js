import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if (process.env[key] && process.env[key].length < 16) {
      throw new Error(`${key} must be at least 16 characters in production`);
    }
  }
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  // The existing Neon project is officially the CLASS 11 database.
  // NEON_CLASS11_URL is its canonical name (alias of DATABASE_URL — the
  // connection string is NOT duplicated, so this keeps working today and
  // the rename costs nothing when the split happens). Future sections get
  // their own NEW Neon projects with their own env vars — never this one.
  // See ARCHITECTURE.md.
  class11DbUrl: process.env.NEON_CLASS11_URL || process.env.DATABASE_URL,
  // Service-to-service secret for the internal progress-sync API
  // (POST /internal/progress-sync). Section services send it in the
  // `x-service-secret` header — separate from the JWT secret on purpose.
  progressSyncSecret: process.env.PROGRESS_SYNC_SECRET || '',
  // Base URL of the independent Class 12 (test) section service. When set,
  // the global backend proxies class-12-test content/search/AI requests to
  // it instead of connecting to its Neon directly.
  class12BackendUrl: process.env.CLASS12_BACKEND_URL || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  perfLog: process.env.PERF_LOG || '',
  authRateLimit: parseInt(process.env.AUTH_RATE_LIMIT || '20', 10),
  aiRateLimit: parseInt(process.env.AI_RATE_LIMIT || '40', 10),
  ownerEmail: process.env.OWNER_EMAIL || 'harindarsah98172@gmail.com',
  // Public contact email shown on the site (login/access cards). Separate from
  // OWNER_EMAIL so the owner login account can keep its own identity.
  contactEmail: process.env.CONTACT_EMAIL || 'ravikishan1814@gmail.com',
  ownerPassword: process.env.OWNER_PASSWORD || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || '',
  siteUrl: process.env.SITE_URL || 'https://ravikisan.netlify.app',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:ravikishan1814@gmail.com',
  aiEndpoint: process.env.AI_ENDPOINT || '',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  r2Endpoint: process.env.R2_ENDPOINT || '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  r2Bucket: process.env.R2_BUCKET || '',
};
