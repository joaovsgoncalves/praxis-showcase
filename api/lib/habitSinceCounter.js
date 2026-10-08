/**
 * Abstinence / "since" habit: a day clock from a fixed date.
 * No daily check, no skip, no reset. Days = today − since_date.
 */

export const TRACKING_MODES = new Set(["check", "since"]);

export function isSinceHabit(habit) {
  return habit?.tracking_mode === "since";
}

export function normalizeTrackingMode(input) {
  if (input === undefined) return undefined;
  if (input === null || input === "") return "check";
  const raw = String(input).trim().toLowerCase();
  if (!TRACKING_MODES.has(raw)) return null;
  return raw;
}

export function normalizeSinceDate(input) {
  if (input === undefined) return undefined;
  if (input === null || input === "") return "";
  const raw = String(input).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
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

export function sinceMilestone(days) {
  const n = Number(days) || 0;
  if (n <= 2) {
    return {
      phase: "decisão",
      line: "Decisão feita. O relógio só anda pra frente.",
    };
  }
  if (n <= 7) {
    return {
      phase: "semana dura",
      line: "Essa semana é a mais puxada. Sono e vontade oscilam. É o cérebro recalibrando, não fraqueza.",
    };
  }
  if (n <= 14) {
    return {
      phase: "estabiliza",
      line: "O pico costuma passar. Foco e sono começam a voltar.",
    };
  }
  if (n <= 30) {
    return {
      phase: "hábito novo",
      line: "O automático enfraquece. Mais tempo, menos ciclo de vergonha.",
    };
  }
  if (n <= 90) {
    return {
      phase: "caminho novo",
      line: "60 a 90 dias é quando o caminho novo costuma firmar de verdade.",
    };
  }
  return {
    phase: "já sabe",
    line: "Você já sabe o que isso vira. Já fez.",
  };
}

export function decorateSinceHabit(habit, today) {
  if (!isSinceHabit(habit)) return habit;
  const days = habit.since_date ? daysSinceDate(habit.since_date, today) : 0;
  const milestone = sinceMilestone(days);
  return {
    ...habit,
    days_since: days,
    since_phase: milestone.phase,
    since_line: milestone.line,
    current_streak: days,
    best_streak: Math.max(Number(habit?.best_streak) || 0, days),
  };
}
