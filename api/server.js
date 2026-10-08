import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initAuthSchema,
  ensureDefaultUser,
  registerAuthRoutes,
  createApiAuthMiddleware,
} from './praxisAuth.js';
import { initializeDatabase, resolveDbPath } from './lib/dbInit.js';
import { CATEGORIES, enrichCategory } from './lib/categories.js';
import { getLevel } from './lib/gamification.js';
import { createCalendarServices } from './lib/calendarSync.js';
import { createTasksRouter, registerIdeaToTaskRoute } from './routes/tasks.js';
import { createHabitsRouter, registerHabitLogRoutes } from './routes/habits.js';
import { createWellnessRouter } from './routes/wellness.js';
import { createFocusRouter } from './routes/focus.js';
import { createGoalsRouter } from './routes/goals.js';
import { createRitualsRouter } from './routes/rituals.js';
import { createNutritionRouter } from './routes/nutrition.js';
import { createPurchasesRouter } from './routes/purchases.js';
import { createSettingsRouter } from './routes/settings.js';
import { createGamificationRouter } from './routes/gamification.js';
import { createInsightsRouter, registerPraxiaRoutes } from './routes/insights.js';
import { createWeeklyReviewsRouter } from './routes/weeklyReviews.js';
import { registerParseVoiceRoutes } from './routes/parseVoice.js';
import { registerOpsRoutes, createCategoriesRouter } from './routes/ops.js';
import { registerCaptureRoutes } from './routes/captures.js';
import { initCaptureQueueSchema } from './captureQueue.js';
import { initPurchaseSchema } from './purchaseList.js';
import { initWorkoutSchema, registerWorkoutRoutes } from './workouts.js';
import { initNutritionSchema } from './nutrition.js';
import { initFinanceSchema, seedFinanceIfEmpty } from './finance.js';
import { createFinanceRouter } from './routes/finance.js';
import { initProjectsSchema, seedProjectsIfEmpty } from './projects.js';
import { initContinuityGuidanceSchema } from './continuityGuidance.js';
import { createProjectsRouter } from './routes/projects.js';

function loadEnvFile(filePath, allowedPrefixes = []) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (allowedPrefixes.length && !allowedPrefixes.some(prefix => key.startsWith(prefix))) continue;
      if (process.env[key]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch { /* optional files */ }
}

// Production VPS absolute paths first (must keep for deploy zero-touch)

let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  try {
    const envFile = fs.readFileSync('./data', 'utf-8');
    const match = envFile.match(/OPENAI_API_KEY\s*=\s*(.+)/);
    if (match) OPENAI_API_KEY = match[1].trim();
  } catch { /* optional */ }
}

// Load Forja API key. Server/automation only — never VITE_*.
let FORJA_API_KEY = process.env.FORJA_API_KEY;
if (!FORJA_API_KEY) {
  try {
    const envFile = fs.readFileSync('./data', 'utf-8');
    const match = envFile.match(/FORJA_API_KEY\s*=\s*(.+)/);
    if (match) FORJA_API_KEY = match[1].trim();
    const passMatch = envFile.match(/(?:PRAXIS_APP_PASSWORD|FORJA_APP_PASSWORD)\s*=\s*(.+)/);
    if (passMatch && !process.env.PRAXIS_APP_PASSWORD && !process.env.FORJA_APP_PASSWORD) {
      process.env.PRAXIS_APP_PASSWORD = passMatch[1].trim();
    }
  } catch { /* optional */ }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local .env fallback (dev). Does not override existing process.env.
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '..', '.env'));
if (!OPENAI_API_KEY && process.env.OPENAI_API_KEY) OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!FORJA_API_KEY && process.env.FORJA_API_KEY) FORJA_API_KEY = process.env.FORJA_API_KEY;

const app = express();
const PORT = process.env.PORT || 18556;
const APP_TIME_ZONE = process.env.FORJA_TIME_ZONE || 'America/Fortaleza';

function getLocalDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysLocal(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return getLocalDateString(date);
}

const HABIT_OUTCOMES = new Set(['done', 'skipped']);
const SKIP_REASONS = new Set(['time', 'energy', 'context', 'other']);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const COOKIE_SECURE = !['0', 'false', 'no'].includes(
  String(process.env.PRAXIS_COOKIE_SECURE ?? '1').toLowerCase(),
);

const db = new Database(resolveDbPath(__dirname));
db.pragma('journal_mode = WAL');

initializeDatabase(db);
initAuthSchema(db);
initCaptureQueueSchema(db);
initPurchaseSchema(db);
initNutritionSchema(db);
initWorkoutSchema(db);
initFinanceSchema(db);
seedFinanceIfEmpty(db);
initProjectsSchema(db);
initContinuityGuidanceSchema(db);
seedProjectsIfEmpty(db);
ensureDefaultUser(db);

registerAuthRoutes(app, db, { secureCookie: COOKIE_SECURE });
app.use(createApiAuthMiddleware({ db, apiKey: FORJA_API_KEY }));

function stripPriorityPrefix(title) {
  if (typeof title !== 'string') return title;
  const cleaned = title.replace(/^\s*P\d+\s*(?:[—–-]|:|\.)\s*/i, '').trim();
  return cleaned || title.trim();
}

function nextSortOrder(table) {
  if (!['tasks', 'habits'].includes(table)) throw new Error('Invalid sortable table');
  const row = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM ${table}`).get();
  return Number(row?.next_order || 0);
}

function reorderItems(table, orderedIds) {
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

const {
  syncTaskToCalendar,
  runCalendarMaintenance,
  createCalendarRouter,
} = createCalendarServices({ db, getLocalDateString });

const routeCtx = {
  db,
  enrichCategory,
  getLocalDateString,
  addDaysLocal,
  stripPriorityPrefix,
  nextSortOrder,
  reorderItems,
  syncTaskToCalendar,
  getLevel,
  SKIP_REASONS,
  HABIT_OUTCOMES,
};

// --- Domain routes ---
app.use('/api/categories', createCategoriesRouter(CATEGORIES));
registerOpsRoutes(app, { apiDir: __dirname });
app.use('/api/purchases', createPurchasesRouter({ db }));
app.use('/api/projects', createProjectsRouter({ db, getLocalDateString }));
app.use('/api/finance', createFinanceRouter({ db, getLocalDateString }));
app.use('/api/nutrition', createNutritionRouter({ db, getLocalDateString }));
registerWorkoutRoutes(app, db);
registerCaptureRoutes(app, { db, apiDir: __dirname });
app.use('/api/tasks', createTasksRouter(routeCtx));
registerIdeaToTaskRoute(app, routeCtx);
app.use('/api/habits', createHabitsRouter(routeCtx));
registerHabitLogRoutes(app, routeCtx);
app.use('/api/wellness', createWellnessRouter(routeCtx));
app.use('/api/focus', createFocusRouter({ db }));
app.use('/api/goals', createGoalsRouter({ db, getLocalDateString, nextSortOrder }));
app.use('/api/user', createSettingsRouter({ db }));
registerParseVoiceRoutes(app, {
  getLocalDateString,
  addDaysLocal,
  openaiApiKey: OPENAI_API_KEY,
  appTimeZone: APP_TIME_ZONE,
});
app.use('/api/calendar', createCalendarRouter());
app.use('/api/rituals', createRitualsRouter({ db, getLocalDateString, nextSortOrder }));
app.use('/api/insights', createInsightsRouter({ db, getLocalDateString }));
registerPraxiaRoutes(app, { db, getLocalDateString, openaiApiKey: OPENAI_API_KEY });
app.use('/api/gamification', createGamificationRouter({ db, getLocalDateString }));
app.use('/api/weekly-reviews', createWeeklyReviewsRouter({ db }));

const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`🔥 Praxis API running on ${HOST}:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  setImmediate(() => runCalendarMaintenance());
});
