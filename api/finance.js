/** Finanças — schema, seed da conversa 12/08 e queries da aba. */

import { randomUUID } from 'crypto';

export const ACCOUNT_KINDS = ['checking', 'prepaid', 'credit', 'cash', 'other'];
export const AMOUNT_KINDS = ['available', 'invested', 'used_limit', 'official_bill', 'projected_bill'];
export const SOURCES = ['pierre', 'joao', 'agent', 'seed'];
export const DEBT_KINDS = ['card', 'loan', 'installment', 'family', 'other'];
export const DEBT_STATUSES = ['open', 'min_paid', 'clean', 'waiting', 'blocked'];
export const APR_LABELS = ['high', 'medium', 'low', 'none'];
export const SUB_LANES = ['work', 'personal'];
export const SUB_CADENCES = ['monthly', 'yearly', 'installment', 'service'];
export const SUB_STATUSES = ['active', 'keep', 'cancel', 'cancelled', 'installment'];
export const INST_STATUSES = ['open', 'done'];
export const TX_DIRECTIONS = ['inflow', 'outflow', 'internal'];
export const GOAL_STATUSES = ['active', 'done', 'paused'];
export const FINANCE_CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Mercado',
  'Transporte',
  'Saúde',
  'Educação',
  'Fitness',
  'Assinaturas',
  'Impostos',
  'Dívidas',
  'Lazer',
  'Trabalho',
  'Família',
  'Reserva',
  'Transferência',
  'Receita',
  'Outros',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const INVEST_PATTERN = /invest|auto-?invest|cdb|aplic[aäã]?[çc]|aplic[aä]c|investimento/i;

export function detectAmountKind(balanceOrAccount) {
  if (!balanceOrAccount || typeof balanceOrAccount !== 'object') {
    return 'available';
  }
  const fields = [
    balanceOrAccount.type,
    balanceOrAccount.name,
    balanceOrAccount.product,
    balanceOrAccount.subtype,
    balanceOrAccount.kind,
    balanceOrAccount.amount_kind,
  ];
  for (const f of fields) {
    if (f && typeof f === 'string' && INVEST_PATTERN.test(f)) {
      return 'invested';
    }
  }
  if (
    balanceOrAccount.isOfficialBillAmount ||
    balanceOrAccount.valueIsExact ||
    balanceOrAccount.is_official ||
    balanceOrAccount.official ||
    balanceOrAccount.amount_kind === 'official_bill'
  ) {
    return 'official_bill';
  }
  if (
    balanceOrAccount.isOfficialBillAmount === false ||
    balanceOrAccount.projected_bill !== undefined ||
    balanceOrAccount.calculated_bill_amount !== undefined ||
    balanceOrAccount.amount_kind === 'projected_bill'
  ) {
    return 'projected_bill';
  }
  if (balanceOrAccount.amount_kind === 'used_limit') {
    return 'used_limit';
  }
  return 'available';
}

export function isValidDateString(date) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function todayFortaleza(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(date);
}

export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatBrl(value) {
  return money(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function daysUntil(ymd, today) {
  if (!isValidDateString(ymd) || !isValidDateString(today)) return null;
  const a = Date.parse(`${ymd}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  return Math.round((a - b) / 86400000);
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

export function initFinanceSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      reserved_car REAL DEFAULT 0,
      reserved_live REAL DEFAULT 0,
      snapshot_label TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT DEFAULT 'checking',
      institution TEXT DEFAULT '',
      mask TEXT DEFAULT '',
      pierre_account_id TEXT,
      is_operational INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_balances (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      as_of TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_kind TEXT DEFAULT 'available',
      source TEXT DEFAULT 'joao',
      locked INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_debts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      account_id TEXT,
      kind TEXT DEFAULT 'card',
      balance REAL DEFAULT 0,
      min_payment REAL,
      apr_label TEXT DEFAULT 'none',
      due_day INTEGER,
      due_date TEXT,
      status TEXT DEFAULT 'open',
      queue INTEGER DEFAULT 99,
      source TEXT DEFAULT 'joao',
      locked INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      account_id TEXT,
      amount REAL NOT NULL,
      paid_on TEXT NOT NULL,
      method TEXT DEFAULT 'pix',
      confirmed INTEGER DEFAULT 1,
      note TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lane TEXT DEFAULT 'personal',
      amount REAL DEFAULT 0,
      cadence TEXT DEFAULT 'monthly',
      charge_day INTEGER,
      account_id TEXT,
      status TEXT DEFAULT 'active',
      next_charge TEXT,
      vendor_hint TEXT DEFAULT '',
      source TEXT DEFAULT 'joao',
      locked INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_transactions (
      id TEXT PRIMARY KEY,
      pierre_tx_id TEXT,
      account_id TEXT,
      posted_on TEXT NOT NULL,
      amount REAL NOT NULL,
      direction TEXT DEFAULT 'outflow',
      raw_description TEXT DEFAULT '',
      merchant TEXT DEFAULT '',
      category TEXT DEFAULT 'Outros',
      subscription_id TEXT,
      debt_id TEXT,
      source TEXT DEFAULT 'joao',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      target_amount REAL DEFAULT 0,
      current_amount REAL DEFAULT 0,
      due_date TEXT,
      debt_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_installments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      account_id TEXT,
      monthly REAL DEFAULT 0,
      remaining REAL DEFAULT 0,
      paid_n INTEGER DEFAULT 0,
      total_n INTEGER DEFAULT 0,
      last_due TEXT,
      status TEXT DEFAULT 'open',
      source TEXT DEFAULT 'pierre',
      locked INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_sync_log (
      id TEXT PRIMARY KEY,
      started_at TEXT,
      finished_at TEXT,
      ok INTEGER DEFAULT 0,
      accounts_n INTEGER DEFAULT 0,
      tx_n INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      actor TEXT DEFAULT 'system'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_tx_pierre
      ON finance_transactions(pierre_tx_id)
      WHERE pierre_tx_id IS NOT NULL AND pierre_tx_id != '';
  `);
}

function insertAccount(db, row) {
  db.prepare(`
    INSERT OR IGNORE INTO finance_accounts
      (id, name, kind, institution, mask, is_operational, status, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    row.id,
    row.name,
    row.kind,
    row.institution,
    row.mask || '',
    row.is_operational ? 1 : 0,
    row.sort_order,
    row.created_at,
    row.updated_at,
  );
}

function insertDebt(db, row) {
  db.prepare(`
    INSERT OR IGNORE INTO finance_debts
      (id, title, account_id, kind, balance, min_payment, apr_label, due_day, due_date,
       status, queue, source, locked, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 0, ?, ?, ?)
  `).run(
    row.id,
    row.title,
    row.account_id,
    row.kind,
    row.balance,
    row.min_payment,
    row.apr_label,
    row.due_day ?? null,
    row.due_date ?? null,
    row.status,
    row.queue,
    row.note || '',
    row.created_at,
    row.updated_at,
  );
}

function insertSub(db, row) {
  db.prepare(`
    INSERT OR IGNORE INTO finance_subscriptions
      (id, name, lane, amount, cadence, charge_day, account_id, status, next_charge,
       vendor_hint, source, locked, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 0, ?, ?, ?)
  `).run(
    row.id,
    row.name,
    row.lane,
    row.amount,
    row.cadence,
    row.charge_day ?? null,
    row.account_id,
    row.status,
    row.next_charge ?? null,
    row.vendor_hint || '',
    row.note || '',
    row.created_at,
    row.updated_at,
  );
}

/** Semente da conversa 2026-08-12. Idempotente: só preenche se não houver conta. */
export function seedFinanceIfEmpty(db, { force = false } = {}) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM finance_accounts').get();
  if (existing.n > 0 && !force) return { seeded: false, reason: 'already_present' };

  const created = '2026-08-12T18:00:00.000Z';
  const asOf = '2026-08-12';

  const run = db.transaction(() => {
    if (force) {
      db.exec(`
        DELETE FROM finance_payments;
        DELETE FROM finance_transactions;
        DELETE FROM finance_balances;
        DELETE FROM finance_goals;
        DELETE FROM finance_subscriptions;
        DELETE FROM finance_debts;
        DELETE FROM finance_accounts;
        DELETE FROM finance_settings;
        DELETE FROM finance_sync_log;
      `);
    }

    db.prepare(`
      INSERT OR REPLACE INTO finance_settings (id, reserved_car, reserved_live, snapshot_label, updated_at)
      VALUES ('default', 1270, 600, 'foto 12/08', ?)
    `).run(created);

    const accounts = [
      { id: 'acc-inter', name: 'Inter', kind: 'checking', institution: 'inter', is_operational: 1, sort_order: 1 },
      { id: 'acc-c6', name: 'C6', kind: 'checking', institution: 'c6', is_operational: 0, sort_order: 2 },
      { id: 'acc-mp', name: 'Mercado Pago', kind: 'prepaid', institution: 'mp', is_operational: 0, sort_order: 3 },
      { id: 'acc-santander', name: 'Santander', kind: 'checking', institution: 'santander', is_operational: 0, sort_order: 4 },
      { id: 'acc-nubank', name: 'Nubank', kind: 'checking', institution: 'nubank', is_operational: 0, sort_order: 5 },
      { id: 'acc-picpay', name: 'PicPay', kind: 'prepaid', institution: 'picpay', is_operational: 0, sort_order: 6 },
    ];
    for (const acc of accounts) {
      insertAccount(db, { ...acc, mask: '', created_at: created, updated_at: created });
    }

    db.prepare(`
      INSERT INTO finance_balances (id, account_id, as_of, amount, amount_kind, source, locked, note, created_at)
      VALUES (?, 'acc-inter', ?, 1103.62, 'available', 'seed', 0, 'saldo depois de Santander + PicPay', ?)
    `).run(randomUUID(), asOf, created);

    insertDebt(db, {
      id: 'debt-carro',
      title: 'Carro',
      account_id: null,
      kind: 'installment',
      balance: 1270,
      min_payment: 1270,
      apr_label: 'none',
      due_day: 23,
      due_date: '2026-08-23',
      status: 'open',
      queue: 0,
      note: 'Vence dia 23. Sem o tio (250) o Inter não fecha.',
      created_at: created,
      updated_at: created,
    });
    insertDebt(db, {
      id: 'debt-mp',
      title: 'Mercado Pago',
      account_id: 'acc-mp',
      kind: 'card',
      balance: 3782,
      min_payment: null,
      apr_label: 'high',
      due_day: 15,
      due_date: null,
      status: 'blocked',
      queue: 1,
      note: 'Monstro 1. Quitar no valor real. Sem parcelamento 15%.',
      created_at: created,
      updated_at: created,
    });
    insertDebt(db, {
      id: 'debt-nubank',
      title: 'Nubank',
      account_id: 'acc-nubank',
      kind: 'card',
      balance: 3227,
      min_payment: null,
      apr_label: 'high',
      due_day: null,
      due_date: null,
      status: 'blocked',
      queue: 2,
      note: 'Fora do Pierre. Monstro 2.',
      created_at: created,
      updated_at: created,
    });
    insertDebt(db, {
      id: 'debt-inter',
      title: 'Inter resto',
      account_id: 'acc-inter',
      kind: 'card',
      balance: 2162,
      min_payment: 0,
      apr_label: 'medium',
      due_day: 12,
      due_date: null,
      status: 'min_paid',
      queue: 3,
      note: 'Mínimo já pago nesta rodada.',
      created_at: created,
      updated_at: created,
    });
    insertDebt(db, {
      id: 'debt-c6',
      title: 'C6 resto',
      account_id: 'acc-c6',
      kind: 'card',
      balance: 1371,
      min_payment: 0,
      apr_label: 'medium',
      due_day: 15,
      due_date: null,
      status: 'min_paid',
      queue: 3,
      note: 'Mínimo já pago. Sem compra nova.',
      created_at: created,
      updated_at: created,
    });
    insertDebt(db, {
      id: 'debt-pai-consorcio',
      title: 'Pai consórcio',
      account_id: null,
      kind: 'family',
      balance: 1000,
      min_payment: 1000,
      apr_label: 'none',
      due_day: null,
      due_date: null,
      status: 'waiting',
      queue: 8,
      note: 'Recorrente R$ 1.000/mês. Pode esperar.',
      created_at: created,
      updated_at: created,
    });
    insertDebt(db, {
      id: 'debt-pai-celular',
      title: 'Pai celular',
      account_id: null,
      kind: 'family',
      balance: 3200,
      min_payment: 400,
      apr_label: 'none',
      due_day: null,
      due_date: null,
      status: 'waiting',
      queue: 9,
      note: '8×400 restantes, estimativa da conversa.',
      created_at: created,
      updated_at: created,
    });

    const subs = [
      { id: 'sub-chatgpt', name: 'ChatGPT', lane: 'work', amount: 100, charge_day: 1, account_id: 'acc-inter', status: 'keep' },
      { id: 'sub-waba', name: 'WhatsApp Business', lane: 'work', amount: 54.9, charge_day: 1, account_id: null, status: 'keep' },
      { id: 'sub-uazapi', name: 'Uazapi', lane: 'work', amount: 37, charge_day: 25, account_id: 'acc-inter', status: 'keep' },
      { id: 'sub-workspace', name: 'Google Workspace', lane: 'work', amount: 36, charge_day: 1, account_id: 'acc-inter', status: 'keep' },
      { id: 'sub-meli', name: 'Meli+', lane: 'personal', amount: 75, charge_day: 1, account_id: 'acc-c6', status: 'keep' },
      { id: 'sub-icloud', name: 'iCloud', lane: 'personal', amount: 66.9, charge_day: 1, account_id: null, status: 'keep' },
      { id: 'sub-tim', name: 'TIM', lane: 'personal', amount: 46, charge_day: 1, account_id: 'acc-c6', status: 'keep' },
    ];
    for (const sub of subs) {
      insertSub(db, {
        ...sub,
        cadence: 'monthly',
        next_charge: null,
        vendor_hint: '',
        note: '',
        created_at: created,
        updated_at: created,
      });
    }

    db.prepare(`
      INSERT OR IGNORE INTO finance_goals
        (id, title, target_amount, current_amount, due_date, debt_id, status, created_at, updated_at)
      VALUES
        ('goal-carro', 'Carro em dia', 1270, 0, '2026-08-23', 'debt-carro', 'active', ?, ?),
        ('goal-mp', 'Quitar Mercado Pago', 3782, 0, NULL, 'debt-mp', 'active', ?, ?),
        ('goal-oculos', 'Óculos → Mercado Pago', 3000, 0, NULL, 'debt-mp', 'active', ?, ?)
    `).run(created, created, created, created, created, created);

    db.prepare(`
      INSERT INTO finance_sync_log (id, started_at, finished_at, ok, accounts_n, tx_n, error, actor)
      VALUES (?, ?, ?, 1, 6, 0, 'foto da conversa 2026-08-12 — não é saldo vivo', 'seed')
    `).run(randomUUID(), created, created);
  });

  run();
  return { seeded: true };
}

export function getSettings(db) {
  const row = db.prepare('SELECT * FROM finance_settings WHERE id = ?').get('default');
  if (row) return row;
  db.prepare(`
    INSERT INTO finance_settings (id, reserved_car, reserved_live, snapshot_label, updated_at)
    VALUES ('default', 0, 0, '', ?)
  `).run(nowIso());
  return db.prepare('SELECT * FROM finance_settings WHERE id = ?').get('default');
}

export function updateSettings(db, body = {}) {
  const current = getSettings(db);
  const reservedCar = body.reserved_car !== undefined ? money(body.reserved_car) : current.reserved_car;
  const reservedLive = body.reserved_live !== undefined ? money(body.reserved_live) : current.reserved_live;
  const label = body.snapshot_label !== undefined ? String(body.snapshot_label) : current.snapshot_label;
  db.prepare(`
    UPDATE finance_settings
    SET reserved_car = ?, reserved_live = ?, snapshot_label = ?, updated_at = ?
    WHERE id = 'default'
  `).run(reservedCar, reservedLive, label, nowIso());
  return getSettings(db);
}

export function latestBalance(db, accountId, amountKind = 'available') {
  return db.prepare(`
    SELECT * FROM finance_balances
    WHERE account_id = ? AND amount_kind = ?
    ORDER BY as_of DESC, created_at DESC
    LIMIT 1
  `).get(accountId, amountKind);
}

export function listAccounts(db, { status = 'active' } = {}) {
  let q = 'SELECT * FROM finance_accounts WHERE 1=1';
  const params = [];
  if (status && status !== 'all') {
    q += ' AND status = ?';
    params.push(status);
  }
  q += ' ORDER BY sort_order ASC, name ASC';
  const rows = db.prepare(q).all(...params);
  return rows.map((acc) => {
    const available = latestBalance(db, acc.id, 'available');
    const invested = latestBalance(db, acc.id, 'invested');
    const official = latestBalance(db, acc.id, 'official_bill');
    const projected = latestBalance(db, acc.id, 'projected_bill');
    return {
      ...acc,
      is_operational: Number(acc.is_operational) === 1,
      available: available ? money(available.amount) : 0,
      available_as_of: available?.as_of || null,
      available_source: available?.source || null,
      invested: invested ? money(invested.amount) : 0,
      invested_as_of: invested?.as_of || null,
      invested_source: invested?.source || null,
      official_bill: official ? money(official.amount) : null,
      projected_bill: projected ? money(projected.amount) : null,
    };
  });
}

export function createAccount(db, body) {
  const name = String(body.name || '').trim();
  if (!name) {
    const err = new Error('name required');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  const now = nowIso();
  const sort = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM finance_accounts').get();
  db.prepare(`
    INSERT INTO finance_accounts
      (id, name, kind, institution, mask, pierre_account_id, is_operational, status, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    pick(body.kind, ACCOUNT_KINDS, 'checking'),
    String(body.institution || ''),
    String(body.mask || '').slice(-4),
    body.pierre_account_id || null,
    body.is_operational ? 1 : 0,
    body.status === 'archived' ? 'archived' : 'active',
    Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : (sort.m || 0) + 1,
    now,
    now,
  );
  if (body.amount !== undefined) {
    createBalance(db, {
      account_id: id,
      amount: body.amount,
      amount_kind: 'available',
      source: pick(body.source, SOURCES, 'joao'),
      as_of: body.as_of,
      locked: body.locked,
    });
  }
  return listAccounts(db, { status: 'all' }).find((a) => a.id === id);
}

export function updateAccount(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM finance_accounts WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE finance_accounts SET
      name = COALESCE(?, name),
      kind = ?,
      institution = COALESCE(?, institution),
      mask = COALESCE(?, mask),
      is_operational = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    body.name !== undefined ? String(body.name).trim() : null,
    body.kind !== undefined ? pick(body.kind, ACCOUNT_KINDS, existing.kind) : existing.kind,
    body.institution !== undefined ? String(body.institution) : null,
    body.mask !== undefined ? String(body.mask).slice(-4) : null,
    body.is_operational !== undefined ? (body.is_operational ? 1 : 0) : existing.is_operational,
    body.status !== undefined ? (body.status === 'archived' ? 'archived' : 'active') : existing.status,
    nowIso(),
    id,
  );
  return listAccounts(db, { status: 'all' }).find((a) => a.id === id);
}

export function listBalances(db, { account_id } = {}) {
  if (account_id) {
    return db.prepare(
      'SELECT * FROM finance_balances WHERE account_id = ? ORDER BY as_of DESC, created_at DESC',
    ).all(account_id);
  }
  return db.prepare('SELECT * FROM finance_balances ORDER BY as_of DESC, created_at DESC LIMIT 200').all();
}

export function createBalance(db, body) {
  const accountId = String(body.account_id || '');
  const account = db.prepare('SELECT id FROM finance_accounts WHERE id = ?').get(accountId);
  if (!account) {
    const err = new Error('account not found');
    err.status = 400;
    throw err;
  }
  const amount = money(body.amount);
  const asOf = isValidDateString(body.as_of) ? body.as_of : todayFortaleza();
  const id = body.id || randomUUID();
  db.prepare(`
    INSERT INTO finance_balances (id, account_id, as_of, amount, amount_kind, source, locked, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    accountId,
    asOf,
    amount,
    pick(body.amount_kind, AMOUNT_KINDS, 'available'),
    pick(body.source, SOURCES, 'joao'),
    body.locked ? 1 : 0,
    String(body.note || ''),
    nowIso(),
  );
  if (body.source === 'joao' || body.locked) {
    updateSettings(db, { snapshot_label: '' });
  }
  return db.prepare('SELECT * FROM finance_balances WHERE id = ?').get(id);
}

export function listDebts(db, { status } = {}) {
  let q = 'SELECT * FROM finance_debts WHERE 1=1';
  const params = [];
  if (status && status !== 'all') {
    q += ' AND status = ?';
    params.push(status);
  }
  q += ' ORDER BY queue ASC, balance DESC';
  return db.prepare(q).all(...params).map((d) => ({
    ...d,
    balance: money(d.balance),
    min_payment: d.min_payment == null ? null : money(d.min_payment),
    locked: Number(d.locked) === 1,
  }));
}

export function createDebt(db, body) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('title required');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  const now = nowIso();
  db.prepare(`
    INSERT INTO finance_debts
      (id, title, account_id, kind, balance, min_payment, apr_label, due_day, due_date,
       status, queue, source, locked, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    body.account_id || null,
    pick(body.kind, DEBT_KINDS, 'card'),
    money(body.balance),
    body.min_payment === undefined || body.min_payment === null ? null : money(body.min_payment),
    pick(body.apr_label, APR_LABELS, 'none'),
    Number.isFinite(Number(body.due_day)) ? Number(body.due_day) : null,
    isValidDateString(body.due_date) ? body.due_date : null,
    pick(body.status, DEBT_STATUSES, 'open'),
    Number.isFinite(Number(body.queue)) ? Number(body.queue) : 50,
    pick(body.source, SOURCES, 'joao'),
    body.locked ? 1 : 0,
    String(body.note || ''),
    now,
    now,
  );
  return listDebts(db, { status: 'all' }).find((d) => d.id === id);
}

export function updateDebt(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM finance_debts WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE finance_debts SET
      title = COALESCE(?, title),
      account_id = COALESCE(?, account_id),
      kind = ?,
      balance = ?,
      min_payment = ?,
      apr_label = ?,
      due_day = ?,
      due_date = ?,
      status = ?,
      queue = ?,
      source = ?,
      locked = ?,
      note = COALESCE(?, note),
      updated_at = ?
    WHERE id = ?
  `).run(
    body.title !== undefined ? String(body.title).trim() : null,
    body.account_id !== undefined ? body.account_id : null,
    body.kind !== undefined ? pick(body.kind, DEBT_KINDS, existing.kind) : existing.kind,
    body.balance !== undefined ? money(body.balance) : existing.balance,
    body.min_payment !== undefined
      ? (body.min_payment === null ? null : money(body.min_payment))
      : existing.min_payment,
    body.apr_label !== undefined ? pick(body.apr_label, APR_LABELS, existing.apr_label) : existing.apr_label,
    body.due_day !== undefined
      ? (Number.isFinite(Number(body.due_day)) ? Number(body.due_day) : null)
      : existing.due_day,
    body.due_date !== undefined
      ? (isValidDateString(body.due_date) ? body.due_date : null)
      : existing.due_date,
    body.status !== undefined ? pick(body.status, DEBT_STATUSES, existing.status) : existing.status,
    body.queue !== undefined ? Number(body.queue) : existing.queue,
    body.source !== undefined ? pick(body.source, SOURCES, existing.source) : existing.source,
    body.locked !== undefined ? (body.locked ? 1 : 0) : existing.locked,
    body.note !== undefined ? String(body.note) : null,
    nowIso(),
    id,
  );
  return listDebts(db, { status: 'all' }).find((d) => d.id === id);
}

export function createTransaction(db, body) {
  const postedOn = isValidDateString(body.posted_on) ? body.posted_on : todayFortaleza();
  const amount = money(body.amount);
  if (!Number.isFinite(Number(body.amount))) {
    const err = new Error('amount required');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  const direction = pick(body.direction, TX_DIRECTIONS, amount < 0 ? 'outflow' : 'inflow');
  const category = FINANCE_CATEGORIES.includes(body.category) ? body.category : 'Outros';
  db.prepare(`
    INSERT INTO finance_transactions
      (id, pierre_tx_id, account_id, posted_on, amount, direction, raw_description,
       merchant, category, subscription_id, debt_id, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.pierre_tx_id || null,
    body.account_id || null,
    postedOn,
    amount,
    direction,
    String(body.raw_description || ''),
    String(body.merchant || ''),
    category,
    body.subscription_id || null,
    body.debt_id || null,
    pick(body.source, SOURCES, 'joao'),
    nowIso(),
  );
  return db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(id);
}

export function updateTransaction(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE finance_transactions SET
      merchant = COALESCE(?, merchant),
      category = ?,
      subscription_id = COALESCE(?, subscription_id),
      debt_id = COALESCE(?, debt_id),
      raw_description = COALESCE(?, raw_description)
    WHERE id = ?
  `).run(
    body.merchant !== undefined ? String(body.merchant) : null,
    body.category !== undefined && FINANCE_CATEGORIES.includes(body.category)
      ? body.category
      : existing.category,
    body.subscription_id !== undefined ? body.subscription_id : null,
    body.debt_id !== undefined ? body.debt_id : null,
    body.raw_description !== undefined ? String(body.raw_description) : null,
    id,
  );
  return db.prepare('SELECT * FROM finance_transactions WHERE id = ?').get(id);
}

export function listTransactions(db, { from, to, account_id, category, q, limit } = {}) {
  const today = todayFortaleza();
  const start = isValidDateString(from) ? from : addDays(today, -30);
  const end = isValidDateString(to) ? to : today;
  let sql = 'SELECT * FROM finance_transactions WHERE posted_on >= ? AND posted_on <= ?';
  const params = [start, end];
  if (account_id) {
    sql += ' AND account_id = ?';
    params.push(account_id);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (merchant LIKE ? OR raw_description LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }
  sql += ' ORDER BY posted_on DESC, created_at DESC LIMIT ?';
  params.push(Math.min(Number(limit) || 200, 500));
  return db.prepare(sql).all(...params);
}

function addDays(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function payDebt(db, id, body = {}) {
  const debt = db.prepare('SELECT * FROM finance_debts WHERE id = ?').get(id);
  if (!debt) return null;
  const amount = money(body.amount ?? debt.balance);
  if (amount <= 0) {
    const err = new Error('amount must be positive');
    err.status = 400;
    throw err;
  }
  const paidOn = isValidDateString(body.paid_on) ? body.paid_on : todayFortaleza();
  const nextBalance = money(Math.max(0, Number(debt.balance) - amount));
  const nextStatus = nextBalance <= 0.009 ? 'clean' : debt.status;

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE finance_debts SET balance = ?, status = ?, updated_at = ? WHERE id = ?
    `).run(nextBalance, nextStatus, nowIso(), id);

    const paymentId = randomUUID();
    db.prepare(`
      INSERT INTO finance_payments (id, debt_id, account_id, amount, paid_on, method, confirmed, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      paymentId,
      id,
      body.account_id || null,
      amount,
      paidOn,
      String(body.method || 'pix'),
      String(body.note || ''),
      nowIso(),
    );

    createTransaction(db, {
      account_id: body.account_id || null,
      posted_on: paidOn,
      amount: -Math.abs(amount),
      direction: 'outflow',
      merchant: debt.title,
      category: 'Dívidas',
      debt_id: id,
      source: 'joao',
      raw_description: `Pagamento ${debt.title}`,
    });

    db.prepare(`
      UPDATE finance_goals
      SET current_amount = MIN(target_amount, current_amount + ?),
          status = CASE WHEN current_amount + ? >= target_amount THEN 'done' ELSE status END,
          updated_at = ?
      WHERE debt_id = ? AND status = 'active'
    `).run(amount, amount, nowIso(), id);

    if (id === 'debt-carro' && nextStatus === 'clean') {
      updateSettings(db, { reserved_car: 0, snapshot_label: '' });
    } else {
      updateSettings(db, { snapshot_label: '' });
    }

    return paymentId;
  });

  const paymentId = run();
  return {
    debt: listDebts(db, { status: 'all' }).find((d) => d.id === id),
    payment: db.prepare('SELECT * FROM finance_payments WHERE id = ?').get(paymentId),
  };
}

export function listSubscriptions(db, { lane, status } = {}) {
  let q = 'SELECT * FROM finance_subscriptions WHERE 1=1';
  const params = [];
  if (lane && SUB_LANES.includes(lane)) {
    q += ' AND lane = ?';
    params.push(lane);
  }
  if (status && status !== 'all') {
    q += ' AND status = ?';
    params.push(status);
  }
  q += ' ORDER BY lane ASC, amount DESC';
  return db.prepare(q).all(...params).map((s) => ({
    ...s,
    amount: money(s.amount),
    locked: Number(s.locked) === 1,
  }));
}

export function createSubscription(db, body) {
  const name = String(body.name || '').trim();
  if (!name) {
    const err = new Error('name required');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  const now = nowIso();
  db.prepare(`
    INSERT INTO finance_subscriptions
      (id, name, lane, amount, cadence, charge_day, account_id, status, next_charge,
       vendor_hint, source, locked, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    pick(body.lane, SUB_LANES, 'personal'),
    money(body.amount),
    pick(body.cadence, SUB_CADENCES, 'monthly'),
    Number.isFinite(Number(body.charge_day)) ? Number(body.charge_day) : null,
    body.account_id || null,
    pick(body.status, SUB_STATUSES, 'active'),
    isValidDateString(body.next_charge) ? body.next_charge : null,
    String(body.vendor_hint || ''),
    pick(body.source, SOURCES, 'joao'),
    body.locked ? 1 : 0,
    String(body.note || ''),
    now,
    now,
  );
  return listSubscriptions(db).find((s) => s.id === id);
}

export function updateSubscription(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM finance_subscriptions WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE finance_subscriptions SET
      name = COALESCE(?, name),
      lane = ?,
      amount = ?,
      cadence = ?,
      charge_day = ?,
      account_id = COALESCE(?, account_id),
      status = ?,
      next_charge = ?,
      vendor_hint = COALESCE(?, vendor_hint),
      note = COALESCE(?, note),
      locked = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    body.name !== undefined ? String(body.name).trim() : null,
    body.lane !== undefined ? pick(body.lane, SUB_LANES, existing.lane) : existing.lane,
    body.amount !== undefined ? money(body.amount) : existing.amount,
    body.cadence !== undefined ? pick(body.cadence, SUB_CADENCES, existing.cadence) : existing.cadence,
    body.charge_day !== undefined
      ? (Number.isFinite(Number(body.charge_day)) ? Number(body.charge_day) : null)
      : existing.charge_day,
    body.account_id !== undefined ? body.account_id : null,
    body.status !== undefined ? pick(body.status, SUB_STATUSES, existing.status) : existing.status,
    body.next_charge !== undefined
      ? (isValidDateString(body.next_charge) ? body.next_charge : null)
      : existing.next_charge,
    body.vendor_hint !== undefined ? String(body.vendor_hint) : null,
    body.note !== undefined ? String(body.note) : null,
    body.locked !== undefined ? (body.locked ? 1 : 0) : existing.locked,
    nowIso(),
    id,
  );
  return listSubscriptions(db).find((s) => s.id === id);
}

export function deleteSubscription(db, id) {
  const existing = listSubscriptions(db).find((s) => s.id === id);
  if (!existing) return null;
  db.prepare('UPDATE finance_transactions SET subscription_id = NULL WHERE subscription_id = ?').run(id);
  db.prepare('DELETE FROM finance_subscriptions WHERE id = ?').run(id);
  return existing;
}

export function listInstallments(db, { status } = {}) {
  let q = 'SELECT * FROM finance_installments WHERE 1=1';
  const params = [];
  if (status && status !== 'all') {
    q += ' AND status = ?';
    params.push(status);
  }
  q += ' ORDER BY remaining DESC, monthly DESC';
  return db.prepare(q).all(...params).map((row) => ({
    ...row,
    monthly: money(row.monthly),
    remaining: money(row.remaining),
    locked: Number(row.locked) === 1,
  }));
}

export function createInstallment(db, body) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('title required');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  const now = nowIso();
  db.prepare(`
    INSERT INTO finance_installments
      (id, title, account_id, monthly, remaining, paid_n, total_n, last_due,
       status, source, locked, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    body.account_id || null,
    money(body.monthly),
    money(body.remaining),
    Number.isFinite(Number(body.paid_n)) ? Number(body.paid_n) : 0,
    Number.isFinite(Number(body.total_n)) ? Number(body.total_n) : 0,
    isValidDateString(body.last_due) ? body.last_due : null,
    pick(body.status, INST_STATUSES, 'open'),
    pick(body.source, SOURCES, 'pierre'),
    body.locked ? 1 : 0,
    String(body.note || ''),
    now,
    now,
  );
  return listInstallments(db).find((row) => row.id === id);
}

export function updateInstallment(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM finance_installments WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE finance_installments SET
      title = COALESCE(?, title),
      account_id = COALESCE(?, account_id),
      monthly = ?,
      remaining = ?,
      paid_n = ?,
      total_n = ?,
      last_due = ?,
      status = ?,
      source = ?,
      locked = ?,
      note = COALESCE(?, note),
      updated_at = ?
    WHERE id = ?
  `).run(
    body.title !== undefined ? String(body.title).trim() : null,
    body.account_id !== undefined ? body.account_id : null,
    body.monthly !== undefined ? money(body.monthly) : existing.monthly,
    body.remaining !== undefined ? money(body.remaining) : existing.remaining,
    body.paid_n !== undefined ? Number(body.paid_n) : existing.paid_n,
    body.total_n !== undefined ? Number(body.total_n) : existing.total_n,
    body.last_due !== undefined
      ? (isValidDateString(body.last_due) ? body.last_due : null)
      : existing.last_due,
    body.status !== undefined ? pick(body.status, INST_STATUSES, existing.status) : existing.status,
    body.source !== undefined ? pick(body.source, SOURCES, existing.source) : existing.source,
    body.locked !== undefined ? (body.locked ? 1 : 0) : existing.locked,
    body.note !== undefined ? String(body.note) : null,
    nowIso(),
    id,
  );
  return listInstallments(db).find((row) => row.id === id);
}

export function deleteInstallment(db, id) {
  const existing = listInstallments(db).find((row) => row.id === id);
  if (!existing) return null;
  db.prepare('DELETE FROM finance_installments WHERE id = ?').run(id);
  return existing;
}

export function listGoals(db) {
  return db.prepare('SELECT * FROM finance_goals ORDER BY due_date IS NULL, due_date ASC, title ASC').all()
    .map((g) => ({
      ...g,
      target_amount: money(g.target_amount),
      current_amount: money(g.current_amount),
      progress: g.target_amount > 0
        ? Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100))
        : 0,
    }));
}

export function createGoal(db, body) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('title required');
    err.status = 400;
    throw err;
  }
  const id = body.id || randomUUID();
  const now = nowIso();
  db.prepare(`
    INSERT INTO finance_goals
      (id, title, target_amount, current_amount, due_date, debt_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    money(body.target_amount),
    money(body.current_amount || 0),
    isValidDateString(body.due_date) ? body.due_date : null,
    body.debt_id || null,
    pick(body.status, GOAL_STATUSES, 'active'),
    now,
    now,
  );
  return listGoals(db).find((g) => g.id === id);
}

export function updateGoal(db, id, body = {}) {
  const existing = db.prepare('SELECT * FROM finance_goals WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE finance_goals SET
      title = COALESCE(?, title),
      target_amount = ?,
      current_amount = ?,
      due_date = ?,
      debt_id = COALESCE(?, debt_id),
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    body.title !== undefined ? String(body.title).trim() : null,
    body.target_amount !== undefined ? money(body.target_amount) : existing.target_amount,
    body.current_amount !== undefined ? money(body.current_amount) : existing.current_amount,
    body.due_date !== undefined
      ? (isValidDateString(body.due_date) ? body.due_date : null)
      : existing.due_date,
    body.debt_id !== undefined ? body.debt_id : null,
    body.status !== undefined ? pick(body.status, GOAL_STATUSES, existing.status) : existing.status,
    nowIso(),
    id,
  );
  return listGoals(db).find((g) => g.id === id);
}

export function getInsights(db, { from, to } = {}) {
  const today = todayFortaleza();
  const start = isValidDateString(from) ? from : addDays(today, -30);
  const end = isValidDateString(to) ? to : today;
  const rows = db.prepare(`
    SELECT * FROM finance_transactions
    WHERE posted_on >= ? AND posted_on <= ?
  `).all(start, end);

  let outflow = 0;
  let inflow = 0;
  const byCategory = new Map();
  const byDay = new Map();
  let cardOut = 0;
  let cashOut = 0;

  const accountKind = new Map(
    db.prepare('SELECT id, kind FROM finance_accounts').all().map((a) => [a.id, a.kind]),
  );

  for (const tx of rows) {
    const amt = money(tx.amount);
    if (tx.direction === 'internal') continue;
    if (tx.direction === 'inflow' || amt > 0) {
      inflow += Math.abs(amt);
    } else {
      const spent = Math.abs(amt);
      outflow += spent;
      const cat = tx.category || 'Outros';
      byCategory.set(cat, money((byCategory.get(cat) || 0) + spent));
      byDay.set(tx.posted_on, money((byDay.get(tx.posted_on) || 0) + spent));
      const kind = accountKind.get(tx.account_id);
      if (kind === 'credit') cardOut += spent;
      else cashOut += spent;
    }
  }

  const categories = [...byCategory.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const days = [...byDay.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    from: start,
    to: end,
    outflow: money(outflow),
    inflow: money(inflow),
    card_outflow: money(cardOut),
    cash_outflow: money(cashOut),
    categories,
    days,
    tx_count: rows.length,
  };
}

function buildNextStep({ caixa, debts, today }) {
  const open = debts.filter((d) => d.status !== 'clean');
  const dueSoon = open
    .filter((d) => d.due_date)
    .map((d) => ({ ...d, days: daysUntil(d.due_date, today) }))
    .filter((d) => d.days !== null && d.days <= 14 && d.days >= -2)
    .sort((a, b) => a.days - b.days);

  if (dueSoon[0] && caixa < dueSoon[0].balance) {
    const gap = money(dueSoon[0].balance - caixa);
    const dueLabel = dueSoon[0].due_date.slice(8);
    return {
      kind: 'due',
      debt_id: dueSoon[0].id,
      title: dueSoon[0].title,
      amount: dueSoon[0].balance,
      gap,
      label: `Falta ${formatBrl(gap)} pro ${dueSoon[0].title.toLowerCase()} no dia ${dueLabel}. Não pague Mercado Pago agora.`,
    };
  }

  const monster = open
    .filter((d) => ['open', 'blocked'].includes(d.status))
    .sort((a, b) => a.queue - b.queue)[0];
  if (monster) {
    return {
      kind: 'avalanche',
      debt_id: monster.id,
      title: monster.title,
      amount: monster.balance,
      gap: null,
      label: `Próximo tiro: ${monster.title} (${formatBrl(monster.balance)}).`,
    };
  }

  return {
    kind: 'clear',
    debt_id: null,
    title: null,
    amount: 0,
    gap: null,
    label: 'Nada urgente na fila.',
  };
}

export function getOverview(db, { today } = {}) {
  const day = isValidDateString(today) ? today : todayFortaleza();
  const settings = getSettings(db);
  const accounts = listAccounts(db);
  const debts = listDebts(db);
  const subscriptions = listSubscriptions(db);
  const lastSync = db.prepare(
    'SELECT * FROM finance_sync_log ORDER BY started_at DESC LIMIT 1',
  ).get();

  const caixa = money(
    accounts
      .filter((a) => a.is_operational && a.status === 'active')
      .reduce((sum, a) => sum + Number(a.available || 0), 0),
  );
  const invested = money(
    accounts
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + Number(a.invested || 0), 0),
  );
  const reservedCar = money(settings.reserved_car);
  const reservedLive = money(settings.reserved_live);
  const reserved = money(reservedCar + reservedLive);
  const livre = money(caixa - reserved);

  const openDebts = debts.filter((d) => d.status !== 'clean');
  const cardOpen = openDebts.filter((d) => d.kind === 'card');
  const debtsTotal = money(openDebts.reduce((s, d) => s + d.balance, 0));
  const cardsTotal = money(cardOpen.reduce((s, d) => s + d.balance, 0));

  const liveSubs = subscriptions.filter((s) => ['active', 'keep'].includes(s.status));
  const workMonth = money(liveSubs.filter((s) => s.lane === 'work').reduce((s, x) => s + x.amount, 0));
  const personalMonth = money(liveSubs.filter((s) => s.lane === 'personal').reduce((s, x) => s + x.amount, 0));

  const openInst = listInstallments(db, { status: 'open' });
  const installmentsRemaining = money(openInst.reduce((s, x) => s + Number(x.remaining || 0), 0));
  const installmentsMonth = money(openInst.reduce((s, x) => s + Number(x.monthly || 0), 0));
  const lastInstDue = openInst
    .map((x) => x.last_due)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  const nextDue = openDebts
    .filter((d) => d.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] || null;

  const nextStep = buildNextStep({ caixa, debts: openDebts, today: day });

  return {
    today: day,
    snapshot_label: settings.snapshot_label || '',
    caixa,
    invested,
    patrimonio_liquido_curto: money(caixa + invested),
    reserved_car: reservedCar,
    reserved_live: reservedLive,
    reserved,
    livre,
    debts_total: debtsTotal,
    cards_total: cardsTotal,
    subscriptions_month: money(workMonth + personalMonth),
    work_month: workMonth,
    personal_month: personalMonth,
    installments_remaining: installmentsRemaining,
    installments_month: installmentsMonth,
    installments_n: openInst.length,
    installments_last: lastInstDue,
    next_due: nextDue
      ? { id: nextDue.id, title: nextDue.title, amount: nextDue.balance, due_date: nextDue.due_date }
      : null,
    next_step: nextStep,
    accounts,
    debts,
    last_sync: lastSync || null,
    settings,
  };
}

export function lastSync(db) {
  return db.prepare('SELECT * FROM finance_sync_log ORDER BY started_at DESC LIMIT 1').get() || null;
}

export function recordSyncAttempt(db, { ok, error, actor, accountsN = 0, txN = 0 }) {
  const id = randomUUID();
  const ts = nowIso();
  db.prepare(`
    INSERT INTO finance_sync_log (id, started_at, finished_at, ok, accounts_n, tx_n, error, actor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, ts, ts, ok ? 1 : 0, accountsN, txN, String(error || ''), actor || 'system');
  return db.prepare('SELECT * FROM finance_sync_log WHERE id = ?').get(id);
}
