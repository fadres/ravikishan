import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/class/class-11', label: 'Subjects' },
  { to: '/login', label: 'Log in' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 mt-16 relative overflow-hidden">
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
        </nav>

        <p className="mt-6 text-sm text-slate-400">
          © {year} Direction by{' '}
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
          for the latest news and announcements. We appreciate your support and feedback. Keep
          learning, keep growing!
        </p>

        <p className="mt-7 text-sm text-slate-400">
          Designed and developed by{' '}
          <span className="glow-gold text-lg font-extrabold">Ravikishan</span>
        </p>
      </div>
    </footer>
  );
}
