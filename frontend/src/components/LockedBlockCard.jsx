import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/client.js';

// Compact locked card: title stays visible, content is gated behind an
// "Access it" button — one click submits the request (guests go to login).
export default function LockedBlockCard({ block, topicLabel, contactEmail = '', themeColor = '#38bdf8' }) {
  const { user, requestAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const request = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await requestAccess({ message: `Please grant me access to "${block.title}".` });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.');
    }
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5" style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 24px -12px ${themeColor}66` }}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${themeColor}22`, border: `1px solid ${themeColor}55` }}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={themeColor} strokeWidth="2.2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white truncate">
            {topicLabel && <span className="text-xs font-extrabold uppercase tracking-wider mr-1.5" style={{ color: themeColor }}>{topicLabel}</span>}
            {block.title}
          </p>
          <p className="text-xs text-slate-400">This section is locked</p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold border" style={{ color: themeColor, borderColor: `${themeColor}55`, background: `${themeColor}11` }}>
          Locked
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
        {status !== 'success' ? (
          <>
            <p className="text-xs text-slate-400 flex-1">
              {status === 'error' ? <span className="text-rose-300">{error}</span> : 'Click Access it — content unlocks here after the owner approves.'}
            </p>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={request}
                disabled={status === 'sending'}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-deep-900 bg-gradient-to-r from-emerald-400 to-teal-300 hover:brightness-110 disabled:opacity-60 transition"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                {status === 'sending' ? 'Sending…' : 'Access it'}
              </button>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Access request — "${block.title}"`)}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10 transition"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                  Contact owner
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-emerald-300 font-semibold">
            Request sent! It will open here after the owner approves.
          </p>
        )}
      </div>
    </div>
  );
}
