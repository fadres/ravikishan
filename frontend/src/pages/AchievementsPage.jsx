import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

export default function AchievementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState('');
  const [minutes, setMinutes] = useState('');
  const [logging, setLogging] = useState(false);
  const [logMsg, setLogMsg] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await api('/api/gamification');
        setSummary(res.summary);
      } catch {
        setError('Could not load your achievements.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const checkIn = async () => {
    setCheckingIn(true);
    setCheckinMsg('');
    try {
      const res = await api('/api/gamification/checkin', { method: 'POST' });
      setCheckinMsg(`Checked in! +${res.xpEarned} XP — ${res.streak.streak}-day streak 🔥`);
      const s = await api('/api/gamification');
      setSummary(s.summary);
    } catch {
      setCheckinMsg('Could not check in right now.');
    } finally {
      setCheckingIn(false);
    }
  };

  const logStudyTime = async (e) => {
    e.preventDefault();
    const mins = Number(minutes);
    if (!mins || mins < 1 || mins > 600) return;
    setLogging(true);
    setLogMsg('');
    try {
      const res = await api('/api/gamification/study-time', { method: 'POST', body: { minutes: mins } });
      setLogMsg(`Logged ${mins} minutes — +${res.xpEarned} XP.`);
      setMinutes('');
      const s = await api('/api/gamification');
      setSummary(s.summary);
    } catch {
      setLogMsg('Could not log study time.');
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-rose-300 mb-4">{error}</p>
        <Link to="/" className="text-aqua-300 font-semibold hover:text-aqua-100">Back home</Link>
      </div>
    );
  }

  const dayTotal = summary.last30Days?.length
    ? summary.last30Days[summary.last30Days.length - 1]
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Achievements</h1>
          <p className="text-sm text-slate-400">Level up, collect badges and keep the streak alive.</p>
        </div>
        <Link
          to="/quizzes/leaderboard"
          className="px-4 py-2 rounded-xl text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 transition"
        >
          🏆 Leaderboard
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-white">{summary.level}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Level</p>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-2" role="progressbar" aria-valuenow={summary.levelProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-aqua-400 rounded-full" style={{ width: `${summary.levelProgress}%` }} />
          </div>
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-white">{summary.totalXp}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total XP</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-white">🔥 {summary.streak}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Day streak</p>
          <p className="text-xs text-slate-500 mt-1">Best: {summary.longestStreak}</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-3xl font-extrabold text-white">{summary.badges.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Badges</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Daily check-in</h2>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <button
            onClick={checkIn}
            disabled={checkingIn}
            className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-orange-400 to-amber-300 hover:brightness-110 disabled:opacity-50 transition"
          >
            {checkingIn ? 'Checking in…' : '🔥 Check in today'}
          </button>
          <form onSubmit={logStudyTime} className="flex gap-2 flex-1 sm:max-w-xs">
            <input
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputCls}
              placeholder="Study minutes"
              aria-label="Minutes studied"
            />
            <button
              disabled={logging}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-200 bg-white/10 hover:bg-white/20 disabled:opacity-50 transition shrink-0"
            >
              {logging ? '…' : 'Log'}
            </button>
          </form>
        </div>
        {(checkinMsg || logMsg) && (
          <p className="mt-3 text-sm text-emerald-300">{checkinMsg || logMsg}</p>
        )}
        {dayTotal && (
          <p className="mt-3 text-xs text-slate-400">
            Today: {dayTotal.minutes || 0} min · {dayTotal.quizzes || 0} quizzes · {dayTotal.cards || 0} cards · {dayTotal.blocks || 0} blocks
          </p>
        )}
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Badges</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {[...summary.badges, ...summary.lockedBadges].map((b) => {
          const earned = Boolean(b.earnedAt);
          return (
            <div
              key={b.code}
              title={b.description}
              className={`glass rounded-2xl p-4 text-center ${earned ? 'border-amber-400/40' : 'opacity-50'}`}
            >
              <p className={`text-3xl mb-2 ${earned ? '' : 'grayscale'}`} aria-hidden="true">
                {b.icon}
              </p>
              <p className="text-sm font-bold text-white">{b.name}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{b.description}</p>
              {earned && (
                <p className="text-[10px] text-amber-300 mt-2 font-semibold">
                  Earned {new Date(b.earnedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Recent XP</h2>
      {summary.recentXp.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-slate-300">No XP yet — complete a chapter, quiz or flashcard review.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {summary.recentXp.slice(0, 10).map((e) => (
            <li key={e.id} className="glass rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-200 truncate">
                {e.source.replaceAll('_', ' ')} {e.metadata?.quizTitle ? `· ${e.metadata.quizTitle}` : ''}
              </span>
              <span className="text-emerald-300 font-extrabold shrink-0">+{e.amount} XP</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
