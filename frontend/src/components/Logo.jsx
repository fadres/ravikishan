// Ocean-themed Ravikishan monogram logo. Reusable at any size.
export default function Logo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-label="Ravikishan logo"
      role="img"
    >
      <defs>
        <linearGradient id="rk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a2447" />
          <stop offset="0.55" stopColor="#0e3a6d" />
          <stop offset="1" stopColor="#0aa5c8" />
        </linearGradient>
        <linearGradient id="rk-text" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f7ff" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#rk-bg)" />
      <path
        d="M8 44 Q 16 36, 24 44 T 40 44 T 56 44"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        opacity="0.55"
        strokeLinecap="round"
      />
      <path
        d="M8 50 Q 16 42, 24 50 T 40 50 T 56 50"
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="2"
        opacity="0.35"
        strokeLinecap="round"
      />
      <circle cx="20" cy="16" r="2" fill="#7dd3fc" opacity="0.8" />
      <circle cx="46" cy="22" r="1.5" fill="#e0f7ff" opacity="0.7" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="26"
        fontWeight="800"
        fill="url(#rk-text)"
        letterSpacing="1"
      >
        RK
      </text>
    </svg>
  );
}
