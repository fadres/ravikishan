// Remote-section proxy: sections registered with a `backendUrl` are
// INDEPENDENT services (e.g. backend-class12-test/). The global backend
// never opens a connection to their Neon — content, search and AI requests
// are proxied to the section service itself, which verifies the user's JWT
// locally (shared JWT_ACCESS_SECRET) and serves from its own database.
//
// The section's API mirrors the global surface, so the global-facing
// sections routes (GET /api/sections/:sectionId/search,
// POST /api/sections/:sectionId/ai/ask) keep their shapes while the
// implementation behind them switches on section.backendUrl.

const REMOTE_TIMEOUT_MS = 10_000;

async function remoteFetch(baseUrl, path, { method = 'GET', token = null, body = null, query = null } = {}) {
  const url = new URL(path, baseUrl.replace(/\/+$/, ''));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
    });
  } catch {
    const err = new Error(`Section service unreachable (${baseUrl})`);
    err.code = 'SECTION_UNREACHABLE';
    throw err;
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(json?.error ?? `Section service returned HTTP ${res.status}`);
    err.code = 'SECTION_ERROR';
    err.status = res.status;
    throw err;
  }
  return json;
}

/** Proxy GET /:sectionId/search → {backendUrl}/api/search. */
export async function remoteSectionSearch(section, q, viewerLevel, filters = {}, token = null) {
  const data = await remoteFetch(section.backendUrl, '/api/search', {
    token,
    query: {
      q,
      subject: filters.subjectSlug,
      type: filters.blockType,
      section: filters.section,
      access: filters.accessLevel,
      page: filters.page,
      perPage: filters.perPage,
    },
  });
  return {
    sectionId: section.id,
    sectionLabel: section.label,
    totalCount: data.totalCount ?? data.results?.length ?? 0,
    page: data.page ?? filters.page ?? 1,
    totalPages: data.totalPages ?? 1,
    results: (data.results ?? []).map((r) => ({ ...r, sectionId: section.id })),
    recommendations: data.recommendations ?? [],
  };
}

/** Proxy POST /:sectionId/ai/ask → {backendUrl}/api/ai/ask. */
export async function remoteSectionAsk(section, payload, token = null) {
  const data = await remoteFetch(section.backendUrl, '/api/ai/ask', {
    method: 'POST',
    token,
    body: {
      question: payload.question,
      chapterId: payload.chapterId ?? undefined,
      subjectId: payload.subjectId ?? undefined,
    },
  });
  return { sectionId: section.id, sectionLabel: section.label, ...data };
}

/** Proxy GET /quick/questions → {backendUrl}/api/quick/questions. */
export async function remoteSectionQuickQuestions(section, viewerLevel, token = null, { limit = 12 } = {}) {
  const data = await remoteFetch(section.backendUrl, '/api/quick/questions', {
    token,
    query: { limit },
  });
  return data.questions ?? [];
}
