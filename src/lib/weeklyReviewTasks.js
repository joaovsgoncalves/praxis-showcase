import { addDays, format } from 'date-fns';

/** Títulos para até 3 tarefas a partir da revisão semanal (onda 23). */
export function pickWeeklyTaskTitles({ suggestedPriorities = [], nextWeekFocus = '' }) {
  const fromInsight = (suggestedPriorities || []).filter(Boolean).slice(0, 3);
  if (fromInsight.length >= 3) return fromInsight;

  const lines = String(nextWeekFocus || '')
    .split(/\n|[•;]/)
    .map((s) => s.replace(/^\d+[\).\s-]+/, '').trim())
    .filter((s) => s.length >= 4);

  const merged = [...fromInsight];
  for (const line of lines) {
    if (merged.length >= 3) break;
    if (!merged.includes(line)) merged.push(line);
  }

  while (merged.length < 3) {
    const fillers = [
      'Bloco de foco 45 min (prioridade #1)',
      'Revisar atrasadas e arquivar ruído',
      'Preparar semana: 3 tarefas no Praxis',
    ];
    const next = fillers[merged.length];
    if (!merged.includes(next)) merged.push(next);
    else break;
  }

  return merged.slice(0, 3);
}

/** Segunda da próxima semana + espaçamento 0/2/4 dias. */
export function taskDatesForNextWeek(weekStartMonday) {
  const base = new Date(`${weekStartMonday}T12:00:00`);
  const nextMonday = addDays(base, 7);
  return [0, 2, 4].map((offset) => format(addDays(nextMonday, offset), 'yyyy-MM-dd'));
}