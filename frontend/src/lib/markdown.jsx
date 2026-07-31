// Mini markdown → React renderer.
// Deliberately dependency-free and XSS-safe: all input is HTML-escaped first;
// only bold/italic/inline-code/math/list/quote/heading tokens are parsed.
// KaTeX handles $...$ math; unknown math falls back to plain text.

import katex from 'katex';

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

function InlineBlock({ children, key }) {
  return <p key={key} className="leading-relaxed">{children}</p>;
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

    // lists
    if (/^\s*(-|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*(-|\d+\.)\s+/.test(lines[i])) {
        const indent = lines[i].match(/^\s*/)[0].length;
        const text = lines[i].replace(/^\s*(-|\d+\.)\s+/, '');
        items.push(
          <li key={nextKey()} className={indent > 0 ? 'ml-5 list-disc' : ''}>
            {renderText(text, nextKey())}
          </li>,
        );
        i += 1;
      }
      out.push(<ul key={nextKey()} className="my-2 space-y-1.5 list-disc list-inside">{items}</ul>);
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
