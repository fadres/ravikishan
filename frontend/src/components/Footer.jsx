import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <p className="text-sm font-bold text-white">Study Board · v1.0.0</p>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link to="/" className="hover:text-aqua-300 transition">Home</Link>
            <Link to="/search" className="hover:text-aqua-300 transition">Search</Link>
            <Link to="/login" className="hover:text-aqua-300 transition">Log in</Link>
          </nav>
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 text-center space-y-1">
          <p className="text-sm text-slate-300">
            © {year} Ravikishan · <span className="font-semibold text-aqua-300">Owner: Ravikishan</span>
          </p>
          <p className="text-xs text-slate-500">Curated &amp; made with curiosity by Ravikishan. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
