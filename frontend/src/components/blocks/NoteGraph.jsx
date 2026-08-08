import { useMemo } from 'react';

// ── NoteGraph ───────────────────────────────────────────────────────────────
// Parametric SVG graph for `graph` blocks. Consumes a GraphSpec (stored in
// ContentBlock.diagramData.graph):
//
//   {
//     title, xLabel, yLabel, xUnit, yUnit,
//     curve: { type: 'parabola'|'sine'|'line'|'custom',
//              x0, y0, a, amplitude, frequency, points: [[x,y],…] },
//     peak: { x, y, label },
//     angle: { degrees, at: [x,y], label },
//     showGrid, dashedCurve,
//     domain: [min,max], range: [min,max],
//   }
//
// Colors come from CSS variables so it stays legible in dark mode; the
// viewBox keeps it responsive inside the note card.

const W = 420;
const H = 300;
const PAD = { left: 54, right: 20, top: 20, bottom: 40 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const AXIS = 'var(--color-slate-400, #94a3b8)';
const GRID = 'var(--color-slate-600, #475569)';
const CURVE = 'var(--color-aqua-300, #7dd3fc)';
const PEAK = 'var(--color-amber-300, #fcd34d)';
const ANGLE = 'var(--color-rose-300, #fda4af)';
const LABEL = 'var(--color-slate-300, #cbd5e1)';
const TICK = 'var(--color-slate-500, #64748b)';

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function genCurvePoints(spec, domain) {
  const [xMin, xMax] = domain;
  const width = xMax - xMin || 1;
  const curve = spec?.curve ?? {};
  const samples = 140;
  const pts = [];
  const n = Math.max(2, curve.points?.length ?? 0);
  for (let i = 0; i <= samples; i += 1) {
    const x = xMin + (width * i) / samples;
    let y = null;
    if (curve.type === 'custom' && n >= 2) {
      const sorted = [...curve.points].sort((a, b) => a[0] - b[0]);
      const first = sorted[0][0];
      const last = sorted[n - 1][0];
      if (x < first || x > last) continue;
      for (let j = 1; j < n; j += 1) {
        const [x0, y0] = sorted[j - 1];
        const [x1, y1] = sorted[j];
        if (x <= x1) {
          const t = (x - x0) / (x1 - x0 || 1);
          y = y0 + t * (y1 - y0);
          break;
        }
      }
    } else if (curve.type === 'parabola') {
      const x0 = curve.x0 ?? xMin + width / 2;
      const y0 = curve.y0 ?? 1;
      const k = curve.a ?? y0 / Math.max(0.0001, (Math.max(xMax - x0, x0 - xMin) ** 2 || 1));
      y = y0 - k * (x - x0) ** 2;
    } else if (curve.type === 'sine') {
      const y0 = curve.y0 ?? 0;
      const amp = curve.amplitude ?? 1;
      const f = curve.frequency ?? 1;
      y = y0 + amp * Math.sin((2 * Math.PI * f * (x - (curve.x0 ?? xMin))) / width);
    } else {
      // default 'line': y = y0 + a(x - x0)
      const x0 = curve.x0 ?? xMin;
      const y0 = curve.y0 ?? 0;
      const a = curve.a ?? 1;
      y = y0 + a * (x - x0);
    }
    if (y !== null) pts.push([x, y]);
  }
  return pts;
}

function toSvg(pts, domain, range) {
  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;
  const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * PLOT_W;
  const sy = (y) => PAD.top + ((yMax - y) / (yMax - yMin || 1)) * PLOT_H;
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`).join(' ');
  return { d, sx, sy };
}

function niceRange(curve, spec) {
  if (spec?.range) return spec.range;
  const rMax = Math.max(1, curve?.y0 ?? 1, curve?.amplitude ?? 0);
  return [0, rMax * 1.18];
}

function niceDomain(curve, spec) {
  if (spec?.domain) return spec.domain;
  const x0 = curve?.x0 ?? 1;
  const width = Math.max(1, x0 * 2);
  return [0, width];
}

export default function NoteGraph({ data }) {
  const spec = data ?? {};
  const curve = spec.curve ?? {};
  const domain = useMemo(() => niceDomain(curve, spec), [curve, spec]);
  const range = useMemo(() => niceRange(curve, spec), [curve, spec]);
  const pts = useMemo(() => genCurvePoints(spec, domain), [spec, domain]);

  if (!pts.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
        Graph data is empty or invalid.
      </div>
    );
  }

  const { d, sx, sy } = toSvg(pts, domain, range);
  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;
  const peak = spec.peak;
  const angle = spec.angle;
  const ticks = 5;
  const tickFmt = (v) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : String(Math.round(v * 100) / 100));

  const peakX = peak ? clamp(sx(peak.x), PAD.left + 8, W - PAD.right - 8) : null;
  const peakY = peak ? clamp(sy(peak.y), PAD.top + 10, H - PAD.bottom - 8) : null;

  const angleAt = angle?.at ?? [xMin + (xMax - xMin) / 4, 0];
  const aX = clamp(sx(angleAt[0]), PAD.left + 10, W - PAD.right - 10);
  const aY = clamp(sy(angleAt[1]), PAD.top + 8, H - PAD.bottom - 6);
  const arcR = Math.min(30, PLOT_H * 0.2);
  const theta = clamp(angle?.degrees ?? 45, -80, 80);
  const a0 = 180; // angle axis points toward +x (screen right)
  const a1 = 180 - theta;
  const arcStart = { x: aX + arcR * Math.cos((a0 * Math.PI) / 180), y: aY - arcR * Math.sin((a0 * Math.PI) / 180) };
  const arcEnd = { x: aX + arcR * Math.cos((a1 * Math.PI) / 180), y: aY - arcR * Math.sin((a1 * Math.PI) / 180) };
  const sweep = theta > 0 ? 1 : 0;
  const labelAng = ((a0 + a1) / 2) * (Math.PI / 180);
  const angLabelPos = { x: aX + (arcR + 14) * Math.cos(labelAng), y: aY - (arcR + 14) * Math.sin(labelAng) };

  const xUnit = spec.xUnit ? ` (${spec.xUnit})` : '';
  const yUnit = spec.yUnit ? ` (${spec.yUnit})` : '';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
      {spec.title && (
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">{spec.title}</p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={spec.title || 'Graph'}>
        {/* Grid (dotted) */}
        {spec.showGrid !== false &&
          Array.from({ length: ticks + 1 }, (_, i) => {
            const x = PAD.left + (PLOT_W * i) / ticks;
            const y = PAD.top + (PLOT_H * i) / ticks;
            return (
              <g key={i}>
                <line x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom} stroke={GRID} strokeWidth="1" strokeDasharray="1 5" opacity="0.5" />
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={GRID} strokeWidth="1" strokeDasharray="1 5" opacity="0.5" />
              </g>
            );
          })}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke={AXIS} strokeWidth="1.6" />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={AXIS} strokeWidth="1.6" />
        <path d={`M${PAD.left - 5} ${PAD.top + 6} L${PAD.left} ${PAD.top} L${PAD.left + 5} ${PAD.top + 6}`} fill="none" stroke={AXIS} strokeWidth="1.4" />
        <path d={`M${W - PAD.right - 6} ${H - PAD.bottom - 5} L${W - PAD.right} ${H - PAD.bottom} L${W - PAD.right - 6} ${H - PAD.bottom + 5}`} fill="none" stroke={AXIS} strokeWidth="1.4" />

        {/* Axis labels */}
        <text x={W - PAD.right - 2} y={PAD.top - 6} textAnchor="end" fill={LABEL} fontSize="11" fontWeight="600">
          {spec.yLabel ? `${spec.yLabel}${yUnit}` : 'y'}
        </text>
        <text x={PAD.left + PLOT_W / 2} y={H - 8} textAnchor="middle" fill={LABEL} fontSize="11" fontWeight="600">
          {spec.xLabel ? `${spec.xLabel}${xUnit}` : 'x'}
        </text>

        {/* Ticks */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const tvx = xMin + ((xMax - xMin) * i) / ticks;
          const tvy = yMin + ((yMax - yMin) * i) / ticks;
          return (
            <g key={i}>
              <line x1={PAD.left + (PLOT_W * i) / ticks} y1={H - PAD.bottom} x2={PAD.left + (PLOT_W * i) / ticks} y2={H - PAD.bottom + 4} stroke={AXIS} strokeWidth="1.2" />
              <text x={PAD.left + (PLOT_W * i) / ticks} y={H - PAD.bottom + 16} textAnchor="middle" fill={TICK} fontSize="9">
                {tickFmt(tvx)}
              </text>
              <line x1={PAD.left} y1={PAD.top + (PLOT_H * i) / ticks} x2={PAD.left - 4} y2={PAD.top + (PLOT_H * i) / ticks} stroke={AXIS} strokeWidth="1.2" />
              <text x={PAD.left - 6} y={PAD.top + (PLOT_H * i) / ticks + 3} textAnchor="end" fill={TICK} fontSize="9">
                {tickFmt(tvy)}
              </text>
            </g>
          );
        })}

        {/* Origin label */}
        <text x={PAD.left - 6} y={H - PAD.bottom + 16} textAnchor="end" fill={TICK} fontSize="9">
          0
        </text>

        {/* Curve */}
        <path d={d} fill="none" stroke={CURVE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={spec.dashedCurve ? '7 5' : undefined} />

        {/* Angle annotation */}
        {angle && (
          <g>
            <line x1={aX} y1={aY} x2={aX + arcR + 2} y2={aY} stroke={ANGLE} strokeWidth="1.2" />
            <path d={`M${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A${arcR} ${arcR} 0 0 ${sweep} ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)}`} fill="none" stroke={ANGLE} strokeWidth="1.6" />
            <text x={angLabelPos.x} y={angLabelPos.y} textAnchor="middle" fill={ANGLE} fontSize="11" fontWeight="700">
              {angle.label ?? `θ = ${angle.degrees}°`}
            </text>
          </g>
        )}

        {/* Peak point */}
        {peak && peakX !== null && peakY !== null && (
          <g>
            <line x1={peakX} y1={peakY} x2={peakX} y2={H - PAD.bottom} stroke={PEAK} strokeWidth="1.2" strokeDasharray="3 4" opacity="0.7" />
            <circle cx={peakX} cy={peakY} r="5" fill={PEAK} stroke="var(--color-deep-900, #0b1c33)" strokeWidth="2" />
            <text x={peakX + 10} y={peakY - 8} fill={PEAK} fontSize="11" fontWeight="700">
              {peak.label ?? `(${tickFmt(peak.x)}, ${tickFmt(peak.y)})`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
