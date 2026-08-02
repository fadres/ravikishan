import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { api, ApiError } from '../api/client.js';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('This reset link is incomplete — open it from your email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password: form.password },
        auth: false,
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
      return res;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That link is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="glass-strong rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <Logo size={52} />
          <h1 className="text-2xl font-extrabold text-white mt-3">Set a new password</h1>
          <p className="text-sm text-slate-400 mt-1">Choose a strong password you have not used before</p>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-4xl mb-3" aria-hidden="true">🔓</p>
            <p className="text-sm text-emerald-300">Password updated — taking you to log in…</p>
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-4 text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className={inputCls}
                />
              </div>
              <button
                disabled={busy}
                className="w-full py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
              >
                {busy ? 'Saving…' : 'Reset password'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-400">
              Back to{' '}
              <Link to="/login" className="text-aqua-300 font-semibold hover:text-aqua-100">
                log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
