import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { authenticate } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import authRoutes from './routes/auth.routes.js';
import accessRoutes from './routes/access.routes.js';
import contentRoutes from './routes/content.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import progressRoutes from './routes/progress.routes.js';
import userRoutes from './routes/user.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import flashcardRoutes from './routes/flashcard.routes.js';
import plannerRoutes from './routes/planner.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import aiRoutes from './routes/ai.routes.js';

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

  // CSRF defence: this API authenticates with bearer tokens, but a JSON
  // content-type + origin check still blocks cross-site form-style posts.
  app.use('/api', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
      if (req.headers['content-type'] && !req.headers['content-type'].startsWith('application/json') && !req.headers['content-type'].startsWith('multipart/form-data')) {
        return res.status(415).json({ error: 'Unsupported content type' });
      }
    }
    next();
  });

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
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.aiRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests — please wait a moment.' },
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ravikishan-api' }));
  app.get('/api/meta', (_req, res) => res.json({ contactEmail: env.ownerEmail }));

  // SEO: sitemap.xml
  app.get('/sitemap.xml', async (_req, res) => {
    const classes = await prisma.class.findMany({ select: { slug: true } });
    const subjects = await prisma.subject.findMany({ where: { status: 'published' }, select: { slug: true, class: { select: { slug: true } } } });
    const chapters = await prisma.chapter.findMany({ where: { status: 'published' }, select: { slug: true, subject: { select: { slug: true, class: { select: { slug: true } } } } } });

    const base = env.siteUrl;
    const urls = [
      { loc: base, priority: '1.0', changefreq: 'daily' },
      ...classes.map((c) => ({ loc: `${base}/class/${c.slug}`, priority: '0.9', changefreq: 'weekly' })),
      ...subjects.map((s) => ({ loc: `${base}/class/${s.class.slug}/subject/${s.slug}`, priority: '0.8', changefreq: 'weekly' })),
      ...chapters.map((c) => ({ loc: `${base}/class/${c.subject.class.slug}/subject/${c.subject.slug}/chapter/${c.slug}`, priority: '0.7', changefreq: 'monthly' })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority><changefreq>${u.changefreq}</changefreq></url>`),
      '</urlset>',
    ].join('\n');

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  });

  // SEO: robots.txt
  app.get('/robots.txt', (_req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${env.siteUrl}/sitemap.xml`);
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/access-requests', requestLimiter, accessRoutes);
  app.use('/api', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api', plannerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
