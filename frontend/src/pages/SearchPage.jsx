import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { TypeBadge, AccessBadge, typeMeta } from '../utils/blockMeta.jsx';
import { sectionStyleForKey } from '../lib/noteStructure.js';
import { sectionIdFromClassSlug, sectionPath } from '../lib/sectionLinks.js';
import { searchTokens, highlight } from '../utils/searchHighlight.jsx';

const SUBJECT_COLORS = {
  physics: '#38bdf8',
  chemistry: '#34d399',
  mathematics: '#a78bfa',
  biology: '#2dd4bf',
  english: '#fbbf24',
  nepali: '#fb7185',
  loksewa: '#f59e0b',
  'general-knowledge': '#22d3ee',
};

const ACCESS_OPTIONS = [
  { value: 0, label: 'All access' },
  { value: 3, label: 'Free' },
  { value: 2, label: 'Members' },
  { value: 1, label: 'Premium' },
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'easy', label: 'Easy', color: '#34d399' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'hard', label: 'Hard', color: '#fb7185' },
  { value: 'expert', label: 'Expert', color: '#f472b6' },
];

function FilterChip({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
        active
          ? 'text-white border-transparent'
          : 'border-white/15 text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
      style={
        active && color
          ? { background: `${color}33`, borderColor: `${color}88`, boxShadow: `0 0 14px -6px ${color}` }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function resultPath(r) {
  const sectionId = r.sectionId || sectionIdFromClassSlug(r.klass?.slug);
  if (r.kind === 'subject') return sectionPath(sectionId, r.subject.slug);
  const base = sectionPath(sectionId, r.subject.slug, r.chapter.slug);
  if (r.kind === 'block' && r.id) return `${base}?block=${encodeURIComponent(r.id)}`;
  return base;
}

function resultBreadcrumb(r) {
  const parts = [];
  if (r.kind !== 'subject' && r.subject.name) parts.push(r.subject.name);
  if (r.chapter.title) parts.push(r.chapter.title);
  if (r.klass.name) parts.push(r.klass.name);
  return parts.join(' · ');
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  // Filters live client-side: chips react instantly on the loaded results,
  // no server round trip per click.
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState(0);
  const [sectionFilter, setSectionFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => {
    const q = params.get('q') || '';
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setRecommendations([]);
      setSuggestions([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const p = params.get('page') || '1';
        const url = new URL('/api/search', window.location.origin);
        url.searchParams.set('q', q);
        url.searchParams.set('page', p);
        url.searchParams.set('perPage', '25');
        const data = await api(url.pathname + url.search);
        setResults(data.results);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setPage(data.page);
        setRecommendations(data.recommendations);
        setSuggestions(data.suggestions || []);
        setSearched(true);
      } catch {
        setError('Search failed — please try again.');
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [params]);

  const submit = (e) => {
    e.preventDefault();
    setParams({ q: query.trim(), page: '1' });
  };

  // Instant client-side filtering over the loaded page.
  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (subjectFilter && r.subject.slug !== subjectFilter) return false;
      if (typeFilter && r.blockType !== typeFilter) return false;
      if (accessFilter && (r.accessLevel ?? 3) < accessFilter) return false;
      if (sectionFilter && (r.sectionKey ?? '') !== sectionFilter) return false;
      if (difficultyFilter && r.difficulty && r.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [results, subjectFilter, typeFilter, accessFilter, sectionFilter, difficultyFilter]);

  const sectionOptions = useMemo(() => {
    const seen = new Set();
    for (const r of filtered) {
      if (r.sectionKey) seen.add(r.sectionKey);
    }
    return [...seen].map((key) => ({ key, ...sectionStyleForKey(key) }));
  }, [filtered]);

  const subjectOptions = useMemo(() => {
    const seen = new Map();
    for (const r of filtered) {
      if (!seen.has(r.subject.slug)) seen.set(r.subject.slug, r.subject.name);
    }
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [filtered]);

  const typeOptions = useMemo(() => {
    const seen = new Set();
    for (const r of filtered) seen.add(r.blockType);
    return [...seen].map((t) => ({ value: t, label: typeMeta(t).label }));
  }, [filtered]);

  // Group filtered results by subject, preserving rank order.
  const groups = [];
  const groupMap = new Map();
  for (const r of filtered) {
    const key = r.subject.slug || 'other';
    if (!groupMap.has(key)) {
      const g = { key, name: r.subject.name || 'Notes', color: SUBJECT_COLORS[r.subject.slug] || '#7dd3fc', items: [] };
      groupMap.set(key, g);
      groups.push(g);
    }
    groupMap.get(key).items.push(r);
  }

  const tokens = searchTokens(query);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Search notes</h1>
      <p className="text-sm text-slate-400 mb-6">
        Ranked full-text search across every chapter, topic and subject.
      </p>

      <form onSubmit={submit} className="relative mb-8">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Try: kinematics, sandhi, mole, selfish giant…"
          className="w-full rounded-2xl bg-white/10 border border-white/15 pl-11 pr-4 py-3 text-base text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60 focus:bg-white/15 transition"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin" />
        )}
      </form>

      {error && <p className="text-rose-300 text-sm mb-4">{error}</p>}

      {!error && searched && (
        <>
          <p className="text-sm text-slate-400 mb-4">
            {totalCount} result{totalCount === 1 ? '' : 's'} for "
            <span className="text-aqua-300 font-semibold">{params.get('q')}</span>"
            {filtered.length !== totalCount && filtered.length > 0 && (
              <span className="text-slate-500"> — showing {filtered.length} on this page</span>
            )}
            {page > 1 && ` — page ${page} of ${totalPages}`}
          </p>

          {(results.length > 0 || subjectOptions.length > 0) && (
            <div className="glass rounded-2xl p-4 mb-6 space-y-3">
              {subjectOptions.length > 1 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1.5 w-14 shrink-0">
                    Subject
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={!subjectFilter} onClick={() => setSubjectFilter('')}>
                      All
                    </FilterChip>
                    {subjectOptions.map((s) => (
                      <FilterChip
                        key={s.slug}
                        active={subjectFilter === s.slug}
                        color={SUBJECT_COLORS[s.slug]}
                        onClick={() => setSubjectFilter(subjectFilter === s.slug ? '' : s.slug)}
                      >
                        {s.name}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              )}

              {typeOptions.length > 1 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1.5 w-14 shrink-0">
                    Type
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={!typeFilter} onClick={() => setTypeFilter('')}>
                      All
                    </FilterChip>
                    {typeOptions.map((t) => (
                      <FilterChip
                        key={t.value}
                        active={typeFilter === t.value}
                        color={typeMeta(t.value).color}
                        onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
                      >
                        {t.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              )}

              {sectionOptions.length > 1 && (
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1.5 w-14 shrink-0">
                    Section
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={!sectionFilter} onClick={() => setSectionFilter('')}>
                      All
                    </FilterChip>
                    {sectionOptions.map((s) => (
                      <FilterChip
                        key={s.key}
                        active={sectionFilter === s.key}
                        color={s.color}
                        onClick={() => setSectionFilter(sectionFilter === s.key ? '' : s.key)}
                      >
                        {s.label}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1.5 w-14 shrink-0">
                  Access
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ACCESS_OPTIONS.map((a) => (
                    <FilterChip
                      key={a.value}
                      active={accessFilter === a.value}
                      color={a.value === 1 ? '#fbbf24' : a.value === 2 ? '#7dd3fc' : '#34d399'}
                      onClick={() => setAccessFilter(accessFilter === a.value ? 0 : a.value)}
                    >
                      {a.label}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1.5 w-14 shrink-0">
                  Level
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <FilterChip
                      key={d.value || 'all'}
                      active={difficultyFilter === d.value}
                      color={d.color}
                      onClick={() => setDifficultyFilter(difficultyFilter === d.value ? '' : d.value)}
                    >
                      {d.label}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {suggestions.length > 0 && filtered.length < 3 && (
            <div className="glass rounded-2xl px-4 py-3 mb-5 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-300 font-semibold">Did you mean:</span>
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => setParams({ q: s.text, page: '1' })}
                  className="text-sm font-bold px-3 py-1 rounded-full bg-aqua-400/10 border border-aqua-400/40 text-aqua-200 hover:bg-aqua-400/25 hover:text-aqua-50 transition"
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              {subjectFilter || typeFilter || accessFilter ? (
                <>
                  <p className="text-slate-200 font-semibold mb-1">No results match the current filters.</p>
                  <button
                    onClick={() => {
                      setSubjectFilter('');
                      setTypeFilter('');
                      setAccessFilter(0);
                      setSectionFilter('');
                      setDifficultyFilter('');
                    }}
                    className="mt-3 text-sm font-bold text-aqua-300 hover:text-aqua-100 transition"
                  >
                    Clear all filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-200 font-semibold mb-1">No direct matches for "{params.get('q')}"</p>
                  <p className="text-sm text-slate-400">Here are some recommended topics instead:</p>
                </>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {groups.map((g) => (
                <section key={g.key} className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: g.color }}>
                    {g.name}
                  </h2>
                  <div className="space-y-2.5">
                    {g.items.map((r) => (
                      <Link
                        key={r.kind + '-' + r.id}
                        to={resultPath(r)}
                        className="glass rounded-2xl px-5 py-4 block hover:border-aqua-400/40 hover:bg-white/8 transition"
                        style={{ borderLeft: `3px solid ${g.color}` }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white">{highlight(r.title, tokens)}</h3>
                          {r.accessLevel && <AccessBadge accessLevel={r.accessLevel} />}
                          {r.sectionKey && (
                            <span
                              className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                              style={{ color: sectionStyleForKey(r.sectionKey).color, background: `${sectionStyleForKey(r.sectionKey).color}1a`, border: `1px solid ${sectionStyleForKey(r.sectionKey).color}44` }}
                            >
                              {sectionStyleForKey(r.sectionKey).label}
                            </span>
                          )}
                          <span className="ml-auto">
                            <TypeBadge blockType={r.blockType} />
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{resultBreadcrumb(r)}</p>
                        {r.snippet && <p className="text-sm text-slate-300 mt-2 leading-relaxed">{highlight(r.snippet, tokens)}</p>}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}

              {recommendations.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">
                    You might also find these helpful
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((r) => (
                      <Link
                        key={r.id}
                        to={resultPath(r)}
                        className="text-sm px-3.5 py-2 rounded-full glass text-slate-200 hover:bg-aqua-400/15 hover:text-aqua-100 transition"
                      >
                        {r.title}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Search pagination">
                  <button
                    onClick={() => {
                      const p = Math.max(1, page - 1);
                      setParams({ q: query, page: String(p) });
                    }}
                    disabled={page <= 1}
                    className="px-4 py-2 rounded-xl glass text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-slate-400 px-3">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const p = Math.min(totalPages, page + 1);
                      setParams({ q: query, page: String(p) });
                    }}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-xl glass text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
