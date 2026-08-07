// Ravikishan API client — single place for fetch, auth headers and
// silent token refresh on 401. Section-aware: section-scoped requests are
// routed to the section's own backend when it is an independent service
// (see lib/sectionLinks.js + ARCHITECTURE.md).

import { sectionBackendUrl } from '../lib/sectionLinks.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ACCESS_KEY = 'rk_access_token';
const REFRESH_KEY = 'rk_refresh_token';

let accessToken = localStorage.getItem(ACCESS_KEY) || null;
let refreshToken = localStorage.getItem(REFRESH_KEY) || null;

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let refreshInFlight = null;

async function refreshSession() {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearTokens();
          return false;
        }
        const data = await res.json();
        setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function api(path, opts = {}) {
  return request(API_URL, path, opts);
}

async function request(baseUrl, path, { method = 'GET', body, auth = true, retried = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Network error — is the server reachable?');
  }

  if (res.status === 401 && auth && accessToken && !retried && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) return request(baseUrl, path, { method, body, auth, retried: true });
    throw new ApiError(401, 'Session expired — please log in again.');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.details);
  }
  return data;
}

/**
 * Section-aware request: resolves the section's own backend URL from the
 * section registry (see lib/sectionLinks.js) and calls THAT service for
 * section-scoped requests (content, section search, section AI). Sections
 * without their own backend (Class 11 today) fall back to the global API.
 * Tokens are shared — the same JWT works on every section service.
 */
export function sectionApi(path, sectionId, opts = {}) {
  return sectionBackendUrl(sectionId).then((backendUrl) => {
    if (!backendUrl) return request(API_URL, path, opts);
    return request(backendUrl, path, opts);
  });
}
