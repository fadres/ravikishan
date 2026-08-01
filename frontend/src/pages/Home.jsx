import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import SubjectIcon from '../components/SubjectIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { streakDays } from '../utils/streak.js';

const IDIOMS = [
  { text: 'Practice makes perfect.', author: 'Proverb' },
  { text: 'Knowledge is power.', author: 'Francis Bacon' },
  { text: 'Slow and steady wins the race.', author: 'Aesop' },
  { text: "Where there's a will, there's a way.", author: 'Proverb' },
  { text: 'The early bird catches the worm.', author: 'Proverb' },
  { text: "Rome wasn't built in a day.", author: 'Proverb' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Little strokes fell great oaks.', author: 'Benjamin Franklin' },
  { text: 'Success is a journey, not a destination.', author: 'Proverb' },
  { text: "It always seems impossible until it's done.", author: 'Nelson Mandela' },
  { text: 'Mistakes are proof that you are trying.', author: 'Proverb' },
  { text: 'The best time to plant a tree was 20 years ago.', author: 'Chinese Proverb' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'The more you learn, the more you earn.', author: 'Proverb' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' },
  { text: 'Today a reader, tomorrow a leader.', author: 'Proverb' },
  { text: 'Action speaks louder than words.', author: 'Proverb' },
  { text: 'Well begun is half done.', author: 'Aristotle' },
  { text: 'No pain, no gain.', author: 'Proverb' },
  { text: 'Every cloud has a silver lining.', author: 'Proverb' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Your only limit is your mind.', author: 'Proverb' },
  { text: 'Don\'t watch the clock; keep going.', author: 'Sam Levenson' },
  { text: 'Education is the most powerful weapon to change the world.', author: 'Nelson Mandela' },
  { text: 'Small steps every day lead to big results.', author: 'Proverb' },
  { text: 'Study hard, dream big.', author: 'Proverb' },
  { text: 'Reading is to the mind what exercise is to the body.', author: 'Joseph Addison' },
  { text: 'Start where you are; use what you have; do what you can.', author: 'Arthur Ashe' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Better late than never.', author: 'Proverb' },
];

function IdiomsStrip() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * IDIOMS.length));
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % IDIOMS.length), 6000);
    return () => clearInterval(timer);
  }, []);
  const idiom = IDIOMS[index];
  return (
    <section className="glass rounded-2xl px-5 py-4 mt-5 flex items-center gap-4" aria-label="Daily wisdom">
      <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-indigo-950">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M9.6 4c-4.2.8-7 4-7 8.6 0 1.6.4 3.4 1.3 4.9.6-1.2.9-2.4 1-3.7-2.6-1-3-2.6-3-4.1 0-2.9 2.4-5 5.7-5.7L9.6 4zm9 0c-4.2.8-7 4-7 8.6 0 1.6.4 3.4 1.3 4.9.6-1.2.9-2.4 1-3.7-2.6-1-3-2.6-3-4.1 0-2.9 2.4-5 5.7-5.7L18.6 4z" />
        </svg>
      </span>
      <div key={index} className="idiom-fade min-w-0">
        <p className="text-sm sm:text-base font-semibold text-white leading-snug">“{idiom.text}”</p>
        <p className="text-xs text-aqua-300 mt-0.5">— {idiom.author}</p>
      </div>
    </section>
  );
}

// Growing tree with leaves — "Improvement is Life".
function TreeIcon({ size = 34 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M32 58V36" stroke="#34d399" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 42c-2.2 4-2.2 7.4 0 10.6 2.2-3.2 2.2-6.6 0-10.6z" fill="#6ee7b7" />
      <path d="M22 30c-7.5-3-10.6-8.5-9.5-14 6.4-1 12 1 15 6.5 1.2-7.2 5.4-12.6 12-13.6 2.2 6.2-1 11.8-6.5 14.8 6.4 1.7 9.8 6.2 9.8 11.8-7.8.8-14.2-1.6-18.8-5.5" fill="#22c55e" />
      <path d="M20 33c-8.8 1-13 6.5-12 12 8.6 0 14.2-3.2 17-8.6 2.4 7.4 7.8 11.6 15.5 11.6 0-7.6-3.4-13-9-15.4" fill="#10b981" />
      <circle cx="45" cy="11" r="4.4" fill="#4ade80" />
      <path d="M11 59h42" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

const SUBJECT_ACCENTS = {
  physics: { color: '#38bdf8', glow: 'rgba(56,189,248,0.5)' },
  chemistry: { color: '#2dd4bf', glow: 'rgba(45,212,191,0.5)' },
  biology: { color: '#f472b6', glow: 'rgba(244,114,182,0.5)' },
  mathematics: { color: '#fb923c', glow: 'rgba(251,146,60,0.5)' },
  english: { color: '#60a5fa', glow: 'rgba(96,165,250,0.5)' },
  nepali: { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  loksewa: { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  'general-knowledge': { color: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
};

const SUBJECT_BLURBS = {
  physics: 'Learn concepts, formulas and solve numerical problems.',
  chemistry: 'Understand reactions, equations and chemical concepts.',
  biology: 'Explore life, organisms and biological processes.',
  mathematics: 'Practice equations, theorems and problem solving.',
  english: 'Improve grammar, vocabulary and comprehension.',
  nepali: 'Learn grammar, literature and language skills.',
  loksewa: 'Prepare for Loksewa exams with key facts and concepts.',
  'general-knowledge': 'Sharpen general awareness, facts and current affairs.',
};

function CustomSubjects({ subjectSlug, accent, canManage }) {
  const [items, setItems] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/api/subjects/${subjectSlug}/custom`)
      .then((d) => setItems(d.customSubjects || []))
      .catch(() => setItems([]));
  }, [subjectSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const saveEdit = async (id) => {
    const name = editName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api(`/api/subjects/${subjectSlug}/custom/${id}`, { method: 'PATCH', body: { name } });
      setEditingId(null);
      load();
    } catch {
      /* keep the input open so the user can fix it */
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api(`/api/subjects/${subjectSlug}/custom`, { method: 'POST', body: { name } });
      setNewName('');
      setAdding(false);
      load();
    } catch {
      /* keep the input open */
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = async (id) => {
    if (busy || !window.confirm('Delete this custom subject?')) return;
    setBusy(true);
    try {
      await api(`/api/subjects/${subjectSlug}/custom/${id}`, { method: 'DELETE' });
      load();
    } catch {
      /* nothing to do */
    } finally {
      setBusy(false);
    }
  };

  if (items === null) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
          Custom Subjects
        </p>
        {canManage && !adding && items.length < 12 && (
          <button
            onClick={() => setAdding(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-aqua-400/15 text-aqua-300 hover:bg-aqua-400/25 transition"
          >
            + Add
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <p className="text-xs text-slate-500">No custom subjects yet.</p>
      )}

      {adding && (
        <div className="flex items-center gap-2 mb-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Subject name"
            maxLength={60}
            className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-aqua-400/60"
          />
          <button
            onClick={addCustom}
            aria-label="Save subject"
            className="w-8 h-8 shrink-0 rounded-lg bg-aqua-400/20 border border-aqua-400/40 text-aqua-200 hover:bg-aqua-400/35 transition flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </button>
          <button
            onClick={() => {
              setAdding(false);
              setNewName('');
            }}
            aria-label="Cancel"
            className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/15 text-slate-300 hover:bg-white/15 transition flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c) => {
          const editing = editingId === c.id;
          return (
            <div key={c.id} className="glass rounded-xl p-3.5 relative group">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)}
                    maxLength={60}
                    className="w-full min-w-0 bg-transparent border border-white/20 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-aqua-400/60"
                  />
                  <button
                    onClick={() => saveEdit(c.id)}
                    aria-label="Save name"
                    className="p-1 rounded-md text-aqua-300 hover:bg-white/10 transition"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                    className="p-1 rounded-md text-slate-400 hover:bg-white/10 transition"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 pr-8">
                    <span
                      className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold uppercase"
                      style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
                    >
                      {c.name.slice(0, 2)}
                    </span>
                    <span className="text-sm font-semibold text-white truncate">{c.name}</span>
                  </div>
                  {canManage && (
                    <span className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEdit(c)}
                        title="Rename"
                        className="p-1 rounded-md text-slate-400 hover:text-aqua-300 hover:bg-white/10 transition"
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h4l10-10-4-4L4 16v4z" />
                          <path d="M13.5 6.5l4 4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeCustom(c.id)}
                        title="Delete"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-300 hover:bg-white/10 transition"
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isAdmin } = useAuth();
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/classes')
      .then((d) => setClasses(d.classes))
      .catch(() => setError('Could not load classes.'));
  }, []);

  const class11 = classes.find((k) => k.slug === 'class-11');
  const subjects11 = class11?.subjects || [];
  const streak = streakDays();

  const loksewa = subjects11.find((s) => s.slug === 'loksewa');
  const gk = subjects11.find((s) => s.slug === 'general-knowledge');

  const subjectCard = (subject) => {
    const accent = SUBJECT_ACCENTS[subject.slug] || { color: subject.themeColor || '#38bdf8', glow: 'rgba(56,189,248,0.4)' };
    return (
      <Link
        key={subject.id}
        to={`/class/class-11/subject/${subject.slug}`}
        className="subject-card rounded-2xl p-5 flex flex-col"
        style={{ '--card-accent': accent.color }}
      >
        <div className="flex items-start justify-between">
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${accent.color}1f`, border: `1px solid ${accent.color}55`, color: accent.color }}
          >
            <SubjectIcon icon={subject.icon} size={26} />
          </span>
          <span
            className="w-9 h-9 rounded-full border flex items-center justify-center text-slate-300 hover:scale-110 transition"
            style={{ borderColor: `${accent.color}55`, color: accent.color }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
        <h3 className="text-lg font-bold mt-4" style={{ color: accent.color }}>{subject.name}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed flex-1">
          {SUBJECT_BLURBS[subject.slug] || `${subject._count.chapters} chapters curated.`}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span
            className="text-xs font-bold px-3.5 py-1.5 rounded-full"
            style={{ background: `${accent.color}1a`, color: accent.color, border: `1px solid ${accent.color}40` }}
          >
            Explore
          </span>
          <span className="text-[11px] text-slate-500">
            {subject._count.chapters} chapter{subject._count.chapters === 1 ? '' : 's'}
          </span>
        </div>
      </Link>
    );
  };

  const options = [
    {
      to: '/class/class-11',
      name: 'Class 11',
      desc: 'All subjects · NCE syllabus',
      meta: `${subjects11.length} subjects`,
      color: '#a78bfa',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      to: '/class/class-12',
      name: 'Class 12',
      desc: 'Higher secondary content',
      meta: 'Coming soon',
      color: '#60a5fa',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10L12 5 2 10l10 5 10-5z" />
          <path d="M6 12.5V18c0 1.5 2.7 3.5 6 3.5s6-2 6-3.5v-5.5" />
        </svg>
      ),
    },
    {
      to: '/class/class-11/subject/loksewa',
      name: 'Loksewa Knowledge',
      desc: 'Service commission prep',
      meta: loksewa ? `${loksewa._count.chapters} chapters` : '',
      color: '#f59e0b',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M8 6l-4 2c0 6 3 9 8 9s8-3 8-9l-4-2c0 3-1.5 4-4 4s-4-1-4-4z" />
          <path d="M6 12a6 6 0 0 0 12 0" opacity="0" />
        </svg>
      ),
    },
    {
      to: '/class/class-11/subject/general-knowledge',
      name: 'General Knowledge',
      desc: 'Awareness, facts & current affairs',
      meta: gk ? `${gk._count.chapters} chapters` : '',
      color: '#22d3ee',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Compact welcome */}
      <section className="glass rounded-2xl px-6 py-6 text-center relative overflow-hidden">
        <span
          aria-hidden="true"
          className="absolute -top-20 -right-16 w-64 h-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.35), transparent 70%)' }}
        />
        <div className="relative z-10">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 items-center justify-center shadow-lg shadow-emerald-500/25">
            <TreeIcon size={36} />
          </span>
          <h1 className="mt-3 text-xl sm:text-2xl font-extrabold text-white">
            Improvement is Life
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user ? `Keep growing, ${user.displayName || 'friend'}. ` : 'Small steps every day. '}
            Little by little, everything grows.
          </p>
          <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold px-3 py-1 rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/25">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c2.5 4.5 5 6.5 5 10a5 5 0 1 1-10 0c0-3.5 2.5-5.5 5-10z" />
            </svg>
            {streak} day{streak === 1 ? '' : 's'} streak
          </span>
        </div>
      </section>

      <IdiomsStrip />

      {/* Four main sections */}
      <section className="mt-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-aqua-400 to-emerald-500" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Choose Your Path</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {options.map((opt) => (
            <Link
              key={opt.to}
              to={opt.to}
              className="subject-card rounded-2xl p-5 flex flex-col"
              style={{ '--card-accent': opt.color }}
            >
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${opt.color}1f`, border: `1px solid ${opt.color}55`, color: opt.color }}
              >
                {opt.icon}
              </span>
              <h3 className="text-lg font-bold mt-4" style={{ color: opt.color }}>{opt.name}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed flex-1">{opt.desc}</p>
              <span
                className="mt-4 text-[11px] font-bold px-3 py-1.5 rounded-full self-start"
                style={{ background: `${opt.color}1a`, color: opt.color, border: `1px solid ${opt.color}40` }}
              >
                {opt.meta || 'Explore'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Class 11 — all content */}
      <section className="mt-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-600" aria-hidden="true" />
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#e879f9" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
              </svg>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">Class 11 · All Content</h2>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5 tracking-wide">
              {subjects11.length} subjects curated
            </p>
          </div>
          <Link
            to="/class/class-11"
            className="text-sm font-semibold text-aqua-300 hover:text-aqua-100 transition"
          >
            View all →
          </Link>
        </div>

        {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects11.map(subjectCard)}
        </div>
      </section>

      {/* Loksewa Knowledge */}
      {loksewa && (
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-6 rounded-full" style={{ background: SUBJECT_ACCENTS.loksewa.color }} aria-hidden="true" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">Loksewa Knowledge</h2>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Prepare for service commission exams
              </p>
            </div>
            <Link
              to="/class/class-11/subject/loksewa"
              className="text-sm font-semibold text-aqua-300 hover:text-aqua-100 transition"
            >
              Open →
            </Link>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5 flex items-center gap-4 flex-wrap">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `${SUBJECT_ACCENTS.loksewa.color}1f`,
                border: `1px solid ${SUBJECT_ACCENTS.loksewa.color}55`,
                color: SUBJECT_ACCENTS.loksewa.color,
              }}
            >
              <SubjectIcon icon={loksewa.icon} size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white">{loksewa.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {loksewa._count.chapters} chapters · {SUBJECT_BLURBS.loksewa}
              </p>
            </div>
            <Link
              to="/class/class-11/subject/loksewa"
              className="text-xs font-bold px-3.5 py-1.5 rounded-full"
              style={{
                background: `${SUBJECT_ACCENTS.loksewa.color}1a`,
                color: SUBJECT_ACCENTS.loksewa.color,
                border: `1px solid ${SUBJECT_ACCENTS.loksewa.color}40`,
              }}
            >
              Explore
            </Link>
          </div>
          <CustomSubjects subjectSlug="loksewa" accent={SUBJECT_ACCENTS.loksewa.color} canManage={isAdmin} />
        </section>
      )}

      {/* General Knowledge */}
      {gk && (
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-6 rounded-full" style={{ background: SUBJECT_ACCENTS['general-knowledge'].color }} aria-hidden="true" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">General Knowledge</h2>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Awareness, facts & current affairs
              </p>
            </div>
            <Link
              to="/class/class-11/subject/general-knowledge"
              className="text-sm font-semibold text-aqua-300 hover:text-aqua-100 transition"
            >
              Open →
            </Link>
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5 flex items-center gap-4 flex-wrap">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `${SUBJECT_ACCENTS['general-knowledge'].color}1f`,
                border: `1px solid ${SUBJECT_ACCENTS['general-knowledge'].color}55`,
                color: SUBJECT_ACCENTS['general-knowledge'].color,
              }}
            >
              <SubjectIcon icon={gk.icon} size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white">{gk.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {gk._count.chapters} chapters · {SUBJECT_BLURBS['general-knowledge']}
              </p>
            </div>
            <Link
              to="/class/class-11/subject/general-knowledge"
              className="text-xs font-bold px-3.5 py-1.5 rounded-full"
              style={{
                background: `${SUBJECT_ACCENTS['general-knowledge'].color}1a`,
                color: SUBJECT_ACCENTS['general-knowledge'].color,
                border: `1px solid ${SUBJECT_ACCENTS['general-knowledge'].color}40`,
              }}
            >
              Explore
            </Link>
          </div>
          <CustomSubjects subjectSlug="general-knowledge" accent={SUBJECT_ACCENTS['general-knowledge'].color} canManage={isAdmin} />
        </section>
      )}
    </div>
  );
}
