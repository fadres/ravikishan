// Zero-dependency SVG charts for AI tool results — no chart library needed,
// they match the app's dark glass aesthetic and stay small.

// Round 0-100 score into a verdict colour used across the AI page.
export function scoreColor(score) {
  if (score >= 70) return '#34d399'; // emerald — good
  if (score >= 40) return '#fbbf24'; // amber — partial
  return '#fb7185'; // rose — weak
}

export function scoreLabel(score) {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Partial';
  return 'Needs work';
}

// Circular gauge — used for check-answer score. Pure SVG, no deps.
export function ScoreGauge({ score, size = 120, label }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const color = scoreColor(clamped);
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${clamped}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
        <text x="50%" y="47%" textAnchor="middle" className="fill-white" style={{ fontSize: size * 0.19, fontWeight: 800 }}>
          {clamped}%
        </text>
        <text x="50%" y="66%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: size * 0.075, letterSpacing: 1 }}>
          {scoreLabel(clamped)}
        </text>
      </svg>
      {label && <p className="text-sm text-slate-400 leading-relaxed">{label}</p>}
    </div>
  );
}

// Horizontal match bars — used for doubt-solver sources. Rows: label + bar + %.
export function MatchBars({ items, max = 100, color = '#38bdf8' }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const value = Math.max(0, Math.min(max, Number(item.value) || 0));
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 truncate font-medium">{item.label}</span>
              <span className="font-bold shrink-0" style={{ color: scoreColor(value) }}>{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(90deg, ${color}55, ${color})`,
                  transition: 'width .8s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Two-bar comparison — used for summarize (input words → output words).
export function CompressionChart({ before, after, beforeLabel = 'Full notes', afterLabel = 'Summary' }) {
  const maxVal = Math.max(1, before, after);
  return (
    <div className="space-y-2.5">
      {[
        { label: beforeLabel, value: before, color: '#64748b' },
        { label: afterLabel, value: after, color: '#38bdf8' },
      ].map((row) => {
        const pct = Math.max(4, Math.round((row.value / maxVal) * 100));
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 font-medium">{row.label}</span>
              <span className="text-slate-400 font-bold shrink-0">{row.value.toLocaleString()} words</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: row.color, transition: 'width .8s ease' }}
              />
            </div>
          </div>
        );
      })}
      {before > 0 && (
        <p className="text-[11px] text-slate-500 pt-1">
          Compressed to {Math.round((after / before) * 100)}% of the original.
        </p>
      )}
    </div>
  );
}
