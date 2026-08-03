import { useEffect, useMemo, useRef, useState } from 'react';

// Collapsible SVG tree for mindmap_json blocks — zero dependencies.
// Layout: leaves get sequential x positions (in-order), parents sit at the
// average of their children; y = depth. Renders as a tidy tree.
// Mobile-friendly: "Fit" mode scales the whole tree to the screen width so
// nothing overlaps or clips; "Scroll" mode keeps full size with free
// horizontal + vertical scrolling. Toggle freely.

const NODE_W = 150;
const NODE_H = 34;
const LEVEL_GAP = 90;
const SIBLING_GAP = 18;

function layout(node, collapsed = new Set(), acc = []) {
  const children = node.children && node.children.length && !collapsed.has(node.name) ? node.children : [];
  if (!children.length) {
    acc.push({ ...node, x: (acc.length + 1) * SIBLING_GAP, depth: 0, children: [] });
    return { node, x: acc[acc.length - 1].x, children: [] };
  }
  const childNodes = children.map((c) => layout(c, collapsed, acc));
  const x = childNodes.reduce((s, c) => s + c.x, 0) / childNodes.length;
  return { node, x, children: childNodes };
}

function Panel({ children, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-slate-200">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">{hint}</p>
      {children}
    </div>
  );
}

export default function MindmapTree({ data }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [mode, setMode] = useState('fit'); // 'fit' | 'scroll'

  const tree = useMemo(() => (data ? layout(data, collapsed) : null), [data, collapsed]);
  if (!tree) return <p className="text-slate-400 text-sm">No mind map data.</p>;

  const nodes = [];
  const edges = [];

  const walk = (entry, depth, parentKey) => {
    const key = parentKey ? `${parentKey} > ${entry.node.name}` : entry.node.name;
    const y = depth * NODE_H + depth * LEVEL_GAP;
    nodes.push({ key, name: entry.node.name, x: entry.x, y, isCollapsed: collapsed.has(key), hasChildren: entry.children.length > 0 });
    if (parentKey) edges.push({ from: parentKey, to: key });
    if (!collapsed.has(key)) {
      for (const child of entry.children) walk(child, depth + 1, key);
    }
  };
  walk(tree, 0, null);

  const width = Math.max(320, Math.max(...nodes.map((n) => n.x)) + NODE_W);
  const height = Math.max(120, Math.max(...nodes.map((n) => n.y)) + NODE_H + 40);

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
    const x1 = a.x + NODE_W / 2;
    const y1 = a.y + NODE_H;
    const x2 = b.x + NODE_W / 2;
    const y2 = b.y;
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  const arrow = (to) => {
    const b = nodes.find((n) => n.key === to);
    return `translate(${b.x + NODE_W / 2} ${b.y - 2}) rotate(180)`;
  };

  const svg = (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {edges.map((e, i) => (
        <g key={i}>
          <path d={edgePath(e.from, e.to)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="1.5" />
          <circle r="2.4" fill="rgba(125,211,252,0.5)" transform={arrow(e.to)} />
        </g>
      ))}
      {nodes.map((n) => {
        const isRoot = n.key === tree.node.name;
        return (
          <g
            key={n.key}
            transform={`translate(${n.x}, ${n.y})`}
            className="cursor-pointer"
            onClick={() => n.hasChildren && toggleNode(n.key)}
          >
            <title>{n.name}</title>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={10}
              fill={isRoot ? 'rgba(56,189,248,0.16)' : 'rgba(255,255,255,0.05)'}
              stroke={isRoot ? 'rgba(56,189,248,0.6)' : 'rgba(255,255,255,0.15)'}
              strokeWidth={1.2}
            />
            <text
              x={NODE_W / 2}
              y={NODE_H / 2 + 4}
              textAnchor="middle"
              fill={isRoot ? '#7dd3fc' : '#e2e8f0'}
              fontSize="12.5"
              fontWeight={isRoot ? 700 : 500}
            >
              {n.name.length > 26 ? `${n.name.slice(0, 25)}…` : n.name}
            </text>
            {n.hasChildren && (
              <text x={NODE_W - 10} y={NODE_H / 2 + 4} textAnchor="middle" fill="#7dd3fc" fontSize="10">
                {n.isCollapsed ? '+' : '−'}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  const bar = (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        {mode === 'fit' ? 'Fit to screen' : 'Scroll'}
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

  if (mode === 'scroll') {
    return (
      <div>
        {bar}
        <div
          className="overflow-auto max-h-[70vh] rounded-xl border border-white/10 bg-deep-950/40"
          style={{ touchAction: 'auto' }}
        >
          <div className="p-3 min-w-min w-max">{svg}</div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Drag / two-finger scroll to see the parts outside the screen.</p>
      </div>
    );
  }

  return (
    <div>
      {bar}
      <Panel hint="The whole map is scaled to fit your screen — nothing is cut or overlapping.">
        <div className="rounded-xl border border-white/10 bg-deep-950/60 overflow-hidden">
          <div className="w-full overflow-x-hidden py-2">
            <FitSvg width={width} height={height}>{svg}</FitSvg>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// Scales the tree to the available container width while keeping height
// proportional. Uses ResizeObserver so it stays correct across rotations /
// resizes. Root is centered; the map never overflows the card.
function FitSvg({ width, height, children }) {
  const [scale, setScale] = useState(1);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const avail = el.clientWidth;
      if (avail > 0 && width > 0) {
        setScale(Math.min(1, avail / width));
      }
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

  return (
    <div ref={ref} className="relative w-full p-3">
      <div
        style={{
          width: width * scale,
          height: height * scale,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width,
            height,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}