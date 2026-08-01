import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import SubjectIcon from '../components/SubjectIcon.jsx';
import Logo from '../components/Logo.jsx';

export default function Home() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/classes')
      .then((d) => setClasses(d.classes))
      .catch(() => setError('Could not load classes.'));
  }, []);

  return (
    <div>
      {/* Gradient hero banner */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 1200 300" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0 220 Q 300 140, 600 210 T 1200 190 V 300 H 0 Z" fill="#04101f" opacity="0.5" />
            <path d="M0 250 Q 400 180, 800 240 T 1200 230 V 300 H 0 Z" fill="#071a33" opacity="0.6" />
          </svg>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 relative">
          <div className="flex items-center gap-3 mb-4">
            <Logo size={44} />
            <div>
              <p className="text-aqua-300 text-xs font-bold uppercase tracking-[0.2em]">Exam prep · Class 11 & 12</p>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-gradient leading-tight">
                Ravikishan's Home
              </h1>
            </div>
          </div>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base mt-3 leading-relaxed">
            Hand-curated notes, numericals, mind maps and grammar deep-dives —
            one quiet corner of the ocean for every subject.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/class/class-11"
              className="px-5 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
            >
              Explore Class 11
            </Link>
            <Link
              to="/class/class-12"
              className="px-5 py-2.5 rounded-xl font-semibold text-aqua-100 border border-aqua-400/40 bg-aqua-400/10 hover:bg-aqua-400/20 transition"
            >
              Class 12
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
        {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

        {classes.map((klass) => (
          <section key={klass.id} className="mb-12">
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
                  className="watermark glass rounded-2xl p-5 hover:border-aqua-400/40 hover:bg-white/8 transition group"
                  style={{
                    '--wm': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' fill='%23ffffff'%3E%3Ccircle cx='24' cy='24' r='20' fill='none' stroke='%23ffffff' stroke-width='2'/%3E%3Cpath d='M24 4c6 8 10 12 10 20s-4 12-10 20c-6-8-10-12-10-20S18 12 24 4z'/%3E%3C/svg%3E")`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <SubjectIcon icon={subject.icon} color={subject.themeColor} size={40} />
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 rounded-full px-2 py-0.5">
                      Free to browse
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-3 group-hover:text-aqua-100 transition">
                    {subject.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {subject._count.chapters} chapter{subject._count.chapters === 1 ? '' : 's'}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Info strip */}
        <section className="glass rounded-2xl p-6 sm:p-8 mt-4">
          <h3 className="text-lg font-bold text-white mb-3">How access works</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-300">
            <div className="flex gap-3">
              <span className="text-aqua-400 font-extrabold">01</span>
              <p>Browse freely — every subject, chapter and free section is visible and readable right away.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-aqua-400 font-extrabold">02</span>
              <p>Premium sections show a request card — send a short message to the owner, or write to them directly.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-aqua-400 font-extrabold">03</span>
              <p>Once approved you become a member and every member-level section unlocks for you.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
