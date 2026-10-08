import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { nutritionApiModule } from '../src/api/nutritionApi.js';

function client() {
  const calls = [];
  const { nutrition } = nutritionApiModule((url, options = {}) => {
    const call = { url, ...options };
    calls.push(call);
    return call;
  });
  return { api: nutrition, calls };
}

test('nutrition client has a single implementation in praxisClient', () => {
  const source = readFileSync(new URL('../src/api/praxisClient.js', import.meta.url), 'utf8');
  assert.match(source, /\.\.\.nutritionApiModule\(request\)/);
  assert.doesNotMatch(source, /^\s*nutrition:\s*\{/m);
});

test('nutrition client retains every public method', () => {
  const { api } = client();
  const expected = ['profile', 'updateProfile', 'suggestProfile', 'day', 'summary', 'copyDay', 'seed',
    'foods.list', 'foods.get', 'foods.recent', 'foods.create', 'foods.update', 'foods.delete',
    'meals.list', 'meals.get', 'meals.create', 'meals.update', 'meals.delete',
    'logs.create', 'logs.update', 'logs.delete', 'logs.fromMeal', 'logs.fromText', 'parseText',
    'barcode.lookup', 'barcode.lookupPost', 'weight.list', 'weight.log', 'weight.upsert', 'weight.trend', 'weight.delete',
    'regimen.day', 'regimen.items', 'regimen.create', 'regimen.update', 'regimen.delete', 'regimen.toggle'];
  for (const path of expected) {
    assert.equal(typeof path.split('.').reduce((obj, key) => obj?.[key], api), 'function', path);
  }
});

test('nutrition history preserves date filters and default route', () => {
  const { api } = client();
  assert.equal(api.summary().url, '/api/nutrition/summary');
  assert.equal(api.summary({ from: '2026-09-01', to: '2026-09-14' }).url,
    '/api/nutrition/summary?from=2026-09-01&to=2026-09-14');
});

test('nutrition weight retains date filters, limit and write aliases', () => {
  const { api } = client();
  assert.equal(api.weight.list({ from: '2026-09-01', to: '2026-09-14', limit: 10 }).url,
    '/api/nutrition/weight?from=2026-09-01&to=2026-09-14&limit=10');
  assert.deepEqual(api.weight.log({ weight_kg: 80 }), api.weight.upsert({ weight_kg: 80 }));
});

test('nutrition copy and seed preserve HTTP method and JSON payload', () => {
  const { api } = client();
  const data = { from_date: '2026-09-13', to_date: '2026-09-14' };
  assert.deepEqual(api.copyDay(data), { url: '/api/nutrition/day/copy', method: 'POST', body: JSON.stringify(data) });
  assert.deepEqual(api.seed(), { url: '/api/nutrition/seed', method: 'POST', body: '{}' });
});

test('nutrition quantities are sent unchanged to the API', () => {
  const { api } = client();
  const data = { food_item_id: 'food-1', grams: 137, date: '2026-09-14', meal_slot: 'lunch' };
  assert.deepEqual(api.logs.create(data), { url: '/api/nutrition/logs', method: 'POST', body: JSON.stringify(data) });
  assert.deepEqual(api.logs.update('log-1', { grams: 137 }), {
    url: '/api/nutrition/logs/log-1', method: 'PATCH', body: '{"grams":137}',
  });
});

test('nutrition barcode and food search keep normalization and encoding', () => {
  const { api } = client();
  assert.equal(api.barcode.lookup('789 100-0100103', { cacheOnly: true }).url,
    '/api/nutrition/barcode/7891000100103?cache_only=1');
  assert.equal(api.foods.list({ q: 'arroz & feijão', favorites: true }).url,
    '/api/nutrition/foods?q=arroz+%26+feij%C3%A3o&favorites=1');
});
