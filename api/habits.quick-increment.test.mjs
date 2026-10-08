import {
  formatHabitProgress,
  formatQuickIncrementAriaLabel,
  formatQuickIncrementButtonLabel,
  isQuickIncrementHabit,
} from '../src/lib/habits.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeDatabase } from './lib/dbInit.js';
import { createHabitsRouter, registerHabitLogRoutes } from './routes/habits.js';
import {
  buildRouteCtx,
  createTestDb,
  requestJson,
  startTestServer,
} from './test-support/helpers.mjs';

test('database migration configures water habit with target 3L and quick_increment 0.5', () => {
  const db = new Database(':memory:');
  // Simulate pre-existing database with the legacy water habit configured at 2L
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      frequency TEXT DEFAULT 'daily',
      category TEXT DEFAULT 'pessoal',
      streak_target INTEGER DEFAULT 30,
      goal_id TEXT,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'active',
      sort_order INTEGER,
      kind TEXT DEFAULT 'simple',
      parent_id TEXT,
      position_in_parent INTEGER,
      emoji TEXT DEFAULT '',
      tracking_mode TEXT DEFAULT 'check',
      since_date TEXT DEFAULT '',
      target_value REAL,
      unit TEXT DEFAULT '',
      created_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      value REAL,
      created_date TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO habits (id, title, target_value, unit)
    VALUES ('67c2b8d7-2bf1-466c-a37d-20545fac594c', 'Beber 3L de água', 2.0, 'L');
  `);

  initializeDatabase(db);

  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get('67c2b8d7-2bf1-466c-a37d-20545fac594c');
  assert.equal(row.target_value, 3);
  assert.equal(row.unit, 'L');
  assert.equal(row.quick_increment, 0.5);
  db.close();
});

test('water migration does not overwrite a later user configuration on restart', () => {
  const db = new Database(':memory:');
  initializeDatabase(db);
  db.prepare(`
    INSERT INTO habits (id, title, target_value, unit, quick_increment)
    VALUES (?, 'Beber 3L de água', 3, 'L', 0.5)
  `).run('67c2b8d7-2bf1-466c-a37d-20545fac594c');

  db.prepare(`
    UPDATE habits SET target_value = 2, quick_increment = 0.25
    WHERE id = '67c2b8d7-2bf1-466c-a37d-20545fac594c'
  `).run();
  initializeDatabase(db);

  const row = db.prepare('SELECT target_value, quick_increment FROM habits WHERE id = ?')
    .get('67c2b8d7-2bf1-466c-a37d-20545fac594c');
  assert.equal(row.target_value, 2);
  assert.equal(row.quick_increment, 0.25);
  db.close();
});

test('API stores, updates, and returns quick_increment on habits', async (t) => {
  const db = createTestDb();
  const ctx = buildRouteCtx(db, { getLocalDateString: () => '2026-09-08' });
  const app = express();
  app.use(express.json());
  app.use('/api/habits', createHabitsRouter(ctx));
  registerHabitLogRoutes(app, ctx);
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  // 1. Create habit with quick_increment
  const created = await requestJson(server.base, '/api/habits', {
    method: 'POST',
    body: {
      title: 'Beber água',
      category: 'wellness',
      frequency: 'daily',
      target_value: 3,
      unit: 'L',
      quick_increment: 0.5,
    },
  });

  assert.equal(created.title, 'Beber água');
  assert.equal(created.target_value, 3);
  assert.equal(created.unit, 'L');
  assert.equal(created.quick_increment, 0.5);

  // 2. Read back via GET /api/habits
  const list = await requestJson(server.base, '/api/habits');
  const found = list.find((h) => h.id === created.id);
  assert.ok(found);
  assert.equal(found.quick_increment, 0.5);

  // 3. Update quick_increment via PUT /api/habits/:id
  const updated = await requestJson(server.base, `/api/habits/${created.id}`, {
    method: 'PUT',
    body: {
      quick_increment: 0.25,
    },
  });
  assert.equal(updated.quick_increment, 0.25);

  // 4. Clear quick_increment
  const cleared = await requestJson(server.base, `/api/habits/${created.id}`, {
    method: 'PUT',
    body: {
      quick_increment: null,
    },
  });
  assert.equal(cleared.quick_increment, null);
});

test('habit logs accumulate values, keep habit open below target, and complete only at target', async (t) => {
  const db = createTestDb();
  const ctx = buildRouteCtx(db, { getLocalDateString: () => '2026-09-08' });
  const app = express();
  app.use(express.json());
  app.use('/api/habits', createHabitsRouter(ctx));
  registerHabitLogRoutes(app, ctx);
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const habit = await requestJson(server.base, '/api/habits', {
    method: 'POST',
    body: {
      title: 'Beber 3L de água',
      target_value: 3,
      unit: 'L',
      quick_increment: 0.5,
    },
  });

  // Step 1: Log initial 0.5 L
  const log1 = await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      value: 0.5,
    },
  });
  assert.equal(log1.value, 0.5);
  assert.equal(log1.completed, 0, 'below target should have completed = 0');
  assert.equal(log1.outcome, null, 'below target should not have outcome = done');

  // Verify list view state: open, value_today = 0.5
  let list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  let current = list.find((h) => h.id === habit.id);
  assert.equal(current.value_today, 0.5);
  assert.equal(current.completed_today, false, 'habit must be open below target');
  assert.equal(current.day_outcome, 'open');

  // Step 2: Accumulate via increment: 0.5
  const log2 = await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      increment: 0.5,
    },
  });
  assert.equal(log2.value, 1.0);
  assert.equal(log2.completed, 0);
  assert.equal(log2.outcome, null);

  list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  current = list.find((h) => h.id === habit.id);
  assert.equal(current.value_today, 1.0);
  assert.equal(current.completed_today, false);
  assert.equal(current.day_outcome, 'open');

  // Step 3: Accumulate until 2.5 L (still below target of 3.0)
  const log3 = await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      value: 2.5,
    },
  });
  assert.equal(log3.value, 2.5);
  assert.equal(log3.completed, 0);

  list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  current = list.find((h) => h.id === habit.id);
  assert.equal(current.value_today, 2.5);
  assert.equal(current.completed_today, false);
  assert.equal(current.day_outcome, 'open');

  // Step 4: Reaching 3.0 L (reaches target)
  const log4 = await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      increment: 0.5,
    },
  });
  assert.equal(log4.value, 3.0);
  assert.equal(log4.completed, 1, 'at target should be completed = 1');
  assert.equal(log4.outcome, 'done', 'at target should have outcome = done');

  list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  current = list.find((h) => h.id === habit.id);
  assert.equal(current.value_today, 3.0);
  assert.equal(current.completed_today, true);
  assert.equal(current.day_outcome, 'done');

  // Step 5: Deleting log resets habit to open
  await requestJson(server.base, `/api/habit-logs/${log4.id}`, {
    method: 'DELETE',
  });
  list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  current = list.find((h) => h.id === habit.id);
  assert.equal(current.value_today, null);
  assert.equal(current.completed_today, false);
  assert.equal(current.day_outcome, 'open');
});

test('quick increment helper functions format progress, buttons and detect habits', () => {
  // Detection
  assert.equal(isQuickIncrementHabit({ target_value: 3, quick_increment: 0.5 }), true);
  assert.equal(isQuickIncrementHabit({ target_value: 3 }), false);
  assert.equal(isQuickIncrementHabit({ target_value: null, quick_increment: 0.5 }), false);
  assert.equal(isQuickIncrementHabit({ target_value: 3, quick_increment: 0 }), false);
  assert.equal(isQuickIncrementHabit(null), false);

  // Progress formatting
  assert.equal(formatHabitProgress(0, 3, 'L'), '0 / 3 L');
  assert.equal(formatHabitProgress(0.5, 3, 'L'), '0,5 / 3 L');
  assert.equal(formatHabitProgress(1, 3, 'L'), '1 / 3 L');
  assert.equal(formatHabitProgress(2.5, 3, 'L'), '2,5 / 3 L');
  assert.equal(formatHabitProgress(3, 3, 'L'), '3 / 3 L');
  // Float noise prevention
  assert.equal(formatHabitProgress(0.1 + 0.2, 3, 'L'), '0,3 / 3 L');

  // Button label formatting
  assert.equal(formatQuickIncrementButtonLabel({ quick_increment: 0.5, unit: 'L' }), '+500 ml');
  assert.equal(formatQuickIncrementButtonLabel({ quick_increment: 0.25, unit: 'L' }), '+250 ml');
  assert.equal(formatQuickIncrementButtonLabel({ quick_increment: 1, unit: 'L' }), '+1 L');
  assert.equal(formatQuickIncrementButtonLabel({ quick_increment: 200, unit: 'ml' }), '+200 ml');

  // Aria label formatting
  assert.equal(
    formatQuickIncrementAriaLabel({ title: 'Beber 3L de água', quick_increment: 0.5, unit: 'L' }),
    'Adicionar 500 ml — Beber 3L de água'
  );
});

test('incrementing habit when skipped unfreezes it and sets value, and exceeding target completes', async (t) => {
  const db = createTestDb();
  const ctx = buildRouteCtx(db, { getLocalDateString: () => '2026-09-08' });
  const app = express();
  app.use(express.json());
  app.use('/api/habits', createHabitsRouter(ctx));
  registerHabitLogRoutes(app, ctx);
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const habit = await requestJson(server.base, '/api/habits', {
    method: 'POST',
    body: {
      title: 'Beber 3L de água',
      target_value: 3,
      unit: 'L',
      quick_increment: 0.5,
    },
  });

  // First skip it
  await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      outcome: 'skipped',
      skip_reason: 'context',
    },
  });

  let list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  let current = list.find((h) => h.id === habit.id);
  assert.equal(current.day_outcome, 'skipped');

  // Increment by 0.5 unfreezes it and sets value
  const logInc = await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      increment: 0.5,
    },
  });
  assert.equal(logInc.value, 0.5);
  assert.equal(logInc.completed, 0);

  list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  current = list.find((h) => h.id === habit.id);
  assert.equal(current.day_outcome, 'open');
  assert.equal(current.value_today, 0.5);

  // Big increment exceeding target (e.g. +3.0 on top of 0.5 = 3.5)
  const logExceed = await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: habit.id,
      date: '2026-09-08',
      increment: 3.0,
    },
  });
  assert.equal(logExceed.value, 3.5);
  assert.equal(logExceed.completed, 1);
  assert.equal(logExceed.outcome, 'done');

  list = await requestJson(server.base, '/api/habits?date=2026-09-08');
  current = list.find((h) => h.id === habit.id);
  assert.equal(current.day_outcome, 'done');
  assert.equal(current.value_today, 3.5);
});
