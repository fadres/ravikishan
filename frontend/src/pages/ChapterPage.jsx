import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LockedBlockCard from '../components/LockedBlockCard.jsx';
import BlockRenderer from '../components/blocks/BlockRenderer.jsx';
import SectionDivider from '../components/blocks/SectionDivider.jsx';
import { buildChapterStructure, STRUCTURE_COLORS, STRUCTURE_LEGEND, conceptAnchor, romanNumeral } from '../lib/noteStructure.js';

const READ_KEY = (chapterId) => `rk_read_v1:${chapterId}`;

function stripMarkdown(s) {
  return String(s || '')
    .replace(/[#*_`~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ChapterPage() {
  const { classSlug, subjectSlug, chapterSlug } = useParams();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [siblings, setSiblings] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [headerH, setHeaderH] = useState(0);

  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [flashId, setFlashId] = useState('');
  const [activeKey, setActiveKey] = useState('');
  const [copiedAnchor, setCopiedAnchor] = useState('');
  const [readMap, setReadMap] = useState({});

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

  const { chapter, subject, blocks: rawBlocks, topics } = data ?? {};
  const viewerLevel = chapter?.viewerAccessLevel ?? 4;
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

  // ── Syllabus structure: Unit letter + numbered topics + roman concepts ──
  const structure = useMemo(
    () => buildChapterStructure({ chapter, chapters: siblings, topics: topics || [], blocks }),
    [chapter, siblings, topics, blocks],
  );

  // ── Reading tracker ─────────────────────────────────────────────
  useEffect(() => {
    if (!chapter?.id) return;
    try {
      const raw = localStorage.getItem(READ_KEY(chapter.id));
      setReadMap(raw ? JSON.parse(raw) : {});
    } catch {
      setReadMap({});
    }
  }, [chapter?.id]);

  useEffect(() => {
    if (!chapter?.id) return;
    try {
      localStorage.setItem(READ_KEY(chapter.id), JSON.stringify(readMap));
    } catch {
      /* storage full or blocked — tracking is best-effort */
    }
  }, [readMap, chapter?.id]);

  const markRead = (key) => setReadMap((m) => (m[key] ? m : { ...m, [key]: true }));

  const totalConcepts = structure.topics.reduce((n, t) => n + t.concepts.length, 0);
  const readCount = structure.topics.reduce(
    (n, t) => n + t.concepts.filter((c, ci) => readMap[`${t.number}-${ci}`]).length,
    0,
  );
  const percent = totalConcepts ? Math.round((readCount / totalConcepts) * 100) : 0;

  const topicRead = (t) => {
    const total = t.concepts.length;
    const done = t.concepts.filter((c, ci) => readMap[`${t.number}-${ci}`]).length;
    return { done, total, complete: total > 0 && done === total };
  };

  // ── Scroll-spy: track the concept currently in view ─────────────
  useEffect(() => {
    if (!structure.topics.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const key = e.target.dataset.conceptKey;
          if (key) {
            setActiveKey(key);
            markRead(key);
          }
        }
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: 0.05 },
    );
    structure.topics.forEach((t) =>
      t.concepts.forEach((c, ci) => {
        const el = document.getElementById(conceptAnchor(t.number, ci));
        if (el) {
          el.dataset.conceptKey = `${t.number}-${ci}`;
          io.observe(el);
        }
      }),
    );
    return () => io.disconnect();
  }, [structure]);

  // ── Deep links: scroll to #topic-N-concept-M or ?block=<id> on load ──
  useEffect(() => {
    if (!structure.topics.length) return;
    const hash = decodeURIComponent(location.hash || '').replace(/^#/, '');
    if (hash) {
      const el = document.getElementById(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      return;
    }
    const blockId = new URLSearchParams(location.search).get('block');
    if (blockId) {
      const el = document.querySelector(`[data-block-id="${blockId}"]`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setFlashId(el.id.replace('b-', ''));
          setTimeout(() => setFlashId(''), 2000);
        }, 200);
      }
    }
  }, [structure, location.hash, location.search]);

  const topicJump = (number) => {
    document.getElementById(`topic-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpToBlock = (key) => {
    const el = document.getElementById(`b-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashId(key);
      setTimeout(() => setFlashId(''), 2000);
    }
  };

  const copyAnchor = async (anchor) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${location.pathname}#${anchor}`);
      setCopiedAnchor(anchor);
      setTimeout(() => setCopiedAnchor(''), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ── In-chapter Find ─────────────────────────────────────────────
  const findMatches = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    structure.topics.forEach((t) =>
      t.concepts.forEach((c, ci) =>
        c.blocks.forEach((b, bi) => {
          const hay = stripMarkdown(`${b.title || ''} ${b.contentRichtext || ''} ${b.contentCode || ''}`).toLowerCase();
          const idx = hay.indexOf(q);
          if (idx < 0) return;
          const key = `${t.number}-${ci}-${bi}`;
          out.push({
            key,
            title: b.title || `${t.topic.title} — concept ${c.numeral}`,
            snippet: `${hay.slice(Math.max(0, idx - 34), idx)}<b>${hay.slice(idx, idx + q.length)}</b>${hay.slice(idx + q.length, idx + q.length + 42)}`,
            anchor: conceptAnchor(t.number, ci),
            done: Boolean(readMap[`${t.number}-${ci}`]),
          });
        }),
      ),
    );
    return out.slice(0, 60);
  }, [findQuery, structure, readMap]);

  const activeTopic = activeKey ? parseInt(activeKey.split('-')[0], 10) : 0;
  const activeConcept = activeKey ? parseInt(activeKey.split('-')[1], 10) + 1 : 0;

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

      {/* Unit letter + chapter title + legend */}
      <div className="mt-6 mb-6 text-center">
        <div className="inline-flex flex-col items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl font-extrabold shadow-[0_0_30px_-6px_rgba(251,191,36,.55)]"
            style={{
              color: '#1a1504',
              background: `linear-gradient(135deg, #fde68a, ${STRUCTURE_COLORS.chapter})`,
            }}
            title="Unit letter"
          >
            {structure.unitLetter}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{chapter.title}</h1>
          <p className="text-sm text-slate-400">
            {subject.name} · {blocks.length} section{blocks.length === 1 ? '' : 's'} · {structure.topics.length} topic{structure.topics.length === 1 ? '' : 's'} · {totalConcepts} concept{totalConcepts === 1 ? '' : 's'}
          </p>
        </div>

        {/* Legend — explains the colour system of the whole page */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {STRUCTURE_LEGEND.map((entry) => (
            <span key={entry.symbol} className="inline-flex items-center gap-2 glass rounded-full pl-2 pr-3.5 py-1 text-xs font-bold text-slate-200">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold"
                style={{ background: `${entry.color}22`, color: entry.color, border: `1px solid ${entry.color}66` }}
              >
                {entry.symbol}
              </span>
              {entry.label}
            </span>
          ))}
        </div>
      </div>

      {/* Access tier banner — public 15% → login 25% → member 50% → premium 100% */}
      {!hasFullAccess && (
        <div
          className="mb-6 glass rounded-2xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 24px -12px ${subject.themeColor}66` }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">
              You are viewing the {viewerLevel === 4 ? 'free public preview' : viewerLevel === 3 ? 'guest' : 'member'} tier
              {viewerLevel === 4 ? ' — about 15% of this chapter.' : viewerLevel === 3 ? ' — about 25% of this chapter.' : ' — about 50% of this chapter.'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewerLevel === 4
                ? 'Log in to see 25%, or click "Access it" below any concept to become a member (50%).'
                : viewerLevel === 3
                  ? 'Become a member to unlock 50% — click "Access it" below any concept.'
                  : 'Members see 50%. Premium (100%) is granted by the owner.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {viewerLevel === 4 && (
              <Link
                to={`/login?next=${encodeURIComponent(location.pathname)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
              >
                Log in for 25%
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Outline chips — jump to any topic; shows read progress */}
      {structure.topics.length > 1 && (
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
          {structure.topics.map((t) => {
            const tr = topicRead(t);
            const active = activeTopic === t.number;
            return (
              <button
                key={t.number}
                onClick={() => topicJump(t.number)}
                className={`shrink-0 inline-flex items-center gap-2 glass rounded-full pl-1.5 pr-3.5 py-1.5 text-xs font-bold transition ${
                  active ? 'text-white border-aqua-400/60' : 'text-slate-200 hover:text-white hover:border-aqua-400/50'
                }`}
                style={active ? { borderColor: STRUCTURE_COLORS.topic, boxShadow: `0 0 14px -4px ${STRUCTURE_COLORS.topic}` } : undefined}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold"
                  style={
                    tr.complete
                      ? { background: '#34d39922', color: '#34d399', border: '1px solid #34d39988' }
                      : { background: `${STRUCTURE_COLORS.topic}22`, color: STRUCTURE_COLORS.topic, border: `1px solid ${STRUCTURE_COLORS.topic}66` }
                  }
                >
                  {tr.complete ? '✓' : t.number}
                </span>
                <span className="max-w-[150px] truncate">{t.topic.title}</span>
                <span className="text-[10px] text-slate-500">{tr.complete ? '' : `${tr.done}/${tr.total}`}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Home / Back / Next + Find + progress — always visible, pinned below the header */}
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
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400"
            title={`${readCount} of ${totalConcepts} concepts read`}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {percent}%
          </span>

          <button
            onClick={() => setFindOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition ${
              findOpen ? 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300' : 'glass text-slate-200 hover:text-white hover:border-aqua-400/50'
            }`}
            aria-label="Find in chapter"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            Find
          </button>

          <Link
            to={prevChapter ? chapterHref(prevChapter) : `/class/${classSlug}/subject/${subjectSlug}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass text-xs font-bold text-slate-200 hover:text-white hover:border-aqua-400/50 transition"
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

      {/* Position breadcrumb + Find panel */}
      <div className="mb-6 space-y-3">
        {activeKey && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            You are here — Unit <span className="text-amber-300">{structure.unitLetter}</span> · Topic{' '}
            <span className="text-aqua-300">{activeTopic}</span> · Concept{' '}
            <span className="text-violet-300">{romanNumeral(activeConcept)}</span>
          </p>
        )}

        {findOpen && (
          <div className="relative glass rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7dd3fc" strokeWidth="2.4" strokeLinecap="round" className="shrink-0 ml-1">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder={`Find in "${chapter.title}"…`}
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              {findQuery && (
                <span className="text-[11px] text-slate-400 shrink-0">
                  {findMatches.length} match{findMatches.length === 1 ? '' : 'es'}
                </span>
              )}
              {findQuery && (
                <button
                  onClick={() => setFindQuery('')}
                  className="shrink-0 text-xs font-bold text-slate-400 hover:text-white px-1.5"
                  aria-label="Clear find"
                >
                  ✕
                </button>
              )}
            </div>

            {findQuery && (
              <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5">
                {findMatches.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 py-3 text-center">No matches in this chapter.</p>
                ) : (
                  findMatches.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => jumpToBlock(m.key)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-aqua-400/15 transition"
                    >
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: '#38bdf866', color: '#38bdf8' }}>
                          {m.anchor}
                        </span>
                        <span className="truncate">{m.title}</span>
                        {m.done && <span className="text-[10px] text-emerald-300 shrink-0">read ✓</span>}
                      </span>
                      <span className="block text-xs text-slate-400 mt-1 truncate" dangerouslySetInnerHTML={{ __html: m.snippet }} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {structure.topics.length === 0 && (
        <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">
          This chapter has no notes yet.
        </p>
      )}

      {structure.topics.map((t, ti) => {
        const tr = topicRead(t);
        return (
          <section key={t.topic.id ?? `untitled-${t.number}`} id={`topic-${t.number}`} className="relative pl-11 sm:pl-14">
            {/* Topic rail — the numbered left margin */}
            <div className="absolute left-0 top-1 bottom-0 flex flex-col items-center w-8 sm:w-10">
              <span
                className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-sm font-extrabold shrink-0 shadow-[0_0_18px_-4px_rgba(56,189,248,.6)]"
                style={
                  tr.complete
                    ? { color: '#34d399', border: `1.5px solid #34d39988`, background: '#34d3991a' }
                    : activeTopic === t.number
                      ? { color: '#fff', border: `1.5px solid ${STRUCTURE_COLORS.topic}`, background: `${STRUCTURE_COLORS.topic}55` }
                      : { color: STRUCTURE_COLORS.topic, border: `1.5px solid ${STRUCTURE_COLORS.topic}88`, background: `${STRUCTURE_COLORS.topic}1a` }
                }
              >
                {tr.complete ? '✓' : t.number}
              </span>
              <span className="mt-2 w-px flex-1" style={{ background: `linear-gradient(to bottom, ${STRUCTURE_COLORS.topic}66, transparent)` }} />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug" style={{ marginLeft: 2 }}>
              {t.topic.title}
            </h2>
            {t.topic.description && <p className="text-sm text-slate-400 mt-1">{t.topic.description}</p>}
            {totalConcepts > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                {tr.complete ? 'Topic complete ✓' : `${tr.done} / ${tr.total} concept${tr.total === 1 ? '' : 's'} read`}
              </p>
            )}

            <div className="mt-4 space-y-8">
              {t.concepts.map((c, ci) => {
                const headBlock = c.blocks.find((b) => b.blockType === 'note_topic');
                const anchor = conceptAnchor(t.number, ci);
                const isRead = Boolean(readMap[`${t.number}-${ci}`]);
                const numeralBadge = (
                  <span
                    className="inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-full text-xs font-extrabold shrink-0"
                    style={
                      isRead
                        ? { color: '#34d399', border: `1.5px solid #34d39988`, background: '#34d3991a' }
                        : { color: STRUCTURE_COLORS.concept, border: `1.5px solid ${STRUCTURE_COLORS.concept}88`, background: `${STRUCTURE_COLORS.concept}1a` }
                    }
                  >
                    {isRead ? '✓' : c.numeral}
                  </span>
                );
                return (
                  <div key={ci} id={anchor} className="space-y-3 scroll-mt-32">
                    <div className="flex items-center gap-2.5">
                      {numeralBadge}
                      {headBlock?.title && <h3 className="text-base font-bold text-white leading-snug">{headBlock.title}</h3>}
                      <button
                        onClick={() => copyAnchor(anchor)}
                        title="Copy link to this concept"
                        className="ml-auto shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full glass text-slate-300 hover:text-aqua-200 hover:border-aqua-400/50 transition"
                      >
                        {copiedAnchor === anchor ? 'Copied ✓' : 'Link'}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {c.blocks.map((block, bi) => {
                        const isHead = block === headBlock;
                        const bKey = `${t.number}-${ci}-${bi}`;
                        return (
                          <div
                            key={block.id ?? bKey}
                            id={`b-${bKey}`}
                            data-block-id={block.id || ''}
                            className={`rounded-2xl scroll-mt-32 ${flashId === bKey ? 'rk-flash' : ''}`}
                          >
                            {hasContent(block) ? (
                              <BlockRenderer
                                block={block}
                                themeColor={subject.themeColor}
                                hideTitle={isHead && block.title}
                                showSection
                              />
                            ) : (
                              <LockedBlockCard
                                block={block}
                                themeColor={subject.themeColor}
                                topicLabel={`${t.number}.${ci + 1}`}
                                contactEmail={contactEmail}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {ti < structure.topics.length - 1 ? (
              <SectionDivider variant="section" />
            ) : (
              <SectionDivider variant="chapter" />
            )}
          </section>
        );
      })}
    </div>
  );
}
