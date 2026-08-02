import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { api, ApiError } from '../api/client.js';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="glass-strong rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <Logo size={52} />
          <h1 className="text-2xl font-extrabold text-white mt-3">Forgot password</h1>
          <p className="text-sm text-slate-400 mt-1">We will email you a reset link</p>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-4xl mb-3" aria-hidden="true">📬</p>
            <p className="text-sm text-slate-300">
              If that email is registered, a reset link is on its way. Check your inbox (and spam folder).
            </p>
            <Link to="/login" className="mt-6 inline-block text-sm text-aqua-300 font-semibold hover:text-aqua-100">
              Back to log in
            </Link>
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
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </div>
              <button
                disabled={busy}
                className="w-full py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-400">
              Remembered it?{' '}
              <Link to="/login" className="text-aqua-300 font-semibold hover:text-aqua-100">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
