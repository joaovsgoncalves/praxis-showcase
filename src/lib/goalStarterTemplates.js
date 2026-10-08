import { addDays, format } from 'date-fns';

/** Templates onda 23 — primeira meta quando zero ativas */
export const GOAL_STARTER_TEMPLATES = [
  {
    id: 'rca',
    label: 'RCA / campo',
    emoji: '💼',
    title: 'Bater meta comercial RCA no trimestre',
    description: 'Rotina de campo + follow-up sem ruído.',
    category: 'professional',
    timeframe: 'medium',
    deadlineDays: 90,
    linkType: 'task',
    linkTitle: 'Listar 5 PDVs prioritários da semana',
  },
  {
    id: 'encarte',
    label: 'EncarteZap',
    emoji: '📲',
    title: 'Fechar 3 clientes EncarteZap',
    description: 'Renda extra #1 — venda e implantação.',
    category: 'finance',
    timeframe: 'short',
    deadlineDays: 60,
    linkType: 'task',
    linkTitle: 'Agendar demo EncarteZap com 1 lead',
  },
  {
    id: 'corpo',
    label: 'Corpo / @jv.fit',
    emoji: '💪',
    title: 'Consistência treino + conteúdo fit',
    description: 'Treinar e publicar sem depender de motivação.',
    category: 'health',
    timeframe: 'short',
    deadlineDays: 45,
    linkType: 'habit',
    linkTitle: 'Treino ou cardio 30 min',
  },
];

export function deadlineFromToday(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return format(d, 'yyyy-MM-dd');
}

export function goalPayloadFromStarter(templateId) {
  const t = GOAL_STARTER_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return null;
  const deadline = deadlineFromToday(t.deadlineDays);
  return {
    title: t.title,
    description: t.description,
    deadline,
    timeframe: t.timeframe,
    category: t.category,
    initial_link: {
      type: t.linkType,
      title: t.linkTitle,
      date: t.linkType === 'task' ? deadlineFromToday(7) : undefined,
      frequency: t.linkType === 'habit' ? 'daily' : undefined,
    },
  };
}

const DISMISS_KEY = 'praxis:suggest-goal-dismissed';

export function isGoalSuggestDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissGoalSuggest() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {}
}