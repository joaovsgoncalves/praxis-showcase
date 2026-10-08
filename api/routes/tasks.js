import { Router } from 'express';
import { randomUUID } from 'crypto';
import { nextRecurrenceDate } from '../taskRecurrence.js';

/**
 * Tasks router — mounted at /api/tasks
 * Also exports registerIdeaToTaskRoute for POST /api/ideas/:id/to-task
 */
export function createTasksRouter(ctx) {
  const {
    db,
    enrichCategory,
    getLocalDateString,
    addDaysLocal,
    stripPriorityPrefix,
    nextSortOrder,
    reorderItems,
    syncTaskToCalendar,
    getLevel,
    SKIP_REASONS,
  } = ctx;

  const router = Router();

  router.get('/', (req, res) => {
    const { date, status, category, idea_status, limit = 100, offset = 0, include_overdue, today: todayParam } = req.query;
    const limitN = Math.min(1000, Math.max(1, Number(limit) || 100));
    const offsetN = Math.max(0, Number(offset) || 0);
    const today = String(todayParam || getLocalDateString()).slice(0, 10);
    const mergeOverdue = include_overdue === '1' || include_overdue === 'true';

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (date) { query += ' AND date = ?'; params.push(date); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (idea_status) { query += ' AND idea_status = ?'; params.push(idea_status); }

    query += ' ORDER BY sort_order IS NULL, sort_order ASC, created_date DESC LIMIT ? OFFSET ?';
    params.push(limitN, offsetN);

    const recent = db.prepare(query).all(...params);

    if (!mergeOverdue) {
      return res.json(recent.map(enrichCategory));
    }

    // The frontend uses this mode for the operational payload. Include all open
    // non-ideia tasks (overdue, today, and upcoming) + completions closed today,
    // so upcoming pending tasks are never drowned out by old completed history.
    const operationalRows = db.prepare(`
      SELECT * FROM tasks
      WHERE status NOT IN ('completed', 'done', 'cancelled')
        AND category != 'ideias'
      ORDER BY (date IS NULL) ASC, date ASC, priority DESC, sort_order IS NULL, sort_order ASC
      LIMIT 150
    `).all();

    const completedTodayRows = db.prepare(`
      SELECT * FROM tasks
      WHERE status IN ('completed', 'done')
        AND category != 'ideias'
        AND (
          completed_date = ?
          OR (
            (completed_date IS NULL OR completed_date = '')
            AND substr(COALESCE(completed_at, updated_date, ''), 1, 10) = ?
          )
        )
      ORDER BY updated_date DESC
      LIMIT 80
    `).all(today, today);

    const byId = new Map();
    for (const t of operationalRows) byId.set(t.id, t);
    for (const t of completedTodayRows) byId.set(t.id, t);
    // Keep any explicit filters from the base query (status/date/category) if set.
    for (const t of recent) {
      if (!category && t.category === 'ideias') continue;
      byId.set(t.id, t);
    }

    const merged = [...byId.values()].sort((a, b) => {
      const aOpen = !['completed', 'done', 'cancelled'].includes(a.status);
      const bOpen = !['completed', 'done', 'cancelled'].includes(b.status);
      const aOver = aOpen && a.date && a.date < today;
      const bOver = bOpen && b.date && b.date < today;

      if (aOver !== bOver) return aOver ? -1 : 1;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;

      const so = (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9);
      if (so !== 0) return so;
      return String(b.created_date || '').localeCompare(String(a.created_date || ''));
    });

    res.json(merged.map(enrichCategory));
  });

  router.patch('/reorder', (req, res) => {
    const updated = reorderItems('tasks', req.body?.ordered_ids || req.body?.ids);
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY sort_order IS NULL, sort_order ASC, created_date DESC').all();
    res.json({ success: true, updated, tasks: tasks.map(enrichCategory) });
  });

  router.get('/:id', (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(enrichCategory(task));
  });

  function spawnNextRecurringTask(db, task, { completedDate, today }) {
    if (!task?.recurrence || task.recurrence === 'none') return null;
    const baseForNext = task.date || completedDate || today;
    const nextDate = nextRecurrenceDate(baseForNext, task.recurrence, task.recurrence_days);
    if (!nextDate) return null;

    const parentRef = task.recurrence_parent_id || task.id;
    const existingChild = db
      .prepare(
        `SELECT id FROM tasks
         WHERE recurrence_parent_id = ? AND date = ?
         AND status NOT IN ('completed', 'done', 'cancelled')`,
      )
      .get(parentRef, nextDate);
    if (existingChild) return { id: existingChild.id, date: nextDate, created: false };

    const childId = randomUUID();
    db.prepare(`
      INSERT INTO tasks (id, title, description, date, time, status, priority, category, goal_id, source, duration_minutes, sort_order, recurrence, recurrence_days, recurrence_parent_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      childId,
      task.title,
      task.description,
      nextDate,
      task.time,
      task.priority,
      task.category,
      task.goal_id || null,
      task.source || 'recurrence',
      task.duration_minutes || null,
      nextSortOrder('tasks'),
      task.recurrence,
      task.recurrence_days || '[]',
      parentRef,
    );
    const childTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(childId);
    const calendarSync = syncTaskToCalendar(childTask);
    return { id: childId, date: nextDate, created: true, calendar_sync: calendarSync };
  }

  router.post('/', (req, res) => {
    const id = randomUUID();
    const {
      title, description = '', date, time, status = 'pending',
      priority = 'medium', category = 'pessoal', goal_id = null, source = 'manual', duration_minutes,
      calendar_event_id, sort_order, recurrence = 'none', recurrence_days = [], recurrence_parent_id,
      idea_status, source_idea_id,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const isIdea = category === 'ideias';
    const taskPriority = isIdea ? (priority || 'low') : priority;
    const taskIdeaStatus = isIdea ? (idea_status || 'capturada') : (idea_status || null);
    const taskDate = isIdea ? (date || null) : date;
    const taskTime = isIdea ? (time || null) : time;

    const isDoneOnCreate = status === 'completed' || status === 'done';
    const completedDate = isDoneOnCreate ? getLocalDateString() : null;
    const completedAt = isDoneOnCreate ? new Date().toISOString() : null;
    const taskTitle = stripPriorityPrefix(title);
    const taskSortOrder = sort_order !== undefined ? Number(sort_order) : nextSortOrder('tasks');

    db.prepare(`
      INSERT INTO tasks (id, title, description, date, time, status, priority, category, goal_id, source, duration_minutes, calendar_event_id, sort_order, recurrence, recurrence_days, recurrence_parent_id, completed_date, completed_at, idea_status, source_idea_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, taskTitle, description, taskDate || null, taskTime || null, status, taskPriority, category,
      goal_id || null, source || 'manual', duration_minutes ? Number(duration_minutes) : null,
      calendar_event_id || null, taskSortOrder, recurrence,
      JSON.stringify(Array.isArray(recurrence_days) ? recurrence_days : []),
      recurrence_parent_id || null,
      completedDate,
      completedAt,
      taskIdeaStatus,
      source_idea_id || null,
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    const calendarSync = syncTaskToCalendar(task);
    const savedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json({ ...savedTask, calendar_sync: calendarSync });
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { title, description, date, time, status, priority, category, goal_id, source, duration_minutes, calendar_event_id, sort_order, recurrence, recurrence_days, idea_status, source_idea_id } = req.body;

    const wasDone = existing.status === 'completed' || existing.status === 'done';
    const willBeDone = status === 'completed' || status === 'done';
    const now = new Date();
    const today = getLocalDateString(now);
    let completedDate = existing.completed_date || null;
    let completedAt = existing.completed_at || null;
    let taskXpAwarded = 0;

    if (status !== undefined) {
      if (willBeDone) {
        completedDate = existing.completed_date || today;
        completedAt = existing.completed_at || now.toISOString();
        if (!wasDone) taskXpAwarded = 10;
      } else {
        completedDate = null;
        completedAt = null;
      }
    }

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        time = COALESCE(?, time),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        goal_id = COALESCE(?, goal_id),
        source = COALESCE(?, source),
        duration_minutes = COALESCE(?, duration_minutes),
        calendar_event_id = COALESCE(?, calendar_event_id),
        sort_order = COALESCE(?, sort_order),
        recurrence = COALESCE(?, recurrence),
        recurrence_days = COALESCE(?, recurrence_days),
        idea_status = COALESCE(?, idea_status),
        source_idea_id = COALESCE(?, source_idea_id),
        completed_date = ?,
        completed_at = ?,
        updated_date = datetime('now')
      WHERE id = ?
    `).run(
      title !== undefined ? stripPriorityPrefix(title) : null, description, date, time, status, priority, category,
      goal_id, source, duration_minutes !== undefined ? Number(duration_minutes) : null, calendar_event_id,
      sort_order !== undefined ? Number(sort_order) : null,
      recurrence,
      recurrence_days !== undefined ? JSON.stringify(Array.isArray(recurrence_days) ? recurrence_days : []) : null,
      idea_status !== undefined ? idea_status : null,
      source_idea_id !== undefined ? source_idea_id : null,
      completedDate,
      completedAt,
      req.params.id
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    const calendarSync = syncTaskToCalendar(task);
    const syncedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    let nextOccurrence = null;
    let nextOccurrenceSync = null;
    let xpSync = null;

    if (taskXpAwarded > 0) {
      const gam = db.prepare('SELECT * FROM gamification WHERE id = ?').get('main');
      const oldLevel = getLevel(gam.xp_total).level;
      const newXp = gam.xp_total + taskXpAwarded;
      const newLevelInfo = getLevel(newXp);
      db.prepare('UPDATE gamification SET xp_total = ?, level = ?, updated_date = datetime(\'now\') WHERE id = ?')
        .run(newXp, newLevelInfo.level, 'main');
      xpSync = {
        awarded: taskXpAwarded,
        reason: task.date && task.date < today ? 'Tarefa atrasada limpa hoje' : 'Tarefa concluída',
        xp_total: newXp,
        level: newLevelInfo.level,
        leveled_up: newLevelInfo.level > oldLevel,
      };
    }

    const becameDone =
      (status === 'completed' || status === 'done') &&
      existing.status !== 'completed' &&
      existing.status !== 'done';
    if (becameDone) {
      const spawned = spawnNextRecurringTask(db, task, { completedDate, today });
      if (spawned) {
        nextOccurrence = { id: spawned.id, date: spawned.date, created: spawned.created };
        nextOccurrenceSync = spawned.calendar_sync || null;
      }
    }

    res.json({
      ...syncedTask,
      calendar_sync: calendarSync,
      next_occurrence: nextOccurrence,
      next_occurrence_sync: nextOccurrenceSync,
      xp_sync: xpSync,
    });
  });


  router.delete('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const calendarSync = syncTaskToCalendar({ ...existing, status: 'cancelled' });
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true, calendar_sync: calendarSync });
  });

  /** Empurra tarefa para amanhã (local), mantém status aberto, registra day_outcome. */
  router.post('/:id/not-today', (req, res) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    if (existing.status === 'completed' || existing.status === 'done' || existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Only open tasks can be marked not-today' });
    }
    if (existing.category === 'ideias') {
      return res.status(400).json({ error: 'Ideas cannot use not-today' });
    }

    const today = getLocalDateString();
    const tomorrow = addDaysLocal(today, 1);
    let reason = null;
    if (req.body?.reason != null && req.body.reason !== '') {
      const r = String(req.body.reason).toLowerCase().trim();
      if (!SKIP_REASONS.has(r)) {
        return res.status(400).json({ error: 'reason must be time|energy|context|other' });
      }
      reason = r;
    }

    // Keep open status (pending / in_progress); only move date forward
    const status = existing.status === 'in_progress' ? 'in_progress' : 'pending';

    db.prepare(`
      UPDATE tasks SET
        date = ?,
        status = ?,
        day_outcome = 'not_today',
        day_outcome_date = ?,
        day_outcome_reason = ?,
        updated_date = datetime('now')
      WHERE id = ?
    `).run(tomorrow, status, today, reason, req.params.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    const calendarSync = syncTaskToCalendar(task);
    const syncedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json({
      ...syncedTask,
      calendar_sync: calendarSync,
    });
  });


  return router;
}

export function registerIdeaToTaskRoute(app, ctx) {
  const {
    db,
    enrichCategory,
    getLocalDateString,
    nextSortOrder,
    syncTaskToCalendar,
  } = ctx;

  app.post('/api/ideas/:id/to-task', (req, res) => {
    const idea = db.prepare('SELECT * FROM tasks WHERE id = ? AND category = ?').get(req.params.id, 'ideias');
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    if (idea.idea_status === 'virou_tarefa') {
      return res.status(409).json({ error: 'Idea already promoted to task' });
    }

    const { category = 'pessoal', date, priority = 'medium' } = req.body || {};
    const newId = randomUUID();
    const taskDate = date || getLocalDateString();
    const sort = nextSortOrder('tasks');

    db.prepare(`
      INSERT INTO tasks (id, title, description, date, time, status, priority, category, source, sort_order, source_idea_id)
      VALUES (?, ?, ?, ?, NULL, 'pending', ?, ?, 'from_idea', ?, ?)
    `).run(
      newId,
      idea.title,
      idea.description || '',
      taskDate,
      priority,
      category,
      sort,
      idea.id,
    );

    db.prepare(`UPDATE tasks SET idea_status = 'virou_tarefa', updated_date = datetime('now') WHERE id = ?`).run(idea.id);

    let task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(newId);
    const calendarSync = syncTaskToCalendar(task);
    task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(newId);
    const updatedIdea = db.prepare('SELECT * FROM tasks WHERE id = ?').get(idea.id);
    res.status(201).json({
      task: enrichCategory(task),
      idea: enrichCategory(updatedIdea),
      calendar_sync: calendarSync,
    });
  });
}
