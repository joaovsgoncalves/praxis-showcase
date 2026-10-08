export const WORKOUT_TRACKING_TYPES = [
  { value: 'reps', label: 'Repetições' },
  { value: 'weight_reps', label: 'Carga + repetições' },
  { value: 'duration', label: 'Tempo / isometria' },
  { value: 'distance', label: 'Distância' },
  { value: 'distance_duration', label: 'Distância + tempo' },
];

/** Elástico / band na série (calistenia). `null` = não informado. */
export const WORKOUT_BAND_LEVELS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Médio' },
  { value: 'heavy', label: 'Forte' },
  { value: 'extra_heavy', label: 'Extra forte' },
];

export const WORKOUT_BAND_LABELS = Object.fromEntries(WORKOUT_BAND_LEVELS.map((item) => [item.value, item.label]));

/** Objetivo do exercício programado (logbook V1.1). */
export const WORKOUT_PURPOSES = [
  { value: 'skill', label: 'Skill' },
  { value: 'strength', label: 'Força' },
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'preparation', label: 'Preparação' },
];

export const WORKOUT_PURPOSE_LABELS = Object.fromEntries(WORKOUT_PURPOSES.map((item) => [item.value, item.label]));

/** Qualidade técnica opcional de uma série. */
export const WORKOUT_TECHNICAL_QUALITIES = [
  { value: 'clean', label: 'Limpa' },
  { value: 'acceptable', label: 'Aceitável' },
  { value: 'broke', label: 'Quebrou' },
];

export const WORKOUT_TECHNICAL_QUALITY_LABELS = Object.fromEntries(
  WORKOUT_TECHNICAL_QUALITIES.map((item) => [item.value, item.label]),
);

/** RIR chips usados na sessão. O último (`4`) representa "4 ou mais". */
export const WORKOUT_RIR_OPTIONS = [0, 1, 2, 3, 4];
export const WORKOUT_RIR_MAX_CHIP = 4;

export const WORKOUT_CATEGORIES = [
  { value: 'strength', label: 'Musculação' },
  { value: 'calisthenics', label: 'Calistenia' },
  { value: 'skill', label: 'Skill' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobilidade' },
  { value: 'other', label: 'Outro' },
];

export const TRACKING_LABELS = Object.fromEntries(WORKOUT_TRACKING_TYPES.map((item) => [item.value, item.label]));
export const WORKOUT_CATEGORY_LABELS = Object.fromEntries(WORKOUT_CATEGORIES.map((item) => [item.value, item.label]));

export function formatBandLevel(level) {
  if (level == null || level === '') return null;
  return WORKOUT_BAND_LABELS[level] || String(level);
}

export function formatPurpose(purpose) {
  if (purpose == null || purpose === '') return null;
  return WORKOUT_PURPOSE_LABELS[purpose] || String(purpose);
}

export function formatTechnicalQuality(quality) {
  if (quality == null || quality === '') return null;
  return WORKOUT_TECHNICAL_QUALITY_LABELS[quality] || String(quality);
}

/** A null/undefined historic role behaves as a working set. */
export function isWarmupSet(set = {}) {
  return set.set_role === 'warmup';
}

/** RIR só faz sentido em repetições / carga + repetições. Nunca em tempo/distância. */
export function trackingUsesRir(trackingType = 'reps') {
  return trackingType === 'reps' || trackingType === 'weight_reps';
}

/** Meta de RIR programada (ex.: "RIR 1–2"). `null` quando não configurada. */
export function formatTargetRir(item = {}) {
  const min = item.target_rir_min;
  const max = item.target_rir_max;
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `RIR ${min}` : `RIR ${min}–${max}`;
  if (min != null) return `RIR ${min}+`;
  return `RIR até ${max}`;
}

/** Rótulo curto do RIR anotado numa série. Trata o topo (chip 4+) de forma sensata. */
export function formatSetRir(rir) {
  if (rir == null || rir === '') return null;
  const value = Number(rir);
  if (!Number.isFinite(value)) return null;
  return value >= WORKOUT_RIR_MAX_CHIP ? `RIR ${WORKOUT_RIR_MAX_CHIP}+` : `RIR ${value}`;
}

/** Metadados opcionais de uma série (RIR, qualidade técnica, nota) — só o que existir. */
export function setMetaChips(set = {}) {
  const chips = [];
  const rir = formatSetRir(set.rir);
  if (rir) chips.push(rir);
  const quality = formatTechnicalQuality(set.technical_quality);
  if (quality) chips.push(quality);
  return chips;
}

/** Show elastic chips for pure-reps tracking (calisthenics-friendly). */
export function trackingUsesBand(trackingType = 'reps') {
  return trackingType === 'reps';
}

export function trackingUsesWeight(trackingType = 'reps') {
  return trackingType === 'weight_reps';
}

export function formatSeconds(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  if (total < 60) return `${Math.round(total)}s`;
  const min = Math.floor(total / 60);
  const sec = Math.round(total % 60);
  return sec ? `${min}min ${sec}s` : `${min}min`;
}

export function formatClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatRestDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatSessionElapsed(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '< 1 min';
  if (total < 60) return '< 1 min';
  const totalMinutes = Math.floor(total / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const restMinutes = totalMinutes % 60;
  if (hours >= 24) return `${hours}h`;
  return restMinutes > 0 ? `${hours}h ${restMinutes}min` : `${hours}h`;
}

export function formatWorkoutTarget(item = {}) {
  const sets = Number(item.target_sets) || 0;
  const tracking = item.tracking_type || 'reps';
  let target = '';

  if (tracking === 'duration') {
    target = item.target_duration_seconds ? formatSeconds(item.target_duration_seconds) : 'tempo livre';
  } else if (tracking === 'distance') {
    target = item.target_distance_m ? formatDistance(item.target_distance_m) : 'distância livre';
  } else if (tracking === 'distance_duration') {
    target = item.target_duration_seconds ? formatSeconds(item.target_duration_seconds) : 'distância + tempo';
  } else if (item.rep_min != null && item.rep_max != null) {
    target = item.rep_min === item.rep_max ? `${item.rep_min} reps` : `${item.rep_min}–${item.rep_max} reps`;
  } else if (item.rep_min != null) {
    target = `${item.rep_min}+ reps`;
  } else if (item.rep_max != null) {
    target = `até ${item.rep_max} reps`;
  } else {
    target = 'reps livres';
  }

  return `${sets || 1} ${sets === 1 ? 'série' : 'séries'} · ${target}`;
}

export function formatDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)} km`;
  return `${Math.round(value)} m`;
}

export function formatSetResult(set = {}, trackingType = 'reps') {
  const parts = [];
  if (trackingType === 'weight_reps') {
    if (set.weight_kg != null) parts.push(`${Number(set.weight_kg).toLocaleString('pt-BR')} kg`);
    if (set.reps != null) parts.push(`${set.reps} rep${Number(set.reps) === 1 ? '' : 's'}`);
  } else if (trackingType === 'duration') {
    if (set.duration_seconds != null) parts.push(formatSeconds(set.duration_seconds));
  } else if (trackingType === 'distance') {
    if (set.distance_m != null) parts.push(formatDistance(set.distance_m));
  } else if (trackingType === 'distance_duration') {
    if (set.distance_m != null) parts.push(formatDistance(set.distance_m));
    if (set.duration_seconds != null) parts.push(formatSeconds(set.duration_seconds));
  } else if (set.reps != null) {
    parts.push(`${set.reps} rep${Number(set.reps) === 1 ? '' : 's'}`);
  }
  const band = formatBandLevel(set.band_level);
  if (band && set.band_level !== 'none') parts.push(`elástico ${band.toLowerCase()}`);
  else if (band && set.band_level === 'none') parts.push('sem elástico');
  return parts.join(' · ') || '—';
}

export function formatSessionDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '—';
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function workoutDateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function workoutDayShortLabel(day = {}) {
  if (day.day_type === 'rest') return 'Descanso';
  const count = Number(day.exercise_count ?? day.exercises?.length ?? 0);
  const duration = day.estimated_duration_minutes ? ` · ~${day.estimated_duration_minutes} min` : '';
  return `${count} ${count === 1 ? 'exercício' : 'exercícios'}${duration}`;
}
