export const CATEGORIES = {
  farmacia: { emoji: '💼', label: 'Trabalho', color: 'green' },
  gofluxo: { emoji: '🤝', label: 'GoFluxo', color: 'amber' },
  treino: { emoji: '💪', label: 'Treino', color: 'red' },
  estudo: { emoji: '📚', label: 'Estudo', color: 'purple' },
  jotav_fit: { emoji: '📸', label: '@jotav.fit', color: 'pink' },
  ideias: { emoji: '💡', label: 'Ideias', color: 'cyan' },
  pessoal: { emoji: '🏠', label: 'Pessoal', color: 'yellow' },
  rotina: { emoji: '🔥', label: 'Rotina', color: 'orange' },
  wellness: { emoji: '🧘', label: 'Bem-estar', color: 'green' },
};

export function enrichCategory(row) {
  if (row.category && CATEGORIES[row.category]) {
    return {
      ...row,
      category_emoji: CATEGORIES[row.category].emoji,
      category_label: CATEGORIES[row.category].label,
    };
  }
  return { ...row, category_emoji: null, category_label: null };
}
