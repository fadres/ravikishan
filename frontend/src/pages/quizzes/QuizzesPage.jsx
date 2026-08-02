import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

function TypeBadge({ type }) {
  const map = {
    mcq: { label: 'MCQ', cls: 'bg-sky-400/15 text-sky-300' },
    true_false: { label: 'True/False', cls: 'bg-violet-400/15 text-violet-300' },
    fill_blank: { label: 'Fill Blank', cls: 'bg-amber-400/15 text-amber-300' },
    short_answer: { label: 'Short Answer', cls: 'bg-emerald-400/15 text-emerald-300' },
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${map[type].cls}`}>{map[type].label}</span>;
}

export default function QuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('browse');
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    async function load() {
      try {
        const [qRes, aRes, anRes] = await Promise.all([
          api('/api/quizzes'),
          api('/api/quizzes/attempts'),
          api('/api/quizzes/analytics'),
        ]);
        setQuizzes(qRes.quizzes || []);
        setAttempts(aRes.attempts || []);
        setAnalytics(anRes.analytics || null);
      } catch {
        setError('Failed to load quizzes.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Quizzes</h1>
          <p className="text-sm text-slate-400">Test yourself, earn XP and track your accuracy.</p>
        </div>
        <Link
          to="/quizzes/leaderboard"
          className="px-4 py-2 rounded-xl text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 transition"
        >
          🏆 Leaderboard
        </Link>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{analytics.attempts}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Quizzes done</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{analytics.averagePercent}%</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Avg score</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{analytics.accuracyPercent}%</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Accuracy</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{analytics.totalQuestions}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Questions</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[
          { id: 'browse', label: 'All quizzes' },
          { id: 'history', label: 'My attempts' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              tab === t.id ? 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300' : 'text-slate-300 bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

      {tab === 'browse' && (
        quizzes.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-slate-300">No published quizzes yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {quizzes.map((q) => (
              <div key={q.id} className="glass rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-white">{q.title}</h2>
                  <span className="text-xs text-slate-400 shrink-0">
                    {q._count?.attempts ?? 0} played
                  </span>
                </div>
                {q.description && <p className="text-sm text-slate-400 line-clamp-2">{q.description}</p>}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {q.subject && <span className="text-aqua-300 font-semibold">{q.subject.name}</span>}
                  {q.chapter && <span className="text-slate-400">· {q.chapter.title}</span>}
                  <span className="text-slate-400">· {q.questionCount} questions</span>
                  {q.isTimed && (
                    <span className="text-amber-300 font-semibold">· {Math.round((q.timeLimitSeconds || 0) / 60)} min</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-slate-400">{new Date(q.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => navigate(`/quizzes/${q.id}`)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
                  >
                    Take quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'history' && (
        attempts.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-slate-300">No attempts yet — take your first quiz above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((a) => {
              const pct = a.totalPoints > 0 ? Math.round((a.score / a.totalPoints) * 100) : 0;
              return (
                <Link
                  key={a.id}
                  to={`/quizzes/attempts/${a.id}`}
                  className="glass rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-aqua-400/40 transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{a.quiz?.title || 'Quiz'}</p>
                    <p className="text-xs text-slate-400">
                      {a.status} · {a.correctCount}/{a.totalQuestions} correct · {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-extrabold ${pct >= 60 ? 'text-emerald-300' : pct >= 40 ? 'text-amber-300' : 'text-rose-300'}`}
                  >
                    {a.score}/{a.totalPoints}
                  </span>
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
