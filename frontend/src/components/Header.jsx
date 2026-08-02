import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme, WALLPAPERS } from '../context/ThemeContext.jsx';

const NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/class/class-11', label: 'Subjects', icon: 'book' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
];

const STUDY_LINKS = [
  { to: '/quizzes', label: 'Quizzes', icon: '❓' },
  { to: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { to: '/planner', label: 'Planner', icon: '📅' },
  { to: '/achievements', label: 'Achievements', icon: '🏅' },
  { to: '/ai-tools', label: 'AI tools', icon: '🤖' },
];

function NavIcon({ name }) {
  const common = { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    case 'book':
      return <svg {...common}><path d="M4 5a4 4 0 0 1 4-4h12v20H8a4 4 0 0 0-4 4z" /><path d="M20 17H8a4 4 0 0 0-4 4" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case 'dashboard':
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    default:
      return null;
  }
}

function WallpaperPreview({ id }) {
  const common = { viewBox: '0 0 28 20', width: 28, height: 20, fill: 'none', className: 'absolute inset-0 w-full h-full' };
  switch (id) {
    case 'mountain':
      return (
        <svg {...common}>
          <circle cx="21" cy="6" r="2.6" fill="#fbbf24" opacity="0.7" />
          <polygon points="0,20 8,9 15,20" fill="#0a2447" />
          <polygon points="11,20 20,5 28,20" fill="#123d75" />
        </svg>
      );
    case 'ocean':
      return (
        <svg {...common}>
          <circle cx="21" cy="7" r="2.4" fill="#38bdf8" opacity="0.6" />
          <path d="M0,12 Q5,10 10,12 T20,12 T28,12 V20 H0 Z" fill="#0a2447" />
          <path d="M0,15 Q5,13 10,15 T20,15 T28,15 V20 H0 Z" fill="#123d75" />
        </svg>
      );
    case 'forest':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.6" fill="#fb923c" opacity="0.6" />
          <polygon points="3,20 8,10 13,20" fill="#0a2447" />
          <polygon points="9,20 15,7 21,20" fill="#0e3060" />
          <polygon points="17,20 22,11 27,20" fill="#0a2447" />
        </svg>
      );
    case 'sunset':
      return (
        <svg {...common}>
          <circle cx="14" cy="9" r="3.4" fill="#fb923c" opacity="0.7" />
          <path d="M0,14 H28 V20 H0 Z" fill="#0e3060" />
          <path d="M0,16 H28 V20 H0 Z" fill="#123d75" />
        </svg>
      );
    case 'river':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.2" fill="#fbbf24" opacity="0.7" />
          <path d="M15,2 C12,8 18,13 14,20 H21 C17,13 23,8 18,2 Z" fill="#38bdf8" opacity="0.6" />
          <polygon points="0,20 5,12 10,20" fill="#0a2447" />
          <polygon points="18,20 24,10 28,20" fill="#0a2447" />
        </svg>
      );
    case 'waterfall':
      return (
        <svg {...common}>
          <path d="M0,6 H12 V20 H0 Z" fill="#0a2447" />
          <path d="M3,6 C4,9 2,11 3.5,14 L4.5,20 H9 C8,14 9.5,11 8.5,6 Z" fill="#38bdf8" opacity="0.6" />
          <ellipse cx="8" cy="18.5" rx="8" ry="2.2" fill="#38bdf8" opacity="0.5" />
          <polygon points="15,6 18,2 21,6" fill="#0e3060" />
        </svg>
      );
    case 'meadow':
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2.4" fill="#fbbf24" opacity="0.6" />
          <path d="M0,14 Q8,11 16,14 T28,14 V20 H0 Z" fill="#0e3060" />
          <path d="M9,14 v4" stroke="#34d399" strokeWidth="1.2" />
          <circle cx="9" cy="13" r="1.4" fill="#f472b6" />
          <path d="M20,15 v4" stroke="#34d399" strokeWidth="1.2" />
          <circle cx="20" cy="14" r="1.4" fill="#fbbf24" />
        </svg>
      );
    case 'aurora':
      return (
        <svg {...common}>
          <path d="M0,6 C6,1 11,8 17,4 C22,1 25,7 28,4 V20 H0 Z" fill="#34d399" opacity="0.2" />
          <path d="M0,10 C8,4 13,11 20,7 C24,5 26,9 28,7 V20 H0 Z" fill="#22d3ee" opacity="0.15" />
          <polygon points="0,20 8,14 15,20" fill="#0a2447" />
          <polygon points="11,20 20,12 28,20" fill="#071a33" />
        </svg>
      );
    case 'night':
      return (
        <svg {...common}>
          <circle cx="22" cy="5" r="2.6" fill="#e2e8f0" opacity="0.85" />
          <polygon points="0,20 8,13 16,20" fill="#071a33" />
          <polygon points="10,20 20,11 28,20" fill="#0a2447" />
          <rect x="16.5" y="10" width="4" height="4.5" fill="#0e3060" />
          <rect x="17.5" y="12" width="1" height="1.2" fill="#fbbf24" />
        </svg>
      );
    default:
      return <svg {...common}><path d="M6 5l16 10M22 5L6 15" stroke="#64748b" strokeWidth="2" /></svg>;
  }
}

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, themes, setTheme, cycle, wallpaper, setWallpaper } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [classes, setClasses] = useState([]);
  const [studyOpen, setStudyOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const themeRef = useRef(null);
  const subjectsRef = useRef(null);
  const studyRef = useRef(null);

  useEffect(() => {
    const clickAway = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (subjectsRef.current && !subjectsRef.current.contains(e.target)) setSubjectsOpen(false);
      if (studyRef.current && !studyRef.current.contains(e.target)) setStudyOpen(false);
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  useEffect(() => {
    api('/api/classes')
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const res = await api('/api/notifications?limit=1');
        if (!cancelled) setUnread(res.unreadCount || 0);
      } catch {
        // ignore — badge is best-effort
      }
    }
    poll();
    const t = setInterval(poll, 60_000);
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const initial = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'G';

  const navItem = ({ to, label, icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition ${
          isActive
            ? 'text-white nav-pill'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <NavIcon name={icon} />
      {label}
    </NavLink>
  );

  const subjectList = (klass) => klass.subjects.map((s) => (
    <Link
      key={s.id}
      to={`/class/${klass.slug}/subject/${s.slug}`}
      onClick={() => setSubjectsOpen(false)}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition"
    >
      <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
        style={{ background: `${s.themeColor || '#38bdf8'}22`, color: s.themeColor || '#38bdf8' }}>
        {s.name.slice(0, 2)}
      </span>
      <span className="truncate">{s.name}</span>
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 shadow-lg">
      {/* Main bar */}
      <div className="header-solid border-b border-white/10 flex items-center gap-3 px-3 sm:px-6 py-2.5 relative">
        {/* Motivational fire — small centered motto */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden lg:flex items-center justify-center gap-1.5 text-[11px] italic tracking-widest text-slate-400"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c2.5 4.5 5 6.5 5 10a5 5 0 1 1-10 0c0-3.5 2.5-5.5 5-10z" />
            <path d="M12 15c1.5 0 3-1 3-2.5 0-1.5-1.5-2.5-3-4.5-1.5 2-3 3-3 4.5C9 14 10.5 15 12 15z" fill="currentColor" stroke="none" />
          </svg>
          Keep the fire burning
        </span>
        {/* Brand tile — premium R */}
        <Link to="/" className="shrink-0 group" aria-label="Ravikishan home">
          <span className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-deep-700 via-deep-600 to-aqua-500 flex items-center justify-center ring-1 ring-white/25 shadow-[0_0_22px_-4px_#7dd3fc] group-hover:shadow-[0_0_30px_-4px_#fbbf24] transition">
            <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
              <defs>
                <linearGradient id="rkR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fde68a" />
                  <stop offset="0.55" stopColor="#fbbf24" />
                  <stop offset="1" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <text
                x="12"
                y="17.6"
                textAnchor="middle"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="17"
                fontWeight="800"
                fill="url(#rkR)"
              >
                R
              </text>
            </svg>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {navItem(NAV[0])}
          <div className="relative" ref={subjectsRef}>
            <button
              onClick={() => setSubjectsOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <NavIcon name="book" />
              Subjects
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" className={subjectsOpen ? 'rotate-180 transition' : 'transition'}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {subjectsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSubjectsOpen(false)} />
                <div className="absolute left-0 mt-2 w-64 glass-strong rounded-2xl p-2 z-50 shadow-2xl">
                  {classes.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-400">Loading subjects…</p>
                  )}
                  {classes.map((klass) => (
                    <div key={klass.id} className={klass !== classes[0] ? 'mt-1 pt-1 border-t border-white/10' : ''}>
                      <p className="px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-aqua-300 font-bold">
                        {klass.name}
                      </p>
                      {subjectList(klass)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative" ref={studyRef}>
            <button
              onClick={() => setStudyOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <span aria-hidden="true">🎓</span>
              Study
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" className={studyOpen ? 'rotate-180 transition' : 'transition'}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {studyOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStudyOpen(false)} />
                <div className="absolute left-0 mt-2 w-56 glass-strong rounded-2xl p-2 z-50 shadow-2xl">
                  {STUDY_LINKS.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setStudyOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition"
                    >
                      <span aria-hidden="true">{l.icon}</span>
                      {l.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Desktop search */}
        <div className="hidden md:block w-56 xl:w-72 shrink-0 ml-auto">
          <SearchBar placeholder="Search subjects, chapters or topics…" />
        </div>

        {/* Theme picker */}
        <div className="relative shrink-0" ref={themeRef}>
          <button
            onClick={() => setThemeOpen((o) => !o)}
            aria-label="Change theme"
            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 text-slate-200 hover:bg-white/10 hover:text-white transition"
            style={{ background: `conic-gradient(${theme.aqua300}, ${theme.aqua400}, ${theme.aqua100}, ${theme.aqua300})` }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0b1c33" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" fill="#fff" stroke="#0b1c33" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
            </svg>
          </button>

          {themeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 glass-strong rounded-2xl p-3 z-50 shadow-2xl">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-aqua-300">
                    Theme · {theme.name}
                  </p>
                  <button
                    onClick={cycle}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-aqua-400/15 text-aqua-300 hover:bg-aqua-400/25 transition"
                  >
                    Shuffle
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                  {themes.map((t) => {
                    const activeTheme = t.id === theme.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                        className={`flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 border transition ${
                          activeTheme
                            ? 'border-aqua-400/70 bg-aqua-400/10'
                            : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                        }`}
                      >
                        <span
                          className="w-7 h-7 rounded-full border border-white/20"
                          style={{ background: `linear-gradient(135deg, ${t.aqua400}, ${t.deep800} 80%)` }}
                        />
                        <span className="text-[9px] leading-tight text-slate-300 text-center line-clamp-2">
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between px-1 mt-3 mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-aqua-300">Wallpaper</p>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {WALLPAPERS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setWallpaper(w.id)}
                      title={w.name}
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 border transition ${
                        wallpaper === w.id
                          ? 'border-aqua-400/70 bg-aqua-400/10'
                          : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg overflow-hidden border border-white/20 relative bg-gradient-to-b from-deep-700 to-deep-900">
                        <WallpaperPreview id={w.id} />
                      </span>
                      <span className="text-[9px] text-slate-300">{w.name}</span>
                    </button>
                  ))}
                </div>
                <p className="px-1 mt-2 text-[10px] text-slate-500">
                  Static nature scenery — no animations, battery friendly.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Log in / Join — only when logged out */}
        {!user && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-200 hover:bg-white/10 border border-white/15 transition"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-aqua-400 to-aqua-300 text-deep-900 hover:brightness-110 transition"
            >
              Join
            </Link>
          </div>
        )}

        {/* Logged-in avatar menu */}
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/notifications"
              className="relative w-9 h-9 rounded-full flex items-center justify-center border border-white/15 text-slate-200 hover:bg-white/10 transition"
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 pl-1 pr-2 py-1 hover:bg-white/10 transition"
                aria-label="Account menu"
              >
                <span className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm font-bold flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initial
                  )}
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-pink-400 ring-2 ring-deep-900" />
                </span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-slate-300">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 glass-strong rounded-xl p-2 z-50 shadow-xl">
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Student'}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-aqua-400/15 text-aqua-300 font-bold">
                        {user.role}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10"
                    >
                      My profile
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate('/admin');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10"
                      >
                        Owner panel
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-300 hover:bg-rose-400/10"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile nav toggle */}
        <button
          onClick={() => setMobileNav((o) => !o)}
          aria-label="Menu"
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center border border-white/15 text-slate-200 hover:bg-white/10 transition"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {mobileNav ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile search */}
      <div className="md:hidden header-solid border-b border-white/10 px-3 py-2">
        <SearchBar placeholder="Search subjects, chapters or topics…" />
      </div>

      {/* Mobile nav */}
      {mobileNav && (
        <nav className="lg:hidden header-solid border-b border-white/10 px-3 py-3 flex flex-col gap-1" aria-label="Mobile navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileNav(false)}
              className={({ isActive }) =>
                `inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'text-white nav-pill'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
          <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-aqua-300 font-bold">
            Study tools
          </p>
          {STUDY_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileNav(false)}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/10"
            >
              <span aria-hidden="true">{l.icon}</span>
              {l.label}
            </Link>
          ))}
          {classes.map((klass) => (
            <div key={klass.id}>
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-aqua-300 font-bold">
                {klass.name}
              </p>
              {klass.subjects.map((s) => (
                <Link
                  key={s.id}
                  to={`/class/${klass.slug}/subject/${s.slug}`}
                  onClick={() => setMobileNav(false)}
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/10"
                >
                  <span className="text-[11px] font-bold"
                    style={{ color: s.themeColor || '#38bdf8' }}>
                    {s.name.slice(0, 2)}
                  </span>
                  {s.name}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
