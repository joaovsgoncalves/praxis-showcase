import { Router } from 'express';
import { randomUUID } from 'crypto';

/** Normalize optional deadline: empty string → null; omit → undefined (keep existing on update). */
function normalizeDeadline(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return value;
}

/** Goals — mounted at /api/goals */
export function createGoalsRouter({ db, getLocalDateString, nextSortOrder }) {
  const router = Router();

  router.get('/', (req, res) => {
    const goals = db.prepare('SELECT * FROM goals ORDER BY created_date DESC').all();
    res.json(goals);
  });

  router.get('/:id', (req, res) => {
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    res.json(goal);
  });

  router.post('/', (req, res) => {
    const id = randomUUID();
    const {
      title, description = '', deadline, timeframe = 'short', category = 'personal',
      status = 'active', manual_progress = 0, initial_link,
    } = req.body;

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) return res.status(400).json({ error: 'Title is required' });

    const deadlineValue = normalizeDeadline(deadline) ?? null;

    // initial_link is optional (quick create). When present, validate before insert.
    if (initial_link != null) {
      if (!initial_link.type || !['task', 'habit'].includes(initial_link.type)) {
        return res.status(400).json({
          error: 'Goal must include initial_link (task or habit)',
          code: 'goal_link_required',
        });
      }
      const linkTitle = (initial_link.title || trimmedTitle).trim();
      if (!linkTitle) {
        return res.status(400).json({ error: 'Link title is required', code: 'goal_link_title_required' });
      }
    }

    db.prepare(`
      INSERT INTO goals (id, title, description, deadline, timeframe, category, status, manual_progress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, trimmedTitle, description, deadlineValue, timeframe, category, status, manual_progress);

    let linked = null;
    if (initial_link != null) {
      const linkTitle = (initial_link.title || trimmedTitle).trim();
      if (initial_link.type === 'task') {
        const taskId = randomUUID();
        const taskDate = initial_link.date || deadlineValue || getLocalDateString();
        const sort = nextSortOrder('tasks');
        db.prepare(`
          INSERT INTO tasks (id, title, description, date, status, priority, category, goal_id, source, sort_order)
          VALUES (?, ?, ?, ?, 'pending', 'medium', 'pessoal', ?, 'goal_wizard', ?)
        `).run(taskId, linkTitle, description || '', taskDate, id, sort);
        linked = { type: 'task', id: taskId, title: linkTitle };
      } else {
        const habitId = randomUUID();
        const sort = nextSortOrder('habits');
        const freq = initial_link.frequency || 'daily';
        db.prepare(`
          INSERT INTO habits (id, title, description, frequency, category, goal_id, source, sort_order, status)
          VALUES (?, ?, ?, ?, 'wellness', ?, 'goal_wizard', ?, 'active')
        `).run(habitId, linkTitle, description || '', freq, id, sort);
        linked = { type: 'habit', id: habitId, title: linkTitle };
      }
    }

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json({ goal, linked });
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Goal not found' });

    const { description, timeframe, category, status, manual_progress } = req.body;

    let nextTitle;
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      nextTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!nextTitle) return res.status(400).json({ error: 'Title is required' });
    }

    // Explicit deadline semantics: key present with null/'' clears; omitted keeps existing.
    // Avoid COALESCE(?, deadline) which cannot clear the field.
    const hasDeadline = Object.prototype.hasOwnProperty.call(req.body, 'deadline');
    const nextDeadline = hasDeadline ? normalizeDeadline(req.body.deadline) : existing.deadline;

    db.prepare(`
      UPDATE goals SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        deadline = ?,
        timeframe = COALESCE(?, timeframe),
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        manual_progress = COALESCE(?, manual_progress)
      WHERE id = ?
    `).run(
      nextTitle,
      description,
      nextDeadline,
      timeframe,
      category,
      status,
      manual_progress,
      req.params.id,
    );

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    res.json(goal);
  });

  router.delete('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Goal not found' });

    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  return router;
}
