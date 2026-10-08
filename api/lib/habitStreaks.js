/**
 * Habit log outcome + streak helpers shared by habits routes, rituals, gamification.
 * Day outcome: done lengthens streak; skipped freezes (bridge); open/missing breaks.
 */

export function isHabitLogDone(log) {
  if (!log) return false;
  if (log.outcome === 'skipped') return false;
  if (log.outcome === 'done') return true;
  return log.completed === 1 || log.completed === true;
}

export function isHabitLogSkipped(log) {
  if (!log) return false;
  return log.outcome === 'skipped';
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} habitId
 * @param {() => string} getLocalDateString  YYYY-MM-DD in app timezone
 */
export function getStreaks(db, habitId, getLocalDateString) {
  const logs = db.prepare(
    `SELECT date, completed, outcome FROM habit_logs WHERE habit_id = ? ORDER BY date DESC`,
  ).all(habitId);

  if (logs.length === 0) return { current_streak: 0, best_streak: 0 };

  const byDate = new Map();
  for (const log of logs) {
    if (!byDate.has(log.date)) byDate.set(log.date, log);
  }

  const today = getLocalDateString();

  let currentStreak = 0;
  let checkDate = new Date(`${today}T12:00:00`);
  for (let i = 0; i < 4000; i++) {
    const ds = checkDate.toISOString().split('T')[0];
    const log = byDate.get(ds);
    if (isHabitLogDone(log)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    if (isHabitLogSkipped(log)) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    break;
  }

  const allDates = [...byDate.keys()].sort();
  if (allDates.length === 0) return { current_streak: currentStreak, best_streak: 0 };

  const start = new Date(`${allDates[0]}T12:00:00`);
  const end = new Date(`${allDates[allDates.length - 1]}T12:00:00`);
  let bestStreak = 0;
  let streak = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const ds = cursor.toISOString().split('T')[0];
    const log = byDate.get(ds);
    if (isHabitLogDone(log)) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else if (isHabitLogSkipped(log)) {
      // freeze
    } else {
      streak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { current_streak: currentStreak, best_streak: Math.max(bestStreak, currentStreak) };
}
