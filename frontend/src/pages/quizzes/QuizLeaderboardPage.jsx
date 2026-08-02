import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function QuizLeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api('/api/quizzes/leaderboard');
        setRows(res.leaderboard || []);
      } catch {
        setError('Could not load the leaderboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Leaderboard</h1>
        <p className="text-sm text-slate-400">Top XP earners on Ravikishan.</p>
      </div>

      {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-slate-300">No scores yet — be the first!</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => {
            const mine = user?.id === r.id;
            return (
              <li
                key={r.id}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3 border transition ${
                  mine
                    ? 'bg-aqua-400/10 border-aqua-400/50'
                    : 'glass'
                }`}
              >
                <span className="w-8 text-center text-lg font-extrabold text-slate-300">
                  {r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}
                </span>
                <span className="relative w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm font-bold flex items-center justify-center overflow-hidden">
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (r.displayName || '?')[0].toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {r.displayName}
                    {mine && <span className="ml-2 text-[10px] uppercase tracking-wider text-aqua-300">you</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.quizzesCompleted} quizzes · {r.streak} day streak
                  </p>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-amber-300">{r.xp} XP</span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-6 text-center">
        <Link to="/quizzes" className="text-sm text-aqua-300 font-semibold hover:text-aqua-100">
          ← Back to quizzes
        </Link>
      </p>
    </div>
  );
}
