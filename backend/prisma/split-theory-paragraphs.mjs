// Ravikishan theory paragraph splitter.
//
// The legacy corpus stores each concept as an HTML <p> string, but many <p>
// elements pack several theoretical concepts into one wall of text (e.g.
// "<b>Definition:</b> … <b>Example:</b> … <b>Explanation:</b> …" or long
// numbered lists joined by <br>).  This script re-parses every notes entry
// and splits those long paragraphs at concept boundaries:
//
//   • double <br><br>                → new paragraph
//   • <br> + numbered item / label   → new paragraph
//   • bold concept label (Definition:, Example:, History:, …) → new paragraph
//   • sentence end in long text      → new paragraph
//
// Text-only notes (no HTML) that are single long lines get blank-line breaks
// between sentences too.  At least one break is inserted wherever a theory
// paragraph is long; short single-concept paragraphs are left untouched.
//
// Idempotent, edits the JSON files in place (the source of truth), then run:
//   npm run content:import

import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import { Element, Text } from 'domhandler';
import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(HERE, 'import-data');

// ── Concept labels ────────────────────────────────────────────────────────
// A <b>/<strong> element whose text starts with one of these begins a new
// paragraph.  Long labels may also be followed by plain words ("Definition of
// …"), short ones only by punctuation ("Note:", "Q?").

const LABELS = `stop to think,common misconception,did you know,worked example,self test opportunity,key definition,key points,key point,quick recall,working principle,self test,solved example,short answer,exam tip,si units,si unit,cgs units,cgs unit,important example,definitions,definition,statement,explanation,illustration,importance,significance,properties,property,characteristics,characteristic,features,feature,advantages,advantage,disadvantages,disadvantage,limitations,limitation,applications,application,classifications,classification,history,origin,discovery,answer,question,notes,note,remember,conclusion,result,analogy,cause,effects,effect,reasons,reason,differences,difference,comparison,principle,formulas,formula,equation,mathematically,symbolically,ranges,range,units,unit,dimensions,dimension,symbols,symbol,derivation,proof,methods,method,steps,step,procedure,experiment,observations,observation,inference,functions,function,roles,role,structures,structure,construction,exceptions,exception,rules,rule,reminder,tips,tip,tricks,trick,shortcuts,shortcut,facts,fact,summaries,summary,recap,nomenclature,notation,examples,example,types,type,kinds,kind,uses,use,what,why,how,when,where,who,which,q,a,solution,correct answer`
  .split(',')
  .sort((a, b) => b.length - a.length);

function labelOf(text) {
  const t = String(text || '').replace(/^[\s\p{Extended_Pictographic}]+/u, '');
  const lower = t.toLowerCase();
  for (const label of LABELS) {
    if (!lower.startsWith(label)) continue;
    const rest = lower.slice(label.length);
    if (!rest) return label.length >= 4 ? label : null;
    const ch = rest[0];
    if ('[:;?.,·…]'.includes(ch)) return label;
    if (label.length >= 8 && ch === ' ') return label;
  }
  return null;
}

// ── Sentence splitting ────────────────────────────────────────────────────
// Split after . ! ? … when followed by a new sentence start (uppercase letter,
// quote, math, digit = new numbered item), guarding decimals and abbreviations.

const ABBR_RE = /(?:e\.g|i\.e|etc|vs|no|nos|fig|figs|eq|eqs|approx|dr|mr|mrs|ms|sr|jr|st|prof|cf|ca|al|ed|a\.m|p\.m|u\.s|u\.s\.a|a\.d|b\.c|inc|corp|lt|est|min|max|hr|sec|mm|cm|km|kg|gm|mol|cal|g|ml|l|vol|temp|deg)\.$/i;

function splitSentences(str) {
  const out = [];
  let start = 0;
  const re = /([.!?…])(\s+)(?=<|[A-Z$"'“(«\d])/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index <= start) continue;
    const before = str.slice(start, m.index);
    if (/\d$/.test(before)) continue;
    if (ABBR_RE.test(before)) continue;
    out.push(str.slice(start, m.index + 1));
    start = m.index + m[0].length;
  }
  out.push(str.slice(start));
  return out.filter((s) => s.trim());
}

// ── HTML paragraph splitting ──────────────────────────────────────────────

const PROSE = new Set(['p', 'div', 'blockquote']);
const MIN_SPLIT_LEN = 140; // visible-text threshold for sentence-level breaks

function nodeText(node) {
  if (node.type === 'text') return node.data;
  if (node.type === 'tag') return (node.children || []).map(nodeText).join('');
  return '';
}

// Splits the children of one prose container into paragraph fragments.
function splitProseChildren(children) {
  const frags = [[]];
  let cur = frags[0];
  let textLen = 0;
  let curText = '';
  let pendingBr = 0;

  const endsSentence = (s) => /[.!?:;…]\s*$/.test(s.trim());
  const flush = () => {
    frags.push([]);
    cur = frags[frags.length - 1];
    textLen = 0;
    curText = '';
  };
  const push = (n) => {
    cur.push(n);
    const t = nodeText(n);
    textLen += t.length;
    curText += t;
  };

  for (const n of children) {
    if (n.type === 'tag' && n.name.toLowerCase() === 'br') {
      pendingBr += 1;
      continue;
    }

    // Resolve pending <br> runs against the current node before processing it
    // (text nodes must see the boundary too, not just tag nodes).
    if (pendingBr > 0) {
      const textAfter = nodeText(n).trim();
      const numberedAfter = /^(?:\d+[.)]|\([ivxlcdm]+\)|[a-f][.)])/.test(textAfter);
      const labelAfter =
        n.type === 'tag' &&
        (n.name === 'b' || n.name === 'strong') &&
        Boolean(labelOf(nodeText(n))) &&
        endsSentence(curText);
      if (pendingBr >= 2 || numberedAfter || labelAfter) flush();
      else for (let i = 0; i < pendingBr; i += 1) push(new Element('br', {}));
      pendingBr = 0;
    }

    if (n.type === 'text') {
      const t = n.data;
      if (!t.trim()) continue;
      if (textLen >= MIN_SPLIT_LEN) {
        const sentences = splitSentences(t);
        for (let s = 0; s < sentences.length; s += 1) {
          if (s > 0) flush();
          push(new Text(sentences[s]));
        }
      } else {
        push(n);
      }
      continue;
    }
    if (n.type !== 'tag') {
      push(n);
      continue;
    }
    if (n.name === 'b' || n.name === 'strong') {
      if (labelOf(nodeText(n)) && cur.length > 0 && endsSentence(curText)) flush();
      push(n);
      continue;
    }
    push(n);
  }
  if (pendingBr > 0) push(new Element('br', {}));

  return frags
    .map((f) => f.filter((x) => !(x.type === 'text' && !x.data.trim())))
    .filter((f) => f.some((x) => x.type === 'tag' || (x.type === 'text' && x.data.trim())));
}

function splitContainer(node) {
  const frags = splitProseChildren(node.children || []);
  if (frags.length <= 1) return;
  const parent = node.parent;
  const idx = parent.children.indexOf(node);
  const attrs = { ...(node.attribs || {}) };
  parent.children.splice(
    idx,
    1,
    ...frags.map((f, i) => new Element('p', i === 0 ? attrs : {}, f)),
  );
}

function processNode(node) {
  if (node.type !== 'tag') return;
  const name = node.name.toLowerCase();
  if (PROSE.has(name)) {
    splitContainer(node);
    return;
  }
  for (const child of [...(node.children || [])]) processNode(child);
}

function splitNoteHtml(html) {
  const doc = parseDocument(html, { decodeEntities: true });
  for (const child of [...doc.children]) processNode(child);
  return render(doc, { encodeEntities: false });
}

// ── Text notes ────────────────────────────────────────────────────────────

function splitTextNote(text) {
  const t = String(text || '').trim();
  if (!t || t.includes('\n') || t.length < MIN_SPLIT_LEN) return t;
  const sentences = splitSentences(t);
  return sentences.length > 1 ? sentences.join('\n\n') : t;
}

// ── Main ──────────────────────────────────────────────────────────────────

function listContentFiles() {
  const files = [];
  const root = join(DATA_DIR, 'content');
  if (!existsSync(root)) return files;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.toLowerCase().endsWith('.json')) files.push(p);
    }
  };
  walk(root);
  return files;
}

let filesChanged = 0;
let notesSplit = 0;

for (const file of listContentFiles()) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object') continue;
  const notes = Array.isArray(parsed.notes) ? parsed.notes : parsed.notes ? [parsed.notes] : [];
  if (!notes.length) continue;

  const isHtml = /<[a-z][\s\S]*>/i.test(notes.join(''));

  const process = (item) => {
    const raw = String(item);
    if (isHtml) return splitNoteHtml(raw);
    return splitTextNote(raw);
  };

  // Only rewrite notes whose content actually changed — the HTML round-trip
  // re-encodes entities, so unchanged notes must be kept byte-for-byte.
  let changed = false;
  const next = Array.isArray(parsed.notes) ? notes.map(process) : process(notes[0]);

  if (Array.isArray(parsed.notes)) {
    changed = notes.some((n, i) => n !== next[i]);
    parsed.notes = next;
  } else if (notes[0] !== next) {
    changed = true;
    parsed.notes = next;
  }

  if (!changed) continue;
  filesChanged += 1;
  notesSplit += 1;
  // Write via temp + rename: direct writes hit EPERM on Windows when the
  // target is momentarily held open by another process (editor, watcher).
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
}

console.log(`✓ Paragraph split complete — ${filesChanged} files touched.`);
