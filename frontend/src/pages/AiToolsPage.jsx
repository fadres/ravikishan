import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScoreGauge, MatchBars, CompressionChart, scoreLabel, scoreColor } from '../components/AiCharts.jsx';
import { sectionIdFromClassSlug, sectionPath } from '../lib/sectionLinks.js';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

const selectCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aqua-400/60';

const TOOLS = [
  { id: 'doubt', label: '💬 Doubt solver', blurb: 'Paste a doubt; the assistant grounds it in your notes.' },
  { id: 'summarize', label: '📋 Summarize', blurb: 'Condense a chapter into key points.' },
  { id: 'explain', label: '🧠 Explain', blurb: 'Plain-language explanations with examples.' },
  { id: 'revision', label: '📝 Revision notes', blurb: 'Keywords, definitions and formulas to review fast.' },
  { id: 'generate', label: '❓ Generate questions', blurb: 'Self-test questions from your chapters.' },
  { id: 'check', label: '✅ Check answer', blurb: 'Grade your answer against a model answer.' },
  { id: 'recommend', label: '🧭 Recommendations', blurb: 'What to study next based on your activity.' },
];

function Pre({ children }) {
  return <pre className="whitespace-pre-wrap text-sm text-slate-200 bg-white/5 border border-white/10 rounded-xl px-4 py-3">{children}</pre>;
}

// Strip markdown/formatting so copied text and read-aloud stay clean.
function plainText(s) {
  return String(s || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Per-card action row: copy to clipboard + read aloud (speechSynthesis).
function CardActions({ text, copied, speaking, onCopy, onSpeak, label }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => onCopy(text)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
          copied ? 'text-emerald-300 bg-emerald-400/10' : 'text-slate-300 glass hover:text-white hover:border-aqua-400/50'
        }`}
        title={`Copy ${label || 'answer'}`}
      >
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
      <button
        onClick={() => onSpeak(text)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
          speaking ? 'text-rose-300 bg-rose-400/10 border border-rose-400/30' : 'text-slate-300 glass hover:text-white hover:border-aqua-400/50'
        }`}
        title={speaking ? 'Stop reading' : `Read ${label || 'answer'} aloud`}
      >
        {speaking ? (
          <>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            Stop
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
            Read
          </>
        )}
      </button>
    </div>
  );
}

function CardHeader({ title, text, copied, speaking, onCopy, onSpeak, label }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">{title}</h2>
      <CardActions text={text} copied={copied} speaking={speaking} onCopy={onCopy} onSpeak={onSpeak} label={label} />
    </div>
  );
}

// Shimmer skeleton shown while a tool is generating.
function Skeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-4" aria-busy="true">
      <div className="flex items-center gap-2">
        <span className="w-24 h-3.5 rounded-full bg-white/10 animate-pulse" />
        <span className="w-16 h-3.5 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3.5 w-full rounded-full bg-white/10 animate-pulse" />
        <div className="h-3.5 w-11/12 rounded-full bg-white/5 animate-pulse" />
        <div className="h-3.5 w-4/5 rounded-full bg-white/5 animate-pulse" />
        <div className="h-3.5 w-3/4 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded-full bg-white/10 animate-pulse" />
          <div className="h-3 w-1/2 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Clickable source link — deep-links to the exact block in the chapter.
function SourceLink({ s }) {
  if (!s?.link?.chapterSlug) return null;
  const href = `${sectionPath(sectionIdFromClassSlug(s.link.classSlug), s.link.subjectSlug, s.link.chapterSlug)}?block=${s.id}`;
  return (
    <Link
      to={href}
      className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-aqua-300 hover:text-aqua-100 transition"
      title="Open this source in the chapter"
    >
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <path d="M15 3h6v6" />
        <path d="M10 14L21 3" />
      </svg>
      Open in chapter
    </Link>
  );
}

export default function AiToolsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tool, setTool] = useState('doubt');
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');

  const [form, setForm] = useState({ question: '', concept: '', count: 5, level: 'short', modelAnswer: '', userAnswer: '', types: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [speakingKey, setSpeakingKey] = useState('');

  const doCopy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(plainText(text));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? '' : k)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const doSpeak = (key, text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingKey('');
      return;
    }
    window.speechSynthesis.cancel();
    const clean = plainText(text);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 0.95;
    u.onend = () => setSpeakingKey('');
    u.onerror = () => setSpeakingKey('');
    window.speechSynthesis.speak(u);
    setSpeakingKey(key);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    api('/api/classes')
      .then((d) => setSubjects((d.classes || []).flatMap((k) => k.subjects || [])))
      .catch(() => {});
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const loadChapters = async (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedChapter('');
    setChapters([]);
    if (!subjectId) return;
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;
    try {
      const res = await api(`/api/subjects/${subject.slug}`);
      setChapters(res.subject?.chapters || []);
    } catch {
      setChapters([]);
    }
  };

  const run = async (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingKey('');
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const body = {
        chapterId: selectedChapter || undefined,
        subjectId: selectedSubject || undefined,
      };
      let endpoint = '';
      switch (tool) {
        case 'doubt':
          endpoint = '/api/ai/doubt';
          body.question = form.question;
          break;
        case 'summarize':
          endpoint = '/api/ai/summarize';
          body.level = form.level;
          break;
        case 'explain':
          endpoint = '/api/ai/explain';
          body.concept = form.concept;
          break;
        case 'revision':
          endpoint = '/api/ai/revision-notes';
          break;
        case 'generate':
          endpoint = '/api/ai/generate-questions';
          body.count = form.count;
          if (form.types) body.types = form.types.split(',').map((t) => t.trim()).filter(Boolean);
          break;
        case 'check':
          endpoint = '/api/ai/check-answer';
          body.question = form.question;
          body.modelAnswer = form.modelAnswer;
          body.userAnswer = form.userAnswer;
          break;
        case 'recommend':
          endpoint = '/api/ai/recommendations';
          delete body.chapterId;
          delete body.subjectId;
          break;
      }
      const res = await api(endpoint, tool === 'recommend' ? { method: 'GET' } : { method: 'POST', body });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The tool could not run. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">AI Study Tools</h1>
      <p className="text-sm text-slate-400 mb-8">Your study assistant — grounded in this library&apos;s notes.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              setResult(null);
              setError('');
            }}
            title={t.blurb}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              tool === t.id ? 'text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300' : 'text-slate-300 bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={run} className="glass rounded-2xl p-5 space-y-4 mb-6">
        {(tool === 'doubt' || tool === 'explain') && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {tool === 'doubt' ? 'Your doubt' : 'Concept to explain'}
            </label>
            <textarea
              rows={3}
              required
              minLength={tool === 'doubt' ? 5 : 2}
              maxLength={2000}
              value={tool === 'doubt' ? form.question : form.concept}
              onChange={(e) =>
                setForm({ ...form, [tool === 'doubt' ? 'question' : 'concept']: e.target.value })
              }
              className={inputCls}
              placeholder={tool === 'doubt' ? 'e.g. Why does a projectile follow a parabolic path?' : 'e.g. Newton\u2019s second law'}
            />
          </div>
        )}

        {(tool === 'doubt' || tool === 'explain' || tool === 'summarize' || tool === 'revision' || tool === 'generate') && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Subject (optional)</label>
              <select value={selectedSubject} onChange={(e) => loadChapters(e.target.value)} className={selectCls}>
                <option value="" className="bg-slate-900">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Chapter (optional)</label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className={selectCls}
                disabled={chapters.length === 0}
              >
                <option value="" className="bg-slate-900">{chapters.length === 0 && selectedSubject ? 'No chapters' : 'All chapters'}</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900">{c.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {tool === 'summarize' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Detail level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={selectCls}>
              <option value="short" className="bg-slate-900">Short</option>
              <option value="medium" className="bg-slate-900">Medium</option>
              <option value="detailed" className="bg-slate-900">Detailed</option>
            </select>
          </div>
        )}

        {tool === 'generate' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Number of questions</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Types (comma-separated)</label>
              <input
                type="text"
                value={form.types}
                onChange={(e) => setForm({ ...form, types: e.target.value })}
                className={inputCls}
                placeholder="mcq, true_false, fill_blank, short_answer"
              />
            </div>
          </div>
        )}

        {tool === 'check' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Question</label>
              <input type="text" required minLength={3} maxLength={2000} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className={inputCls} placeholder="The question you answered" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Model answer</label>
              <textarea rows={3} required minLength={3} maxLength={8000} value={form.modelAnswer} onChange={(e) => setForm({ ...form, modelAnswer: e.target.value })} className={inputCls} placeholder="The expected answer" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Your answer</label>
              <textarea rows={3} required minLength={1} maxLength={8000} value={form.userAnswer} onChange={(e) => setForm({ ...form, userAnswer: e.target.value })} className={inputCls} placeholder="What you wrote" />
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">{error}</p>
        )}

        <button
          disabled={busy}
          className="px-6 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition"
        >
          {busy ? 'Working…' : 'Run tool'}
        </button>
      </form>

      {busy && !result && <Skeleton />}

      {result && (
        <div className="space-y-6">
          {result.summary && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title="Summary"
                text={result.summary}
                copied={copiedKey === 'summary'}
                speaking={speakingKey === 'summary'}
                onCopy={(t) => doCopy('summary', t)}
                onSpeak={(t) => doSpeak('summary', t)}
                label="summary"
              />
              <Pre>{result.summary}</Pre>
              {result.stats && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <CompressionChart
                    before={result.stats.totalWords}
                    after={result.stats.summaryWords}
                    beforeLabel="Chapter notes"
                    afterLabel="Your summary"
                  />
                </div>
              )}
            </section>
          )}

          {result.explanation && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title="Explanation"
                text={result.explanation}
                copied={copiedKey === 'explanation'}
                speaking={speakingKey === 'explanation'}
                onCopy={(t) => doCopy('explanation', t)}
                onSpeak={(t) => doSpeak('explanation', t)}
                label="explanation"
              />
              <Pre>{result.explanation}</Pre>
              {result.source && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-slate-500">Source: {result.source.title}</p>
                  <SourceLink s={result.source} />
                </div>
              )}
            </section>
          )}

          {result.answer && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title="Answer"
                text={result.answer}
                copied={copiedKey === 'answer'}
                speaking={speakingKey === 'answer'}
                onCopy={(t) => doCopy('answer', t)}
                onSpeak={(t) => doSpeak('answer', t)}
                label="answer"
              />
              <Pre>{result.answer}</Pre>
              {result.sources?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Where this answer came from · relevance
                  </p>
                  <MatchBars
                    color="#34d399"
                    items={result.sources.map((s) => ({ label: s.title, value: s.match }))}
                  />
                  <div className="mt-2.5 space-y-1.5">
                    {result.sources.map((s) => (
                      <SourceLink key={s.id} s={s} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {result.keywords && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title="Revision notes"
                text={`${result.keywords.join(', ')}\n\n${(result.definitions || []).join('\n')}\n\n${(result.formulas || []).join('\n')}`}
                copied={copiedKey === 'revision'}
                speaking={speakingKey === 'revision'}
                onCopy={(t) => doCopy('revision', t)}
                onSpeak={(t) => doSpeak('revision', t)}
                label="revision notes"
              />
              {result.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.keywords.map((k) => (
                    <span key={k} className="text-xs font-bold px-3 py-1 rounded-full bg-aqua-400/15 text-aqua-300">{k}</span>
                  ))}
                </div>
              )}
              {result.definitions?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Definitions</p>
                  <ul className="space-y-1.5">
                    {result.definitions.map((d, i) => (
                      <li key={i} className="text-sm text-slate-300">• {d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.formulas?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Formulas</p>
                  <ul className="space-y-1.5">
                    {result.formulas.map((f, i) => (
                      <li key={i} className="text-sm text-slate-300">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.note && <p className="mt-4 text-xs text-slate-500 italic">{result.note}</p>}
            </section>
          )}

          {result.questions && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title={`Generated questions (${result.questions.length})`}
                text={result.questions.map((q, i) => `Q${i + 1}. ${q.question}${q.options?.length ? `\n${q.options.map((o, j) => `${String.fromCharCode(97 + j)}) ${o}`).join('\n')}` : ''}${q.answer ? `\nAnswer: ${q.answer}` : ''}`).join('\n\n')}
                copied={copiedKey === 'questions'}
                speaking={speakingKey === 'questions'}
                onCopy={(t) => doCopy('questions', t)}
                onSpeak={(t) => doSpeak('questions', t)}
                label="questions"
              />
              <ul className="space-y-3">
                {result.questions.map((q, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <p className="text-sm text-white font-semibold">Q{i + 1}. {q.question}</p>
                    {q.options?.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {q.options.map((o, j) => (
                          <li key={j} className={`text-sm ${o === q.correctAnswer ? 'text-emerald-300 font-semibold' : 'text-slate-400'}`}>
                            {String.fromCharCode(97 + j)}) {o}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.answer && <p className="mt-1 text-sm text-emerald-300">Answer: {q.answer}</p>}
                    {q.explanation && <p className="mt-1 text-xs text-slate-500">{q.explanation}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.verdict && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title="Verdict"
                text={`${result.verdict.toUpperCase()} — ${result.score ?? 0}% matched\n\n${result.feedback || ''}${result.missingPoints?.length ? `\n\nMissing keywords: ${result.missingPoints.join(', ')}` : ''}`}
                copied={copiedKey === 'verdict'}
                speaking={speakingKey === 'verdict'}
                onCopy={(t) => doCopy('verdict', t)}
                onSpeak={(t) => doSpeak('verdict', t)}
                label="verdict"
              />
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <ScoreGauge score={result.score} label={null} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-lg font-extrabold px-3.5 py-1.5 rounded-xl"
                      style={{
                        color: scoreColor(result.score),
                        background: `${scoreColor(result.score)}1a`,
                        border: `1.5px solid ${scoreColor(result.score)}66`,
                        boxShadow: `0 0 20px -6px ${scoreColor(result.score)}`,
                      }}
                    >
                      {result.verdict.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {scoreLabel(result.score)} · confidence{' '}
                      {result.score >= 70 ? 'high' : result.score >= 40 ? 'medium' : 'low'}
                    </span>
                  </div>
                  {result.feedback && <div className="mt-3"><Pre>{result.feedback}</Pre></div>}
                  {result.missingPoints?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Missing keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missingPoints.map((mp) => (
                          <span key={mp} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-400/10 text-rose-300 border border-rose-400/25">
                            {mp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {result.recommendations && (
            <section className="glass rounded-2xl p-5">
              <CardHeader
                title="Recommendations"
                text={result.recommendations.map((r) => `[${r.priority.toUpperCase()}] ${r.message}`).join('\n')}
                copied={copiedKey === 'recommendations'}
                speaking={speakingKey === 'recommendations'}
                onCopy={(t) => doCopy('recommendations', t)}
                onSpeak={(t) => doSpeak('recommendations', t)}
                label="recommendations"
              />
              <ul className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <p className="text-sm text-slate-200 flex-1">
                      <span className={`text-[10px] uppercase tracking-wider font-bold mr-2 ${r.priority === 'high' ? 'text-rose-300' : r.priority === 'medium' ? 'text-amber-300' : 'text-slate-400'}`}>
                        {r.priority}
                      </span>
                      {r.message}
                    </p>
                    {r.link && (
                      <Link to={r.link} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-aqua-300 bg-aqua-400/10 hover:bg-aqua-400/20 transition">
                        Go
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              {result.weakSubjects?.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Accuracy by subject · weakest first
                  </p>
                  <MatchBars
                    color="#fb7185"
                    items={result.weakSubjects.map((s) => ({ label: s.subject, value: s.accuracy }))}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
