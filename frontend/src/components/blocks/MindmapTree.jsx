import { useMemo, useState } from 'react';

// Collapsible SVG tree for mindmap_json blocks — zero dependencies.
// Layout: leaves get sequential x positions (in-order), parents sit at the
// average of their children; y = depth. Renders as a tidy tree.

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

export default function MindmapTree({ data }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const tree = useMemo(() => (data ? layout(data, collapsed) : null), [data, collapsed]);
  if (!tree) return <p className="text-slate-400 text-sm">No mind map data.</p>;

  // Flatten for rendering: each node gets a computed position.
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

  const toggle = (key) => {
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

  return (
    <div className="overflow-x-auto py-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-full">
        {edges.map((e, i) => (
          <path key={i} d={edgePath(e.from, e.to)} fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="1.5" />
        ))}
        {nodes.map((n) => {
          const isRoot = n.key === tree.node.name;
          return (
            <g
              key={n.key}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onClick={() => n.hasChildren && toggle(n.key)}
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
    </div>
  );
}
