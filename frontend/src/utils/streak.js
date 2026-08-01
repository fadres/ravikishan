const DAY_KEY = 'rk_streak_started';

// Returns the current streak length in days (local, first-visit seeded).
export function streakDays() {
  const started = parseInt(localStorage.getItem(DAY_KEY) || '0', 10);
  const base = started || Date.now();
  if (!started) localStorage.setItem(DAY_KEY, String(base));
  return Math.max(1, Math.floor((Date.now() - base) / (24 * 60 * 60 * 1000)) + 1);
}
