import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function Section({ title, subtitle, children }) {
  return (
    <section className="glass rounded-2xl p-5 sm:p-6" aria-label={title}>
      <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

function Alert({ kind, children }) {
  const styles =
    kind === 'success'
      ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300'
      : 'bg-rose-400/10 border-rose-400/25 text-rose-300';
  return <p className={`mb-4 text-sm rounded-xl border px-4 py-2.5 ${styles}`}>{children}</p>;
}

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState(null);
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({ displayName: '', bio: '' });
  const [saveMsg, setSaveMsg] = useState({ kind: '', text: '' });
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ kind: '', text: '' });
  const [pwBusy, setPwBusy] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ kind: '', text: '' });

  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState({ kind: '', text: '' });

  const [revoking, setRevoking] = useState(null);
  const [revokeAllBusy, setRevokeAllBusy] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    async function load() {
      try {
        const [meRes, sessRes, histRes] = await Promise.all([
          api('/api/users/me'),
          api('/api/auth/sessions'),
          api('/api/auth/login-history'),
        ]);
        setProfile(meRes.user);
        setStreak(meRes.streak);
        setStats(meRes.stats);
        setForm({ displayName: meRes.user.displayName || '', bio: meRes.user.bio || '' });
        setSessions(sessRes.sessions || []);
        setHistory(histRes.history || []);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, navigate]);

  if (loading || !profile) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg({ kind: '', text: '' });
    try {
      const res = await api('/api/users/me', { method: 'PATCH', body: form });
      setProfile(res.user);
      setSaveMsg({ kind: 'success', text: 'Profile updated.' });
      refreshUser();
    } catch (err) {
      setSaveMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) {
      setPwMsg({ kind: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwBusy(true);
    setPwMsg({ kind: '', text: '' });
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      setPwMsg({ kind: 'success', text: 'Password changed. Other sessions were signed out.' });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not change password.' });
    } finally {
      setPwBusy(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarMsg({ kind: 'error', text: 'Avatar must be 2MB or smaller.' });
      return;
    }
    setAvatarBusy(true);
    setAvatarMsg({ kind: '', text: '' });
    try {
      const { url, key } = await api('/api/users/me/avatar/presign', {
        method: 'POST',
        body: { fileName: file.name, contentType: file.type, fileSize: file.size },
      });
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.onload = resolve;
        xhr.onerror = () => reject(new Error('Upload to storage failed'));
        xhr.send(file);
      });
      const res = await api('/api/users/me/avatar', { method: 'POST', body: { key } });
      setProfile(res.user);
      setAvatarMsg({ kind: 'success', text: 'Avatar updated.' });
      refreshUser();
    } catch (err) {
      setAvatarMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Avatar upload failed.' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const resendVerification = async () => {
    setVerifying(true);
    setVerifyMsg({ kind: '', text: '' });
    try {
      const res = await api('/api/auth/resend-verification', { method: 'POST' });
      setVerifyMsg({ kind: 'success', text: res.message });
    } catch (err) {
      setVerifyMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not send verification email.' });
    } finally {
      setVerifying(false);
    }
  };

  const revokeSession = async (id) => {
    setRevoking(id);
    try {
      await api(`/api/auth/sessions/${id}`, { method: 'DELETE' });
      setSessions((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      setAvatarMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not revoke session.' });
    } finally {
      setRevoking(null);
    }
  };

  const revokeOthers = async () => {
    setRevokeAllBusy(true);
    try {
      await api('/api/auth/sessions', { method: 'DELETE' });
      setSessions([]);
    } catch {
      setAvatarMsg({ kind: 'error', text: 'Could not revoke sessions.' });
    } finally {
      setRevokeAllBusy(false);
    }
  };

  const initial = profile.displayName?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'G';
  const badgeTone =
    profile.role === 'owner'
      ? 'bg-amber-400/15 text-amber-300'
      : profile.role === 'admin'
        ? 'bg-fuchsia-400/15 text-fuchsia-300'
        : profile.isApproved
          ? 'bg-aqua-400/15 text-aqua-300'
          : 'bg-slate-400/15 text-slate-300';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">My Profile</h1>
      <p className="text-sm text-slate-400 mb-8">Manage your account, security and sessions.</p>

      <div className="glass rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.displayName || profile.email} avatar`}
              className="w-20 h-20 rounded-full object-cover ring-2 ring-aqua-400/40"
            />
          ) : (
            <span className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-bold flex items-center justify-center">
              {initial}
            </span>
          )}
          <label
            htmlFor="avatar-input"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-aqua-400 text-deep-900 flex items-center justify-center cursor-pointer shadow-lg hover:brightness-110 transition"
            aria-label="Upload avatar"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </label>
          <input id="avatar-input" type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadAvatar} />
        </div>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-xl font-bold text-white">{profile.displayName || 'Student'}</h2>
          <p className="text-sm text-slate-400">{profile.email}</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
            <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${badgeTone}`}>
              {profile.role}
            </span>
            <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 font-bold">
              {profile.emailVerified ? 'Email verified' : 'Email not verified'}
            </span>
            {profile.accessLevel <= 3 && (
              <span className="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300 font-bold">
                Access level {profile.accessLevel}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-6 text-center shrink-0">
          <div>
            <p className="text-xl font-extrabold text-white">{profile.totalXp ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">XP</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-white">{streak?.streak ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Day streak</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-white">{stats?.userBadges ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Badges</p>
          </div>
        </div>
      </div>

      {avatarMsg.text && <Alert kind={avatarMsg.kind}>{avatarMsg.text}</Alert>}
      {avatarBusy && (
        <p className="text-sm text-slate-300" role="status">Uploading avatar…</p>
      )}

      {!profile.emailVerified && (
        <Section title="Email verification" subtitle="Verify your email to unlock account recovery and security features.">
          <button
            onClick={resendVerification}
            disabled={verifying}
            className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
          >
            {verifying ? 'Sending…' : 'Send verification email'}
          </button>
          {verifyMsg.text && <Alert kind={verifyMsg.kind}>{verifyMsg.text}</Alert>}
        </Section>
      )}

      <Section title="Profile details" subtitle="Your public name and a short bio.">
        {saveMsg.text && <Alert kind={saveMsg.kind}>{saveMsg.text}</Alert>}
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Display name</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Bio</label>
            <textarea
              rows={3}
              maxLength={300}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className={inputCls}
              placeholder="A sentence or two about you…"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Section>

      <Section title="Change password" subtitle="Signs out every other device after the change.">
        {pwMsg.text && <Alert kind={pwMsg.kind}>{pwMsg.text}</Alert>}
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Current password</label>
            <input
              type="password"
              required
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">New password</label>
              <input
                type="password"
                required
                minLength={8}
                value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwBusy}
            className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
          >
            {pwBusy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </Section>

      <Section title="Active sessions" subtitle="Devices currently signed in with your account.">
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-400">No other active sessions.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{s.userAgent || 'Unknown device'}</p>
                  <p className="text-xs text-slate-400">
                    {s.ip || 'Unknown IP'} · last used {new Date(s.lastUsedAt || s.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => revokeSession(s.id)}
                  disabled={revoking === s.id}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-rose-300 bg-rose-400/10 border border-rose-400/25 hover:bg-rose-400/20 disabled:opacity-50 transition"
                >
                  {revoking === s.id ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        )}
        {sessions.length > 1 && (
          <button
            onClick={revokeOthers}
            disabled={revokeAllBusy}
            className="mt-4 text-xs font-bold px-4 py-2 rounded-lg text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 disabled:opacity-50 transition"
          >
            {revokeAllBusy ? 'Revoking…' : 'Sign out all other devices'}
          </button>
        )}
      </Section>

      <Section title="Recent sign-ins" subtitle="Your latest login attempts.">
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">No sign-in history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                <span className="text-slate-200">
                  {h.success ? '✅' : '⛔'} {h.ip || 'Unknown IP'}
                  <span className="text-slate-400"> · {h.userAgent || 'Unknown device'}</span>
                </span>
                <span className="text-xs text-slate-400 shrink-0">{new Date(h.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="flex justify-end">
        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="px-5 py-2 rounded-xl text-sm font-bold text-rose-300 bg-rose-400/10 border border-rose-400/25 hover:bg-rose-400/20 transition"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
