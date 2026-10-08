/** Nutrição / macros — schema + helpers (fase 0–2: day/profile/foods) */

import { randomUUID } from 'crypto';
import {
  normalizeBarcode,
  mapOffProductToFoodBody,
  fetchOpenFoodFactsProduct,
} from './nutritionOpenFoodFacts.js';
import { seedBrazilianFoods } from './nutritionSeedBr.js';
import { initRegimenSchema } from './nutritionRegimen.js';
import { resolveFoodQuantity, rescaleRecordedQuantity, quantityBasis, positiveQuantity } from './nutritionQuantities.js';

/** Slots canônicos do diário (ordem de exibição). */
export const MEAL_SLOTS = [
  'breakfast',
  'snack_morning',
  'lunch',
  'snack_afternoon',
  'dinner',
];

/** Legado ainda presente em logs antigos — normalizado na leitura/escrita. */
export const MEAL_SLOTS_LEGACY = ['snack', 'other'];

/** Todos os valores aceitos no POST/PATCH antes da normalização. */
export const MEAL_SLOTS_ACCEPTED = [...MEAL_SLOTS, ...MEAL_SLOTS_LEGACY];

/**
 * Normaliza slot de refeição.
 * - snack (legado) → snack_morning
 * - other (legado) → snack_afternoon
 */
export function normalizeMealSlot(slot) {
  if (slot === 'snack') return 'snack_morning';
  if (slot === 'other') return 'snack_afternoon';
  if (MEAL_SLOTS.includes(slot)) return slot;
  return 'snack_afternoon';
}

export const NUTRITION_GOALS = ['lose', 'maintain', 'gain'];
export const NUTRITION_ACTIVITIES = ['sedentary', 'light', 'moderate', 'active', 'very'];
export const NUTRITION_SEXES = ['male', 'female', 'other'];

const ACTIVITY_FACTOR = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very: 1.9,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(date) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function initNutritionSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_profile (
      id TEXT PRIMARY KEY DEFAULT 'default',
      sex TEXT,
      birth_year INTEGER,
      height_cm REAL,
      weight_kg REAL,
      activity TEXT DEFAULT 'moderate',
      goal TEXT DEFAULT 'maintain',
      target_kcal INTEGER,
      target_protein_g REAL,
      target_carbs_g REAL,
      target_fat_g REAL,
      target_fiber_g REAL,
      use_net_carbs INTEGER DEFAULT 0,
      onboarding_done INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT DEFAULT '',
      serving_label TEXT DEFAULT '100 g',
      serving_grams REAL,
      kcal REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL NOT NULL DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      source TEXT DEFAULT 'custom',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_meals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      notes TEXT DEFAULT '',
      is_favorite INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_meal_items (
      id TEXT PRIMARY KEY,
      meal_id TEXT NOT NULL,
      food_item_id TEXT NOT NULL,
      servings REAL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (meal_id) REFERENCES food_meals(id),
      FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_slot TEXT DEFAULT 'other',
      food_item_id TEXT,
      meal_id TEXT,
      name_snapshot TEXT NOT NULL DEFAULT '',
      servings REAL DEFAULT 1,
      grams REAL,
      kcal REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS body_weight_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date)
    );

    CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
    CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
    CREATE INDEX IF NOT EXISTS idx_food_items_favorite ON food_items(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_food_meals_status ON food_meals(status);
    CREATE INDEX IF NOT EXISTS idx_body_weight_date ON body_weight_logs(date);
  `);

  // Keep an immutable numeric basis for quantity edits (old logs migrate lazily).
  const logCols = db.prepare('PRAGMA table_info(food_logs)').all().map((column) => column.name);
  if (!logCols.includes('quantity_basis_json')) {
    db.exec('ALTER TABLE food_logs ADD COLUMN quantity_basis_json TEXT');
  }

  // fase 12: barcode no catálogo (cache OFF)
  const foodCols = db.prepare('PRAGMA table_info(food_items)').all().map((c) => c.name);
  if (!foodCols.includes('barcode')) {
    db.exec('ALTER TABLE food_items ADD COLUMN barcode TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON food_items(barcode)');

  const row = db.prepare('SELECT id FROM nutrition_profile WHERE id = ?').get('default');
  if (!row) {
    db.prepare(`
      INSERT INTO nutrition_profile (id, goal, use_net_carbs)
      VALUES ('default', 'maintain', 0)
    `).run();
  }


  // migrate onboarding_done
  const profCols = db.prepare("PRAGMA table_info(nutrition_profile)").all().map((c) => c.name);
  if (!profCols.includes('onboarding_done')) {
    db.exec('ALTER TABLE nutrition_profile ADD COLUMN onboarding_done INTEGER DEFAULT 0');
  }

  // fase 7: catálogo BR (idempotente)
  try {
    seedBrazilianFoods(db);
  } catch (err) {
    console.error('nutrition seed BR failed', err);
  }

  // rotina de suplementos/medicação (fora do diário de kcal)
  try {
    initRegimenSchema(db);
  } catch (err) {
    console.error('nutrition regimen schema failed', err);
  }
}

export function getNutritionProfile(db) {
  let profile = db.prepare('SELECT * FROM nutrition_profile WHERE id = ?').get('default');
  if (!profile) {
    db.prepare(`
      INSERT INTO nutrition_profile (id, goal, use_net_carbs)
      VALUES ('default', 'maintain', 0)
    `).run();
    profile = db.prepare('SELECT * FROM nutrition_profile WHERE id = ?').get('default');
  }
  return profile;
}

function numOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function intOrNull(v) {
  const n = numOrNull(v);
  if (n == null) return null;
  return Math.round(n);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Sugestão de metas (Mifflin-St Jeor + macros simples).
 * UI não expõe nomes de fórmula — só números.
 */
export function suggestNutritionTargets(input = {}) {
  const weight = numOrNull(input.weight_kg);
  const height = numOrNull(input.height_cm);
  const birthYear = intOrNull(input.birth_year);
  const sex = NUTRITION_SEXES.includes(input.sex) ? input.sex : 'male';
  const activity = NUTRITION_ACTIVITIES.includes(input.activity) ? input.activity : 'moderate';
  const goal = NUTRITION_GOALS.includes(input.goal) ? input.goal : 'maintain';

  if (weight == null || weight <= 0) {
    return { error: 'informe o peso (kg)' };
  }
  if (height == null || height <= 0) {
    return { error: 'informe a altura (cm)' };
  }

  const yearNow = new Date().getFullYear();
  let age = 30;
  if (birthYear != null && birthYear >= 1920 && birthYear <= yearNow) {
    age = clamp(yearNow - birthYear, 14, 100);
  }

  // Mifflin-St Jeor
  let bmr =
    sex === 'female'
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const tdee = bmr * (ACTIVITY_FACTOR[activity] || ACTIVITY_FACTOR.moderate);
  let targetKcal = tdee;
  if (goal === 'lose') targetKcal = tdee * 0.8;
  if (goal === 'gain') targetKcal = tdee * 1.1;
  targetKcal = Math.round(clamp(targetKcal, 1200, 6000) / 10) * 10;

  const proteinPerKg = goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.7;
  const fatPerKg = goal === 'lose' ? 0.8 : 1.0;
  let protein_g = Math.round(weight * proteinPerKg);
  let fat_g = Math.round(weight * fatPerKg);
  const proteinKcal = protein_g * 4;
  const fatKcal = fat_g * 9;
  let carbs_g = Math.round((targetKcal - proteinKcal - fatKcal) / 4);
  if (carbs_g < 50) {
    carbs_g = 50;
    // rebalance fat slightly if carbs hit floor
    const leftover = targetKcal - proteinKcal - carbs_g * 4;
    fat_g = Math.max(20, Math.round(leftover / 9));
  }

  const fiber_g = Math.round(clamp(targetKcal / 1000 * 14, 20, 45));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_kcal: targetKcal,
    target_protein_g: protein_g,
    target_carbs_g: carbs_g,
    target_fat_g: fat_g,
    target_fiber_g: fiber_g,
    goal,
    activity,
    sex,
    weight_kg: weight,
    height_cm: height,
    birth_year: birthYear,
  };
}

export function updateNutritionProfile(db, body = {}) {
  const existing = getNutritionProfile(db);
  const next = {
    sex:
      body.sex !== undefined
        ? body.sex === null || body.sex === ''
          ? null
          : NUTRITION_SEXES.includes(body.sex)
            ? body.sex
            : existing.sex
        : existing.sex,
    birth_year:
      body.birth_year !== undefined ? intOrNull(body.birth_year) : existing.birth_year,
    height_cm: body.height_cm !== undefined ? numOrNull(body.height_cm) : existing.height_cm,
    weight_kg: body.weight_kg !== undefined ? numOrNull(body.weight_kg) : existing.weight_kg,
    activity:
      body.activity !== undefined && NUTRITION_ACTIVITIES.includes(body.activity)
        ? body.activity
        : existing.activity || 'moderate',
    goal:
      body.goal !== undefined && NUTRITION_GOALS.includes(body.goal)
        ? body.goal
        : existing.goal || 'maintain',
    target_kcal:
      body.target_kcal !== undefined ? intOrNull(body.target_kcal) : existing.target_kcal,
    target_protein_g:
      body.target_protein_g !== undefined
        ? numOrNull(body.target_protein_g)
        : existing.target_protein_g,
    target_carbs_g:
      body.target_carbs_g !== undefined
        ? numOrNull(body.target_carbs_g)
        : existing.target_carbs_g,
    target_fat_g:
      body.target_fat_g !== undefined ? numOrNull(body.target_fat_g) : existing.target_fat_g,
    target_fiber_g:
      body.target_fiber_g !== undefined
        ? numOrNull(body.target_fiber_g)
        : existing.target_fiber_g,
    use_net_carbs:
      body.use_net_carbs !== undefined
        ? body.use_net_carbs === true ||
          body.use_net_carbs === 1 ||
          body.use_net_carbs === '1'
          ? 1
          : 0
        : existing.use_net_carbs ?? 0,
    onboarding_done:
      body.onboarding_done !== undefined
        ? body.onboarding_done === true ||
          body.onboarding_done === 1 ||
          body.onboarding_done === '1'
          ? 1
          : 0
        : existing.onboarding_done ?? 0,
  };

  // soft bounds
  if (next.weight_kg != null) next.weight_kg = clamp(next.weight_kg, 30, 300);
  if (next.height_cm != null) next.height_cm = clamp(next.height_cm, 100, 250);
  if (next.target_kcal != null) next.target_kcal = clamp(next.target_kcal, 800, 8000);
  for (const k of ['target_protein_g', 'target_carbs_g', 'target_fat_g', 'target_fiber_g']) {
    if (next[k] != null) next[k] = Math.round(clamp(next[k], 0, 1000) * 10) / 10;
  }

  db.prepare(`
    UPDATE nutrition_profile SET
      sex = ?,
      birth_year = ?,
      height_cm = ?,
      weight_kg = ?,
      activity = ?,
      goal = ?,
      target_kcal = ?,
      target_protein_g = ?,
      target_carbs_g = ?,
      target_fat_g = ?,
      target_fiber_g = ?,
      use_net_carbs = ?,
      onboarding_done = ?,
      updated_at = datetime('now')
    WHERE id = 'default'
  `).run(
    next.sex,
    next.birth_year,
    next.height_cm,
    next.weight_kg,
    next.activity,
    next.goal,
    next.target_kcal,
    next.target_protein_g,
    next.target_carbs_g,
    next.target_fat_g,
    next.target_fiber_g,
    next.use_net_carbs,
    next.onboarding_done,
  );

  return getNutritionProfile(db);
}

// ==================== food items (fase 2) ====================

function foodNum(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function foodNumOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFoodBody(body = {}, existing = null) {
  const name = body.name !== undefined
    ? String(body.name || '').trim()
    : existing?.name;
  if (!name) {
    const err = new Error('nome do alimento é obrigatório');
    err.status = 400;
    throw err;
  }

  const kcal = body.kcal !== undefined ? foodNum(body.kcal, 0) : (existing?.kcal ?? 0);
  const protein_g = body.protein_g !== undefined ? foodNum(body.protein_g, 0) : (existing?.protein_g ?? 0);
  const carbs_g = body.carbs_g !== undefined ? foodNum(body.carbs_g, 0) : (existing?.carbs_g ?? 0);
  const fat_g = body.fat_g !== undefined ? foodNum(body.fat_g, 0) : (existing?.fat_g ?? 0);
  const fiber_g = body.fiber_g !== undefined ? foodNum(body.fiber_g, 0) : (existing?.fiber_g ?? 0);

  return {
    name,
    brand: body.brand !== undefined ? String(body.brand || '').trim() : (existing?.brand || ''),
    serving_label:
      body.serving_label !== undefined
        ? String(body.serving_label || '').trim() || '100 g'
        : existing?.serving_label || '100 g',
    serving_grams:
      body.serving_grams !== undefined
        ? foodNumOrNull(body.serving_grams)
        : existing?.serving_grams ?? null,
    kcal: Math.max(0, Math.round(kcal * 10) / 10),
    protein_g: Math.max(0, Math.round(protein_g * 10) / 10),
    carbs_g: Math.max(0, Math.round(carbs_g * 10) / 10),
    fat_g: Math.max(0, Math.round(fat_g * 10) / 10),
    fiber_g: Math.max(0, Math.round(fiber_g * 10) / 10),
    is_favorite:
      body.is_favorite !== undefined
        ? body.is_favorite === true || body.is_favorite === 1 || body.is_favorite === '1'
          ? 1
          : 0
        : existing?.is_favorite ?? 0,
    source:
      body.source !== undefined
        ? String(body.source || 'custom')
        : existing?.source || 'custom',
    status:
      body.status !== undefined && ['active', 'archived'].includes(body.status)
        ? body.status
        : existing?.status || 'active',
  };
}

export function listFoods(db, { q, favorites, status = 'active', limit = 100 } = {}) {
  let sql = 'SELECT * FROM food_items WHERE 1=1';
  const params = [];

  if (status === 'all') {
    // no status filter
  } else if (status === 'archived') {
    sql += " AND status = 'archived'";
  } else {
    sql += " AND status = 'active'";
  }

  if (favorites === true || favorites === 1 || favorites === '1') {
    sql += ' AND is_favorite = 1';
  }

  const query = q != null ? String(q).trim() : '';
  if (query) {
    sql += ' AND (name LIKE ? OR brand LIKE ?)';
    const like = `%${query}%`;
    params.push(like, like);
  }

  sql += ' ORDER BY is_favorite DESC, name COLLATE NOCASE ASC LIMIT ?';
  const lim = Math.min(200, Math.max(1, Number(limit) || 100));
  params.push(lim);

  return db.prepare(sql).all(...params);
}

export function getFood(db, id) {
  return db.prepare('SELECT * FROM food_items WHERE id = ?').get(id) || null;
}

export function createFood(db, body = {}) {
  const data = normalizeFoodBody(body);
  const id = body.id || randomUUID();
  db.prepare(`
    INSERT INTO food_items (
      id, name, brand, serving_label, serving_grams,
      kcal, protein_g, carbs_g, fat_g, fiber_g,
      is_favorite, source, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.brand,
    data.serving_label,
    data.serving_grams,
    data.kcal,
    data.protein_g,
    data.carbs_g,
    data.fat_g,
    data.fiber_g,
    data.is_favorite,
    data.source,
    data.status,
  );
    const bc = body.barcode != null ? normalizeBarcode(body.barcode) : null;
  if (bc) {
    try {
      db.prepare('UPDATE food_items SET barcode = ? WHERE id = ?').run(bc, id);
    } catch {
      /* ignore */
    }
  }
return getFood(db, id);
}

export function updateFood(db, id, body = {}) {
  const existing = getFood(db, id);
  if (!existing) return null;
  const data = normalizeFoodBody(body, existing);
  db.prepare(`
    UPDATE food_items SET
      name = ?,
      brand = ?,
      serving_label = ?,
      serving_grams = ?,
      kcal = ?,
      protein_g = ?,
      carbs_g = ?,
      fat_g = ?,
      fiber_g = ?,
      is_favorite = ?,
      source = ?,
      status = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.name,
    data.brand,
    data.serving_label,
    data.serving_grams,
    data.kcal,
    data.protein_g,
    data.carbs_g,
    data.fat_g,
    data.fiber_g,
    data.is_favorite,
    data.source,
    data.status,
    id,
  );
  // barcode fica fora do normalize (coluna adicionada na fase 12); só toca se veio no body
  if (body.barcode !== undefined) {
    const bc = normalizeBarcode(body.barcode) || null;
    try {
      db.prepare('UPDATE food_items SET barcode = ? WHERE id = ?').run(bc, id);
    } catch {
      /* ignore */
    }
  }
  return getFood(db, id);
}

/** Soft archive (default). Pass hard=true to DELETE. */
export function deleteFood(db, id, { hard = false } = {}) {
  if (hard) {
    const r = db.prepare('DELETE FROM food_items WHERE id = ?').run(id);
    return r.changes > 0;
  }
  const existing = getFood(db, id);
  if (!existing) return false;
  db.prepare(`
    UPDATE food_items SET status = 'archived', updated_at = datetime('now') WHERE id = ?
  `).run(id);
  return true;
}

export function listLogsByDate(db, date) {
  return db
    .prepare(
      `SELECT * FROM food_logs WHERE date = ? ORDER BY created_at ASC, id ASC`,
    )
    .all(date);
}

export function getLog(db, id) {
  return db.prepare('SELECT * FROM food_logs WHERE id = ?').get(id) || null;
}

function logNum(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function logNumOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Scale food macros into a log snapshot.
 * grams + serving_grams → scale; senão servings (default 1).
 */
export function scaleFoodToSnapshot(food, { servings, grams } = {}) {
  if (!food) {
    const err = new Error('alimento não encontrado');
    err.status = 404;
    throw err;
  }
  const quantity = resolveFoodQuantity(food, { servings, grams });
  const scale = quantity.servings;

  return {
    name_snapshot: food.name + (food.brand ? ` (${food.brand})` : ''),
    food_item_id: food.id,
    servings: quantity.servings,
    grams: quantity.grams,
    quantity_basis_json: quantityBasis({ ...food, servings: 1, grams: food.serving_grams }),
    kcal: Math.round(logNum(food.kcal) * scale),
    protein_g: round1(logNum(food.protein_g) * scale),
    carbs_g: round1(logNum(food.carbs_g) * scale),
    fat_g: round1(logNum(food.fat_g) * scale),
    fiber_g: round1(logNum(food.fiber_g) * scale),
  };
}

export function createLog(db, body = {}, { today } = {}) {
  const date = body.date || today;
  if (!date || !isValidDateString(String(date).slice(0, 10))) {
    const err = new Error('data inválida (use YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  const dateStr = String(date).slice(0, 10);
  const meal_slot = normalizeMealSlot(body.meal_slot);

  let snapshot;
  if (body.food_item_id) {
    const food = getFood(db, body.food_item_id);
    snapshot = scaleFoodToSnapshot(food, {
      servings: body.servings,
      grams: body.grams,
    });
  } else {
    const name = String(body.name_snapshot || body.name || '').trim();
    if (!name) {
      const err = new Error('food_item_id ou nome é obrigatório');
      err.status = 400;
      throw err;
    }
    snapshot = {
      name_snapshot: name,
      food_item_id: null,
      servings: body.servings === undefined ? 1 : positiveQuantity(body.servings, 'porções'),
      grams: body.grams == null ? null : positiveQuantity(body.grams, 'gramas'),
      kcal: Math.round(logNum(body.kcal, 0)),
      protein_g: round1(logNum(body.protein_g, 0)),
      carbs_g: round1(logNum(body.carbs_g, 0)),
      fat_g: round1(logNum(body.fat_g, 0)),
      fiber_g: round1(logNum(body.fiber_g, 0)),
    };
  }

  const id = body.id || randomUUID();
  db.prepare(`
    INSERT INTO food_logs (
      id, date, meal_slot, food_item_id, meal_id, name_snapshot,
      servings, grams, kcal, protein_g, carbs_g, fat_g, fiber_g, note, source, quantity_basis_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    dateStr,
    meal_slot,
    snapshot.food_item_id,
    body.meal_id || null,
    snapshot.name_snapshot,
    snapshot.servings,
    snapshot.grams,
    snapshot.kcal,
    snapshot.protein_g,
    snapshot.carbs_g,
    snapshot.fat_g,
    snapshot.fiber_g,
    String(body.note || ''),
    body.source || 'manual',
    snapshot.quantity_basis_json || quantityBasis(snapshot),
  );
  return getLog(db, id);
}

export function updateLog(db, id, body = {}) {
  const existing = getLog(db, id);
  if (!existing) return null;

  const foodId =
    body.food_item_id !== undefined ? body.food_item_id : existing.food_item_id;
  const servings =
    body.servings !== undefined ? body.servings : existing.servings;
  const rescale =
    body.servings !== undefined ||
    body.grams !== undefined ||
    body.food_item_id !== undefined;

  let next = {
    date:
      body.date !== undefined
        ? String(body.date).slice(0, 10)
        : existing.date,
    meal_slot:
      body.meal_slot !== undefined
        ? normalizeMealSlot(body.meal_slot)
        : normalizeMealSlot(existing.meal_slot),
    food_item_id: foodId || null,
    meal_id: body.meal_id !== undefined ? body.meal_id : existing.meal_id,
    name_snapshot: existing.name_snapshot,
    servings: existing.servings,
    grams: existing.grams,
    kcal: existing.kcal,
    protein_g: existing.protein_g,
    carbs_g: existing.carbs_g,
    fat_g: existing.fat_g,
    fiber_g: existing.fiber_g,
    note: body.note !== undefined ? String(body.note) : existing.note,
  };

  if (body.date !== undefined && !isValidDateString(next.date)) {
    const err = new Error('data inválida (use YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }

  if (rescale && foodId && foodId !== existing.food_item_id) {
    const food = getFood(db, foodId);
    const snap = scaleFoodToSnapshot(food, {
      servings: body.grams != null && body.servings === undefined ? undefined : servings,
      grams: body.grams,
    });
    next = { ...next, ...snap, food_item_id: foodId };
  } else if (rescale) {
    // Rescale the recorded snapshot even if its catalogue item changed or was deleted.
    // Only explicitly submitted grams may override an explicitly submitted serving count.
    next = { ...next, ...rescaleRecordedQuantity(existing, {
      servings: body.servings,
      grams: body.grams,
    }) };
    if (!foodId) {
      for (const key of ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g']) {
        if (body[key] !== undefined) {
          next[key] = key === 'kcal' ? Math.round(logNum(body[key])) : round1(logNum(body[key]));
        }
      }
      if (body.name_snapshot !== undefined || body.name !== undefined) {
        next.name_snapshot = String(body.name_snapshot || body.name || existing.name_snapshot).trim();
      }
    }
  } else {
    if (body.name_snapshot !== undefined || body.name !== undefined) {
      next.name_snapshot = String(
        body.name_snapshot || body.name || existing.name_snapshot,
      ).trim();
    }
    if (body.kcal !== undefined) next.kcal = Math.round(logNum(body.kcal));
    if (body.protein_g !== undefined) next.protein_g = round1(logNum(body.protein_g));
    if (body.carbs_g !== undefined) next.carbs_g = round1(logNum(body.carbs_g));
    if (body.fat_g !== undefined) next.fat_g = round1(logNum(body.fat_g));
    if (body.fiber_g !== undefined) next.fiber_g = round1(logNum(body.fiber_g));
  }

  if ((!rescale || !foodId) && ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'].some((key) => body[key] !== undefined)) {
    next.quantity_basis_json = quantityBasis(next);
  }

  db.prepare(`
    UPDATE food_logs SET
      date = ?,
      meal_slot = ?,
      food_item_id = ?,
      meal_id = ?,
      name_snapshot = ?,
      servings = ?,
      grams = ?,
      kcal = ?,
      protein_g = ?,
      carbs_g = ?,
      fat_g = ?,
      fiber_g = ?,
      note = ?,
      quantity_basis_json = ?
    WHERE id = ?
  `).run(
    next.date,
    next.meal_slot,
    next.food_item_id,
    next.meal_id,
    next.name_snapshot,
    next.servings,
    next.grams,
    next.kcal,
    next.protein_g,
    next.carbs_g,
    next.fat_g,
    next.fiber_g,
    next.note,
    next.quantity_basis_json || existing.quantity_basis_json || null,
    id,
  );
  return getLog(db, id);
}

export function deleteLog(db, id) {
  const r = db.prepare('DELETE FROM food_logs WHERE id = ?').run(id);
  return r.changes > 0;
}

export function sumTotals(logs = []) {
  const totals = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  };
  for (const log of logs) {
    totals.kcal += Number(log.kcal) || 0;
    totals.protein_g += Number(log.protein_g) || 0;
    totals.carbs_g += Number(log.carbs_g) || 0;
    totals.fat_g += Number(log.fat_g) || 0;
    totals.fiber_g += Number(log.fiber_g) || 0;
  }
  return {
    kcal: Math.round(totals.kcal),
    protein_g: Math.round(totals.protein_g * 10) / 10,
    carbs_g: Math.round(totals.carbs_g * 10) / 10,
    fat_g: Math.round(totals.fat_g * 10) / 10,
    fiber_g: Math.round(totals.fiber_g * 10) / 10,
  };
}

function emptyBySlot() {
  return {
    breakfast: [],
    snack_morning: [],
    lunch: [],
    snack_afternoon: [],
    dinner: [],
  };
}

export function buildDayPayload(db, date) {
  const logs = listLogsByDate(db, date).map((log) => ({
    ...log,
    meal_slot: normalizeMealSlot(log.meal_slot),
  }));
  const profile = getNutritionProfile(db);
  const by_slot = emptyBySlot();
  for (const log of logs) {
    const slot = normalizeMealSlot(log.meal_slot);
    by_slot[slot].push(log);
  }
  return {
    date,
    logs,
    totals: sumTotals(logs),
    targets: {
      kcal: profile.target_kcal ?? null,
      protein_g: profile.target_protein_g ?? null,
      carbs_g: profile.target_carbs_g ?? null,
      fat_g: profile.target_fat_g ?? null,
    },
    by_slot,
  };
}

/** Shape estável sem DB (testes / fallback) */
export function getDayEmpty(date) {
  return {
    date,
    logs: [],
    totals: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    targets: {
      kcal: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    },
    by_slot: emptyBySlot(),
  };
}

/** Alimentos usados recentemente em food_logs (com food_item_id ativo). */
export function listRecentFoods(db, { limit = 12 } = {}) {
  const lim = Math.min(50, Math.max(1, Number(limit) || 12));
  return db
    .prepare(
      `
    SELECT f.*, MAX(l.created_at) AS last_logged_at
    FROM food_logs l
    INNER JOIN food_items f ON f.id = l.food_item_id
    WHERE l.food_item_id IS NOT NULL
      AND f.status = 'active'
    GROUP BY f.id
    ORDER BY last_logged_at DESC
    LIMIT ?
  `,
    )
    .all(lim);
}

/**
 * Copia logs de fromDate para toDate.
 * skipIfTargetHasLogs: se toDate já tem logs, não copia (evita duplicar sem querer).
 */
export function copyDayLogs(db, { fromDate, toDate, skipIfTargetHasLogs = true } = {}) {
  if (!fromDate || !toDate || !isValidDateString(fromDate) || !isValidDateString(toDate)) {
    const err = new Error('datas inválidas (use YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  if (fromDate === toDate) {
    const err = new Error('origem e destino são o mesmo dia');
    err.status = 400;
    throw err;
  }
  const existing = listLogsByDate(db, toDate);
  if (skipIfTargetHasLogs && existing.length > 0) {
    const err = new Error('este dia já tem comida registrada — esvazia antes ou desliga a proteção');
    err.status = 409;
    throw err;
  }
  const source = listLogsByDate(db, fromDate);
  if (source.length === 0) {
    return { copied: 0, logs: [] };
  }
  const created = [];
  const run = db.transaction((rows) => {
    for (const row of rows) {
      if (row.food_item_id) {
        created.push(
          createLog(db, {
            date: toDate,
            meal_slot: row.meal_slot,
            food_item_id: row.food_item_id,
            servings: row.servings,
            grams: row.grams,
            note: row.note,
            source: 'copy',
          }),
        );
      } else {
        created.push(
          createLog(db, {
            date: toDate,
            meal_slot: row.meal_slot,
            name_snapshot: row.name_snapshot,
            servings: row.servings,
            grams: row.grams,
            kcal: row.kcal,
            protein_g: row.protein_g,
            carbs_g: row.carbs_g,
            fat_g: row.fat_g,
            fiber_g: row.fiber_g,
            note: row.note,
            source: 'copy',
          }),
        );
      }
    }
  });
  run(source);
  return { copied: created.length, logs: created };
}


// ==================== meals (fase 6) ====================

export function getMealItems(db, mealId) {
  return db
    .prepare(
      `
    SELECT mi.*, f.name AS food_name, f.brand AS food_brand,
           f.serving_label, f.kcal, f.protein_g, f.carbs_g, f.fat_g, f.fiber_g,
           f.serving_grams, f.status AS food_status
    FROM food_meal_items mi
    LEFT JOIN food_items f ON f.id = mi.food_item_id
    WHERE mi.meal_id = ?
    ORDER BY mi.sort_order ASC, mi.id ASC
  `,
    )
    .all(mealId);
}

function mealTotalsFromItems(items) {
  let kcal = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  let fiber_g = 0;
  for (const it of items) {
    if (it.food_status === 'archived') continue;
    const s = Number(it.servings) || 1;
    kcal += (Number(it.kcal) || 0) * s;
    protein_g += (Number(it.protein_g) || 0) * s;
    carbs_g += (Number(it.carbs_g) || 0) * s;
    fat_g += (Number(it.fat_g) || 0) * s;
    fiber_g += (Number(it.fiber_g) || 0) * s;
  }
  return {
    kcal: Math.round(kcal),
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    fiber_g: Math.round(fiber_g * 10) / 10,
  };
}

export function getMeal(db, id) {
  const meal = db.prepare('SELECT * FROM food_meals WHERE id = ?').get(id);
  if (!meal) return null;
  const items = getMealItems(db, id);
  return {
    ...meal,
    items,
    totals: mealTotalsFromItems(items),
    item_count: items.length,
  };
}

export function listMeals(db, { status = 'active', favorites, limit = 50 } = {}) {
  let sql = 'SELECT * FROM food_meals WHERE 1=1';
  const params = [];
  if (status === 'all') {
    // no filter
  } else if (status === 'archived') {
    sql += " AND status = 'archived'";
  } else {
    sql += " AND status = 'active'";
  }
  if (favorites === true || favorites === 1 || favorites === '1') {
    sql += ' AND is_favorite = 1';
  }
  sql += ' ORDER BY is_favorite DESC, name COLLATE NOCASE ASC LIMIT ?';
  const lim = Math.min(100, Math.max(1, Number(limit) || 50));
  params.push(lim);
  const rows = db.prepare(sql).all(...params);
  return rows.map((m) => {
    const items = getMealItems(db, m.id);
    return {
      ...m,
      items,
      totals: mealTotalsFromItems(items),
      item_count: items.length,
    };
  });
}

function replaceMealItems(db, mealId, items = []) {
  db.prepare('DELETE FROM food_meal_items WHERE meal_id = ?').run(mealId);
  const insert = db.prepare(`
    INSERT INTO food_meal_items (id, meal_id, food_item_id, servings, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  let order = 0;
  for (const raw of items) {
    const foodId = raw.food_item_id || raw.id;
    if (!foodId) continue;
    const food = getFood(db, foodId);
    if (!food || food.status === 'archived') continue;
    const servings = Math.max(0.1, Number(raw.servings) || 1);
    insert.run(randomUUID(), mealId, foodId, servings, order++);
  }
}

export function createMeal(db, body = {}) {
  const name = String(body.name || '').trim();
  if (!name) {
    const err = new Error('nome da refeição é obrigatório');
    err.status = 400;
    throw err;
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    const err = new Error('adicione pelo menos 1 alimento');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  db.prepare(`
    INSERT INTO food_meals (id, name, notes, is_favorite, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(
    id,
    name,
    String(body.notes || ''),
    body.is_favorite === true || body.is_favorite === 1 || body.is_favorite === '1' ? 1 : 0,
  );
  replaceMealItems(db, id, items);
  return getMeal(db, id);
}

export function updateMeal(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM food_meals WHERE id = ?').get(id);
  if (!existing) return null;

  const name =
    body.name !== undefined ? String(body.name || '').trim() : existing.name;
  if (!name) {
    const err = new Error('nome da refeição é obrigatório');
    err.status = 400;
    throw err;
  }
  const notes = body.notes !== undefined ? String(body.notes || '') : existing.notes;
  const is_favorite =
    body.is_favorite !== undefined
      ? body.is_favorite === true || body.is_favorite === 1 || body.is_favorite === '1'
        ? 1
        : 0
      : existing.is_favorite;
  const status =
    body.status !== undefined && ['active', 'archived'].includes(body.status)
      ? body.status
      : existing.status;

  db.prepare(`
    UPDATE food_meals SET name = ?, notes = ?, is_favorite = ?, status = ?
    WHERE id = ?
  `).run(name, notes, is_favorite, status, id);

  if (Array.isArray(body.items)) {
    if (body.items.length === 0) {
      const err = new Error('adicione pelo menos 1 alimento');
      err.status = 400;
      throw err;
    }
    replaceMealItems(db, id, body.items);
  }
  return getMeal(db, id);
}

export function deleteMeal(db, id, { hard = false } = {}) {
  const existing = db.prepare('SELECT id FROM food_meals WHERE id = ?').get(id);
  if (!existing) return false;
  if (hard) {
    db.prepare('DELETE FROM food_meal_items WHERE meal_id = ?').run(id);
    db.prepare('DELETE FROM food_meals WHERE id = ?').run(id);
    return true;
  }
  db.prepare("UPDATE food_meals SET status = 'archived' WHERE id = ?").run(id);
  return true;
}

/** Expande refeição salva em N food_logs no diário. */
export function createLogsFromMeal(db, body = {}, { today } = {}) {
  const mealId = body.meal_id || body.id;
  if (!mealId) {
    const err = new Error('meal_id é obrigatório');
    err.status = 400;
    throw err;
  }
  const meal = getMeal(db, mealId);
  if (!meal || meal.status === 'archived') {
    const err = new Error('refeição não encontrada');
    err.status = 404;
    throw err;
  }
  const date = body.date || today;
  const meal_slot = normalizeMealSlot(body.meal_slot);
  const scale = Math.max(0.1, Number(body.servings) || 1);
  const created = [];
  const run = db.transaction(() => {
    for (const it of meal.items) {
      if (!it.food_item_id || it.food_status === 'archived') continue;
      const servings = (Number(it.servings) || 1) * scale;
      created.push(
        createLog(db, {
          date,
          meal_slot,
          food_item_id: it.food_item_id,
          servings,
          meal_id: mealId,
          source: 'meal',
        }, { today }),
      );
    }
  });
  run();
  if (created.length === 0) {
    const err = new Error('refeição sem alimentos ativos');
    err.status = 400;
    throw err;
  }
  return {
    meal_id: mealId,
    meal_name: meal.name,
    created: created.length,
    logs: created,
    day: buildDayPayload(db, String(date).slice(0, 10)),
  };
}

/** Re-run seed BR (admin/smoke). Idempotente. */
export function ensureNutritionSeed(db) {
  return seedBrazilianFoods(db);
}


// ==================== parse-text (fase 8 — base p/ futuro) ====================

const SLOT_HINTS = [
  { slot: 'snack_morning', re: /\b(lanche\s+da\s+manh[aã]|lanche\s+manh[aã]|snack\s*morn)/i },
  { slot: 'snack_afternoon', re: /\b(lanche\s+da\s+tarde|lanche\s+tarde|pr[eé][\s-]?treino|pos[\s-]?treino|snack\s*aft)/i },
  { slot: 'breakfast', re: /\b(caf[eé]|caf[eé]\s+da\s+manh[aã]|breakfast)\b/i },
  { slot: 'lunch', re: /\b(almo[cç]o|almocei|lunch)\b/i },
  { slot: 'dinner', re: /\b(jantar|jantei|dinner|ceia)\b/i },
  // genérico por último
  { slot: 'snack_afternoon', re: /\b(lanche|lanchei|snack)\b/i },
];

function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectMealSlot(text) {
  for (const h of SLOT_HINTS) {
    if (h.re.test(text)) return h.slot;
  }
  return null;
}

function tokenizeFoodPhrases(text) {
  // split on e/, comma, plus, "com", newlines
  let t = String(text || '');
  t = t.replace(/\b(comi|tomei|almocei|jantei|lanhei|bebi)\b/gi, ' ');
  const parts = t
    .split(/\s*(?:,|\+|\/|\be\b|\bcom\b|\n|;)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  return parts.length ? parts : [String(text || '').trim()].filter(Boolean);
}

/**
 * Parse qty from phrase: "150g frango", "2 ovos", "1 colher azeite", "frango 100g"
 * returns { grams?, servings?, rest }
 */
function extractQty(phrase) {
  const p = String(phrase).trim();
  let grams = null;
  let servings = null;
  let rest = p;

  const g1 = p.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?)\b\s*(.+)$/i);
  if (g1) {
    grams = Number(g1[1].replace(',', '.'));
    rest = g1[3].trim();
    return { grams, servings, rest };
  }
  const g2 = p.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?)\b\s*$/i);
  if (g2) {
    grams = Number(g2[2].replace(',', '.'));
    rest = g2[1].trim();
    return { grams, servings, rest };
  }
  const u1 = p.match(/^(\d+(?:[.,]\d+)?)\s*(un|unid|unidades?|x|por[cç][oõ]es?|scoops?|colheres?)?\s+(.+)$/i);
  if (u1 && !/^(g|gr)/i.test(u1[2] || '')) {
    servings = Number(u1[1].replace(',', '.'));
    rest = u1[3].trim();
    return { grams, servings, rest };
  }
  const u2 = p.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (u2 && !/\d\s*g/i.test(p)) {
    // "2 ovos"
    servings = Number(u2[1].replace(',', '.'));
    rest = u2[2].trim();
  }
  return { grams, servings, rest };
}

function scoreFoodMatch(queryNorm, food) {
  const name = normalizeForMatch(food.name);
  const brand = normalizeForMatch(food.brand || '');
  if (!queryNorm || !name) return 0;
  if (name === queryNorm) return 100;
  if (name.includes(queryNorm)) return 80 + Math.min(15, queryNorm.length);
  if (queryNorm.includes(name) && name.length >= 4) return 70;
  // token overlap
  const qt = queryNorm.split(' ').filter((w) => w.length > 2);
  const nt = name.split(' ').filter((w) => w.length > 2);
  if (!qt.length || !nt.length) return 0;
  let hit = 0;
  for (const w of qt) {
    if (nt.some((n) => n.startsWith(w) || w.startsWith(n))) hit += 1;
  }
  if (hit === 0) {
    if (brand && brand.includes(queryNorm)) return 40;
    return 0;
  }
  return 40 + (hit / qt.length) * 40;
}

/**
 * Heurística PT: casa trechos do texto com food_items ativos.
 * Não grava logs — só candidatos pra confirmação.
 */
export function parseNutritionText(db, { text, meal_slot, limitPerPhrase = 5 } = {}) {
  const raw = String(text || '').trim();
  if (!raw) {
    const err = new Error('texto vazio');
    err.status = 400;
    throw err;
  }
  const slot = meal_slot
    ? normalizeMealSlot(meal_slot)
    : normalizeMealSlot(detectMealSlot(raw) || 'snack_afternoon');

  const foods = listFoods(db, { status: 'active', limit: 200 });
  const phrases = tokenizeFoodPhrases(raw);
  const candidates = [];
  const unmatched = [];

  for (const phrase of phrases) {
    const { grams, servings, rest } = extractQty(phrase);
    const qNorm = normalizeForMatch(rest || phrase);
    if (!qNorm || qNorm.length < 2) continue;

    const ranked = foods
      .map((f) => ({ food: f, score: scoreFoodMatch(qNorm, f) }))
      .filter((x) => x.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, limitPerPhrase);

    if (!ranked.length) {
      unmatched.push(phrase);
      continue;
    }

    const best = ranked[0];
    let useServings = servings != null ? servings : 1;
    let useGrams = grams;
    // if grams given and food has serving_grams, prefer grams path
    if (useGrams != null && best.food.serving_grams) {
      useServings = useGrams / Number(best.food.serving_grams);
    }

    const snap = scaleFoodToSnapshot(best.food, {
      servings: useServings,
      grams: useGrams,
    });

    candidates.push({
      phrase,
      query: rest || phrase,
      meal_slot: slot,
      food_item_id: best.food.id,
      food_name: best.food.name,
      servings: Math.round(useServings * 100) / 100,
      grams: useGrams,
      score: best.score,
      preview: {
        kcal: snap.kcal,
        protein_g: snap.protein_g,
        carbs_g: snap.carbs_g,
        fat_g: snap.fat_g,
      },
      alternatives: ranked.slice(1, 4).map((r) => ({
        food_item_id: r.food.id,
        food_name: r.food.name,
        score: r.score,
      })),
    });
  }

  return {
    text: raw,
    meal_slot: slot,
    candidates,
    unmatched,
    note:
      'Candidatos heurísticos — confirme antes de gravar. A.N.A./Telegram pode mandar transcript aqui.',
  };
}

/**
 * Confirma candidatos e grava logs.
 * body: { date?, meal_slot?, items: [{ food_item_id, servings?, grams?, meal_slot? }] }
 */
export function createLogsFromParsed(db, body = {}, { today } = {}) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    const err = new Error('nenhum item pra gravar');
    err.status = 400;
    throw err;
  }
  const date = body.date || today;
  const defaultSlot = normalizeMealSlot(body.meal_slot || 'snack_afternoon');
  const created = [];
  const run = db.transaction(() => {
    for (const it of items) {
      if (!it.food_item_id) continue;
      created.push(
        createLog(
          db,
          {
            date,
            meal_slot: it.meal_slot != null ? normalizeMealSlot(it.meal_slot) : defaultSlot,
            food_item_id: it.food_item_id,
            servings: it.servings,
            grams: it.grams,
            source: body.source || 'text',
            note: it.note || '',
          },
          { today },
        ),
      );
    }
  });
  run();
  if (!created.length) {
    const err = new Error('nenhum log criado');
    err.status = 400;
    throw err;
  }
  return {
    created: created.length,
    logs: created,
    day: buildDayPayload(db, String(date).slice(0, 10)),
  };
}


// ==================== summary / history (fase 9) ====================

/**
 * Agrega food_logs entre fromDate e toDate (inclusive).
 * days_logged = dias com pelo menos 1 log.
 */
export function buildNutritionSummary(db, { from, to } = {}) {
  if (!from || !to || !isValidDateString(from) || !isValidDateString(to)) {
    const err = new Error('from e to obrigatórios (YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  if (from > to) {
    const err = new Error('from deve ser <= to');
    err.status = 400;
    throw err;
  }

  const logs = db
    .prepare(
      `
    SELECT * FROM food_logs
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC, created_at ASC
  `,
    )
    .all(from, to);

  const byDate = new Map();
  for (const log of logs) {
    if (!byDate.has(log.date)) byDate.set(log.date, []);
    byDate.get(log.date).push(log);
  }

  const profile = getNutritionProfile(db);
  const days = [];
  // iterate all calendar days in range
  const [ys, ms, ds] = from.split('-').map(Number);
  const [ye, me, de] = to.split('-').map(Number);
  let cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    const dayLogs = byDate.get(key) || [];
    const totals = sumTotals(dayLogs);
    days.push({
      date: key,
      log_count: dayLogs.length,
      totals,
      has_log: dayLogs.length > 0,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const daysLogged = days.filter((d) => d.has_log);
  const n = daysLogged.length;
  const sum = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const d of daysLogged) {
    sum.kcal += d.totals.kcal;
    sum.protein_g += d.totals.protein_g;
    sum.carbs_g += d.totals.carbs_g;
    sum.fat_g += d.totals.fat_g;
    sum.fiber_g += d.totals.fiber_g;
  }
  const avg = (v) => (n > 0 ? Math.round((v / n) * 10) / 10 : null);
  const averages = {
    kcal: n > 0 ? Math.round(sum.kcal / n) : null,
    protein_g: avg(sum.protein_g),
    carbs_g: avg(sum.carbs_g),
    fat_g: avg(sum.fat_g),
    fiber_g: avg(sum.fiber_g),
  };

  // top foods by name_snapshot frequency
  const nameCount = {};
  for (const log of logs) {
    const name = log.name_snapshot || '—';
    nameCount[name] = (nameCount[name] || 0) + 1;
  }
  const top_foods = Object.entries(nameCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const targets = {
    kcal: profile.target_kcal ?? null,
    protein_g: profile.target_protein_g ?? null,
    carbs_g: profile.target_carbs_g ?? null,
    fat_g: profile.target_fat_g ?? null,
  };

  let days_hit_kcal = null;
  let days_hit_protein = null;
  if (targets.kcal != null || targets.protein_g != null) {
    days_hit_kcal = 0;
    days_hit_protein = 0;
    for (const d of daysLogged) {
      if (targets.kcal != null && d.totals.kcal >= targets.kcal * 0.9 && d.totals.kcal <= targets.kcal * 1.1) {
        days_hit_kcal += 1;
      }
      if (targets.protein_g != null && d.totals.protein_g >= targets.protein_g * 0.9) {
        days_hit_protein += 1;
      }
    }
  }

  return {
    from,
    to,
    range_days: days.length,
    days_logged: n,
    log_count: logs.length,
    totals_sum: {
      kcal: Math.round(sum.kcal),
      protein_g: Math.round(sum.protein_g * 10) / 10,
      carbs_g: Math.round(sum.carbs_g * 10) / 10,
      fat_g: Math.round(sum.fat_g * 10) / 10,
      fiber_g: Math.round(sum.fiber_g * 10) / 10,
    },
    averages,
    targets,
    days_hit_kcal,
    days_hit_protein,
    top_foods,
    days,
  };
}

// ==================== body weight (fase 10) ====================

export function listWeightLogs(db, { from, to, limit = 90 } = {}) {
  let sql = 'SELECT * FROM body_weight_logs WHERE 1=1';
  const params = [];
  if (from && isValidDateString(from)) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to && isValidDateString(to)) {
    sql += ' AND date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY date DESC LIMIT ?';
  params.push(Math.min(365, Math.max(1, Number(limit) || 90)));
  return db.prepare(sql).all(...params);
}

export function getWeightLog(db, id) {
  return db.prepare('SELECT * FROM body_weight_logs WHERE id = ?').get(id) || null;
}

/**
 * Upsert by date: one weight per day.
 * Optionally sync nutrition_profile.weight_kg to latest.
 */
export function upsertWeightLog(db, body = {}, { today } = {}) {
  const date = String(body.date || today || '').slice(0, 10);
  if (!isValidDateString(date)) {
    const err = new Error('data inválida (use YYYY-MM-DD)');
    err.status = 400;
    throw err;
  }
  const weight = Number(body.weight_kg);
  if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
    const err = new Error('peso deve ser entre 30 e 300 kg');
    err.status = 400;
    throw err;
  }
  const note = String(body.note || '');
  const existing = db.prepare('SELECT id FROM body_weight_logs WHERE date = ?').get(date);
  let id;
  if (existing) {
    id = existing.id;
    db.prepare(
      'UPDATE body_weight_logs SET weight_kg = ?, note = ? WHERE id = ?',
    ).run(Math.round(weight * 10) / 10, note, id);
  } else {
    id = body.id || randomUUID();
    db.prepare(
      'INSERT INTO body_weight_logs (id, date, weight_kg, note) VALUES (?, ?, ?, ?)',
    ).run(id, date, Math.round(weight * 10) / 10, note);
  }
  // keep profile in sync with latest log by date
  const latest = db
    .prepare('SELECT weight_kg FROM body_weight_logs ORDER BY date DESC LIMIT 1')
    .get();
  if (latest) {
    db.prepare(
      "UPDATE nutrition_profile SET weight_kg = ?, updated_at = datetime('now') WHERE id = 'default'",
    ).run(latest.weight_kg);
  }
  return getWeightLog(db, id);
}

export function deleteWeightLog(db, id) {
  const r = db.prepare('DELETE FROM body_weight_logs WHERE id = ?').run(id);
  if (r.changes > 0) {
    const latest = db
      .prepare('SELECT weight_kg FROM body_weight_logs ORDER BY date DESC LIMIT 1')
      .get();
    if (latest) {
      db.prepare(
        "UPDATE nutrition_profile SET weight_kg = ?, updated_at = datetime('now') WHERE id = 'default'",
      ).run(latest.weight_kg);
    }
  }
  return r.changes > 0;
}

/** Compact series for sparkline + delta */
export function buildWeightTrend(db, { days = 30 } = {}) {
  const lim = Math.min(180, Math.max(7, Number(days) || 30));
  const rows = db
    .prepare(
      'SELECT date, weight_kg FROM body_weight_logs ORDER BY date DESC LIMIT ?',
    )
    .all(lim)
    .reverse();
  if (!rows.length) {
    return {
      points: [],
      latest: null,
      previous: null,
      delta_kg: null,
      min_kg: null,
      max_kg: null,
    };
  }
  const weights = rows.map((r) => Number(r.weight_kg));
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;
  return {
    points: rows,
    latest,
    previous,
    delta_kg:
      previous != null
        ? Math.round((Number(latest.weight_kg) - Number(previous.weight_kg)) * 10) / 10
        : null,
    min_kg: Math.min(...weights),
    max_kg: Math.max(...weights),
  };
}

// ==================== barcode / OFF (fase 12) ====================

export function findFoodByBarcode(db, code) {
  const bc = normalizeBarcode(code);
  if (!bc) return null;
  // prefer stable off_ id, else any row with barcode
  const byId = getFood(db, `off_${bc}`);
  if (byId && byId.status !== 'archived') return byId;
  const row = db
    .prepare(
      "SELECT * FROM food_items WHERE barcode = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
    )
    .get(bc);
  return row || byId || null;
}

/**
 * Cache OFF product into food_items (id off_<barcode>).
 * refresh=true updates macros from fresh OFF body.
 */
export function cacheOffFood(db, mapped, { refresh = false } = {}) {
  const barcode = normalizeBarcode(mapped.barcode || mapped.id?.replace(/^off_/, ''));
  if (!barcode) {
    const err = new Error('barcode inválido no cache');
    err.status = 400;
    throw err;
  }
  const id = mapped.id || `off_${barcode}`;
  const existing = getFood(db, id);
  const body = {
    name: mapped.name,
    brand: mapped.brand || '',
    serving_label: mapped.serving_label,
    serving_grams: mapped.serving_grams,
    kcal: mapped.kcal,
    protein_g: mapped.protein_g,
    carbs_g: mapped.carbs_g,
    fat_g: mapped.fat_g,
    fiber_g: mapped.fiber_g,
    source: 'openfoodfacts',
    status: 'active',
  };

  if (existing) {
    if (refresh) {
      updateFood(db, id, body);
      db.prepare(
        "UPDATE food_items SET barcode = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(barcode, id);
    } else {
      // ensure barcode set
      if (!existing.barcode) {
        db.prepare('UPDATE food_items SET barcode = ? WHERE id = ?').run(barcode, id);
      }
    }
    return getFood(db, id);
  }

  createFood(db, { ...body, id });
  db.prepare('UPDATE food_items SET barcode = ? WHERE id = ?').run(barcode, id);
  return getFood(db, id);
}

/**
 * Lookup: local cache first, then Open Food Facts (unless cacheOnly).
 * Returns { source: 'cache'|'openfoodfacts'|'not_found', food?, off?, barcode }
 */
export async function lookupBarcode(db, rawCode, { refresh = false, cacheOnly = false } = {}) {
  const barcode = normalizeBarcode(rawCode);
  if (!barcode) {
    const err = new Error('código de barras inválido (use 8–14 dígitos)');
    err.status = 400;
    throw err;
  }

  if (!refresh) {
    const cached = findFoodByBarcode(db, barcode);
    if (cached) {
      return { source: 'cache', barcode, food: cached, off: null };
    }
  }

  if (cacheOnly) {
    return { source: 'not_found', barcode, food: null, off: null };
  }

  const data = await fetchOpenFoodFactsProduct(barcode);
  // OFF v0/v2: status 1 = found, 0 = not found
  if (!data || data.status === 0 || !data.product) {
    return {
      source: 'not_found',
      barcode,
      food: null,
      off: { status: data?.status, status_verbose: data?.status_verbose || 'product not found' },
    };
  }

  const mapped = mapOffProductToFoodBody(data.product, barcode);
  const food = cacheOffFood(db, mapped, { refresh: true });
  return {
    source: 'openfoodfacts',
    barcode,
    food,
    off: {
      status: data.status,
      image_url: mapped.off_meta?.image_url || null,
      per: mapped.off_meta?.per,
      quantity: mapped.off_meta?.quantity,
    },
  };
}
