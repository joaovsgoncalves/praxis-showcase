import { Router } from 'express';
import {
  listPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../purchaseList.js';

/** Purchases / wishlist — mounted at /api/purchases */
export function createPurchasesRouter({ db }) {
  const router = Router();

  router.get('/', (req, res) => {
    const { horizon, status } = req.query;
    res.json(listPurchases(db, { horizon, status }));
  });

  router.post('/', (req, res) => {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title required' });
    const row = createPurchase(db, req.body);
    res.status(201).json(row);
  });

  router.patch('/:id', (req, res) => {
    const row = updatePurchase(db, req.params.id, req.body || {});
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.delete('/:id', (req, res) => {
    if (!deletePurchase(db, req.params.id)) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  return router;
}
