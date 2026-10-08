import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { migrateActiveRitualsToCompoundHabits } from './lib/dbInit.js';
import { createHabitsRouter, registerHabitLogRoutes } from './routes/habits.js';
import { createRitualsRouter } from './routes/rituals.js';
import {
  buildRouteCtx,
  createTestDb,
  requestJson,
  startTestServer,
} from './test-support/helpers.mjs';

test('boot migration turns each active legacy sequence into one ordered compound habit', () => {
  const db = createTestDb();
  db.prepare(`
    INSERT INTO habits (id, title, preferred_time, status, sort_order)
    VALUES
      ('wake', 'Acordar', '06:30', 'active', 1),
      ('water', 'Beber água', '06:35', 'active', 2)
  `).run();
  db.prepare(`
    INSERT INTO rituals (id, name, emoji, time_of_day, habits_order, status)
    VALUES ('morning', 'Rotina matinal', '🌅', 'morning', '["water","wake"]', 'active')
  `).run();

  assert.equal(migrateActiveRitualsToCompoundHabits(db), 1);

  const compound = db.prepare(`
    SELECT * FROM habits WHERE source = 'ritual_migration:morning'
  `).get();
  assert.equal(compound.kind, 'compound');
  assert.equal(compound.title, 'Rotina matinal');
  assert.equal(compound.description, '');
  assert.equal(compound.emoji, '🌅');

  const children = db.prepare(`
    SELECT id, parent_id, position_in_parent, preferred_time
    FROM habits WHERE parent_id = ?
    ORDER BY position_in_parent
  `).all(compound.id);
  assert.deepEqual(children.map((child) => child.id), ['water', 'wake']);
  assert.deepEqual(children.map((child) => child.preferred_time), ['06:35', '06:30']);
  assert.equal(db.prepare("SELECT status FROM rituals WHERE id = 'morning'").get().status, 'migrated');

  assert.equal(migrateActiveRitualsToCompoundHabits(db), 0);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM habits WHERE kind = 'compound'").get().count,
    1,
  );
  db.close();
});

test('compound API creates and reorders children, nests day outcomes, and keeps legacy read shim', async (t) => {
  const db = createTestDb();
  const ctx = buildRouteCtx(db);
  const app = express();
  app.use(express.json());
  app.use('/api/habits', createHabitsRouter(ctx));
  registerHabitLogRoutes(app, ctx);
  app.use('/api/rituals', createRitualsRouter(ctx));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });

  const compound = await requestJson(server.base, '/api/habits', {
    method: 'POST',
    body: {
      title: 'Rotina noturna',
      kind: 'compound',
      emoji: '🌙',
      frequency: 'daily',
      category: 'wellness',
      children: [
        { title: 'Desligar telas', preferred_time: '22:00' },
        { title: 'Preparar amanhã', preferred_time: '21:45' },
      ],
    },
  });
  assert.equal(compound.kind, 'compound');
  assert.equal(compound.emoji, '🌙');
  assert.equal(compound.description, '');
  assert.deepEqual(
    compound.children.map((child) => [child.title, child.preferred_time]),
    [['Desligar telas', '22:00'], ['Preparar amanhã', '21:45']],
  );
  assert.equal(compound.time_of_day, 'evening');
  const [first, second] = compound.children;

  const invalidAtomicCreate = await fetch(`${server.base}/api/habits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Não deve persistir',
      kind: 'compound',
      children: [{ title: 'Horário inválido', preferred_time: '29:90' }],
    }),
  });
  assert.equal(invalidAtomicCreate.status, 400);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM habits WHERE title = 'Não deve persistir'").get().count,
    0,
  );
  const untimed = await requestJson(server.base, '/api/habits', {
    method: 'POST',
    body: {
      title: 'Rotina sem horário',
      kind: 'compound',
      children: [{ title: 'Passo livre' }],
    },
  });
  assert.equal(untimed.time_of_day, null);
  await requestJson(server.base, `/api/habits/${untimed.id}`, { method: 'DELETE' });

  const updated = await requestJson(server.base, `/api/habits/${compound.id}`, {
    method: 'PUT',
    body: {
      title: 'Fechamento do dia',
      emoji: '🌘',
      children: [
        { id: second.id, title: 'Preparar o amanhã', preferred_time: '21:30' },
        { title: 'Ler dez páginas', preferred_time: '' },
      ],
    },
  });
  assert.equal(updated.title, 'Fechamento do dia');
  assert.equal(updated.emoji, '🌘');
  assert.deepEqual(
    updated.children.map((child) => [child.title, child.preferred_time]),
    [['Preparar o amanhã', '21:30'], ['Ler dez páginas', '']],
  );
  assert.equal(
    db.prepare('SELECT status FROM habits WHERE id = ?').get(first.id).status,
    'archived',
  );
  const [updatedSecond, third] = updated.children;

  await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: updatedSecond.id,
      date: '2026-07-18',
      outcome: 'done',
      completed: true,
    },
  });
  await requestJson(server.base, '/api/habit-logs', {
    method: 'POST',
    body: {
      habit_id: third.id,
      date: '2026-07-18',
      outcome: 'skipped',
      skip_reason: 'energy',
      note: 'Cheguei tarde',
    },
  });

  const habits = await requestJson(
    server.base,
    '/api/habits?status=active&date=2026-07-18',
  );
  assert.equal(habits.length, 1);
  assert.equal(habits[0].id, compound.id);
  assert.equal(habits[0].current_streak, null);
  assert.equal(habits[0].completed_steps, 1);
  assert.equal(habits[0].skipped_steps, 1);
  assert.equal(habits[0].total_steps, 2);
  assert.equal(habits[0].day_outcome, 'done');
  assert.deepEqual(habits[0].children.map((child) => child.id), [updatedSecond.id, third.id]);
  assert.equal(habits[0].children[0].completed_today, true);
  assert.equal(habits[0].children[0].preferred_time, '21:30');
  assert.equal(habits[0].children[1].day_outcome, 'skipped');
  assert.equal(habits[0].children[1].skip_note, 'Cheguei tarde');

  const parentLogResponse = await fetch(`${server.base}/api/habit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      habit_id: compound.id,
      date: '2026-07-18',
      outcome: 'done',
    }),
  });
  assert.equal(parentLogResponse.status, 400);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS count FROM habit_logs WHERE habit_id = ?').get(compound.id).count,
    0,
  );

  const shim = await requestJson(
    server.base,
    '/api/rituals?status=active&date=2026-07-18',
  );
  assert.equal(shim.length, 1);
  assert.equal(shim[0].name, 'Fechamento do dia');
  assert.deepEqual(shim[0].habits_order, [updatedSecond.id, third.id]);

  const legacyWrite = await fetch(`${server.base}/api/rituals/from-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'day_open' }),
  });
  assert.equal(legacyWrite.status, 410);
});
