import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = params.get('token') || '';
  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || status !== 'verifying') return;
    let active = true;
    (async () => {
      try {
        await api('/api/auth/verify-email', { method: 'POST', body: { token } });
        if (!active) return;
        setStatus('success');
        setMessage('Your email has been verified. Happy studying!');
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage(err instanceof ApiError ? err.message : 'That link is invalid or has expired.');
      }
    })();
    return () => {
      active = false;
    };
  }, [token, status]);

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="glass-strong rounded-3xl p-8 shadow-2xl text-center">
        <div className="flex flex-col items-center mb-6">
          <Logo size={52} />
          <h1 className="text-2xl font-extrabold text-white mt-3">Email verification</h1>
        </div>

        {status === 'verifying' && (
          <>
            <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
            <p className="mt-4 text-sm text-slate-400" role="status">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="text-4xl mb-3" aria-hidden="true">✅</p>
            <p className="text-sm text-emerald-300">{message}</p>
            <button
              onClick={() => navigate(user ? '/profile' : '/login', { replace: true })}
              className="mt-6 w-full py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
            >
              {user ? 'Go to my profile' : 'Log in'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-4xl mb-3" aria-hidden="true">⚠️</p>
            <p className="text-sm text-rose-300">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm text-aqua-300 font-semibold hover:text-aqua-100"
            >
              Back to log in
            </Link>
          </>
        )}

        {status === 'idle' && (
          <>
            <p className="text-sm text-slate-400">
              Open the verification link from your email to confirm your address. No link?
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm text-aqua-300 font-semibold hover:text-aqua-100"
            >
              Log in and resend it
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
