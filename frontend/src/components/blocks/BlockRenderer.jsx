import BlockCard, { ICONS } from './BlockCard.jsx';
import Markdown, { MathSpan, RichText } from '../../lib/markdown.jsx';
import CodeBlock from './CodeBlock.jsx';
import MindmapTree from './MindmapTree.jsx';
import DiagramCompare from './DiagramCompare.jsx';
import ErrorBoundary from '../ErrorBoundary.jsx';
import { sectionStyleForKey } from '../../lib/noteStructure.js';

const BLOCK_STYLE = {
  note_topic: { color: '#38bdf8', icon: ICONS.topic, label: 'Topic' },
  note_statement: { color: '#a78bfa', icon: ICONS.statement, label: 'Statement' },
  note_example: { color: '#fbbf24', icon: ICONS.example, label: 'Example' },
  note_concept: { color: '#34d399', icon: ICONS.concept, label: 'Concept' },
  note_important: { color: '#fb7185', icon: ICONS.important, label: 'Important' },
  numerical: { color: '#22d3ee', icon: ICONS.numerical, label: 'Numerical' },
  mindmap: { color: '#818cf8', icon: ICONS.mindmap, label: 'Mind map' },
  diagram_compare: { color: '#2dd4bf', icon: ICONS.compare, label: 'Compare' },
  summary: { color: '#818cf8', icon: ICONS.summary, label: 'Summary' },
  keywords: { color: '#f59e0b', icon: ICONS.keywords, label: 'Keywords' },
  important_points: { color: '#f97316', icon: ICONS.points, label: 'Important points' },
  byakaran: { color: '#f43f5e', icon: ICONS.byakaran, label: 'Byakaran' },
  formula: { color: '#38bdf8', icon: ICONS.formula, label: 'Formula' },
  symbols: { color: '#c084fc', icon: ICONS.symbols, label: 'Symbols' },
  learning_outcome: { color: '#4ade80', icon: ICONS.summary, label: 'Learning Outcomes' },
  mind_recall: { color: '#facc15', icon: ICONS.keywords, label: 'Mind Recall' },
  pyq: { color: '#f87171', icon: ICONS.important, label: 'Past Year Questions' },
  solved_example: { color: '#fb923c', icon: ICONS.numerical, label: 'Solved Example' },
  premium_expansion: { color: '#e879f9', icon: ICONS.mindmap, label: 'Advanced Learning' },
  reference: { color: '#94a3b8', icon: ICONS.summary, label: 'Reference' },
  revision_summary: { color: '#34d399', icon: ICONS.summary, label: 'Revision Summary' },
};

function KeywordsTags({ content }) {
  const items = (content || '')
    .split(/\n|;/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="text-sm px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-100"
        >
          <RichText text={item} />
        </span>
      ))}
    </div>
  );
}

function PointsList({ content }) {
  const items = (content || '')
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-slate-200">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-400/15 border border-orange-400/40 text-orange-300 text-xs font-bold shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span className="leading-relaxed">
            <RichText text={item.replace(/^\d+\.\s*/, '')} />
          </span>
        </li>
      ))}
    </ol>
  );
}

// Byakaran blocks nest by sub_level ("A > B > C") — render with an indent
// breadcrumb trail.
function ByakaranBody({ block }) {
  const levels = (block.subLevel || '').split('>').map((s) => s.trim()).filter(Boolean);
  const depth = Math.max(0, levels.length - 1);
  return (
    <div style={{ marginLeft: Math.min(depth, 4) * 14 }}>
      {levels.length > 1 && (
        <p className="text-[11px] text-rose-300/70 font-medium mb-1">
          {levels.slice(0, -1).join(' › ')}
        </p>
      )}
      <Markdown content={block.contentRichtext} />
    </div>
  );
}

// Formula section: equation lines (those containing "=") render as centered
// KaTeX-display pills; the rest flows as normal markdown. Leading labels like
// "Given:" / "Formula:" are stripped for typesetting but kept in the plain
// fallback so nothing is ever lost.
const FORMULA_LABEL_RE = /^(?:given|formula|using|since|as|where|to\s+find)\s*[:=]\s*/i;
function FormulaBody({ content }) {
  const lines = (content || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) =>
        /[a-zA-Z0-9)\]]\s*=\s*[a-zA-Z0-9(+\-]/.test(line) ? (
          <div
            key={i}
            className="rounded-xl border border-aqua-400/30 bg-aqua-400/10 px-4 py-2.5 text-center overflow-x-auto"
          >
            <MathSpan math={line.replace(FORMULA_LABEL_RE, '')} displayMode className="text-[15px]" />
          </div>
        ) : (
          <Markdown key={i} content={line} />
        ),
      )}
    </div>
  );
}

// Symbols section: tabular "symbol — meaning (unit)" rows. Lines are split on
// " — ", " - ", "=", ":" or tabs; the first line may be a header.
function SymbolsTable({ content }) {
  const lines = (content || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const splitLine = (line) =>
    line
      .replace(/\s+/g, ' ')
      .split(/\s+[—–-]\s+|\s*=\s*|\s*:\s*|\t+/)
      .map((s) => s.trim())
      .filter(Boolean);
  const rows = lines.map(splitLine).filter((r) => r.length > 0);
  if (rows.length === 0) return null;
  const headerish = rows[0].every((c) => /^[a-z][a-z ]+$/i.test(c)) && rows.length > 1;
  const header = headerish ? rows.shift() : ['Symbol', 'Meaning', 'Unit'];
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-violet-300 bg-violet-400/10 border-b border-white/10">
            {header.map((h, i) => (
              <th key={i} className="px-4 py-2 font-bold whitespace-nowrap"><RichText text={h} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {[0, 1, 2].map((c) => (
                <td key={c} className={`px-4 py-2 ${c === 0 ? 'font-mono font-bold text-violet-100' : 'text-slate-300'}`}>
                  <RichText text={r[c] || ''} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Solved examples / numericals usually contain "**Problem:**" then
// "**Solution:**" in one block. Split them so the answer sits visually
// directly below the question — problem in a plain box, solution in a
// highlighted "answer" box.
function QaSplit({ content }) {
  const lines = (content || '').split(/\r?\n/);
  const segments = [];
  let current = null;
  const push = (label, line) => {
    if (!current || current.label !== label) {
      current = { label, lines: [] };
      segments.push(current);
    }
    current.lines.push(line);
  };
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^(?:[-•*]\s+)?\*{0,2}\s*(Problem|Solution|Answer|Result|Conclusion|Given|To Find|Formula Used)\s*:\s*\*{0,2}\s*/i);
    if (m) {
      push(m[1].toLowerCase(), trimmed.replace(m[0], ''));
    } else {
      push('text', line);
    }
  }
  if (segments.length <= 1) return <Markdown content={content} />;
  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        const body = seg.lines.join('\n').trim();
        if (!body) return null;
        if (seg.label === 'solution' || seg.label === 'answer' || seg.label === 'result') {
          return (
            <div key={i} className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-2.5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-300 mb-1">
                {seg.label === 'solution' ? 'Solution' : seg.label === 'result' ? 'Result' : 'Answer'}
              </p>
              <Markdown content={body} />
            </div>
          );
        }
        if (seg.label === 'problem') {
          return (
            <div key={i} className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-3.5 py-2.5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-rose-300 mb-1">Problem</p>
              <Markdown content={body} />
            </div>
          );
        }
        return <Markdown key={i} content={body} />;
      })}
    </div>
  );
}

export default function BlockRenderer({ block, labelOverride, hideTitle = false, showSection = false, embedded = false }) {
  const isEmpty =
    !(block.contentRichtext || '').trim() &&
    !(block.contentCode || '').trim() &&
    !block.mindmapJson &&
    !block.diagramData;
  if (isEmpty) return null;

  const style = BLOCK_STYLE[block.blockType] || BLOCK_STYLE.note_topic;
  const { color, icon } = style;
  const label = labelOverride || style.label;
  const glow = block.blockType === 'note_important';
  const section = showSection ? sectionStyleForKey(block.sectionKey) : null;

  const renderBody = () => {
    switch (block.blockType) {
      case 'numerical':
      case 'solved_example':
      case 'pyq':
        return <QaSplit content={block.contentRichtext} />;
      case 'keywords':
        return <KeywordsTags content={block.contentRichtext} />;
      case 'important_points':
        return <PointsList content={block.contentRichtext} />;
      case 'byakaran':
        return <ByakaranBody block={block} />;
      case 'mindmap':
  return (
          <div>
            <ErrorBoundary fallback={() => <p className="text-sm text-slate-400">This mind map could not be rendered.</p>}>
              <MindmapTree data={block.mindmapJson} />
            </ErrorBoundary>
            {block.mindmapJson?.legend?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                  Symbols used in this diagram
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {block.mindmapJson.legend.map((entry) => (
                    <span
                      key={entry}
                      className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-full px-2.5 py-1"
                    >
                      <RichText text={entry} />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'diagram_compare':
        return <DiagramCompare data={block.diagramData} />;
      case 'formula':
        return <FormulaBody content={block.contentRichtext} />;
      case 'symbols':
        return <SymbolsTable content={block.contentRichtext} />;
      default:
        return <Markdown content={block.contentRichtext} />;
    }
  };

  if (embedded) {
    // Embedded mode: the topic provides the box, this block is a row inside
    // it — label strip + title + body. Hairline separators live on the
    // wrapper in ChapterPage.
    return (
      <div>
        {section && (
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
              style={{ color: section.color, background: `${section.color}1a`, border: `1px solid ${section.color}44` }}
            >
              {section.label}
            </span>
          </div>
        )}
        {block.title && !hideTitle && (
          <h3 className="text-[15px] font-bold text-white mb-1.5">
            {block.title}
            {block.subLevel && block.blockType !== 'byakaran' && (
              <span className="ml-2 text-xs font-semibold text-slate-400">· {block.subLevel}</span>
            )}
          </h3>
        )}
        {renderBody()}
        {block.contentCode && <CodeBlock code={block.contentCode} language={block.codeLanguage} title={block.title} />}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {section && (
        <div className="flex items-center gap-2 pl-1">
          <span
            className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
            style={{ color: section.color, background: `${section.color}1a`, border: `1px solid ${section.color}44` }}
          >
            {section.label}
          </span>
        </div>
      )}
      <BlockCard color={color} icon={icon} label={label} glow={glow}>
{block.title && (
          <h3 className="text-lg font-bold text-white mb-2 mt-1.5">
            {block.title}
            {block.subLevel && block.blockType !== 'byakaran' && (
              <span className="ml-2 text-xs font-semibold text-slate-400">· {block.subLevel}</span>
            )}
          </h3>
        )}
        {renderBody()}
        {block.contentCode && <CodeBlock code={block.contentCode} language={block.codeLanguage} title={block.title} />}
      </BlockCard>
      {block.blockType === 'note_important' && (
        <div
          className="h-8 -mt-4 rounded-b-2xl"
          style={{ background: `linear-gradient(to bottom, ${color}22, transparent)`, opacity: 0.5 }}
        />
      )}
    </div>
  );
}
