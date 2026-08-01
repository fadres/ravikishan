import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import LockedBlockCard from '../components/LockedBlockCard.jsx';
import BlockRenderer from '../components/blocks/BlockRenderer.jsx';
import SectionDivider from '../components/blocks/SectionDivider.jsx';

// End-of-section dividers (4d): a pure frontend rendering rule, nothing stored.
// Insert a divider after a topic group (before the next note_topic), after a
// concept group (last note_concept in a run), and after the very last block.
// Chapter dividers take precedence over group dividers.
function buildItems(blocks) {
  const items = [];
  blocks.forEach((block, i) => {
    items.push({ type: 'block', block });
    const next = blocks[i + 1];
    const isLast = !next;
    if (isLast) {
      items.push({ type: 'divider', variant: 'chapter' });
    } else if (next.blockType === 'note_topic' && block.blockType !== 'note_topic') {
      items.push({ type: 'divider', variant: 'topic' });
    } else if (block.blockType === 'note_concept' && next.blockType !== 'note_concept') {
      items.push({ type: 'divider', variant: 'concept' });
    }
  });
  return items;
}

export default function ChapterPage() {
  const { classSlug, subjectSlug, chapterSlug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api(`/api/subjects/${subjectSlug}/chapters/${chapterSlug}`)
      .then((d) => setData(d))
      .catch(() => setError('Chapter not found.'));
  }, [subjectSlug, chapterSlug]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-300">{error}</p>
        <Link to="/" className="inline-block mt-4 text-aqua-300 hover:text-aqua-100">← Back home</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  const { chapter, subject, blocks } = data;
  const viewerLevel = chapter.viewerAccessLevel ?? 3;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <nav className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
        <Link to={`/class/${classSlug}`} className="hover:text-aqua-300 transition">{classSlug === 'class-11' ? 'Class 11' : 'Class 12'}</Link>
        <span className="text-slate-600">›</span>
        <Link to={`/class/${classSlug}/subject/${subjectSlug}`} className="hover:text-aqua-300 transition">{subject.name}</Link>
        <span className="text-slate-600">›</span>
        <span className="text-slate-200">{chapter.title}</span>
      </nav>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{chapter.title}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {subject.name} · {blocks.length} section{blocks.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-6">
        {buildItems(blocks).map((item, i) =>
          item.type === 'divider' ? (
            <SectionDivider key={`div-${i}`} variant={item.variant === 'chapter' ? 'chapter' : 'section'} />
          ) : (item.block.accessLevel ?? 3) > viewerLevel ? (
            <LockedBlockCard key={item.block.id} block={item.block} themeColor={subject.themeColor} />
          ) : (
            <BlockRenderer key={item.block.id} block={item.block} subjectType={subject.type} />
          ),
        )}
        {blocks.length === 0 && (
          <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">
            This chapter has no notes yet.
          </p>
        )}
      </div>
    </div>
  );
}
