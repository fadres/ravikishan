// Badge catalog + seeding. Badges are static definitions upserted into the
// database; awarding logic lives in gamification.js.

import { prisma } from '../config/db.js';

export const BADGE_DEFS = [
  { code: 'first_steps', name: 'First Steps', icon: '🌱', description: 'Earn your first 50 XP', criteria: { type: 'xp', amount: 50 } },
  { code: 'eager_learner', name: 'Eager Learner', icon: '📖', description: 'Earn 250 XP', criteria: { type: 'xp', amount: 250 } },
  { code: 'scholar', name: 'Scholar', icon: '🎓', description: 'Earn 1,000 XP', criteria: { type: 'xp', amount: 1000 } },
  { code: 'quiz_starter', name: 'Quiz Starter', icon: '📝', description: 'Complete your first quiz', criteria: { type: 'quizzes', amount: 1 } },
  { code: 'quiz_master', name: 'Quiz Master', icon: '🏆', description: 'Complete 10 quizzes', criteria: { type: 'quizzes', amount: 10 } },
  { code: 'perfect_score', name: 'Flawless', icon: '💯', description: 'Score 100% on a quiz', criteria: { type: 'perfect_quiz', amount: 1 } },
  { code: 'streak_3', name: 'On Fire', icon: '🔥', description: 'Study 3 days in a row', criteria: { type: 'streak', amount: 3 } },
  { code: 'streak_7', name: 'Unstoppable', icon: '⚡', description: 'Study 7 days in a row', criteria: { type: 'streak', amount: 7 } },
  { code: 'card_creator', name: 'Card Creator', icon: '🃏', description: 'Create your first flashcard deck', criteria: { type: 'cards', amount: 1 } },
  { code: 'revisionist', name: 'Revisionist', icon: '🔄', description: 'Review 25 flashcards', criteria: { type: 'reviews', amount: 25 } },
  { code: 'bookworm', name: 'Bookworm', icon: '📚', description: 'Complete a chapter', criteria: { type: 'chapters', amount: 1 } },
  { code: 'planner', name: 'Master Planner', icon: '🗓️', description: 'Create your first study plan', criteria: { type: 'goals', amount: 1 } },
];

export async function ensureBadges() {
  for (const b of BADGE_DEFS) {
    await prisma.badge.upsert({
      where: { code: b.code },
      create: b,
      update: {},
    });
  }
  return BADGE_DEFS.length;
}
