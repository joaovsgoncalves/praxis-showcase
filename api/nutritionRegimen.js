/** Rotina de suplementos e medicação — fora do diário de kcal. */

import { randomUUID } from 'crypto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(date) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const REGIMEN_KINDS = ['supplement', 'medication'];
export const REGIMEN_TIMINGS = ['morning', 'pre_workout', 'post_workout', 'night', 'anytime'];
export const REGIMEN_FREQUENCIES = ['daily', 'training_day', 'as_needed'];

const SEED_ITEMS = [
  {
    id: 'regimen_escitalopram',
    kind: 'medication',
    name: 'Escitalopram',
    dose_label: 'dose do médico',
    timing: 'morning',
    frequency: 'daily',
    notes: 'Remédio. Não pular nem mudar sem o médico.',
    sort_order: 0,
  },
  {
    id: 'regimen_creatina',
    kind: 'supplement',
    name: 'Creatina',
    dose_label: '5 g',
    timing: 'morning',
    frequency: 'daily',
    notes: 'Todo dia, inclusive no descanso.',
    sort_order: 1,
  },
  {
    id: 'regimen_magnesio',
    kind: 'supplement',
    name: 'Magnésio',
    dose_label: 'L-treonato (1 dose)',
    timing: 'night',
    frequency: 'daily',
    notes: 'Uma forma só. Na reposição, glicinato costuma bastar.',
    sort_order: 2,
  },
  {
    id: 'regimen_maca',
    kind: 'supplement',
    name: 'Maca peruana',
    dose_label: '1 dose',
    timing: 'morning',
    frequency: 'as_needed',
    notes: 'Gosto, não obrigação.',
    sort_order: 3,
  },
  {
    id: 'regimen_melatonina',
    kind: 'supplement',
    name: 'Melatonina',
    dose_label: '0,3–1 mg',
    timing: 'night',
    frequency: 'as_needed',
    notes: 'Noite difícil. Avisar o médico que usa com o escitalopram.',
    sort_order: 4,
  },
];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function str(v, fallback = '') {
  if (v == null) return fallback;
  return String(v).trim();
}

function oneOf(value, allowed, fallback) {
  if (allowed.includes(value)) return value;
  return fallback;
}

export function initRegimenSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_regimen_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'supplement',
      name TEXT NOT NULL,
      dose_label TEXT DEFAULT '',
      timing TEXT NOT NULL DEFAULT 'morning',
      frequency TEXT NOT NULL DEFAULT 'daily',
      notes TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nutrition_regimen_logs (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      date TEXT NOT NULL,
      taken INTEGER NOT NULL DEFAULT 1,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_id, date),
      FOREIGN KEY (item_id) REFERENCES nutrition_regimen_items(id)
    );

    CREATE INDEX IF NOT EXISTS idx_regimen_items_status
      ON nutrition_regimen_items(status, sort_order);
    CREATE INDEX IF NOT EXISTS idx_regimen_logs_date
      ON nutrition_regimen_logs(date);
  `);

  seedRegimenIfEmpty(db);
}

export function seedRegimenIfEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM nutrition_regimen_items').get();
  if (Number(row?.n || 0) > 0) {
    return { seeded: false, count: Number(row.n) };
  }
  const insert = db.prepare(`
    INSERT INTO nutrition_regimen_items (
      id, kind, name, dose_label, timing, frequency, notes, sort_order, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  const run = db.transaction(() => {
    for (const item of SEED_ITEMS) {
      insert.run(
        item.id,
        item.kind,
        item.name,
        item.dose_label,
        item.timing,
        item.frequency,
        item.notes,
        item.sort_order,
      );
    }
  });
  run();
  return { seeded: true, count: SEED_ITEMS.length };
}

function normalizeItemBody(body = {}, existing = {}) {
  const name = str(body.name, existing.name);
  if (!name) throw badRequest('nome é obrigatório');

  const kind = oneOf(str(body.kind, existing.kind || 'supplement'), REGIMEN_KINDS, null);
  if (!kind) throw badRequest('tipo inválido (supplement ou medication)');

  const timing = oneOf(str(body.timing, existing.timing || 'morning'), REGIMEN_TIMINGS, null);
  if (!timing) throw badRequest('horário inválido');

  const frequency = oneOf(
    str(body.frequency, existing.frequency || 'daily'),
    REGIMEN_FREQUENCIES,
    null,
  );
  if (!frequency) throw badRequest('frequência inválida');

  const status = oneOf(str(body.status, existing.status || 'active'), ['active', 'archived'], 'active');

  let sortOrder = existing.sort_order ?? 0;
  if (body.sort_order != null && body.sort_order !== '') {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) throw badRequest('ordem inválida');
    sortOrder = Math.round(n);
  }

  return {
    name,
    kind,
    dose_label: str(body.dose_label, existing.dose_label || ''),
    timing,
    frequency,
    notes: str(body.notes, existing.notes || ''),
    sort_order: sortOrder,
    status,
  };
}

export function getRegimenItem(db, id) {
  if (!id) return null;
  return db.prepare('SELECT * FROM nutrition_regimen_items WHERE id = ?').get(id) || null;
}

export function listRegimenItems(db, { status = 'active' } = {}) {
  if (status === 'all') {
    return db
      .prepare(
        `SELECT * FROM nutrition_regimen_items
         ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
      )
      .all();
  }
  return db
    .prepare(
      `SELECT * FROM nutrition_regimen_items
       WHERE status = ?
       ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
    )
    .all(status);
}

export function createRegimenItem(db, body = {}) {
  const data = normalizeItemBody(body);
  if (data.sort_order === 0 && body.sort_order == null) {
    const max = db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
         FROM nutrition_regimen_items WHERE status = 'active'`,
      )
      .get();
    data.sort_order = Number(max?.next || 0);
  }
  const id = str(body.id) || randomUUID();
  db.prepare(`
    INSERT INTO nutrition_regimen_items (
      id, kind, name, dose_label, timing, frequency, notes, sort_order, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.kind,
    data.name,
    data.dose_label,
    data.timing,
    data.frequency,
    data.notes,
    data.sort_order,
    data.status,
  );
  return getRegimenItem(db, id);
}

export function updateRegimenItem(db, id, body = {}) {
  const existing = getRegimenItem(db, id);
  if (!existing) return null;
  const data = normalizeItemBody(body, existing);
  db.prepare(`
    UPDATE nutrition_regimen_items SET
      kind = ?,
      name = ?,
      dose_label = ?,
      timing = ?,
      frequency = ?,
      notes = ?,
      sort_order = ?,
      status = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.kind,
    data.name,
    data.dose_label,
    data.timing,
    data.frequency,
    data.notes,
    data.sort_order,
    data.status,
    id,
  );
  return getRegimenItem(db, id);
}

export function deleteRegimenItem(db, id, { hard = false } = {}) {
  const existing = getRegimenItem(db, id);
  if (!existing) return false;
  if (hard) {
    db.prepare('DELETE FROM nutrition_regimen_logs WHERE item_id = ?').run(id);
    db.prepare('DELETE FROM nutrition_regimen_items WHERE id = ?').run(id);
    return true;
  }
  db.prepare(
    `UPDATE nutrition_regimen_items
     SET status = 'archived', updated_at = datetime('now')
     WHERE id = ?`,
  ).run(id);
  return true;
}

function resolveDate(date, today) {
  const day = date || today;
  if (!day || !isValidDateString(String(day).slice(0, 10))) {
    throw badRequest('data inválida (use YYYY-MM-DD)');
  }
  return String(day).slice(0, 10);
}

export function buildRegimenDay(db, date) {
  const day = resolveDate(date);
  const items = listRegimenItems(db, { status: 'active' });
  const logs = db
    .prepare('SELECT * FROM nutrition_regimen_logs WHERE date = ?')
    .all(day);
  const byItem = new Map(logs.map((log) => [log.item_id, log]));

  const mapped = items.map((item) => {
    const log = byItem.get(item.id);
    const taken = !!(log && Number(log.taken) === 1);
    return {
      ...item,
      taken,
      log_id: log?.id || null,
      taken_at: taken ? log.created_at : null,
      log_note: log?.note || '',
    };
  });

  const due = mapped.filter((item) => item.frequency !== 'as_needed');
  const takenDue = due.filter((item) => item.taken).length;

  return {
    date: day,
    items: mapped,
    taken_count: takenDue,
    due_count: due.length,
  };
}

export function setRegimenTaken(db, itemId, { date, taken = true, note, today } = {}) {
  const day = resolveDate(date, today);
  const item = getRegimenItem(db, itemId);
  if (!item || item.status !== 'active') throw notFound('item não encontrado');

  const shouldTake = taken === true || taken === 1 || taken === '1' || taken === 'true';
  const existing = db
    .prepare('SELECT * FROM nutrition_regimen_logs WHERE item_id = ? AND date = ?')
    .get(itemId, day);

  if (!shouldTake) {
    if (existing) {
      db.prepare('DELETE FROM nutrition_regimen_logs WHERE id = ?').run(existing.id);
    }
    return buildRegimenDay(db, day);
  }

  if (existing) {
    db.prepare(
      `UPDATE nutrition_regimen_logs
       SET taken = 1, note = ?
       WHERE id = ?`,
    ).run(note != null ? str(note) : existing.note || '', existing.id);
  } else {
    db.prepare(
      `INSERT INTO nutrition_regimen_logs (id, item_id, date, taken, note)
       VALUES (?, ?, ?, 1, ?)`,
    ).run(randomUUID(), itemId, day, note != null ? str(note) : '');
  }
  return buildRegimenDay(db, day);
}

export function toggleRegimenTaken(db, itemId, { date, today } = {}) {
  const day = resolveDate(date, today);
  const existing = db
    .prepare('SELECT * FROM nutrition_regimen_logs WHERE item_id = ? AND date = ?')
    .get(itemId, day);
  const currentlyTaken = !!(existing && Number(existing.taken) === 1);
  return setRegimenTaken(db, itemId, { date: day, taken: !currentlyTaken, today });
}
