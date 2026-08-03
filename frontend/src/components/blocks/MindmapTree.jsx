import { useEffect, useRef, useState } from 'react';

// ── Mind map design system ────────────────────────────────────────────────
// Every mind map follows these rules automatically — current content AND all
// future additions:
//   • each box is 7× larger than the base text-fit size (BOX_SCALE = 7)
//   • label letters are 3× smaller (FONT_DIVISOR = 3, floor MIN_FONT)
//   • labels auto-fit inside their box, so text never overflows → boxes
//     never overlap
//   • pinch (touch) or wheel (desktop) expands and contracts the whole map
//     from the fitted view up to MAX_ZOOM, and dragging pans around it
// ──────────────────────────────────────────────────────────────────────────

const BOX_SCALE = 7; // box size multiplier (7× larger)
const FONT_DIVISOR = 3; // font divisor (3× smaller letters)
const MIN_FONT = 5; // absolute minimum label size
const MAX_ZOOM = 8; // how far the map can expand on pinch/wheel

const NODE_H = 34 * BOX_SCALE; // 238px tall boxes
const SIBLING_GAP = 18 * BOX_SCALE; // spacing between sibling boxes
const LEVEL_GAP = 18 * BOX_SCALE; // vertical spacing between levels

function textLen(s) {
  return [...String(s)].length;
}

// Box dimensions come from the label length, then the system scales them.
// Because this runs per node at render time, every new mind map that gets
// uploaded automatically follows the same rules.
function boxFor(name) {
  const len = textLen(name);
  const base = Math.min(320, Math.max(104, 24 + len * 6.6));
  return { width: Math.round(base * BOX_SCALE), font: Math.max(MIN_FONT, 12.5 / FONT_DIVISOR) };
}

// In-order leaf placement: each leaf is centred at the current cursor and the
// cursor advances by its own width + gap, so sibling boxes never overlap.
function layout(node, collapsed = new Set(), walk = { cursor: 0 }) {
  const children = node.children && node.children.length && !collapsed.has(node.name) ? node.children : [];
  if (!children.length) {
    const meta = boxFor(node.name);
    const x = walk.cursor + meta.width / 2;
    walk.cursor += meta.width + SIBLING_GAP;
    return { meta, x, children: [], node };
  }
  const childNodes = children.map((c) => layout(c, collapsed, walk));
  const x = childNodes.reduce((s, c) => s + c.x, 0) / childNodes.length;
  return { meta: boxFor(node.name), x, children: childNodes, node };
}

export default function MindmapTree({ data }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [mode, setMode] = useState('fit'); // 'fit' | 'scroll'

  const tree = data ? layout(data, collapsed) : null;
  if (!tree) return <p className="text-slate-400 text-sm">No mind map data.</p>;

  const nodes = [];
  const edges = [];

  const walk = (entry, depth, parentKey) => {
    const key = parentKey ? `${parentKey} > ${entry.node.name}` : entry.node.name;
    const y = depth * (NODE_H + LEVEL_GAP);
    nodes.push({
      key,
      name: entry.node.name,
      x: entry.x,
      y,
      width: entry.meta.width,
      font: entry.meta.font,
      isCollapsed: collapsed.has(key),
      hasChildren: entry.children.length > 0,
    });
    if (parentKey) edges.push({ from: parentKey, to: key });
    if (!collapsed.has(key)) {
      for (const child of entry.children) walk(child, depth + 1, key);
    }
  };
  walk(tree, 0, null);

  // Canvas is inset to the whole tree so the viewBox fits the content exactly.
  const left = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const right = Math.max(...nodes.map((n) => n.x + n.width / 2));
  const bottom = Math.max(...nodes.map((n) => n.y + NODE_H));
  const shiftX = 30 - left;
  const width = right - left + 60;
  const height = bottom + 50;

  const toggleNode = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const edgePath = (from, to) => {
    const a = nodes.find((n) => n.key === from);
    const b = nodes.find((n) => n.key === to);
    const x1 = a.x + shiftX;
    const y1 = a.y + NODE_H;
    const x2 = b.x + shiftX;
    const y2 = b.y;
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  const arrow = (to) => {
    const b = nodes.find((n) => n.key === to);
    return `translate(${b.x + shiftX} ${b.y - 2}) rotate(180)`;
  };

  const svg = (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {edges.map((e, i) => (
        <g key={i}>
          <path d={edgePath(e.from, e.to)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="2" />
          <circle r="3" fill="rgba(125,211,252,0.5)" transform={arrow(e.to)} />
        </g>
      ))}
      {nodes.map((n) => {
        const isRoot = n.key === tree.node.name;
        const estTextWidth = textLen(n.name) * n.font * 0.62;
        const fitText = estTextWidth > n.width - 24 ? n.width - 24 : undefined;
        return (
          <g
            key={n.key}
            transform={`translate(${n.x + shiftX}, ${n.y})`}
            className="cursor-pointer"
            onClick={() => n.hasChildren && toggleNode(n.key)}
          >
            <title>{n.name}</title>
            <rect
              x={-n.width / 2}
              width={n.width}
              height={NODE_H}
              rx={22}
              fill={isRoot ? 'rgba(56,189,248,0.16)' : 'rgba(255,255,255,0.05)'}
              stroke={isRoot ? 'rgba(56,189,248,0.6)' : 'rgba(255,255,255,0.15)'}
              strokeWidth={2}
            />
            <text
              x={0}
              y={NODE_H / 2 + 3}
              textAnchor="middle"
              fill={isRoot ? '#7dd3fc' : '#e2e8f0'}
              fontSize={n.font}
              fontWeight={isRoot ? 700 : 500}
              textLength={fitText}
              lengthAdjust="spacingAndGlyphs"
            >
              {n.name}
            </text>
            {n.hasChildren && (
              <text
                x={n.width / 2 - 22}
                y={NODE_H / 2 + 7}
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize={16}
                fontWeight={700}
              >
                {n.isCollapsed ? '+' : '−'}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  const bar = (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        {mode === 'fit' ? 'Fit to screen' : 'Full size'}
      </span>
      <span className="text-[10px] text-slate-500">
        Bigger boxes · tiny labels — pinch / wheel to expand, drag to pan
      </span>
      <div className="flex gap-1.5 ml-auto">
        <button
          onClick={() => setMode('fit')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
            mode === 'fit' ? 'bg-aqua-400/20 border-aqua-400/60 text-aqua-200' : 'border-white/15 text-slate-300 hover:bg-white/10'
          }`}
        >
          Fit
        </button>
        <button
          onClick={() => setMode('scroll')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
            mode === 'scroll' ? 'bg-aqua-400/20 border-aqua-400/60 text-aqua-200' : 'border-white/15 text-slate-300 hover:bg-white/10'
          }`}
        >
          Scroll
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {bar}
      <div className="rounded-xl border border-white/10 bg-deep-950/60 overflow-hidden">
        <ZoomCanvas fitMode={mode === 'fit'} width={width} height={height}>
          {svg}
        </ZoomCanvas>
      </div>
    </div>
  );
}

// One zoom engine for both modes:
//   • Fit mode  — starts fitted to the screen, expands up to MAX_ZOOM on
//                 pinch/wheel, drag to pan
//   • Scroll mode — starts at full 100% size (huge boxes, tiny labels),
//                 expands up to MAX_ZOOM, drag to pan
// Two pointers control the scale; one pointer pans; wheel zooms around the
// cursor. Everything stays clamped so the map never drifts away.
function ZoomCanvas({ fitMode, width, height, children }) {
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const avail = el.clientWidth;
      if (avail > 0 && width > 0) setFit(Math.min(1, avail / width));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [width]);

  const base = fitMode ? fit : 1;
  const scale = base * zoom;
  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(1, z));

  const zoomAt = (sx, sy, next) => {
    const k = next / scale;
    setZoom(next);
    setPan((p) => ({ x: sx - (sx - p.x) * k, y: sy - (sy - p.y) * k }));
  };

  const onWheelRef = useRef(null);
  onWheelRef.current = (e) => {
    if (!ref.current) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const next = clampZoom(zoom * (e.deltaY < 0 ? 1.15 : 0.87));
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, next);
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e) => onWheelRef.current(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    } else {
      pinch.current = null;
    }
  };

  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clampZoom(pinch.current.zoom * (dist / pinch.current.dist));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const rect = ref.current?.getBoundingClientRect();
      if (rect) zoomAt(mx - rect.left, my - rect.top, next);
    } else if (pointers.current.size === 1) {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  };

  const { x: panX = 0, y: panY = 0 } = pan;

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden select-none"
      style={{ touchAction: 'none', cursor: 'grab', height: Math.round(height * scale) }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="absolute inset-0"
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            width,
            height,
            willChange: 'transform',
            transform: `translate(calc(-50% + ${panX}px), ${panY}px) scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {children}
        </div>

        {/* zoom controls overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-deep-950/70 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => zoomAt(width / 2, 0, clampZoom(zoom * 1.25))}
            className="w-7 h-7 rounded-lg text-sm font-black text-slate-200 hover:bg-white/10"
            aria-label="Expand"
          >
            +
          </button>
          <button
            onClick={() => zoomAt(width / 2, 0, clampZoom(zoom * 0.8))}
            className="w-7 h-7 rounded-lg text-sm font-black text-slate-200 hover:bg-white/10"
            aria-label="Contract"
          >
            −
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-2 h-7 rounded-lg text-[11px] font-bold text-aqua-200 hover:bg-white/10"
            aria-label="Reset view"
          >
            {fitMode ? 'Fit' : '100%'}
          </button>
        </div>
      </div>
    </div>
  );
}