// Block-type metadata for search results: every block gets a premium box
// naming what kind of content it is (topic / concept / example / …).

export const TYPE_META = {
  chapter: { label: 'Chapter', color: '#7dd3fc' },
  subject: { label: 'Subject', color: '#34d399' },
  note_topic: { label: 'Topic', color: '#38bdf8' },
  note_concept: { label: 'Concept', color: '#2dd4bf' },
  note_statement: { label: 'Statement', color: '#818cf8' },
  note_example: { label: 'Example', color: '#a78bfa' },
  note_important: { label: 'Key Points', color: '#fbbf24' },
  important_points: { label: 'Important Points', color: '#f97316' },
  numerical: { label: 'Numerical', color: '#fb923c' },
  formula: { label: 'Formula', color: '#f472b6' },
  mindmap: { label: 'Mindmap', color: '#34d399' },
  diagram_compare: { label: 'Diagram', color: '#22d3ee' },
  quiz: { label: 'Quiz', color: '#60a5fa' },
  code: { label: 'Code', color: '#94a3b8' },
  byakaran: { label: 'Byakaran', color: '#fb7185' },
  summary: { label: 'Summary', color: '#818cf8' },
  keywords: { label: 'Keywords', color: '#f59e0b' },
  learning_outcome: { label: 'Learning Outcomes', color: '#4ade80' },
  mind_recall: { label: 'Mind Recall', color: '#facc15' },
  pyq: { label: 'Past Year Questions', color: '#f87171' },
  solved_example: { label: 'Solved Example', color: '#fb923c' },
  premium_expansion: { label: 'Advanced Learning', color: '#e879f9' },
  reference: { label: 'Reference', color: '#94a3b8' },
  revision_summary: { label: 'Revision Summary', color: '#34d399' },
  symbols: { label: 'Symbols', color: '#c084fc' },
};

export function typeMeta(blockType) {
  return TYPE_META[blockType] || { label: 'Topic', color: '#7dd3fc' };
}

export function TypeBadge({ blockType, className = '' }) {
  const meta = typeMeta(blockType);
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${className}`}
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        background: `linear-gradient(135deg, ${meta.color}26, ${meta.color}0d)`,
        boxShadow: `0 0 12px -6px ${meta.color}`,
      }}
    >
      {meta.label}
    </span>
  );
}

export function AccessBadge({ accessLevel }) {
  const premium = accessLevel === 1;
  const members = accessLevel === 2;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
        premium
          ? 'text-amber-300 border-amber-400/40 bg-amber-400/10'
          : members
            ? 'text-aqua-200 border-aqua-400/40 bg-aqua-400/10'
            : 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10'
      }`}
    >
      {premium ? 'Premium' : members ? 'Members' : 'Free'}
    </span>
  );
}
