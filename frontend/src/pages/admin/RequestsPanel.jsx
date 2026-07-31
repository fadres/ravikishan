import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function RequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = async (s = status) => {
    try {
      const data = await api(`/api/admin/requests?status=${s}`);
      setRequests(data.requests);
    } catch {
      setError('Could not load requests.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const resolve = async (id, action) => {
    setBusyId(id);
    setError('');
    try {
      await api(`/api/admin/requests/${id}/${action}`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const fmt = (iso) => new Date(iso).toLocaleString();

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        {['pending', 'approved', 'denied'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition ${
              status === s
                ? 'bg-aqua-400/20 text-aqua-100 border border-aqua-400/50'
                : 'text-slate-300 border border-white/12 hover:bg-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-rose-300 text-sm mb-4">{error}</p>}

      {requests.length === 0 ? (
        <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">
          No {status} requests.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">
                    {r.user.displayName || r.user.email}
                    <span className="ml-2 text-xs font-semibold text-slate-400">{r.email || r.user.email}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Requested {fmt(r.requestedAt)} · role: {r.user.role}
                  </p>
                </div>
                {status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, 'approve')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-emerald-400 to-teal-300 hover:brightness-110 disabled:opacity-50 transition"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Approve
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, 'deny')}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-rose-300 border border-rose-400/40 hover:bg-rose-400/10 disabled:opacity-50 transition"
                    >
                      Deny
                    </button>
                  </div>
                )}
                {status !== 'pending' && (
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
                      r.status === 'approved'
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                        : 'text-rose-300 bg-rose-400/10 border-rose-400/30'
                    }`}
                  >
                    {r.status} · {r.resolvedBy ? fmt(r.resolvedAt) : ''} by {r.resolvedBy?.email || 'unknown'}
                  </span>
                )}
              </div>
              {r.message && (
                <p className="mt-3 text-sm text-slate-300 bg-white/5 rounded-xl px-4 py-3 border border-white/8">
                  “{r.message}”
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
