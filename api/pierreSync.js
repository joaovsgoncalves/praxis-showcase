/**
 * Pierre REST synchronization service.
 * Pulls accounts, balances, bills, statements, and installments via Pierre REST API.
 * Never logs or prints secrets. Respects user locks and manual overrides.
 */

import { randomUUID } from 'crypto';
import {
  FINANCE_CATEGORIES,
  createAccount,
  createBalance,
  createInstallment,
  createTransaction,
  detectAmountKind,
  latestBalance,
  listAccounts,
  listDebts,
  listInstallments,
  money,
  recordSyncAttempt,
  todayFortaleza,
  updateAccount,
  updateDebt,
  updateInstallment,
  updateSettings,
} from './finance.js';

export { detectAmountKind } from './finance.js';

function sanitizeError(msg) {
  if (typeof msg !== 'string') return 'unknown_error';
  return msg
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
    .slice(0, 500);
}

function asList(raw, keys = []) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(raw[k])) return raw[k];
  }
  if (Array.isArray(raw.data)) return raw.data;
  if (raw.data && typeof raw.data === 'object') {
    for (const k of keys) {
      if (Array.isArray(raw.data[k])) return raw.data[k];
    }
  }
  return [];
}

function normalizeInstitution(raw) {
  const str = String(raw || '').toLowerCase().trim();
  if (str.includes('inter')) return 'inter';
  if (str.includes('c6')) return 'c6';
  if (str.includes('mercado') || str.includes('mp')) return 'mp';
  if (str.includes('santander')) return 'santander';
  if (str.includes('nubank') || str.includes('nu pagamentos') || str === 'nu') return 'nubank';
  if (str.includes('picpay')) return 'picpay';
  return str || 'other';
}

function normalizeKind(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('CREDIT') || t === 'CARD') return 'credit';
  if (t.includes('PREPAID')) return 'prepaid';
  if (t.includes('BANK') || t.includes('CHECKING') || t.includes('CONTA_CORRENTE') || t.includes('SAVINGS')) {
    return 'checking';
  }
  return 'checking';
}

function normalizeCategory(cat) {
  if (!cat || typeof cat !== 'string') return 'Outros';
  const found = FINANCE_CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase());
  return found || 'Outros';
}

function addDays(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

/**
 * Synchronizes financial data from Pierre REST API.
 * @param {import('better-sqlite3').Database} db
 * @param {{ actor?: string, getLocalDateString?: () => string }} [options]
 */
export async function syncPierre(db, { actor = 'system', getLocalDateString } = {}) {
  const apiKey = process.env.PIERRE_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const log = recordSyncAttempt(db, {
      ok: false,
      error: 'pierre_not_configured',
      actor,
    });
    return { configured: false, ok: false, error: 'pierre_not_configured', last_sync: log };
  }

  const baseUrl = process.env.PIERRE_BASE_URL || 'https://www.pierre.finance/tools/api';
  const today = typeof getLocalDateString === 'function' ? getLocalDateString() : todayFortaleza();
  const startDate = addDays(today, -30);
  const endDate = today;
  const timeoutMs = Number(process.env.PIERRE_TIMEOUT_MS) || 8000;

  async function fetchJson(endpoint) {
    const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`Pierre API HTTP ${res.status}`);
    }
    return res.json();
  }

  try {
    const [accountsData, balanceData, billData, statementData, installmentsData] = await Promise.all([
      fetchJson('get-accounts').catch((err) => ({ _error: err.message, accounts: [] })),
      fetchJson('get-balance').catch((err) => ({ _error: err.message, balances: [] })),
      fetchJson('get-bill').catch(() => ({ bills: [] })),
      fetchJson(`get-bank-statement?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ transactions: [] })),
      fetchJson('get-installments').catch(() => ({ installments: [] })),
    ]);

    if (accountsData._error && balanceData._error) {
      throw new Error(accountsData._error || balanceData._error || 'Failed to connect to Pierre');
    }

    let accountsCount = 0;
    let txCount = 0;

    const existingAccounts = listAccounts(db, { status: 'all' });
    const pierreToLocalAccount = new Map();

    const rawAccounts = asList(accountsData, ['accounts', 'data']);

    for (const raw of rawAccounts) {
      const pId = String(raw.id || raw.accountId || raw.account_id || '');
      if (!pId) continue;
      const inst = normalizeInstitution(raw.connectorName || raw.institution || raw.bank || raw.marketingName || raw.name);
      const kind = normalizeKind(raw.type || raw.kind);
      const mask = String(raw.mask || raw.number || raw.accountNumber || '').slice(-4);
      const name = String(raw.name || raw.accountName || raw.nickname || inst);

      let match = existingAccounts.find((a) => a.pierre_account_id === pId);
      if (!match) {
        match = existingAccounts.find(
          (a) => a.institution === inst && a.kind === kind && !a.pierre_account_id,
        );
      }
      if (!match) {
        match = existingAccounts.find(
          (a) => a.institution === inst && !a.pierre_account_id,
        );
      }

      if (match) {
        pierreToLocalAccount.set(pId, match.id);
        if (!match.pierre_account_id) {
          db.prepare('UPDATE finance_accounts SET pierre_account_id = ?, updated_at = ? WHERE id = ?')
            .run(pId, new Date().toISOString(), match.id);
        }
        if (mask && !match.mask) {
          updateAccount(db, match.id, { mask });
        }
      } else if (!['nubank', 'picpay'].includes(inst)) {
        const created = createAccount(db, {
          name,
          kind,
          institution: inst,
          mask,
          pierre_account_id: pId,
          source: 'pierre',
        });
        if (created) {
          pierreToLocalAccount.set(pId, created.id);
          existingAccounts.push(created);
        }
      }
      accountsCount++;
    }

    const rawBalances = asList(balanceData, ['accounts', 'balances']);

    for (const b of rawBalances) {
      const pId = String(b.accountId || b.account_id || b.id || '');
      let localId = pierreToLocalAccount.get(pId);
      if (!localId && (b.institution || b.bank)) {
        const inst = normalizeInstitution(b.institution || b.bank);
        const match = existingAccounts.find((a) => a.institution === inst && a.kind === 'checking');
        if (match) localId = match.id;
      }
      if (!localId) continue;

      const asOf = b.as_of || b.date || today;
      const detectedKind = detectAmountKind(b);

      const hasSeparateInvested =
        b.invested !== undefined ||
        b.autoInvest !== undefined ||
        b.auto_invest !== undefined ||
        b.blocked !== undefined ||
        b.investment !== undefined;

      const separateInvestedAmount = hasSeparateInvested
        ? money(b.invested ?? b.autoInvest ?? b.auto_invest ?? b.blocked ?? b.investment)
        : null;

      const hasSeparateAvailable =
        b.available !== undefined || b.availableBalance !== undefined;

      const entriesToRecord = [];

      if (
        hasSeparateInvested &&
        (hasSeparateAvailable ||
          (b.amount !== undefined && money(b.amount) !== separateInvestedAmount) ||
          (b.balance !== undefined && money(b.balance) !== separateInvestedAmount))
      ) {
        const availAmt = hasSeparateAvailable
          ? money(b.available ?? b.availableBalance)
          : money(b.amount ?? b.balance ?? 0);
        entriesToRecord.push({ kind: 'available', amount: availAmt });
        entriesToRecord.push({ kind: 'invested', amount: separateInvestedAmount });
      } else if (hasSeparateInvested) {
        entriesToRecord.push({ kind: 'invested', amount: separateInvestedAmount });
      } else if (detectedKind === 'invested') {
        const amt = money(b.amount ?? b.available ?? b.balance ?? b.availableBalance ?? 0);
        entriesToRecord.push({ kind: 'invested', amount: amt });
      } else {
        const amt = money(b.amount ?? b.available ?? b.balance ?? b.availableBalance ?? 0);
        entriesToRecord.push({ kind: detectedKind, amount: amt });
      }

      for (const entry of entriesToRecord) {
        const latest = latestBalance(db, localId, entry.kind);
        if (latest && (Number(latest.locked) === 1 || latest.source === 'joao')) {
          continue;
        }

        createBalance(db, {
          account_id: localId,
          amount: entry.amount,
          amount_kind: entry.kind,
          source: 'pierre',
          as_of: asOf,
          locked: false,
          note: 'Sync Pierre',
        });
      }
    }

    const rawBills = asList(billData, ['accounts', 'bills']);

    for (const bill of rawBills) {
      const pId = String(bill.accountId || bill.account_id || bill.id || '');
      let localId = pierreToLocalAccount.get(pId);
      if (!localId && (bill.institution || bill.bank)) {
        const inst = normalizeInstitution(bill.institution || bill.bank);
        const match = existingAccounts.find((a) => a.institution === inst && a.kind === 'credit');
        if (match) localId = match.id;
      }
      if (!localId) continue;

      const isOfficial = Boolean(bill.isOfficialBillAmount || bill.valueIsExact || bill.is_official || bill.official);
      const amountKind = isOfficial ? 'official_bill' : 'projected_bill';
      const billAmt = money(
        isOfficial
          ? (bill.official_bill ?? bill.amount ?? bill.current_bill_amount ?? 0)
          : (bill.projected_bill ?? bill.calculated_bill_amount ?? bill.amount ?? bill.current_bill_amount ?? 0),
      );
      const asOf = bill.as_of || bill.date || today;

      const latest = latestBalance(db, localId, amountKind);
      if (!latest || (Number(latest.locked) !== 1 && latest.source !== 'joao')) {
        createBalance(db, {
          account_id: localId,
          amount: billAmt,
          amount_kind: amountKind,
          source: 'pierre',
          as_of: asOf,
          locked: false,
          note: isOfficial ? 'Fatura oficial Pierre' : 'Projeção de fatura Pierre',
        });
      }

      if (isOfficial) {
        const debts = listDebts(db, { status: 'all' });
        const cardDebt = debts.find((d) => d.account_id === localId && d.kind === 'card');
        if (cardDebt && Number(cardDebt.locked) !== 1 && cardDebt.source !== 'joao') {
          updateDebt(db, cardDebt.id, {
            balance: billAmt,
            source: 'pierre',
          });
        }
      }
    }

    const rawTxs = asList(statementData, ['transactions', 'statement', 'items']);

    for (const tx of rawTxs) {
      const pTxId = String(tx.id || tx.transactionId || tx.txId || tx.pierre_tx_id || '');
      if (!pTxId) continue;

      const pAccId = String(tx.accountId || tx.account_id || '');
      const localAccId = pierreToLocalAccount.get(pAccId) || null;
      const postedOn = tx.posted_on || tx.date || tx.postDate || today;
      const rawAmt = Number(tx.amount || 0);

      const isDebit = tx.type === 'DEBIT' || tx.direction === 'outflow' || rawAmt < 0;
      const isInternal = tx.direction === 'internal';
      const direction = isInternal ? 'internal' : (isDebit ? 'outflow' : 'inflow');
      const amount = direction === 'outflow' ? -Math.abs(rawAmt) : Math.abs(rawAmt);

      const rawDesc = String(tx.raw_description || tx.description || tx.memo || '');
      const merchant = String(tx.merchant || tx.payee || rawDesc);
      const category = normalizeCategory(tx.category);

      const existingTx = db.prepare('SELECT * FROM finance_transactions WHERE pierre_tx_id = ?').get(pTxId);
      if (existingTx) {
        if (existingTx.source !== 'joao') {
          db.prepare(`
            UPDATE finance_transactions SET
              account_id = COALESCE(?, account_id),
              posted_on = ?,
              amount = ?,
              direction = ?,
              raw_description = ?,
              merchant = ?,
              category = ?
            WHERE pierre_tx_id = ?
          `).run(
            localAccId,
            postedOn,
            amount,
            direction,
            rawDesc,
            merchant,
            category,
            pTxId,
          );
        }
      } else {
        createTransaction(db, {
          id: randomUUID(),
          pierre_tx_id: pTxId,
          account_id: localAccId,
          posted_on: postedOn,
          amount,
          direction,
          raw_description: rawDesc,
          merchant,
          category,
          source: 'pierre',
        });
      }
      txCount++;
    }

    const rawInsts = asList(installmentsData, ['purchases', 'installments']);

    const existingInsts = listInstallments(db, { status: 'all' });
    for (const inst of rawInsts) {
      const title = String(inst.title || inst.description || inst.name || '').trim();
      if (!title) continue;
      if (title.toLowerCase().includes('nubank')) continue;

      const pAccId = String(inst.accountId || inst.account_id || '');
      const localAccId = pierreToLocalAccount.get(pAccId) || null;
      const monthly = money(inst.monthly || inst.monthlyAmount || inst.installmentAmount || 0);
      const remaining = money(inst.remaining || inst.remainingAmount || inst.totalRemaining || 0);
      const paidN = Number(inst.paid_n || inst.paidInstallments || inst.currentInstallment || 0);
      const totalN = Number(inst.total_n || inst.totalInstallments || 0);
      const lastDue = inst.last_due || inst.dueDate || inst.lastDueDate || null;

      const match = existingInsts.find((item) => item.title.toLowerCase() === title.toLowerCase());
      if (match) {
        if (Number(match.locked) !== 1 && match.source !== 'joao') {
          updateInstallment(db, match.id, {
            monthly,
            remaining,
            paid_n: paidN,
            total_n: totalN,
            last_due: lastDue,
            source: 'pierre',
          });
        }
      } else {
        createInstallment(db, {
          title,
          account_id: localAccId,
          monthly,
          remaining,
          paid_n: paidN,
          total_n: totalN,
          last_due: lastDue,
          source: 'pierre',
        });
      }
    }

    updateSettings(db, { snapshot_label: '' });

    const log = recordSyncAttempt(db, {
      ok: true,
      accountsN: accountsCount,
      txN: txCount,
      error: '',
      actor,
    });

    return {
      configured: true,
      ok: true,
      accounts_n: accountsCount,
      tx_n: txCount,
      last_sync: log,
    };
  } catch (err) {
    const errorMsg = sanitizeError(err?.message || 'Sync failed');
    const log = recordSyncAttempt(db, {
      ok: false,
      accountsN: 0,
      txN: 0,
      error: errorMsg,
      actor,
    });
    return {
      configured: true,
      ok: false,
      error: errorMsg,
      last_sync: log,
    };
  }
}
