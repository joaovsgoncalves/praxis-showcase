import { isHabitDueOnDate } from '@/lib/habits';
import { fortalezaDateKey } from '@/lib/dates';

function addDaysYmd(ymd, n) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * Progresso da meta a partir de tarefas e hábitos vinculados (onda 9).
 */
export function computeGoalProgress(goal, tasks = [], habits = [], habitLogs = []) {
  const linkedTasks = tasks.filter((t) => t.goal_id === goal.id && t.category !== 'ideias');
  const linkedHabits = habits.filter((h) => h.goal_id === goal.id);

  let taskPct = null;
  if (linkedTasks.length > 0) {
    const done = linkedTasks.filter((t) => t.status === 'completed').length;
    taskPct = Math.round((done / linkedTasks.length) * 100);
  }

  let habitPct = null;
  if (linkedHabits.length > 0) {
    const today = fortalezaDateKey();
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDaysYmd(today, -i));
    let slots = 0;
    let done = 0;
    for (const day of days) {
      for (const h of linkedHabits) {
        if (h.status !== 'active') continue;
        if (!isHabitDueOnDate(h, day)) continue;
        slots += 1;
        const log = habitLogs.find((l) => l.habit_id === h.id && l.date === day);
        if (log && (log.completed === 1 || log.completed === true)) done += 1;
      }
    }
    habitPct = slots > 0 ? Math.round((done / slots) * 100) : 0;
  }

  if (taskPct === null && habitPct === null) {
    return Number(goal.manual_progress) || 0;
  }
  if (taskPct !== null && habitPct !== null) {
    return Math.round((taskPct + habitPct) / 2);
  }
  return taskPct ?? habitPct ?? 0;
}

export function goalProgressDetail(goal, tasks, habits, habitLogs) {
  const linkedTasks = tasks.filter((t) => t.goal_id === goal.id && t.category !== 'ideias');
  const linkedHabits = habits.filter((h) => h.goal_id === goal.id);
  const pct = computeGoalProgress(goal, tasks, habits, habitLogs);
  const tasksDone = linkedTasks.filter((t) => t.status === 'completed').length;
  return {
    percent: pct,
    tasksLabel: linkedTasks.length ? `${tasksDone}/${linkedTasks.length} tarefas` : null,
    habitsLabel: linkedHabits.length ? `${linkedHabits.length} hábito(s) · 7 dias` : null,
  };
}