import { getStreaks } from './habitStreaks.js';

export function getLevel(xp) {
  const levels = [
    { level: 1, name: 'Iniciante', xp: 0 },
    { level: 2, name: 'Aprendiz', xp: 100 },
    { level: 3, name: 'Disciplinado', xp: 300 },
    { level: 4, name: 'Focado', xp: 600 },
    { level: 5, name: 'Praticante', xp: 1000 },
    { level: 6, name: 'Disciplinado', xp: 1500 },
    { level: 7, name: 'Lenda da Praxis', xp: 2500 },
  ];
  let current = levels[0];
  for (const l of levels) {
    if (xp >= l.xp) current = l;
  }
  const idx = levels.indexOf(current);
  const next = idx < levels.length - 1 ? levels[idx + 1] : null;
  return {
    level: current.level,
    name: current.name,
    current_xp: current.xp,
    next_level_xp: next ? next.xp : null,
  };
}

/**
 * Evaluate unlockable achievements. Mutates achievements table when newly unlocked.
 * @param {import('better-sqlite3').Database} db
 * @param {{ getLocalDateString: () => string }} opts
 */
export function checkAchievements(db, { getLocalDateString }) {
  const newlyUnlocked = [];
  const today = new Date().toISOString().split('T')[0];

  const completedTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status IN ('completed', 'done')").get().c;
  const firstTask = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'first_task'").get();
  if (firstTask && !firstTask.unlocked_date && completedTasks >= 1) {
    db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'first_task'").run(today);
    newlyUnlocked.push(firstTask.id);
  }

  const centurion = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'centurion'").get();
  if (centurion && !centurion.unlocked_date && completedTasks >= 100) {
    db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'centurion'").run(today);
    newlyUnlocked.push(centurion.id);
  }

  const habits = db.prepare("SELECT id FROM habits WHERE status = 'active' AND kind = 'simple'").all();
  const onFire = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'on_fire'").get();
  if (onFire && !onFire.unlocked_date) {
    for (const h of habits) {
      const { current_streak } = getStreaks(db, h.id, getLocalDateString);
      if (current_streak >= 7) {
        db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'on_fire'").run(today);
        newlyUnlocked.push(onFire.id);
        break;
      }
    }
  }

  const diamond = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'diamond'").get();
  if (diamond && !diamond.unlocked_date) {
    for (const h of habits) {
      const { current_streak } = getStreaks(db, h.id, getLocalDateString);
      if (current_streak >= 30) {
        db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'diamond'").run(today);
        newlyUnlocked.push(diamond.id);
        break;
      }
    }
  }

  const totalFocusSeconds = db.prepare("SELECT COALESCE(SUM(duration_seconds), 0) as total FROM focus_sessions").get().total;
  const focusMaster = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'focus_master'").get();
  if (focusMaster && !focusMaster.unlocked_date && totalFocusSeconds >= 36000) {
    db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'focus_master'").run(today);
    newlyUnlocked.push(focusMaster.id);
  }

  const earlyBird = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'early_bird'").get();
  if (earlyBird && !earlyBird.unlocked_date) {
    const morningSequences = [];
    const compounds = db.prepare(`
      SELECT h.id
      FROM habits h
      JOIN rituals r ON h.source = 'ritual_migration:' || r.id
      WHERE h.kind = 'compound' AND h.status = 'active' AND r.time_of_day = 'morning'
    `).all();
    for (const compound of compounds) {
      const childIds = db.prepare(`
        SELECT id FROM habits
        WHERE parent_id = ? AND kind = 'simple'
        ORDER BY position_in_parent IS NULL, position_in_parent ASC, sort_order ASC
      `).all(compound.id).map((row) => row.id);
      morningSequences.push(childIds);
    }

    // One-release compatibility for databases/tests that still have active rows.
    const legacyRows = db.prepare(
      "SELECT habits_order FROM rituals WHERE time_of_day = 'morning' AND status = 'active'",
    ).all();
    for (const row of legacyRows) {
      try {
        const ids = JSON.parse(row.habits_order || '[]');
        if (Array.isArray(ids)) morningSequences.push(ids);
      } catch { /* ignore invalid legacy JSON */ }
    }

    for (const habitIds of morningSequences) {
      if (habitIds.length === 0) continue;
      const allDates = db.prepare(
        `SELECT DISTINCT date FROM habit_logs WHERE habit_id IN (${habitIds.map(() => '?').join(',')}) AND completed = 1`,
      ).all(...habitIds);
      let ritualCompleteDays = 0;
      for (const row of allDates) {
        const done = db.prepare(
          `SELECT COUNT(*) as c FROM habit_logs WHERE habit_id IN (${habitIds.map(() => '?').join(',')}) AND date = ? AND completed = 1`,
        ).all(...habitIds, row.date)[0].c;
        if (done === habitIds.length) ritualCompleteDays++;
      }
      if (ritualCompleteDays >= 5) {
        db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'early_bird'").run(today);
        newlyUnlocked.push(earlyBird.id);
        break;
      }
    }
  }

  const balanced = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'balanced'").get();
  if (balanced && !balanced.unlocked_date) {
    const wellnessDates = db.prepare("SELECT DISTINCT date FROM wellness_checks ORDER BY date DESC").all().map(r => r.date);
    if (wellnessDates.length >= 7) {
      let streak = 1;
      for (let i = 1; i < wellnessDates.length; i++) {
        const prev = new Date(wellnessDates[i - 1] + 'T00:00:00');
        const curr = new Date(wellnessDates[i] + 'T00:00:00');
        const diff = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak++;
          if (streak >= 7) break;
        } else {
          streak = 1;
        }
      }
      if (streak >= 7) {
        db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'balanced'").run(today);
        newlyUnlocked.push(balanced.id);
      }
    }
  }

  const creator = db.prepare("SELECT id, unlocked_date FROM achievements WHERE id = 'creator'").get();
  if (creator && !creator.unlocked_date) {
    const jotavCount = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE category = 'jotav_fit'").get().c;
    if (jotavCount >= 10) {
      db.prepare("UPDATE achievements SET unlocked_date = ? WHERE id = 'creator'").run(today);
      newlyUnlocked.push(creator.id);
    }
  }

  if (newlyUnlocked.length === 0) return [];
  return db.prepare(
    `SELECT * FROM achievements WHERE id IN (${newlyUnlocked.map(() => '?').join(',')})`,
  ).all(...newlyUnlocked);
}
