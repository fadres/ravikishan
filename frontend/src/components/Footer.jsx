import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/class/class-11', label: 'Subjects' },
  { to: '/login', label: 'Log in' },
];

const INSTAGRAM_URL = 'https://www.instagram.com/___unxknown___player';

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 text-center">
        <nav className="flex items-center justify-center gap-3 flex-wrap text-sm">
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

        <p className="mt-6 text-sm text-slate-400">
          © {year}{' '}
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
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
          </svg>{' '}
          <span className="font-bold text-gradient-purple">Creator ~ Owner: Ravikishan</span>
        </p>

        <p className="mt-4 max-w-2xl mx-auto text-xs leading-relaxed text-slate-500">
          Made with curiosity by Ravikishan. All rights reserved. Its your time to shine and make a
          difference! We are committed to delivering the best experience for our audience. We value
          your feedback and suggestions. Stay connected with us for the latest updates and news.
        </p>

        <p className="mt-3 max-w-2xl mx-auto text-xs leading-relaxed text-slate-500">
          Together, we can achieve greatness! Your journey with us is just beginning. Let's make
          every moment count! We are excited to have you on board! Let's explore new horizons
          together! Your creativity is our inspiration. Let's build a brighter future together!
        </p>

        <p className="mt-3 max-w-2xl mx-auto text-xs leading-relaxed text-slate-500">
          Join us on this journey of innovation and creativity! Let's build something amazing
          together! Thank you for visiting our website. We hope you enjoy your experience here.
          Stay tuned for more updates and exciting features coming soon! Follow us on social media
          for the latest news and announcements. We appreciate your support and feedback.

        </p>
        <p className="mt-3 max-w-2xl mx-auto text-xs leading-relaxed text-slate-500">
          Keep learning, keep growing!{' '}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-aqua-300 hover:text-aqua-100 font-semibold transition"
          >
            <InstagramIcon />
            @___unxknown___player
          </a>
        </p>

        <p className="mt-7 text-sm text-slate-400">
          Designed and developed by{' '}
          <span className="glow-gold text-lg font-extrabold">Ravikishan</span>
        </p>
      </div>
    </footer>
  );
}
