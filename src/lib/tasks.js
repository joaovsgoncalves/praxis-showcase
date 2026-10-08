export const isTaskDone = (task) =>
  task?.status === 'completed' || task?.status === 'done';

export const isTaskClosed = (task) =>
  isTaskDone(task) || task?.status === 'cancelled';

export const isTaskOpen = (task) =>
  task?.status === 'pending' || task?.status === 'in_progress';

export const isInboxTask = (task) =>
  Boolean(isTaskOpen(task) && !(task?.date && String(task.date).trim()));

export const taskCompletionDate = (task) => (
  task?.completed_date || String(task?.completed_at || task?.updated_date || '').slice(0, 10)
);

export function isTaskForToday(task, today) {
  return (task?.date || '').slice(0, 10) === today;
}

export function isTaskCompletedForToday(task, today) {
  if (!isTaskDone(task)) return false;
  const wasCompletedToday = taskCompletionDate(task) === today;
  const legacyCompletedTodayTask = !task?.completed_date && task?.date === today;
  return wasCompletedToday || legacyCompletedTodayTask;
}

/** Lista operacional do dia: pendentes só com data=hoje; concluídas só se fechadas hoje. */
export function isTaskRelevantForTodayList(task, today) {
  if (task?.status === 'cancelled') return false;
  if (isTaskOpen(task)) return isTaskForToday(task, today);
  return isTaskCompletedForToday(task, today);
}

export function sortTodayRelevantTasks(a, b) {
  const aDone = isTaskDone(a);
  const bDone = isTaskDone(b);
  if (aDone !== bDone) return aDone ? 1 : -1;

  const dateCompare = String(a?.date || '').localeCompare(String(b?.date || ''));
  if (dateCompare !== 0) return dateCompare;

  return String(a?.time || '').localeCompare(String(b?.time || ''));
}
export function cleanPriorityPrefix(title = "") {
  const cleaned = String(title).replace(/^\s*P\d+\s*(?:[—–-]|:|\.)\s*/i, "").trim();
  return cleaned || title;
}
