import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const ICONS = { achievement: '🏅', reminder: '⏰', planner: '📅', system: '🔔' };

// VAPID public keys are base64url-encoded; PushManager needs a Uint8Array.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

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

  // Detect browser push support + whether this device is already subscribed.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false);
      return;
    }
    setPushSupported(true);
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setPushEnabled(Boolean(sub));
      } catch {
        if (!cancelled) setPushEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    load();
  }, [user, navigate, load]);

  const togglePush = async () => {
    setPushBusy(true);
    setPushMsg('');
    try {
      if (pushEnabled) {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api('/api/notifications/push/unsubscribe', {
            method: 'POST',
            body: { endpoint: sub.endpoint },
          });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
        setPushMsg('Browser notifications turned off.');
        return;
      }

      if (Notification.permission === 'denied') {
        setPushMsg('Notifications are blocked in your browser settings.');
        return;
      }
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushMsg('Permission was not granted.');
          return;
        }
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const meta = await api('/api/meta');
      const vapidPublicKey = meta.vapidPublicKey;
      if (!vapidPublicKey) {
        setPushMsg('Push is not configured on the server yet.');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await api('/api/notifications/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.toJSON().keys.p256dh,
            auth: sub.toJSON().keys.auth,
          },
        },
      });
      setPushEnabled(true);
      setPushMsg('Browser notifications are on — reminders will arrive here.');
    } catch (e) {
      setPushMsg(e?.message || 'Could not update notification settings.');
    } finally {
      setPushBusy(false);
    }
  };

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

      {/* Browser push toggle — activates the server-side push subscription
          endpoints that existed without any client wiring until now. */}
      {pushSupported && (
        <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-2xl shrink-0" aria-hidden="true">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Browser notifications</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {pushEnabled
                ? 'On — study reminders and results are pushed to this device.'
                : 'Receive reminders on this device even when the tab is closed.'}
            </p>
            {pushMsg && <p className="text-xs text-aqua-300 mt-1">{pushMsg}</p>}
          </div>
          <button
            onClick={togglePush}
            disabled={pushBusy}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-50 ${
              pushEnabled
                ? 'glass text-slate-200 hover:border-rose-400/50 hover:text-rose-200'
                : 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110'
            }`}
          >
            {pushBusy ? '…' : pushEnabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      )}

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
