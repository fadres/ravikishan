import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import contentRoutes from './routes/content.routes.js';
import aiRoutes from './routes/ai.routes.js';
import progressRoutes from './routes/progress.routes.js';
import sectionsRoutes from './routes/sections.routes.js';
import { SECTION } from './lib/section.js';

export function createApp() {
  const app = express();

  const isOriginAllowed = (origin) =>
    env.corsOrigins.includes(origin) ||
    (env.nodeEnv !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin));

  app.use(requestLogger);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (env.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        if (env.nodeEnv !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      optionsSuccessStatus: 200,
    }),
  );
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({ error: `Origin "${origin}" is not allowed by CORS` });
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  // CSRF defence: same bearer-token + content-type policy as the global backend.
  app.use('/api', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
      if (req.headers['content-type'] && !req.headers['content-type'].startsWith('application/json') && !req.headers['content-type'].startsWith('multipart/form-data')) {
        return res.status(415).json({ error: 'Unsupported content type' });
      }
    }
    next();
  });

  // Attach req.user from the shared-JWT payload (anonymous otherwise).
  app.use(authenticate);

  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }),
  );

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: `ravikishan-${SECTION.id}-api`, sectionId: SECTION.id }),
  );

  app.use('/api/sections', sectionsRoutes);
  app.use('/api', contentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/progress', progressRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
