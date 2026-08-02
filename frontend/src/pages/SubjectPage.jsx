import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import SubjectIcon from '../components/SubjectIcon.jsx';

export default function SubjectPage() {
  const { classSlug, subjectSlug } = useParams();
  const [subject, setSubject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSubject(null);
    api(`/api/subjects/${subjectSlug}?class=${classSlug}`)
      .then((d) => setSubject(d.subject))
      .catch(() => setError('Subject not found.'));
  }, [subjectSlug]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-300">{error}</p>
        <Link to="/" className="inline-block mt-4 text-aqua-300 hover:text-aqua-100">← Back home</Link>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  const totalBlocks = subject.chapters.reduce((s, c) => s + c._count.blocks, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to={`/class/${classSlug}`}
        className="text-sm text-slate-400 hover:text-aqua-300 transition"
      >
        ← {subject.class?.name || 'Back'}
      </Link>

      <div className="mt-4 glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div
          className="absolute -right-8 -top-8 opacity-10 pointer-events-none"
          style={{ color: subject.themeColor }}
        >
          <SubjectIcon icon={subject.icon} size={180} />
        </div>
        <div className="flex items-center gap-4 relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${subject.themeColor}1f`, border: `1px solid ${subject.themeColor}55` }}
          >
            <SubjectIcon icon={subject.icon} size={34} color={subject.themeColor} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{subject.name}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {subject.class?.name} · {subject.chapters.length} chapters · {totalBlocks} notes
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {subject.chapters.map((chapter, idx) => (
          <Link
            key={chapter.id}
            to={`/class/${classSlug}/subject/${subjectSlug}/chapter/${chapter.slug}`}
            className="glass rounded-2xl px-5 py-4 flex items-center justify-between gap-4 hover:border-aqua-400/40 hover:bg-white/8 transition group"
          >
            <div className="min-w-0 flex items-center gap-3.5">
              <span
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold"
                style={{ background: `${subject.themeColor}1f`, border: `1px solid ${subject.themeColor}44`, color: subject.themeColor }}
              >
                C{idx + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-white group-hover:text-aqua-100 transition truncate">
                  {chapter.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {chapter._count.blocks} block{chapter._count.blocks === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 rounded-full px-2 py-1">
                Free to browse
              </span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-aqua-300 transition">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        ))}
        {subject.chapters.length === 0 && (
          <p className="glass rounded-2xl p-8 text-center text-slate-400 text-sm">
            Chapters are being written — check back soon.
          </p>
        )}
       </div>
     </div>
   );
}
