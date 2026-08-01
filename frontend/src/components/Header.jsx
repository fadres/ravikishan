import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/class/class-11', label: 'Subjects', icon: 'book' },
];

function NavIcon({ name }) {
  const common = { viewBox: '0 0 24 24', width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    case 'book':
      return <svg {...common}><path d="M4 5a4 4 0 0 1 4-4h12v20H8a4 4 0 0 0-4 4z" /><path d="M20 17H8a4 4 0 0 0-4 4" /></svg>;
    case 'doc':
      return <svg {...common}><path d="M6 2h9l5 5v15H6z" /><path d="M15 2v5h5" /><path d="M9 13h6M9 17h6" /></svg>;
    default:
      return null;
  }
}

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, themes, setTheme, cycle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [classes, setClasses] = useState([]);
  const themeRef = useRef(null);
  const subjectsRef = useRef(null);

  useEffect(() => {
    const clickAway = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (subjectsRef.current && !subjectsRef.current.contains(e.target)) setSubjectsOpen(false);
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  useEffect(() => {
    api('/api/classes')
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  }, []);

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
      <div className="header-solid border-b border-white/10 flex items-center gap-3 px-3 sm:px-6 py-2.5">
        {/* Brand tile */}
        <Link to="/" className="shrink-0" aria-label="Ravikishan home">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_-4px_#8b5cf6]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6c-2.5-2.5-6.5-2.5-9-1v14c2.5-1.5 6.5-1.5 9 1 2.5-2.5 6.5-2.5 9-1V5c-2.5-1.5-6.5-1.5-9 1z" />
              <path d="M12 6v14" />
            </svg>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
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
          {navItem(NAV[2])}
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
              </div>
            </>
          )}
        </div>

        {/* Log in / Join — always visible */}
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

          {/* Logged-in avatar menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 pl-1 pr-2 py-1 hover:bg-white/10 transition"
                aria-label="Account menu"
              >
                <span className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm font-bold flex items-center justify-center">
                  {initial}
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
      </div>

      {/* Mobile search */}
      <div className="md:hidden header-solid border-b border-white/10 px-3 py-2">
        <SearchBar placeholder="Search subjects, chapters or topics…" />
      </div>

      {/* Mobile nav */}
      {mobileNav && (
        <nav className="lg:hidden header-solid border-b border-white/10 px-3 py-3 flex flex-col gap-1">
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
