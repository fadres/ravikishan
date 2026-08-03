import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
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
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [siblings, setSiblings] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [headerH, setHeaderH] = useState(0);

  // The sticky Home/Back/Next bar sits directly below the fixed header, so it
  // must track the header's real height (mobile header is two rows tall).
  useEffect(() => {
    const header = document.querySelector('header');
    const searchBar = document.querySelector('.md\\:hidden.header-solid.border-b');
    const update = () => {
      if (header) setHeaderH(header.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    if (header) ro.observe(header);
    if (searchBar) ro.observe(searchBar);
    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, []);

  const load = useCallback(() => {
    setData(null);
    setError('');
    api(`/api/subjects/${subjectSlug}/chapters/${chapterSlug}?class=${classSlug}`)
      .then((d) => setData(d))
      .catch(() => setError('Chapter not found.'));
    api(`/api/subjects/${subjectSlug}?class=${classSlug}`)
      .then((d) => setSiblings(d.subject?.chapters || []))
      .catch(() => setSiblings([]));
  }, [subjectSlug, chapterSlug, classSlug]);

  useEffect(() => {
    load();
  }, [load, user?.accessLevel]);

  useEffect(() => {
    api('/api/meta')
      .then((d) => setContactEmail(d.contactEmail || ''))
      .catch(() => {});
  }, []);

  const { chapter, subject, blocks: rawBlocks } = data ?? {};
  const viewerLevel = chapter?.viewerAccessLevel ?? 3;
  const hasFullAccess = isAdmin || viewerLevel === 1;

  // Empty boxes never render: only blocks with real content survive for full
  // access; locked viewers still keep titled cards (their content is gated
  // server-side, so only the title is available to show).
  const hasContent = (b) =>
    Boolean((b.contentRichtext || '').trim()) ||
    Boolean((b.contentCode || '').trim()) ||
    Boolean(b.mindmapJson) ||
    Boolean(b.diagramData);
  const blocks = (rawBlocks || []).filter((b) => (hasFullAccess ? hasContent(b) : hasContent(b) || Boolean(b.title)));

  // T1, T2, … numbering for topic blocks, in reading order.
  // Also creates numbered sections like 1.1, 1.2, 1.3 for large chapters
  const topicLabels = useMemo(() => {
    const map = new Map();
    let t = 0;
    let topicCount = 0;
    for (const b of blocks) {
      if (b.blockType === 'note_topic') {
        t++;
        topicCount++;
        map.set(b.id, `T${t}`);
        // Add numbered sections for large topics (4+ sections per topic)
        if (topicCount > 4 && topicCount <= 8) {
          map.set(b.id + '_sub1', `1.1`);
        } else if (topicCount > 8 && topicCount <= 12) {
          map.set(b.id + '_sub2', `1.2`);
        } else if (topicCount > 12 && topicCount <= 16) {
          map.set(b.id + '_sub3', `1.3`);
        } else if (topicCount > 16) {
          map.set(b.id + '_sub4', `1.4`);
        }
      }
    }
    return map;
  }, [blocks]);

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

  const idx = siblings.findIndex((c) => c.slug === chapterSlug);
  const prevChapter = idx > 0 ? siblings[idx - 1] : null;
  const nextChapter = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const chapterHref = (c) => `/class/${classSlug}/subject/${subjectSlug}/chapter/${c.slug}`;

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

      {/* Home / Back / Next — always visible, pinned below the header */}
      <div
        className="sticky z-30 mb-6 flex items-center justify-between gap-2 glass rounded-2xl px-2.5 sm:px-4 py-2"
        style={{ top: headerH }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass text-xs font-bold text-slate-200 hover:text-white hover:border-aqua-400/50 transition"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </svg>
          Home
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={prevChapter ? chapterHref(prevChapter) : `/class/${classSlug}/subject/${subjectSlug}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass text-xs font-bold text-slate-200 hover:text-white hover:border-aqua-400/50 transition"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Back
          </Link>

          <Link
            to={nextChapter ? chapterHref(nextChapter) : `/class/${classSlug}/subject/${subjectSlug}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
          >
            {nextChapter ? 'Next' : 'Done'}
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {buildItems(blocks).map((item, i) => {
          if (item.type === 'divider') {
            return <SectionDivider key={`div-${i}`} variant={item.variant === 'chapter' ? 'chapter' : 'section'} />;
          }
          const topicLabel = topicLabels.get(item.block.id);
          const subLabel = topicLabels.get(item.block.id + '_sub1') || 
            topicLabels.get(item.block.id + '_sub2') || 
            topicLabels.get(item.block.id + '_sub3') || 
            topicLabels.get(item.block.id + '_sub4');
          return hasFullAccess ? (
            <BlockRenderer
              key={item.block.id}
              block={item.block}
              themeColor={subject.themeColor}
              labelOverride={topicLabel ? `T${topicLabel}` : undefined}
            />
          ) : (
            <LockedBlockCard
              key={item.block.id}
              block={item.block}
              themeColor={subject.themeColor}
              topicLabel={topicLabel ? `T${topicLabel}` : undefined}
              contactEmail={contactEmail}
            />
          );
        })}
        {blocks.length === 0 && (
          <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">
            This chapter has no notes yet.
          </p>
        )}

        {/* Render numbered sub-sections for large chapters */}
        {blocks.filter(b => b.blockType === 'note_topic' && topicLabels.has(b.id + '_sub1')).length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topicLabels.get(blocks.find(b => b.blockType === 'note_topic' && topicLabels.has(b.id + '_sub1'))?.id + '_sub1') && (
                <div className="p-4 glass rounded-xl border-l-4 border-aqua-400">
                  <h4 className="text-sm font-bold text-aqua-300 mb-2">Section 1.1</h4>
                  <p className="text-xs text-slate-400">Introduction and overview</p>
                </div>
              )}
              {topicLabels.get(blocks.find(b => b.blockType === 'note_topic' && topicLabels.has(b.id + '_sub2'))?.id + '_sub2') && (
                <div className="p-4 glass rounded-xl border-l-4 border-emerald-400">
                  <h4 className="text-sm font-bold text-emerald-300 mb-2">Section 1.2</h4>
                  <p className="text-xs text-slate-400">Detailed concepts and applications</p>
                </div>
              )}
              {topicLabels.get(blocks.find(b => b.blockType === 'note_topic' && topicLabels.has(b.id + '_sub3'))?.id + '_sub3') && (
                <div className="p-4 glass rounded-xl border-l-4 border-purple-400">
                  <h4 className="text-sm font-bold text-purple-300 mb-2">Section 1.3</h4>
                  <p className="text-xs text-slate-400">Advanced topics and case studies</p>
                </div>
              )}
              {topicLabels.get(blocks.find(b => b.blockType === 'note_topic' && topicLabels.has(b.id + '_sub4'))?.id + '_sub4') && (
                <div className="p-4 glass rounded-xl border-l-4 border-orange-400">
                  <h4 className="text-sm font-bold text-orange-300 mb-2">Section 1.4</h4>
                  <p className="text-xs text-slate-400">Summary and future directions</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
