import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createFinanceRouter } from './routes/finance.js';
import { detectAmountKind, seedFinanceIfEmpty } from './finance.js';
import { createTestDb, requestJson, startTestServer } from './test-support/helpers.mjs';

async function mountFinance(t, { seed = true, today = '2026-08-12' } = {}) {
  const db = createTestDb({ withFinance: true });
  if (seed) seedFinanceIfEmpty(db);
  const app = express();
  app.use(express.json());
  app.use('/api/finance', createFinanceRouter({ db, getLocalDateString: () => today }));
  const server = await startTestServer(app);
  t.after(() => {
    db.close();
    return server.close();
  });
  return { db, server };
}

function mockPierreFetch(t, mockData = {}) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    if (!urlStr.includes('pierre.finance')) {
      return originalFetch(url, options);
    }
    calls.push({ url: urlStr, options });

    if (mockData.shouldFail) {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (urlStr.includes('get-accounts')) {
      return new Response(
        JSON.stringify(
          mockData.accounts ?? {
            accounts: [
              { id: 'p-acc-inter', name: 'Inter Conta', institution: 'inter', type: 'BANK', mask: '1111' },
              { id: 'p-acc-c6', name: 'C6 Bank', institution: 'c6', type: 'BANK', mask: '2222' },
            ],
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (urlStr.includes('get-balance')) {
      return new Response(
        JSON.stringify(
          mockData.balances ?? {
            balances: [
              { accountId: 'p-acc-inter', amount: 2500.50, date: '2026-08-27' },
              { accountId: 'p-acc-c6', amount: 350.00, date: '2026-08-27' },
            ],
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (urlStr.includes('get-bill')) {
      return new Response(
        JSON.stringify(
          mockData.bills ?? {
            bills: [
              { accountId: 'p-acc-c6', amount: 450.00, isOfficialBillAmount: false },
            ],
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (urlStr.includes('get-bank-statement')) {
      return new Response(
        JSON.stringify(
          mockData.statement ?? {
            transactions: [
              {
                id: 'ptx-001',
                accountId: 'p-acc-inter',
                posted_on: '2026-08-26',
                amount: -120.50,
                direction: 'outflow',
                raw_description: 'Supermercado Pao de Acucar',
                merchant: 'Pao de Acucar',
                category: 'Mercado',
              },
            ],
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (urlStr.includes('get-installments')) {
      return new Response(
        JSON.stringify(
          mockData.installments ?? {
            installments: [
              {
                title: 'Bot Conversa',
                monthly: 265.33,
                remaining: 530.66,
                paid_n: 7,
                total_n: 9,
                last_due: '2026-10-15',
              },
            ],
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  return { calls };
}

test('overview with seed: Inter 1103.62 and next step is carro', async (t) => {
  const { server } = await mountFinance(t);
  const body = await requestJson(server.base, '/api/finance/overview');
  assert.equal(body.caixa, 1103.62);
  assert.equal(body.snapshot_label, 'foto 12/08');
  assert.equal(body.next_step.kind, 'due');
  assert.equal(body.next_step.debt_id, 'debt-carro');
  assert.ok(body.next_step.label.toLowerCase().includes('carro'));
  assert.equal(body.cards_total, 3782 + 3227 + 2162 + 1371);
  assert.ok(body.work_month >= 220 && body.work_month <= 240);
  assert.ok(body.personal_month >= 180 && body.personal_month <= 200);
});

test('pay debt lowers balance, records payment and outflow', async (t) => {
  const { db, server } = await mountFinance(t);
  const body = await requestJson(server.base, '/api/finance/debts/debt-carro/pay', {
    method: 'POST',
    body: { amount: 1270, paid_on: '2026-08-12', account_id: 'acc-inter', method: 'pix' },
  });
  assert.equal(body.debt.balance, 0);
  assert.equal(body.debt.status, 'clean');
  assert.equal(body.payment.amount, 1270);

  const txs = await requestJson(server.base, '/api/finance/transactions?from=2026-08-01&to=2026-08-31');
  assert.equal(txs.length, 1);
  assert.equal(txs[0].direction, 'outflow');
  assert.equal(txs[0].amount, -1270);
  assert.equal(txs[0].category, 'Dívidas');

  const payments = db.prepare('SELECT * FROM finance_payments WHERE debt_id = ?').all('debt-carro');
  assert.equal(payments.length, 1);

  const goal = db.prepare('SELECT * FROM finance_goals WHERE id = ?').get('goal-carro');
  assert.equal(goal.current_amount, 1270);
  assert.equal(goal.status, 'done');
});

test('subscription lane totals match seed', async (t) => {
  const { server } = await mountFinance(t);
  const work = await requestJson(server.base, '/api/finance/subscriptions?lane=work');
  const personal = await requestJson(server.base, '/api/finance/subscriptions?lane=personal');
  const workSum = work.reduce((s, x) => s + x.amount, 0);
  const personalSum = personal.reduce((s, x) => s + x.amount, 0);
  assert.ok(workSum >= 220 && workSum <= 240);
  assert.ok(personalSum >= 180 && personalSum <= 200);
});

test('insights ignore internal transfers', async (t) => {
  const { server } = await mountFinance(t);
  await requestJson(server.base, '/api/finance/transactions', {
    method: 'POST',
    body: {
      account_id: 'acc-inter',
      posted_on: '2026-08-10',
      amount: -80,
      direction: 'outflow',
      category: 'Alimentação',
      merchant: 'Mercado',
    },
  });
  await requestJson(server.base, '/api/finance/transactions', {
    method: 'POST',
    body: {
      account_id: 'acc-inter',
      posted_on: '2026-08-10',
      amount: -500,
      direction: 'internal',
      category: 'Transferência',
      merchant: 'C6',
    },
  });
  const insights = await requestJson(server.base, '/api/finance/insights?from=2026-08-01&to=2026-08-31');
  assert.equal(insights.outflow, 80);
  assert.equal(insights.categories[0].name, 'Alimentação');
});

test('locked joao balance is not the concern of empty seed rerun', async (t) => {
  const { server } = await mountFinance(t);
  await requestJson(server.base, '/api/finance/balances', {
    method: 'POST',
    body: {
      account_id: 'acc-inter',
      amount: 999.11,
      as_of: '2026-08-12',
      source: 'joao',
      locked: true,
    },
  });
  const again = await requestJson(server.base, '/api/finance/seed', { method: 'POST', body: {} });
  assert.equal(again.seeded, false);
  const overview = await requestJson(server.base, '/api/finance/overview');
  assert.equal(overview.caixa, 999.11);
  assert.equal(overview.snapshot_label, '');
});

test('sync without Pierre key returns 503', async (t) => {
  const prevKey = process.env.PIERRE_API_KEY;
  delete process.env.PIERRE_API_KEY;
  t.after(() => {
    if (prevKey !== undefined) process.env.PIERRE_API_KEY = prevKey;
    else delete process.env.PIERRE_API_KEY;
  });

  const { server } = await mountFinance(t);
  const response = await fetch(`${server.base}/api/finance/sync`, { method: 'POST' });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, 'pierre_not_configured');
  assert.equal(body.last_sync.ok, 0);
});

test('Nubank survives as a debt even without Pierre', async (t) => {
  const { server } = await mountFinance(t);
  const debts = await requestJson(server.base, '/api/finance/debts');
  assert.ok(debts.some((d) => d.id === 'debt-nubank' && d.balance === 3227));
});

test('delete subscription removes it from the list', async (t) => {
  const { server } = await mountFinance(t);
  const created = await requestJson(server.base, '/api/finance/subscriptions', {
    method: 'POST',
    body: { id: 'sub-temp-kill', name: 'Temp', lane: 'personal', amount: 10, status: 'cancelled' },
  });
  assert.equal(created.id, 'sub-temp-kill');
  const deleted = await requestJson(server.base, '/api/finance/subscriptions/sub-temp-kill', {
    method: 'DELETE',
  });
  assert.equal(deleted.ok, true);
  const list = await requestJson(server.base, '/api/finance/subscriptions');
  assert.equal(list.some((s) => s.id === 'sub-temp-kill'), false);
  const missing = await fetch(`${server.base}/api/finance/subscriptions/nope`, { method: 'DELETE' });
  assert.equal(missing.status, 404);
});

test('installments stay out of card totals', async (t) => {
  const { server } = await mountFinance(t);
  const before = await requestJson(server.base, '/api/finance/overview');
  await requestJson(server.base, '/api/finance/installments', {
    method: 'POST',
    body: {
      id: 'inst-test-bot',
      title: 'Bot Conversa',
      account_id: 'acc-mp',
      monthly: 265.33,
      remaining: 795.99,
      paid_n: 6,
      total_n: 9,
      source: 'pierre',
    },
  });
  const after = await requestJson(server.base, '/api/finance/overview');
  assert.equal(after.cards_total, before.cards_total);
  assert.equal(after.installments_n, 1);
  assert.equal(after.installments_remaining, 795.99);
  assert.equal(after.installments_month, 265.33);
  const gone = await requestJson(server.base, '/api/finance/installments/inst-test-bot', {
    method: 'DELETE',
  });
  assert.equal(gone.ok, true);
});

test('sync with mock Pierre REST updates Inter balance and imports txs when not locked', async (t) => {
  const prevKey = process.env.PIERRE_API_KEY;
  process.env.PIERRE_API_KEY = 'mock-test-key-123';
  t.after(() => {
    if (prevKey !== undefined) process.env.PIERRE_API_KEY = prevKey;
    else delete process.env.PIERRE_API_KEY;
  });

  const { calls } = mockPierreFetch(t);
  const { server } = await mountFinance(t);

  const syncRes = await requestJson(server.base, '/api/finance/sync', {
    method: 'POST',
    body: { actor: 'test-runner' },
  });

  assert.equal(syncRes.ok, true);
  assert.ok(syncRes.accounts_n >= 2);
  assert.ok(syncRes.tx_n >= 1);
  assert.equal(syncRes.last_sync.ok, 1);

  // Authorization and header checks
  assert.ok(calls.length >= 4);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer mock-test-key-123');
  assert.equal(calls[0].options.headers.Accept, 'application/json');

  // Inter balance updated
  const overview = await requestJson(server.base, '/api/finance/overview');
  assert.equal(overview.caixa, 2500.50);

  // Transactions imported
  const txs = await requestJson(server.base, '/api/finance/transactions?from=2026-08-01&to=2026-08-31');
  const importedTx = txs.find((tx) => tx.pierre_tx_id === 'ptx-001');
  assert.ok(importedTx);
  assert.equal(importedTx.amount, -120.50);
  assert.equal(importedTx.category, 'Mercado');
  assert.equal(importedTx.source, 'pierre');

  // Nubank and manual debts survive untouched
  const debts = await requestJson(server.base, '/api/finance/debts');
  const nubank = debts.find((d) => d.id === 'debt-nubank');
  assert.ok(nubank);
  assert.equal(nubank.balance, 3227);
  const carro = debts.find((d) => d.id === 'debt-carro');
  assert.ok(carro);
  assert.equal(carro.balance, 1270);
});

test('sync with mock Pierre REST respects locked=1 and source=joao overrides', async (t) => {
  const prevKey = process.env.PIERRE_API_KEY;
  process.env.PIERRE_API_KEY = 'mock-test-key-123';
  t.after(() => {
    if (prevKey !== undefined) process.env.PIERRE_API_KEY = prevKey;
    else delete process.env.PIERRE_API_KEY;
  });

  mockPierreFetch(t, {
    balances: {
      balances: [
        { accountId: 'p-acc-inter', amount: 9999.99, date: '2026-08-27' },
        { accountId: 'p-acc-c6', amount: 400.00, date: '2026-08-27' },
      ],
    },
  });

  const { server } = await mountFinance(t);

  // User sets manual locked balance on Inter
  await requestJson(server.base, '/api/finance/balances', {
    method: 'POST',
    body: {
      account_id: 'acc-inter',
      amount: 1450.00,
      as_of: '2026-08-27',
      source: 'joao',
      locked: true,
      note: 'Saldo conferido no app Inter pelo Joao',
    },
  });

  const syncRes = await requestJson(server.base, '/api/finance/sync', { method: 'POST' });
  assert.equal(syncRes.ok, true);

  // Inter balance must remain 1450.00 (not overwritten to 9999.99)
  const overview = await requestJson(server.base, '/api/finance/overview');
  assert.equal(overview.caixa, 1450.00);

  // C6 balance (unlocked) updated
  const accounts = await requestJson(server.base, '/api/finance/accounts');
  const c6 = accounts.find((a) => a.id === 'acc-c6');
  assert.equal(c6.available, 400.00);

  // Nubank debt still survives
  const debts = await requestJson(server.base, '/api/finance/debts');
  assert.ok(debts.some((d) => d.id === 'debt-nubank' && d.balance === 3227));
});

test('sync with Pierre failure returns 502 without leaking secret or crashing', async (t) => {
  const prevKey = process.env.PIERRE_API_KEY;
  process.env.PIERRE_API_KEY = 'super-secret-key-xyz-987';
  t.after(() => {
    if (prevKey !== undefined) process.env.PIERRE_API_KEY = prevKey;
    else delete process.env.PIERRE_API_KEY;
  });

  mockPierreFetch(t, { shouldFail: true });
  const { server } = await mountFinance(t);

  const res = await fetch(`${server.base}/api/finance/sync`, { method: 'POST' });
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error, 'pierre_sync_failed');
  assert.equal(body.last_sync.ok, 0);

  // Secret is never leaked
  const bodyStr = JSON.stringify(body);
  assert.equal(bodyStr.includes('super-secret-key-xyz-987'), false);

  // Overview still responds normally
  const overview = await requestJson(server.base, '/api/finance/overview');
  assert.equal(overview.caixa, 1103.62);
});

test('sync imports invested balance even when available=0 is locked by joao', async (t) => {
  const prevKey = process.env.PIERRE_API_KEY;
  process.env.PIERRE_API_KEY = 'mock-test-key-123';
  t.after(() => {
    if (prevKey !== undefined) process.env.PIERRE_API_KEY = prevKey;
    else delete process.env.PIERRE_API_KEY;
  });

  mockPierreFetch(t, {
    balances: {
      balances: [
        { accountId: 'p-acc-inter', amount: 0, date: '2026-08-27' },
        {
          accountId: 'p-acc-inter',
          amount: 1882.94,
          name: 'Inter auto-invest',
          type: 'auto-invest',
          date: '2026-08-27',
        },
      ],
    },
  });

  const { server } = await mountFinance(t);

  // POST balance Inter available=0 locked joao
  await requestJson(server.base, '/api/finance/balances', {
    method: 'POST',
    body: {
      account_id: 'acc-inter',
      amount: 0,
      amount_kind: 'available',
      as_of: '2026-08-27',
      source: 'joao',
      locked: true,
      note: 'Saldo zerado no app Inter pelo Joao',
    },
  });

  // POST sync
  const syncRes = await requestJson(server.base, '/api/finance/sync', { method: 'POST' });
  assert.equal(syncRes.ok, true);

  // overview.caixa === 0
  const overview = await requestJson(server.base, '/api/finance/overview');
  assert.equal(overview.caixa, 0);

  // overview.invested === 1882.94
  assert.equal(overview.invested, 1882.94);

  // listAccounts also has invested on Inter
  const accounts = await requestJson(server.base, '/api/finance/accounts');
  const inter = accounts.find((a) => a.id === 'acc-inter');
  assert.ok(inter);
  assert.equal(inter.invested, 1882.94);
  assert.equal(inter.available, 0);

  // Nubank debt ainda existe
  const debts = await requestJson(server.base, '/api/finance/debts');
  const nubank = debts.find((d) => d.id === 'debt-nubank');
  assert.ok(nubank);
  assert.equal(nubank.balance, 3227);
});

test('detectAmountKind recognizes invested and bill kinds', () => {
  assert.equal(detectAmountKind({ name: 'Inter Auto-invest' }), 'invested');
  assert.equal(detectAmountKind({ type: 'auto-invest' }), 'invested');
  assert.equal(detectAmountKind({ product: 'CDB Limite' }), 'invested');
  assert.equal(detectAmountKind({ subtype: 'aplicação' }), 'invested');
  assert.equal(detectAmountKind({ kind: 'investimento' }), 'invested');
  assert.equal(detectAmountKind({ isOfficialBillAmount: true }), 'official_bill');
  assert.equal(detectAmountKind({ isOfficialBillAmount: false }), 'projected_bill');
  assert.equal(detectAmountKind({ amount: 100 }), 'available');
  assert.equal(detectAmountKind(null), 'available');
});

test('sync handles combined available and autoInvest in same balance object', async (t) => {
  const prevKey = process.env.PIERRE_API_KEY;
  process.env.PIERRE_API_KEY = 'mock-test-key-123';
  t.after(() => {
    if (prevKey !== undefined) process.env.PIERRE_API_KEY = prevKey;
    else delete process.env.PIERRE_API_KEY;
  });

  mockPierreFetch(t, {
    balances: {
      balances: [
        {
          accountId: 'p-acc-inter',
          available: 0,
          autoInvest: 1882.94,
          date: '2026-08-27',
        },
      ],
    },
  });

  const { server } = await mountFinance(t);

  await requestJson(server.base, '/api/finance/balances', {
    method: 'POST',
    body: {
      account_id: 'acc-inter',
      amount: 0,
      amount_kind: 'available',
      as_of: '2026-08-27',
      source: 'joao',
      locked: true,
    },
  });

  const syncRes = await requestJson(server.base, '/api/finance/sync', { method: 'POST' });
  assert.equal(syncRes.ok, true);

  const overview = await requestJson(server.base, '/api/finance/overview');
  assert.equal(overview.caixa, 0);
  assert.equal(overview.invested, 1882.94);
});
