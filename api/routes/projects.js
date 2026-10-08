import { Router } from 'express';
import {
  applyProjectPatch,
  completeProjectNextStep,
  createProject,
  createProjectUpdate,
  getProject,
  listProjectUpdates,
  listProjects,
  todayFortaleza,
} from '../projects.js';
import { getContinuityGuidance } from '../continuityGuidance.js';

function sendError(res, err) {
  const status = err.status || 500;
  const code = err.code || err.message;
  if (status === 409 && (code === 'FOCUS_LIMIT' || err.message === 'FOCUS_LIMIT')) {
    return res.status(409).json({ error: 'FOCUS_LIMIT' });
  }
  res.status(status).json({ error: err.message || 'error' });
}

/** Projects — mounted at /api/projects */
export function createProjectsRouter({ db, getLocalDateString = todayFortaleza }) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(listProjects(db));
  });

  router.get('/:id/updates', (req, res) => {
    const rows = listProjectUpdates(db, req.params.id, req.query.limit);
    if (!rows) return res.status(404).json({ error: 'Not found' });
    res.json(rows);
  });

  router.post('/:id/updates', (req, res) => {
    try {
      const row = createProjectUpdate(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.status(201).json(row);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.post('/:id/complete-next-step', (req, res) => {
    try {
      const result = completeProjectNextStep(db, req.params.id, req.body || {});
      if (!result) return res.status(404).json({ error: 'Not found' });
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/guidance/today', (_req, res) => {
    try {
      const today = typeof getLocalDateString === 'function'
        ? getLocalDateString()
        : todayFortaleza();
      const guidance = getContinuityGuidance(db, today);
      res.json(guidance);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.get('/:id', (req, res) => {
    const row = getProject(db, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    try {
      const row = createProject(db, req.body || {});
      res.status(201).json(row);
    } catch (err) {
      sendError(res, err);
    }
  });

  router.patch('/:id', (req, res) => {
    try {
      const row = applyProjectPatch(db, req.params.id, req.body || {});
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      sendError(res, err);
    }
  });

  return router;
}
