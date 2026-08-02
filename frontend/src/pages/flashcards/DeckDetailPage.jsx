import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

const inputCls =
  'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-aqua-400/60';

export default function DeckDetailPage() {
  const { deckId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [cardForm, setCardForm] = useState({ front: '', back: '', hint: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    loadDeck();
  }, [deckId, user, navigate]);

  async function loadDeck() {
    setLoading(true);
    try {
      const res = await api(`/api/flashcards/decks/${deckId}/cards`);
      setDeck(res.deck);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this deck.');
    } finally {
      setLoading(false);
    }
  }

  const addCard = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const res = await api(`/api/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        body: {
          front: cardForm.front,
          back: cardForm.back,
          ...(cardForm.hint ? { hint: cardForm.hint } : {}),
        },
      });
      setDeck((d) => ({ ...d, cards: [...(d.cards || []), res.card] }));
      setCardForm({ front: '', back: '', hint: '' });
      setShowAdd(false);
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Could not add the card.');
    } finally {
      setAdding(false);
    }
  };

  const toggleBookmark = async (card) => {
    const res = await api(`/api/flashcards/cards/${card.id}/bookmark`, { method: 'POST' });
    setDeck((d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === card.id ? { ...c, isBookmarked: res.card.isBookmarked } : c)),
    }));
  };

  const removeCard = async (card) => {
    if (!window.confirm('Delete this card?')) return;
    await api(`/api/flashcards/cards/${card.id}`, { method: 'DELETE' });
    setDeck((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== card.id) }));
  };

  const dueCount = deck ? deck.cards.filter((c) => new Date(c.dueAt) <= new Date()).length : 0;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="w-8 h-8 border-2 border-aqua-400/40 border-t-aqua-400 rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-rose-300 mb-4">{error}</p>
        <Link to="/flashcards" className="text-aqua-300 font-semibold hover:text-aqua-100">← Back to flashcards</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <Link to="/flashcards" className="text-xs text-aqua-300 font-semibold hover:text-aqua-100">← Flashcards</Link>
          <h1 className="text-2xl font-extrabold text-white mt-1">{deck.title}</h1>
          <p className="text-sm text-slate-400">{deck.cards?.length ?? 0} cards · {dueCount} due now</p>
        </div>
        <Link
          to={`/flashcards/${deck.id}/review`}
          className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
        >
          Start review
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-4 py-2 rounded-full text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
        >
          {showAdd ? 'Cancel' : '+ Add card'}
        </button>
        <Link
          to={`/flashcards/${deck.id}/review?due=1`}
          className="px-4 py-2 rounded-full text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 transition"
        >
          Review due only
        </Link>
        <Link
          to={`/flashcards/${deck.id}/review?bookmarked=1`}
          className="px-4 py-2 rounded-full text-sm font-bold text-pink-300 bg-pink-400/10 border border-pink-400/25 hover:bg-pink-400/20 transition"
        >
          Bookmarked only
        </Link>
      </div>

      {showAdd && (
        <form onSubmit={addCard} className="glass rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-aqua-300">New card</h2>
          {addError && (
            <p className="text-sm text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-xl px-4 py-2.5">{addError}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Front</label>
            <textarea rows={2} required maxLength={2000} value={cardForm.front} onChange={(e) => setCardForm({ ...cardForm, front: e.target.value })} className={inputCls} placeholder="Question or prompt…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Back</label>
            <textarea rows={3} required maxLength={4000} value={cardForm.back} onChange={(e) => setCardForm({ ...cardForm, back: e.target.value })} className={inputCls} placeholder="Answer…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Hint (optional)</label>
            <input type="text" maxLength={500} value={cardForm.hint} onChange={(e) => setCardForm({ ...cardForm, hint: e.target.value })} className={inputCls} />
          </div>
          <button disabled={adding} className="px-5 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 disabled:opacity-50 transition">
            {adding ? 'Adding…' : 'Add card'}
          </button>
        </form>
      )}

      {deck.cards?.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-slate-300">No cards yet — add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deck.cards.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-white text-sm">{c.front}</p>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{c.back}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Reviews: {c.timesReviewed} · Interval: {c.interval}d · Due {new Date(c.dueAt).toLocaleDateString()}
                  {c.hint && <span> · Hint: {c.hint}</span>}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => toggleBookmark(c)}
                  className="text-lg leading-none"
                  aria-label="Toggle bookmark"
                  title={c.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  {c.isBookmarked ? '⭐' : '☆'}
                </button>
                <button
                  onClick={() => removeCard(c)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-rose-300 bg-rose-400/10 border border-rose-400/25 hover:bg-rose-400/20 transition"
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
