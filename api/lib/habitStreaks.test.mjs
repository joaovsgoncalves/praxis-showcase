import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStreaks } from './habitStreaks.js';
import { createTestDb, fixedDate } from '../test-support/helpers.mjs';

function makeDb() {
  const db = createTestDb();
  db.prepare("INSERT INTO habits (id, title, status, frequency) VALUES ('h1', 'Treino', 'active', 'daily')").run();
  return db;
}

function insertLog(db, id, date, { completed = 0, outcome } = {}) {
  db.prepare(
    'INSERT INTO habit_logs (id, habit_id, date, completed, outcome) VALUES (?, ?, ?, ?, ?)',
  ).run(id, 'h1', date, completed, outcome ?? null);
}

test('empty history has no streak', () => {
  const db = makeDb();
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.deepEqual(s, { current_streak: 0, best_streak: 0 });
});

test('consecutive done days accumulate current and best streak', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-16', { completed: 1, outcome: 'done' });
  insertLog(db, 'l2', '2026-07-17', { completed: 1, outcome: 'done' });
  insertLog(db, 'l3', '2026-07-18', { completed: 1, outcome: 'done' });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.equal(s.current_streak, 3);
  assert.equal(s.best_streak, 3);
});

test('open (missing) day breaks current streak but preserves best streak', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-10', { completed: 1, outcome: 'done' });
  insertLog(db, 'l2', '2026-07-11', { completed: 1, outcome: 'done' });
  insertLog(db, 'l3', '2026-07-12', { completed: 1, outcome: 'done' });
  // gap: 07-13..07-17 have no log rows at all
  insertLog(db, 'l4', '2026-07-18', { completed: 1, outcome: 'done' });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.equal(s.current_streak, 1);
  assert.equal(s.best_streak, 3);
});

test('a conscious skip freezes the current streak instead of breaking it', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-14', { completed: 1, outcome: 'done' });
  insertLog(db, 'l2', '2026-07-15', { completed: 0, outcome: 'skipped' });
  insertLog(db, 'l3', '2026-07-16', { completed: 1, outcome: 'done' });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-16'));
  assert.equal(s.current_streak, 2);
  assert.ok(s.best_streak >= 2);
});

test('a skip-only tail does not count as a current streak', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-18', { completed: 0, outcome: 'skipped' });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.equal(s.current_streak, 0);
  assert.equal(s.best_streak, 0);
});

test('legacy rows with completed=1 and no outcome value still count as done', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-18', { completed: 1, outcome: null });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.equal(s.current_streak, 1);
});

test('outcome=skipped takes precedence over a stale completed=1 flag', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-18', { completed: 1, outcome: 'skipped' });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.equal(s.current_streak, 0);
});

test('streak crosses a leap-year February 29 correctly', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2028-02-28', { completed: 1, outcome: 'done' });
  insertLog(db, 'l2', '2028-02-29', { completed: 1, outcome: 'done' });
  insertLog(db, 'l3', '2028-03-01', { completed: 1, outcome: 'done' });
  const s = getStreaks(db, 'h1', fixedDate('2028-03-01'));
  assert.equal(s.current_streak, 3);
});

test('streak crosses a non-leap-year February/March boundary correctly', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2027-02-27', { completed: 1, outcome: 'done' });
  insertLog(db, 'l2', '2027-02-28', { completed: 1, outcome: 'done' });
  insertLog(db, 'l3', '2027-03-01', { completed: 1, outcome: 'done' });
  const s = getStreaks(db, 'h1', fixedDate('2027-03-01'));
  assert.equal(s.current_streak, 3);
});

test('best_streak is never smaller than current_streak when the open streak is the longest', () => {
  const db = makeDb();
  insertLog(db, 'l1', '2026-07-01', { completed: 1, outcome: 'done' });
  // gap
  insertLog(db, 'l2', '2026-07-16', { completed: 1, outcome: 'done' });
  insertLog(db, 'l3', '2026-07-17', { completed: 1, outcome: 'done' });
  insertLog(db, 'l4', '2026-07-18', { completed: 1, outcome: 'done' });
  const s = getStreaks(db, 'h1', fixedDate('2026-07-18'));
  assert.equal(s.current_streak, 3);
  assert.ok(s.best_streak >= s.current_streak);
});
