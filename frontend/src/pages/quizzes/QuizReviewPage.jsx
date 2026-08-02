import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function QuizReviewPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api(`/api/quizzes/attempts/${attemptId}`);
        setAttempt(res.attempt);
      } catch {
        setError('Could not load this attempt.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-rose-300 mb-4">{error}</p>
        <Link to="/quizzes" className="text-aqua-300 font-semibold hover:text-aqua-100">Back to quizzes</Link>
      </div>
    );
  }

  const pct = attempt.totalPoints > 0 ? Math.round((attempt.score / attempt.totalPoints) * 100) : 0;
  const verdict = pct >= 60 ? 'Great job!' : pct >= 40 ? 'Keep practising.' : 'Review and retry.';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="glass rounded-2xl p-6 mb-8 text-center">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{attempt.quiz?.title}</p>
        <p className="text-4xl font-extrabold text-white">
          {attempt.score}<span className="text-slate-400 text-2xl">/{attempt.totalPoints}</span>
        </p>
        <p className="mt-1 text-sm text-aqua-300 font-semibold">{verdict} ({pct}%)</p>
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-slate-300">
          <span>✅ {attempt.correctCount}/{attempt.totalQuestions} correct</span>
          <span>✨ +{attempt.xpEarned ?? 0} XP</span>
          {attempt.timeSpentSeconds > 0 && (
            <span>⏱ {Math.round(attempt.timeSpentSeconds / 60)}m spent</span>
          )}
        </div>
        <div className="flex gap-3 justify-center mt-5">
          <Link
            to="/quizzes"
            className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
          >
            More quizzes
          </Link>
          <Link
            to="/quizzes/leaderboard"
            className="px-4 py-2 rounded-xl text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 transition"
          >
            🏆 Leaderboard
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {(attempt.quiz?.questions || []).map((q, idx) => (
          <section key={q.id} className={`glass rounded-2xl p-5 border-l-4 ${q.correct ? 'border-l-emerald-400' : 'border-l-rose-400'}`} aria-label={`Review question ${idx + 1}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="font-bold text-white">
                <span className="mr-2">{q.correct ? '✅' : '❌'}</span>
                {q.question}
              </h2>
              <span className="text-xs text-slate-400 shrink-0">
                {q.pointsEarned}/{q.points} pts
              </span>
            </div>

            {q.questionType === 'mcq' && (
              <div className="space-y-1.5 mt-3">
                {(q.options || []).map((opt) => {
                  const isCorrect = opt === q.correctAnswer;
                  const isGiven = opt === q.givenAnswer;
                  return (
                    <div
                      key={opt}
                      className={`text-sm px-4 py-2 rounded-xl border ${
                        isCorrect
                          ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-200'
                          : isGiven
                            ? 'bg-rose-400/15 border-rose-400/40 text-rose-200'
                            : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {opt} {isCorrect && '← correct'} {isGiven && !isCorrect && '← your answer'}
                    </div>
                  );
                })}
              </div>
            )}

            {(q.questionType === 'fill_blank' || q.questionType === 'short_answer') && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-300">
                  <span className="text-slate-500 font-semibold">Your answer: </span>
                  {q.givenAnswer || <span className="italic text-slate-500">(blank)</span>}
                </p>
                <p className="text-emerald-300">
                  <span className="text-slate-500 font-semibold">Correct: </span>
                  {q.correctAnswer}
                </p>
              </div>
            )}

            {q.questionType === 'true_false' && (
              <p className="mt-3 text-sm text-emerald-300">
                Correct answer: {q.correctAnswer}
                {q.givenAnswer && q.givenAnswer !== q.correctAnswer && (
                  <span className="text-rose-300"> · your answer: {q.givenAnswer}</span>
                )}
              </p>
            )}

            {q.explanation && (
              <p className="mt-3 text-sm text-slate-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                💡 {q.explanation}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
