import { isTaskDone, isTaskOpen } from './tasks.js';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function comparePriorityTasks(a, b, today) {
  const aOverdue = a.date < today;
  const bOverdue = b.date < today;
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  if (aOverdue && a.date !== b.date) return a.date.localeCompare(b.date);

  const priority = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
  if (priority !== 0) return priority;

  const aHasTime = Boolean(a.time);
  const bHasTime = Boolean(b.time);
  if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;

  if (aHasTime && a.time !== b.time) return a.time.localeCompare(b.time);
  return String(a.id).localeCompare(String(b.id));
}

function bestTask(tasks, today) {
  return [...tasks].sort((a, b) => comparePriorityTasks(a, b, today))[0] || null;
}

export function pickTodayPriorities(tasks, today) {
  const universe = (tasks || [])
    .filter((task) => (
      isTaskOpen(task)
      && !isTaskDone(task)
      && task.category !== 'ideias'
      && task.date
      && (task.date < today || task.date === today)
    ));

  const renda = bestTask(universe.filter((task) => task.category === 'farmacia'), today);
  const avanco = bestTask(universe.filter((task) => task.category === 'gofluxo'), today);
  const usedIds = new Set([renda?.id, avanco?.id].filter(Boolean).map(String));
  const obrigatorio = bestTask(universe.filter((task) => (
    !usedIds.has(String(task.id))
    && (task.date < today || task.time || task.priority === 'high' || task.category === 'estudo')
  )), today);

  return { obrigatorio, renda, avanco };
}
