import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { sectionPath } from '../lib/sectionLinks.js';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: sectionPath('class-11'), label: 'Subjects' },
  { to: '/login', label: 'Log in' },
];

const INSTAGRAM_URL = 'https://www.instagram.com/___unxknown___player';

function InstagramIcon({ size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

// Small brand mark used in the copyright line — a forward arrow echoing the
// site's "moving forward" identity.
function BrandArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-text-bottom text-aqua-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.8)]"
      aria-hidden="true"
    >
      <path d="M2 12h16" />
      <path d="M13 6l6 6-6 6" />
      <path d="M8 6l6 6-6 6" opacity="0.45" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const { footerStyle } = useTheme();
  return (
    <footer className={`border-t border-white/10 mt-16 relative overflow-hidden ${footerStyle === 'frosted' ? 'footer-frosted' : ''}`}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aqua-400/70 to-transparent"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-28 left-1/2 -translate-x-1/2 w-[680px] h-52 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.55), transparent 70%)' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Quick links */}
        <nav aria-label="Footer navigation" className="flex items-center justify-center gap-2 flex-wrap text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-4 py-1.5 rounded-full glass text-slate-300 hover:text-white hover:border-aqua-400/50 transition"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full glass text-slate-300 hover:text-white hover:border-aqua-400/50 transition"
            aria-label="Ravikishan on Instagram"
          >
            <InstagramIcon />
            @___unxknown___player
          </a>
        </nav>

        {/* Brand line */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-slate-400 flex-wrap">
          <span>© {year}</span>
          <BrandArrow />
          <span className="font-bold text-gradient-purple">Creator ~ Owner: Ravikishan</span>
        </div>

        {/* Owner intro + accreditation — side by side on desktop, stacked on mobile */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 md:items-stretch">
          {/* Owner introduction — Owner · Developer */}
          <div className="rounded-2xl glass-strong p-5 text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-aqua-400 to-aqua-300 text-deep-900 font-black text-xl flex items-center justify-center shrink-0 shadow-[0_0_18px_-4px_rgba(56,189,248,0.7)]">
                R
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest font-bold text-aqua-300">
                  Meet the creator
                </p>
                <h3 className="glow-gold text-lg font-extrabold leading-tight">Ravikishan</h3>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-aqua-400/15 border border-aqua-400/35 text-aqua-200">
                Owner
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400/15 border border-emerald-400/35 text-emerald-200">
                Developer
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Ravikishan is the owner and developer of Study Vault. Every line of code, every
              curated note and every feature on this platform is built personally, driven by a
              single goal — helping every student master their NEB board exams with confidence.
            </p>
          </div>

          {/* Official accreditation — NEB / CDC */}
          <div className="rounded-2xl border border-white/10 p-5 text-left">
            <p className="text-[11px] uppercase tracking-widest font-bold text-aqua-300">
              Syllabus &amp; Curriculum
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Notes are designed and structured as per the syllabus prescribed by the{' '}
              <span className="font-semibold text-slate-200">National Examination Board (NEB)</span>,
              Sanothimi, Bhaktapur, and follow the curriculum developed and approved by the{' '}
              <span className="font-semibold text-slate-200">Curriculum Development Centre (CDC)</span>,
              under the Ministry of Education, Science and Technology. This site is not an official
              NEB or CDC product.
            </p>
            <dl className="mt-3 pt-3 border-t border-white/10 grid gap-2 text-left">
              <div>
                <dt className="text-[11px] font-bold text-slate-200">CDC — Curriculum Development Centre</dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  The professional body under the Ministry of Education, Science and Technology,
                  Sanothimi, Bhaktapur, that develops, reviews and approves the national school
                  curriculum, textbooks and study materials for Grades 1 to 12.
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold text-slate-200">NEB — National Examinations Board</dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  The statutory board based in Sanothimi, Bhaktapur that formulates the approved
                  syllabus, conducts the Grade 11 and 12 board examinations (and the previous SLC/SEE
                  era exams) and publishes the national results nationwide.
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Closing note */}
        <p className="mt-8 max-w-2xl mx-auto text-center text-xs leading-relaxed text-slate-500">
          Made with curiosity by Ravikishan. All rights reserved. We value your feedback and
          suggestions —{' '}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-aqua-300 hover:text-aqua-100 font-semibold transition"
          >
            <InstagramIcon size={11} />
            stay connected with us
          </a>{' '}
          for the latest updates. Keep learning, keep growing!
        </p>

        {/* Designed by */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Designed and developed by{' '}
          <span className="glow-gold text-lg font-extrabold">Ravikishan</span>
        </p>
      </div>
    </footer>
  );
}
