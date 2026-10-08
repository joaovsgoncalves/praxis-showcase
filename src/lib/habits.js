/**
 * Hábitos — status e frequência (Praxis onda 3)
 *
 * status:
 * - active: aparece no dia quando a frequência exige; pode marcar check-in
 * - paused: fora do "hoje"; logs preservados; retomar → active
 * - archived: histórico só; não conta no dia; logs preservados
 *
 * pause/archive NUNCA apagam habit_logs (streak recalcula ao retomar com dados intactos).
 */

export const HABIT_STATUSES = ['active', 'paused', 'archived'];

export const HABIT_STATUS_LABELS = {
  active: 'Ativo',
  paused: 'Pausado',
  archived: 'Arquivado',
};

export const FREQUENCY_LABELS = {
  daily: 'Diário',
  weekdays: 'Dias úteis',
  weekends: 'Fins de semana',
  weekly: 'Semanal',
};

const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function parseRecurrenceDays(habit) {
  if (!habit?.recurrence_days) return [];
  try {
    const raw = typeof habit.recurrence_days === 'string'
      ? JSON.parse(habit.recurrence_days)
      : habit.recurrence_days;
    return Array.isArray(raw)
      ? [...new Set(raw.map(Number).filter((n) => n >= 0 && n <= 6))]
      : [];
  } catch {
    return [];
  }
}

export function formatFrequencyLabel(habit) {
  if (!habit) return '';
  const base = FREQUENCY_LABELS[habit.frequency] || habit.frequency;
  if (habit.frequency === 'weekly') {
    const days = parseRecurrenceDays(habit);
    if (days.length) {
      const names = [...days].sort((a, b) => a - b).map((d) => DOW_SHORT[d]);
      return `Semanal (${names.join(', ')})`;
    }
  }
  return base;
}

/** dateKey: YYYY-MM-DD (Fortaleza / local do app) */
export function isHabitDueOnDate(habit, dateKey) {
  if (!habit || habit.status !== 'active') return false;
  if (habit.tracking_mode === 'since') return false;
  const d = new Date(`${dateKey}T12:00:00`);
  const dow = d.getDay();
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 1 && dow <= 5;
    case 'weekends':
      return dow === 0 || dow === 6;
    case 'weekly': {
      const days = parseRecurrenceDays(habit);
      if (!days.length) return true;
      return days.includes(dow);
    }
    default:
      return true;
  }
}

export function isQuantitativeHabit(habit) {
  return habit?.target_value != null && Number(habit.target_value) > 0;
}

export function isQuickIncrementHabit(habit) {
  return isQuantitativeHabit(habit) && habit?.quick_increment != null && Number(habit.quick_increment) > 0;
}

export function formatHabitProgress(currentValue, targetValue, unit = "") {
  const current = Number(currentValue) || 0;
  const target = Number(targetValue) || 0;
  const cleanCurrent = Math.round(current * 1000) / 1000;
  const cleanTarget = Math.round(target * 1000) / 1000;
  const formattedCurrent = String(cleanCurrent).replace(".", ",");
  const formattedTarget = String(cleanTarget).replace(".", ",");
  return formattedCurrent + " / " + formattedTarget + (unit ? " " + unit : "");
}

export function formatQuickIncrementButtonLabel(habit) {
  if (!habit?.quick_increment) return "";
  const inc = Number(habit.quick_increment);
  const unit = String(habit.unit || "").trim();
  if ((unit === "L" || unit === "l") && inc === 0.5) {
    return "+500 ml";
  }
  if ((unit === "L" || unit === "l") && inc < 1) {
    return "+" + Math.round(inc * 1000) + " ml";
  }
  const clean = Math.round(inc * 1000) / 1000;
  return "+" + String(clean).replace(".", ",") + (unit ? " " + unit : "");
}

export function formatQuickIncrementAriaLabel(habit) {
  const label = formatQuickIncrementButtonLabel(habit);
  const title = habit?.title || "";
  return "Adicionar " + label.replace("+", "") + " — " + title;
}

/** Normalize / display preferred clock time (HH:MM). */
export function normalizePreferredTime(value) {
  if (value == null || value === '') return '';
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return '';
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function formatPreferredTime(value) {
  const t = normalizePreferredTime(value);
  return t || '';
}

/** Sort habits: with clock first (ascending), then untitled times, keep stable. */
export function compareHabitsByPreferredTime(a, b) {
  const ta = normalizePreferredTime(a?.preferred_time) || '99:99';
  const tb = normalizePreferredTime(b?.preferred_time) || '99:99';
  if (ta !== tb) return ta.localeCompare(tb);
  return 0;
}

export function todayLogForHabit(habitLogs, habitId, dateKey) {
  return habitLogs.find((log) => log.habit_id === habitId && log.date === dateKey);
}

/** Day outcome: open | done | skipped */
export const DAY_OUTCOMES = {
  open: 'open',
  done: 'done',
  skipped: 'skipped',
};

export const DAY_OUTCOME_LABELS = {
  open: 'Aberto',
  done: 'Feito',
  skipped: 'Não rolou',
};

export const SKIP_REASONS = [
  { value: 'time', label: 'Tempo' },
  { value: 'energy', label: 'Energia' },
  { value: 'context', label: 'Contexto' },
  { value: 'other', label: 'Outro' },
];

export const SKIP_REASON_LABELS = Object.fromEntries(
  SKIP_REASONS.map((r) => [r.value, r.label]),
);

export function isHabitLogDone(log) {
  if (!log) return false;
  if (log.outcome === 'skipped') return false;
  if (log.outcome === 'done') return true;
  return log.completed === 1 || log.completed === true;
}

export function isHabitLogSkipped(log) {
  if (!log) return false;
  return log.outcome === 'skipped';
}

/** open | done | skipped */
export function getHabitDayOutcome(log) {
  if (!log) return DAY_OUTCOMES.open;
  if (isHabitLogSkipped(log)) return DAY_OUTCOMES.skipped;
  if (isHabitLogDone(log)) return DAY_OUTCOMES.done;
  return DAY_OUTCOMES.open;
}

export function habitDayOutcomeLabel(outcome) {
  return DAY_OUTCOME_LABELS[outcome] || DAY_OUTCOME_LABELS.open;
}

export function countHabitDayOutcomes(habits, habitLogs, dateKey) {
  let done = 0;
  let skipped = 0;
  let open = 0;
  const checkHabits = habits.filter((h) => h.tracking_mode !== 'since');
  for (const h of checkHabits) {
    const log = todayLogForHabit(habitLogs, h.id, dateKey);
    const o = getHabitDayOutcome(log);
    if (o === DAY_OUTCOMES.done) done += 1;
    else if (o === DAY_OUTCOMES.skipped) skipped += 1;
    else open += 1;
  }
  return { done, skipped, open, total: checkHabits.length };
}
const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function isSinceHabit(habit) {
  return habit?.tracking_mode === 'since';
}

export function normalizeSinceDate(input) {
  if (input === undefined) return undefined;
  if (input === null || input === '') return '';
  const raw = String(input).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  if (`${y}-${m}-${d}` !== raw) return null;
  return raw;
}

export function daysSinceDate(sinceDate, today) {
  const start = normalizeSinceDate(sinceDate);
  const end = normalizeSinceDate(today);
  if (!start || !end) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/**
 * Live elapsed clock from YYYY-MM-DD 00:00 in America/Fortaleza (UTC-03:00).
 * Returns a clamped, decomposed duration suitable for a D/H/M/S counter.
 */
export function elapsedSinceFortalezaMidnight(sinceDate, now = Date.now()) {
  const start = normalizeSinceDate(sinceDate);
  const empty = { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  if (!start) return empty;

  const [year, month, day] = start.split('-').map(Number);
  const anchorMs = Date.UTC(year, month - 1, day, 3, 0, 0);
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(nowMs)) return empty;

  const totalSeconds = Math.max(0, Math.floor((nowMs - anchorMs) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
}

export function sinceMilestone(days) {
  const n = Number(days) || 0;
  if (n <= 2) {
    return {
      phase: 'decisão',
      line: 'Decisão feita. O relógio só anda pra frente.',
    };
  }
  if (n <= 7) {
    return {
      phase: 'semana dura',
      line: 'Essa semana é a mais puxada. Sono e vontade oscilam. É o cérebro recalibrando, não fraqueza.',
    };
  }
  if (n <= 14) {
    return {
      phase: 'estabiliza',
      line: 'O pico costuma passar. Foco e sono começam a voltar.',
    };
  }
  if (n <= 30) {
    return {
      phase: 'hábito novo',
      line: 'O automático enfraquece. Mais tempo, menos ciclo de vergonha.',
    };
  }
  if (n <= 90) {
    return {
      phase: 'caminho novo',
      line: '60 a 90 dias é quando o caminho novo costuma firmar de verdade.',
    };
  }
  return {
    phase: 'já sabe',
    line: 'Você já sabe o que isso vira. Já fez.',
  };
}

export function formatSinceDatePt(sinceDate) {
  if (!sinceDate) return '';
  const [y, m, d] = String(sinceDate).slice(0, 10).split('-').map(Number);
  if (!m || !d) return String(sinceDate);
  const monthName = MONTHS_PT[m - 1] || '';
  return `Desde ${d} de ${monthName}. Sem volta.`;
}
