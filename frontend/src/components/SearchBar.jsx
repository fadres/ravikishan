import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function SearchBar({ autoFocus = false }) {
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
    navigate(`/class/${r.klass.slug}/subject/${r.subject.slug}/chapter/${r.chapter.slug}`);
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
          placeholder="Search notes… e.g. kinematics, sandhi, mole"
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
              {results.slice(0, 8).map((r) => (
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
                  <span className="min-w-0">
                    <span className="block text-sm text-white font-medium truncate">{r.title}</span>
                    <span className="block text-xs text-slate-400 truncate">
                      {r.subject.name} · {r.chapter.title}
                      {r.locked && ' · reserved'}
                    </span>
                    {r.snippet && <span className="block text-xs text-slate-300 mt-0.5 line-clamp-2">{r.snippet}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

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
