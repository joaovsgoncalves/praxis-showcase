import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createGoalsRouter } from './routes/goals.js';
import { buildRouteCtx, createTestDb, requestJson, startTestServer } from './test-support/helpers.mjs';

async function mountGoals(t) {
  const db = createTestDb();
  const app = express();
  app.use(express.json());
  app.use('/api/goals', createGoalsRouter(buildRouteCtx(db)));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });
  return { db, server };
}

test('POST /api/goals creates a quick goal without deadline or initial_link', async (t) => {
  const { db, server } = await mountGoals(t);

  const body = await requestJson(server.base, '/api/goals', {
    method: 'POST',
    body: {
      title: 'Correr 5 km',
      timeframe: 'short',
      description: 'Sem prazo ainda',
    },
  });

  assert.ok(body.goal);
  assert.equal(body.goal.title, 'Correr 5 km');
  assert.equal(body.goal.timeframe, 'short');
  assert.equal(body.goal.description, 'Sem prazo ainda');
  assert.equal(body.goal.deadline, null);
  assert.equal(body.goal.status, 'active');
  assert.equal(body.linked, null);

  const tasks = db.prepare('SELECT * FROM tasks WHERE goal_id = ?').all(body.goal.id);
  const habits = db.prepare('SELECT * FROM habits WHERE goal_id = ?').all(body.goal.id);
  assert.equal(tasks.length, 0);
  assert.equal(habits.length, 0);
});

test('POST /api/goals creates guided goal with initial_link and preserves the link', async (t) => {
  const { db, server } = await mountGoals(t);

  const body = await requestJson(server.base, '/api/goals', {
    method: 'POST',
    body: {
      title: 'Ler 12 livros',
      deadline: '2026-12-31',
      timeframe: 'long',
      initial_link: {
        type: 'habit',
        title: 'Ler 20 páginas',
        frequency: 'daily',
      },
    },
  });

  assert.ok(body.goal);
  assert.equal(body.goal.title, 'Ler 12 livros');
  assert.equal(body.goal.deadline, '2026-12-31');
  assert.ok(body.linked);
  assert.equal(body.linked.type, 'habit');
  assert.equal(body.linked.title, 'Ler 20 páginas');

  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(body.linked.id);
  assert.ok(habit);
  assert.equal(habit.goal_id, body.goal.id);
  assert.equal(habit.title, 'Ler 20 páginas');
  assert.equal(habit.frequency, 'daily');
  assert.equal(habit.source, 'goal_wizard');
});

test('POST /api/goals rejects empty title', async (t) => {
  const { server } = await mountGoals(t);

  const response = await fetch(`${server.base}/api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', timeframe: 'medium' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.match(String(payload.error || ''), /title/i);
});

test('POST /api/goals rejects whitespace-only title and trims valid titles', async (t) => {
  const { db, server } = await mountGoals(t);

  const whitespace = await fetch(`${server.base}/api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '   ', timeframe: 'short' }),
  });
  const whitespacePayload = await whitespace.json();
  assert.equal(whitespace.status, 400);
  assert.match(String(whitespacePayload.error || ''), /title/i);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM goals').get().n, 0);

  const body = await requestJson(server.base, '/api/goals', {
    method: 'POST',
    body: { title: '  Correr 5 km  ', timeframe: 'medium' },
  });
  assert.equal(body.goal.title, 'Correr 5 km');
  const row = db.prepare('SELECT title FROM goals WHERE id = ?').get(body.goal.id);
  assert.equal(row.title, 'Correr 5 km');
});

test('PUT /api/goals/:id edits title, description, timeframe and deadline (including clear)', async (t) => {
  const { db, server } = await mountGoals(t);

  const created = await requestJson(server.base, '/api/goals', {
    method: 'POST',
    body: {
      title: 'Meta original',
      description: 'Desc original',
      timeframe: 'short',
      deadline: '2026-08-01',
    },
  });

  const updated = await requestJson(server.base, `/api/goals/${created.goal.id}`, {
    method: 'PUT',
    body: {
      title: 'Meta editada',
      description: 'Nova descrição',
      timeframe: 'medium',
      deadline: '2026-09-15',
    },
  });

  assert.equal(updated.title, 'Meta editada');
  assert.equal(updated.description, 'Nova descrição');
  assert.equal(updated.timeframe, 'medium');
  assert.equal(updated.deadline, '2026-09-15');

  // Explicit null clears deadline (empty string also accepted by API)
  const cleared = await requestJson(server.base, `/api/goals/${created.goal.id}`, {
    method: 'PUT',
    body: { deadline: null },
  });
  assert.equal(cleared.deadline, null);
  assert.equal(cleared.title, 'Meta editada');

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(created.goal.id);
  assert.equal(row.deadline, null);
});
