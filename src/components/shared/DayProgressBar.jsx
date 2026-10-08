import React from 'react';
import { countHabitDayOutcomes } from '@/lib/habits';

export default function DayProgressBar({ habits = [], habitLogs = [], tasks = [] }) {
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const isTaskDone = (task) => task.status === 'completed' || task.status === 'done';

  const { done: completedHabits, skipped: skippedHabits, open: openHabits } = countHabitDayOutcomes(
    habits,
    habitLogs,
    today,
  );

  const completedTasks = tasks.filter(t => isTaskDone(t)).length;
  const totalItems = habits.length + tasks.length;
  // Only done habits count as completion (skip is closed but not victory)
  const completedItems = completedHabits + completedTasks;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getLabel = () => {
    if (pct === 0) return 'Vamos lá! 💪';
    if (pct < 30) return 'Começando...';
    if (pct < 60) return 'Indo bem!';
    if (pct < 90) return 'Quase lá! 🔥';
    return 'Dia incrível! 🏆';
  };

  const habitLine = skippedHabits > 0
    ? `${completedHabits} feitos · ${skippedHabits} não rolou · ${openHabits} abertos`
    : `${completedHabits}/${habits.length} hábitos`;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Progresso do dia</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{getLabel()}</span>
          <span className="text-sm font-bold text-gold">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{
            width: `${pct}%`,
            background: pct >= 80
              ? 'linear-gradient(90deg, hsl(265 85% 65%), hsl(160 80% 50%))'
              : 'linear-gradient(90deg, hsl(40 95% 55%), hsl(35 100% 50%))',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{habitLine}</span>
        <span>{completedTasks}/{tasks.length} tarefas</span>
      </div>
    </div>
  );
}