import { useState } from 'react';
import { classifyBlock } from '../../lib/classifier.js';

const TYPE_LABELS = {
  note_topic: 'Topic', note_statement: 'Statement', note_example: 'Example',
  note_concept: 'Concept', note_important: 'Important', numerical: 'Numerical',
  mindmap: 'Mind map', diagram_compare: 'Compare', summary: 'Summary',
  keywords: 'Keywords', important_points: 'Important points', byakaran: 'Byakaran',
  formula: 'Formula', symbols: 'Symbols',
  learning_outcome: 'Learning outcome', mind_recall: 'Mind recall', pyq: 'Past year question',
  solved_example: 'Solved example', premium_expansion: 'Advanced learning',
  reference: 'Reference', revision_summary: 'Revision summary',
};

// Full block editor: markdown body, code + language picker, mindmap JSON,
// diagram_compare fields, sub_level nesting for Nepali byakaran.
// New blocks default to "Auto-detect" — a live classifier previews the type
// and saving without an explicit pick marks the block classified_by: "auto".
export default function BlockEditor({ block, chapterId, subjectType, allowedTypes, languageOptions, topics = [], onClose, onSaved, onSave }) {
  const isNew = !block;
  const [form, setForm] = useState(() => ({
    blockType: block?.blockType || '',
    title: block?.title || '',
    contentRichtext: block?.contentRichtext || '',
    contentCode: block?.contentCode || '',
    codeLanguage: block?.codeLanguage || 'javascript',
    mindmapJson: block?.mindmapJson ? JSON.stringify(block.mindmapJson, null, 2) : '',
    diagramData: block?.diagramData
      ? {
          leftName: block.diagramData.left?.name || '',
          leftPoints: (block.diagramData.left?.points || []).join('\n'),
          rightName: block.diagramData.right?.name || '',
          rightPoints: (block.diagramData.right?.points || []).join('\n'),
          similarities: (block.diagramData.similarities || []).join('\n'),
          differences: (block.diagramData.differences || [])
            .map((d) => `${d.left} <> ${d.right}`)
            .join('\n'),
        }
      : { leftName: '', leftPoints: '', rightName: '', rightPoints: '', similarities: '', differences: '' },
    subLevel: block?.subLevel || '',
    accessLevel: block?.accessLevel || 3,
    topicId: block ? block.topicId || '' : (topics[0]?.id || ''),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Live suggestion shown while the block type is left on "Auto-detect".
  const suggestion = classifyBlock({ title: form.title, content: form.contentRichtext });
  const autoMode = isNew && !form.blockType;

  const buildPayload = () => {
    const payload = {
      title: form.title.trim() || null,
      contentRichtext: form.contentRichtext || null,
      contentCode: form.contentCode || null,
      codeLanguage: form.contentCode ? form.codeLanguage : null,
      subLevel: form.subLevel.trim() || null,
      accessLevel: Number(form.accessLevel),
      mindmapJson: null,
      diagramData: null,
    };
    if (form.topicId) payload.topicId = form.topicId;
    // Omit blockType entirely → the server classifies and marks it "auto".
    if (form.blockType) payload.blockType = form.blockType;
    if (form.mindmapJson.trim()) {
      try {
        payload.mindmapJson = JSON.parse(form.mindmapJson);
        if (!payload.mindmapJson?.name) throw new Error('Mind map JSON needs a "name" field.');
      } catch (e) {
        throw new Error(`Mind map JSON invalid: ${e.message}`);
      }
    }
    const d = form.diagramData;
    if (d.leftName || d.rightName || d.similarities || d.differences) {
      payload.diagramData = {
        left: { name: d.leftName || 'Left', points: d.leftPoints.split('\n').map((s) => s.trim()).filter(Boolean) },
        right: { name: d.rightName || 'Right', points: d.rightPoints.split('\n').map((s) => s.trim()).filter(Boolean) },
        similarities: d.similarities.split('\n').map((s) => s.trim()).filter(Boolean),
        differences: d.differences
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((line) => {
            const [left, right] = line.split('<>').map((s) => s.trim());
            return { left: left || '—', right: right || '—' };
          }),
      };
    }
    return payload;
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      const saved = await onSave(payload);
      await onSaved(saved);
    } catch (err) {
      setError(err.message || 'Save failed.');
      setSaving(false);
    }
  };

  const showMindmap = form.blockType === 'mindmap';
  const showDiagram = form.blockType === 'diagram_compare';

  const inputCls =
    'w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';
  const labelCls = 'block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-deep-950/80 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="glass-strong rounded-3xl w-full max-w-3xl my-8 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">
            {block ? 'Edit block' : 'New block'}
            <span className="block text-xs font-semibold text-slate-400 mt-0.5">subject type: {subjectType}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {error && <p className="mb-4 text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>Block type</label>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  autoMode || block?.classifiedBy === 'auto'
                    ? 'text-aqua-300 border-aqua-400/40 bg-aqua-400/10'
                    : 'text-slate-400 border-white/15 bg-white/5'
                }`}
              >
                {autoMode ? 'auto-detect' : block?.classifiedBy === 'auto' ? 'auto' : 'manual'}
              </span>
            </div>
            <select
              value={form.blockType}
              onChange={(e) => set('blockType', e.target.value)}
              className={inputCls}
            >
              {isNew && (
                <option value="" className="bg-deep-800">
                  Auto-detect · {TYPE_LABELS[suggestion.blockType] || suggestion.blockType}
                </option>
              )}
              {allowedTypes.map((t) => (
                <option key={t} value={t} className="bg-deep-800">{TYPE_LABELS[t] || t}</option>
              ))}
            </select>
            {autoMode && (
              <p className="mt-1.5 text-[11px] text-aqua-200/80 leading-snug">
                Detected: <span className="font-bold text-aqua-200">{TYPE_LABELS[suggestion.blockType] || suggestion.blockType}</span> —{' '}
                {suggestion.reason.toLowerCase()}. You can still pick a type below to override.
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Title</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} placeholder="Block title" />
          </div>
        </div>

        {form.blockType === 'byakaran' && (
          <div className="mt-4">
              <label className={labelCls}>Sub-level (nesting path, e.g. {"Sandhi > Swar Sandhi"})</label>
            <input value={form.subLevel} onChange={(e) => set('subLevel', e.target.value)} className={inputCls} placeholder="सन्धि > स्वर सन्धि" />
          </div>
        )}

        <div className="mt-4">
          <label className={labelCls}>Access level (who can read this block)</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 1, label: 'Premium', hint: 'owner only' },
              { value: 2, label: 'Members', hint: 'approved readers' },
              { value: 3, label: 'Free', hint: 'everyone' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('accessLevel', opt.value)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  Number(form.accessLevel) === opt.value
                    ? 'bg-aqua-400/20 border-aqua-400/60'
                    : 'bg-white/5 border-white/15 hover:bg-white/10'
                }`}
              >
                <span className="block text-sm font-bold text-white">{opt.label}</span>
                <span className="block text-[11px] text-slate-400">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className={labelCls}>Topic (syllabus rail) — where this block appears</label>
          <select
            value={form.topicId}
            onChange={(e) => set('topicId', e.target.value)}
            className={inputCls}
          >
            <option value="" className="bg-deep-800">Other notes (no topic rail)</option>
            {topics.map((t, i) => (
              <option key={t.id} value={t.id} className="bg-deep-800">
                {i + 1} · {t.title}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
            New blocks default to the first topic — every block must live in a topic so the chapter keeps its structured layout.
          </p>
        </div>

        <div className="mt-4">
          <label className={labelCls}>Content (markdown — supports $math$, **bold**, lists)</label>
          <textarea
            value={form.contentRichtext}
            onChange={(e) => set('contentRichtext', e.target.value)}
            rows={6}
            className={`${inputCls} font-mono text-[13px] resize-y`}
            placeholder={'## Heading\n\n**Bold**, $v = u + at$, \`inline code\`\n\n- list item'}
          />
        </div>

        {/* Code section */}
        <div className="mt-4 grid sm:grid-cols-[1fr_160px] gap-3">
          <div>
            <label className={labelCls}>Code snippet (optional)</label>
            <textarea
              value={form.contentCode}
              onChange={(e) => set('contentCode', e.target.value)}
              rows={5}
              className={`${inputCls} font-mono text-[13px] resize-y`}
              placeholder="Paste code here…"
            />
          </div>
          <div>
            <label className={labelCls}>Language</label>
            <select value={form.codeLanguage} onChange={(e) => set('codeLanguage', e.target.value)} className={inputCls}>
              {languageOptions.map((l) => (
                <option key={l} value={l} className="bg-deep-800">{l}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-2">Highlights on the public site with a copy button.</p>
          </div>
        </div>

        {showMindmap && (
          <div className="mt-4">
            <label className={labelCls}>Mind map JSON {"{ \"name\": \"Root\", \"children\": [...] }"}</label>
            <textarea
              value={form.mindmapJson}
              onChange={(e) => set('mindmapJson', e.target.value)}
              rows={7}
              className={`${inputCls} font-mono text-[13px] resize-y`}
              placeholder={'{\n  "name": "Topic",\n  "children": [\n    { "name": "Sub-topic", "children": [] }\n  ]\n}'}
            />
          </div>
        )}

        {showDiagram && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Left concept name</label>
              <input value={form.diagramData.leftName} onChange={(e) => set('diagramData', { ...form.diagramData, leftName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Right concept name</label>
              <input value={form.diagramData.rightName} onChange={(e) => set('diagramData', { ...form.diagramData, rightName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Left points (one per line)</label>
              <textarea rows={4} value={form.diagramData.leftPoints} onChange={(e) => set('diagramData', { ...form.diagramData, leftPoints: e.target.value })} className={`${inputCls} font-mono text-[13px]`} />
            </div>
            <div>
              <label className={labelCls}>Right points (one per line)</label>
              <textarea rows={4} value={form.diagramData.rightPoints} onChange={(e) => set('diagramData', { ...form.diagramData, rightPoints: e.target.value })} className={`${inputCls} font-mono text-[13px]`} />
            </div>
            <div>
              <label className={labelCls}>Similarities (one per line)</label>
              <textarea rows={4} value={form.diagramData.similarities} onChange={(e) => set('diagramData', { ...form.diagramData, similarities: e.target.value })} className={`${inputCls} font-mono text-[13px]`} />
            </div>
            <div>
              <label className={labelCls}>Differences ({'"left <> right"'} per line)</label>
              <textarea rows={4} value={form.diagramData.differences} onChange={(e) => set('diagramData', { ...form.diagramData, differences: e.target.value })} className={`${inputCls} font-mono text-[13px]`} placeholder={'Nucleus absent <> Nucleus present'} />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            disabled={saving}
            className="px-6 py-2.5 rounded-xl font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Saving…' : block ? 'Save changes' : 'Create block'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/10">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
