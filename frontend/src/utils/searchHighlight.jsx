import React from 'react';

// Split a query the same way the backend tokenizer does, so highlights and
// the "did you mean" fallback agree with what was actually searched.
export function searchTokens(q) {
  return String(q || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, ''))
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

// Wrap every matched token in <mark> (case-insensitive).
export function highlight(text, tokens) {
  if (!text || !tokens.length) return text;
  let rest = String(text);
  for (const tok of tokens) {
    const re = new RegExp(`(${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    rest = rest.replace(re, '\u0001$1\u0002');
  }
  const parts = [];
  const chunks = rest.split(/(\u0001[^\u0002]*\u0002)/g);
  for (const chunk of chunks) {
    if (!chunk) continue;
    if (chunk.startsWith('\u0001') && chunk.endsWith('\u0002')) {
      parts.push(
        <mark key={parts.length} className="bg-aqua-400/25 text-aqua-100 rounded px-0.5 font-semibold">
          {chunk.slice(1, -1)}
        </mark>,
      );
    } else {
      parts.push(chunk);
    }
  }
  return parts;
}
