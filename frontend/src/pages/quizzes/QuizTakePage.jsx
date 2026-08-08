import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { RichText } from '../../lib/markdown.jsx';

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function QuizTakePage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const submittedRef = useRef(false);

  // 1) Load quiz detail, 2) start the attempt, 3) run the timer.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const qRes = await api(`/api/quizzes/${quizId}`);
        if (!active) return;
        setQuiz(qRes.quiz);
        const aRes = await api(`/api/quizzes/${quizId}/attempts`, { method: 'POST' });
        if (!active) return;
        setAttempt(aRes.attempt);
        if (qRes.quiz.isTimed && qRes.quiz.timeLimitSeconds) {
          setSecondsLeft(qRes.quiz.timeLimitSeconds);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Could not start the quiz.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [quizId]);

  const submit = useCallback(
    async (force = false) => {
      if (submittedRef.current) return;
      if (!force && quiz?.isTimed) {
        setConfirming(true);
        return;
      }
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const payload = quiz.questions.map((q) => ({
          questionId: q.id,
          answer: answers[q.id] ?? null,
        }));
        const res = await api(`/api/quizzes/attempts/${attempt.id}/submit`, {
          method: 'POST',
          body: { answers: payload },
        });
        navigate(`/quizzes/attempts/${res.attempt.id}`, { replace: true });
      } catch (err) {
        setSubmitting(false);
        submittedRef.current = false;
        setError(err instanceof ApiError ? err.message : 'Could not submit the quiz.');
      }
    },
    [answers, attempt, quiz, navigate],
  );

  // Countdown timer. `submit` must be declared before this effect: its
  // dependency array reads the binding during render.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submit(true); // force: skip the confirm dialog, submit immediately
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, submit]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-rose-300 mb-4">{error}</p>
        <button
          onClick={() => navigate('/quizzes')}
          className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300"
        >
          Back to quizzes
        </button>
      </div>
    );
  }

  const answeredCount = quiz.questions.filter((q) => answers[q.id]).length;

  const inputCls =
    'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">{quiz.title}</h1>
          <p className="text-sm text-slate-400">
            {quiz.chapter?.title ? `${quiz.chapter.title} · ` : ''}
            {answeredCount}/{quiz.questions.length} answered
          </p>
        </div>
        {secondsLeft !== null && (
          <span
            className={`shrink-0 px-4 py-2 rounded-xl font-extrabold text-sm tabular-nums ${
              secondsLeft <= 60 ? 'bg-rose-400/15 text-rose-300' : 'bg-aqua-400/15 text-aqua-300'
            }`}
            role="timer"
            aria-label="Time remaining"
          >
            ⏱ {fmt(secondsLeft)}
          </span>
        )}
      </div>

      {quiz.description && (
        <p className="text-sm text-slate-400 mb-6 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          {quiz.description}
        </p>
      )}

      <div className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <section key={q.id} className="glass rounded-2xl p-5" aria-label={`Question ${idx + 1}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-bold text-white">
                <span className="text-aqua-300 mr-2">Q{idx + 1}.</span>
                <RichText text={q.question} />
              </h2>
              <span className="text-xs text-slate-400 shrink-0">{q.points} pts</span>
            </div>

            {q.questionType === 'true_false' && (
              <div className="flex gap-3">
                {['True', 'False'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${
                      answers[q.id] === opt
                        ? 'bg-aqua-400/20 border-aqua-400/60 text-aqua-200'
                        : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.questionType === 'mcq' && (              <div className="space-y-2">
                {(q.options || []).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition ${
                      answers[q.id] === opt
                        ? 'bg-aqua-400/20 border-aqua-400/60 text-aqua-200'
                        : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <RichText text={opt} />
                  </button>
                ))}
              </div>
            )}

            {(q.questionType === 'fill_blank' || q.questionType === 'short_answer') && (
              <textarea
                rows={q.questionType === 'short_answer' ? 4 : 2}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                className={inputCls}
                placeholder={q.questionType === 'fill_blank' ? 'Type your answer…' : 'Explain in a sentence or two…'}
              />
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Questions are shuffled; answers are graded automatically.</p>
        <button
          onClick={() => submit(true)}
          disabled={submitting}
          className="px-6 py-3 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-emerald-400 to-emerald-300 hover:brightness-110 disabled:opacity-50 transition"
        >
          {submitting ? 'Grading…' : 'Submit answers'}
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" role="dialog" aria-modal="true" aria-label="Submit confirmation">
          <div className="glass-strong rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-white mb-2">Submit this quiz?</h2>
            <p className="text-sm text-slate-300 mb-5">
              You have answered {answeredCount} of {quiz.questions.length} questions.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition"
              >
                Keep going
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  submit(true);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
