import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  getStreaks as getStreaksForHabit,
  isHabitLogDone,
  isHabitLogSkipped,
} from '../lib/habitStreaks.js';
import {
  daysSinceDate,
  decorateSinceHabit,
  isSinceHabit,
  normalizeSinceDate,
  normalizeTrackingMode,
} from '../lib/habitSinceCounter.js';

const HABIT_KINDS = new Set(['simple', 'compound']);

function compareHabitOrder(a, b) {
  const aPosition = a.position_in_parent ?? Number.MAX_SAFE_INTEGER;
  const bPosition = b.position_in_parent ?? Number.MAX_SAFE_INTEGER;
  if (aPosition !== bPosition) return aPosition - bPosition;
  const aSort = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const bSort = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (aSort !== bSort) return aSort - bSort;
  return String(a.created_date || '').localeCompare(String(b.created_date || ''));
}

function legacyMetadataByCompoundSource(db) {
  const metadata = new Map();
  const rows = db.prepare('SELECT id, emoji, time_of_day FROM rituals').all();
  for (const row of rows) metadata.set(`ritual_migration:${row.id}`, row);
  return metadata;
}

function preferredTimeBucket(preferredTime) {
  const raw = String(preferredTime || '');
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  const hour = Number(raw.slice(0, 2));
  if (!Number.isInteger(hour)) return null;
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function deriveCompoundTimeOfDay(children) {
  const buckets = new Set(
    children.map((child) => preferredTimeBucket(child.preferred_time)).filter(Boolean),
  );
  return buckets.size === 1 ? [...buckets][0] : null;
}

function findHabitInTree(tree, habitId) {
  for (const habit of tree) {
    if (habit.id === habitId) return habit;
    const child = habit.children?.find((item) => item.id === habitId);
    if (child) return child;
  }
  return null;
}

/**
 * Canonical nested habits read model. Only top-level habits are returned;
 * compound children carry their own completion, skip and streak state.
 */
export function listHabitTree({ db, getLocalDateString, status = 'active', date }) {
  const order = 'ORDER BY sort_order IS NULL, sort_order ASC, created_date DESC';
  const rows = status === 'all'
    ? db.prepare(`SELECT * FROM habits ${order}`).all()
    : db.prepare(`SELECT * FROM habits WHERE status = ? ${order}`).all(status);
  const today = date || getLocalDateString();
  const logs = db.prepare(`
    SELECT habit_id, completed, outcome, skip_reason, note, value
    FROM habit_logs
    WHERE date = ?
  `).all(today);
  const logsByHabit = new Map(logs.map((log) => [log.habit_id, log]));
  const legacyMetadata = legacyMetadataByCompoundSource(db);

  const enriched = rows.map((habit) => {
    const log = logsByHabit.get(habit.id);
    const done = habit.kind !== 'compound' && isHabitLogDone(log);
    const skipped = habit.kind !== 'compound' && isHabitLogSkipped(log);
    const streaks = habit.kind === 'compound'
      ? { current_streak: null, best_streak: null }
      : getStreaksForHabit(db, habit.id, getLocalDateString);
    const legacy = habit.kind === 'compound'
      ? legacyMetadata.get(habit.source)
      : null;

    let result = {
      ...habit,
      ...streaks,
      completed_today: done,
      skipped_today: skipped,
      day_outcome: skipped ? 'skipped' : done ? 'done' : 'open',
      skip_reason: log?.skip_reason || null,
      skip_note: (log?.note && String(log.note).trim()) || null,
      value_today: log?.value ?? null,
      ...(habit.kind === 'compound'
        ? {
            emoji: habit.emoji || legacy?.emoji || '🔗',
            time_of_day: legacy?.time_of_day || null,
          }
        : {}),
    };
    if (isSinceHabit(result)) {
      result = decorateSinceHabit(result, today);
    }
    return result;
  });

  const childrenByParent = new Map();
  for (const habit of enriched) {
    if (!habit.parent_id) continue;
    const children = childrenByParent.get(habit.parent_id) || [];
    children.push(habit);
    childrenByParent.set(habit.parent_id, children);
  }

  return enriched
    .filter((habit) => !habit.parent_id)
    .map((habit) => {
      if (habit.kind !== 'compound') return habit;
      const children = (childrenByParent.get(habit.id) || []).sort(compareHabitOrder);
      const completedSteps = children.filter((child) => child.completed_today).length;
      const skippedSteps = children.filter((child) => child.skipped_today).length;
      return {
        ...habit,
        children,
        completed_steps: completedSteps,
        skipped_steps: skippedSteps,
        total_steps: children.length,
        time_of_day: habit.time_of_day || deriveCompoundTimeOfDay(children),
        day_outcome: children.length > 0 && completedSteps + skippedSteps === children.length
          ? 'done'
          : 'open',
      };
    });
}

/**
 * Habits router — mounted at /api/habits
 * registerHabitLogRoutes mounts /api/habit-logs
 */
export function createHabitsRouter(ctx) {
  const {
    db,
    getLocalDateString,
    stripPriorityPrefix,
    nextSortOrder,
    reorderItems,
  } = ctx;

  const HABIT_STATUSES = new Set(['active', 'paused', 'archived']);
  const HABIT_FREQUENCIES = new Set(['daily', 'weekdays', 'weekends', 'weekly']);

  const router = Router();

  // ==================== HABITS ====================
  // Status: active | paused | archived — pause/archive preserve habit_logs (see docs/HABITS-LIFECYCLE.md)

  function normalizeRecurrenceDays(input) {
    if (input === undefined || input === null) return null;
    let arr = input;
    if (typeof input === 'string') {
      try { arr = JSON.parse(input); } catch { return '[]'; }
    }
    if (!Array.isArray(arr)) return '[]';
    const days = [...new Set(arr.map(Number).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b);
    return JSON.stringify(days);
  }

  router.get('/', (req, res) => {
    const raw = String(req.query.status ?? 'active');
    if (raw !== 'all' && !HABIT_STATUSES.has(raw)) {
      return res.status(400).json({ error: 'Invalid status. Use active, paused, archived, or all' });
    }
    res.json(listHabitTree({
      db,
      getLocalDateString,
      status: raw,
      date: req.query.date ? String(req.query.date) : undefined,
    }));
  });

  router.patch('/reorder', (req, res) => {
    const updated = reorderItems('habits', req.body?.ordered_ids || req.body?.ids);
    const habits = listHabitTree({ db, getLocalDateString, status: 'active' });
    res.json({ success: true, updated, habits });
  });

  function normalizePreferredTime(input) {
    if (input === undefined) return undefined;
    if (input === null || input === '') return '';
    const raw = String(input).trim();
    const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  function validateParent(parentId, kind, habitId = null) {
    if (!parentId) return null;
    if (kind === 'compound') return 'Compound habits cannot be children';
    if (parentId === habitId) return 'A habit cannot be its own parent';
    const parent = db.prepare('SELECT id, kind FROM habits WHERE id = ?').get(parentId);
    if (!parent || parent.kind !== 'compound') return 'parent_id must reference a compound habit';
    return null;
  }

  function nextChildPosition(parentId) {
    const row = db.prepare(`
      SELECT COALESCE(MAX(position_in_parent), -1) + 1 AS next_position
      FROM habits WHERE parent_id = ?
    `).get(parentId);
    return Number(row?.next_position || 0);
  }

  function syncCompoundChildren(compoundId, requestedChildren) {
    const compound = db.prepare(`
      SELECT id, kind, frequency, category, recurrence_days, status
      FROM habits WHERE id = ?
    `).get(compoundId);
    if (!compound || compound.kind !== 'compound') {
      return { error: 'Habit must be compound' };
    }
    if (!Array.isArray(requestedChildren)) return { error: 'children must be an array' };

    const normalized = [];
    const seenIds = new Set();
    for (const rawChild of requestedChildren) {
      const child = typeof rawChild === 'string' ? { id: rawChild } : rawChild;
      if (!child || typeof child !== 'object') {
        return { error: 'Each child must be an id or an object' };
      }
      const id = child.id ? String(child.id) : null;
      if (id && seenIds.has(id)) return { error: 'Child ids must be unique' };
      if (id) seenIds.add(id);

      const existing = id
        ? db.prepare(`
            SELECT id, title, kind, parent_id, preferred_time
            FROM habits WHERE id = ?
          `).get(id)
        : null;
      if (id && (!existing || existing.kind !== 'simple' || existing.id === compoundId)) {
        return { error: 'Every existing child must be a simple habit' };
      }
      if (existing?.parent_id && existing.parent_id !== compoundId) {
        return { error: 'A child cannot belong to two compound habits' };
      }

      const title = child.title !== undefined
        ? stripPriorityPrefix(String(child.title)).trim()
        : existing?.title;
      if (!title) return { error: 'Every child needs a title' };
      const preferredTime = normalizePreferredTime(
        child.preferred_time !== undefined
          ? child.preferred_time
          : existing?.preferred_time || '',
      );
      if (preferredTime === null) {
        return { error: 'Child preferred_time must be HH:MM or empty' };
      }
      normalized.push({ id, title, preferred_time: preferredTime || '' });
    }

    const currentIds = db.prepare('SELECT id FROM habits WHERE parent_id = ?').all(compoundId)
      .map((row) => row.id);
    const retainedIds = new Set(normalized.map((child) => child.id).filter(Boolean));
    const archive = db.prepare(`
      UPDATE habits
      SET status = 'archived', parent_id = NULL, position_in_parent = NULL
      WHERE id = ?
    `);
    currentIds.filter((id) => !retainedIds.has(id)).forEach((id) => archive.run(id));

    const update = db.prepare(`
      UPDATE habits
      SET title = ?, preferred_time = ?, frequency = ?, category = ?,
          recurrence_days = ?, status = ?, parent_id = ?, position_in_parent = ?
      WHERE id = ?
    `);
    const insert = db.prepare(`
      INSERT INTO habits (
        id, title, description, emoji, frequency, category, streak_target, source,
        status, sort_order, recurrence_days, target_value, unit, preferred_time,
        kind, parent_id, position_in_parent
      )
      VALUES (?, ?, '', '', ?, ?, 30, ?, ?, ?, ?, NULL, '', ?, 'simple', ?, ?)
    `);

    normalized.forEach((child, index) => {
      if (child.id) {
        update.run(
          child.title,
          child.preferred_time,
          compound.frequency,
          compound.category,
          compound.recurrence_days || '[]',
          compound.status,
          compoundId,
          index,
          child.id,
        );
        return;
      }
      child.id = randomUUID();
      insert.run(
        child.id,
        child.title,
        compound.frequency,
        compound.category,
        `compound:${compoundId}`,
        compound.status,
        nextSortOrder('habits'),
        compound.recurrence_days || '[]',
        child.preferred_time,
        compoundId,
        index,
      );
    });

    return { updated: normalized.length, ids: normalized.map((child) => child.id) };
  }

  router.post('/', (req, res) => {
    const id = randomUUID();
    const {
      title,
      description = '',
      frequency = 'daily',
      category = 'pessoal',
      streak_target = 30,
      goal_id = null,
      source = 'manual',
      sort_order,
      recurrence_days,
      target_value,
      unit = '',
      preferred_time = '',
      kind = 'simple',
      parent_id = null,
      position_in_parent,
      children_ids,
      children,
      emoji,
      tracking_mode,
      since_date,
      quick_increment,
    } = req.body;

    const normTrackingMode = normalizeTrackingMode(tracking_mode);
    if (normTrackingMode === null) {
      return res.status(400).json({ error: 'Invalid tracking_mode' });
    }
    const habitTrackingMode = normTrackingMode || 'check';
    const normSinceDate = normalizeSinceDate(since_date);
    if (normSinceDate === null) {
      return res.status(400).json({ error: 'Invalid since_date (must be YYYY-MM-DD)' });
    }
    if (habitTrackingMode === 'since' && !normSinceDate) {
      return res.status(400).json({ error: 'Valid since_date is required for tracking_mode=since' });
    }
    const habitSinceDate = normSinceDate || '';
    const habitQuickIncrement = quick_increment !== undefined && quick_increment !== null && quick_increment !== ''
      ? Number(quick_increment)
      : null;

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!HABIT_KINDS.has(kind)) return res.status(400).json({ error: 'Invalid habit kind' });
    const parentError = validateParent(parent_id, kind);
    if (parentError) return res.status(400).json({ error: parentError });
    const freq = HABIT_FREQUENCIES.has(frequency) ? frequency : 'daily';
    const prefTime = normalizePreferredTime(preferred_time);
    if (prefTime === null) {
      return res.status(400).json({ error: 'preferred_time must be HH:MM or empty' });
    }

    const habitTitle = stripPriorityPrefix(title);
    const habitSortOrder = sort_order !== undefined ? Number(sort_order) : nextSortOrder('habits');
    const recDays = normalizeRecurrenceDays(recurrence_days) ?? '[]';
    const tgt = target_value === undefined || target_value === null || target_value === ''
      ? null
      : Number(target_value);
    const childPosition = parent_id
      ? (position_in_parent !== undefined ? Number(position_in_parent) : nextChildPosition(parent_id))
      : null;
    const create = db.transaction(() => {
      db.prepare(`
        INSERT INTO habits (
          id, title, description, emoji, frequency, category, streak_target, goal_id, source,
          sort_order, recurrence_days, target_value, unit, preferred_time, kind,
          parent_id, position_in_parent, tracking_mode, since_date, quick_increment
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, habitTitle, description, kind === 'compound' ? String(emoji || '') : '', freq,
        category, Number(streak_target) || 30,
        goal_id || null, source || 'manual', habitSortOrder, recDays, tgt, unit || '',
        prefTime || '', kind, parent_id || null, childPosition,
        habitTrackingMode, habitSinceDate, habitQuickIncrement
      );

      const requestedChildren = children_ids ?? children;
      if (kind === 'compound' && requestedChildren !== undefined) {
        const result = syncCompoundChildren(id, requestedChildren);
        if (result.error) throw new Error(result.error);
      }
    });
    try {
      create();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const habit = findHabitInTree(
      listHabitTree({ db, getLocalDateString, status: 'all' }),
      id,
    );
    res.status(201).json(habit);
  });

  router.patch('/:id/children', (req, res) => {
    let result;
    try {
      result = db.transaction(() => syncCompoundChildren(
        req.params.id,
        req.body?.ordered_ids ?? req.body?.children_ids ?? req.body?.children,
      ))();
      if (result.error) return res.status(400).json({ error: result.error });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const habit = listHabitTree({ db, getLocalDateString, status: 'all' })
      .find((item) => item.id === req.params.id);
    res.json({ success: true, updated: result.updated, habit });
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Habit not found' });

    const {
      title, description, frequency, category, streak_target, goal_id, source, status,
      sort_order, recurrence_days, target_value, unit, preferred_time, kind,
      parent_id, position_in_parent, children_ids, children, emoji,
      tracking_mode, since_date, quick_increment,
    } = req.body;

    let normTrackingMode;
    if (tracking_mode !== undefined) {
      normTrackingMode = normalizeTrackingMode(tracking_mode);
      if (normTrackingMode === null) {
        return res.status(400).json({ error: 'Invalid tracking_mode' });
      }
    }
    let normSinceDate;
    if (since_date !== undefined) {
      normSinceDate = normalizeSinceDate(since_date);
      if (normSinceDate === null) {
        return res.status(400).json({ error: 'Invalid since_date (must be YYYY-MM-DD)' });
      }
    }
    const effectiveTrackingMode = normTrackingMode ?? existing.tracking_mode ?? 'check';
    const effectiveSinceDate = normSinceDate !== undefined ? normSinceDate : (existing.since_date || '');
    if (effectiveTrackingMode === 'since' && !effectiveSinceDate) {
      return res.status(400).json({ error: 'Valid since_date is required for tracking_mode=since' });
    }

    if (status !== undefined && status !== null && !HABIT_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (frequency !== undefined && frequency !== null && !HABIT_FREQUENCIES.has(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }
    if (kind !== undefined && !HABIT_KINDS.has(kind)) {
      return res.status(400).json({ error: 'Invalid habit kind' });
    }
    const nextKind = kind ?? existing.kind;
    const nextParentId = parent_id !== undefined ? parent_id : existing.parent_id;
    const parentError = validateParent(nextParentId, nextKind, existing.id);
    if (parentError) return res.status(400).json({ error: parentError });

    const recDays = recurrence_days !== undefined ? normalizeRecurrenceDays(recurrence_days) : null;
    const tgt = target_value !== undefined
      ? (target_value === null || target_value === '' ? null : Number(target_value))
      : undefined;
    let prefTime;
    if (preferred_time !== undefined) {
      prefTime = normalizePreferredTime(preferred_time);
      if (prefTime === null) {
        return res.status(400).json({ error: 'preferred_time must be HH:MM or empty' });
      }
    }
    const habitQuickIncrement = quick_increment !== undefined
      ? (quick_increment === null || quick_increment === '' ? null : Number(quick_increment))
      : undefined;
    const shouldUpdatePosition = position_in_parent !== undefined || parent_id !== undefined;
    const nextPosition = position_in_parent !== undefined
      ? (position_in_parent === null ? null : Number(position_in_parent))
      : parent_id
        ? nextChildPosition(parent_id)
        : null;

    const requestedChildren = children_ids ?? children;
    const update = db.transaction(() => {
      db.prepare(`
        UPDATE habits SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          emoji = CASE WHEN ? = 1 THEN ? ELSE emoji END,
          frequency = COALESCE(?, frequency),
          category = COALESCE(?, category),
          streak_target = COALESCE(?, streak_target),
          goal_id = COALESCE(?, goal_id),
          source = COALESCE(?, source),
          status = COALESCE(?, status),
          sort_order = COALESCE(?, sort_order),
          recurrence_days = COALESCE(?, recurrence_days),
          target_value = COALESCE(?, target_value),
          unit = COALESCE(?, unit),
          preferred_time = COALESCE(?, preferred_time),
          kind = COALESCE(?, kind),
          parent_id = CASE WHEN ? = 1 THEN ? ELSE parent_id END,
          position_in_parent = CASE WHEN ? = 1 THEN ? ELSE position_in_parent END,
          tracking_mode = COALESCE(?, tracking_mode),
          since_date = COALESCE(?, since_date),
          quick_increment = CASE WHEN ? = 1 THEN ? ELSE quick_increment END
        WHERE id = ?
      `).run(
        title !== undefined ? stripPriorityPrefix(title) : null,
        description,
        emoji !== undefined ? 1 : 0,
        emoji !== undefined ? String(emoji || '') : null,
        frequency,
        category,
        streak_target !== undefined ? Number(streak_target) : null,
        goal_id,
        source,
        status,
        sort_order !== undefined ? Number(sort_order) : null,
        recDays,
        tgt !== undefined ? tgt : null,
        unit,
        prefTime !== undefined ? prefTime : null,
        kind ?? null,
        parent_id !== undefined ? 1 : 0,
        parent_id || null,
        shouldUpdatePosition ? 1 : 0,
        nextPosition,
        normTrackingMode ?? null,
        normSinceDate ?? null,
        quick_increment !== undefined ? 1 : 0,
        habitQuickIncrement !== undefined ? habitQuickIncrement : null,
        req.params.id
      );

      if (requestedChildren !== undefined) {
        const result = syncCompoundChildren(req.params.id, requestedChildren);
        if (result.error) throw new Error(result.error);
      }
      if (nextKind === 'compound' && status !== undefined) {
        db.prepare('UPDATE habits SET status = ? WHERE parent_id = ?').run(status, req.params.id);
      }
    });
    try {
      update();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const habit = findHabitInTree(
      listHabitTree({ db, getLocalDateString, status: 'all' }),
      req.params.id,
    )
      || db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
    res.json(habit);
  });

  router.delete('/:id', (req, res) => {
    const habitId = req.params.id;
    const habit = db.prepare('SELECT kind FROM habits WHERE id = ?').get(habitId);
    db.transaction(() => {
      if (habit?.kind === 'compound') {
        db.prepare(`
          UPDATE habits
          SET status = 'archived', parent_id = NULL, position_in_parent = NULL
          WHERE parent_id = ?
        `).run(habitId);
      }
      // Delete logs first (FK dependency)
      db.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(habitId);
      // Remove from rituals (habits_order JSON arrays)
      const rituals = db.prepare('SELECT id, habits_order FROM rituals').all();
      for (const r of rituals) {
        try {
          const order = JSON.parse(r.habits_order || '[]');
          if (order.includes(habitId)) {
            const updated = order.filter(h => h !== habitId);
            db.prepare('UPDATE rituals SET habits_order = ? WHERE id = ?').run(JSON.stringify(updated), r.id);
          }
        } catch {}
      }
      db.prepare('DELETE FROM habits WHERE id = ?').run(habitId);
    })();
    res.json({ success: true });
  });

  router.get('/:id/streak', (req, res) => {
    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    if (habit.kind === 'compound') {
      return res.json({
        habit_id: habit.id,
        title: habit.title,
        current_streak: null,
        best_streak: null,
      });
    }
    if (isSinceHabit(habit)) {
      const days = daysSinceDate(habit.since_date, getLocalDateString());
      return res.json({
        habit_id: habit.id,
        title: habit.title,
        current_streak: days,
        best_streak: Math.max(Number(habit.best_streak) || 0, days),
      });
    }
    const { current_streak, best_streak } = getStreaksForHabit(
      db,
      req.params.id,
      getLocalDateString,
    );
    res.json({ habit_id: habit.id, title: habit.title, current_streak, best_streak });
  });



  return router;
}

export function registerHabitLogRoutes(app, ctx) {
  const { db, HABIT_OUTCOMES, SKIP_REASONS } = ctx;

  // ==================== HABIT LOGS ====================
  app.get('/api/habit-logs', (req, res) => {
    const { date, habit_id, from, to } = req.query;
    let query = 'SELECT * FROM habit_logs WHERE 1=1';
    const params = [];

    if (date) { query += ' AND date = ?'; params.push(date); }
    if (from) { query += ' AND date >= ?'; params.push(from); }
    if (to) { query += ' AND date <= ?'; params.push(to); }
    if (habit_id) { query += ' AND habit_id = ?'; params.push(habit_id); }

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  });

  function normalizeHabitOutcome(body = {}) {
    const rawOutcome = body.outcome != null ? String(body.outcome).toLowerCase().trim() : null;
    let outcome = rawOutcome && HABIT_OUTCOMES.has(rawOutcome) ? rawOutcome : null;
    if (!outcome) {
      // Compat: completed:true → done; completed:false alone is invalid without outcome
      if (body.completed === false || body.completed === 0 || body.completed === '0') {
        outcome = null;
      } else {
        outcome = 'done';
      }
    }
    if (!outcome) {
      return { error: 'outcome required (done|skipped), or completed:true for done' };
    }

    let skip_reason = null;
    if (body.skip_reason != null && body.skip_reason !== '') {
      const r = String(body.skip_reason).toLowerCase().trim();
      if (!SKIP_REASONS.has(r)) {
        return { error: 'skip_reason must be time|energy|context|other' };
      }
      skip_reason = r;
    }

    // Free-text honest name of the miss ("eu escolhi o fácil")
    let note = '';
    const rawNote = body.note != null ? body.note : body.skip_note;
    if (rawNote != null && String(rawNote).trim() !== '') {
      note = String(rawNote).trim().slice(0, 280);
    }

    if (outcome === 'skipped') {
      return { outcome: 'skipped', completed: 0, skip_reason, note, value: null };
    }

    return {
      outcome: 'done',
      completed: 1,
      skip_reason: null,
      note: '',
      value: body.value,
    };
  }

  app.post('/api/habit-logs', (req, res) => {
    const { habit_id, date } = req.body || {};

    if (!habit_id || !date) return res.status(400).json({ error: 'habit_id and date required' });

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habit_id);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    if (habit.kind === 'compound') {
      return res.status(400).json({ error: 'Compound habits are completed through their steps' });
    }
    if (isSinceHabit(habit)) {
      return res.status(400).json({ error: 'Hábitos do tipo since são contadores e não aceitam check diário' });
    }

    const normalized = normalizeHabitOutcome(req.body || {});
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    let completedFlag = normalized.completed;
    let logValue = normalized.value === undefined || normalized.value === null || normalized.value === ''
      ? null
      : Number(normalized.value);

    const inc = req.body?.increment ?? req.body?.delta;
    if (inc !== undefined && inc !== null && inc !== '') {
      const existingRow = db.prepare('SELECT value FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit_id, date);
      const baseVal = (existingRow && existingRow.value != null && Number.isFinite(Number(existingRow.value)))
        ? Number(existingRow.value)
        : 0;
      logValue = Math.round((baseVal + Number(inc)) * 1000) / 1000;
    }

    let outcome = normalized.outcome;
    let skipReason = normalized.skip_reason;
    let note = normalized.note || '';

    if (outcome === 'done' && habit.target_value != null && Number(habit.target_value) > 0) {
      if (logValue == null || Number.isNaN(logValue)) {
        logValue = Number(habit.target_value);
        completedFlag = 1;
        outcome = 'done';
      } else if (logValue >= Number(habit.target_value)) {
        completedFlag = 1;
        outcome = 'done';
      } else {
        completedFlag = 0;
        outcome = null;
      }
    }

    if (outcome === 'skipped') {
      completedFlag = 0;
      logValue = null;
    } else if (completedFlag === 1) {
      skipReason = null;
      note = '';
    } else {
      skipReason = null;
      note = '';
    }

    const existing = db.prepare('SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit_id, date);
    if (existing) {
      db.prepare(
        'UPDATE habit_logs SET completed = ?, value = ?, outcome = ?, skip_reason = ?, note = ? WHERE id = ?',
      ).run(completedFlag, logValue, outcome, skipReason, note, existing.id);
      const row = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(existing.id);
      return res.json(row);
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO habit_logs (id, habit_id, date, completed, value, outcome, skip_reason, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, habit_id, date, completedFlag, logValue, outcome, skipReason, note);

    const row = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(id);
    res.status(201).json(row);
  });

  app.delete('/api/habit-logs/:id', (req, res) => {
    db.prepare('DELETE FROM habit_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });
}
