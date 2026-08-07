import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, sectionApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LockedBlockCard from '../components/LockedBlockCard.jsx';
import BlockRenderer from '../components/blocks/BlockRenderer.jsx';
import SectionDivider from '../components/blocks/SectionDivider.jsx';
import { buildChapterStructure, STRUCTURE_COLORS, STRUCTURE_LEGEND, conceptAnchor, romanNumeral } from '../lib/noteStructure.js';
import { sectionById, sectionPath } from '../lib/sectionLinks.js';

const READ_KEY = (chapterId) => `rk_read_v1:${chapterId}`;

function stripMarkdown(s) {
  return String(s || '')
    .replace(/[#*_`~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// HTML-escape before the snippet is injected via dangerouslySetInnerHTML —
// note content is author-supplied, so it must never reach the DOM raw.
function escHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

export default function ChapterPage() {
  const { sectionId, subjectSlug, chapterSlug } = useParams();
  const section = sectionById(sectionId);
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
  const [bookmarked, setBookmarked] = useState(false);
  const syncTimer = useRef(null);
  const streakSynced = useRef(false);

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
    // Content is section-scoped — served by the section's own backend when
    // it is an independent service (class-12-test), global otherwise.
    sectionApi(`/api/subjects/${subjectSlug}/chapters/${chapterSlug}?class=${section.classSlug}`, sectionId)
      .then((d) => setData(d))
      .catch(() => setError('Chapter not found.'));
    sectionApi(`/api/subjects/${subjectSlug}?class=${section.classSlug}`, sectionId)
      .then((d) => setSiblings(d.subject?.chapters || []))
      .catch(() => setSiblings([]));
  }, [subjectSlug, chapterSlug, sectionId]);

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

  // ── Duplicate concepts (Type 1/2/3) ─────────────────────────────
  // Blocks with the same body (dupGroupId) are repeated versions of one
  // concept. We collapse each dup group into a single concept box with
  // Type-1/2/3 tabs; the first occurrence keeps its position and anchor.
  const slotsByTopic = useMemo(() => {
    return structure.topics.map((t) => {
      const groups = new Map();
      const used = new Set();
      const dupOf = (c) => {
        const b = c.blocks.find((x) => x.dupGroupId);
        return b ? { groupId: b.dupGroupId, typeIndex: b.dupTypeIndex } : null;
      };
      t.concepts.forEach((c, ci) => {
        const d = dupOf(c);
        if (d) {
          if (!groups.has(d.groupId)) groups.set(d.groupId, []);
          groups.get(d.groupId).push({ ci, typeIndex: d.typeIndex });
        }
      });
      const slots = [];
      for (let ci = 0; ci < t.concepts.length; ci++) {
        if (used.has(ci)) continue;
        const d = dupOf(t.concepts[ci]);
        if (d && groups.has(d.groupId)) {
          const members = groups.get(d.groupId);
          members.forEach((m) => used.add(m.ci));
          const sorted = [...members].sort((a, b) => a.typeIndex - b.typeIndex);
          slots.push({
            kind: 'group',
            groupId: d.groupId,
            conceptIndex: sorted[0].ci,
            variantIndexes: sorted.map((m) => m.ci),
          });
        } else if (!d) {
          used.add(ci);
          slots.push({ kind: 'concept', conceptIndex: ci });
        }
      }
      return slots;
    });
  }, [structure]);

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

  // ── Server sync for signed-in readers ────────────────────────
  // Bookmarks: load this chapter's bookmark state.
  useEffect(() => {
    if (!user || !chapter?.id) return;
    api('/api/progress/bookmarks')
      .then((d) => {
        const bm = (d.bookmarks || []).find((b) => b.chapter?.id === chapter.id && !b.blockId);
        setBookmarked(Boolean(bm));
      })
      .catch(() => {});
  }, [user, chapter?.id]);

  // Progress: once the reader actually reads, bump the streak (once per
  // chapter visit) and debounce-push the concept count to the server.
  useEffect(() => {
    if (!user || !chapter?.id || totalConcepts === 0) return;
    if (!streakSynced.current) {
      streakSynced.current = true;
      api('/api/progress/streak', { method: 'POST' }).catch(() => {});
      api('/api/progress/analytics/events', {
        method: 'POST',
        body: { eventType: 'chapter_read', chapterId: chapter.id },
      }).catch(() => {});
    }
    if (readCount === 0) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api(`/api/progress/${chapter.id}`, {
        method: 'PATCH',
        body: { blocksCompleted: readCount, completed: readCount >= totalConcepts },
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(syncTimer.current);
  }, [readCount, user, chapter?.id, totalConcepts]);

  const toggleBookmark = async () => {
    if (!user || !chapter) return;
    try {
      if (bookmarked) {
        await api(`/api/progress/bookmarks/${chapter.id}`, { method: 'DELETE' });
        setBookmarked(false);
      } else {
        await api('/api/progress/bookmarks', {
          method: 'POST',
          body: { chapterId: chapter.id, label: chapter.title },
        });
        setBookmarked(true);
      }
    } catch {
      /* best-effort */
    }
  };

  const totalConcepts = slotsByTopic.reduce((n, slots) => n + slots.length, 0);
  const readCount = structure.topics.reduce(
    (n, t, ti) => n + slotsByTopic[ti].filter((s) => readMap[`${t.number}-${s.conceptIndex}`]).length,
    0,
  );
  const percent = totalConcepts ? Math.round((readCount / totalConcepts) * 100) : 0;

  const topicRead = (t, ti) => {
    const slots = slotsByTopic[ti] || [];
    const total = slots.length;
    const done = slots.filter((s) => readMap[`${t.number}-${s.conceptIndex}`]).length;
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
            snippet: `${escHtml(hay.slice(Math.max(0, idx - 34), idx))}<b>${escHtml(hay.slice(idx, idx + q.length))}</b>${escHtml(hay.slice(idx + q.length, idx + q.length + 42))}`,
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
  const chapterHref = (c) => sectionPath(sectionId, subjectSlug, c.slug);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <nav className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
        <Link to={sectionPath(sectionId)} className="hover:text-aqua-300 transition">{section.label}</Link>
        <span className="text-slate-600">›</span>
        <Link to={sectionPath(sectionId, subjectSlug)} className="hover:text-aqua-300 transition">{subject.name}</Link>
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
          {structure.topics.map((t, ti) => {
            const tr = topicRead(t, ti);
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
        className="sticky z-30 mb-6 flex items-center justify-between gap-1.5 sm:gap-2 glass rounded-2xl px-2 sm:px-4 py-2"
        style={{ top: headerH }}
      >
        <Link
          to="/"
          aria-label="Home"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full glass text-xs font-bold text-slate-200 hover:text-white hover:border-aqua-400/50 transition"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400"
            title={`${readCount} of ${totalConcepts} concepts read`}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {percent}%
          </span>

          {user && (
            <button
              onClick={toggleBookmark}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this chapter'}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this chapter'}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full text-xs font-bold transition ${
                bookmarked
                  ? 'text-amber-200 bg-amber-400/15 border border-amber-400/50'
                  : 'glass text-slate-200 hover:text-white hover:border-aqua-400/50'
              }`}
            >
              <span aria-hidden="true">{bookmarked ? '★' : '☆'}</span>
              <span className="hidden sm:inline">{bookmarked ? 'Saved' : 'Bookmark'}</span>
            </button>
          )}

          <button
            onClick={() => setFindOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full text-xs font-bold transition ${
              findOpen ? 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300' : 'glass text-slate-200 hover:text-white hover:border-aqua-400/50'
            }`}
            aria-label="Find in chapter"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="hidden sm:inline">Find</span>
          </button>

          <Link
            to={prevChapter ? chapterHref(prevChapter) : sectionPath(sectionId, subjectSlug)}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full glass text-xs font-bold text-slate-200 hover:text-white hover:border-aqua-400/50 transition"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Back
          </Link>

          <Link
            to={nextChapter ? chapterHref(nextChapter) : sectionPath(sectionId, subjectSlug)}
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
        const tr = topicRead(t, ti);
        const synonyms = Array.isArray(t.topic.metadata?.synonyms) ? t.topic.metadata.synonyms.filter(Boolean) : [];
        const topicColor = tr.complete ? '#34d399' : STRUCTURE_COLORS.topic;
        return (
          <section key={t.topic.id ?? `untitled-${t.number}`} id={`topic-${t.number}`} className="scroll-mt-32">
            {/* One box per topic — every related piece (statement, examples
                with their answers, summary, meaning, terminology) lives
                inside this single box. */}
            <div
              className="glass rounded-3xl relative overflow-hidden"
              style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 34px -14px ${topicColor}88` }}
            >
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${topicColor}, transparent)` }} />

              <div className="px-4 sm:px-6 pt-4 pb-5">
                {/* Topic header — number badge + title + synonyms */}
                <div className="flex items-start gap-3">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-sm font-extrabold shrink-0 shadow-[0_0_18px_-4px_rgba(56,189,248,.6)]"
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

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">{t.topic.title}</h2>
                    {t.topic.description && <p className="text-sm text-slate-400 mt-1">{t.topic.description}</p>}
                    {totalConcepts > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {tr.complete ? 'Topic complete ✓' : `${tr.done} / ${tr.total} concept${tr.total === 1 ? '' : 's'} read`}
                      </p>
                    )}

                    {/* Synonyms — small glowing box under the topic title */}
                    {synonyms.length > 0 && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 border border-amber-300/40 bg-amber-300/10 text-amber-100 text-[11px] font-bold shadow-[0_0_18px_-4px_rgba(251,191,36,.85)]">
                        <span className="text-[10px]" aria-hidden="true">⚡</span>
                        <span className="text-amber-200/70 uppercase tracking-wider text-[9px]">also known as</span>
                        {synonyms.join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Concepts + every block embedded in this one box */}
                <div className="mt-5">
                  {slotsByTopic[ti].map((slot) => {
                    if (slot.kind === 'group') {
                      const anchor = conceptAnchor(t.number, slot.conceptIndex);
                      return (
                        <div key={`g-${slot.groupId}`} id={anchor} className="scroll-mt-32 mt-6 first:mt-0">
                          <VariantBox
                            variants={slot.variantIndexes.map((ci) => ({ c: t.concepts[ci], ci }))}
                            topicNumber={t.number}
                            themeColor={subject.themeColor}
                            contactEmail={contactEmail}
                            hasContent={hasContent}
                            readMap={readMap}
                            flashId={flashId}
                            copyAnchor={copyAnchor}
                            copiedAnchor={copiedAnchor}
                            anchor={anchor}
                            headerH={headerH}
                          />
                        </div>
                      );
                    }
                    const ci = slot.conceptIndex;
                    const c = t.concepts[ci];
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
                      <div key={ci} id={anchor} className="scroll-mt-32 mt-6 first:mt-0">
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
                        <div className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 px-3.5 sm:px-5">
                          {c.blocks.map((block, bi) => {
                            const isHead = block === headBlock;
                            const bKey = `${t.number}-${ci}-${bi}`;
                            return (
                              <div
                                key={block.id ?? bKey}
                                id={`b-${bKey}`}
                                data-block-id={block.id || ''}
                                className={`py-3.5 scroll-mt-32 ${flashId === bKey ? 'rk-flash' : ''}`}
                              >
                                {hasContent(block) ? (
                                  <BlockRenderer
                                    block={block}
                                    themeColor={subject.themeColor}
                                    hideTitle={isHead && block.title}
                                    showSection
                                    embedded
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
              </div>
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

// One concept's full interface: numeral badge + head title + link button +
// its embedded blocks. Used both for single concepts and as the inner panel
// of a VariantBox (each Type gets its own interface).
function ConceptBody({ c, ci, t, themeColor, contactEmail, hasContent, readMap, flashId, copyAnchor, copiedAnchor, anchorOverride }) {
  const headBlock = c.blocks.find((b) => b.blockType === 'note_topic');
  const anchor = anchorOverride || conceptAnchor(t.number, ci);
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
    <div>
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
      <div className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 px-3.5 sm:px-5">
        {c.blocks.map((block, bi) => {
          const isHead = block === headBlock;
          const bKey = `${t.number}-${ci}-${bi}`;
          return (
            <div
              key={block.id ?? bKey}
              id={`b-${bKey}`}
              data-block-id={block.id || ''}
              className={`py-3.5 scroll-mt-32 ${flashId === bKey ? 'rk-flash' : ''}`}
            >
              {hasContent(block) ? (
                <BlockRenderer
                  block={block}
                  themeColor={themeColor}
                  hideTitle={isHead && block.title}
                  showSection
                  embedded
                />
              ) : (
                <LockedBlockCard
                  block={block}
                  themeColor={themeColor}
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
}

// Repeated concepts collapse into ONE box: glowing Type-1/2/3 tabs on top,
// each opening its own interface below. The tab strip hides once the reader
// scrolls past it (sticky within the box) — scrolling back up reveals it.
function VariantBox({
  variants,
  topicNumber,
  themeColor,
  contactEmail,
  hasContent,
  readMap,
  flashId,
  copyAnchor,
  copiedAnchor,
  anchor,
  headerH,
}) {
  const [active, setActive] = useState(0);
  const stripRef = useRef(null);
  const [stripHidden, setStripHidden] = useState(false);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setStripHidden(!e.isIntersecting),
      { rootMargin: `-${headerH + 56}px 0px -75% 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [headerH, active]);

  const showStrip = () => {
    stripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStripHidden(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-3.5 sm:px-5 py-4">
      {/* Type tabs — one glowing box per version; hidden after scrolling */}
      <div ref={stripRef} className={`scroll-mt-32 transition-opacity duration-200 ${stripHidden ? 'invisible pointer-events-none' : ''}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
          Same concept · {variants.length} version{variants.length > 1 ? 's' : ''} in the notes
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {variants.map((v, vi) => {
            const isActive = vi === active;
            const vHead = v.c.blocks.find((b) => b.blockType === 'note_topic');
            return (
              <button
                key={v.ci}
                onClick={() => setActive(vi)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  isActive
                    ? 'text-white'
                    : 'glass text-slate-300 hover:text-white hover:border-violet-400/50'
                }`}
                style={
                  isActive
                    ? { background: `${STRUCTURE_COLORS.concept}33`, border: `1.5px solid ${STRUCTURE_COLORS.concept}`, boxShadow: `0 0 18px -4px ${STRUCTURE_COLORS.concept}` }
                    : undefined
                }
              >
                <span
                  className="inline-flex items-center justify-center min-w-[1.1rem] px-1 rounded-md text-[10px] font-extrabold"
                  style={
                    isActive
                      ? { background: STRUCTURE_COLORS.concept, color: '#0b0a1f' }
                      : { background: `${STRUCTURE_COLORS.concept}22`, color: STRUCTURE_COLORS.concept }
                  }
                >
                  {vi + 1}
                </span>
                Type {vi + 1}
                {vHead?.title ? <span className="max-w-[130px] truncate text-slate-300">· {vHead.title}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsed chip — lets the reader bring the tabs back */}
      {stripHidden && (
        <button
          onClick={showStrip}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-bold text-violet-200 hover:text-white hover:border-violet-400/50 transition"
        >
          <span
            className="inline-flex items-center justify-center min-w-[1.1rem] px-1 rounded-md text-[10px] font-extrabold"
            style={{ background: STRUCTURE_COLORS.concept, color: '#0b0a1f' }}
          >
            {active + 1}
          </span>
          Type {active + 1} of {variants.length} · show types
        </button>
      )}

      {/* Marginal conceptual paragraph — explains what the types are */}
      <p
        className="mt-3 text-[11px] leading-relaxed text-slate-400 border-l-2 pl-2.5"
        style={{ borderColor: `${STRUCTURE_COLORS.concept}88` }}
      >
        This concept is recorded {variants.length} times in the syllabus notes — the same idea
        appears as Type {variants.length > 1 ? '1, 2' : '1'}
        {variants.length > 2 ? ` and ${variants.length}` : ''}. Type 1 is the original entry;
        the later types are repeated copies kept exactly as written. Each type opens its own
        content below — switch to compare wording, formulas or examples across versions.
      </p>

      {/* Active type's own interface */}
      <div className="mt-3">
        <ConceptBody
          c={variants[active].c}
          ci={variants[active].ci}
          t={{ number: topicNumber }}
          themeColor={themeColor}
          contactEmail={contactEmail}
          hasContent={hasContent}
          readMap={readMap}
          flashId={flashId}
          copyAnchor={copyAnchor}
          copiedAnchor={copiedAnchor}
          anchorOverride={anchor}
        />
      </div>
    </div>
  );
}
