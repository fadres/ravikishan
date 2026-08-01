const CONTACT_EMAIL = 'harindarsah98172@gmail.com';

const RESOURCES = [
  {
    label: 'National Examination Board',
    desc: 'NEB Nepal — official site',
    href: 'https://neb.gov.np/',
  },
  {
    label: 'NEB Exam Schedule',
    desc: 'Class 11 & 12 timetable notices',
    href: 'https://neb.gov.np/exam-schedule',
  },
  {
    label: 'Public Service Commission',
    desc: 'Loksewa Aayog — official site',
    href: 'https://psc.gov.np/',
  },
  {
    label: 'Curriculum Development Centre',
    desc: 'CDC Nepal — curriculum & textbooks',
    href: 'https://moecdc.gov.np/',
  },
  {
    label: 'Ministry of Education, Science & Technology',
    desc: 'MOEST Nepal — official site',
    href: 'https://moest.gov.np/',
  },
];

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* About */}
          <div>
            <p className="text-sm font-bold text-white">
              About <span className="text-gradient-purple">Ravikishan</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 max-w-xs">
              A free study platform for Nepal — Class 11 & 12 NEB notes, Loksewa knowledge and
              general awareness, curated chapter by chapter for curious minds.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <span className="w-7 h-7 rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 flex items-center justify-center">
                <MailIcon />
              </span>
              <span>
                Contact email: <span className="glow-green font-bold text-sm">{CONTACT_EMAIL}</span>
              </span>
            </a>
          </div>

          {/* Official resources */}
          <div>
            <p className="text-sm font-bold text-white">Official Resources</p>
            <ul className="mt-3 space-y-2.5">
              {RESOURCES.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-2 text-xs text-slate-400 hover:text-aqua-300 transition"
                  >
                    <span className="mt-0.5 text-aqua-400/70 group-hover:text-aqua-300">
                      <ExternalIcon />
                    </span>
                    <span>
                      <span className="block font-semibold text-slate-300 group-hover:text-white transition">
                        {r.label}
                      </span>
                      <span className="block text-slate-500">{r.desc}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Mission */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-bold text-white">Our Promise</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Made with curiosity by Ravikishan. All rights reserved. Its your time to shine and
              make a difference! We are committed to delivering the best experience for our
              audience. We value your feedback and suggestions.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Together, we can achieve greatness! Your journey with us is just beginning. Let's
              make every moment count! Your creativity is our inspiration. Stay connected with us
              for the latest updates and news.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Keep learning, keep growing!
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-slate-400">
            © {year} Direction by{' '}
            <span className="font-bold text-gradient-purple">Creator ~ Owner: Ravikishan</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Designed and developed by{' '}
            <span className="glow-gold text-base font-extrabold">Ravikishan</span>
          </p>
          <p className="mt-2 text-[11px] italic tracking-widest text-slate-600">
            Knowledge is power
          </p>
        </div>
      </div>
    </footer>
  );
}
