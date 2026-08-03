// Mini markdown → React renderer.
// Deliberately dependency-free and XSS-safe: all input is HTML-escaped first;
// only bold/italic/inline-code/math/list/quote/heading tokens are parsed.
// KaTeX handles $...$ math; unknown math falls back to plain text.

import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function MathInline({ tex }) {
  let html = '';
  try {
    html = katex.renderToString(tex, { throwOnError: true, strict: 'ignore' });
  } catch {
    html = escapeHtml(`$${tex}$`);
  }
  return <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}

function MathBlock({ tex }) {
  let html = '';
  try {
    html = katex.renderToString(tex, { throwOnError: true, strict: 'ignore', displayMode: true });
  } catch {
    html = `<div class="font-mono text-sm">${escapeHtml(`$$${tex}$$`)}</div>`;
  }
  return <div className="my-3 overflow-x-auto py-2 px-3 rounded-xl bg-white/5 border border-white/10" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Inline tokenizer: `code`, $math$, **bold**, *italic* — HTML already escaped.
function renderInline(text, keyPrefix) {
  const tokens = [];
  const regex = /(`[^`\n]+`|\$\$[^$\n]+\$\$|\$[^$\n]+\$|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('`')) {
      tokens.push(
        <code key={key} className="font-mono text-[0.85em] bg-white/10 rounded px-1.5 py-0.5 text-aqua-200">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('$$')) {
      tokens.push(<MathInline key={key} tex={token.slice(2, -2)} />);
    } else if (token.startsWith('$')) {
      tokens.push(<MathInline key={key} tex={token.slice(1, -1)} />);
    } else if (token.startsWith('**')) {
      tokens.push(
        <strong key={key} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      tokens.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

function renderText(text, keyPrefix) {
  return renderInline(escapeHtml(text), keyPrefix);
}

// Table cells render as plain, standard text: strip LaTeX math and emphasis
// markers so tables stay clean and readable on any screen.
function plainText(text) {
  const cleaned = String(text)
    .replace(/\$\$[^$\n]+?\$\$/g, '')
    .replace(/\$[^$\n]+?\$/g, '')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1');
  return escapeHtml(cleaned);
}

function InlineBlock({ children, key }) {
  return <p key={key} className="leading-relaxed">{children}</p>;
}

// Nested list renderer: builds a tree from indented "- " / "1. " lines.
function ListGroup({ items, keyPrefix }) {
  const buildTree = () => {
    const root = { children: [] };
    const stack = [{ indent: -1, node: root }];
    for (const line of items) {
      const m = line.match(/^(\s*)(-|\d+\.)\s+(.*)$/);
      const indent = m[1].length;
      const ordered = m[2] !== '-';
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      if (indent <= stack[stack.length - 1].indent) stack.pop();
      const node = { text: m[3], ordered, children: [] };
      stack[stack.length - 1].node.children.push(node);
      stack.push({ indent, node });
    }
    return root.children;
  };

  const renderLevel = (nodes, depth) => {
    const out = [];
    let idx = 0;
    while (idx < nodes.length) {
      const ordered = nodes[idx].ordered;
      const group = [nodes[idx]];
      while (idx + 1 < nodes.length && nodes[idx + 1].ordered === ordered) group.push(nodes[++idx]);
      const Tag = ordered ? 'ol' : 'ul';
      out.push(
        <Tag
          key={`${keyPrefix}-l${depth}-${idx}`}
          className={`my-1.5 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'} ${depth ? 'ml-5' : 'list-inside'}`}
        >
          {group.map((node, gi) => (
            <li key={`${keyPrefix}-i${depth}-${gi}`} className={depth ? 'ml-2' : ''}>
              {renderText(node.text, `${keyPrefix}-t${depth}-${gi}`)}
              {node.children.length > 0 && renderLevel(node.children, depth + 1)}
            </li>
          ))}
        </Tag>,
      );
      idx += 1;
    }
    return out;
  };

  return <div>{renderLevel(buildTree(), 0)}</div>;
}

// Block parser: handles paragraphs, #/##/### headings, > quotes,
// - and 1. lists (with nested indentation), $$ display math, --- rules.
export default function Markdown({ content, className = '' }) {
  const lines = String(content || '').split(/\r?\n/);
  const out = [];
  let i = 0;
  let key = 0;
  const nextKey = () => `blk-${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    // display math block
    const dm = line.match(/^\$\$(.*?)\$\$\s*$/);
    if (dm) {
      out.push(<MathBlock key={nextKey()} tex={dm[1]} />);
      i += 1;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      out.push(
        <Tag key={nextKey()} className={`${level === 1 ? 'text-lg' : 'text-base'} font-bold text-white mt-4 mb-2`}>
          {renderText(h[2], nextKey())}
        </Tag>,
      );
      i += 1;
      continue;
    }

    // horizontal rule
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      out.push(<hr key={nextKey()} className="my-4 border-white/10" />);
      i += 1;
      continue;
    }

    // blockquote (consecutive "> " lines)
    if (line.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(
        <blockquote key={nextKey()} className="my-2 border-l-2 border-aqua-400/60 pl-3 py-1 text-slate-200 bg-white/5 rounded-r-lg">
          {renderText(quote.join(' '), nextKey())}
        </blockquote>,
      );
      continue;
    }

    // table (consecutive "| … |" or tab-separated lines)
    const isPipeRow = (l) => /^\s*\|/.test(l);
    if (isPipeRow(line) || line.includes('\t')) {
      const rows = [];
      while (i < lines.length && (isPipeRow(lines[i]) || lines[i].includes('\t'))) {
        rows.push(lines[i]);
        i += 1;
      }
      const parseRow = (l) => {
        if (isPipeRow(l)) {
          return l
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim());
        }
        return l
          .split('\t')
          .map((c) => c.trim())
          .filter((c) => c !== '');
      };
      const isSep = (r) => /^[\s:|-]+$/.test(r.replace(/\s/g, ''));
      const header = parseRow(rows[0]);
      let body = rows.slice(1);
      if (body.length && isSep(body[0])) body = body.slice(1);
      const cells = (row) =>
        row.map((c, j) => (
          <td key={j} className="px-3 py-2 text-slate-300 align-top">{plainText(c)}</td>
        ));
      out.push(
        <div key={nextKey()} className="my-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-aqua-300 bg-aqua-400/10 border-b border-white/10">
                {header.map((c, j) => (
                  <th key={j} className="px-3 py-2 font-bold whitespace-nowrap">{plainText(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-b border-white/5 last:border-0">
                  {cells(parseRow(r))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // lists (flat or nested via indentation)
    if (/^\s*(-|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*(-|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i]);
        i += 1;
      }
      out.push(<ListGroup key={nextKey()} items={items} keyPrefix={nextKey()} />);
      continue;
    }

    // blank line
    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    // paragraph (gather until blank/block start)
    const para = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*(-|\d+\.)\s+/.test(lines[i]) &&
      !lines[i].startsWith('>')
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(<InlineBlock key={nextKey()}>{renderText(para.join(' '), nextKey())}</InlineBlock>);
  }

  return <div className={`text-slate-200 text-[15px] ${className}`}>{out}</div>;
}
