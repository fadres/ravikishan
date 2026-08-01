import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api, ApiError } from '../api/client.js';

const LEVEL_LABELS = { 1: 'Premium', 2: 'Members', 3: 'Free' };

// Compact locked card for a single premium block: title stays visible, the
// content is replaced by a "request access" prompt with the owner's contact.
export default function LockedBlockCard({ block, themeColor = '#38bdf8' }) {
  const { user, requestAccess } = useAuth();
  const [contactEmail, setContactEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    message: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/meta')
      .then((d) => setContactEmail(d.contactEmail || ''))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await requestAccess({
        displayName: form.displayName || undefined,
        email: form.email || undefined,
        message: form.message || `Please grant me access to "${block.title}".`,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.');
    }
  };

  const levelLabel = LEVEL_LABELS[block.accessLevel] || `Level ${block.accessLevel}`;

  return (
    <div
      className="glass rounded-2xl p-5 sm:p-6"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 24px -12px ${themeColor}66` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${themeColor}22`, border: `1px solid ${themeColor}55` }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={themeColor} strokeWidth="2.2">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{block.title}</p>
            <p className="text-xs text-slate-400">This is a {levelLabel.toLowerCase()} section</p>
          </div>
        </div>
        <span
          className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold border"
          style={{ color: themeColor, borderColor: `${themeColor}55`, background: `${themeColor}11` }}
        >
          {levelLabel}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
        {status !== 'success' && (
          <p className="text-xs text-slate-400 flex-1">
            Contact the owner{contactEmail ? ` at ${contactEmail}` : ''} or send an access
            request to unlock this content.
          </p>
        )}

        {!open && status !== 'success' && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            Request access
          </button>
        )}

        {open && status !== 'success' && (
          <form onSubmit={submit} className="w-full space-y-3">
            {!user && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email address"
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
                />
              </div>
            )}
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="A short message — which subject and why you need access…"
              required
              minLength={5}
              rows={2}
              className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60 resize-none"
            />
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                disabled={status === 'sending'}
                className="px-4 py-2 rounded-lg text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
              >
                {status === 'sending' ? 'Sending…' : 'Send request'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {status === 'success' && (
          <p className="text-sm text-emerald-300 font-semibold">
            Request sent! The owner reviews requests personally.
          </p>
        )}
      </div>
    </div>
  );
}
