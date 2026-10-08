/** Lista de compras / desejos — curto, médio e longo prazo */

import { randomUUID } from 'crypto';

export const PURCHASE_HORIZONS = ['short', 'medium', 'long'];
export const PURCHASE_STATUSES = ['want', 'bought', 'paused'];

export function initPurchaseSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT DEFAULT '',
      horizon TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'want',
      price_estimate TEXT DEFAULT '',
      url TEXT DEFAULT '',
      sort_order INTEGER,
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );
  `);
}

function nextSort(db) {
  const row = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM purchase_items').get();
  return (row?.m || 0) + 1;
}

export function listPurchases(db, { horizon, status } = {}) {
  let q = 'SELECT * FROM purchase_items WHERE 1=1';
  const params = [];
  if (status === 'all') {
    // sem filtro de status
  } else if (status) {
    q += ' AND status = ?';
    params.push(status);
  } else {
    q += " AND status != 'paused'";
  }
  if (horizon) {
    q += ' AND horizon = ?';
    params.push(horizon);
  }
  q += ' ORDER BY sort_order ASC, created_date DESC';
  return db.prepare(q).all(...params);
}

export function createPurchase(db, body) {
  const id = body.id || randomUUID();
  const sort = nextSort(db);
  const horizon = PURCHASE_HORIZONS.includes(body.horizon) ? body.horizon : 'medium';
  const status = PURCHASE_STATUSES.includes(body.status) ? body.status : 'want';
  db.prepare(`
    INSERT INTO purchase_items (id, title, notes, horizon, status, price_estimate, url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(body.title || '').trim(),
    String(body.notes || ''),
    horizon,
    status,
    String(body.price_estimate || ''),
    String(body.url || ''),
    sort,
  );
  return db.prepare('SELECT * FROM purchase_items WHERE id = ?').get(id);
}

export function updatePurchase(db, id, body) {
  const existing = db.prepare('SELECT * FROM purchase_items WHERE id = ?').get(id);
  if (!existing) return null;
  const horizon = body.horizon !== undefined && PURCHASE_HORIZONS.includes(body.horizon)
    ? body.horizon
    : existing.horizon;
  const status = body.status !== undefined && PURCHASE_STATUSES.includes(body.status)
    ? body.status
    : existing.status;
  db.prepare(`
    UPDATE purchase_items SET
      title = COALESCE(?, title),
      notes = COALESCE(?, notes),
      horizon = ?,
      status = ?,
      price_estimate = COALESCE(?, price_estimate),
      url = COALESCE(?, url),
      updated_date = datetime('now')
    WHERE id = ?
  `).run(
    body.title !== undefined ? String(body.title).trim() : null,
    body.notes !== undefined ? String(body.notes) : null,
    horizon,
    status,
    body.price_estimate !== undefined ? String(body.price_estimate) : null,
    body.url !== undefined ? String(body.url) : null,
    id,
  );
  return db.prepare('SELECT * FROM purchase_items WHERE id = ?').get(id);
}

export function deletePurchase(db, id) {
  const r = db.prepare('DELETE FROM purchase_items WHERE id = ?').run(id);
  return r.changes > 0;
}