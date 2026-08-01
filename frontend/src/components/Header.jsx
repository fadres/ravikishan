import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import SearchBar from './SearchBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DAY_KEY = 'rk_streak_started';

function streakDay() {
  const started = parseInt(localStorage.getItem(DAY_KEY) || '0', 10);
  const base = started || Date.now();
  if (!started) localStorage.setItem(DAY_KEY, String(base));
  return Math.max(1, Math.floor((Date.now() - base) / (24 * 60 * 60 * 1000)) + 1);
}

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [day, setDay] = useState(1);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setDay(streakDay());
  }, []);

  // Hide the header while scrolling down, reveal it while scrolling up —
  // gives more room for reading without losing navigation.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y > 120);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const initial = user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'G';

  return (
    <header
      className={`sticky top-0 z-40 transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Warm off-white streak bar */}
      <div className="topbar-warm text-xs sm:text-sm flex items-center justify-between px-3 sm:px-6 py-1.5 shadow-sm">
        <span className="font-medium text-ink flex items-center gap-1.5">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 2c2 3.5 4 5.4 4 8a4 4 0 1 1-8 0c0-2.6 2-4.5 4-8z" />
          </svg>
          Day {day} streak
        </span>
        <span className="text-ink/70 hidden sm:block">
          {user ? `Namaste, ${user.displayName || user.email}` : 'Ravikishan Study Board'}
        </span>
      </div>

      {/* Main bar */}
      <div className="glass-strong border-x-0 border-t-0 flex items-center gap-3 px-3 sm:px-6 py-2.5">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <Logo size={34} />
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none">
            Ravikishan
          </span>
        </Link>

        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                  isActive
                    ? 'bg-aqua-400/20 border-aqua-400/50 text-aqua-100'
                    : 'border-white/15 text-slate-200 hover:bg-white/10'
                }`
              }
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
              </svg>
              Admin
            </NavLink>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-aqua-400/40 bg-aqua-400/10 pl-1 pr-2.5 py-1 hover:bg-aqua-400/20 transition"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-aqua-400 to-deep-700 text-white text-sm font-bold flex items-center justify-center">
                  {initial}
                </span>
                <span className="text-sm font-semibold text-aqua-100 hidden sm:inline max-w-24 truncate">
                  {user.displayName || user.email}
                </span>
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
          ) : (
            <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden glass border-x-0 px-3 py-2">
        <SearchBar />
      </div>
    </header>
  );
}
