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
  return (
    <footer className="border-t border-white/10 py-8 px-4 text-center text-sm">
      <div className="max-w-2xl mx-auto space-y-3">
        <p className="text-base font-bold text-slate-200 tracking-wide">Ravikishan · Study Vault</p>
        <p className="text-slate-400">
          Contact:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-aqua-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.9)] hover:text-aqua-200 transition"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mx-auto max-w-xl text-slate-400">
          A free study vault built by a student for students — curated Class 11 &amp; 12 notes, quizzes, flashcards, a
          daily planner and AI study tools, made with curiosity so that every learner grows, little by little.
        </p>
        <p className="text-slate-300">
          Designed and developed by{' '}
          <span className="font-bold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]">
            Ravikishan
          </span>
        </p>
        <p className="pt-1 text-slate-400 italic tracking-wide">Knowledge is power</p>
      </div>
    </footer>
  );
}
