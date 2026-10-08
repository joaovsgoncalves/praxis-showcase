import { Router } from 'express';
import { listHabitTree } from './habits.js';

function asLegacyReadModel(compound) {
  const addressed = (compound.completed_steps || 0) + (compound.skipped_steps || 0);
  return {
    id: compound.id,
    name: compound.title,
    emoji: compound.emoji,
    time_of_day: compound.time_of_day || null,
    status: compound.status,
    created_date: compound.created_date,
    habits_order: compound.children.map((child) => child.id),
    habits: compound.children,
    total: compound.total_steps,
    completed: compound.completed_steps,
    skipped: compound.skipped_steps,
    progress: compound.total_steps > 0
      ? Math.round((addressed / compound.total_steps) * 100)
      : 0,
    day_outcome: compound.day_outcome,
  };
}

/**
 * One-release compatibility shim mounted at /api/rituals.
 * Product flows use /api/habits; legacy writes are intentionally gone.
 */
export function createRitualsRouter({ db, getLocalDateString }) {
  const router = Router();

  router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    return res.status(410).json({
      error: 'Legacy write path removed. Use /api/habits with kind=compound.',
      code: 'rituals_read_only',
    });
  });

  function compounds(req) {
    const requestedStatus = String(req.query.status || 'active');
    const status = ['active', 'paused', 'archived', 'all'].includes(requestedStatus)
      ? requestedStatus
      : 'active';
    return listHabitTree({
      db,
      getLocalDateString,
      status,
      date: req.query.date ? String(req.query.date) : undefined,
    }).filter((habit) => habit.kind === 'compound');
  }

  router.get('/', (req, res) => {
    res.json(compounds(req).map(asLegacyReadModel));
  });

  router.get('/:id', (req, res) => {
    const compound = compounds(req).find((habit) => habit.id === req.params.id);
    if (!compound) return res.status(404).json({ error: 'Compound habit not found' });
    return res.json(asLegacyReadModel(compound));
  });

  router.get('/:id/progress', (req, res) => {
    const compound = compounds(req).find((habit) => habit.id === req.params.id);
    if (!compound) return res.status(404).json({ error: 'Compound habit not found' });
    return res.json({
      ...asLegacyReadModel(compound),
      date: req.query.date || getLocalDateString(),
    });
  });

  return router;
}
