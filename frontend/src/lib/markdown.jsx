// Mini markdown → React renderer.
// Deliberately dependency-free and XSS-safe: all input is HTML-escaped first;
// only bold/italic/inline-code/list/quote/heading tokens are parsed.
// LaTeX is NOT rendered — $...$ math and \commands are converted to plain,
// readable text by latexToPlain() so no raw LaTeX ever reaches the screen.

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// The one standard LaTeX→plain-text converter used by every renderer in the
// system (markdown, tables, mind maps, formulas, symbols, keywords). Any
// $...$ / $$...$$ delimiters are dropped, common \commands become readable
// text, and everything else (braces, backslashes, ^, _) is cleaned away so
// no LaTeX presentation can leak through anywhere.
export function latexToPlain(input) {
  const symbols = {
    times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·', bullet: '•',
    leq: '≤', geq: '≥', neq: '≠', approx: '≈', equiv: '≡', sim: '~',
    propto: '∝', infty: '∞', partial: '∂', nabla: '∇', forall: '∀',
    exists: '∃', emptyset: '∅', subset: '⊂', supset: '⊃', subseteq: '⊆',
    supseteq: '⊇', cup: '∪', cap: '∩', in: '∈', notin: '∉',
    leftarrow: '←', rightarrow: '→', leftrightarrow: '↔',
    Leftarrow: '⇐', Rightarrow: '⇒', uparrow: '↑', downarrow: '↓',
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ',
    eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
    upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    degree: '°', prime: '′', perp: '⊥', parallel: '∥', angle: '∠',
    sum: 'Σ', prod: 'Π', int: '∫', sqrt: '√', infty: '∞',
    ldots: '…', cdots: '⋯', dots: '…', text: '', mathrm: '', mathbf: '',
    mathit: '', mathsf: '', mathtt: '', mathcal: '', mbox: '', em: '',
  };
  let s = String(input ?? '').replace(/\s+/g, ' ').trim();
  // frac{a}{b} → a/b
  s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => `${a}/${b}`);
  // sqrt{x} → √x  (also sqrt[n]{x})
  s = s.replace(/\\sqrt\s*(?:\[([^{}]*)\])?\s*\{([^{}]*)\}/g, (_, n, b) => (n ? `${n}√(${b})` : `√(${b})`));
  // text{...} / mathrm{...} → content
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|mathsf|mathtt|mathcal|mbox|em|operatorname)\s*\{([^{}]*)\}/g, '$1');
  // _{} and ^{} → _x and ^x
  s = s.replace(/\_\s*\{([^{}]*)\}/g, '_$1');
  s = s.replace(/\^\s*\{([^{}]*)\}/g, '^$1');
  // \left \right \big etc. → nothing
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr|biggl|biggr)\b/g, '');
  // \; \, \! \: \quad \qquad → space
  s = s.replace(/\\quad|\\qquad|\\;|\\,|\\!|\\:/g, ' ');
  // \sin, \cos … function names keep their word (before the generic command
  // remover below so they are not consumed first)
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|lim|exp|max|min|det|sum|prod|int)\b/g, '$1');
  // known command words → symbol or empty (fallback strips the command)
  s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => (symbols[name] !== undefined ? symbols[name] : ''));
  // leftovers: $ $$ { } ^ _ \ and stray markers
  s = s.replace(/[${}\\^_]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Inline tokenizer: `code`, **bold**, *italic* — math was already cleaned by
// latexToPlain() upstream, so nothing raw can appear. HTML already escaped.
function renderInline(text, keyPrefix) {
  const tokens = [];
  const regex = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
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
  return renderInline(escapeHtml(latexToPlain(text)), keyPrefix);
}

// Table cells render as plain, standard text: LaTeX is converted (never
// stripped to nothing, never shown raw) and emphasis markers are removed.
function plainText(text) {
  return escapeHtml(latexToPlain(text));
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
// - and 1. lists (with nested indentation), $$ display math (as plain text),
// --- rules, and pipe/tab tables.
export default function Markdown({ content, className = '' }) {
  const lines = String(content || '').split(/\r?\n/);
  const out = [];
  let i = 0;
  let key = 0;
  const nextKey = () => `blk-${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    // display math block — rendered as plain, readable text (no KaTeX)
    const dm = line.match(/^\$\$(.*?)\$\$\s*$/);
    if (dm) {
      const cleaned = latexToPlain(dm[1]);
      if (cleaned) {
        out.push(
          <div
            key={nextKey()}
            className="my-3 overflow-x-auto py-2 px-3 rounded-xl bg-white/5 border border-white/10 font-mono text-[15px] text-aqua-100"
          >
            {cleaned}
          </div>,
        );
      }
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
