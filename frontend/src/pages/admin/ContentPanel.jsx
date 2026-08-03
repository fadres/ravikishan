import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import BlockEditor from './BlockEditor.jsx';

const LOCKED_BLOCK_TYPES = [
  'note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important',
  'numerical', 'mindmap', 'diagram_compare', 'summary', 'keywords', 'important_points', 'byakaran',
  'learning_outcome', 'mind_recall', 'pyq', 'solved_example', 'premium_expansion', 'reference', 'revision_summary',
];

const ALLOWED_TYPES = {
  science_math: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'numerical', 'mindmap', 'learning_outcome', 'mind_recall', 'pyq', 'solved_example', 'premium_expansion', 'reference', 'revision_summary'],
  biology: ['note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'diagram_compare', 'mindmap', 'learning_outcome', 'mind_recall', 'pyq', 'premium_expansion', 'revision_summary'],
  english: ['summary', 'keywords', 'important_points', 'learning_outcome', 'pyq', 'revision_summary'],
  nepali: ['byakaran', 'learning_outcome', 'revision_summary'],
};

const LANG_OPTIONS = ['javascript', 'typescript', 'python', 'json', 'html', 'css', 'sql', 'java', 'c', 'cpp', 'bash'];

const TYPE_LABELS = {
  note_topic: 'Topic', note_statement: 'Statement', note_example: 'Example',
  note_concept: 'Concept', note_important: 'Important', numerical: 'Numerical',
  mindmap: 'Mind map', diagram_compare: 'Compare', summary: 'Summary',
  keywords: 'Keywords', important_points: 'Important points', byakaran: 'Byakaran',
  formula: 'Formula', symbols: 'Symbols',
  learning_outcome: 'Learning Outcomes', mind_recall: 'Mind Recall', pyq: 'Past Year Questions',
  solved_example: 'Solved Example', premium_expansion: 'Advanced Learning',
  reference: 'Reference', revision_summary: 'Revision Summary',
};

export default function ContentPanel() {
  const [classes, setClasses] = useState([]);
  const [classSlug, setClassSlug] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectSlug, setSubjectSlug] = useState('');
  const [subject, setSubject] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null); // { block?, subjectType } | null
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const loadClasses = async () => {
    const data = await api('/api/classes');
    setClasses(data.classes);
    if (!classSlug && data.classes[0]) setClassSlug(data.classes[0].slug);
  };

  useEffect(() => {
    loadClasses().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!classSlug) return;
    api(`/api/classes/${classSlug}`)
      .then((d) => {
        setSubjects(d.klass.subjects);
        if (!subjectSlug && d.klass.subjects[0]) setSubjectSlug(d.klass.subjects[0].slug);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSlug]);

  useEffect(() => {
    if (!subjectSlug) return;
    api(`/api/subjects/${subjectSlug}?class=${classSlug}`)
      .then((d) => setSubject(d.subject))
      .catch((e) => setError(e.message));
  }, [subjectSlug]);

  const loadBlocks = async (chapterId) => {
    const data = await api(`/api/admin/chapters/${chapterId}/blocks`);
    setSelectedChapterId(chapterId);
    setBlocks(data.blocks);
    try {
      const t = await api(`/api/admin/chapters/${chapterId}/topics`);
      setTopics(t.topics || []);
    } catch (e) {
      setTopics([]);
    }
  };

  const toggleSubject = async (s) => {
    setError('');
    try {
      await api(`/api/admin/subjects/${s.id}`, { method: 'PATCH', body: { isLocked: !s.isLocked } });
      setSubject((prev) => (prev ? { ...prev, isLocked: !s.isLocked } : prev));
      setNotice(`"${s.name}" is now ${!s.isLocked ? 'locked' : 'open'}.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleChapter = async (c) => {
    setError('');
    try {
      await api(`/api/admin/chapters/${c.id}`, { method: 'PATCH', body: { isLocked: !c.isLocked } });
      setSubject((prev) => ({
        ...prev,
        chapters: prev.chapters.map((ch) => (ch.id === c.id ? { ...ch, isLocked: !c.isLocked } : ch)),
      }));
      setNotice(`Chapter "${c.title}" is now ${!c.isLocked ? 'locked' : 'open'}.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteChapter = async (c) => {
    if (!window.confirm(`Delete chapter "${c.title}" and all its blocks?`)) return;
    try {
      await api(`/api/admin/chapters/${c.id}`, { method: 'DELETE' });
      setSubject((prev) => ({ ...prev, chapters: prev.chapters.filter((ch) => ch.id !== c.id) }));
      setNotice(`Chapter "${c.title}" deleted.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const addChapter = async (e) => {
    e.preventDefault();
    if (!subject) return;
    setError('');
    try {
      const data = await api('/api/admin/chapters', {
        method: 'POST',
        body: { subjectId: subject.id, title: newChapterTitle },
      });
      setNewChapterTitle('');
      setSubject((prev) => ({ ...prev, chapters: [...prev.chapters, data.chapter] }));
      setNotice(`Chapter "${data.chapter.title}" created.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const addTopic = async (e) => {
    e.preventDefault();
    if (!activeChapter || !newTopicTitle.trim()) return;
    setError('');
    try {
      const data = await api(`/api/admin/chapters/${activeChapter.id}/topics`, {
        method: 'POST',
        body: { title: newTopicTitle.trim() },
      });
      setNewTopicTitle('');
      setTopics((prev) => [...prev, data.topic]);
      setNotice(`Topic "${data.topic.title}" added — it now appears as a numbered rail in the chapter.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveBlock = async (payload) => {
    if (editor?.block) {
      await api(`/api/admin/blocks/${editor.block.id}`, { method: 'PATCH', body: payload });
    } else {
      await api(`/api/admin/chapters/${editor.chapterId}/blocks`, { method: 'POST', body: payload });
    }
  };

  const deleteBlock = async (b) => {
    if (!window.confirm(`Delete block "${b.title || b.blockType}"?`)) return;
    try {
      await api(`/api/admin/blocks/${b.id}`, { method: 'DELETE' });
      setBlocks((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const moveBlock = async (index, dir) => {
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await api(`/api/admin/chapters/${next[0].chapterId}/blocks/reorder`, {
        method: 'POST',
        body: { orderedIds: next.map((b) => b.id) },
      });
      setBlocks(next);
    } catch (e) {
      setError(e.message);
    }
  };

  const activeChapter = subject?.chapters.find((c) => c.id === selectedChapterId);
  const topicById = new Map(topics.map((t) => [t.id, t]));

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
      {error && (
        <div className="lg:col-span-2 flex items-center justify-between glass rounded-xl px-4 py-2.5">
          <p className="text-rose-300 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
      {notice && (
        <div className="lg:col-span-2 flex items-center justify-between glass rounded-xl px-4 py-2.5 border-emerald-400/30">
          <p className="text-emerald-300 text-sm">{notice}</p>
          <button onClick={() => setNotice('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Sidebar: class + subject + chapters */}
      <div className="glass rounded-2xl p-4 space-y-4 lg:sticky lg:top-32">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Class</label>
          <select
            value={classSlug}
            onChange={(e) => {
              setClassSlug(e.target.value);
              setSubjectSlug('');
            }}
            className="mt-1 w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aqua-400/60"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.slug} className="bg-deep-800">{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Subject</label>
          <select
            value={subjectSlug}
            onChange={(e) => setSubjectSlug(e.target.value)}
            className="mt-1 w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-aqua-400/60"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.slug} className="bg-deep-800">
                {s.name} {s.isLocked ? '(locked)' : '(open)'}
              </option>
            ))}
          </select>
        </div>

        {subject && (
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Chapters</label>
              <button
                onClick={() => toggleSubject(subject)}
                className={`text-[11px] font-bold px-2 py-1 rounded-md border transition ${
                  subject.isLocked
                    ? 'text-amber-300 border-amber-400/40 hover:bg-amber-400/10'
                    : 'text-emerald-300 border-emerald-400/40 hover:bg-emerald-400/10'
                }`}
              >
                {subject.isLocked ? '🔒 Locked' : '🔓 Open'}
              </button>
            </div>
            <div className="mt-1.5 space-y-1 max-h-72 overflow-y-auto pr-1">
              {subject.chapters.map((c) => (
                <div
                  key={c.id}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition border ${
                    activeChapter?.id === c.id
                      ? 'bg-aqua-400/15 border-aqua-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <button
                    onClick={() => loadBlocks(c.id)}
                    className={`flex-1 min-w-0 text-left truncate ${
                      activeChapter?.id === c.id ? 'text-aqua-100' : 'text-slate-300'
                    }`}
                  >
                    {c.title}
                  </button>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleChapter(c)}
                      aria-label={c.isLocked ? `Open ${c.title}` : `Lock ${c.title}`}
                      title={c.isLocked ? 'Locked — click to open' : 'Open — click to lock'}
                      className={`text-[10px] p-1 rounded ${
                        c.isLocked ? 'text-amber-300 hover:bg-amber-400/10' : 'text-emerald-300 hover:bg-emerald-400/10'
                      }`}
                    >
                      {c.isLocked ? '🔒' : '🔓'}
                    </button>
                    <button
                      onClick={() => deleteChapter(c)}
                      aria-label={`Delete ${c.title}`}
                      title="Delete chapter"
                      className="text-[10px] p-1 rounded text-slate-500 hover:text-rose-300 hover:bg-rose-400/10"
                    >
                      🗑
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={addChapter} className="mt-2 flex gap-1.5">
              <input
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="New chapter title"
                className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
              />
              <button className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-aqua-400/20 text-aqua-100 border border-aqua-400/40 hover:bg-aqua-400/30">
                +
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Blocks area */}
      <div>
        {activeChapter && blocks.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-lg truncate">{activeChapter.title}</h2>
            <button
              onClick={() => setEditor({ chapterId: activeChapter.id, block: null, subjectType: subject.subjectType })}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110"
            >
              + New block
            </button>
          </div>
        )}

        {/* Topic management — chapter structure rails */}
        {activeChapter && (
          <div className="glass rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Topics · chapter structure</label>
            </div>
            {topics.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2">
                No topics yet — blocks without a topic appear under a final "Other notes" rail. Add a topic to give this chapter a structured syllabus layout.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 glass rounded-full pl-1.5 pr-3 py-1 text-xs font-semibold">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold"
                      style={{ background: '#38bdf822', color: '#38bdf8', border: '1px solid #38bdf866' }}
                    >
                      {(topics.indexOf(t) + 1)}
                    </span>
                    <span className="text-slate-200">{t.title}</span>
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={addTopic} className="mt-3 flex items-center gap-2">
              <input
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="New topic title (syllabus rail)"
                className="flex-1 min-w-0 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60"
              />
              <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-aqua-900 bg-aqua-400/30 text-aqua-100 border border-aqua-400/40 hover:bg-aqua-400/40">
                + Topic
              </button>
            </form>
          </div>
        )}

        {!activeChapter && (
          <p className="glass rounded-2xl p-10 text-center text-slate-400 text-sm">
            Select a chapter on the left to edit its blocks.
          </p>
        )}

        {activeChapter && blocks.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-slate-400 text-sm mb-4">This chapter has no blocks yet.</p>
            <button
              onClick={() => setEditor({ chapterId: activeChapter.id, block: null, subjectType: subject.subjectType })}
              className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110"
            >
              + Create the first block
            </button>
          </div>
        )}

        <div className="space-y-2.5">
          {blocks.map((b, i) => (
            <div key={b.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex flex-col">
                <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-aqua-300 disabled:opacity-30 text-xs leading-none">▲</button>
                <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="text-slate-400 hover:text-aqua-300 disabled:opacity-30 text-xs leading-none mt-0.5">▼</button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-aqua-300 mr-2">
                    {TYPE_LABELS[b.blockType] || b.blockType}
                  </span>
                  {b.classifiedBy === 'auto' && (
                    <span className="text-[9px] uppercase tracking-wider font-bold text-aqua-200/80 border border-aqua-400/30 rounded-full px-1.5 py-0.5 mr-1.5 align-middle">
                      auto
                    </span>
                  )}
                  {b.topicId && topicById.has(b.topicId) && (
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5 mr-1.5 align-middle border"
                      style={{ color: '#38bdf8', borderColor: '#38bdf866', background: '#38bdf811' }}
                    >
                      {topics.findIndex((t) => t.id === b.topicId) + 1} · {topicById.get(b.topicId).title}
                    </span>
                  )}
                  {b.accessLevel && (
                    <span
                      className={`text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5 mr-1.5 align-middle border ${
                        b.accessLevel === 1
                          ? 'text-amber-300 border-amber-400/40 bg-amber-400/10'
                          : b.accessLevel === 2
                            ? 'text-aqua-200 border-aqua-400/30 bg-aqua-400/10'
                            : 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                      }`}
                    >
                      L{b.accessLevel} {b.accessLevel === 1 ? '· premium' : b.accessLevel === 2 ? '· members' : '· free'}
                    </span>
                  )}
                  {b.title || '(untitled)'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {b.contentCode ? `code (${b.codeLanguage || 'text'}) · ` : ''}
                  {b.mindmapJson ? 'mindmap · ' : ''}
                  {b.diagramData ? 'compare · ' : ''}
                  {(b.contentRichtext || '').slice(0, 60) || 'no body'}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditor({ chapterId: b.chapterId, block: b, subjectType: subject.subjectType })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-slate-200 hover:bg-white/20"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteBlock(b)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-400/10 hover:bg-rose-400/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editor && (
        <BlockEditor
          block={editor.block}
          chapterId={editor.chapterId}
          subjectType={editor.subjectType}
          topics={topics}
          allowedTypes={ALLOWED_TYPES[editor.subjectType] || LOCKED_BLOCK_TYPES}
          languageOptions={LANG_OPTIONS}
          onClose={() => setEditor(null)}
          onSaved={async (saved) => {
            if (editor.block) {
              setBlocks((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
            } else {
              await loadBlocks(editor.chapterId);
            }
            setEditor(null);
          }}
          onSave={saveBlock}
        />
      )}
    </div>
  );
}
