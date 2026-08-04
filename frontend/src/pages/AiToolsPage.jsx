import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ScoreGauge, MatchBars, CompressionChart } from '../components/AiCharts.jsx';

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

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    api('/api/classes')
      .then((d) => setSubjects((d.classes || []).flatMap((k) => k.subjects || [])))
      .catch(() => {});
  }, [user, navigate]);

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

      {result && (
        <div className="space-y-6">
          {result.summary && (
            <section className="glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Summary</h2>
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Explanation</h2>
              <Pre>{result.explanation}</Pre>
              {result.source && (
                <p className="mt-2 text-xs text-slate-500">Source: {result.source.title}</p>
              )}
            </section>
          )}

          {result.answer && (
            <section className="glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Answer</h2>
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
                </div>
              )}
            </section>
          )}

          {result.keywords && (
            <section className="glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Revision notes</h2>
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">
                Generated questions ({result.questions.length})
              </h2>
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Verdict</h2>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <ScoreGauge score={result.score} label="How well your answer matched the model answer." />
                <div className="flex-1 min-w-0">
                  <p className={`text-lg font-extrabold ${result.verdict === 'correct' ? 'text-emerald-300' : result.verdict === 'partial' ? 'text-amber-300' : 'text-rose-300'}`}>
                    {result.verdict.toUpperCase()}
                  </p>
                  {result.feedback && <div className="mt-1"><Pre>{result.feedback}</Pre></div>}
                  {result.missingPoints?.length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      Missing keywords: {result.missingPoints.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {result.recommendations && (
            <section className="glass rounded-2xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300 mb-3">Recommendations</h2>
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
