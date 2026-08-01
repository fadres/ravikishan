import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, ApiError } from '../api/client.js';

const FALLBACK_CONTACT = 'harindarsah98172@gmail.com';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [contactEmail, setContactEmail] = useState(FALLBACK_CONTACT);

  useEffect(() => {
    api('/api/meta')
      .then((d) => setContactEmail(d.contactEmail || FALLBACK_CONTACT))
      .catch(() => {});
  }, []);

  const next = new URLSearchParams(location.search).get('next');
  const afterLogin = (role) => {
    if (role === 'owner' || role === 'admin') return '/admin';
    return next || '/';
  };

  if (user) {
    navigate(afterLogin(user.role), { replace: true });
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const logged = await login(form.email, form.password);
      navigate(afterLogin(logged.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="text-center mb-5">
        <p className="inline-flex items-center gap-2 text-sm text-slate-300 glass-strong rounded-full px-4 py-2 font-semibold">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          Contact with owner after login
        </p>
      </div>
      <div className="glass-strong rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <Logo size={52} />
          <h1 className="text-2xl font-extrabold text-white mt-3">Ravikishan</h1>
          <p className="text-sm text-slate-400 mt-1">Welcome back — log in to keep studying</p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
              placeholder="••••••••"
            />
          </div>
          <button
            disabled={busy}
            className="w-full py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Contact email:{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="glow-green font-bold text-base"
          >
            {contactEmail}
          </a>
        </p>

        <p className="mt-4 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="text-aqua-300 font-semibold hover:text-aqua-100">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
