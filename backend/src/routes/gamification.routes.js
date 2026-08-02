import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getGamificationSummary, addXp, bumpDailyStudy } from '../services/gamification.js';
import { getLeaderboard } from '../services/quiz.js';
import { updateStreak } from '../services/progress.js';

const router = Router();
router.use(requireAuth);

// GET /api/gamification — XP, level, badges, recent activity.
router.get('/', async (req, res) => {
  const summary = await getGamificationSummary(req.user.id);
  res.json({ summary });
});

// POST /api/gamification/checkin — daily check-in: keeps the streak alive
// and awards streak-based XP.
router.post('/checkin', async (req, res) => {
  const streak = await updateStreak(req.user.id);
  const bonus = Math.min(streak.streak, 30);
  const { totalXp } = await addXp(req.user.id, 10 + bonus, 'streak_checkin', null, {
    streak: streak.streak,
  });
  await bumpDailyStudy(req.user.id, { minutes: 0 });
  res.json({ streak, xpEarned: 10 + bonus, totalXp });
});

// GET /api/gamification/leaderboard
router.get('/leaderboard', async (_req, res) => {
  const leaderboard = await getLeaderboard();
  res.json({ leaderboard });
});

// POST /api/gamification/study-time — log studied minutes (kept light; the
// client is trusted only for minutes, all other counters stay server-side).
const studyTimeSchema = z.object({
  minutes: z.number().int().min(1).max(600),
});

router.post('/study-time', validate(studyTimeSchema), async (req, res) => {
  const row = await bumpDailyStudy(req.user.id, { minutes: req.body.minutes });
  const xp = Math.min(req.body.minutes, 30);
  const { totalXp } = await addXp(req.user.id, xp, 'study_time', null, { minutes: req.body.minutes });
  res.json({ daily: row, xpEarned: xp, totalXp });
});

export default router;
