import { Router } from 'express';
import {
  createAccount,
  createBalance,
  createDebt,
  createGoal,
  createInstallment,
  createSubscription,
  deleteInstallment,
  deleteSubscription,
  createTransaction,
  getInsights,
  getOverview,
  getSettings,
  lastSync,
  listAccounts,
  listBalances,
  listDebts,
  listGoals,
  listInstallments,
  listSubscriptions,
  listTransactions,
  payDebt,
  seedFinanceIfEmpty,
  updateAccount,
  updateDebt,
  updateGoal,
  updateInstallment,
  updateSettings,
  updateSubscription,
  updateTransaction,
} from '../finance.js';
import { syncPierre } from '../pierreSync.js';

function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'error' });
}

/** Finanças — mounted at /api/finance */
export function createFinanceRouter({ db, getLocalDateString }) {
  const router = Router();

  router.get('/overview', (req, res) => {
    try {
      const today = typeof getLocalDateString === 'function' ? getLocalDateString() : undefined;
      res.json(getOverview(db, { today }));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/settings', (_req, res) => {
    res.json(getSettings(db));
  });

  router.patch('/settings', (req, res) => {
    try {
      res.json(updateSettings(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/accounts', (req, res) => {
    res.json(listAccounts(db, { status: req.query.status }));
  });

  router.post('/accounts', (req, res) => {
    try {
      res.status(201).json(createAccount(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/accounts/:id', (req, res) => {
    const row = updateAccount(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.get('/balances', (req, res) => {
    res.json(listBalances(db, { account_id: req.query.account_id }));
  });

  router.post('/balances', (req, res) => {
    try {
      res.status(201).json(createBalance(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/debts', (req, res) => {
    res.json(listDebts(db, { status: req.query.status }));
  });

  router.post('/debts', (req, res) => {
    try {
      res.status(201).json(createDebt(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/debts/:id', (req, res) => {
    const row = updateDebt(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/debts/:id/pay', (req, res) => {
    try {
      const row = payDebt(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/subscriptions', (req, res) => {
    res.json(listSubscriptions(db, { lane: req.query.lane, status: req.query.status }));
  });

  router.post('/subscriptions', (req, res) => {
    try {
      res.status(201).json(createSubscription(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/subscriptions/:id', (req, res) => {
    const row = updateSubscription(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.delete('/subscriptions/:id', (req, res) => {
    const row = deleteSubscription(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, id: row.id });
  });

  router.get('/installments', (req, res) => {
    res.json(listInstallments(db, { status: req.query.status }));
  });

  router.post('/installments', (req, res) => {
    try {
      res.status(201).json(createInstallment(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/installments/:id', (req, res) => {
    const row = updateInstallment(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.delete('/installments/:id', (req, res) => {
    const row = deleteInstallment(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, id: row.id });
  });

  router.get('/transactions', (req, res) => {
    res.json(listTransactions(db, {
      from: req.query.from,
      to: req.query.to,
      account_id: req.query.account_id,
      category: req.query.category,
      q: req.query.q,
      limit: req.query.limit,
    }));
  });

  router.post('/transactions', (req, res) => {
    try {
      res.status(201).json(createTransaction(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/transactions/:id', (req, res) => {
    const row = updateTransaction(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.get('/insights', (req, res) => {
    res.json(getInsights(db, { from: req.query.from, to: req.query.to }));
  });

  router.get('/goals', (_req, res) => {
    res.json(listGoals(db));
  });

  router.post('/goals', (req, res) => {
    try {
      res.status(201).json(createGoal(db, req.body || {}));
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/goals/:id', (req, res) => {
    const row = updateGoal(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/seed', (req, res) => {
    const result = seedFinanceIfEmpty(db, { force: Boolean(req.body?.force) });
    res.json(result);
  });

  router.get('/sync/last', (_req, res) => {
    res.json(lastSync(db) || { ok: false, error: 'never' });
  });

  router.post('/sync', async (req, res) => {
    try {
      const actor = req.body?.actor || 'joao';
      const result = await syncPierre(db, { actor, getLocalDateString });
      if (!result.configured) {
        return res.status(503).json({
          error: 'pierre_not_configured',
          last_sync: result.last_sync || lastSync(db),
        });
      }
      if (!result.ok) {
        return res.status(502).json({
          error: 'pierre_sync_failed',
          message: result.error || 'sync failed',
          last_sync: result.last_sync,
        });
      }
      res.json({
        ok: true,
        accounts_n: result.accounts_n,
        tx_n: result.tx_n,
        last_sync: result.last_sync,
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
