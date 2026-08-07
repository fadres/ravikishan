import { useEffect, useMemo, useRef, useState } from 'react';
import { latexToPlain } from '../../lib/markdown.jsx';

// ── Mind map design system ────────────────────────────────────────────────
// Every mind map follows these readable rules automatically — current content
// AND all future additions:
//   • boxes are large and easy to read & tap (tall, sized to the label)
//   • labels use a readable font (min 11px) — never microscopic
//   • long labels auto-shrink only down to the readable floor
//   • the inline preview fits the map to the card width; the big "Open"
//     workspace fits the whole map to the screen (mobile & laptop) and adds
//     its own tools: search + jump, expand all / collapse all, pinch / wheel
//     zoom, drag pan, and a reset view
//   • tapping ANY box opens a large detail view of that branch where every
//     element is shown as full-size text
// ──────────────────────────────────────────────────────────────────────────

const MAX_ZOOM = 8; // how far the map can expand on pinch/wheel
const FIT_FLOOR = 0.35; // fit mode never shrinks below this — keeps text visible

const NODE_H = 76; // tall, roomy boxes
const SIBLING_GAP = 24; // spacing between sibling boxes
const LEVEL_GAP = 44; // vertical spacing between levels

function textLen(s) {
  return [...String(s)].length;
}

// Box dimensions come from the label length. Labels stay compact (9–14px);
// boxes are wide and tall so the map reads as big tiles with small letters.
function boxFor(name) {
  const len = textLen(latexToPlain(name));
  const font = len > 30 ? 9 : len > 20 ? 10 : len > 10 ? 11 : len > 4 ? 12 : 14;
  const width = Math.min(460, Math.max(150, 48 + len * font * 0.7));
  return { width: Math.round(width), font };
}

// Path-based key so same-named nodes stay unique: "root > child > leaf".
function keyFor(parentKey, name) {
  return parentKey ? `${parentKey} > ${name}` : name;
}

// In-order leaf placement: each leaf is centred at the current cursor and the
// cursor advances by its own width + gap, so sibling boxes never overlap.
function layout(node, collapsed = new Set(), parentKey = '', walk = { cursor: 0 }) {
  const key = keyFor(parentKey, node.name);
  const children =
    Array.isArray(node.children) && node.children.length && !collapsed.has(key) ? node.children : [];
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

// Walk a laid-out tree collecting nodes + edges + ancestor paths.
// hasChildren reflects the RAW subtree (not the collapsed-filtered view) so
// a collapsed node keeps its +/− handle — otherwise it could never be
// expanded again.
function flatten(entry, collapsed, depth = 0, parentKey = '', out = { nodes: [], edges: [], pathOf: new Map() }) {
  out.nodes.push({
    key: entry.key,
    name: entry.node.name,
    x: entry.x,
    y: depth * (NODE_H + LEVEL_GAP),
    width: entry.meta.width,
    font: entry.meta.font,
    isCollapsed: collapsed.has(entry.key),
    hasChildren: Boolean(entry.node.children && entry.node.children.length),
    entry,
  });
  out.pathOf.set(entry.key, out.nodes.length - 1);
  if (parentKey) out.edges.push({ from: parentKey, to: entry.key });
  if (!collapsed.has(entry.key)) {
    for (const child of entry.children) flatten(child, collapsed, depth + 1, entry.key, out);
  }
  return out;
}

export default function MindmapTree({ data }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [open, setOpen] = useState(false);
  const [openFocus, setOpenFocus] = useState(null);

  // Hooks MUST all run before any early return — a conditional hook here
  // changed the render hook count as soon as `data` arrived and React tore
  // down the whole page (the white-screen crash).
  const totalNodes = useMemo(() => (data ? countNodes(data) : 0), [data]);
  const tree = useMemo(() => (data ? layout(data, collapsed) : null), [data, collapsed]);
  const view = useMemo(() => (tree ? flatten(tree, collapsed) : null), [tree, collapsed]);

  if (!tree || !view) return <p className="text-slate-400 text-sm">No mind map data.</p>;

  const toggleNode = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openWorkspace = (key = null) => {
    // Ensure ancestors of the tapped node are expanded so it is visible.
    if (key) {
      const ancestors = [];
      const find = (e) => {
        if (e.key === key) return true;
        for (const c of e.children || []) {
          if (find(c)) {
            ancestors.push(e.key);
            return true;
          }
        }
        return false;
      };
      find(tree);
      setCollapsed((prev) => {
        const next = new Set(prev);
        ancestors.forEach((k) => next.delete(k));
        return next;
      });
    }
    setOpenFocus(key);
    setOpen(true);
  };

  const canvas = buildCanvas(tree, view, collapsed, null, '', {
    onTap: (key) => openWorkspace(key),
    onToggle: toggleNode,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mind map</span>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          {totalNodes} nodes · tap a box to open the full view · drag to pan · scroll to zoom
        </span>
        <button
          type="button"
          onClick={() => openWorkspace()}
          className="ml-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-aqua-400 to-aqua-300 text-deep-900 text-xs font-extrabold hover:brightness-110 transition shrink-0"
        >
          Open
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-deep-950/60 overflow-hidden">
        <ZoomCanvas
          fitMode="width"
          fitFloor={FIT_FLOOR}
          width={canvas.width}
          height={canvas.height}
          svg={canvas.svg}
        />
      </div>

      {open && <MindmapWorkspace data={data} initialFocusKey={openFocus} onClose={() => setOpen(false)} />}
    </div>
  );
}

function countNodes(node) {
  let n = 1;
  if (Array.isArray(node?.children)) {
    for (const c of node.children) n += countNodes(c);
  }
  return n;
}

// Builds the shared SVG scene (nodes + edges) for a given tree view.
// opts.onTap(key) fires when a box is tapped; opts.onToggle(key) fires when a
// subtree's +/- handle is tapped.
function buildCanvas(tree, view, collapsed, focusKey = null, query = '', opts = {}) {
  const { onTap, onToggle } = opts;
  const { nodes, edges } = view;
  if (!nodes.length) return { svg: null, width: 0, height: 0, shiftX: 0 };
  const left = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const right = Math.max(...nodes.map((n) => n.x + n.width / 2));
  const bottom = Math.max(...nodes.map((n) => n.y + NODE_H));
  const shiftX = 16 - left;
  const width = right - left + 32;
  const height = bottom + 24;
  const q = query.trim().toLowerCase();

  const edgePath = (from, to) => {
    const a = nodes.find((n) => n.key === from);
    const b = nodes.find((n) => n.key === to);
    if (!a || !b) return '';
    const x1 = a.x + shiftX;
    const y1 = a.y + NODE_H;
    const x2 = b.x + shiftX;
    const y2 = b.y;
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  const svg = (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {edges.map((e, i) => {
        const end = nodes.find((n) => n.key === e.to);
        if (!end) return null;
        return (
          <g key={`e${i}`}>
            <path d={edgePath(e.from, e.to)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="2" />
            <circle r="4" fill="rgba(125,211,252,0.5)" transform={`translate(${end.x + shiftX} ${end.y - 2}) rotate(180)`} />
          </g>
        );
      })}
      {nodes.map((n) => {
        const isRoot = n.key === tree.key;
        const isFocused = focusKey === n.key;
        const matches = q && latexToPlain(n.name).toLowerCase().includes(q);
        const label = latexToPlain(n.name);
        return (
          <g
            key={n.key}
            transform={`translate(${n.x + shiftX}, ${n.y})`}
            className="cursor-pointer"
            onClick={(e) => {
              if (e.target.closest('[data-toggle]')) return;
              onTap?.(n.key);
            }}
          >
            <title>{label}</title>
            <rect
              x={-n.width / 2}
              width={n.width}
              height={NODE_H}
              rx={14}
              fill={isRoot ? 'rgba(56,189,248,0.18)' : matches ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.06)'}
              stroke={isFocused ? 'rgba(56,189,248,1)' : matches ? 'rgba(52,211,153,0.8)' : isRoot ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isFocused || matches ? 3 : 2}
            />
            <text
              x={0}
              y={NODE_H / 2 + 4}
              textAnchor="middle"
              fill={isRoot ? '#7dd3fc' : matches ? '#6ee7b7' : '#e2e8f0'}
              fontSize={n.font}
              fontWeight={isRoot || matches ? 700 : 500}
            >
              {label}
            </text>
            {n.hasChildren && (
              <g
                data-toggle
                transform={`translate(${n.width / 2 - 18}, ${NODE_H / 2})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle?.(n.key);
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

  return { svg, width, height, shiftX };
}

// One zoom engine. Fits the whole map on screen (never below fitFloor so
// labels stay visible), then pinch/wheel/+/- expand up to MAX_ZOOM and drag
// pans. Two pointers control scale; one pointer pans; wheel zooms around the
// cursor; everything stays clamped so the map never drifts away.
function ZoomCanvas({ fitMode, fitFloor, width, height, svg, focus = null, containerClass = '' }) {
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
      if (fitMode === 'viewport') {
        const availW = el.clientWidth;
        const availH = el.clientHeight;
        if (availW > 0 && width > 0) {
          setFit(Math.max(fitFloor, Math.min(1, availW / width, availH / height)));
        }
      } else {
        const avail = el.clientWidth;
        if (avail > 0 && width > 0) setFit(Math.max(fitFloor, Math.min(1, avail / width)));
      }
    };
    apply();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(apply);
      ro.observe(el);
      window.addEventListener('resize', apply);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', apply);
      };
    }
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [width, height, fitMode, fitFloor]);

  const scale = fit * zoom;
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

  // Jump to a node: center it and make sure it is at a readable zoom.
  // Reads zoom from a ref so the effect never re-triggers on zoom changes,
  // and keys on focus.tick so it only fires for a NEW jump target — the
  // old version depended on a freshly-created focus object every render,
  // which re-ran this effect endlessly (freeze / white screen).
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    if (!focus || !ref.current) return;
    const el = ref.current;
    const availH = el.clientHeight;
    const next = clampZoom(Math.max(zoomRef.current, 1.6));
    const s = fit * next;
    setZoom(next);
    setPan({ x: width / 2 - focus.x, y: availH / (2 * s) - focus.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.tick, width, height, fit]);

  const { x: panX = 0, y: panY = 0 } = pan;

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden select-none ${containerClass}`}
      style={{
        touchAction: 'none',
        cursor: 'grab',
        ...(fitMode === 'viewport' ? {} : { height: Math.round(height * scale) }),
      }}
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
        <div className="absolute bottom-2 right-2 sm:bottom-2 sm:right-2 flex items-center gap-1 bg-deep-950/70 border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => zoomAt(width / 2, 0, clampZoom(zoom * 1.25))}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-lg font-black text-slate-200 hover:bg-white/10"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomAt(width / 2, 0, clampZoom(zoom * 0.8))}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-lg font-black text-slate-200 hover:bg-white/10"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2.5 h-9 sm:h-8 rounded-lg text-[11px] font-bold text-aqua-200 hover:bg-white/10"
            aria-label="Reset view"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Full-screen workspace ─────────────────────────────────────────────────
// The big "Open" view. Fits the entire map to the screen (auto-fit on mobile
// and laptop), then gives the reader their own tools: search + jump, expand
// all / collapse all, tap-to-focus a branch, zoom and pan.
function MindmapWorkspace({ data, initialFocusKey = null, onClose }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [focusKey, setFocusKey] = useState(initialFocusKey);
  const [query, setQuery] = useState('');
  const [focusTick, setFocusTick] = useState(0);

  // When a node is tapped in the inline preview, jump straight to it here.
  useEffect(() => {
    if (initialFocusKey) {
      const tree = layout(data, new Set());
      const ancestors = [];
      const find = (e) => {
        if (e.key === initialFocusKey) return true;
        for (const c of e.children || []) {
          if (find(c)) {
            ancestors.push(e.key);
            return true;
          }
        }
        return false;
      };
      find(tree);
      // Expand the path: drop ancestor keys from the collapsed set.
      setCollapsed((prev) => {
        const next = new Set(prev);
        ancestors.forEach((k) => next.delete(k));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocusKey]);

  const tree = useMemo(() => layout(data, collapsed), [data, collapsed]);
  const view = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  const nonLeafKeys = useMemo(() => {
    const keys = [];
    const walk = (n) => {
      if (n.children && n.children.length) {
        keys.push(n.key);
        for (const c of n.children) walk(c);
      }
    };
    walk(tree);
    return keys;
  }, [tree]);

  // Esc closes the workspace.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(nonLeafKeys));

  const toggleNode = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Focus a node: expand its ancestors so it is visible, then center on it.
  const focusNode = (key) => {
    const ancestors = [];
    const find = (e) => {
      if (e.key === key) return true;
      for (const c of e.children || []) {
        if (find(c)) {
          ancestors.push(e.key);
          return true;
        }
      }
      return false;
    };
    find(tree);
    setCollapsed((prev) => {
      const next = new Set(prev);
      ancestors.forEach((k) => next.delete(k));
      return next;
    });
    setFocusKey(key);
    setFocusTick((t) => t + 1);
  };

  const focusNodeEntry = focusKey ? view.nodes[view.pathOf.get(focusKey)] : null;
  const canvas = buildCanvas(tree, view, collapsed, focusKey, query, {
    onTap: (key) => {
      // Tap = jump/center that branch (and read it in the detail pane).
      focusNode(key);
    },
    onToggle: toggleNode,
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return view.nodes.filter((n) => latexToPlain(n.name).toLowerCase().includes(q));
  }, [query, view]);

  // When the search narrows the tree to nothing visible, expand to reveal matches.
  useEffect(() => {
    if (query.trim() && matches.length) {
      const needed = new Set(collapsed);
      matches.forEach((m) => {
        const find = (e) => {
          if (e.key === m.key) return true;
          for (const c of e.children || []) {
            if (find(c)) {
              needed.delete(e.key);
              return true;
            }
          }
          return false;
        };
        find(tree);
      });
      if (needed.size !== collapsed.size) setCollapsed(needed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 bg-deep-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[92vh] sm:w-[min(1100px,94vw)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10 shrink-0 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-aqua-300 font-bold">Mind map · full view</p>
            <h3 className="text-lg sm:text-xl font-extrabold text-white truncate">{latexToPlain(data.name)}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes…"
                className="w-40 sm:w-56 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-aqua-400/60"
              />
              {matches.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-aqua-400 text-deep-900 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {matches.length}
                </span>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={expandAll}
              className="px-3 h-9 rounded-xl text-xs font-bold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 h-9 rounded-xl text-xs font-bold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 h-9 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-aqua-400 to-aqua-300 text-deep-900 hover:brightness-110 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Canvas — auto-fits the whole map to whatever screen size */}
        <div className="flex-1 min-h-0 relative">
          <ZoomCanvas
            fitMode="viewport"
            fitFloor={FIT_FLOOR}
            width={canvas.width}
            height={canvas.height}
            svg={canvas.svg}
            containerClass="h-full"
            focus={focusNodeEntry ? { x: focusNodeEntry.x + canvas.shiftX, y: focusNodeEntry.y, tick: focusTick } : null}
          />

          {/* tap-to-focus hint + match count */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 pointer-events-none">
            {matches.length > 0 ? (
              <span className="text-[11px] font-bold bg-emerald-400/15 border border-emerald-400/30 text-emerald-200 rounded-full px-3 py-1">
                {matches.length} match{matches.length === 1 ? '' : 'es'} highlighted — click one to jump
              </span>
            ) : (
              <span className="hidden sm:block text-[11px] text-slate-500 bg-deep-950/50 border border-white/5 rounded-full px-3 py-1">
                Click any box to focus it · drag to pan · scroll / pinch to zoom
              </span>
            )}
          </div>
        </div>

        {/* Mobile hint bar */}
        <div className="sm:hidden px-4 py-2 border-t border-white/10 text-[11px] text-slate-500 text-center shrink-0">
          Drag to pan · pinch to zoom · tap a box to focus
        </div>
      </div>
    </div>
  );
}
