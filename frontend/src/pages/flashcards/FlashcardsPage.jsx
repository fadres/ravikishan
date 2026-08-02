import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

export default function FlashcardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [progress, setProgress] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', subjectId: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    async function load() {
      try {
        const [dRes, pRes, cRes] = await Promise.all([
          api('/api/flashcards/decks'),
          api('/api/flashcards/progress'),
          api('/api/classes'),
        ]);
        setDecks(dRes.decks || []);
        setProgress(pRes.progress || null);
        setSubjects((cRes.classes || []).flatMap((k) => k.subjects || []));
      } catch {
        setError('Failed to load flashcards.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, navigate]);

  const createDeck = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const body = {
        title: form.title,
        ...(form.description ? { description: form.description } : {}),
        ...(form.subjectId ? { subjectId: form.subjectId } : {}),
      };
      const res = await api('/api/flashcards/decks', { method: 'POST', body });
      setDecks((d) => [res.deck, ...d]);
      setShowCreate(false);
      setForm({ title: '', description: '', subjectId: '' });
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create the deck.');
    } finally {
      setCreating(false);
    }
  };

  const toggleFavorite = async (deck) => {
    const res = await api(`/api/flashcards/decks/${deck.id}`, {
      method: 'PATCH',
      body: { isFavorite: !deck.isFavorite },
    });
    setDecks((list) =>
      list
        .map((d) => (d.id === deck.id ? { ...d, isFavorite: res.deck.isFavorite } : d))
        .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite)),
    );
  };

  const removeDeck = async (deck) => {
    if (!window.confirm(`Delete deck "${deck.title}" and all its cards?`)) return;
    await api(`/api/flashcards/decks/${deck.id}`, { method: 'DELETE' });
    setDecks((list) => list.filter((d) => d.id !== deck.id));
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-1">Flashcards</h1>
          <p className="text-sm text-slate-400">Spaced repetition decks to lock in what you learn.</p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
        >
          {showCreate ? 'Cancel' : '+ New deck'}
        </button>
      </div>

      {progress && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{progress.decks}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Decks</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{progress.totalCards}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cards</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className={`text-xl font-extrabold ${progress.dueCards > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {progress.dueCards}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Due now</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xl font-extrabold text-white">{progress.totalReviews}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Reviews</p>
          </div>
        </div>
      )}

      {showCreate && (
        <form onSubmit={createDeck} className="glass rounded-2xl p-5 mb-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">New deck</h2>
          {createError && (
            <p className="text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">{createError}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Title</label>
            <input type="text" required minLength={2} maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. Physics formulas — Chapter 1" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Description (optional)</label>
            <input type="text" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Subject (optional)</label>
            <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={inputCls}>
              <option value="" className="bg-slate-900">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
              ))}
            </select>
          </div>
          <button disabled={creating} className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition">
            {creating ? 'Creating…' : 'Create deck'}
          </button>
        </form>
      )}

      {error && <p className="text-rose-300 text-sm mb-6">{error}</p>}

      {decks.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-slate-300">No decks yet — create one to start reviewing.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {decks.map((d) => (
            <div key={d.id} className="glass rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-white truncate">{d.title}</h2>
                <button
                  onClick={() => toggleFavorite(d)}
                  className="shrink-0 text-lg leading-none"
                  aria-label={d.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                >
                  {d.isFavorite ? '⭐' : '☆'}
                </button>
              </div>
              {d.description && <p className="text-sm text-slate-400 line-clamp-2">{d.description}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {d.subject && <span className="text-aqua-300 font-semibold">{d.subject.name}</span>}
                {d.chapter && <span>· {d.chapter.title}</span>}
                <span>· {d._count?.cards ?? 0} cards</span>
              </div>
              <div className="mt-auto flex items-center gap-2">
                <Link
                  to={`/flashcards/${d.id}`}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
                >
                  Manage
                </Link>
                <Link
                  to={`/flashcards/${d.id}/review`}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 transition"
                >
                  Review
                </Link>
                <button
                  onClick={() => removeDeck(d)}
                  className="ml-auto text-xs font-bold px-3 py-2 rounded-lg text-rose-300 bg-rose-400/10 border border-rose-400/25 hover:bg-rose-400/20 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
