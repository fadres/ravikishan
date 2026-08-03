import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { TypeBadge } from '../utils/blockMeta.jsx';

const SUBJECT_COLORS = {
  physics: '#38bdf8',
  chemistry: '#34d399',
  biology: '#f472b6',
  mathematics: '#fb923c',
  english: '#60a5fa',
  nepali: '#a78bfa',
  loksewa: '#f59e0b',
  'general-knowledge': '#22d3ee',
};

export default function SearchBar({ autoFocus = false, placeholder = 'Search subjects, chapters or topics…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const clickAway = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setRecommendations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
        setResults(data.results);
        setRecommendations(data.recommendations);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [query]);

  const goTo = (r) => {
    setOpen(false);
    if (r.kind === 'subject') {
      navigate(`/class/${r.klass.slug}/subject/${r.subject.slug}`);
    } else {
      navigate(`/class/${r.klass.slug}/subject/${r.subject.slug}/chapter/${r.chapter.slug}`);
    }
  };

  const breadcrumb = (r) => {
    const parts = [];
    if (r.kind !== 'subject' && r.subject && r.subject.name) parts.push(r.subject.name);
    if (r.chapter && r.chapter.title) parts.push(r.chapter.title);
    return parts.join(' · ');
  };

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="relative w-full" ref={boxRef}>
      <form onSubmit={submit} className="relative">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results.length || recommendations.length) && setOpen(true)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full rounded-full bg-white/15 border border-white/20 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60 focus:bg-white/20 transition"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin" />
        )}
      </form>

      {open && (results.length > 0 || recommendations.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 glass-strong rounded-2xl overflow-hidden shadow-2xl z-50">
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {results.slice(0, 10).map((r) => (
                <button
                  key={r.id}
                  onClick={() => goTo(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 flex items-start gap-2.5 transition"
                >
                  {r.locked ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 text-amber-400 shrink-0">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 text-aqua-400 shrink-0">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="block text-sm text-white font-medium truncate">{r.title}</span>
                      <TypeBadge blockType={r.blockType} className="shrink-0" />
                    </span>
                    <span className="block text-xs text-slate-400 truncate">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                        style={{ background: SUBJECT_COLORS[r.subject.slug] || '#38bdf8' }}
                      />
                      {breadcrumb(r)}
                      {r.locked && ' · reserved'}
                    </span>
                    {r.snippet && <span className="block text-xs text-slate-300 mt-0.5 line-clamp-2">{r.snippet}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={submit}
            className="w-full text-center px-4 py-2.5 border-t border-white/10 text-xs font-bold text-aqua-300 hover:bg-aqua-400/10 transition"
          >
            View all results for "{query.trim()}" →
          </button>

          {recommendations.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-aqua-300 font-bold mb-1.5">
                Recommended topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recommendations.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => goTo(r)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-200 hover:bg-aqua-400/20 hover:text-aqua-100 transition"
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
