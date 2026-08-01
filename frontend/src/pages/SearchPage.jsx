import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { TypeBadge, AccessBadge, typeMeta } from '../utils/blockMeta.jsx';

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

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState(0);

  useEffect(() => {
    const q = params.get('q') || '';
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setRecommendations([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
        setResults(data.results);
        setRecommendations(data.recommendations);
        setSearched(true);
      } catch {
        setError('Search failed — please try again.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [params]);

  const submit = (e) => {
    e.preventDefault();
    setParams({ q: query.trim() });
  };

  // Filter options derived from the live result set.
  const subjectOptions = useMemo(() => {
    const seen = new Map();
    for (const r of results) {
      if (!seen.has(r.subject.slug)) seen.set(r.subject.slug, r.subject.name);
    }
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [results]);

  const typeOptions = useMemo(() => {
    const seen = new Set();
    for (const r of results) seen.add(r.blockType);
    return [...seen].map((t) => ({ value: t, label: typeMeta(t).label }));
  }, [results]);

  const filtered = results.filter(
    (r) =>
      (!subjectFilter || r.subject.slug === subjectFilter) &&
      (!typeFilter || r.blockType === typeFilter) &&
      (!accessFilter || r.accessLevel === accessFilter),
  );

  // Group results by subject, preserving rank order.
  const groups = [];
  const groupMap = new Map();
  for (const r of filtered) {
    const key = r.subject.slug;
    if (!groupMap.has(key)) {
      const g = { key, name: r.subject.name, color: SUBJECT_COLORS[r.subject.slug] || '#7dd3fc', items: [] };
      groupMap.set(key, g);
      groups.push(g);
    }
    groupMap.get(key).items.push(r);
  }

  const anyFilter = Boolean(subjectFilter || typeFilter || accessFilter);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Search notes</h1>
      <p className="text-sm text-slate-400 mb-6">Ranked full-text search across every chapter.</p>

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
      </form>

      {loading && (
        <div className="py-10 text-center">
          <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
        </div>
      )}

      {error && <p className="text-rose-300 text-sm">{error}</p>}

      {!loading && searched && !error && (
        <>
          {results.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <p className="text-slate-200 font-semibold mb-1">No direct matches for "{params.get('q')}"</p>
              <p className="text-sm text-slate-400">Here are some recommended topics instead:</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-4">
                {filtered.length} of {results.length} result{results.length === 1 ? '' : 's'} for "
                <span className="text-aqua-300 font-semibold">{params.get('q')}</span>"
              </p>

              {/* Powerful filters */}
              <div className="glass rounded-2xl p-4 mb-6 space-y-3">
                {subjectOptions.length > 1 && (
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1.5 w-14 shrink-0">
                      Subject
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <FilterChip
                        active={!subjectFilter}
                        onClick={() => setSubjectFilter('')}
                      >
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
              </div>
            </>
          )}

          {anyFilter && filtered.length === 0 && results.length > 0 && (
            <div className="glass rounded-2xl p-8 text-center mb-6">
              <p className="text-slate-200 font-semibold">Nothing matches these filters.</p>
              <button
                onClick={() => {
                  setSubjectFilter('');
                  setTypeFilter('');
                  setAccessFilter(0);
                }}
                className="mt-3 text-sm font-bold text-aqua-300 hover:text-aqua-100 transition"
              >
                Clear all filters
              </button>
            </div>
          )}

          {groups.map((g) => (
            <section key={g.key} className="mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: g.color }}>
                {g.name}
              </h2>
              <div className="space-y-2.5">
                {g.items.map((r) => (
                  <Link
                    key={r.id}
                    to={`/class/${r.klass.slug}/subject/${r.subject.slug}/chapter/${r.chapter.slug}`}
                    className="glass rounded-2xl px-5 py-4 block hover:border-aqua-400/40 hover:bg-white/8 transition"
                    style={{ borderLeft: `3px solid ${g.color}` }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white">{r.title}</h3>
                      {r.accessLevel && <AccessBadge accessLevel={r.accessLevel} />}
                      <span className="ml-auto">
                        <TypeBadge blockType={r.blockType} />
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {r.chapter.title} · {r.klass.name}
                    </p>
                    {r.snippet && <p className="text-sm text-slate-300 mt-2 leading-relaxed">{r.snippet}</p>}
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
                    to={`/class/${r.klass.slug}/subject/${r.subject.slug}/chapter/${r.chapter.slug}`}
                    className="text-sm px-3.5 py-2 rounded-full glass text-slate-200 hover:bg-aqua-400/15 hover:text-aqua-100 transition"
                  >
                    {r.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
