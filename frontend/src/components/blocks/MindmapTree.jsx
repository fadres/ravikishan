import { useEffect, useMemo, useRef, useState } from 'react';
import { latexToPlain } from '../../lib/markdown.jsx';

// ── Mind map interface ───────────────────────────────────────────────────
// Two views, one goal — the full classification is always visible, never
// hidden, and there is NO search, NO expand/collapse anywhere:
//
//   INLINE VIEW (this block):
//     • a LARGE FIXED box — the map is always inside the same box, no matter
//       how big the classification is; the whole map auto-fits the box
//     • zoom in / zoom out buttons, wheel & pinch zoom, drag pan, reset view
//     • tapping any box — or the Open button — opens the full view
//
//   FULL VIEW (new interface, replaces the old workspace):
//     • opens on top of the page showing ONLY the classification
//     • the map fills a large fixed box, auto-fitted, with zoom in/out
//       buttons, wheel/pinch zoom, drag pan and reset
//     • tapping a box centers the view on that branch at a readable zoom
//     • an identification panel shows the tapped box's POSITION (unit →
//       topic → path index like 1.2.3) and its conceptual MEANING (desc)
//     • Close button (or Esc) returns to the notes
//
//   IDENTIFICATION — every box carries its position in the classification:
//     • an index badge (1, 1.1, 1.2.3 …) in the top-left corner of the box —
//       its exact spot counted from the top of the tree
//     • a page-level context line ("Unit B · Vectors › Topic 3 · …") in the
//       header, passed down from the chapter structure
//     • tapping a box opens the panel: full breadcrumb path + its meaning
//
//   MEANING — every node may carry a `desc` field ("what does this mean?"):
//     • the description is drawn INSIDE the box, under the name (≤3 lines)
//     • the full text is shown in the identification panel
// ─────────────────────────────────────────────────────────────────────────

const MAX_ZOOM = 8; // how far the map can expand on pinch/wheel
const FIT_FLOOR = 0.35; // fit mode never shrinks below this — keeps text visible
const FIXED_HEIGHT = 420; // the inline box is always this tall — a large, fixed box

const NODE_H = 76; // boxes without descriptions
const NODE_H_DESC = 118; // taller boxes once any node carries a meaning (desc)
const SIBLING_GAP = 24; // spacing between sibling boxes
const LEVEL_GAP = 44; // vertical spacing between levels

function textLen(s) {
  return [...String(s)].length;
}

// Wrap a description into lines that fit the box width. Only the first 3
// lines are drawn inside the box — the panel shows the full text.
function wrapText(text, maxChars) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textLen(next) > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

// Box dimensions come from the label length — and from the description when
// present (the box must be wide enough to show the meaning's lines). Labels
// stay compact (9–14px); boxes are wide and tall so the map reads as big
// tiles with small letters.
function boxFor(name, desc = '') {
  const len = textLen(latexToPlain(name));
  const font = len > 30 ? 9 : len > 20 ? 10 : len > 10 ? 11 : len > 4 ? 12 : 14;
  let width = Math.min(460, Math.max(150, 48 + len * font * 0.7));
  let descLines = [];
  if (desc) {
    const charsPerLine = Math.max(14, Math.floor((width - 32) / 5.4));
    descLines = wrapText(desc, charsPerLine);
    for (const line of descLines) width = Math.max(width, 32 + textLen(line) * 5.4);
    width = Math.min(460, width);
  }
  return { width: Math.round(width), font, descLines };
}

// Path-based key so same-named nodes stay unique: "root > child > leaf".
function keyFor(parentKey, name) {
  return parentKey ? `${parentKey} > ${name}` : name;
}

// True when any node in the tree carries a description — forces the taller,
// uniform box height so every box in the map lines up.
function treeHasDesc(node) {
  if (typeof node?.desc === 'string' && node.desc.trim()) return true;
  if (Array.isArray(node?.children)) return node.children.some(treeHasDesc);
  return false;
}

// In-order leaf placement: each leaf is centred at the current cursor and the
// cursor advances by its own width + gap, so sibling boxes never overlap.
// The FULL tree is always laid out — there is no collapse state anymore.
// Every node also gets its index in the classification ("1", "1.1", "1.2.3"…)
// counted from the top of the tree.
function layout(node, parentKey = '', index = '', walk = { cursor: 0 }) {
  const key = keyFor(parentKey, node.name);
  const desc = typeof node.desc === 'string' ? node.desc.trim() : '';
  const children = Array.isArray(node.children) && node.children.length ? node.children : [];
  const meta = boxFor(node.name, desc);
  if (!children.length) {
    const x = walk.cursor + meta.width / 2;
    walk.cursor += meta.width + SIBLING_GAP;
    return { key, meta, x, children: [], node, desc, index: index || '1' };
  }
  const childNodes = children.map((c, i) => layout(c, key, index ? `${index}.${i + 1}` : `${i + 1}`, walk));
  const x = childNodes.reduce((s, c) => s + c.x, 0) / childNodes.length;
  return { key, meta, x, children: childNodes, node, desc, index: index || '1' };
}

// Walk a laid-out tree collecting nodes + edges + ancestor paths.
function flatten(entry, nodeH, depth = 0, parentKey = '', out = { nodes: [], edges: [], pathOf: new Map() }) {
  out.nodes.push({
    key: entry.key,
    name: entry.node.name,
    desc: entry.desc,
    index: entry.index,
    x: entry.x,
    y: depth * (nodeH + LEVEL_GAP),
    depth,
    width: entry.meta.width,
    font: entry.meta.font,
    descLines: entry.meta.descLines,
    hasChildren: Boolean(entry.node.children && entry.node.children.length),
    entry,
  });
  out.pathOf.set(entry.key, out.nodes.length - 1);
  if (parentKey) out.edges.push({ from: parentKey, to: entry.key });
  for (const child of entry.children) flatten(child, nodeH, depth + 1, entry.key, out);
  return out;
}

export default function MindmapTree({ data, context }) {
  const [open, setOpen] = useState(false);
  const [openFocus, setOpenFocus] = useState(null);

  const totalNodes = useMemo(() => (data ? countNodes(data) : 0), [data]);
  const nodeH = useMemo(() => (data && treeHasDesc(data) ? NODE_H_DESC : NODE_H), [data]);
  const tree = useMemo(() => (data ? layout(data) : null), [data]);
  const view = useMemo(() => (tree ? flatten(tree, nodeH) : null), [tree, nodeH]);

  if (!tree || !view) return <p className="text-slate-400 text-sm">No mind map data.</p>;

  // Opens the full view. If a box was tapped, that branch is centered there.
  const openView = (key = null) => {
    setOpenFocus(key);
    setOpen(true);
  };

  const canvas = buildCanvas(tree, view, nodeH, null, { onTap: openView });
  const contextLine = contextLineText(context);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mind map</span>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          {totalNodes} elements · {maxDepthOf(view)} levels · tap a box or Open for the full view · drag to pan · scroll to zoom
        </span>
        {contextLine && <span className="text-[10px] text-aqua-300/80 hidden md:inline">· {contextLine}</span>}
        <button
          type="button"
          onClick={() => openView()}
          className="ml-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-aqua-400 to-aqua-300 text-deep-900 text-xs font-extrabold hover:brightness-110 transition shrink-0"
        >
          Open
        </button>
      </div>

      {/* A large, FIXED box — the whole map fits inside and never changes the
          box size. Zoom in/out controls are overlaid at the bottom-right. */}
      <div
        className="rounded-xl border border-white/10 bg-deep-950/60 overflow-hidden"
        style={{ height: FIXED_HEIGHT }}
      >
        <ZoomCanvas
          fitMode="viewport"
          fitFloor={FIT_FLOOR}
          width={canvas.width}
          height={canvas.height}
          svg={canvas.svg}
          containerClass="h-full"
        />
      </div>

      {open && (
        <MindmapView data={data} initialFocusKey={openFocus} onClose={() => setOpen(false)} context={context} />
      )}
    </div>
  );
}

// "Unit B · Vectors › Topic 3 · Cell" — the page-level position, or null.
function contextLineText(context) {
  if (!context) return null;
  const unit = `Unit ${context.unit ?? '—'}${context.unitTitle ? ` · ${context.unitTitle}` : ''}`;
  const topic = context.topic ? `Topic ${context.topic}${context.topicTitle ? ` · ${context.topicTitle}` : ''}` : '';
  return topic ? `${unit} › ${topic}` : unit;
}

// Breadcrumb inside the panel: "root › child › leaf" names from the key.
function pathNamesOf(selected) {
  return selected.key.split(' > ');
}

function maxDepthOf(view) {
  return view.nodes.reduce((m, n) => Math.max(m, n.depth + 1), 0);
}

function countNodes(node) {
  let n = 1;
  if (Array.isArray(node?.children)) {
    for (const c of node.children) n += countNodes(c);
  }
  return n;
}

// Builds the shared SVG scene (nodes + edges) for the full tree.
// opts.onTap(key) fires when a box is tapped.
function buildCanvas(tree, view, nodeH, focusKey = null, opts = {}) {
  const { onTap } = opts;
  const { nodes, edges } = view;
  if (!nodes.length) return { svg: null, width: 0, height: 0, shiftX: 0 };
  const left = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const right = Math.max(...nodes.map((n) => n.x + n.width / 2));
  const bottom = Math.max(...nodes.map((n) => n.y + nodeH));
  const shiftX = 16 - left;
  const width = right - left + 32;
  const height = bottom + 24;

  const edgePath = (from, to) => {
    const a = nodes.find((n) => n.key === from);
    const b = nodes.find((n) => n.key === to);
    if (!a || !b) return '';
    const x1 = a.x + shiftX;
    const y1 = a.y + nodeH;
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
        const label = latexToPlain(n.name);
        const nameY = n.descLines.length ? nodeH / 2 - 24 : nodeH / 2 + 4;
        const badgeW = 12 + textLen(n.index) * 6.5;
        return (
          <g
            key={n.key}
            transform={`translate(${n.x + shiftX}, ${n.y})`}
            className="cursor-pointer"
            onClick={() => onTap?.(n.key)}
          >
            <title>
              {label}
              {n.desc ? ` — ${n.desc}` : ''}
            </title>
            <rect
              x={-n.width / 2}
              width={n.width}
              height={nodeH}
              rx={14}
              fill={isRoot ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.06)'}
              stroke={isFocused ? 'rgba(56,189,248,1)' : isRoot ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isFocused ? 3 : 2}
            />
            {/* Position badge — the node's exact spot in the classification,
                counted from the top ("1", "1.1", "1.2.3"…). */}
            <g>
              <rect
                x={-n.width / 2 + 10}
                y={-nodeH / 2 + 10}
                width={badgeW}
                height={16}
                rx={8}
                fill="rgba(56,189,248,0.14)"
                stroke="rgba(125,211,252,0.5)"
                strokeWidth={1}
              />
              <text
                x={-n.width / 2 + 10 + badgeW / 2}
                y={-nodeH / 2 + 21}
                textAnchor="middle"
                fill="#7dd3fc"
                fontSize={9}
                fontWeight={700}
              >
                {n.index}
              </text>
            </g>
            {/* Name — shifted up when a description sits under it. */}
            <text
              x={0}
              y={nameY}
              textAnchor="middle"
              fill={isRoot ? '#7dd3fc' : '#e2e8f0'}
              fontSize={n.font}
              fontWeight={isRoot ? 700 : 500}
            >
              {label}
            </text>
            {/* Conceptual meaning — the node's desc, drawn inside the box. */}
            {n.descLines.map((line, i) => (
              <text
                key={i}
                x={0}
                y={nodeH / 2 + 4 + i * 11}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={9.5}
              >
                {line}
              </text>
            ))}
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

// ── Full view (new interface) ─────────────────────────────────────────────
// Opens on top of the page. Shows ONLY the classification: the whole map in
// a large fixed box, auto-fitted, with zoom in / zoom out buttons, wheel &
// pinch zoom, drag pan and reset. Tapping a box centers on that branch AND
// selects it — the identification panel at the bottom-left then shows its
// position (unit → topic → path index) and conceptual meaning (desc).
// No search, no expand/collapse all.
function MindmapView({ data, initialFocusKey = null, onClose, context }) {
  const [focusKey, setFocusKey] = useState(initialFocusKey);
  const [focusTick, setFocusTick] = useState(0);

  const nodeH = useMemo(() => (treeHasDesc(data) ? NODE_H_DESC : NODE_H), [data]);
  const tree = useMemo(() => layout(data), [data]);
  const view = useMemo(() => flatten(tree, nodeH), [tree, nodeH]);

  // Esc closes the full view.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Center the tapped branch at a readable zoom; tapping again deselects.
  const focusNode = (key) => {
    setFocusKey((prev) => (prev === key ? null : key));
    setFocusTick((t) => t + 1);
  };

  const focusEntry = focusKey ? view.nodes[view.pathOf.get(focusKey)] : null;
  const canvas = buildCanvas(tree, view, nodeH, focusKey, { onTap: focusNode });
  const contextLine = contextLineText(context);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 bg-deep-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[92vh] sm:w-[min(1100px,94vw)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — title + position context + Close only */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10 shrink-0 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-aqua-300 font-bold">
              Mind map · classification{contextLine ? ` · ${contextLine}` : ''}
            </p>
            <h3 className="text-lg sm:text-xl font-extrabold text-white truncate">{latexToPlain(data.name)}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 h-9 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-aqua-400 to-aqua-300 text-deep-900 hover:brightness-110 transition"
          >
            Close
          </button>
        </div>

        {/* Classification canvas — large fixed box, auto-fits, zoom in/out */}
        <div className="flex-1 min-h-0 relative">
          <ZoomCanvas
            fitMode="viewport"
            fitFloor={FIT_FLOOR}
            width={canvas.width}
            height={canvas.height}
            svg={canvas.svg}
            containerClass="h-full"
            focus={focusEntry ? { x: focusEntry.x + canvas.shiftX, y: focusEntry.y, tick: focusTick } : null}
          />

          {/* Identification panel — position + meaning of the tapped box */}
          <IdentificationPanel
            selected={focusEntry}
            context={context}
            totalNodes={view.nodes.length}
            maxDepth={maxDepthOf(view)}
          />
        </div>
      </div>
    </div>
  );
}

// Bottom-left overlay: everything about the selected box — where it sits in
// the classification (unit → topic → breadcrumb → index) and what it means
// (its full description). With nothing selected it explains how to use it.
function IdentificationPanel({ selected, context, totalNodes, maxDepth }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[min(430px,calc(100%-1.5rem))] pointer-events-none">
      <div className="rounded-xl border border-white/10 bg-deep-950/80 backdrop-blur-sm px-3.5 py-2.5 text-xs shadow-lg">
        {selected ? (
          <div className="space-y-1">
            {/* Position — unit › topic › path breadcrumb */}
            <p className="text-slate-400 leading-snug">
              <span className="text-aqua-300 font-bold">Position</span>
              {context && `  ${contextLineText(context)} ›`}
              <span className="text-slate-200 font-semibold"> {pathNamesOf(selected).join(' › ')}</span>
            </p>
            {/* Index chip — the exact spot counted from the top */}
            <p className="flex items-center gap-2 text-slate-500">
              <span className="inline-flex items-center justify-center min-w-[2rem] h-5 px-1.5 rounded-full bg-aqua-400/10 border border-aqua-300/40 text-aqua-200 text-[10px] font-extrabold">
                {selected.index}
              </span>
              Node {selected.index} · level {selected.depth + 1} of {maxDepth} · {totalNodes} elements
            </p>
            {/* Meaning — the node's desc, in full */}
            <p className="text-slate-300 leading-snug border-t border-white/5 pt-1.5">
              <span className="text-violet-300 font-bold">Meaning</span>
              {selected.desc ? (
                <span> {selected.desc}</span>
              ) : (
                <span className="text-slate-500 italic"> no description given for this box yet</span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-slate-400 leading-snug">
            <span className="text-aqua-300 font-bold">Tap any box</span> to see its position —{' '}
            <span className="text-slate-200">
              {context ? `${contextLineText(context)} › ` : ''}1.2.3 (name)
            </span>{' '}
            — and its meaning. {totalNodes} elements · {maxDepth} levels.
          </p>
        )}
      </div>
    </div>
  );
}
