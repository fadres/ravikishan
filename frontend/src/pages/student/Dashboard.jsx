import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { sectionIdFromClassSlug, sectionPath } from '../../lib/sectionLinks.js';

function chapterTo(chapter) {
  return chapter.subject.classSlug
    ? sectionPath(sectionIdFromClassSlug(chapter.subject.classSlug), chapter.subject.slug, chapter.slug)
    : '#';
}

function ProgressBar({ pct, color = 'aqua' }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full bg-${color}-400 transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="glass rounded-2xl p-5" role="region" aria-label={label}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">{label}</span>
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function OwnerIntro() {
  return (
    <div className="relative overflow-hidden glass rounded-2xl p-6 mb-8">
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.5), transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.45), transparent 70%)' }}
      />
      <div className="relative flex flex-wrap gap-2.5 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-aqua-400/40 bg-gradient-to-r from-aqua-400/15 to-aqua-400/5 text-aqua-200 shadow-[0_0_14px_-4px_rgba(56,189,248,0.6)]">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Based on NEB Curriculum
        </span>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-400/40 bg-gradient-to-r from-emerald-400/15 to-emerald-400/5 text-emerald-200 shadow-[0_0_14px_-4px_rgba(52,211,153,0.6)]">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M9 7h7M9 11h5" />
          </svg>
          Approved by CDC
        </span>
      </div>
      <p className="relative text-sm text-slate-300 leading-relaxed max-w-2xl">
        Study Vault curates notes for NEB classes 11 and 12 — every chapter, key formula and solved example in one
        place, so you can prepare for your board exams without hunting across the internet.
      </p>
      <div className="relative mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-400">
          Designed and developed by{' '}
          <span className="glow-gold text-base font-extrabold">Ravikishan</span>
        </p>
        <a
          href="https://www.instagram.com/___unxknown___player"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-aqua-400/40 bg-aqua-400/10 text-aqua-200 text-xs font-bold hover:bg-aqua-400/20 hover:shadow-[0_0_18px_-4px_rgba(56,189,248,0.8)] transition"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <path d="M17.5 6.5h.01" />
          </svg>
          @___unxknown___player
        </a>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [progress, setProgress] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [streak, setStreak] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [pRes, bRes, sRes, aRes] = await Promise.all([
          api('/api/progress'),
          api('/api/progress/bookmarks'),
          api('/api/progress/streak'),
          api('/api/progress/analytics'),
        ]);
        setProgress(pRes.progress || []);
        setBookmarks(bRes.bookmarks || []);
        setStreak(sRes.streak || null);
        setAnalytics(aRes.summary || null);
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">My Dashboard</h1>
        <p className="text-sm text-slate-400 mb-8">Track your learning progress and stay on streak.</p>
        <OwnerIntro />
        <div className="py-16 text-center">
          <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">My Dashboard</h1>
        <p className="text-sm text-slate-400 mb-8">Track your learning progress and stay on streak.</p>
        <OwnerIntro />
        <p className="text-rose-300">{error}</p>
      </div>
    );
  }

  const completedChapters = progress.filter((p) => p.completedAt).length;
  const totalChapters = progress.length;
  const overallPct = totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">My Dashboard</h1>
      <p className="text-sm text-slate-400 mb-8">Track your learning progress and stay on streak.</p>

      <OwnerIntro />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Chapters" value={totalChapters} icon="📚" />
        <StatCard label="Completed" value={completedChapters} icon="✅" />
        <StatCard label="Bookmarks" value={bookmarks.length} icon="🔖" />
        <StatCard label="Current Streak" value={streak?.streak ?? 0} icon="🔥" />
      </div>

      {analytics && (
        <div className="glass rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Learning Analytics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-white">{Math.round((analytics.totalTimeSeconds ?? 0) / 60)}m</p>
              <p className="text-xs text-slate-400">Total Study Time</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{analytics.totalEvents}</p>
              <p className="text-xs text-slate-400">Events Tracked</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{analytics.chaptersVisited}</p>
              <p className="text-xs text-slate-400">Chapters Visited</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{analytics.blocksVisited}</p>
              <p className="text-xs text-slate-400">Blocks Viewed</p>
            </div>
          </div>
        </div>
      )}

      {overallPct > 0 && (
        <div className="glass rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">Overall Progress</h2>
            <span className="text-sm font-bold text-aqua-300">{overallPct}%</span>
          </div>
          <ProgressBar pct={overallPct} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Active Chapters</h2>
          {progress.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center" role="status">
              <p className="text-slate-300">No chapters started yet.</p>
              <Link to="/" className="mt-3 inline-block text-aqua-300 hover:text-aqua-100 text-sm font-bold" tabIndex={0}>
                Browse subjects →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {progress.map((p) => (
                <Link
                  key={p.chapter.id}
                  to={chapterTo(p.chapter)}
                  className="glass rounded-2xl p-4 block hover:border-aqua-400/40 transition focus:outline-none focus:ring-2 focus:ring-aqua-400"
                  tabIndex={0}
                  role="link"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-white text-sm">{p.chapter.title}</h3>
                    <span className="text-xs text-slate-400">
                      {p.blocksCompleted}/{p.totalBlocks} blocks
                    </span>
                  </div>
                  <ProgressBar pct={p.totalBlocks > 0 ? (p.blocksCompleted / p.totalBlocks) * 100 : 0} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Bookmarks</h2>
          {bookmarks.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-slate-300">No bookmarks yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.slice(0, 10).map((b) => (
                <Link
                  key={b.id}
                  to={chapterTo(b.chapter)}
                  className="glass rounded-2xl p-4 block hover:border-aqua-400/40 transition"
                >
                  <h3 className="font-bold text-white text-sm">{b.chapter.title}</h3>
                  {b.label && <p className="text-xs text-slate-400 mt-1">{b.label}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}