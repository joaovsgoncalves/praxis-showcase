/**
 * Praxis Treinos V4 — Muscle Vocabulary & Aliasing
 *
 * Defines the canonical 18-muscle anatomy (head-to-toe) and normalizes
 * dataset / raw input strings into canonical muscle identifiers.
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
