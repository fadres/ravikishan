// Flashcard engine with SM-2 style spaced repetition.
//   ease:        multiplier (2.5 default, 1.3..3.0 clamp)
//   interval:    days until next review
//   repetitions: consecutive successful reviews (resets on failure)

import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.js';
import { addXp, bumpDailyStudy } from './gamification.js';

export const RATINGS = ['again', 'hard', 'good', 'easy'];

export function applyReview(card, rating, now = new Date()) {
  const ease = Math.max(1.3, Math.min(3.0, card.ease || 2.5));
  let interval = card.interval || 0;
  let repetitions = card.repetitions || 0;
  let newEase = ease;

  switch (rating) {
    case 'again':
      repetitions = 0;
      interval = 0;
      newEase = Math.max(1.3, ease - 0.2);
      break;
    case 'hard':
      repetitions += 1;
      interval = repetitions === 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
      newEase = Math.max(1.3, ease - 0.15);
      break;
    case 'good':
      repetitions += 1;
      interval = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(interval * ease);
      break;
    case 'easy':
      repetitions += 1;
      interval = repetitions === 1 ? 1 : Math.round(interval * ease * 1.3);
      newEase = Math.min(3.0, ease + 0.15);
      break;
  }

  const due = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { ease: newEase, interval, repetitions, dueAt: due };
}

// ── Decks ───────────────────────────────────────────

export async function listDecks(userId, { subjectId, chapterId, topicId, favoritesOnly } = {}) {
  return prisma.flashcardDeck.findMany({
    where: {
      userId,
      ...(subjectId ? { subjectId } : {}),
      ...(chapterId ? { chapterId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(favoritesOnly ? { isFavorite: true } : {}),
    },
    orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    include: {
      _count: { select: { cards: true } },
      subject: { select: { id: true, name: true } },
      chapter: { select: { id: true, title: true } },
      topic: { select: { id: true, title: true } },
    },
  });
}

export async function createDeck(userId, data) {
  const deck = await prisma.flashcardDeck.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      subjectId: data.subjectId ?? null,
      chapterId: data.chapterId ?? null,
      topicId: data.topicId ?? null,
    },
  });
  await addXp(userId, 10, 'deck_created', deck.id, { deckTitle: deck.title });
  return deck;
}

export async function updateDeck(userId, deckId, data) {
  const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw new AppError(404, 'Deck not found');
  return prisma.flashcardDeck.update({
    where: { id: deckId },
    data: {
      title: data.title ?? undefined,
      description: data.description !== undefined ? data.description : undefined,
      isFavorite: data.isFavorite ?? undefined,
    },
  });
}

export async function deleteDeck(userId, deckId) {
  const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw new AppError(404, 'Deck not found');
  await prisma.flashcardDeck.delete({ where: { id: deckId } });
  return { ok: true };
}

// ── Cards ───────────────────────────────────────────

export async function listCards(userId, deckId, { dueOnly = false, shuffle = false, bookmarkedOnly = false } = {}) {
  const deck = await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
    include: {
      cards: {
        where: {
          ...(dueOnly ? { dueAt: { lte: new Date() } } : {}),
          ...(bookmarkedOnly ? { isBookmarked: true } : {}),
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { cards: true } },
    },
  });
  if (!deck) throw new AppError(404, 'Deck not found');
  if (shuffle) deck.cards.sort(() => Math.random() - 0.5);
  return deck;
}

export async function createCard(userId, deckId, data) {
  const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw new AppError(404, 'Deck not found');
  const card = await prisma.flashcard.create({
    data: {
      deckId,
      front: data.front,
      back: data.back,
      hint: data.hint ?? null,
      difficulty: data.difficulty ?? 'easy',
      isBookmarked: data.isBookmarked ?? false,
    },
  });
  await addXp(userId, 5, 'card_created', card.id, { deckTitle: deck.title });
  return card;
}

export async function updateCard(userId, cardId, data) {
  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, deck: { userId } },
  });
  if (!card) throw new AppError(404, 'Card not found');
  return prisma.flashcard.update({
    where: { id: cardId },
    data: {
      front: data.front ?? undefined,
      back: data.back ?? undefined,
      hint: data.hint !== undefined ? data.hint : undefined,
      isBookmarked: data.isBookmarked ?? undefined,
      difficulty: data.difficulty ?? undefined,
    },
  });
}

export async function deleteCard(userId, cardId) {
  const card = await prisma.flashcard.findFirst({ where: { id: cardId, deck: { userId } } });
  if (!card) throw new AppError(404, 'Card not found');
  await prisma.flashcard.delete({ where: { id: cardId } });
  return { ok: true };
}

export async function toggleBookmark(userId, cardId) {
  const card = await prisma.flashcard.findFirst({ where: { id: cardId, deck: { userId } } });
  if (!card) throw new AppError(404, 'Card not found');
  return prisma.flashcard.update({
    where: { id: cardId },
    data: { isBookmarked: !card.isBookmarked },
  });
}

// ── Review ──────────────────────────────────────────

export async function reviewCard(userId, cardId, rating, now = new Date()) {
  if (!RATINGS.includes(rating)) throw new AppError(400, 'Rating must be again, hard, good or easy');
  const card = await prisma.flashcard.findFirst({ where: { id: cardId, deck: { userId } } });
  if (!card) throw new AppError(404, 'Card not found');

  const next = applyReview(card, rating, now);
  const updated = await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      ease: next.ease,
      interval: next.interval,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastReviewedAt: now,
      timesReviewed: { increment: 1 },
    },
  });

  const xp = rating === 'again' ? 2 : rating === 'easy' ? 8 : 5;
  await addXp(userId, xp, 'card_review', cardId, { rating });
  await bumpDailyStudy(userId, { cards: 1 });
  return updated;
}

// ── Progress ────────────────────────────────────────

export async function getProgress(userId) {
  const decks = await prisma.flashcardDeck.findMany({
    where: { userId },
    include: {
      cards: { select: { dueAt: true, timesReviewed: true, isBookmarked: true } },
    },
  });
  const total = decks.reduce((s, d) => s + d.cards.length, 0);
  const due = decks.reduce(
    (s, d) => s + d.cards.filter((c) => c.dueAt <= new Date()).length,
    0,
  );
  const reviewed = decks.reduce((s, d) => s + d.cards.reduce((x, c) => x + c.timesReviewed, 0), 0);
  const bookmarked = decks.reduce((s, d) => s + d.cards.filter((c) => c.isBookmarked).length, 0);
  return { decks: decks.length, totalCards: total, dueCards: due, totalReviews: reviewed, bookmarkedCards: bookmarked };
}
