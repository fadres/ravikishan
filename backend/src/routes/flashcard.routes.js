import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  listCards,
  createCard,
  updateCard,
  deleteCard,
  toggleBookmark,
  reviewCard,
  getProgress,
} from '../services/flashcards.js';

const router = Router();
router.use(requireAuth);

const deckCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
});

const deckUpdateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  isFavorite: z.boolean().optional(),
});

const cardSchema = z.object({
  front: z.string().trim().min(1).max(2000),
  back: z.string().trim().min(1).max(4000),
  hint: z.string().trim().max(500).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  isBookmarked: z.boolean().optional(),
});

const cardUpdateSchema = cardSchema.partial();

const deckIdSchema = z.object({ id: z.string().uuid() });
const cardIdSchema = z.object({ id: z.string().uuid() });

// ── Decks ───────────────────────────────────────────

router.get('/decks', async (req, res) => {
  const q = req.query;
  const decks = await listDecks(req.user.id, {
    subjectId: q.subjectId,
    chapterId: q.chapterId,
    topicId: q.topicId,
    favoritesOnly: q.favorites === 'true',
  });
  res.json({ decks });
});

router.post('/decks', validate(deckCreateSchema), async (req, res) => {
  const deck = await createDeck(req.user.id, req.body);
  res.status(201).json({ deck });
});

router.patch('/decks/:id', validate(deckIdSchema, 'params'), validate(deckUpdateSchema), async (req, res) => {
  const deck = await updateDeck(req.user.id, req.params.id, req.body);
  res.json({ deck });
});

router.delete('/decks/:id', validate(deckIdSchema, 'params'), async (req, res) => {
  await deleteDeck(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ── Cards ───────────────────────────────────────────

router.get('/decks/:id/cards', validate(deckIdSchema, 'params'), async (req, res) => {
  const q = req.query;
  const deck = await listCards(req.user.id, req.params.id, {
    dueOnly: q.due === 'true',
    shuffle: q.shuffle === 'true',
    bookmarkedOnly: q.bookmarked === 'true',
  });
  res.json({ deck });
});

router.post('/decks/:id/cards', validate(deckIdSchema, 'params'), validate(cardSchema), async (req, res) => {
  const card = await createCard(req.user.id, req.params.id, req.body);
  res.status(201).json({ card });
});

router.patch('/cards/:id', validate(cardIdSchema, 'params'), validate(cardUpdateSchema), async (req, res) => {
  const card = await updateCard(req.user.id, req.params.id, req.body);
  res.json({ card });
});

router.delete('/cards/:id', validate(cardIdSchema, 'params'), async (req, res) => {
  await deleteCard(req.user.id, req.params.id);
  res.json({ ok: true });
});

router.post('/cards/:id/bookmark', validate(cardIdSchema, 'params'), async (req, res) => {
  const card = await toggleBookmark(req.user.id, req.params.id);
  res.json({ card });
});

// ── Review (spaced repetition) ──────────────────────

const reviewSchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

router.post('/cards/:id/review', validate(cardIdSchema, 'params'), validate(reviewSchema), async (req, res) => {
  const card = await reviewCard(req.user.id, req.params.id, req.body.rating);
  res.json({ card });
});

// ── Progress ────────────────────────────────────────

router.get('/progress', async (req, res) => {
  const progress = await getProgress(req.user.id);
  res.json({ progress });
});

export default router;
