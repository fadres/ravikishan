// Subject watermark icons — inline SVGs, tinted per subject theme color.

const ICONS = {
  orbit: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="24" cy="24" r="7" />
      <ellipse cx="24" cy="24" rx="21" ry="9" />
      <ellipse cx="24" cy="24" rx="21" ry="9" transform="rotate(60 24 24)" />
      <circle cx="42" cy="18" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 6h10M20 6v12L9 36a5 5 0 0 0 4.4 7.5h21.2A5 5 0 0 0 39 36L28 18V6" />
      <path d="M14 32h20" />
      <circle cx="24" cy="25" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="30" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  ruler: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="26" width="40" height="14" rx="3" transform="rotate(-8 24 33)" />
      <path d="M11 32.5l2-5.4M18 30.4l2-5.4M25 28.3l2-5.4M32 26.2l2-5.4" transform="rotate(-8 24 33)" />
    </svg>
  ),
  dna: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10 8c8 4 8 28 0 32M38 8c-8 4-8 28 0 32" />
      <path d="M12 16h24M10 24h28M12 32h24" opacity="0.7" />
      <circle cx="9" cy="40" r="2" fill="currentColor" stroke="none" />
      <circle cx="39" cy="8" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 12C19 7 12 7 6 9v28c6-2 13-2 18 3 5-5 12-5 18-3V9c-6-2-13-2-18 3z" />
      <path d="M24 12v28" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 34l-4 6 6-4L38 14a4.2 4.2 0 0 0-6-6L10 30z" />
      <path d="M28 12l8 8" />
    </svg>
  ),
  bookOpen: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9c7-2 13 0 18 4 5-4 11-6 18-4v30c-7-2-13 0-18 4-5-4-11-6-18-4z" />
      <path d="M24 13v27" />
    </svg>
  ),
};

export default function SubjectIcon({ icon, size = 44, color = '#7dd3fc', className = '' }) {
  const path = ICONS[icon] || ICONS.bookOpen;
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size, color }}
      aria-hidden="true"
    >
      {path}
    </span>
  );
}
