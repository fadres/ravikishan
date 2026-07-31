import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import SubjectIcon from '../components/SubjectIcon.jsx';

export default function ClassPage() {
  const { classSlug } = useParams();
  const [klass, setKlass] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setKlass(null);
    api(`/api/classes/${classSlug}`)
      .then((d) => setKlass(d.klass))
      .catch(() => setError('Class not found.'));
  }, [classSlug]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-300">{error}</p>
        <Link to="/" className="inline-block mt-4 text-aqua-300 hover:text-aqua-100">← Back home</Link>
      </div>
    );
  }

  if (!klass) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/" className="text-sm text-slate-400 hover:text-aqua-300 transition">
        ← Home
      </Link>
      <div className="mt-3 mb-8">
        <p className="text-aqua-300 text-xs font-bold uppercase tracking-[0.2em]">Ravikishan Study Board</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient">{klass.name}</h1>
        <p className="text-slate-400 text-sm mt-1">{klass.subjects.length} subjects · curated for exams</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {klass.subjects.map((subject) => (
          <Link
            key={subject.id}
            to={`/class/${klass.slug}/subject/${subject.slug}`}
            className="watermark glass rounded-2xl p-5 hover:border-aqua-400/40 hover:bg-white/8 transition group"
          >
            <div className="flex items-start justify-between">
              <SubjectIcon icon={subject.icon} color={subject.themeColor} size={40} />
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                  subject.isLocked
                    ? 'text-amber-400/90 bg-amber-400/10 border-amber-400/25'
                    : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                }`}
              >
                {subject.isLocked ? 'Reserved' : 'Open'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-3 group-hover:text-aqua-100 transition">
              {subject.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {subject._count.chapters} chapter{subject._count.chapters === 1 ? '' : 's'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
