import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLES = ['guest', 'member', 'admin', 'owner'];

const ROLE_BADGE = {
  owner: 'text-aqua-300 bg-aqua-400/10 border-aqua-400/40',
  admin: 'text-violet-300 bg-violet-400/10 border-violet-400/40',
  member: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/40',
  guest: 'text-slate-400 bg-white/5 border-white/15',
};

export default function UsersPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const data = await api('/api/admin/users');
      setUsers(data.users);
    } catch {
      setError('Could not load users.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id, patch) => {
    setBusyId(id);
    setError('');
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: patch });
      await load();
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {error && <p className="text-rose-300 text-sm mb-4">{error}</p>}

      {users.length === 0 ? (
        <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">No users yet.</p>
      ) : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Access level</th>
                <th className="px-5 py-3 font-semibold">Approved</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-white">{u.displayName || '—'}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold capitalize border ${ROLE_BADGE[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      disabled={busyId === u.id || (u.role === 'owner' && me.id !== u.id)}
                      value={u.accessLevel ?? 3}
                      onChange={(e) => update(u.id, { accessLevel: Number(e.target.value) })}
                      className={`bg-white/10 border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-aqua-400/60 disabled:opacity-40 ${
                        (u.accessLevel ?? 3) === 1
                          ? 'text-amber-300 border-amber-400/40'
                          : (u.accessLevel ?? 3) === 2
                            ? 'text-aqua-200 border-aqua-400/40'
                            : (u.accessLevel ?? 3) === 3
                              ? 'text-emerald-300 border-emerald-400/40'
                              : 'text-slate-300 border-slate-400/40'
                      }`}
                      title="Only the owner can grant Premium (1)"
                    >
                      <option value={4} className="bg-deep-800">4 · Public (15%)</option>
                      <option value={3} className="bg-deep-800">3 · Free — logged in (25%)</option>
                      <option value={2} className="bg-deep-800">2 · Member (50%)</option>
                      <option value={1} className="bg-deep-800">1 · Premium (100%)</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      disabled={busyId === u.id || (u.role === 'owner' && me.id !== u.id)}
                      onClick={() => update(u.id, { isApproved: !u.isApproved })}
                      className={`relative w-10 h-5.5 rounded-full transition ${
                        u.isApproved ? 'bg-emerald-400/70' : 'bg-white/15'
                      } ${busyId === u.id ? 'opacity-50' : ''}`}
                      style={{ width: '2.5rem', height: '1.375rem' }}
                      title={u.isApproved ? 'Revoke approval' : 'Approve'}
                    >
                      <span
                        className="absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all"
                        style={{
                          left: u.isApproved ? '1.3rem' : '0.2rem',
                          width: '1.125rem',
                          height: '1.125rem',
                        }}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <select
                      disabled={busyId === u.id || (u.role === 'owner' && me.id !== u.id)}
                      value={u.role}
                      onChange={(e) => update(u.id, { role: e.target.value })}
                      className="bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-aqua-400/60 disabled:opacity-40"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="bg-deep-800">
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500 mt-3">
        Admins can assign member/guest roles and levels 2–3. Only the owner can grant Premium (level 1) or the owner role.
      </p>
    </div>
  );
}
