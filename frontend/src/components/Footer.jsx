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
    <footer className="border-t border-white/10 py-8 px-4 text-center text-sm text-slate-500">
      <p>Ravikishan · Study Vault · Contact: {CONTACT_EMAIL}</p>
    </footer>
  );
}
