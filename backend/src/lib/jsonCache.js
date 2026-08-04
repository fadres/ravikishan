// Tiny in-memory response cache with ETag support for hot public endpoints.
// Keeps the DB from being hit on every page load (Header/Home/ChapterPage all
// fetch /api/classes). Content changes are picked up via a short TTL; nothing
// is ever cached longer than CACHE_TTL_MS so the admin panel stays fresh.

import { createHash } from 'node:crypto';

const DEFAULT_TTL_MS = 30_000;

const cache = new Map(); // key → { body, etag, expiresAt }

function etagFor(body) {
  return '"' + createHash('sha1').update(body).digest('hex').slice(0, 16) + '"';
}

export function cachedJson(key, ttlMs = DEFAULT_TTL_MS) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit;
  return null;
}

export function storeCachedJson(key, json, ttlMs = DEFAULT_TTL_MS) {
  const body = JSON.stringify(json);
  const hit = { body, etag: etagFor(body), expiresAt: Date.now() + ttlMs };
  cache.set(key, hit);
  return hit;
}

// Express middleware helper: serves 304 when the client's ETag matches.
export function sendJsonCached(req, res, key, json, ttlMs) {
  const hit = cachedJson(key, ttlMs);
  if (hit && req.headers['if-none-match'] === hit.etag) {
    res.set('ETag', hit.etag).status(304).end();
    return;
  }
  const entry = hit || storeCachedJson(key, json, ttlMs);
  res.set('ETag', entry.etag).set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`).json(json);
}

export function clearCachedJson(key) {
  if (key === undefined) cache.clear();
  else cache.delete(key);
}
