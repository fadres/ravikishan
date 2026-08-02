import { env } from '../config/env.js';

export function requestLogger(req, _res, next) {
  const start = Date.now();
  const { method, url } = req;
  next();
  const duration = Date.now() - start;
  if (env.nodeEnv === 'development') {
    console.log(`${method} ${url} ${duration}ms`);
  }
}