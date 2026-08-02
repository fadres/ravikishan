import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const ICONS = { achievement: '🏅', reminder: '⏰', planner: '📅', system: '🔔' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api('/api/notifications');
      setNotifications(res.notifications || []);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    load();
  }, [user, navigate, load]);

  const markRead = async (id) => {
    await api(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    setNotifications((list) => list.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  };

  const unread = notifications.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Notifications</h1>
          <p className="text-sm text-slate-400">
            {unread > 0 ? `${unread} unread` : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

      {notifications.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">🔕</p>
          <p className="text-slate-300">No notifications yet.</p>
          <p className="text-sm text-slate-500 mt-2">
            Reminders for plan items, exams and achievements will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const read = Boolean(n.readAt);
            return (
              <li key={n.id}>
                <button
                  onClick={() => !read && markRead(n.id)}
                  className={`w-full text-left glass rounded-2xl p-4 flex items-start gap-3 transition ${
                    read ? 'opacity-60' : 'hover:border-aqua-400/40'
                  }`}
                >
                  <span className="text-xl shrink-0" aria-hidden="true">
                    {ICONS[n.type] || '🔔'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{n.title}</span>
                      {!read && <span className="w-2 h-2 rounded-full bg-aqua-400 shrink-0" aria-label="Unread" />}
                    </span>
                    <span className="block text-sm text-slate-400 mt-0.5">{n.body}</span>
                    <span className="block text-xs text-slate-500 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </span>
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-aqua-300 bg-aqua-400/10 hover:bg-aqua-400/20 transition"
                    >
                      Open
                    </Link>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
