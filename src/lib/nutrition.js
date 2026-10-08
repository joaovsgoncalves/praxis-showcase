/** Nutrição — labels e helpers de UI (fase 0–1) */

/** Ordem canônica do diário (UI + seletor). */
export const MEAL_SLOTS = [
  'breakfast',
  'snack_morning',
  'lunch',
  'snack_afternoon',
  'dinner',
];

/** Aceitos na API/UI; legado mapeado por normalizeMealSlot. */
export const MEAL_SLOTS_LEGACY = ['snack', 'other'];

export const MEAL_SLOT_LABELS = {
  breakfast: 'Café',
  snack_morning: 'Lanche da manhã',
  lunch: 'Almoço',
  snack_afternoon: 'Lanche da tarde',
  dinner: 'Jantar',
  // legado (só se algum log antigo ainda aparecer cru)
  snack: 'Lanche da manhã',
  other: 'Lanche da tarde',
};

/** snack → manhã; other → tarde (pré/lanche flexível). */
export function normalizeMealSlot(slot) {
  if (slot === 'snack') return 'snack_morning';
  if (slot === 'other') return 'snack_afternoon';
  if (MEAL_SLOTS.includes(slot)) return slot;
  return 'snack_afternoon';
}

export const GOAL_LABELS = {
  lose: 'Emagrecer',
  maintain: 'Manter',
  gain: 'Ganhar massa',
};

export const ACTIVITY_LABELS = {
  sedentary: 'Pouco ativo',
  light: 'Leve (1–3x/sem)',
  moderate: 'Moderado (3–5x/sem)',
  active: 'Ativo (6–7x/sem)',
  very: 'Muito ativo',
};

export const SEX_LABELS = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
};

/** Cores fixas p/ barras (fase 4 reutiliza) */
export const MACRO_COLORS = {
  kcal: 'bg-primary',
  protein: 'bg-blue-500/80',
  carbs: 'bg-amber-500/80',
  fat: 'bg-violet-500/80',
};

export function formatKcal(n) {
  if (n == null || n === '') return '—';
  const v = Math.round(Number(n) || 0);
  return `${v.toLocaleString('pt-BR')} kcal`;
}

export function formatGrams(n) {
  if (n == null || n === '') return '—';
  const v = Math.round((Number(n) || 0) * 10) / 10;
  const text = Number.isInteger(v) ? String(v) : v.toLocaleString('pt-BR');
  return `${text} g`;
}

export function isNutritionEnabled(settings) {
  if (!settings) return true;
  const flag = settings.nutrition_enabled;
  if (flag === 0 || flag === false || flag === '0') return false;
  return true;
}

export function isNutritionShowOnToday(settings) {
  if (!settings) return true;
  const flag = settings.nutrition_show_on_today;
  if (flag === 0 || flag === false || flag === '0') return false;
  return true;
}

export const REGIMEN_KIND_LABELS = {
  supplement: 'Suplemento',
  medication: 'Remédio',
};

export const REGIMEN_TIMING_LABELS = {
  morning: 'Manhã',
  pre_workout: 'Pré-treino',
  post_workout: 'Pós-treino',
  night: 'Noite',
  anytime: 'Qualquer hora',
};

export const REGIMEN_FREQUENCY_LABELS = {
  daily: 'Todo dia',
  training_day: 'Dia de treino',
  as_needed: 'Se precisar',
};

export const REGIMEN_TIMING_ORDER = [
  'morning',
  'pre_workout',
  'post_workout',
  'night',
  'anytime',
];

/** kcal teóricas de macros (4/4/9) — aviso se divergir da meta kcal */
export function macrosImpliedKcal({ protein_g, carbs_g, fat_g }) {
  return Math.round(
    (Number(protein_g) || 0) * 4 + (Number(carbs_g) || 0) * 4 + (Number(fat_g) || 0) * 9,
  );
}
