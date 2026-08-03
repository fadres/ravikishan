import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'rk_exams';

const PRESETS = [
  { id: 'see-2084', name: 'SEE Exam 2084', date: '2027-05-05' },
  { id: 'c11-2084', name: 'Class 11 Final Exam 2084', date: '2027-05-20' },
  { id: 'c12-2084', name: 'Class 12 Final Exam 2084', date: '2027-06-05' },
];

function loadExams() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch {
    /* ignore corrupt storage */
  }
  return PRESETS.map((p) => ({ ...p }));
}

function saveExams(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private mode — changes apply for this session only */
  }
}

function diffText(target) {
  const ms = target - Date.now();
  if (ms <= 0) return { passed: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { passed: false, days, hours, minutes, seconds };
}

export default function ExamCountdownPage() {
  const [exams, setExams] = useState(loadExams);
  const [form, setForm] = useState({ name: '', date: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    saveExams(exams);
  }, [exams]);

  const addExam = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) {
      setError('Give the exam a name and pick a date.');
      return;
    }
    setError('');
    setExams((prev) => [...prev, { id: `custom-${Date.now()}`, name: form.name.trim(), date: form.date }]);
    setForm({ name: '', date: '' });
  };

  const removeExam = (id) => setExams((prev) => prev.filter((x) => x.id !== id));

  const resetPresets = () => setExams(PRESETS.map((p) => ({ ...p })));

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cards = useMemo(() => {
    return exams.map((x) => ({ ...x, diff: diffText(new Date(`${x.date}T00:00:00`)) }));
  }, [exams, now]);

  const sorted = cards
    .filter((c) => !c.diff.passed)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const passed = cards.filter((c) => c.diff.passed);

  const tone = (days) => {
    if (days > 90) return 'text-aqua-300 border-aqua-400/50';
    if (days > 30) return 'text-amber-300 border-amber-400/50';
    return 'text-rose-300 border-rose-400/50';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Exam Countdown</h1>
      <p className="text-sm text-slate-400 mb-8">
        A live ticker for SEE and NEB finals. Add your own exams — everything stays on this device.
      </p>

      <form onSubmit={addExam} className="glass rounded-2xl p-4 mb-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Exam name, e.g. Pre-board 2084"
          className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aqua-400/60 [color-scheme:dark]"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:opacity-90 transition"
        >
          Add exam
        </button>
        {error && <p className="text-rose-300 text-sm md:col-span-3">{error}</p>}
      </form>

      {sorted.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => (
            <div key={c.id} className={`glass rounded-2xl p-5 border ${tone(c.diff.days)}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-white leading-snug">{c.name}</h2>
                <button
                  onClick={() => removeExam(c.id)}
                  aria-label={`Remove ${c.name}`}
                  className="shrink-0 w-6 h-6 rounded-full text-xs text-slate-400 hover:text-rose-300 hover:bg-white/10 transition"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(`${c.date}T00:00:00`).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-4 text-2xl font-black text-white tabular-nums">
                {c.diff.days} <span className="text-sm font-bold text-slate-400">days</span>
              </p>
              <p className="mt-1 text-xs text-slate-400 tabular-nums">
                {String(c.diff.hours).padStart(2, '0')}:{String(c.diff.minutes).padStart(2, '0')}:
                {String(c.diff.seconds).padStart(2, '0')} hours:minutes:seconds
              </p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wider">
                {c.diff.days > 90 ? 'Keep your pace' : c.diff.days > 30 ? 'Revise and revise' : 'It is crunch time'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">No upcoming exams. Add one above or restore the presets below.</p>
        </div>
      )}

      {passed.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Passed</h2>
          <div className="flex flex-wrap gap-2">
            {passed.map((c) => (
              <span key={c.id} className="px-3 py-1.5 rounded-full text-xs text-slate-500 bg-white/5 border border-white/10">
                {c.name} – passed
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={resetPresets}
        className="mt-8 text-xs font-bold text-slate-400 hover:text-aqua-300 transition"
      >
        Restore NEB / SEE defaults
      </button>
    </div>
  );
}