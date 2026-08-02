// Performance instrumentation middleware.
// Gated behind env PERF_LOG=1: tracks handler time, JSON serialization time,
// payload bytes and Prisma query timings per request, and echoes them as
// X-Perf-* response headers so external benchmarks can read server-side
// numbers without parsing logs.

import { performance } from 'node:perf_hooks';
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '../config/env.js';

export const perfStore = new AsyncLocalStorage();

export function registerPerf(prisma) {
  if (env.perfLog !== '1') return;
  prisma.$on('query', (e) => {
    const store = perfStore.getStore();
    if (store) {
      store.queries += 1;
      store.queryMs += e.duration;
      if (e.duration > store.slowestQuery) {
        store.slowestQuery = e.duration;
        store.slowestQuerySql = e.query.replace(/\s+/g, ' ').slice(0, 200);
      }
    }
  });
}

export function perfMiddleware(req, res, next) {
  if (env.perfLog !== '1') return next();
  const store = { queries: 0, queryMs: 0, slowestQuery: 0, slowestQuerySql: null };
  const start = performance.now();

  const emit = (serializeMs, payloadBytes) => {
    const total = Math.round((performance.now() - start) * 100) / 100;
    res.setHeader('X-Perf-TotalMs', String(total));
    res.setHeader('X-Perf-QueryCount', String(store.queries));
    res.setHeader('X-Perf-QueryMs', String(Math.round(store.queryMs * 100) / 100));
    res.setHeader('X-Perf-SlowestQueryMs', String(Math.round(store.slowestQuery * 100) / 100));
    res.setHeader('X-Perf-PayloadBytes', String(payloadBytes ?? 0));
    if (store.slowestQuery > 0) res.setHeader('X-Perf-SlowestQuery', store.slowestQuerySql);
    if (env.nodeEnv === 'development') {
      console.log(
        `[perf] ${req.method} ${req.originalUrl} total=${total}ms serialize=${serializeMs ?? '-'}ms q=${store.queries}(${Math.round(store.queryMs * 100) / 100}ms) slow=${Math.round(store.slowestQuery * 100) / 100}ms payload=${payloadBytes ?? 0}B`,
      );
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const jsonStart = performance.now();
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    emit(Math.round((performance.now() - jsonStart) * 100) / 100, Buffer.byteLength(serialized, 'utf8'));
    return originalJson(serialized);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    const jsonStart = performance.now();
    const payload =
      typeof body === 'string' || Buffer.isBuffer(body)
        ? body
        : JSON.stringify(body);
    emit(Math.round((performance.now() - jsonStart) * 100) / 100, Buffer.byteLength(payload, 'utf8'));
    return originalSend(payload);
  };

  perfStore.run(store, next);
}
