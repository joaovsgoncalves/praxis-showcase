/**
 * Praxis Treinos V4 Core — Muscle vocabulary, CDN media helpers, and feature flags.
 * Isomorphic pure functions used across API and frontend.
 */

export const MUSCLES = [
  'trapezius',
  'deltoids',
  'chest',
  'upper-back',
  'serratus',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'lower-back',
  'gluteal',
  'quadriceps',
  'hamstring',
  'adductors',
  'hip-flexors',
  'calves',
  'tibialis',
];

export const MUSCLE_LABEL_PT = {
  'trapezius': 'Trapézio',
  'deltoids': 'Deltoides',
  'chest': 'Peitoral',
  'upper-back': 'Dorsal',
  'serratus': 'Serrátil',
  'biceps': 'Bíceps',
  'triceps': 'Tríceps',
  'forearm': 'Antebraço',
  'abs': 'Abdômen',
  'obliques': 'Oblíquos',
  'lower-back': 'Lombar',
  'gluteal': 'Glúteos',
  'quadriceps': 'Quadríceps',
  'hamstring': 'Posteriores',
  'adductors': 'Adutores',
  'hip-flexors': 'Flexores de quadril',
  'calves': 'Panturrilhas',
  'tibialis': 'Tibial',
};

export const BODY_PART_LABEL_PT = {
  'chest': 'Peitoral',
  'back': 'Costas',
  'upper arms': 'Braços',
  'shoulders': 'Ombros',
  'upper legs': 'Pernas',
  'waist': 'Abdômen',
  'lower legs': 'Panturrilhas',
  'lower arms': 'Antebraço',
  'cardio': 'Cardio',
  'neck': 'Pescoço',
};

export const EQUIPMENT_LABEL_PT = {
  'body weight': 'Peso corporal',
  'dumbbell': 'Halteres',
  'barbell': 'Barra',
  'cable': 'Polia / Cabo',
  'leverage machine': 'Máquina',
  'band': 'Elástico',
  'smith machine': 'Smith',
  'kettlebell': 'Kettlebell',
  'weighted': 'Com carga',
  'stability ball': 'Bola suíça',
  'medicine ball': 'Medicine ball',
  'ez barbell': 'Barra W / EZ',
  'roller': 'Rolo de liberação',
  'wheel roller': 'Roda abdominal',
  'assisted': 'Assistido',
  'trap bar': 'Barra hexagonal',
  'rope': 'Corda',
  'bosu ball': 'Bosu',
};

const MUSCLE_ALIAS_MAP = {
  // trapezius (PT synonyms)
  "trapézio": "trapezius",
  "trapezio": "trapezius",
  "pescoço": "trapezius",
  "pescoco": "trapezius",

  // deltoids (PT synonyms)
  "ombro": "deltoids",
  "ombros": "deltoids",
  "deltoide": "deltoids",
  "deltoides": "deltoids",
  "deltoide anterior": "deltoids",
  "deltoide lateral": "deltoids",
  "deltoide posterior": "deltoids",

  // chest (PT synonyms)
  "peito": "chest",
  "peitoral": "chest",
  "peitorais": "chest",
  "peitoral superior": "chest",
  "peitoral inferior": "chest",

  // upper-back (PT synonyms)
  "costas": "upper-back",
  "dorsal": "upper-back",
  "dorsais": "upper-back",
  "romboides": "upper-back",
  "romboide": "upper-back",
  "latíssimo": "upper-back",
  "latissimo": "upper-back",
  "escápula": "upper-back",
  "escapula": "upper-back",

  // serratus (PT synonyms)
  "serrátil": "serratus",
  "serratil": "serratus",
  "serrátil anterior": "serratus",
  "serratil anterior": "serratus",

  // biceps (PT synonyms)
  "bíceps": "biceps",
  "braço": "biceps",
  "braços": "biceps",
  "braco": "biceps",
  "bracos": "biceps",
  "braquial": "biceps",

  // triceps (PT synonyms)
  "tríceps": "triceps",

  // forearm (PT synonyms)
  "antebraço": "forearm",
  "antebraco": "forearm",
  "antebraços": "forearm",
  "antebracos": "forearm",
  "punho": "forearm",
  "punhos": "forearm",
  "mãos": "forearm",
  "maos": "forearm",
  "mão": "forearm",
  "mao": "forearm",

  // abs (PT synonyms)
  "abdômen": "abs",
  "abdomen": "abs",
  "abdominais": "abs",
  "abdominal": "abs",
  "barriga": "abs",

  // obliques (PT synonyms)
  "oblíquo": "obliques",
  "obliquo": "obliques",
  "oblíquos": "obliques",
  "obliquos": "obliques",
  "abdômen lateral": "obliques",
  "abdomen lateral": "obliques",

  // lower-back (PT synonyms)
  "lombar": "lower-back",
  "lombares": "lower-back",
  "coluna": "lower-back",

  // gluteal (PT synonyms)
  "glúteo": "gluteal",
  "gluteo": "gluteal",
  "glúteos": "gluteal",
  "gluteos": "gluteal",
  "quadril": "gluteal",
  "quadris": "gluteal",
  "bumbum": "gluteal",

  // quadriceps (PT synonyms)
  "quadríceps": "quadriceps",
  "coxa": "quadriceps",
  "coxas": "quadriceps",
  "perna": "quadriceps",
  "pernas": "quadriceps",

  // hamstring (PT synonyms)
  "posterior": "hamstring",
  "posteriores": "hamstring",
  "isquiotibiais": "hamstring",
  "isquiotibial": "hamstring",
  "posterior de coxa": "hamstring",
  "posteriores de coxa": "hamstring",

  // adductors (PT synonyms)
  "adutor": "adductors",
  "adutores": "adductors",
  "virilha": "adductors",

  // hip-flexors (PT synonyms)
  "flexor de quadril": "hip-flexors",
  "flexores de quadril": "hip-flexors",
  "flexor quadril": "hip-flexors",
  "flexores quadril": "hip-flexors",

  // calves (PT synonyms)
  "panturrilha": "calves",
  "panturrilhas": "calves",
  "gastrocnêmio": "calves",
  "gastrocnemio": "calves",
  "sóleo": "calves",
  "soleo": "calves",
  "tornozelo": "calves",
  "tornozelos": "calves",
  "pés": "calves",
  "pes": "calves",
  "pé": "calves",
  "pe": "calves",

  // tibialis (PT synonyms)
  "tibial": "tibialis",
  "tibiais": "tibialis",
  "tibial anterior": "tibialis",
  "canela": "tibialis",
  "canelas": "tibialis",

  // trapezius
  'trapezius': 'trapezius',
  'traps': 'trapezius',
  'trap': 'trapezius',
  'neck': 'trapezius',
  'levator scapulae': 'trapezius',
  'sternocleidomastoid': 'trapezius',

  // deltoids
  'deltoids': 'deltoids',
  'deltoid': 'deltoids',
  'delts': 'deltoids',
  'delt': 'deltoids',
  'shoulders': 'deltoids',
  'shoulder': 'deltoids',
  'rear deltoids': 'deltoids',
  'rear delts': 'deltoids',
  'front delts': 'deltoids',
  'side delts': 'deltoids',
  'lateral delts': 'deltoids',
  'rotator cuff': 'deltoids',

  // chest
  'chest': 'chest',
  'pectorals': 'chest',
  'pectoral': 'chest',
  'pecs': 'chest',
  'pec': 'chest',
  'upper chest': 'chest',
  'lower chest': 'chest',

  // upper-back
  'upper-back': 'upper-back',
  'upper back': 'upper-back',
  'upperback': 'upper-back',
  'lats': 'upper-back',
  'lat': 'upper-back',
  'latissimus dorsi': 'upper-back',
  'rhomboids': 'upper-back',
  'rhomboid': 'upper-back',
  'back': 'upper-back',
  'middle back': 'upper-back',

  // serratus
  'serratus': 'serratus',
  'serratus anterior': 'serratus',

  // biceps
  'biceps': 'biceps',
  'bicep': 'biceps',
  'brachialis': 'biceps',

  // triceps
  'triceps': 'triceps',
  'tricep': 'triceps',

  // forearm
  'forearm': 'forearm',
  'forearms': 'forearm',
  'lower arms': 'forearm',
  'lower arm': 'forearm',
  'wrist flexors': 'forearm',
  'wrist extensors': 'forearm',
  'wrists': 'forearm',
  'wrist': 'forearm',
  'grip muscles': 'forearm',
  'grip': 'forearm',
  'hands': 'forearm',
  'hand': 'forearm',

  // abs
  'abs': 'abs',
  'abdominals': 'abs',
  'abdominal': 'abs',
  'core': 'abs',
  'lower abs': 'abs',
  'upper abs': 'abs',
  'waist': 'abs',

  // obliques
  'obliques': 'obliques',
  'oblique': 'obliques',
  'side abs': 'obliques',

  // lower-back
  'lower-back': 'lower-back',
  'lower back': 'lower-back',
  'lowerback': 'lower-back',
  'spine': 'lower-back',
  'erector spinae': 'lower-back',

  // gluteal
  'gluteal': 'gluteal',
  'glutes': 'gluteal',
  'glute': 'gluteal',
  'gluteus': 'gluteal',
  'gluteus maximus': 'gluteal',
  'gluteus medius': 'gluteal',
  'buttocks': 'gluteal',
  'abductors': 'gluteal',
  'abductor': 'gluteal',
  'hips': 'gluteal',
  'hip': 'gluteal',

  // quadriceps
  'quadriceps': 'quadriceps',
  'quads': 'quadriceps',
  'quad': 'quadriceps',
  'upper legs': 'quadriceps',
  'thighs': 'quadriceps',
  'thigh': 'quadriceps',

  // hamstring
  'hamstring': 'hamstring',
  'hamstrings': 'hamstring',
  'rear thighs': 'hamstring',
  'biceps femoris': 'hamstring',

  // adductors
  'adductors': 'adductors',
  'adductor': 'adductors',
  'groin': 'adductors',
  'inner thighs': 'adductors',
  'inner thigh': 'adductors',

  // hip-flexors
  'hip-flexors': 'hip-flexors',
  'hip flexors': 'hip-flexors',
  'hip flexor': 'hip-flexors',
  'iliopsoas': 'hip-flexors',
  'psoas': 'hip-flexors',

  // calves
  'calves': 'calves',
  'calf': 'calves',
  'gastrocnemius': 'calves',
  'soleus': 'calves',
  'lower legs': 'calves',
  'lower leg': 'calves',
  'ankles': 'calves',
  'ankle': 'calves',
  'ankle stabilizers': 'calves',
  'feet': 'calves',
  'foot': 'calves',

  // tibialis
  'tibialis': 'tibialis',
  'tibialis anterior': 'tibialis',
  'shins': 'tibialis',
  'shin': 'tibialis',
};

export function aliasMuscle(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!normalized) return null;

  const tryKey = (key) => {
    if (!key) return null;
    if (MUSCLE_ALIAS_MAP[key]) return MUSCLE_ALIAS_MAP[key];
    const hyphenated = key.replace(/\s+/g, '-');
    if (MUSCLE_ALIAS_MAP[hyphenated]) return MUSCLE_ALIAS_MAP[hyphenated];
    return null;
  };

  const direct = tryKey(normalized);
  if (direct) return direct;

  const parts = normalized.split(/[,;/]| e | and /).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const hit = tryKey(part);
    if (hit) return hit;
  }
  return null;
}

export const CDN_IMG_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/';
export const CDN_GIF_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/';
export const MEDIA_ATTRIBUTION = '© Gym visual — https://gymvisual.com/';

function cleanMediaPath(raw, prefix) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let path = trimmed.replace(/^\/+/, '');
  if (path.toLowerCase().startsWith('images/')) {
    path = path.slice('images/'.length);
  } else if (path.toLowerCase().startsWith('videos/')) {
    path = path.slice('videos/'.length);
  }
  path = path.replace(/^\/+/, '');
  if (!path) return null;

  return prefix + path;
}

export function thumbUrl(exerciseOrPath) {
  if (!exerciseOrPath) return null;
  if (typeof exerciseOrPath === 'string') {
    return cleanMediaPath(exerciseOrPath, CDN_IMG_BASE);
  }
  const raw = exerciseOrPath.thumb_path || exerciseOrPath.image || exerciseOrPath.thumbUrl || null;
  return cleanMediaPath(raw, CDN_IMG_BASE);
}

export function gifUrl(exerciseOrPath) {
  if (!exerciseOrPath) return null;
  if (typeof exerciseOrPath === 'string') {
    return cleanMediaPath(exerciseOrPath, CDN_GIF_BASE);
  }
  const raw = exerciseOrPath.gif_path || exerciseOrPath.gif_url || exerciseOrPath.gifUrl || null;
  return cleanMediaPath(raw, CDN_GIF_BASE);
}

export function isTreinosV4Enabled(envOverride) {
  const envSource =
    envOverride !== undefined
      ? envOverride
      : typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env
        : typeof process !== 'undefined' && process.env
          ? process.env
          : {};

  const val = envSource?.VITE_TREINOS_V4;
  return val === '1' || val === 'true' || val === true;
}

export function formatBodyPart(bodyPart) {
  if (!bodyPart || typeof bodyPart !== 'string') return null;
  const key = bodyPart.trim().toLowerCase();
  return BODY_PART_LABEL_PT[key] || bodyPart;
}

export function formatEquipment(equipment) {
  if (!equipment || typeof equipment !== 'string') return null;
  const key = equipment.trim().toLowerCase();
  return EQUIPMENT_LABEL_PT[key] || equipment;
}

export function formatMuscleName(muscle) {
  if (!muscle || typeof muscle !== 'string') return null;
  const canonical = aliasMuscle(muscle);
  if (canonical && MUSCLE_LABEL_PT[canonical]) {
    return MUSCLE_LABEL_PT[canonical];
  }
  return muscle;
}

export function preferSteps(exercise, lang = 'pt') {
  if (!exercise) return [];

  let rawJson = exercise.instructions_json;
  let rawText = exercise.instructions;
  let rawSteps = exercise.instruction_steps;

  let parsed = null;
  if (typeof exercise === 'string') {
    try {
      parsed = JSON.parse(exercise);
    } catch {
      rawText = exercise;
    }
  } else if (rawJson) {
    if (typeof rawJson === 'string') {
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        // Fall through
      }
    } else if (typeof rawJson === 'object') {
      parsed = rawJson;
    }
  } else if (rawSteps) {
    if (typeof rawSteps === 'object') {
      parsed = rawSteps;
    }
  } else if (exercise && typeof exercise === 'object' && (Array.isArray(exercise.en) || Array.isArray(exercise.pt))) {
    parsed = exercise;
  }

  if (parsed) {
    const ptSteps = Array.isArray(parsed.pt) ? parsed.pt.filter((s) => typeof s === 'string' && s.trim().length > 0) : [];
    const enSteps = Array.isArray(parsed.en) ? parsed.en.filter((s) => typeof s === 'string' && s.trim().length > 0) : [];

    if (lang === 'pt') {
      if (ptSteps.length > 0) return ptSteps;
      if (enSteps.length > 0) return enSteps;
    } else if (lang === 'en') {
      if (enSteps.length > 0) return enSteps;
      if (ptSteps.length > 0) return ptSteps;
    } else {
      const target = Array.isArray(parsed[lang]) ? parsed[lang].filter((s) => typeof s === 'string' && s.trim().length > 0) : [];
      if (target.length > 0) return target;
      if (ptSteps.length > 0) return ptSteps;
      if (enSteps.length > 0) return enSteps;
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((s) => (typeof s === 'string' ? s.trim().length > 0 : Boolean(s)));
    }
  }

  if (rawText && typeof rawText === 'string') {
    const trimmed = rawText.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsedArray = JSON.parse(trimmed);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          return parsedArray.filter((s) => (typeof s === 'string' ? s.trim().length > 0 : Boolean(s)));
        }
      } catch {
        // Fall through
      }
    }
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) return lines;
  }

  return [];
}

export function extractInstructionSteps(exercise) {
  return preferSteps(exercise, 'pt');
}

export function extractSecondaryMuscles(exercise) {
  if (!exercise) return [];
  const raw = exercise.secondary_muscles_json || exercise.secondary_muscles;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function isWarmupSet(set) {
  return set?.set_role === "warmup";
}

export function isWakeLockSupported(navigatorOverride) {
  const nav =
    navigatorOverride !== undefined
      ? navigatorOverride
      : typeof navigator !== "undefined"
        ? navigator
        : undefined;

  return Boolean(nav && "wakeLock" in nav && typeof nav.wakeLock?.request === "function");
}

export function detectPersonalRecord(candidateSet, previousHistoricalSets = []) {
  if (!candidateSet) return { is_pr: false, pr_type: null, reason: null };
  if (candidateSet.set_role === "warmup" || isWarmupSet(candidateSet)) {
    return { is_pr: false, pr_type: null, reason: null };
  }

  const workHistory = (previousHistoricalSets || []).filter((s) => {
    if (!s) return false;
    if (s.id && candidateSet.id && s.id === candidateSet.id) return false;
    if (s.set_role === "warmup") return false;
    return true;
  });

  if (workHistory.length === 0) {
    return { is_pr: false, pr_type: null, reason: null };
  }

  const weight =
    candidateSet.weight_kg != null && Number.isFinite(Number(candidateSet.weight_kg))
      ? Number(candidateSet.weight_kg)
      : null;
  const reps =
    candidateSet.reps != null && Number.isFinite(Number(candidateSet.reps))
      ? Number(candidateSet.reps)
      : null;
  const duration =
    candidateSet.duration_seconds != null && Number.isFinite(Number(candidateSet.duration_seconds))
      ? Number(candidateSet.duration_seconds)
      : null;
  const distance =
    candidateSet.distance_m != null && Number.isFinite(Number(candidateSet.distance_m))
      ? Number(candidateSet.distance_m)
      : null;

  if (weight != null && weight > 0) {
    let maxPrevWeight = 0;
    for (const s of workHistory) {
      const w = Number(s.weight_kg);
      if (Number.isFinite(w) && w > maxPrevWeight) {
        maxPrevWeight = w;
      }
    }

    if (weight > maxPrevWeight) {
      return {
        is_pr: true,
        pr_type: "weight",
        reason:
          maxPrevWeight > 0
            ? `Superou a carga anterior de ${maxPrevWeight} kg`
            : `Nova carga máxima: ${weight} kg`,
      };
    }

    if (weight === maxPrevWeight && reps != null && reps > 0) {
      const setsAtMaxWeight = workHistory.filter((s) => Number(s.weight_kg) === weight);
      let maxRepsAtWeight = 0;
      for (const s of setsAtMaxWeight) {
        const r = Number(s.reps);
        if (Number.isFinite(r) && r > maxRepsAtWeight) {
          maxRepsAtWeight = r;
        }
      }

      if (reps > maxRepsAtWeight) {
        return {
          is_pr: true,
          pr_type: "reps",
          reason:
            maxRepsAtWeight > 0
              ? `Superou ${maxRepsAtWeight} reps com ${weight} kg`
              : `${reps} reps com ${weight} kg`,
        };
      }
    }

    return { is_pr: false, pr_type: null, reason: null };
  }

  if (reps != null && reps > 0) {
    let maxPrevReps = 0;
    for (const s of workHistory) {
      const r = Number(s.reps);
      if (Number.isFinite(r) && r > maxPrevReps) {
        maxPrevReps = r;
      }
    }

    if (reps > maxPrevReps) {
      return {
        is_pr: true,
        pr_type: "reps",
        reason:
          maxPrevReps > 0
            ? `Superou o recorde anterior de ${maxPrevReps} reps`
            : `Novo recorde: ${reps} reps`,
      };
    }

    return { is_pr: false, pr_type: null, reason: null };
  }

  if (duration != null && duration > 0 && (distance == null || distance <= 0)) {
    let maxPrevDuration = 0;
    for (const s of workHistory) {
      const d = Number(s.duration_seconds);
      if (Number.isFinite(d) && d > maxPrevDuration) {
        maxPrevDuration = d;
      }
    }

    if (duration > maxPrevDuration) {
      return {
        is_pr: true,
        pr_type: "duration",
        reason:
          maxPrevDuration > 0
            ? `Superou a duração anterior de ${maxPrevDuration}s`
            : `Novo recorde de duração: ${duration}s`,
      };
    }

    return { is_pr: false, pr_type: null, reason: null };
  }

  if (distance != null && distance > 0) {
    let maxPrevDistance = 0;
    for (const s of workHistory) {
      const dist = Number(s.distance_m);
      if (Number.isFinite(dist) && dist > maxPrevDistance) {
        maxPrevDistance = dist;
      }
    }

    if (distance > maxPrevDistance) {
      return {
        is_pr: true,
        pr_type: "distance",
        reason:
          maxPrevDistance > 0
            ? `Superou a distância anterior de ${maxPrevDistance}m`
            : `Novo recorde de distância: ${distance}m`,
      };
    }

    if (distance === maxPrevDistance && duration != null && duration > 0) {
      const setsAtDistance = workHistory.filter((s) => Number(s.distance_m) === distance);
      let minDurationAtDist = Infinity;
      for (const s of setsAtDistance) {
        const d = Number(s.duration_seconds);
        if (Number.isFinite(d) && d > 0 && d < minDurationAtDist) {
          minDurationAtDist = d;
        }
      }

      if (minDurationAtDist < Infinity && duration < minDurationAtDist) {
        return {
          is_pr: true,
          pr_type: "duration",
          reason: `Completou ${distance}m mais rápido: ${duration}s (era ${minDurationAtDist}s)`,
        };
      }
    }

    return { is_pr: false, pr_type: null, reason: null };
  }

  return { is_pr: false, pr_type: null, reason: null };
}

export function formatPrToastDescription(set, exercise = {}) {
  const name = exercise?.exercise_name_snapshot || exercise?.name || "Exercício";
  if (!set) return `${name}: Novo recorde!`;

  if (
    set.pr_type === "weight" ||
    (set.weight_kg != null && Number(set.weight_kg) > 0 && !set.pr_type)
  ) {
    const weightStr = `${Number(set.weight_kg).toLocaleString("pt-BR")} kg`;
    const repsStr =
      set.reps != null && Number(set.reps) > 0 ? ` (${set.reps} reps)` : "";
    return `${name}: ${weightStr}${repsStr}`;
  }

  if (set.pr_type === "reps" || (set.reps != null && Number(set.reps) > 0)) {
    const weightStr =
      set.weight_kg != null && Number(set.weight_kg) > 0
        ? ` com ${Number(set.weight_kg).toLocaleString("pt-BR")} kg`
        : "";
    return `${name}: ${set.reps} reps${weightStr}`;
  }

  if (
    set.pr_type === "duration" ||
    (set.duration_seconds != null && Number(set.duration_seconds) > 0)
  ) {
    return `${name}: ${set.duration_seconds}s`;
  }

  if (
    set.pr_type === "distance" ||
    (set.distance_m != null && Number(set.distance_m) > 0)
  ) {
    return `${name}: ${set.distance_m} m`;
  }

  return `${name}: Novo recorde!`;
}

export const EMPTY_SET_FORM = {
  weight_kg: "",
  reps: "",
  duration_seconds: "",
  distance_m: "",
  band_level: "",
  set_role: "work",
  rir: "",
  technical_quality: "",
  note: "",
};

export function getWorkSets(sets = []) {
  if (!Array.isArray(sets)) return [];
  return sets.filter((set) => !isWarmupSet(set));
}

export function getWarmupSets(sets = []) {
  if (!Array.isArray(sets)) return [];
  return sets.filter((set) => isWarmupSet(set));
}

export function getLastWorkSet(sets = []) {
  const work = getWorkSets(sets);
  return work.length > 0 ? work[work.length - 1] : null;
}

export function getLastWarmupSet(sets = []) {
  const warmup = getWarmupSets(sets);
  return warmup.length > 0 ? warmup[warmup.length - 1] : null;
}

export function cascadeWeightToUnfilledSlots(exercise, newWeight) {
  if (!exercise) return [];
  const targetSets = Math.max(1, Number(exercise.target_sets || 1));
  const workDone = getWorkSets(exercise.sets).length;
  const remaining = Math.max(0, targetSets - workDone);
  return Array.from({ length: remaining }, (_, i) => ({
    slot_index: workDone + i,
    suggested_weight_kg: newWeight,
  }));
}

export function computeSetPrefill(exercise, role = "work", options = {}) {
  const { cascadeWeight = true, targetSlotIndex } = options;
  const targetRole = role === "warmup" ? "warmup" : "work";
  const currentSets = exercise?.sets || [];
  const currentWorkSets = getWorkSets(currentSets);
  const currentWarmupSets = getWarmupSets(currentSets);
  const previousSets = exercise?.previous_sets || [];
  const previousWorkSets = getWorkSets(previousSets);
  const previousWarmupSets = getWarmupSets(previousSets);

  if (targetRole === "warmup") {
    const lastWarmup = currentWarmupSets.length > 0
      ? currentWarmupSets[currentWarmupSets.length - 1]
      : (previousWarmupSets.length > 0 ? previousWarmupSets[0] : null);

    return {
      ...EMPTY_SET_FORM,
      weight_kg: lastWarmup?.weight_kg != null ? lastWarmup.weight_kg : "",
      reps: lastWarmup?.reps != null ? lastWarmup.reps : "",
      duration_seconds: lastWarmup?.duration_seconds != null
        ? lastWarmup.duration_seconds
        : (exercise?.target_duration_seconds ?? ""),
      distance_m: lastWarmup?.distance_m != null ? lastWarmup.distance_m : "",
      band_level: lastWarmup?.band_level != null ? lastWarmup.band_level : "",
      set_role: "warmup",
      rir: "",
      technical_quality: "",
      note: "",
    };
  }

  if (currentWorkSets.length > 0) {
    const lastWork = currentWorkSets[currentWorkSets.length - 1];
    return {
      ...EMPTY_SET_FORM,
      weight_kg: lastWork.weight_kg != null ? lastWork.weight_kg : "",
      reps: lastWork.reps != null ? lastWork.reps : "",
      duration_seconds: lastWork.duration_seconds != null
        ? lastWork.duration_seconds
        : (exercise?.target_duration_seconds ?? ""),
      distance_m: lastWork.distance_m != null ? lastWork.distance_m : "",
      band_level: lastWork.band_level != null ? lastWork.band_level : "",
      set_role: "work",
      rir: lastWork.rir != null ? String(lastWork.rir) : "",
      technical_quality: "",
      note: "",
    };
  }

  if (previousWorkSets.length > 0) {
    const slotIdx = typeof targetSlotIndex === "number" ? targetSlotIndex : 0;
    const prevWork = previousWorkSets[slotIdx] || previousWorkSets[previousWorkSets.length - 1];
    return {
      ...EMPTY_SET_FORM,
      weight_kg: prevWork.weight_kg != null ? prevWork.weight_kg : "",
      reps: prevWork.reps != null ? prevWork.reps : "",
      duration_seconds: prevWork.duration_seconds != null
        ? prevWork.duration_seconds
        : (exercise?.target_duration_seconds ?? ""),
      distance_m: prevWork.distance_m != null ? prevWork.distance_m : "",
      band_level: prevWork.band_level != null ? prevWork.band_level : "",
      set_role: "work",
      rir: prevWork.rir != null ? String(prevWork.rir) : "",
      technical_quality: "",
      note: "",
    };
  }

  return {
    ...EMPTY_SET_FORM,
    weight_kg: "",
    reps: "",
    duration_seconds: exercise?.target_duration_seconds ?? "",
    distance_m: "",
    band_level: "",
    set_role: "work",
    rir: "",
    technical_quality: "",
    note: "",
  };
}

/**
 * Praxis Treinos V4 — 1RM Estimation (Epley) (Fase 8)
 *
 * Pure helpers for estimating 1-Rep Max using the Epley formula:
 *   1RM = weight * (1 + reps / 30) for weight > 0 and reps >= 1.
 * Special cases:
 *   - reps == 1 -> 1RM = weight
 *   - Warmup sets are excluded from best 1RM calculations.
 *   - Rounded to 1 decimal place.
 */

/**
 * Estimates 1-Rep Max (in kg) using the Epley formula.
 *
 * @param {number|string|null|undefined} weightKg Load lifted in kg.
 * @param {number|string|null|undefined} reps Number of completed reps.
 * @returns {number|null} Estimated 1RM rounded to 1 decimal place, or null if inputs are invalid/non-positive.
 */
export function estimate1rm(weightKg, reps) {
  if (weightKg === null || weightKg === undefined || weightKg === "") return null;
  if (reps === null || reps === undefined || reps === "") return null;

  const w = Number(weightKg);
  const r = Number(reps);

  if (!Number.isFinite(w) || !Number.isFinite(r)) return null;
  if (w <= 0 || r < 1) return null;

  if (r === 1) {
    return Math.round(w * 10) / 10;
  }

  const val = w * (1 + r / 30);
  return Math.round(val * 10) / 10;
}

/**
 * Finds the highest estimated 1RM across a list of completed sets.
 * Warmup sets are strictly excluded.
 *
 * @param {Array<Object>} sets Array of set records ({ weight_kg, reps, set_role, ... }).
 * @returns {number|null} Best 1RM among work sets, or null if no eligible work sets.
 */
export function bestEstimated1rm(sets = []) {
  if (!Array.isArray(sets) || sets.length === 0) return null;

  let best = 0;
  for (const set of sets) {
    if (!set) continue;
    if (set.set_role === "warmup" || isWarmupSet(set)) continue;

    const est = estimate1rm(set.weight_kg, set.reps);
    if (est !== null && est > best) {
      best = est;
    }
  }

  return best > 0 ? Math.round(best * 10) / 10 : null;
}

/**
 * Formats a 1RM value into a user-facing string with 1 decimal place.
 *
 * @param {number|null|undefined} value 1RM in kg.
 * @returns {string|null} Formatted string like "82,5 kg" or null if invalid.
 */
export function format1rm(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;

  return `${num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} kg`;
}


/**
 * Praxis Treinos V4 — Muscle Map Balance (Fase 9)
 *
 * Aggregates work-set volume by canonical muscle over a time window.
 *
 * Balance scoring rules:
 * 1. Considers completed work sets in the day window (excludes warmup, incomplete/abandoned).
 * 2. Primary muscle contributes 1.0 set-equivalent.
 * 3. Each secondary muscle contributes 0.4 set-equivalents (without duplicate counting).
 * 4. raw[id] = sum of set-equivalents for muscle id.
 * 5. score[id] = raw[id] / max(raw) if max(raw) > 0 else 0 (0–1).
 * 6. Always returns all 18 canonical muscles in standard head-to-toe order.
 * 7. ranked = { most: [...], least: [...] }.
 *
 * @param {Array<Object>} setsWithExerciseMeta List of completed set records with exercise metadata.
 * @param {Object} [options] Configuration options ({ days, now, mode }).
 * @returns {Object} Muscle balance map payload.
 */
/**
 * Praxis Treinos V4 — Muscle Map (Fase 9 & Fase 10: Balance, Fatigue, Strength)
 *
 * Computes muscle metrics over a time window for 3 distinct modes:
 *
 * 1. "balance" (Fase 9):
 *    - Aggregates completed work-set volume by canonical muscle (primary = 1.0, secondary = 0.4).
 *    - raw[id] = sum of set-equivalents.
 *    - score[id] = raw[id] / max(raw) (0–1).
 *    - unit = "sets".
 *
 * 2. "fatigue" (Fase 10):
 *    - Same attribution as Balance (primary = 1.0, secondary = 0.4).
 *    - Applies exponential decay by days since set: weight * 0.5 ** (ageDays / halfLife), with halfLife default = 7 days.
 *    - raw[id] = sum of decayed set-equivalents.
 *    - score[id] = raw[id] / max(raw) (0–1).
 *    - unit = "sets".
 *    - Higher score = more residual fatigue.
 *
 * 3. "strength" (Fase 10):
 *    - Per muscle, collects best estimated 1RM (Epley formula) from work sets targeting that muscle (primary only).
 *    - Skips bodyweight/cardio sets without valid positive weight_kg.
 *    - raw[id] = best estimated 1RM in kg.
 *    - score[id] = best1rm[id] / max(best1rm) across muscles with data; 0 if none.
 *    - unit = "kg".
 *
 * Always returns all 18 canonical muscles in standard head-to-toe order.
 *
 * @param {Array<Object>} setsWithExerciseMeta List of completed set records with exercise metadata.
 * @param {Object} [options] Configuration options ({ days, now, mode, halfLife }).
 * @returns {Object} Muscle map payload.
 */
export function computeMuscleMap(setsWithExerciseMeta = [], options = {}) {
  const {
    days = 14,
    now = new Date(),
    mode = "balance",
    halfLife = 7,
  } = options || {};

  const validMode = (mode || "balance").toLowerCase();
  const numDays = Math.max(1, Number(days) || 14);
  const halfLifeDays = Math.max(0.1, Number(halfLife) || 7);

  const nowMs =
    typeof now === "number"
      ? now
      : typeof now === "string"
        ? new Date(now).getTime()
        : now instanceof Date
          ? now.getTime()
          : Date.now();

  const fromMs = nowMs - numDays * 24 * 60 * 60 * 1000;
  const fromIso = new Date(fromMs).toISOString();
  const toIso = new Date(nowMs).toISOString();

  // Initialize accumulator for all 18 canonical muscles
  const rawAccumulator = {};
  for (const m of MUSCLES) {
    rawAccumulator[m] = 0;
  }

  if (Array.isArray(setsWithExerciseMeta)) {
    for (const set of setsWithExerciseMeta) {
      if (!set) continue;

      // Exclude warmup sets
      if (set.set_role === "warmup" || isWarmupSet(set)) {
        continue;
      }

      // Exclude abandoned or incomplete sessions if session status is provided
      if (set.session_status && set.session_status !== "completed") {
        continue;
      }

      // Check date window if set or session has a timestamp
      const setDateStr =
        set.session_completed_at ||
        set.completed_at ||
        set.session_started_at ||
        set.started_at ||
        set.created_at ||
        null;

      let setMs = null;
      if (setDateStr) {
        setMs = new Date(setDateStr).getTime();
        if (Number.isFinite(setMs)) {
          if (setMs < fromMs || setMs > nowMs) {
            continue;
          }
        }
      }

      // Primary muscle resolution: target_muscle -> muscle_group -> body_part
      const primaryCandidate =
        set.target_muscle ||
        set.muscle_group ||
        set.body_part ||
        set.exercise_target_muscle ||
        set.exercise_muscle_group ||
        set.exercise_body_part ||
        null;

      const primaryCanonical = aliasMuscle(primaryCandidate);

      if (validMode === "strength") {
        // Mode: Strength
        // Uses best estimated 1RM from work sets targeting that muscle (primary only)
        // Needs positive weight and reps; skips bodyweight-only without kg
        const weight = set.weight_kg != null ? Number(set.weight_kg) : null;
        const reps = set.reps != null ? Number(set.reps) : null;

        if (primaryCanonical && rawAccumulator[primaryCanonical] !== undefined) {
          if (
            weight !== null &&
            reps !== null &&
            Number.isFinite(weight) &&
            Number.isFinite(reps) &&
            weight > 0 &&
            reps >= 1
          ) {
            const est1rm = estimate1rm(weight, reps);
            if (est1rm !== null && est1rm > rawAccumulator[primaryCanonical]) {
              rawAccumulator[primaryCanonical] = est1rm;
            }
          }
        }
      } else if (validMode === "fatigue") {
        // Mode: Fatigue
        // Exponential decay by days: weight * 0.5 ** (ageDays / halfLife)
        let decay = 1.0;
        if (Number.isFinite(setMs)) {
          const ageDays = Math.max(0, (nowMs - setMs) / (24 * 60 * 60 * 1000));
          decay = Math.pow(0.5, ageDays / halfLifeDays);
        }

        if (primaryCanonical && rawAccumulator[primaryCanonical] !== undefined) {
          rawAccumulator[primaryCanonical] += 1.0 * decay;
        }

        const secondaries = extractSecondaryMuscles(set);
        if (Array.isArray(secondaries) && secondaries.length > 0) {
          const seenInThisSet = new Set();
          if (primaryCanonical) {
            seenInThisSet.add(primaryCanonical);
          }

          for (const sec of secondaries) {
            const secCanonical = aliasMuscle(sec);
            if (
              secCanonical &&
              rawAccumulator[secCanonical] !== undefined &&
              !seenInThisSet.has(secCanonical)
            ) {
              rawAccumulator[secCanonical] += 0.4 * decay;
              seenInThisSet.add(secCanonical);
            }
          }
        }
      } else {
        // Mode: Balance (default)
        if (primaryCanonical && rawAccumulator[primaryCanonical] !== undefined) {
          rawAccumulator[primaryCanonical] += 1.0;
        }

        const secondaries = extractSecondaryMuscles(set);
        if (Array.isArray(secondaries) && secondaries.length > 0) {
          const seenInThisSet = new Set();
          if (primaryCanonical) {
            seenInThisSet.add(primaryCanonical);
          }

          for (const sec of secondaries) {
            const secCanonical = aliasMuscle(sec);
            if (
              secCanonical &&
              rawAccumulator[secCanonical] !== undefined &&
              !seenInThisSet.has(secCanonical)
            ) {
              rawAccumulator[secCanonical] += 0.4;
              seenInThisSet.add(secCanonical);
            }
          }
        }
      }
    }
  }

  // Round raw values to 1 decimal place and determine max volume / 1RM
  let maxRaw = 0;
  for (const m of MUSCLES) {
    const rounded = Math.round(rawAccumulator[m] * 10) / 10;
    rawAccumulator[m] = rounded;
    if (rounded > maxRaw) {
      maxRaw = rounded;
    }
  }

  const unit = validMode === "strength" ? "kg" : "sets";

  // Format muscles array in canonical order
  const muscles = MUSCLES.map((id) => {
    const raw = rawAccumulator[id] || 0;
    const score = maxRaw > 0 ? Math.round((raw / maxRaw) * 100) / 100 : 0;
    return {
      id,
      label: MUSCLE_LABEL_PT[id] || id,
      score,
      raw,
      unit,
    };
  });

  // Calculate ranked lists
  const mostTrained = muscles
    .filter((m) => m.raw > 0)
    .sort((a, b) => b.raw - a.raw || MUSCLES.indexOf(a.id) - MUSCLES.indexOf(b.id))
    .map((m) => m.id);

  const leastTrained = [...muscles]
    .sort((a, b) => a.raw - b.raw || MUSCLES.indexOf(a.id) - MUSCLES.indexOf(b.id))
    .map((m) => m.id);

  return {
    mode: validMode,
    days: numDays,
    muscles,
    window: {
      from: fromIso,
      to: toIso,
    },
    ranked: {
      most: mostTrained,
      least: leastTrained,
    },
  };
}

export function computeBalanceMap(setsWithExerciseMeta = [], options = {}) {
  return computeMuscleMap(setsWithExerciseMeta, options);
}

/**
 * Praxis Treinos V4 — Year Heatmap helpers (Fase 11)
 *
 * Pure isomorphic helpers for computing contribution-style workout heatmaps
 * by calendar year with Praxis dark+gold visual styling.
 */

export const HEATMAP_MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const HEATMAP_WEEKDAYS_PT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export const HEATMAP_INTENSITY_BINS = [
  { bin: 0, label: "0 séries", min: 0, max: 0 },
  { bin: 1, label: "1–6 séries", min: 1, max: 6 },
  { bin: 2, label: "7–12 séries", min: 7, max: 12 },
  { bin: 3, label: "13–18 séries", min: 13, max: 18 },
  { bin: 4, label: "19+ séries", min: 19, max: Infinity },
];

/**
 * Maps work-set count to an intensity bin index (0..4).
 *
 * @param {number|string|null|undefined} workSets
 * @returns {number} 0 (none), 1 (1..6), 2 (7..12), 3 (13..18), 4 (19+)
 */
export function getHeatmapIntensityBin(workSets) {
  if (workSets === null || workSets === undefined || workSets === "") return 0;
  const n = Number(workSets);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= 6) return 1;
  if (n <= 12) return 2;
  if (n <= 18) return 3;
  return 4;
}

/**
 * Formats a tooltip title string in Portuguese for a heatmap day cell.
 *
 * @param {Object|string} dayOrDate
 * @param {number} [workSets]
 * @param {number} [sessions]
 * @param {number} [totalSets]
 * @returns {string}
 */
export function formatHeatmapTooltip(dayOrDate, workSets, sessions, totalSets) {
  let dateStr = "";
  let ws = 0;
  let sess = 0;
  let ts = 0;

  if (typeof dayOrDate === "object" && dayOrDate !== null) {
    dateStr = dayOrDate.dateStr || dayOrDate.date || "";
    ws = Number(dayOrDate.work_sets || dayOrDate.workSets || 0);
    sess = Number(dayOrDate.sessions || 0);
    ts = Number(dayOrDate.sets || dayOrDate.totalSets || 0);
  } else {
    dateStr = String(dayOrDate || "");
    ws = Number(workSets || 0);
    sess = Number(sessions || 0);
    ts = Number(totalSets || 0);
  }

  // Format date: YYYY-MM-DD -> D de mmm. de YYYY
  let formattedDate = dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const monthName = HEATMAP_MONTHS_PT[m - 1] || "";
    formattedDate = `${d} de ${monthName.toLowerCase()}. de ${y}`;
  }

  if (sess === 0 && ws === 0 && ts === 0) {
    return `${formattedDate} · Nenhum treino registrado`;
  }

  const sessLabel = sess === 1 ? "1 treino" : `${sess} treinos`;
  const workSetsLabel = ws === 1 ? "1 série de trabalho" : `${ws} séries de trabalho`;

  if (ts > ws && ts > 0) {
    return `${formattedDate} · ${sessLabel} · ${workSetsLabel} (${ts} total)`;
  }

  return `${formattedDate} · ${sessLabel} · ${workSetsLabel}`;
}

/**
 * Builds a full 52-54 week calendar grid for a given year.
 *
 * @param {number|string} year Year to render (e.g. 2026).
 * @param {Array<Object>} [daysData=[]] List of { date, sessions, sets, work_sets }
 * @param {Object} [options={}] Options ({ today, locale })
 * @returns {Object} { year, weeks, monthLabels, totalSessions, totalWorkSets, totalSets, activeDaysCount, maxWorkSetsInDay }
 */
export function buildYearHeatmapGrid(year, daysData = [], options = {}) {
  const yearNum = Number(year) || new Date().getUTCFullYear();
  const todayIso = options.today
    ? (typeof options.today === "string" ? options.today.slice(0, 10) : new Date(options.today).toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const daysMap = new Map();
  if (Array.isArray(daysData)) {
    for (const d of daysData) {
      if (d && d.date) {
        daysMap.set(d.date, d);
      }
    }
  }

  // UTC calculations for exact calendar arithmetic without timezone drift
  const jan1 = new Date(Date.UTC(yearNum, 0, 1));
  const startDayOfWeek = jan1.getUTCDay(); // 0 = Sunday
  const firstGridDate = new Date(Date.UTC(yearNum, 0, 1 - startDayOfWeek));

  const dec31 = new Date(Date.UTC(yearNum, 11, 31));
  const endDayOfWeek = dec31.getUTCDay();
  const lastGridDate = new Date(Date.UTC(yearNum, 11, 31 + (6 - endDayOfWeek)));

  const totalGridDays = Math.round((lastGridDate.getTime() - firstGridDate.getTime()) / (86400 * 1000)) + 1;
  const numWeeks = Math.ceil(totalGridDays / 7);

  let totalSessions = 0;
  let totalWorkSets = 0;
  let totalSets = 0;
  let activeDaysCount = 0;
  let maxWorkSetsInDay = 0;

  const allCells = [];
  for (let i = 0; i < totalGridDays; i++) {
    const cur = new Date(firstGridDate.getTime() + i * 86400 * 1000);
    const dateStr = cur.toISOString().slice(0, 10);
    const inYear = cur.getUTCFullYear() === yearNum;
    const isFuture = inYear && dateStr > todayIso;

    const data = inYear ? (daysMap.get(dateStr) || null) : null;
    const sessions = data ? Number(data.sessions || 0) : 0;
    const sets = data ? Number(data.sets || 0) : 0;
    const work_sets = data ? Number(data.work_sets || 0) : 0;

    if (inYear && (sessions > 0 || work_sets > 0 || sets > 0)) {
      totalSessions += sessions;
      totalWorkSets += work_sets;
      totalSets += sets;
      activeDaysCount += 1;
      if (work_sets > maxWorkSetsInDay) {
        maxWorkSetsInDay = work_sets;
      }
    }

    const bin = inYear && !isFuture ? getHeatmapIntensityBin(work_sets) : 0;

    allCells.push({
      date: cur,
      dateStr,
      dayOfWeek: cur.getUTCDay(),
      month: cur.getUTCMonth(),
      dayOfMonth: cur.getUTCDate(),
      inYear,
      future: isFuture,
      sessions,
      sets,
      work_sets,
      bin,
    });
  }

  // Split into weeks (columns of 7)
  const weeks = [];
  for (let w = 0; w < numWeeks; w++) {
    weeks.push(allCells.slice(w * 7, w * 7 + 7));
  }

  // Month labels for column headers
  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, colIdx) => {
    const firstInYear = week.find((c) => c.inYear);
    if (firstInYear) {
      const m = firstInYear.month;
      if (m !== lastMonth) {
        monthLabels.push({
          colIndex: colIdx,
          month: m,
          label: HEATMAP_MONTHS_PT[m],
        });
        lastMonth = m;
      }
    }
  });

  return {
    year: yearNum,
    weeks,
    monthLabels,
    totalSessions,
    totalWorkSets,
    totalSets,
    activeDaysCount,
    maxWorkSetsInDay,
  };
}

// ==========================================
// Treinos V4 Fase 12 — Superset & Freestyle Helpers
// ==========================================

export function shouldSkipAutoRest(exercises = [], currentIndex = 0) {
  if (!Array.isArray(exercises) || currentIndex < 0 || currentIndex >= exercises.length - 1) {
    return false;
  }
  const currentGroup = exercises[currentIndex]?.superset_group;
  if (!currentGroup || typeof currentGroup !== "string" || !currentGroup.trim()) {
    return false;
  }
  const nextGroup = exercises[currentIndex + 1]?.superset_group;
  if (!nextGroup || typeof nextGroup !== "string" || !nextGroup.trim()) {
    return false;
  }
  return currentGroup.trim() === nextGroup.trim();
}

export function isFreestyleSession(session) {
  if (!session) return false;
  if (session.kind === "freestyle") return true;
  return !session.workout_program_id && !session.workout_day_id;
}

export function getSupersetPairIndices(exercises = [], targetIndex = 0) {
  if (!Array.isArray(exercises) || targetIndex < 0 || targetIndex >= exercises.length) {
    return [];
  }
  const targetGroup = exercises[targetIndex]?.superset_group;
  if (!targetGroup || typeof targetGroup !== "string" || !targetGroup.trim()) {
    return [targetIndex];
  }
  const indices = [];
  exercises.forEach((ex, idx) => {
    if (ex?.superset_group && String(ex.superset_group).trim() === targetGroup.trim()) {
      indices.push(idx);
    }
  });
  return indices;
}

export { translateExerciseNameToPt, displayExerciseName } from '../../src/lib/workoutV4/names.js';

