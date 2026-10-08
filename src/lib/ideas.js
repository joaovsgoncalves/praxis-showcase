export const IDEA_STATUSES = ['capturada', 'promissora', 'virou_tarefa', 'arquivada'];

export const IDEA_STATUS_LABELS = {
  capturada: 'Capturada',
  promissora: 'Promissora',
  virou_tarefa: 'Virou tarefa',
  arquivada: 'Arquivada',
};

export function cleanIdeaTitle(title = '') {
  const cleaned = String(title).replace(/^\s*Ideia\s*:\s*/i, '').trim();
  return cleaned || title;
}

export function isIdeaActive(status) {
  return status !== 'arquivada' && status !== 'virou_tarefa';
}

/** Ideias para revisão semanal: promissoras + capturadas recentes */
export function ideasForWeeklyReview(ideas, days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return ideas.filter((idea) => {
    if (idea.idea_status === 'promissora') return true;
    if (idea.idea_status === 'capturada' || !idea.idea_status) {
      const t = new Date(idea.created_date || idea.updated_date || 0).getTime();
      return t >= cutoff;
    }
    return false;
  });
}