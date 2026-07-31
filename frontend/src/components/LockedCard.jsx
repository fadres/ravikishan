import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/client.js';

// Friendly card shown instead of locked content.
export default function LockedCard({ subjectName, themeColor = '#38bdf8' }) {
  const { user, requestAccess } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await requestAccess({
        displayName: form.displayName || undefined,
        email: form.email || undefined,
        message: form.message,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.');
    }
  };

  return (
    <div
      className="glass rounded-2xl p-8 sm:p-10 text-center max-w-xl mx-auto"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.08), 0 0 40px -12px ${themeColor}55` }}
    >
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4"
        style={{ background: `linear-gradient(135deg, ${themeColor}33, ${themeColor}11)`, border: `1px solid ${themeColor}66` }}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={themeColor} strokeWidth="2">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">This content is reserved</h3>
      <p className="text-slate-300 text-sm mb-6 max-w-sm mx-auto">
        The <span className="font-semibold" style={{ color: themeColor }}>{subjectName}</span> notes are curated
        exclusively. Contact the owner for access.
      </p>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          Request access
        </button>
      )}

      {open && status !== 'success' && (
        <form onSubmit={submit} className="text-left space-y-3">
          {!user && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email address"
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
                />
              </div>
            </>
          )}
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="A short message — e.g. which subject you need and why…"
            required
            minLength={5}
            rows={3}
            className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60 resize-none"
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button
              disabled={status === 'sending'}
              className="px-5 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
            >
              {status === 'sending' ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#34d399" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-emerald-300 font-semibold">Request sent!</p>
          <p className="text-sm text-slate-300">
            The owner reviews every request personally. You'll hear back soon.
          </p>
        </div>
      )}
    </div>
  );
}
