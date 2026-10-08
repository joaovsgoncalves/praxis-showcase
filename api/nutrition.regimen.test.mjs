import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createNutritionRouter } from './routes/nutrition.js';
import { createTestDb, startTestServer } from './test-support/helpers.mjs';

async function mountNutrition(t, { today = '2026-08-13' } = {}) {
  const db = createTestDb({ withNutrition: true });
  const app = express();
  app.use(express.json());
  app.use('/api/nutrition', createNutritionRouter({ db, getLocalDateString: () => today }));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });
  return { db, server };
}

async function json(base, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  return { status: response.status, payload };
}

test('seed creates João stack and does not add kcal', async (t) => {
  const { server } = await mountNutrition(t);
  const dayFood = await json(server.base, '/api/nutrition/day?date=2026-08-13');
  assert.equal(dayFood.status, 200);
  assert.equal(dayFood.payload.totals.kcal, 0);

  const regimen = await json(server.base, '/api/nutrition/regimen?date=2026-08-13');
  assert.equal(regimen.status, 200);
  const names = regimen.payload.items.map((i) => i.name);
  assert.ok(names.includes('Escitalopram'));
  assert.ok(names.includes('Creatina'));
  assert.ok(names.includes('Magnésio'));
  assert.ok(names.includes('Maca peruana'));
  assert.ok(names.includes('Melatonina'));
  assert.equal(names.includes('Whey Max Titanium'), false);
  assert.equal(regimen.payload.due_count, 3);
  assert.equal(regimen.payload.taken_count, 0);

  const escitalopram = regimen.payload.items.find((i) => i.name === 'Escitalopram');
  assert.equal(escitalopram.kind, 'medication');
});

test('toggle marks and unmarks without touching food logs', async (t) => {
  const { db, server } = await mountNutrition(t);
  const first = await json(server.base, '/api/nutrition/regimen/items/regimen_creatina/toggle', {
    method: 'POST',
    body: { date: '2026-08-13' },
  });
  assert.equal(first.status, 200);
  const creatina = first.payload.items.find((i) => i.id === 'regimen_creatina');
  assert.equal(creatina.taken, true);
  assert.equal(first.payload.taken_count, 1);

  const foodLogs = db.prepare('SELECT COUNT(*) AS n FROM food_logs').get();
  assert.equal(foodLogs.n, 0);

  const second = await json(server.base, '/api/nutrition/regimen/items/regimen_creatina/toggle', {
    method: 'POST',
    body: { date: '2026-08-13' },
  });
  const creatinaOff = second.payload.items.find((i) => i.id === 'regimen_creatina');
  assert.equal(creatinaOff.taken, false);
  assert.equal(second.payload.taken_count, 0);
});

test('as_needed items do not count as due', async (t) => {
  const { server } = await mountNutrition(t);
  const melatonin = await json(server.base, '/api/nutrition/regimen/items/regimen_melatonina/toggle', {
    method: 'POST',
    body: { date: '2026-08-13' },
  });
  assert.equal(melatonin.payload.taken_count, 0);
  assert.equal(melatonin.payload.due_count, 3);
  const item = melatonin.payload.items.find((i) => i.id === 'regimen_melatonina');
  assert.equal(item.taken, true);
});

test('create update archive custom item', async (t) => {
  const { server } = await mountNutrition(t);
  const created = await json(server.base, '/api/nutrition/regimen/items', {
    method: 'POST',
    body: {
      name: 'Vitamina D',
      kind: 'supplement',
      dose_label: 'após exame',
      timing: 'morning',
      frequency: 'daily',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.payload.name, 'Vitamina D');

  const patched = await json(server.base, `/api/nutrition/regimen/items/${created.payload.id}`, {
    method: 'PATCH',
    body: { dose_label: '2000 UI' },
  });
  assert.equal(patched.payload.dose_label, '2000 UI');

  const deleted = await json(server.base, `/api/nutrition/regimen/items/${created.payload.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleted.status, 204);

  const day = await json(server.base, '/api/nutrition/regimen?date=2026-08-13');
  assert.equal(day.payload.items.some((i) => i.id === created.payload.id), false);
});

test('rejects invalid kind', async (t) => {
  const { server } = await mountNutrition(t);
  const res = await json(server.base, '/api/nutrition/regimen/items', {
    method: 'POST',
    body: { name: 'X', kind: 'booster' },
  });
  assert.equal(res.status, 400);
});
