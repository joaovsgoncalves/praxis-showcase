/**
 * Próxima data de tarefa recorrente (espelha api/taskRecurrence.js).
 * @param {string} fromDate YYYY-MM-DD
 * @param {string} recurrence none|daily|weekly|monthly
 * @param {string|number[]} recurrenceDaysJson
 */
export function nextRecurrenceDate(fromDate, recurrence, recurrenceDaysJson) {
  if (!fromDate || !recurrence || recurrence === 'none') return null;
  const base = new Date(`${fromDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;

  if (recurrence === 'daily') {
    base.setDate(base.getDate() + 1);
    return base.toISOString().split('T')[0];
  }

  if (recurrence === 'weekly') {
    let days = [];
    try {
      days =
        typeof recurrenceDaysJson === 'string'
          ? JSON.parse(recurrenceDaysJson || '[]')
          : recurrenceDaysJson || [];
    } catch {
      days = [];
    }
    if (!Array.isArray(days) || days.length === 0) {
      base.setDate(base.getDate() + 7);
      return base.toISOString().split('T')[0];
    }
    const allowed = new Set(days.map(Number).filter((n) => n >= 0 && n <= 6));
    for (let i = 1; i <= 7; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      if (allowed.has(d.getDay())) return d.toISOString().split('T')[0];
    }
    base.setDate(base.getDate() + 7);
    return base.toISOString().split('T')[0];
  }

  if (recurrence === 'monthly') {
    const originalDay = base.getDate();
    const target = new Date(base);
    target.setDate(1);
    target.setMonth(target.getMonth() + 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(originalDay, lastDay));
    return target.toISOString().split('T')[0];
  }

  return null;
}

export const TASK_RECURRENCE_LABELS = {
  none: 'Sem recorrência',
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export function parseTaskRecurrenceDays(task) {
  if (!task?.recurrence_days) return [];
  try {
    const raw =
      typeof task.recurrence_days === 'string'
        ? JSON.parse(task.recurrence_days)
        : task.recurrence_days;
    return Array.isArray(raw) ? raw.map(Number).filter((n) => n >= 0 && n <= 6) : [];
  } catch {
    return [];
  }
}

export function formatTaskRecurrenceLabel(task) {
  if (!task?.recurrence || task.recurrence === 'none') return '';
  const base = TASK_RECURRENCE_LABELS[task.recurrence] || task.recurrence;
  if (task.recurrence === 'weekly') {
    const days = parseTaskRecurrenceDays(task);
    if (days.length) {
      const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return `${base} (${days.sort((a, b) => a - b).map((d) => names[d]).join(', ')})`;
    }
  }
  return base;
}

export function getNextOccurrencePreview(task, allTasks = []) {
  if (!task?.recurrence || task.recurrence === 'none') return null;
  const baseDate = task.date;
  if (!baseDate) return null;
  const nextDate = nextRecurrenceDate(baseDate, task.recurrence, task.recurrence_days);
  if (!nextDate) return null;
  const parentRef = task.recurrence_parent_id || task.id;
  const existing = allTasks.find(
    (t) =>
      (t.recurrence_parent_id === parentRef || t.id === parentRef) &&
      t.date === nextDate &&
      t.status !== 'completed' &&
      t.status !== 'done' &&
      t.status !== 'cancelled',
  );
  return { nextDate, alreadyScheduled: Boolean(existing) };
}