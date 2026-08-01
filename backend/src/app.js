import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import accessRoutes from './routes/access.routes.js';
import contentRoutes from './routes/content.routes.js';
import adminRoutes from './routes/admin.routes.js';

export function createApp() {
  const app = express();

  const isOriginAllowed = (origin) =>
    env.corsOrigins.includes(origin) ||
    (env.nodeEnv !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true); // non-browser clients
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        // Development: allow any localhost origin (vite on any port).
        if (env.nodeEnv !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, false); // denied → handled by the error below
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

  // Attach req.user if a valid Bearer token is present (anonymous otherwise).
  app.use(authenticate);

  // Light global API limiter.
  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }),
  );

  // Stricter limiters for credential + access-request abuse.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.authRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts — please wait a few minutes.' },
  });
  const requestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many access requests — please try again later.' },
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ravikishan-api' }));
  // Public site metadata (contact email for premium access queries).
  app.get('/api/meta', (_req, res) => res.json({ contactEmail: env.ownerEmail }));

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/access-requests', requestLimiter, accessRoutes);
  app.use('/api', contentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
