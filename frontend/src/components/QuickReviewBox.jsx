import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';

// Home-page / Dashboard Quick Review box: shows one 4-option question,
// auto-advances every `seconds` (4s on Home, 6s on the Dashboard), tap an
// option to answer. Every question seen is kept in an on-screen history (and
// localStorage) so nothing is lost to the timer. Questions come from ALL
// contents — every active section (Class 11 + Class 12) is pooled server-side.

const LOCAL_KEY = 'rk_quick_review_history';
const KIND_LABELS = {
  mcq: { label: 'MCQ', color: '#60a5fa' },
  term: { label: 'Term', color: '#a78bfa' },
  formula: { label: 'Formula', color: '#38bdf8' },
  concept: { label: 'Concept', color: '#34d399' },
};

function loadHistory(key = LOCAL_KEY) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export default function QuickReviewBox({
  seconds = 4,
  historyKey = LOCAL_KEY,
  title = 'Quick Review',
  subtitle = null,
  className = '',
}) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // { option, isCorrect }
  const [history, setHistory] = useState(() => loadHistory(historyKey));
  const [showHistory, setShowHistory] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api('/api/quick/questions')
      .then((d) => setQuestions(d.questions || []))
      .catch(() => setQuestions([]));
  }, []);

  const advance = useCallback(() => {
    setSelected(null);
    setIndex((i) => (questions.length ? (i + 1) % questions.length : 0));
  }, [questions.length]);

  // Auto-advance every `seconds` unless paused or history panel is open.
  useEffect(() => {
    if (paused || !questions.length) return;
    timerRef.current = setTimeout(advance, seconds * 1000);
    return () => clearTimeout(timerRef.current);
  }, [index, paused, questions.length, advance, seconds]);

  const q = questions[index];
  const seenCount = useMemo(() => Math.min(history.length, questions.length || 1), [history.length, questions.length]);

  const record = (option, isCorrect) => {
    setSelected({ option, isCorrect });
    setHistory((prev) => {
      const next = [
        {
          id: q.id,
          kind: q.kind,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          chosen: option,
          correct: isCorrect,
          source: q.source,
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 60);
      try {
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {
        /* storage full — keep in memory */
      }
      return next;
    });
  };

  if (!questions.length) return null;

  const label = KIND_LABELS[q?.kind] || KIND_LABELS.mcq;

  return (
    <section className={`glass rounded-2xl mt-5 p-5 ${className}`} aria-label="Quick review questions">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: '#60a5fa1f', border: '1px solid #60a5fa55', color: '#60a5fa' }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2l4 3-4 3" />
              <path d="M13.5 2L9.5 5l4 3" />
              <path d="M2 8h8M2 11h6M2 14h4" />
              <circle cx="17.5" cy="14" r="4" />
              <path d="M17.5 14l2 2" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-extrabold text-white leading-tight">{title}</h2>
            <p className="text-[11px] text-slate-400">
              {subtitle ?? `New question every ${seconds}s · ${questions.length} in pool`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[11px] font-bold text-slate-200 hover:text-white transition"
          >
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[11px] font-bold text-slate-200 hover:text-aqua-200 hover:border-aqua-400/40 transition"
          >
            🕘 History {history.length > 0 ? `(${history.length})` : ''}
          </button>
        </div>
      </div>

      {!paused && (
        <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            key={index}
            className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-emerald-400"
            style={{ width: '100%', animation: `quickTimer ${seconds}s linear forwards` }}
          />
        </div>
      )}

      <div key={`${q.id}-${index}`} className="idiom-fade mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: label.color, borderColor: `${label.color}66`, background: `${label.color}11` }}
          >
            {label.label}
            {q.kind === 'mcq' && q.source ? ` · ${q.source}` : q.chapterName ? ` · ${q.chapterName}` : ''}
          </span>
        </div>

        <p className="mt-2.5 text-sm sm:text-base font-semibold text-white leading-snug">{q.question}</p>

        <div className="mt-4 grid gap-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isChosen = selected?.option === i;
            let cls = 'bg-white/5 border-white/10 hover:bg-white/10';
            let letterColor = 'text-slate-400';
            if (selected) {
              if (isCorrect) {
                cls = 'bg-emerald-400/15 border-emerald-400/60';
                letterColor = 'text-emerald-300';
              } else if (isChosen) {
                cls = 'bg-rose-400/15 border-rose-400/60';
                letterColor = 'text-rose-300';
              } else {
                cls = 'bg-white/[0.03] border-white/[0.07] opacity-60';
              }
            }
            return (
              <button
                key={i}
                disabled={selected !== null}
                onClick={() => record(i, isCorrect)}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${cls}`}
              >
                <span className={`font-extrabold ${letterColor} mr-2`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-slate-200">{opt}</span>
                {selected && isCorrect && <span className="ml-2 text-emerald-300">✓</span>}
                {selected && isChosen && !isCorrect && <span className="ml-2 text-rose-300">✕</span>}
              </button>
            );
          })}
        </div>

        {selected && (
          <p className="mt-3 text-xs text-slate-400">
            {selected.correct
              ? '✓ Correct — nice.'
              : `✗ The answer was ${String.fromCharCode(65 + q.correctIndex)}. Next one coming…`}
          </p>
        )}

        {!selected && (
          <p className="mt-3 text-[11px] text-slate-500">
            Tap an answer to record it — question changes in {seconds}s.
          </p>
        )}
      </div>

      {showHistory && (
        <div className="mt-4 pt-3 border-t border-white/10 max-h-72 overflow-y-auto space-y-2.5" aria-label="Question history">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Previous questions ({history.length}) — {seenCount} seen this session
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing recorded yet — answer a question to see it here.</p>
          ) : (
            history.map((h, i) => {
              const hLabel = KIND_LABELS[h.kind] || KIND_LABELS.mcq;
              return (
                <div key={`${h.id}-${i}`} className="glass rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                      style={{ color: hLabel.color, borderColor: `${hLabel.color}55` }}
                    >
                      {h.kind.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-500">{new Date(h.at).toLocaleTimeString()}</span>
                    <span className={`ml-auto text-[11px] font-bold ${h.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {h.correct ? '✓ Correct' : '✗ Missed'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-200 leading-snug">{h.question}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    <span className={h.correct ? 'text-emerald-300' : 'text-slate-400'}>
                      {String.fromCharCode(65 + h.chosen)}. {h.options[h.chosen] ?? ''}
                    </span>
                    {!h.correct && (
                      <span className="text-emerald-300/80"> · answer: {String.fromCharCode(65 + h.correctIndex)}. {h.options[h.correctIndex] ?? ''}</span>
                    )}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}