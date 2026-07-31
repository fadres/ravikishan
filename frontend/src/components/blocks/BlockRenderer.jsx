import BlockCard, { ICONS } from './BlockCard.jsx';
import Markdown from '../../lib/markdown.jsx';
import CodeBlock from './CodeBlock.jsx';
import MindmapTree from './MindmapTree.jsx';
import DiagramCompare from './DiagramCompare.jsx';

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
          {item.replace(/\*\*/g, '')}
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
          <span className="leading-relaxed">{item.replace(/^\d+\.\s*/, '')}</span>
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

export default function BlockRenderer({ block, subjectType }) {
  const style = BLOCK_STYLE[block.blockType] || BLOCK_STYLE.note_topic;
  const { color, icon, label } = style;
  const glow = block.blockType === 'note_important';

  const renderBody = () => {
    switch (block.blockType) {
      case 'keywords':
        return <KeywordsTags content={block.contentRichtext} />;
      case 'important_points':
        return <PointsList content={block.contentRichtext} />;
      case 'byakaran':
        return <ByakaranBody block={block} />;
      case 'mindmap':
        return <MindmapTree data={block.mindmapJson} />;
      case 'diagram_compare':
        return <DiagramCompare data={block.diagramData} />;
      default:
        return <Markdown content={block.contentRichtext} />;
    }
  };

  return (
    <div className="space-y-1">
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
