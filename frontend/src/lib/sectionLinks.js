// Frontend mirror of the section registry (backend/src/lib/sections.config.js).
// Static entries are the build-time fallback; the live registry is fetched
// from the global backend (GET /api/sections) so independent-service sections
// (backendUrl set) resolve automatically without a redeploy.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const sections = [
  {
    id: 'class-11',
    label: 'Class 11',
    classSlug: 'class-11',
  },
  {
    id: 'class-11e',
    label: 'Class 11E',
    classSlug: 'class-11e',
  },
  {
    id: 'class-12-test',
    label: 'Class 12',
    classSlug: 'class-12',
  },
];

const byId = new Map(sections.map((s) => [s.id, s]));
const byClassSlug = new Map(sections.map((s) => [s.classSlug, s]));

let registryPromise = null;
let backendUrls = new Map();

// Fetch the live section registry once (public endpoint). Never throws —
// a failed fetch leaves the static fallback in place.
function loadRegistry() {
  if (!registryPromise) {
    registryPromise = fetch(`${API_URL}/api/sections`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        for (const s of data?.sections ?? []) {
          byId.set(s.id, { id: s.id, label: s.label, classSlug: s.classSlug });
          byClassSlug.set(s.classSlug, s);
          if (s.backendUrl) backendUrls.set(s.id, s.backendUrl);
        }
      })
      .catch(() => {});
  }
  return registryPromise;
}

export function sectionById(sectionId) {
  return byId.get(sectionId) || { id: sectionId, label: sectionId, classSlug: sectionId };
}

export function sectionFromClassSlug(classSlug) {
  return byClassSlug.get(classSlug) || null;
}

export function sectionIdFromClassSlug(classSlug) {
  return sectionFromClassSlug(classSlug)?.id || classSlug;
}

export function sectionPath(sectionId, subjectSlug, chapterSlug) {
  let path = `/${sectionId}`;
  if (subjectSlug) path += `/subject/${subjectSlug}`;
  if (chapterSlug) path += `/chapter/${chapterSlug}`;
  return path;
}

/**
 * Resolve the section's own backend URL. Returns a Promise<string|null>:
 * null means the section is served by the global backend (Class 11 today);
 * a URL means section-scoped requests must go to that service directly.
 */
export function sectionBackendUrl(sectionId) {
  return loadRegistry().then(() => backendUrls.get(sectionId) ?? null);
}
