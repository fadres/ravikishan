import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const ACTION_LABELS = {
  'access.approved': { label: 'Access approved', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' },
  'access.denied': { label: 'Access denied', cls: 'text-rose-300 bg-rose-400/10 border-rose-400/30' },
  'access.requested': { label: 'Access requested', cls: 'text-aqua-300 bg-aqua-400/10 border-aqua-400/30' },
  'user.updated': { label: 'User updated', cls: 'text-violet-300 bg-violet-400/10 border-violet-400/30' },
  'subject.lock_toggled': { label: 'Subject lock toggled', cls: 'text-amber-300 bg-amber-400/10 border-amber-400/30' },
  'chapter.lock_toggled': { label: 'Chapter lock toggled', cls: 'text-amber-300 bg-amber-400/10 border-amber-400/30' },
  'block.created': { label: 'Block created', cls: 'text-aqua-300 bg-aqua-400/10 border-aqua-400/30' },
  'block.updated': { label: 'Block updated', cls: 'text-aqua-300 bg-aqua-400/10 border-aqua-400/30' },
  'block.deleted': { label: 'Block deleted', cls: 'text-rose-300 bg-rose-400/10 border-rose-400/30' },
  'chapter.created': { label: 'Chapter created', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' },
  'chapter.deleted': { label: 'Chapter deleted', cls: 'text-rose-300 bg-rose-400/10 border-rose-400/30' },
  'chapter.reordered': { label: 'Chapter reordered', cls: 'text-slate-300 bg-white/10 border-white/15' },
  'subject.created': { label: 'Subject created', cls: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' },
  'subject.updated': { label: 'Subject updated', cls: 'text-slate-300 bg-white/10 border-white/15' },
};

export default function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/audit?limit=200')
      .then((d) => setLogs(d.logs))
      .catch(() => setError('Could not load the audit trail.'));
  }, []);

  if (error) return <p className="text-rose-300 text-sm">{error}</p>;

  return (
    <div>
      {logs.length === 0 ? (
        <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">No audit entries yet.</p>
      ) : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Target</th>
                <th className="px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const meta = ACTION_LABELS[l.action] || { label: l.action, cls: 'text-slate-300 bg-white/10 border-white/15' };
                return (
                  <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{l.actorEmail || 'system'}</td>
                    <td className="px-5 py-3 text-slate-400 max-w-[280px] truncate">
                      {l.targetType}
                      {l.detail ? (
                        <span className="block text-xs text-slate-500 truncate">{JSON.stringify(l.detail).slice(0, 120)}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
