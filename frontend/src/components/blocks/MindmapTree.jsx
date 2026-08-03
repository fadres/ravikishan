import { useEffect, useRef, useState } from 'react';
import { latexToPlain } from '../../lib/markdown.jsx';

// ── Mind map design system ────────────────────────────────────────────────
// Every mind map follows these readable rules automatically — current content
// AND all future additions:
//   • boxes are large and easy to read & tap (tall, sized to the label)
//   • labels use a readable font (min 11px) — never microscopic, so they are
//     always visible to the naked eye
//   • long labels wrap-free but auto-shrink only down to the readable floor
//   • tapping ANY box opens a large detail view of that branch where every
//     element is shown as full-size text — nothing is ever unreadable
//   • pinch (touch), wheel (desktop) or +/- buttons expand the whole map,
//     and dragging pans around it
// ──────────────────────────────────────────────────────────────────────────

const MAX_ZOOM = 8; // how far the map can expand on pinch/wheel
const FIT_FLOOR = 0.5; // fit mode never shrinks below 50% — keeps text visible

const NODE_H = 58; // tall boxes: easy to read and tap
const SIBLING_GAP = 22; // spacing between sibling boxes
const LEVEL_GAP = 34; // vertical spacing between levels

function textLen(s) {
  return [...String(s)].length;
}

// Box dimensions come from the label length. Letters stay readable (11–16px):
// short labels get large letters, long labels shrink but never below 11px.
// Because this runs per node at render time, every new mind map that gets
// uploaded automatically follows the same rules.
function boxFor(name) {
  const len = textLen(latexToPlain(name));
  const font = len > 30 ? 11 : len > 18 ? 12 : len > 9 ? 13 : 15;
  const width = Math.min(440, Math.max(130, 44 + len * font * 0.66));
  return { width: Math.round(width), font };
}

// In-order leaf placement: each leaf is centred at the current cursor and the
// cursor advances by its own width + gap, so sibling boxes never overlap.
// Keys follow the "parent > child" path so same-named nodes stay unique.
function layout(node, collapsed = new Set(), parentKey = '', walk = { cursor: 0 }) {
  const key = parentKey ? `${parentKey} > ${node.name}` : node.name;
  const children = node.children && node.children.length && !collapsed.has(key) ? node.children : [];
  if (!children.length) {
    const meta = boxFor(node.name);
    const x = walk.cursor + meta.width / 2;
    walk.cursor += meta.width + SIBLING_GAP;
    return { key, meta, x, children: [], node };
  }
  const childNodes = children.map((c) => layout(c, collapsed, key, walk));
  const x = childNodes.reduce((s, c) => s + c.x, 0) / childNodes.length;
  return { key, meta: boxFor(node.name), x, children: childNodes, node };
}

export default function MindmapTree({ data }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [detailKey, setDetailKey] = useState(null); // branch opened in detail view

  const tree = data ? layout(data, collapsed) : null;
  if (!tree) return <p className="text-slate-400 text-sm">No mind map data.</p>;

  const nodes = [];
  const edges = [];

  const walk = (entry, depth, parentKey) => {
    const { key } = entry;
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
      entry,
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
  const shiftX = 16 - left;
  const width = right - left + 32;
  const height = bottom + 24;

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
        <g key={`e${i}`}>
          <path d={edgePath(e.from, e.to)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="2" />
          <circle r="4" fill="rgba(125,211,252,0.5)" transform={arrow(e.to)} />
        </g>
      ))}
      {nodes.map((n) => {
        const isRoot = n.key === tree.key;
        const label = latexToPlain(n.name);
        return (
          <g
            key={n.key}
            transform={`translate(${n.x + shiftX}, ${n.y})`}
            className="cursor-pointer"
            onClick={() => setDetailKey(n.key)}
          >
            <title>{label}</title>
            <rect
              x={-n.width / 2}
              width={n.width}
              height={NODE_H}
              rx={14}
              fill={isRoot ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.06)'}
              stroke={isRoot ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.2)'}
              strokeWidth={2}
            />
            <text
              x={0}
              y={NODE_H / 2 + 4}
              textAnchor="middle"
              fill={isRoot ? '#7dd3fc' : '#e2e8f0'}
              fontSize={n.font}
              fontWeight={isRoot ? 700 : 500}
            >
              {label}
            </text>
            {n.hasChildren && (
              <g
                transform={`translate(${n.width / 2 - 18}, ${NODE_H / 2})`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(n.key);
                }}
                className="cursor-pointer"
              >
                <rect x={-12} y={-12} width={24} height={24} rx={6} fill="rgba(56,189,248,0.15)" stroke="rgba(56,189,248,0.4)" />
                <text textAnchor="middle" dominantBaseline="central" fill="#7dd3fc" fontSize={13} fontWeight={700}>
                  {n.isCollapsed ? '+' : '−'}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );

  const detailEntry = detailKey ? nodes.find((n) => n.key === detailKey) : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          Mind map
        </span>
        <span className="text-[10px] text-slate-500">
          Tap a box to open it large - use − / + to collapse or expand - pinch / wheel to zoom
        </span>
      </div>
      <div className="rounded-xl border border-white/10 bg-deep-950/60 overflow-hidden">
        <ZoomCanvas fitFloor={FIT_FLOOR} width={width} height={height} svg={svg} />
      </div>

      {detailEntry && (
        <DetailModal entry={detailEntry} root={tree} onClose={() => setDetailKey(null)} />
      )}
    </div>
  );
}

// ── Large readable detail view ─────────────────────────────────────────────
// Opens when the user taps the ☰ icon on any box. Shows that branch as a
// clean indented tree with full-size text (15px+) — every element is clearly
// visible, no tiny map letters involved. Branch rows are tappable to drill
// into that branch.
function BranchTree({ entry, onJump, trail = [] }) {
  const [open, setOpen] = useState(true);
  const label = latexToPlain(entry.node.name);
  const children = entry.children || [];
  return (
    <div>
      <button
        type="button"
        onClick={() => onJump(entry.key)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span
          className="text-slate-500 text-[10px] w-4 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (children.length) setOpen((o) => !o);
          }}
        >
          {children.length ? (open ? '▼' : '▶') : '•'}
        </span>
        <span className="text-base sm:text-lg font-semibold text-white leading-snug group-hover:text-aqua-200 transition">
          {label}
        </span>
        {children.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
            {children.length}
          </span>
        )}
      </button>
      {open && children.length > 0 && (
        <div className="ml-3 pl-3 border-l border-white/10 space-y-1.5 mt-1.5">
          {children.map((c, i) => (
            <BranchTree key={c.key} entry={c} onJump={onJump} trail={[...trail, label]} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailModal({ entry, root, onClose }) {
  const trail = [];
  const findTrail = (e, path) => {
    if (e.key === entry.key) {
      trail.push(...path, e);
      return true;
    }
    for (const c of e.children || []) {
      if (findTrail(c, [...path, e])) return true;
    }
    return false;
  };
  findTrail(root, []);

  const [activeKey, setActiveKey] = useState(entry.key);
  let active = null;
  const findActive = (e) => {
    if (e.key === activeKey) return e;
    for (const c of e.children || []) {
      const r = findActive(c);
      if (r) return r;
    }
    return null;
  };
  active = findActive(root) || entry;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-aqua-300 font-bold">Mind map detail</p>
            {trail.length > 1 && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {trail.slice(0, -1).map((t) => latexToPlain(t.node.name)).join(' › ')}
              </p>
            )}
            <h3 className="text-xl font-extrabold text-white mt-0.5 break-words">
              {latexToPlain(active.node.name)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none p-1 shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-2">
          <BranchTree entry={active} onJump={setActiveKey} />
          <p className="text-xs text-slate-500 pt-2 border-t border-white/5">
            Every box is shown at full size here. Tap a branch to jump to it.
          </p>
        </div>
      </div>
    </div>
  );
}

// One zoom engine: fits the whole map on screen (never below FIT_FLOOR so
// labels stay visible), then pinch/wheel/+/- expand up to MAX_ZOOM and drag
// pans. Two pointers control scale; one pointer pans; wheel zooms around the
// cursor; everything stays clamped so the map never drifts away.
function ZoomCanvas({ fitFloor, width, height, svg }) {
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
      if (avail > 0 && width > 0) setFit(Math.max(fitFloor, Math.min(1, avail / width)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [width, fitFloor]);

  const base = fit;
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
          {svg}
        </div>

        {/* zoom controls overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-deep-950/70 border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => zoomAt(width / 2, 0, clampZoom(zoom * 1.25))}
            className="w-8 h-8 rounded-lg text-lg font-black text-slate-200 hover:bg-white/10"
            aria-label="Expand"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomAt(width / 2, 0, clampZoom(zoom * 0.8))}
            className="w-8 h-8 rounded-lg text-lg font-black text-slate-200 hover:bg-white/10"
            aria-label="Contract"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-2 h-8 rounded-lg text-[11px] font-bold text-aqua-200 hover:bg-white/10"
            aria-label="Reset view"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}