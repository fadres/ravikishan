import { Link, useLocation } from 'react-router-dom';

const META = {
  '/practice': { title: 'Practice', icon: '✏️', blurb: 'Worked numericals and problem sets for every subject are being prepared.' },
  '/tests': { title: 'Tests', icon: '✅', blurb: 'Timed tests and chapter quizzes are coming soon.' },
  '/flashcards': { title: 'Flashcards', icon: '🃏', blurb: 'Quick-recall flashcards for formulas and definitions are on the way.' },
  '/notes': { title: 'Notes', icon: '📄', blurb: 'Condensed revision notes are being organized here.' },
};

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const meta = META[pathname] || { title: 'Coming soon', icon: '🚧', blurb: 'This section is under construction.' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="glass-strong rounded-3xl p-10 sm:p-14">
        <span className="text-5xl" aria-hidden="true">{meta.icon}</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-4">{meta.title}</h1>
        <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">{meta.blurb}</p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
          >
            Back to home
          </Link>
          <Link
            to="/class/class-11"
            className="px-5 py-2.5 rounded-xl font-semibold text-aqua-100 border border-aqua-400/40 bg-aqua-400/10 hover:bg-aqua-400/20 transition"
          >
            Browse subjects
          </Link>
        </div>
      </div>
    </div>
  );
}
