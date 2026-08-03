import { useEffect, useState } from 'react';

const MODES = [
  { id: 'focus', label: 'Focus', minutes: 25, ring: 'text-aqua-400' },
  { id: 'short', label: 'Short break', minutes: 5, ring: 'text-emerald-400' },
  { id: 'long', label: 'Long break', minutes: 15, ring: 'text-violet-400' },
];

function modeById(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}

export default function PomodoroPage() {
  const [mode, setMode] = useState('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(MODES[0].minutes * 60);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [focusCount, setFocusCount] = useState(0);

  const current = modeById(mode);
  const total = current.minutes * 60;

  useEffect(() => {
    setRemaining(total);
  }, [total]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (started && !running && remaining === 0) {
      if (mode === 'focus') {
        setCompleted((c) => c + 1);
        setFocusCount((f) => f + 1);
        setMode(focusCount + 1 >= 4 ? 'long' : 'short');
      } else {
        setMode('focus');
      }
      setStarted(false);
    }
  }, [started, running, remaining, mode, focusCount]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  const R = 118;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? remaining / total : 0;

  const selectMode = (id) => {
    setMode(id);
    setRunning(false);
    setStarted(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Pomodoro Timer</h1>
      <p className="text-sm text-slate-400 mb-8">
        Focus in 25-minute sprints, then rest. Four focus rounds earn a long break.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => selectMode(m.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              mode === m.id
                ? 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300'
                : 'text-slate-300 bg-white/5 hover:bg-white/10'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-10 mb-8">
        <div className="relative w-64 h-64 shrink-0">
          <svg viewBox="0 0 280 280" className="w-64 h-64 -rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${current.ring}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-black tabular-nums text-white">
              {mins}:{secs}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">{current.label}</p>
          </div>
        </div>

        <div className="flex-1 w-full max-w-sm">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">Session</p>
              <p className="text-xs text-slate-400">
                {focusCount} focus round{focusCount === 1 ? '' : 's'} completed
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (remaining === 0) {
                    setRemaining(total);
                    setRunning(true);
                    setStarted(true);
                  } else {
                    setRunning((r) => !r);
                    setStarted(true);
                  }
                }}
                className="flex-1 min-w-28 px-5 py-3 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:opacity-90 transition"
              >
                {running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setRunning(false);
                  setStarted(false);
                  setRemaining(total);
                }}
                className="px-5 py-3 rounded-xl font-bold text-slate-300 bg-white/5 border border-white/15 hover:bg-white/10 transition"
              >
                Reset
              </button>
            </div>
            <div className="flex items-center justify-between mt-5">
              <p className="text-xs text-slate-500">Rounds until long break</p>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`w-3 h-3 rounded-full border ${
                      i < focusCount % 4 ? 'bg-aqua-400 border-aqua-400' : 'border-white/25'
                    }`}
                  />
                ))}
              </div>
            </div>
            {completed > 0 && (
              <p className="mt-4 text-xs text-slate-400">Total sessions completed today: {completed}</p>
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 max-w-2xl">
        <h2 className="text-sm font-bold text-white mb-2">How it works</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Pick Focus and study until the ring completes. Then take a short break. After every four focus
          rounds the timer suggests a long break so your brain can fully recharge. The timer keeps running
          in the background while you scroll — switch tabs and come back.
        </p>
      </div>
    </div>
  );
}
