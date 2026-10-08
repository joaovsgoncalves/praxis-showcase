import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createTestDb, startTestServer } from './test-support/helpers.mjs';
import { createFood, createLog, updateFood, updateLog, deleteFood, getLog, initNutritionSchema } from './nutrition.js';
import { createNutritionRouter } from './routes/nutrition.js';
import { parseNutritionQuantity, convertNutritionQuantity, nutritionQuantityPayload, recordedFoodReference } from '../src/lib/nutritionQuantity.js';

function fixture(t, overrides = {}) {
  const db = createTestDb({ withNutrition: true });
  t.after(() => db.close());
  const food = createFood(db, { name: 'Arroz de teste', serving_grams: 100, serving_label: '100 g', kcal: 130, protein_g: 2.5, carbs_g: 28, fat_g: 0.3, ...overrides });
  const add = (quantity = {}) => createLog(db, { date: '2026-09-14', meal_slot: 'lunch', food_item_id: food.id, ...quantity });
  return { db, food, add };
}

test('nutrition 137 grams produce consistent servings and macros', (t) => {
  const { add } = fixture(t);
  const log = add({ grams: 137, servings: 1 });
  assert.equal(log.grams, 137);
  assert.equal(log.servings, 1.37);
  assert.equal(log.kcal, 178);
  assert.equal(log.carbs_g, 38.4);
});

test('nutrition editing servings overrides old grams instead of keeping the old amount', (t) => {
  const { db, add } = fixture(t);
  const log = add({ grams: 100 });
  const edited = updateLog(db, log.id, { servings: 2 });
  assert.equal(edited.grams, 200);
  assert.equal(edited.kcal, 260);
  assert.equal(edited.servings, 2);
});

test('nutrition stores inferred grams for new serving-based entries', (t) => {
  const { add } = fixture(t);
  assert.equal(add({ servings: 0.25 }).grams, 25);
});

test('nutrition quantity edits preserve original names and macros after catalogue changes', (t) => {
  const { db, food, add } = fixture(t);
  const log = add({ grams: 100 });
  updateFood(db, food.id, { name: 'Outro arroz', kcal: 900, carbs_g: 1, serving_grams: 25 });
  const edited = updateLog(db, log.id, { grams: 200 });
  assert.equal(edited.name_snapshot, log.name_snapshot);
  assert.equal(edited.kcal, 260);
  assert.equal(edited.carbs_g, 56);
  assert.equal(edited.servings, 2);
});

test('nutrition recorded quantity can be edited after food is archived or deleted', (t) => {
  const { db, food, add } = fixture(t);
  const log = add({ grams: 100 });
  deleteFood(db, food.id);
  assert.equal(updateLog(db, log.id, { grams: 200 }).kcal, 260);
  deleteFood(db, food.id, { hard: true });
  assert.equal(updateLog(db, log.id, { grams: 100 }).kcal, 130);
});

test('nutrition repeated small edits do not accumulate rounding loss', (t) => {
  const { db, add } = fixture(t);
  const log = add({ grams: 137 });
  updateLog(db, log.id, { grams: 0.1 });
  const restored = updateLog(db, log.id, { grams: 137 });
  for (const key of ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g']) assert.equal(restored[key], log[key], key);
});

test('nutrition rejects empty, zero, negative and non-finite quantities', (t) => {
  const { db, add } = fixture(t);
  const log = add({ servings: 1 });
  for (const value of ['', ' ', 0, -1, 'bad', Infinity, NaN, true, 1e100]) {
    for (const unit of ['grams', 'servings']) {
      assert.throws(() => add({ [unit]: value }), (error) => error.status === 400);
      assert.throws(() => updateLog(db, log.id, { [unit]: value }), (error) => error.status === 400);
    }
  }
  assert.equal(getLog(db, log.id).kcal, log.kcal);
});

test('nutrition foods without gram conversion retain portions and reject guessed grams', (t) => {
  const { db, add } = fixture(t, { serving_grams: null });
  const log = add({ servings: 0.25 });
  assert.equal(log.grams, null);
  assert.equal(updateLog(db, log.id, { servings: 1 }).kcal, 130);
  assert.throws(() => add({ grams: 137 }), (error) => error.status === 400);
});

test('nutrition legacy snapshots acquire their own basis without consulting catalogue', (t) => {
  const { db, food, add } = fixture(t);
  const log = add({ servings: 1 });
  db.prepare('UPDATE food_logs SET quantity_basis_json = NULL, grams = NULL WHERE id = ?').run(log.id);
  updateFood(db, food.id, { kcal: 900 });
  const changed = updateLog(db, log.id, { servings: 2 });
  assert.equal(changed.kcal, 260);
  assert.equal(changed.grams, null);
  assert.ok(changed.quantity_basis_json);
  assert.equal(updateLog(db, log.id, { servings: 1 }).kcal, 130);
});

test('nutrition schema migration upgrades old tables without losing logs and is idempotent', (t) => {
  const { db, add } = fixture(t);
  const log = add({ grams: 137 });
  // Reproduce the old table structure using the isolated in-memory database only.
  db.exec('ALTER TABLE food_logs DROP COLUMN quantity_basis_json');
  initNutritionSchema(db);
  initNutritionSchema(db);
  assert.deepEqual(getLog(db, log.id), { ...log, quantity_basis_json: null });
  assert.ok(updateLog(db, log.id, { grams: 274 }).quantity_basis_json);
});

test('nutrition frontend quantity parsing and unit conversion stay explicit', () => {
  assert.equal(parseNutritionQuantity('137,5'), 137.5);
  for (const value of ['', ' ', 0, -1, 'bad', null, undefined, false]) assert.equal(parseNutritionQuantity(value), null);
  assert.equal(convertNutritionQuantity('137', 'grams', 'servings', 100), '1.37');
  assert.equal(convertNutritionQuantity('1.37', 'servings', 'grams', 100), '137');
  assert.deepEqual(nutritionQuantityPayload('137', 'grams'), { grams: 137 });
  assert.equal(nutritionQuantityPayload('', 'grams'), null);
});

test('nutrition frontend preview uses immutable basis instead of rounded totals', (t) => {
  const { db, add } = fixture(t);
  const log = add({ grams: 137 });
  const tiny = updateLog(db, log.id, { grams: 0.1 });
  const ref = recordedFoodReference(tiny);
  assert.equal(ref.kcal, 130);
  assert.equal(ref.serving_grams, 100);
});

test('nutrition API returns 400 for invalid quantity and accepts an exact gram edit', async (t) => {
  const { db, add } = fixture(t);
  const log = add({ grams: 100 });
  const app = express();
  app.use(express.json());
  app.use('/api/nutrition', createNutritionRouter({ db, getLocalDateString: () => '2026-09-14' }));
  const server = await startTestServer(app);
  t.after(() => server.close());
  const patch = (body) => fetch(`${server.base}/api/nutrition/logs/${log.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await patch({ grams: 0 })).status, 400);
  const response = await patch({ grams: 137 });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).grams, 137);
});
