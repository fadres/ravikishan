// Shared card shell with color-coded left border + icon badge.
export default function BlockCard({ color, icon, label, children, className = '', glow = false }) {
  return (
    <div
      className={`glass rounded-2xl relative ${className}`}
      style={{
        borderLeft: `3px solid ${color}`,
        boxShadow: glow ? `0 0 30px -12px ${color}66` : undefined,
      }}
    >
      {label && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-1">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {icon}
          </span>
          <span
            className="text-[11px] uppercase tracking-widest font-bold"
            style={{ color }}
          >
            {label}
          </span>
        </div>
      )}
      <div className="px-5 pb-4 pt-1">{children}</div>
    </div>
  );
}

export const ICONS = {
  topic: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 5h16M4 12h16M4 19h10" />
    </svg>
  ),
  statement: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M6 4h12v8l-6 8-6-8z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
  example: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </svg>
  ),
  concept: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="3.2" />
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
    </svg>
  ),
  important: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M13 2L4.5 13.5H11L9.5 22 19.5 9.5H13z" strokeLinejoin="round" />
    </svg>
  ),
  numerical: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M8 3v18M16 3v18M3 8h18M3 16h18" strokeLinecap="round" />
    </svg>
  ),
  mindmap: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="4" cy="5" r="1.8" />
      <circle cx="20" cy="5" r="1.8" />
      <circle cx="4" cy="19" r="1.8" />
      <circle cx="20" cy="19" r="1.8" />
      <path d="M5.5 6.5l4.5 4M18.5 6.5L14 10.5M5.5 17.5l4.5-4M18.5 17.5L14 13.5" />
    </svg>
  ),
  compare: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 3v18M5 8h14M5 16h14" strokeLinecap="round" />
    </svg>
  ),
  summary: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
      <path d="M17 17h3v3h-3z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  ),
  keywords: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M3 12l9-9 9 9-9 9z" />
      <circle cx="15.5" cy="8.5" r="1.6" />
    </svg>
  ),
  points: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 19L4 5M4 19H20M4 19l3-3M4 19l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  byakaran: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 3c2 3 6 4.5 8 5-2 .5-6 2-8 5-2-3-6-4.5-8-5 2-.5 6-2 8-5zM12 13c2 3 6 4.5 8 5-2 .5-6 2-8 5-2-3-6-4.5-8-5 2-.5 6-2 8-5z" />
    </svg>
  ),
  formula: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 7h6M7 4v6M14 5l6 14M14 19l6-14M14 8h6M14 16h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  symbols: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M4 4v5M6.5 4v5M4 6.5h5M12 4l1.6 4L18 9l-4.4 1-1.6 4-1.6-4-4.4-1 4.4-1zM7 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  ),
};
