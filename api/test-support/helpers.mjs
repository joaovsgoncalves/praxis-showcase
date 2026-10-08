/**
 * Shared fixtures for api/**\/*.test.mjs — in-memory db, minimal routeCtx, tiny HTTP client.
 */
import Database from 'better-sqlite3';
import { initializeDatabase } from '../lib/dbInit.js';
import { enrichCategory } from '../lib/categories.js';
import { getLevel } from '../lib/gamification.js';
import { initCaptureQueueSchema } from '../captureQueue.js';
import { initNutritionSchema } from '../nutrition.js';
import { initPurchaseSchema } from '../purchaseList.js';
import { initWorkoutSchema } from '../workouts.js';
import { initFinanceSchema } from '../finance.js';
import { initProjectsSchema } from '../projects.js';
import { initContinuityGuidanceSchema } from '../continuityGuidance.js';

/**
 * @param {{ withCaptureQueue?: boolean, withNutrition?: boolean, withPurchases?: boolean, withWorkouts?: boolean, withFinance?: boolean, withProjects?: boolean, withContinuityGuidance?: boolean }} [options]
 */
export function createTestDb(options = {}) {
  const db = new Database(':memory:');
  initializeDatabase(db);
  if (options.withCaptureQueue) initCaptureQueueSchema(db);
  if (options.withNutrition) initNutritionSchema(db);
  if (options.withPurchases) initPurchaseSchema(db);
  if (options.withWorkouts) initWorkoutSchema(db);
  if (options.withFinance) initFinanceSchema(db);
  if (options.withProjects) {
    initProjectsSchema(db);
    initContinuityGuidanceSchema(db);
  }
  if (options.withContinuityGuidance && !options.withProjects) {
    initContinuityGuidanceSchema(db);
  }
  return db;
}

function stripPriorityPrefix(title) {
  if (typeof title !== 'string') return title;
  const cleaned = title.replace(/^\s*P\d+\s*(?:[—–-]|:|\.)\s*/i, '').trim();
  return cleaned || title.trim();
}

function nextSortOrder(db, table) {
  if (!['tasks', 'habits'].includes(table)) throw new Error('Invalid sortable table');
  const row = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM ${table}`).get();
  return Number(row?.next_order || 0);
}

function reorderItems(db, table, orderedIds) {
  if (!['tasks', 'habits'].includes(table)) throw new Error('Invalid reorder table');
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return 0;
  const uniqueIds = [...new Set(orderedIds.filter(Boolean).map(String))];
  const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  const run = db.transaction((ids) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  run(uniqueIds);
  return uniqueIds.length;
}

const HABIT_OUTCOMES = new Set(['done', 'skipped']);
const SKIP_REASONS = new Set(['time', 'energy', 'context', 'other']);

/**
 * Mirrors the shape of `routeCtx` built in api/server.js, for tests that mount a
 * route factory (createXRouter(ctx)) directly instead of booting the whole app.
 * @param {import('better-sqlite3').Database} db
 * @param {object} [overrides]
 */
export function buildRouteCtx(db, overrides = {}) {
  return {
    db,
    enrichCategory,
    getLocalDateString: fixedDate('2026-07-18'),
    addDaysLocal: (dateString, days) => {
      const [y, m, d] = dateString.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
      return date.toISOString().split('T')[0];
    },
    stripPriorityPrefix,
    nextSortOrder: (table) => nextSortOrder(db, table),
    reorderItems: (table, orderedIds) => reorderItems(db, table, orderedIds),
    syncTaskToCalendar: () => {},
    getLevel,
    SKIP_REASONS,
    HABIT_OUTCOMES,
    ...overrides,
  };
}

/** Deterministic "today" stand-in for modules that take getLocalDateString as a param. */
export function fixedDate(ymd) {
  return () => ymd;
}

export async function startTestServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  return {
    base,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function requestJson(base, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}
