import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ReviewSessionPage() {
  const { deckId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const statsRef = useRef({ good: 0, hard: 0, easy: 0, again: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const qs = new URLSearchParams();
        if (params.get('due') === '1') qs.set('due', 'true');
        if (params.get('shuffle') === '1') qs.set('shuffle', 'true');
        if (params.get('bookmarked') === '1') qs.set('bookmarked', 'true');
        const res = await api(`/api/flashcards/decks/${deckId}/cards${qs.toString() ? `?${qs}` : ''}`);
        setDeck(res.deck);
        setQueue(res.deck.cards || []);
      } catch {
        setError('Could not start the review session.');
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, params, user]);

  const rate = async (rating) => {
    const card = queue[index];
    setReviewing(true);
    statsRef.current[rating] += 1;
    try {
      await api(`/api/flashcards/cards/${card.id}/review`, { method: 'POST', body: { rating } });
    } catch {
      statsRef.current[rating] -= 1;
      setError('Could not save that review.');
      setReviewing(false);
      return;
    }
    setReviewing(false);
    setFlipped(false);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

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

  if (done) {
    const { good, hard, easy, again } = statsRef.current;
    const total = good + hard + easy + again;
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glass rounded-2xl p-8">
          <p className="text-5xl mb-3" aria-hidden="true">🎉</p>
          <h1 className="text-xl font-extrabold text-white mb-1">Session complete</h1>
          <p className="text-sm text-slate-400 mb-6">{total} cards reviewed from “{deck.title}”</p>
          <div className="grid grid-cols-2 gap-3 text-sm mb-8">
            <p className="text-emerald-300">Easy: {easy}</p>
            <p className="text-aqua-300">Good: {good}</p>
            <p className="text-amber-300">Hard: {hard}</p>
            <p className="text-rose-300">Again: {again}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              to={`/flashcards/${deck.id}`}
              className="px-4 py-2 rounded-xl text-sm font-bold text-deep-900 bg-gradient-to-r from-aqua-400 to-aqua-300 hover:brightness-110 transition"
            >
              Back to deck
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-sm font-bold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/20 transition"
            >
              Review again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const card = queue[index];
  const pct = queue.length ? ((index + (flipped ? 1 : 0)) / queue.length) * 100 : 0;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <Link to={`/flashcards/${deck.id}`} className="text-xs text-aqua-300 font-semibold hover:text-aqua-100">
          ← {deck.title}
        </Link>
        <span className="text-xs text-slate-400">{index + 1} / {queue.length}</span>
      </div>

      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-8" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-aqua-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {queue.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">🌴</p>
          <p className="text-slate-300">Nothing due right now — enjoy the break!</p>
          <Link to={`/flashcards/${deck.id}`} className="mt-4 inline-block text-sm text-aqua-300 font-semibold hover:text-aqua-100">
            Back to deck
          </Link>
        </div>
      ) : (
        <>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-full glass rounded-3xl p-8 sm:p-10 min-h-56 flex flex-col items-center justify-center text-center hover:border-aqua-400/40 transition focus:outline-none focus:ring-2 focus:ring-aqua-400"
            aria-label={flipped ? 'Show question' : 'Show answer'}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">
              {flipped ? 'Answer' : 'Question'}
            </span>
            <p className="text-lg sm:text-xl font-bold text-white whitespace-pre-wrap">{flipped ? card.back : card.front}</p>
            {!flipped && card.hint && (
              <span className="mt-4 text-xs text-slate-500 italic">Hint: {card.hint}</span>
            )}
            {!flipped && (
              <span className="mt-6 text-xs text-slate-400 font-semibold animate-pulse">Tap to reveal the answer</span>
            )}
          </button>

          {flipped && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'again', label: 'Again', cls: 'bg-rose-400/15 border-rose-400/30 text-rose-300 hover:bg-rose-400/25' },
                { key: 'hard', label: 'Hard', cls: 'bg-amber-400/15 border-amber-400/30 text-amber-300 hover:bg-amber-400/25' },
                { key: 'good', label: 'Good', cls: 'bg-aqua-400/15 border-aqua-400/30 text-aqua-300 hover:bg-aqua-400/25' },
                { key: 'easy', label: 'Easy', cls: 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/25' },
              ].map((b) => (
                <button
                  key={b.key}
                  onClick={() => rate(b.key)}
                  disabled={reviewing}
                  className={`px-4 py-3 rounded-xl text-sm font-bold border transition disabled:opacity-50 ${b.cls}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
