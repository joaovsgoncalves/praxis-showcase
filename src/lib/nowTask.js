import { isTaskDone, isTaskOpen } from './tasks';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function isP0Title(title) {
  return /^P0[\s:\-]/i.test(String(title || '').trim());
}

function comparePending(a, b) {
  const pr = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
  if (pr !== 0) return pr;
  const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
  if (dateCmp !== 0) return dateCmp;
  return String(a.time || '').localeCompare(String(b.time || ''));
}

/**
 * Próxima ação: pendente com horário hoje → atrasada mais antiga → alta/P0 sem hora hoje → qualquer pendente hoje.
 */
export function pickNowTask(tasks, today) {
  const pending = (tasks || []).filter((t) => isTaskOpen(t) && !isTaskDone(t));
  if (!pending.length) return null;

  const withTimeToday = pending
    .filter((t) => t.date === today && t.time)
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (withTimeToday.length) return withTimeToday[0];

  const overdue = pending
    .filter((t) => t.date && t.date < today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || comparePending(a, b));
  if (overdue.length) return overdue[0];

  const highTodayNoTime = pending
    .filter((t) => t.date === today && !t.time && (t.priority === 'high' || isP0Title(t.title)))
    .sort(comparePending);
  if (highTodayNoTime.length) return highTodayNoTime[0];

  const anyToday = pending.filter((t) => t.date === today).sort(comparePending);
  if (anyToday.length) return anyToday[0];

  return null;
}

export function formatTaskTimeLabel(task) {
  if (!task?.time) return null;
  return task.time.slice(0, 5);
}

export function isTaskOverdue(task, today) {
  return Boolean(task?.date && task.date < today && isTaskOpen(task));
}