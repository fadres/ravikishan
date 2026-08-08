import { useEffect, useMemo, useState } from 'react';

// Mini markdown → React renderer.
// Deliberately dependency-free and XSS-safe: all input is HTML-escaped first;
// only bold/italic/inline-code/list/quote/heading tokens are parsed.
//
// KaTeX is loaded ONCE per app session (shared module promise) and only when
// the first piece of math is actually needed — pages without equations never
// pay the KaTeX bundle cost. Until KaTeX arrives (or on load failure), $...$
// math falls back to readable plain text via latexToPlain() so nothing is
// ever left raw or blank, and any formula KaTeX cannot typeset degrades to
// the same plain text instead of showing a red error box.

let katexPromise = null;

// Shared lazy loader: every consumer (Markdown, MathSpan, RichText, …) waits
// on the same promise, so the 260KB math bundle downloads at most once.
function loadKatex() {
  if (!katexPromise) {
    katexPromise = Promise.all([
      import('katex').then((mod) => mod.default || mod),
      import('katex/dist/katex.min.css'),
    ]).then(([k]) => k);
    katexPromise.catch(() => {
      katexPromise = null; // allow a retry on the next mount
    });
  }
  return katexPromise;
}

// Hook that resolves to the KaTeX module once it is available (or stays null
// forever on failure — every renderer falls back to plain text in that case).
export function useKatex() {
  const [katex, setKatex] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadKatex()
      .then((k) => {
        if (!cancelled) setKatex(k);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return katex;
}

const KATEX_OPTIONS = { throwOnError: false, strict: 'ignore', errorColor: '#f59e0b' };

// True when the content contains at least one genuine $...$ / $$...$$ math
// span. "Genuine" matters: currency ("$5, $10"), prices and stray dollar
// signs must never be treated as LaTeX — each candidate span is validated
// with looksLikeMath() first.
export function hasMath(content) {
  const text = String(content || '');
  if (/\$\$[\s\S]*?\$\$/.test(text)) return true;
  const re = /\$([^$\n]+?)\$/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (looksLikeMath(m[1])) return true;
  }
  return false;
}

// Heuristic guard against false-positive math: the span must actually look
// like a formula (a LaTeX command, sub/superscript, an equation with an
// operator, or a known math symbol) before it is rendered as math.
export function looksLikeMath(inner) {
  const s = String(inner ?? '').trim();
  if (!s) return false;
  if (/\\[a-zA-Z]/.test(s)) return true; // \alpha, \frac{...}, \text{...}
  if (/[{}\^_]/.test(s)) return true; // x^2, x_i, { ... }
  if (/[A-Za-z]\s*[=<>≈≠≤≥]\s*[0-9A-Za-z]/.test(s)) return true; // x = 5
  if (/\d\s*[=]\s*\d/.test(s)) return true; // 1 + 2 = 3
  if (/[0-9A-Za-z)]\s*[×÷⋅±∓√∫∑∏]/.test(s)) return true; // a × b
  if (/[×÷⋅±∓√∫∑∏∞∂∇αβγδεζηθλμπστφψωΔΓΘΛΞΠΣΦΨΩ≤≥≠≈]/.test(s)) return true;
  return false;
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
    sum: 'Σ', prod: 'Π', int: '∫', sqrt: '√',
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

// Math block that renders with KaTeX when available, plain text otherwise.
// A span KaTeX cannot typeset (katex-error class) also degrades to plain text
// instead of showing a raw red error box.
export function MathSpan({ math, displayMode = false, className = '' }) {
  const katex = useKatex();
  const html = useMemo(() => {
    if (!katex) return null;
    try {
      const out = katex.renderToString(String(math ?? ''), { ...KATEX_OPTIONS, displayMode });
      return out.includes('katex-error') ? null : out;
    } catch {
      return null;
    }
  }, [katex, math, displayMode]);
  if (html) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className={`${className} text-aqua-100 font-mono`}>{latexToPlain(math)}</span>;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// Inline tokenizer: `code`, **bold**, *italic*, and $math$ — math is rendered
// with KaTeX when loaded, otherwise converted to plain text by latexToPlain().
// Dollar spans that do not look like math (currency, prices) stay literal.
// HTML already escaped.
function renderInline(text, keyPrefix, katex) {
  const tokens = [];
  const regex = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\$[^$\n]+\$)/g;
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
    } else if (token.startsWith('$')) {
      const math = token.slice(1, -1).trim();
      if (!looksLikeMath(math)) {
        tokens.push(token); // currency / stray dollar sign — keep it literal
      } else if (katex) {
        try {
          const out = katex.renderToString(math, KATEX_OPTIONS);
          if (!out.includes('katex-error')) {
            tokens.push(
              <span key={key} className="inline-block align-middle" dangerouslySetInnerHTML={{ __html: out }} />,
            );
            last = m.index + token.length;
            continue;
          }
        } catch {
          /* fall through to plain-text rendering */
        }
        tokens.push(
          <span key={key} className="text-aqua-100 font-mono text-[0.95em]">
            {latexToPlain(math)}
          </span>,
        );
      } else {
        tokens.push(
          <span key={key} className="text-aqua-100 font-mono text-[0.95em]">
            {latexToPlain(math)}
          </span>,
        );
      }
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

// Splits text into plain segments and genuine $...$ math spans in document
// order. False-positive dollar spans (currency etc.) are left inside their
// surrounding text segment untouched.
function splitMath(text) {
  const parts = [];
  const re = /\$([^$\n]+?)\$/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!looksLikeMath(m[1])) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ math: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  if (!parts.length) parts.push({ text });
  return parts;
}

function renderText(text, keyPrefix, katex) {
  if (!hasMath(text)) {
    // No real math: keep the text intact (emails, a_b, 5^2 stay readable) and
    // only run the LaTeX cleanup when stray \commands would otherwise leak.
    const cleaned = /\\[a-zA-Z]/.test(text) ? latexToPlain(text) : text;
    return renderInline(escapeHtml(cleaned), keyPrefix, katex);
  }
  // Math present: keep $...$ spans intact (so KaTeX can render them), clean
  // the surrounding text through latexToPlain, and merge everything in order.
  return splitMath(text).flatMap((part, pi) => {
    const kp = `${keyPrefix}-m${pi}`;
    if (part.math) {
      if (katex) {
        try {
          const out = katex.renderToString(part.math, KATEX_OPTIONS);
          if (!out.includes('katex-error')) {
            return [
              <span key={kp} className="inline-block align-middle" dangerouslySetInnerHTML={{ __html: out }} />,
            ];
          }
        } catch {
          /* fall through to plain-text rendering */
        }
      }
      return [
        <span key={kp} className="text-aqua-100 font-mono text-[0.95em]">
          {latexToPlain(part.math)}
        </span>,
      ];
    }
    return renderInline(escapeHtml(latexToPlain(part.text)), kp, katex);
  });
}

// Inline rich text with math support — the shared building block for chips,
// list items, table cells and mind-map labels outside Markdown itself.
// Inline contexts have no block parser, so $$...$$ display markers are
// normalized to $...$ before tokenizing (otherwise the leftover dollar
// signs would render literally around the math).
export function RichText({ text, className = '' }) {
  const katex = useKatex();
  return (
    <span className={className}>
      {renderText(String(text ?? '').replace(/\$\$/g, '$'), 'rt', katex)}
    </span>
  );
}

// Table headers render as plain, standard text: LaTeX is converted (never
// stripped to nothing, never shown raw) and emphasis markers are removed.
function plainText(text) {
  return escapeHtml(latexToPlain(text));
}

function InlineBlock({ children }) {
  return <p className="leading-relaxed">{children}</p>;
}

// Nested list renderer: builds a tree from indented "- " / "1. " lines.
function ListGroup({ items, keyPrefix, katex }) {
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
              {renderText(node.text, `${keyPrefix}-t${depth}-${gi}`, katex)}
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
// - and 1. lists (with nested indentation), $$ display math (single-line and
// standalone multi-line $$…$$ blocks; plain text when KaTeX is not ready),
// --- rules, and pipe/tab tables.
export default function Markdown({ content, className = '' }) {
  const katex = useKatex();

  const displayMath = (math, key) => (
    <div key={key} className="my-4 overflow-x-auto text-center">
      <MathSpan math={math} displayMode className="text-[15px]" />
    </div>
  );

  const lines = String(content || '').split(/\r?\n/);
  const out = [];
  let i = 0;
  let key = 0;
  const nextKey = () => `blk-${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    // standalone $$ delimiter block (multi-line display math)
    if (/^\s*\$\$\s*$/.test(line)) {
      const mathLines = [];
      i += 1;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) {
        mathLines.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing $$
      const math = mathLines.join(' ').trim();
      if (math) out.push(displayMath(math, nextKey()));
      continue;
    }

    // single-line display math block — rendered with KaTeX when loaded,
    // plain text otherwise
    const dm = line.match(/^\$\$([\s\S]+?)\$\$\s*$/);
    if (dm) {
      const math = dm[1].trim();
      if (latexToPlain(math)) out.push(displayMath(math, nextKey()));
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
          {renderText(h[2], nextKey(), katex)}
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
          {renderText(quote.join(' '), nextKey(), katex)}
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
                  {parseRow(r).map((c, j) => (
                    <td key={j} className="px-3 py-2 text-slate-300 align-top">
                      {renderText(c, `${nextKey()}-c${ri}-${j}`, katex)}
                    </td>
                  ))}
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
      out.push(<ListGroup key={nextKey()} items={items} keyPrefix={nextKey()} katex={katex} />);
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
    out.push(<InlineBlock key={nextKey()}>{renderText(para.join(' '), nextKey(), katex)}</InlineBlock>);
  }

  return <div className={`text-slate-200 text-[15px] ${className}`}>{out}</div>;
}
