import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import SubjectIcon from '../components/SubjectIcon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { streakDays } from '../utils/streak.js';

const IDIOMS = [
  { text: 'Practice makes perfect.', author: 'Proverb' },
  { text: 'Knowledge is power.', author: 'Francis Bacon' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: "Rome wasn't built in a day.", author: 'Proverb' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Slow and steady wins the race.', author: 'Aesop' },
  { text: 'Mistakes are proof that you are trying.', author: 'Proverb' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'The more you learn, the more you earn.', author: 'Proverb' },
  { text: 'Success is a journey, not a destination.', author: 'Proverb' },
];

function IdiomsStrip() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * IDIOMS.length));
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % IDIOMS.length), 7000);
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
        <p className="text-sm sm:text-base font-semibold text-white leading-snug">
          “{idiom.text}”
        </p>
        <p className="text-xs text-aqua-300 mt-0.5">— {idiom.author}</p>
      </div>
      <span className="ml-auto shrink-0 hidden sm:flex items-center gap-1.5">
        {IDIOMS.map((_, i) => (
          <button
            key={i}
            aria-label={`Show idiom ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition ${i === index ? 'bg-amber-400' : 'bg-white/25 hover:bg-white/40'}`}
          />
        ))}
      </span>
    </section>
  );
}

// Deterministic star field (fixed seed → no flicker between renders).
function makeStars(count, seed) {
  const stars = [];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < count; i += 1) {
    stars.push({
      left: rand() * 100,
      top: rand() * 100,
      size: 1 + rand() * 2.4,
      delay: rand() * 3,
      duration: 2 + rand() * 2.5,
      opacity: 0.35 + rand() * 0.65,
    });
  }
  return stars;
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

// Night study-desk illustration (purple/blue tones).
function DeskIllustration() {
  return (
    <svg viewBox="0 0 420 300" className="w-full max-w-md mx-auto" role="img" aria-label="Study desk at night">
      <defs>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Desk */}
      <rect x="40" y="230" width="340" height="14" rx="7" fill="#312e81" />
      <rect x="70" y="244" width="10" height="34" rx="4" fill="#312e81" />
      <rect x="340" y="244" width="10" height="34" rx="4" fill="#312e81" />

      {/* Books */}
      <rect x="52" y="204" width="70" height="26" rx="4" fill="#7c3aed" />
      <rect x="58" y="194" width="60" height="16" rx="4" fill="#3b82f6" />
      <rect x="66" y="182" width="46" height="15" rx="4" fill="#a78bfa" />

      {/* Plant */}
      <rect x="126" y="212" width="22" height="18" rx="6" fill="#1e3a8a" />
      <path d="M137 212c-2-14-10-22-10-22s10-2 12 8c2-8 12-8 12-8s-8 8-10 22" fill="#34d399" />
      <path d="M137 210c0-12-6-20-6-20s6-4 8 2c2-6 8-6 8-6s-4 8-6 20" fill="#10b981" />

      {/* Mug with steam */}
      <rect x="330" y="206" width="26" height="24" rx="5" fill="#6366f1" />
      <path d="M356 210h8a6 6 0 0 1 0 12h-8" fill="none" stroke="#6366f1" strokeWidth="4" />
      <path d="M336 200c-1-5 2-8 0-12M346 200c-1-5 2-8 0-12" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

      {/* Laptop */}
      <rect x="196" y="176" width="116" height="74" rx="8" fill="#1e1b4b" />
      <rect x="203" y="183" width="102" height="58" rx="4" fill="#4338ca" />
      <rect x="203" y="183" width="102" height="58" rx="4" fill="url(#lampGlow)" />
      {/* Apple logo */}
      <path
        d="M250 218c-7-1-12 5-17 3 1-6 6-9 12-9 5 0 9 3 11 6 4-2 9-2 13 1 5 3 7 8 8 13-7 1-11 4-14 8 5 4 11 5 15 3-3 8-9 14-15 12-4 0-8-3-13-3s-9 3-13 3c-7-1-12-8-14-15-4-12 2-26 12-30 4 1 8 3 9 5"
        fill="#c4b5fd"
      />
      <rect x="238" y="250" width="32" height="6" rx="3" fill="#312e81" />
      <rect x="196" y="250" width="116" height="7" rx="4" fill="#4338ca" />

      {/* Desk lamp */}
      <path d="M300 252l4-30 40-10 14 18-40 10z" fill="#6366f1" />
      <path d="M304 222l26-16 26 12-22 18z" fill="#a5b4fc" />
      <ellipse cx="316" cy="224" rx="70" ry="55" fill="url(#lampGlow)" />
      <rect x="300" y="252" width="6" height="28" rx="3" fill="#4f46e5" />
      <rect x="274" y="276" width="60" height="8" rx="4" fill="#3730a3" />
    </svg>
  );
}

function StatCard({ icon, bg, label, value, caption, to }) {
  return (
    <Link
      to={to}
      className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/8 transition min-w-0"
    >
      <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white ${bg}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold">{label}</span>
        <span className="block text-lg font-extrabold text-white leading-tight">{value}</span>
        <span className="block text-xs text-aqua-300">{caption}</span>
      </span>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const stars = useMemo(() => makeStars(42, 7), []);

  useEffect(() => {
    api('/api/classes')
      .then((d) => setClasses(d.classes))
      .catch(() => setError('Could not load classes.'));
  }, []);

  const class11 = classes.find((k) => k.slug === 'class-11');
  const other = classes.filter((k) => k.slug !== 'class-11');
  const subjects11 = class11?.subjects || [];
  const streak = streakDays();

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
          <span className="w-9 h-9 rounded-full border flex items-center justify-center text-slate-300 hover:scale-110 transition"
            style={{ borderColor: `${accent.color}55`, color: accent.color }}>
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Night-sky hero */}
      <section className="nebula-banner rounded-3xl">
        <div className="shooting-star" aria-hidden="true" />
        <div aria-hidden="true">
          {stars.map((s, i) => (
            <span
              key={i}
              className="star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                opacity: s.opacity,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            />
          ))}
        </div>
        <div className="relative grid lg:grid-cols-5 gap-8 p-6 sm:p-10 items-center">
          <div className="lg:col-span-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              Welcome back, {user?.displayName || 'Ravikishan'}! 👋
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2">
              Keep learning, stay consistent and achieve your goals.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                to="/class/class-11"
                icon={
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 6c-2.5-2.5-6.5-2.5-9-1v14c2.5-1.5 6.5-1.5 9 1 2.5-2.5 6.5-2.5 9-1V5c-2.5-1.5-6.5-1.5-9 1z" />
                    <path d="M12 6v14" />
                  </svg>
                }
                bg="bg-gradient-to-br from-purple-500 to-indigo-500"
                label="Subjects"
                value={subjects11.length || 6}
                caption="Explore all"
              />
              <StatCard
                to="/class/class-11"
                icon={
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="4" width="14" height="17" rx="2" />
                    <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                }
                bg="bg-gradient-to-br from-emerald-500 to-teal-500"
                label="Quizzes Solved"
                value="24"
                caption="View subjects"
              />
              <StatCard
                to="/class/class-11"
                icon={
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2c2.5 4.5 5 6.5 5 10a5 5 0 1 1-10 0c0-3.5 2.5-5.5 5-10z" />
                  </svg>
                }
                bg="bg-gradient-to-br from-orange-500 to-rose-500"
                label="Study Streak"
                value={`${streak} day${streak === 1 ? '' : 's'}`}
                caption="Keep it up!"
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <DeskIllustration />
          </div>
        </div>
      </section>

      <IdiomsStrip />

      {/* Explore Subjects */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-600" aria-hidden="true" />
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#e879f9" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
          </svg>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Explore Subjects</h2>
        </div>

        {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects11.map(subjectCard)}
        </div>

        {other.map((klass) => (
          <section key={klass.id} className="mt-10">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {klass.name}
                <span className="block text-xs font-semibold text-slate-400 mt-0.5 tracking-wide">
                  {klass.subjects.length} subjects curated
                </span>
              </h2>
              <Link
                to={`/class/${klass.slug}`}
                className="text-sm font-semibold text-aqua-300 hover:text-aqua-100 transition"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {klass.subjects.map((subject) => (
                <Link
                  key={subject.id}
                  to={`/class/${klass.slug}/subject/${subject.slug}`}
                  className="subject-card rounded-2xl p-5 flex flex-col"
                  style={{ '--card-accent': SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor || '#38bdf8' }}
                >
                  <div className="flex items-start justify-between">
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor}1f`, border: `1px solid ${SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor}55`, color: SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor }}>
                      <SubjectIcon icon={subject.icon} size={26} />
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {subject._count.chapters} chapter{subject._count.chapters === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mt-4" style={{ color: SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor }}>
                    {subject.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed flex-1">
                    {SUBJECT_BLURBS[subject.slug] || `${subject._count.chapters} chapters curated.`}
                  </p>
                  <span className="mt-4 text-xs font-bold px-3.5 py-1.5 rounded-full self-start"
                    style={{ background: `${SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor}1a`, color: SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor, border: `1px solid ${SUBJECT_ACCENTS[subject.slug]?.color || subject.themeColor}40` }}>
                    Explore
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
