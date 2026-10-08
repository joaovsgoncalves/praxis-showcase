import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkAchievements, getLevel } from './gamification.js';
import { createTestDb, fixedDate } from '../test-support/helpers.mjs';

test('getLevel maps XP to the right level at and just below each boundary', () => {
  assert.equal(getLevel(0).level, 1);
  assert.equal(getLevel(99).level, 1);
  assert.equal(getLevel(100).level, 2);
  assert.equal(getLevel(299).level, 2);
  assert.equal(getLevel(300).level, 3);
  assert.equal(getLevel(599).level, 3);
  assert.equal(getLevel(600).level, 4);
  assert.equal(getLevel(999).level, 4);
  assert.equal(getLevel(1000).level, 5);
  assert.equal(getLevel(1499).level, 5);
  assert.equal(getLevel(1500).level, 6);
  assert.equal(getLevel(2499).level, 6);
  assert.equal(getLevel(2500).level, 7);
  assert.equal(getLevel(2500).next_level_xp, null);
  assert.equal(getLevel(999999).level, 7);
});

test('getLevel reports current_xp/next_level_xp for a mid-range level', () => {
  const level = getLevel(150);
  assert.equal(level.level, 2);
  assert.equal(level.current_xp, 100);
  assert.equal(level.next_level_xp, 300);
});

function insertCompletedTasks(db, count, categoryPrefix = 'task') {
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, status, category) VALUES (?, ?, 'completed', 'pessoal')
  `);
  for (let i = 0; i < count; i += 1) stmt.run(`${categoryPrefix}${i}`, `Tarefa ${i}`);
}

function insertHabitRun(db, habitId, dates, outcome = 'done') {
  db.prepare("INSERT OR IGNORE INTO habits (id, title, status, frequency) VALUES (?, ?, 'active', 'daily')").run(habitId, habitId);
  const stmt = db.prepare('INSERT INTO habit_logs (id, habit_id, date, completed, outcome) VALUES (?, ?, ?, 1, ?)');
  dates.forEach((date, i) => stmt.run(`${habitId}-${i}`, habitId, date, outcome));
}

test('first_task unlocks after one completed task and is idempotent on a second call', () => {
  const db = createTestDb();
  insertCompletedTasks(db, 1);
  const first = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(first.some((a) => a.id === 'first_task'));
  const firstRow = db.prepare("SELECT unlocked_date FROM achievements WHERE id = 'first_task'").get();
  assert.ok(firstRow.unlocked_date);

  const second = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.equal(second.length, 0);
});

test('centurion needs 100 completed tasks, 99 is not enough', () => {
  const db = createTestDb();
  insertCompletedTasks(db, 99);
  const notYet = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(!notYet.some((a) => a.id === 'centurion'));

  insertCompletedTasks(db, 1, 'extra');
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'centurion'));
});

test('on_fire unlocks at a 7-day habit streak', () => {
  const db = createTestDb();
  insertHabitRun(db, 'h1', ['2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18']);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'on_fire'));
});

test('diamond unlocks at a 30-day habit streak', () => {
  const db = createTestDb();
  const dates = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date('2026-07-18T12:00:00');
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  insertHabitRun(db, 'h1', dates);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'diamond'));
});

test('focus_master unlocks after 10h of accumulated focus time', () => {
  const db = createTestDb();
  const stmt = db.prepare("INSERT INTO focus_sessions (id, date, duration_seconds) VALUES (?, '2026-07-18', ?)");
  stmt.run('f1', 10000);
  stmt.run('f2', 10000);
  stmt.run('f3', 10000);
  const notYet = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(!notYet.some((a) => a.id === 'focus_master'));
  stmt.run('f4', 6000);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'focus_master'));
});

function setUpMorningRitual(db) {
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h1', 'Meditar', 'active', 'daily')").run();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h2', 'Alongar', 'active', 'daily')").run();
  db.prepare(`
    INSERT INTO rituals (id, name, time_of_day, habits_order, status)
    VALUES ('r1', 'Manhã', 'morning', '["h1","h2"]', 'active')
  `).run();
}

test('early_bird unlocks once the full morning ritual was completed on 5 distinct days', () => {
  const db = createTestDb();
  setUpMorningRitual(db);
  const stmt = db.prepare('INSERT INTO habit_logs (id, habit_id, date, completed, outcome) VALUES (?, ?, ?, 1, \'done\')');
  const dates = ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'];
  dates.forEach((date, i) => {
    stmt.run(`h1-${i}`, 'h1', date);
    stmt.run(`h2-${i}`, 'h2', date);
  });
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'early_bird'));
});

test('early_bird does not count a day where only part of the ritual was completed', () => {
  const db = createTestDb();
  setUpMorningRitual(db);
  const stmt = db.prepare('INSERT INTO habit_logs (id, habit_id, date, completed, outcome) VALUES (?, ?, ?, 1, \'done\')');
  const fullDates = ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'];
  fullDates.forEach((date, i) => {
    stmt.run(`h1-${i}`, 'h1', date);
    stmt.run(`h2-${i}`, 'h2', date);
  });
  // Partial day: only h1 done, h2 missing — should not count toward the 5-day target.
  stmt.run('h1-partial', 'h1', '2026-07-14');
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(!unlocked.some((a) => a.id === 'early_bird'));
});

function insertWellnessDates(db, dates) {
  const stmt = db.prepare("INSERT INTO wellness_checks (id, date) VALUES (?, ?)");
  dates.forEach((date, i) => stmt.run(`w${i}`, date));
}

test('balanced unlocks after 7 consecutive days of wellness check-ins', () => {
  const db = createTestDb();
  insertWellnessDates(db, ['2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18']);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'balanced'));
});

test('balanced does not unlock when a gap breaks the run before reaching 7 consecutive days', () => {
  const db = createTestDb();
  // Two runs (4 + 3) totalling 7 distinct dates, but never 7 consecutive.
  insertWellnessDates(db, [
    '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04',
    '2026-07-06', '2026-07-07', '2026-07-08',
  ]);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(!unlocked.some((a) => a.id === 'balanced'));
});

test('creator unlocks after 10 jotav_fit tasks', () => {
  const db = createTestDb();
  const stmt = db.prepare("INSERT INTO tasks (id, title, category) VALUES (?, 'Foto', 'jotav_fit')");
  for (let i = 0; i < 10; i += 1) stmt.run(`jf${i}`);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  assert.ok(unlocked.some((a) => a.id === 'creator'));
});

test('multiple achievements unlock in the same call with the expected row shape', () => {
  const db = createTestDb();
  insertCompletedTasks(db, 100);
  const stmt = db.prepare("INSERT INTO tasks (id, title, category) VALUES (?, 'Foto', 'jotav_fit')");
  for (let i = 0; i < 10; i += 1) stmt.run(`jf${i}`);
  const unlocked = checkAchievements(db, { getLocalDateString: fixedDate('2026-07-18') });
  const ids = unlocked.map((a) => a.id);
  assert.ok(ids.includes('first_task'));
  assert.ok(ids.includes('centurion'));
  assert.ok(ids.includes('creator'));
  for (const row of unlocked) {
    assert.ok(row.id);
    assert.ok(row.name);
    assert.equal(typeof row.xp_reward, 'number');
    assert.ok(row.unlocked_date);
  }
});
