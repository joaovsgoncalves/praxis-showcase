import { randomUUID } from 'crypto';
import { detectPersonalRecord, estimate1rm, bestEstimated1rm, computeBalanceMap, translateExerciseNameToPt } from './lib/workoutV4Core.js';

export const WORKOUT_TRACKING_TYPES = [
  'reps',
  'weight_reps',
  'duration',
  'distance',
  'distance_duration',
];

export const WORKOUT_EXERCISE_CATEGORIES = [
  'strength',
  'calisthenics',
  'skill',
  'cardio',
  'mobility',
  'other',
];

const WORKOUT_DAY_TYPES = ['training', 'rest'];
const WORKOUT_SESSION_STATUSES = ['active', 'completed', 'abandoned'];
/** Elastic/band load for calisthenics sets (null = not set). */
export const WORKOUT_BAND_LEVELS = ['none', 'light', 'medium', 'heavy', 'extra_heavy'];
/** Training objective for a programmed exercise (logbook V1.1). */
export const WORKOUT_PURPOSES = ['skill', 'strength', 'hypertrophy', 'preparation'];
/** Whether a logged set counts as a warmup or a working set. Null historic role behaves as work. */
export const WORKOUT_SET_ROLES = ['warmup', 'work'];
/** Optional technical quality note for a set (null = not informed). */
export const WORKOUT_TECHNICAL_QUALITIES = ['clean', 'acceptable', 'broke'];

function text(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function intOrNull(value, { min = null, max = null } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  let n = Math.round(parsed);
  if (min !== null) n = Math.max(min, n);
  if (max !== null) n = Math.min(max, n);
  return n;
}

function numberOrNull(value, { min = null, max = null } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  let n = parsed;
  if (min !== null) n = Math.max(min, n);
  if (max !== null) n = Math.min(max, n);
  return n;
}

function boolInt(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

function safeLimit(value, fallback = 30, max = 100) {
  const n = intOrNull(value, { min: 1, max });
  return n ?? fallback;
}

function nextPosition(db, table, parentColumn, parentId) {
  const allowed = {
    workout_days: 'program_id',
    workout_day_exercises: 'workout_day_id',
  };
  if (allowed[table] !== parentColumn) throw new Error('Invalid sortable workout table');
  const row = db
    .prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM ${table} WHERE ${parentColumn} = ?`)
    .get(parentId);
  return Number(row?.next_position || 0);
}

export function initWorkoutSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'strength',
      muscle_group TEXT DEFAULT '',
      equipment TEXT DEFAULT '',
      tracking_type TEXT DEFAULT 'reps',
      instructions TEXT DEFAULT '',
      is_custom INTEGER DEFAULT 1,
      catalog_external_id TEXT,
      source TEXT DEFAULT 'custom',
      body_part TEXT,
      target_muscle TEXT,
      secondary_muscles_json TEXT,
      media_id TEXT,
      thumb_path TEXT,
      gif_path TEXT,
      attribution TEXT,
      instructions_json TEXT,
      equipment_key TEXT,
      is_bodyweight_default INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 0,
      current_day_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_days (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      name TEXT NOT NULL,
      day_type TEXT DEFAULT 'training',
      position INTEGER DEFAULT 0,
      estimated_duration_minutes INTEGER,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (program_id) REFERENCES workout_programs(id)
    );

    CREATE TABLE IF NOT EXISTS workout_day_exercises (
      id TEXT PRIMARY KEY,
      workout_day_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      target_sets INTEGER DEFAULT 3,
      rep_min INTEGER,
      rep_max INTEGER,
      target_duration_seconds INTEGER,
      rest_seconds INTEGER DEFAULT 90,
      purpose TEXT NOT NULL DEFAULT 'strength',
      target_rir_min INTEGER,
      target_rir_max INTEGER,
      notes TEXT DEFAULT '',
      superset_group TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workout_day_id) REFERENCES workout_days(id),
      FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id)
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      workout_program_id TEXT,
      workout_day_id TEXT,
      program_name_snapshot TEXT DEFAULT '',
      workout_day_name_snapshot TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      kind TEXT DEFAULT 'program',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (workout_program_id) REFERENCES workout_programs(id),
      FOREIGN KEY (workout_day_id) REFERENCES workout_days(id)
    );

    CREATE TABLE IF NOT EXISTS workout_session_exercises (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      workout_day_exercise_id TEXT,
      exercise_id TEXT,
      exercise_name_snapshot TEXT NOT NULL,
      tracking_type TEXT DEFAULT 'reps',
      position INTEGER DEFAULT 0,
      target_sets INTEGER DEFAULT 3,
      rep_min INTEGER,
      rep_max INTEGER,
      target_duration_seconds INTEGER,
      rest_seconds INTEGER DEFAULT 90,
      purpose TEXT NOT NULL DEFAULT 'strength',
      target_rir_min INTEGER,
      target_rir_max INTEGER,
      notes TEXT DEFAULT '',
      superset_group TEXT,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
      FOREIGN KEY (workout_day_exercise_id) REFERENCES workout_day_exercises(id),
      FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id)
    );

    CREATE TABLE IF NOT EXISTS workout_session_sets (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      session_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight_kg REAL,
      reps INTEGER,
      duration_seconds INTEGER,
      distance_m REAL,
      band_level TEXT,
      set_role TEXT NOT NULL DEFAULT 'work',
      rir INTEGER,
      technical_quality TEXT,
      notes TEXT DEFAULT '',
      completed_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
      FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id)
    );

    CREATE INDEX IF NOT EXISTS idx_workout_exercises_name ON workout_exercises(name);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_status ON workout_exercises(status);
    CREATE INDEX IF NOT EXISTS idx_workout_programs_active ON workout_programs(is_active);
    CREATE INDEX IF NOT EXISTS idx_workout_days_program_position ON workout_days(program_id, position);
    CREATE INDEX IF NOT EXISTS idx_workout_day_exercises_day_position ON workout_day_exercises(workout_day_id, position);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_status_started ON workout_sessions(status, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_day_started ON workout_sessions(workout_day_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session_position ON workout_session_exercises(session_id, position);
    CREATE INDEX IF NOT EXISTS idx_workout_session_sets_exercise_number ON workout_session_sets(session_exercise_id, set_number);
  `);

  // V2 logbook: elastic/band on sets (existing DBs created before this column)
  try {
    db.exec('ALTER TABLE workout_session_sets ADD COLUMN band_level TEXT');
  } catch {
    /* column already exists */
  }

  // V1.1 logbook: objective + target RIR on programmed/snapshot exercises,
  // and warmup/work role + RIR + technical quality on logged sets.
  // Each ALTER is idempotent (throws only if the column already exists).
  const idempotentColumns = [
    ['workout_day_exercises', "purpose TEXT NOT NULL DEFAULT 'strength'"],
    ['workout_day_exercises', 'target_rir_min INTEGER'],
    ['workout_day_exercises', 'target_rir_max INTEGER'],
    ['workout_session_exercises', "purpose TEXT NOT NULL DEFAULT 'strength'"],
    ['workout_session_exercises', 'target_rir_min INTEGER'],
    ['workout_session_exercises', 'target_rir_max INTEGER'],
    ['workout_session_sets', "set_role TEXT NOT NULL DEFAULT 'work'"],
    ['workout_session_sets', 'rir INTEGER'],
    ['workout_session_sets', 'technical_quality TEXT'],
    ['workout_session_sets', 'is_pr INTEGER DEFAULT 0'],
    ['workout_session_sets', 'pr_type TEXT'],
    ['workout_exercises', 'catalog_external_id TEXT'],
    ['workout_exercises', "source TEXT DEFAULT 'custom'"],
    ['workout_exercises', 'body_part TEXT'],
    ['workout_exercises', 'target_muscle TEXT'],
    ['workout_exercises', 'secondary_muscles_json TEXT'],
    ['workout_exercises', 'media_id TEXT'],
    ['workout_exercises', 'thumb_path TEXT'],
    ['workout_exercises', 'gif_path TEXT'],
    ['workout_exercises', 'attribution TEXT'],
    ['workout_exercises', 'instructions_json TEXT'],
    ['workout_exercises', 'equipment_key TEXT'],
    ['workout_exercises', 'is_bodyweight_default INTEGER DEFAULT 0'],
    ['workout_exercises', 'name_pt TEXT'],
    ['workout_day_exercises', 'superset_group TEXT'],
    ['workout_session_exercises', 'superset_group TEXT'],
    ['workout_sessions', "kind TEXT DEFAULT 'program'"],
  ];
  for (const [table, definition] of idempotentColumns) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    } catch {
      /* column already exists */
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_catalog_external_id ON workout_exercises(catalog_external_id);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_body_part ON workout_exercises(body_part);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_target_muscle ON workout_exercises(target_muscle);
  `);

  try {
    const pending = db.prepare(`
      SELECT id, name FROM workout_exercises
      WHERE source = 'catalog'
    `).all();
    if (pending.length) {
      const upd = db.prepare('UPDATE workout_exercises SET name_pt = ? WHERE id = ?');
      const tx = db.transaction(() => {
        for (const row of pending) {
          upd.run(translateExerciseNameToPt(row.name), row.id);
        }
      });
      tx();
    }
  } catch {
    /* name_pt still migrating */
  }
}

function presentExercise(row) {
  if (!row) return row;
  const translated = row.source === 'catalog' ? (row.name_pt || translateExerciseNameToPt(row.name)) : null;
  const namePt = (translated || row.name_pt || '').trim() || null;
  return {
    ...row,
    name_pt: namePt,
    display_name: namePt || row.name,
  };
}

function normalizeExerciseBody(body = {}, existing = null) {
  const name = text(body.name, existing?.name || '');
  const category = WORKOUT_EXERCISE_CATEGORIES.includes(body.category)
    ? body.category
    : existing?.category || 'strength';
  const trackingType = WORKOUT_TRACKING_TYPES.includes(body.tracking_type)
    ? body.tracking_type
    : existing?.tracking_type || 'reps';

  const source = body.source !== undefined
    ? (text(body.source) || 'custom')
    : (existing?.source || 'custom');

  let isCustom = existing?.is_custom !== undefined ? boolInt(existing.is_custom, 1) : 1;
  if (body.is_custom !== undefined) {
    isCustom = boolInt(body.is_custom, 1);
  } else if (body.source !== undefined) {
    isCustom = source === 'catalog' ? 0 : 1;
  }

  let secondaryMusclesJson = existing?.secondary_muscles_json ?? null;
  if (body.secondary_muscles_json !== undefined) {
    if (typeof body.secondary_muscles_json === 'string') {
      secondaryMusclesJson = text(body.secondary_muscles_json) || null;
    } else if (body.secondary_muscles_json === null) {
      secondaryMusclesJson = null;
    } else {
      secondaryMusclesJson = JSON.stringify(body.secondary_muscles_json);
    }
  } else if (body.secondary_muscles !== undefined) {
    if (typeof body.secondary_muscles === 'string') {
      secondaryMusclesJson = text(body.secondary_muscles) || null;
    } else if (body.secondary_muscles === null) {
      secondaryMusclesJson = null;
    } else {
      secondaryMusclesJson = JSON.stringify(body.secondary_muscles);
    }
  }

  let instructionsJson = existing?.instructions_json ?? null;
  if (body.instructions_json !== undefined) {
    if (typeof body.instructions_json === 'string') {
      instructionsJson = text(body.instructions_json) || null;
    } else if (body.instructions_json === null) {
      instructionsJson = null;
    } else {
      instructionsJson = JSON.stringify(body.instructions_json);
    }
  } else if (body.instruction_steps !== undefined || body.instructions_steps !== undefined) {
    const rawSteps = body.instruction_steps !== undefined ? body.instruction_steps : body.instructions_steps;
    if (typeof rawSteps === 'string') {
      instructionsJson = text(rawSteps) || null;
    } else if (rawSteps === null) {
      instructionsJson = null;
    } else {
      instructionsJson = JSON.stringify(rawSteps);
    }
  }

  return {
    name,
    category,
    muscle_group: body.muscle_group !== undefined ? text(body.muscle_group) : existing?.muscle_group || '',
    equipment: body.equipment !== undefined ? text(body.equipment) : existing?.equipment || '',
    tracking_type: trackingType,
    instructions: body.instructions !== undefined ? text(body.instructions) : existing?.instructions || '',
    is_custom: isCustom,
    catalog_external_id: body.catalog_external_id !== undefined ? (text(body.catalog_external_id) || null) : (existing?.catalog_external_id ?? null),
    source,
    body_part: body.body_part !== undefined ? (text(body.body_part) || null) : (existing?.body_part ?? null),
    target_muscle: body.target_muscle !== undefined ? (text(body.target_muscle) || null) : (existing?.target_muscle ?? null),
    secondary_muscles_json: secondaryMusclesJson,
    media_id: body.media_id !== undefined ? (text(body.media_id) || null) : (existing?.media_id ?? null),
    thumb_path: body.thumb_path !== undefined ? (text(body.thumb_path) || null) : (existing?.thumb_path ?? null),
    gif_path: body.gif_path !== undefined ? (text(body.gif_path) || null) : (existing?.gif_path ?? null),
    attribution: body.attribution !== undefined ? (text(body.attribution) || null) : (existing?.attribution ?? null),
    instructions_json: instructionsJson,
    equipment_key: body.equipment_key !== undefined ? (text(body.equipment_key) || null) : (existing?.equipment_key ?? null),
    is_bodyweight_default: body.is_bodyweight_default !== undefined ? boolInt(body.is_bodyweight_default, 0) : (existing?.is_bodyweight_default ?? 0),
  };
}

function exerciseRowsForDay(db, dayId) {
  return db.prepare(`
    SELECT
      wde.id,
      wde.workout_day_id,
      wde.exercise_id,
      wde.position,
      wde.target_sets,
      wde.rep_min,
      wde.rep_max,
      wde.target_duration_seconds,
      wde.rest_seconds,
      wde.purpose,
      wde.target_rir_min,
      wde.target_rir_max,
      wde.notes,
      wde.superset_group,
      e.name AS exercise_name,
      e.category AS exercise_category,
      e.muscle_group AS muscle_group,
      e.equipment AS equipment,
      e.tracking_type AS tracking_type,
      e.instructions AS instructions,
      COALESCE(NULLIF(e.target_muscle, ''), (
        SELECT c.target_muscle FROM workout_exercises c
        WHERE c.source = 'catalog' AND c.status = 'active'
          AND (lower(c.name) = lower(e.name) OR lower(c.name_pt) = lower(e.name))
          AND c.target_muscle IS NOT NULL AND c.target_muscle != ''
        LIMIT 1
      )) AS target_muscle,
      COALESCE(NULLIF(e.body_part, ''), (
        SELECT c.body_part FROM workout_exercises c
        WHERE c.source = 'catalog' AND c.status = 'active'
          AND (lower(c.name) = lower(e.name) OR lower(c.name_pt) = lower(e.name))
          AND c.body_part IS NOT NULL AND c.body_part != ''
        LIMIT 1
      )) AS body_part,
      COALESCE(NULLIF(e.thumb_path, ''), (
        SELECT c.thumb_path FROM workout_exercises c
        WHERE c.source = 'catalog' AND c.status = 'active'
          AND (lower(c.name) = lower(e.name) OR lower(c.name_pt) = lower(e.name))
          AND c.thumb_path IS NOT NULL AND c.thumb_path != ''
        LIMIT 1
      )) AS thumb_path,
      COALESCE(NULLIF(e.gif_path, ''), (
        SELECT c.gif_path FROM workout_exercises c
        WHERE c.source = 'catalog' AND c.status = 'active'
          AND (lower(c.name) = lower(e.name) OR lower(c.name_pt) = lower(e.name))
          AND c.gif_path IS NOT NULL AND c.gif_path != ''
        LIMIT 1
      )) AS gif_path
    FROM workout_day_exercises wde
    JOIN workout_exercises e ON e.id = wde.exercise_id
    WHERE wde.workout_day_id = ?
    ORDER BY wde.position ASC, wde.created_at ASC
  `).all(dayId);
}

function dayRowsForProgram(db, programId, { withExercises = true } = {}) {
  const days = db.prepare(`
    SELECT
      d.*,
      (SELECT COUNT(*) FROM workout_day_exercises wde WHERE wde.workout_day_id = d.id) AS exercise_count
    FROM workout_days d
    WHERE d.program_id = ?
    ORDER BY d.position ASC, d.created_at ASC
  `).all(programId);

  if (!withExercises) return days;
  return days.map((day) => ({ ...day, exercises: exerciseRowsForDay(db, day.id) }));
}

function getProgram(db, programId, { withExercises = true } = {}) {
  const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(programId);
  if (!program) return null;
  return {
    ...program,
    days: dayRowsForProgram(db, program.id, { withExercises }),
  };
}

function currentDayForProgram(program) {
  if (!program?.days?.length) return null;
  return program.days.find((day) => day.id === program.current_day_id) || program.days[0];
}

function getActiveProgram(db, { withExercises = true } = {}) {
  let program = db.prepare(`
    SELECT * FROM workout_programs
    WHERE is_active = 1
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `).get();

  if (!program) {
    program = db.prepare('SELECT * FROM workout_programs ORDER BY created_at ASC LIMIT 1').get();
  }
  if (!program) return null;
  return getProgram(db, program.id, { withExercises });
}

function getSessionSummary(db, sessionId) {
  return db.prepare(`
    SELECT
      s.*,
      (SELECT COUNT(*) FROM workout_session_exercises se WHERE se.session_id = s.id) AS exercise_count,
      (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id) AS completed_sets,
      (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id AND (ss.set_role IS NULL OR ss.set_role != 'warmup')) AS completed_work_sets,
      (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id AND ss.set_role = 'warmup') AS completed_warmup_sets
    FROM workout_sessions s
    WHERE s.id = ?
  `).get(sessionId);
}

function getPreviousSets(db, sessionExercise, session) {
  if (!sessionExercise?.exercise_id || !session?.started_at) return [];
  const previousExercise = db.prepare(`
    SELECT se.id
    FROM workout_session_exercises se
    JOIN workout_sessions s ON s.id = se.session_id
    WHERE se.exercise_id = ?
      AND s.status = 'completed'
      AND s.started_at < ?
      AND s.id != ?
    ORDER BY s.started_at DESC
    LIMIT 1
  `).get(sessionExercise.exercise_id, session.started_at, session.id);
  if (!previousExercise) return [];
  // Prefill from working sets only; historic rows with a null role count as work.
  return db.prepare(`
    SELECT * FROM workout_session_sets
    WHERE session_exercise_id = ?
      AND (set_role IS NULL OR set_role != 'warmup')
    ORDER BY set_number ASC, completed_at ASC
  `).all(previousExercise.id).map((set) => ({
    ...set,
    estimated_1rm: (set.weight_kg != null && Number(set.weight_kg) > 0 && set.reps != null && Number(set.reps) >= 1)
      ? estimate1rm(set.weight_kg, set.reps)
      : null,
  }));
}

function getSessionDetail(db, sessionId) {
  const session = getSessionSummary(db, sessionId);
  if (!session) return null;
  const exercises = db.prepare(`
    SELECT
      se.*,
      e.thumb_path,
      e.gif_path,
      e.attribution,
      e.source
    FROM workout_session_exercises se
    LEFT JOIN workout_exercises e ON e.id = se.exercise_id
    WHERE se.session_id = ?
    ORDER BY se.position ASC
  `).all(sessionId).map((exercise) => {
    const rawSets = db.prepare(`
      SELECT * FROM workout_session_sets
      WHERE session_exercise_id = ?
      ORDER BY set_number ASC, completed_at ASC
    `).all(exercise.id);

    const sets = rawSets.map((set) => ({
      ...set,
      estimated_1rm: (set.set_role !== 'warmup' && set.weight_kg != null && Number(set.weight_kg) > 0 && set.reps != null && Number(set.reps) >= 1)
        ? estimate1rm(set.weight_kg, set.reps)
        : null,
    }));

    const previousSets = getPreviousSets(db, exercise, session);
    const best1rm = bestEstimated1rm(sets);

    return {
      ...exercise,
      sets,
      previous_sets: previousSets,
      best_1rm: best1rm,
    };
  });
  return { ...session, exercises };
}

function normalizePurpose(value, existing = null) {
  const fallback = existing?.purpose ?? 'strength';
  if (value === undefined || value === null || value === '') return fallback;
  const purpose = String(value).trim().toLowerCase();
  if (!WORKOUT_PURPOSES.includes(purpose)) {
    const err = new Error('Objetivo do exercício inválido.');
    err.status = 400;
    throw err;
  }
  return purpose;
}

function normalizeDayExerciseBody(body = {}, existing = null) {
  const targetSets = intOrNull(body.target_sets, { min: 1, max: 20 }) ?? existing?.target_sets ?? 3;
  let repMin = intOrNull(body.rep_min, { min: 0, max: 10000 });
  let repMax = intOrNull(body.rep_max, { min: 0, max: 10000 });
  if (body.rep_min === undefined && existing) repMin = existing.rep_min;
  if (body.rep_max === undefined && existing) repMax = existing.rep_max;
  if (repMin !== null && repMax !== null && repMax < repMin) {
    [repMin, repMax] = [repMax, repMin];
  }

  let rirMin = intOrNull(body.target_rir_min, { min: 0, max: 10 });
  let rirMax = intOrNull(body.target_rir_max, { min: 0, max: 10 });
  if (body.target_rir_min === undefined && existing) rirMin = existing.target_rir_min ?? null;
  if (body.target_rir_max === undefined && existing) rirMax = existing.target_rir_max ?? null;
  if (rirMin !== null && rirMax !== null && rirMax < rirMin) {
    [rirMin, rirMax] = [rirMax, rirMin];
  }

  return {
    target_sets: targetSets,
    rep_min: repMin,
    rep_max: repMax,
    target_duration_seconds:
      body.target_duration_seconds === undefined && existing
        ? existing.target_duration_seconds
        : intOrNull(body.target_duration_seconds, { min: 1, max: 86400 }),
    rest_seconds:
      intOrNull(body.rest_seconds, { min: 0, max: 3600 }) ?? existing?.rest_seconds ?? 90,
    purpose: normalizePurpose(body.purpose, existing),
    target_rir_min: rirMin,
    target_rir_max: rirMax,
    notes: body.notes !== undefined ? text(body.notes) : existing?.notes || '',
    superset_group: body.superset_group !== undefined ? (text(body.superset_group) || null) : (existing?.superset_group ?? null),
  };
}

function nextDayId(db, programId, currentDayId) {
  const days = dayRowsForProgram(db, programId, { withExercises: false });
  if (!days.length) return null;
  const index = days.findIndex((day) => day.id === currentDayId);
  if (index < 0) return days[0].id;
  return days[(index + 1) % days.length].id;
}

function advanceProgram(db, programId, currentDayId = null) {
  const program = getProgram(db, programId, { withExercises: false });
  if (!program) return null;
  const current = currentDayId || currentDayForProgram(program)?.id || null;
  const next = nextDayId(db, programId, current);
  db.prepare(`
    UPDATE workout_programs
    SET current_day_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(next, programId);
  return getProgram(db, programId);
}

function setActiveProgram(db, programId) {
  const program = db.prepare('SELECT id FROM workout_programs WHERE id = ?').get(programId);
  if (!program) return null;
  const tx = db.transaction(() => {
    db.prepare('UPDATE workout_programs SET is_active = 0').run();
    db.prepare(`
      UPDATE workout_programs
      SET is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(programId);
  });
  tx();
  return getProgram(db, programId);
}

function normalizeBandLevel(value, existing = null) {
  if (value === undefined) {
    return existing?.band_level ?? null;
  }
  if (value === null || value === '') return null;
  const level = String(value).trim().toLowerCase();
  if (!WORKOUT_BAND_LEVELS.includes(level)) {
    const err = new Error('Nível de elástico inválido.');
    err.status = 400;
    throw err;
  }
  return level;
}

function normalizeSetRole(value, existing = null) {
  if (value === undefined) return existing?.set_role ?? 'work';
  if (value === null || value === '') return existing?.set_role ?? 'work';
  const role = String(value).trim().toLowerCase();
  if (!WORKOUT_SET_ROLES.includes(role)) {
    const err = new Error('Tipo de série inválido.');
    err.status = 400;
    throw err;
  }
  return role;
}

function normalizeTechnicalQuality(value, existing = null) {
  if (value === undefined) return existing?.technical_quality ?? null;
  if (value === null || value === '') return null;
  const quality = String(value).trim().toLowerCase();
  if (!WORKOUT_TECHNICAL_QUALITIES.includes(quality)) {
    const err = new Error('Qualidade técnica inválida.');
    err.status = 400;
    throw err;
  }
  return quality;
}

function sessionSetPayload(body = {}, existing = null) {
  return {
    weight_kg:
      body.weight_kg === undefined && existing
        ? existing.weight_kg
        : numberOrNull(body.weight_kg, { min: 0, max: 5000 }),
    reps:
      body.reps === undefined && existing
        ? existing.reps
        : intOrNull(body.reps, { min: 0, max: 100000 }),
    duration_seconds:
      body.duration_seconds === undefined && existing
        ? existing.duration_seconds
        : intOrNull(body.duration_seconds, { min: 0, max: 86400 }),
    distance_m:
      body.distance_m === undefined && existing
        ? existing.distance_m
        : numberOrNull(body.distance_m, { min: 0, max: 10000000 }),
    band_level: normalizeBandLevel(body.band_level, existing),
    set_role: normalizeSetRole(body.set_role, existing),
    rir:
      body.rir === undefined && existing
        ? existing.rir
        : intOrNull(body.rir, { min: 0, max: 10 }),
    technical_quality: normalizeTechnicalQuality(body.technical_quality, existing),
    notes: body.notes !== undefined ? text(body.notes) : existing?.notes || '',
  };
}

function validateSetForTracking(trackingType, payload) {
  if (trackingType === 'duration') return payload.duration_seconds !== null;
  if (trackingType === 'distance') return payload.distance_m !== null;
  if (trackingType === 'distance_duration') {
    return payload.distance_m !== null || payload.duration_seconds !== null;
  }
  return payload.reps !== null;
}

export function registerWorkoutRoutes(app, db) {
  const handle = (fn) => (req, res) => {
    try {
      return fn(req, res);
    } catch (error) {
      console.error('Workout route error:', error);
      return res.status(500).json({ error: 'Não foi possível concluir a ação de treino.' });
    }
  };

  
  app.get('/api/workouts/agent-snapshot', handle((req, res) => {
    const days = intOrNull(req.query?.days, { min: 1, max: 365 }) || 14;
    const now = new Date();

    const active = db.prepare(`
      SELECT id FROM workout_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get();
    const activeSession = active ? getSessionDetail(db, active.id) : null;

    const lastSessions = db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM workout_session_exercises se WHERE se.session_id = s.id) AS exercise_count,
        (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id) AS completed_sets,
        (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id AND (ss.set_role IS NULL OR ss.set_role != 'warmup')) AS completed_work_sets,
        (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id AND ss.set_role = 'warmup') AS completed_warmup_sets
      FROM workout_sessions s
      WHERE s.status = 'completed'
      ORDER BY s.started_at DESC
      LIMIT 5
    `).all();

    const rows = db.prepare(`
      SELECT
        ss.id,
        ss.set_role,
        ss.completed_at,
        ss.weight_kg,
        ss.reps,
        s.id AS session_id,
        s.status AS session_status,
        s.started_at AS session_started_at,
        s.completed_at AS session_completed_at,
        se.exercise_id,
        se.exercise_name_snapshot,
        e.target_muscle,
        e.muscle_group,
        e.body_part,
        e.secondary_muscles_json
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      JOIN workout_sessions s ON s.id = ss.session_id
      LEFT JOIN workout_exercises e ON e.id = se.exercise_id
      WHERE s.status = 'completed'
        AND (ss.set_role IS NULL OR ss.set_role != 'warmup')
      ORDER BY COALESCE(s.completed_at, s.started_at, ss.completed_at) ASC
    `).all();

    const muscleMapBalance = computeBalanceMap(rows, { days, now, mode: 'balance' });
    const notes = activeSession?.notes || (lastSessions.length > 0 ? (lastSessions[0].notes || '') : '');

    res.json({
      generated_at: now.toISOString(),
      active_session: activeSession,
      last_sessions: lastSessions,
      muscle_map_balance: muscleMapBalance,
      notes: text(notes),
    });
  }));

  app.get('/api/workouts/heatmap', handle((req, res) => {
    let yearNum;
    if (req.query?.year !== undefined && req.query?.year !== '') {
      const parsed = Number(req.query.year);
      if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2200) {
        return res.status(400).json({ error: 'Ano inválido. Envie um ano válido (ex: 2026).' });
      }
      yearNum = parsed;
    } else {
      yearNum = new Date().getFullYear();
    }

    const yearStr = String(yearNum);
    // Group completed sessions by calendar day prefix YYYY-MM-DD extracted from session started_at (UTC / ISO date consistently)
    const rows = db.prepare(`
      SELECT
        substr(s.started_at, 1, 10) AS date,
        COUNT(DISTINCT s.id) AS sessions,
        COUNT(ss.id) AS sets,
        SUM(CASE WHEN ss.id IS NOT NULL AND (ss.set_role IS NULL OR ss.set_role != 'warmup') THEN 1 ELSE 0 END) AS work_sets
      FROM workout_sessions s
      LEFT JOIN workout_session_sets ss ON ss.session_id = s.id
      WHERE s.status = 'completed'
        AND substr(s.started_at, 1, 4) = ?
      GROUP BY substr(s.started_at, 1, 10)
      ORDER BY date ASC
    `).all(yearStr);

    const days = rows.map((r) => ({
      date: r.date,
      sessions: Number(r.sessions || 0),
      sets: Number(r.sets || 0),
      work_sets: Number(r.work_sets || 0),
    }));

    res.json({
      year: yearNum,
      days,
    });
  }));

  app.get('/api/workouts/muscle-map', handle((req, res) => {
    const rawMode = req.query?.mode != null ? String(req.query.mode).trim().toLowerCase() : 'balance';
    if (rawMode && !['balance', 'fatigue', 'strength'].includes(rawMode)) {
      return res.status(400).json({ error: 'Modo inválido. Escolha entre "balance", "fatigue" ou "strength".' });
    }
    const mode = rawMode || 'balance';
    const days = intOrNull(req.query?.days, { min: 1, max: 365 }) || 14;
    const now = new Date();

    const rows = db.prepare(`
      SELECT
        ss.id,
        ss.set_role,
        ss.completed_at,
        ss.weight_kg,
        ss.reps,
        s.id AS session_id,
        s.status AS session_status,
        s.started_at AS session_started_at,
        s.completed_at AS session_completed_at,
        se.exercise_id,
        se.exercise_name_snapshot,
        e.target_muscle,
        e.muscle_group,
        e.body_part,
        e.secondary_muscles_json
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      JOIN workout_sessions s ON s.id = ss.session_id
      LEFT JOIN workout_exercises e ON e.id = se.exercise_id
      WHERE s.status = 'completed'
        AND (ss.set_role IS NULL OR ss.set_role != 'warmup')
      ORDER BY COALESCE(s.completed_at, s.started_at, ss.completed_at) ASC
    `).all();

    const result = computeBalanceMap(rows, { days, now, mode });
    res.json(result);
  }));

  app.get('/api/workouts/summary', handle((req, res) => {
    const program = getActiveProgram(db);
    const activeSession = db.prepare(`
      SELECT * FROM workout_sessions
      WHERE status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `).get();
    const totalCompleted = db.prepare(`
      SELECT COUNT(*) AS count FROM workout_sessions WHERE status = 'completed'
    `).get()?.count || 0;
    const currentDay = currentDayForProgram(program);

    res.json({
      active_program: program,
      current_day: currentDay,
      active_session: activeSession ? getSessionSummary(db, activeSession.id) : null,
      total_completed: Number(totalCompleted),
    });
  }));

  app.get('/api/workouts/programs', handle((req, res) => {
    const programs = db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM workout_days d WHERE d.program_id = p.id) AS day_count,
        (SELECT COUNT(*) FROM workout_sessions s WHERE s.workout_program_id = p.id AND s.status = 'completed') AS completed_sessions
      FROM workout_programs p
      ORDER BY p.is_active DESC, p.updated_at DESC, p.created_at DESC
    `).all();
    res.json(programs);
  }));

  app.post('/api/workouts/programs', handle((req, res) => {
    const name = text(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Dê um nome ao programa.' });
    const id = randomUUID();
    const hasPrograms = db.prepare('SELECT COUNT(*) AS count FROM workout_programs').get()?.count > 0;
    const isActive = boolInt(req.body?.is_active, hasPrograms ? 0 : 1);

    const tx = db.transaction(() => {
      if (isActive) db.prepare('UPDATE workout_programs SET is_active = 0').run();
      db.prepare(`
        INSERT INTO workout_programs (id, name, description, is_active)
        VALUES (?, ?, ?, ?)
      `).run(id, name, text(req.body?.description), isActive);
    });
    tx();
    res.status(201).json(getProgram(db, id));
  }));

  app.get('/api/workouts/programs/:id', handle((req, res) => {
    const program = getProgram(db, req.params.id);
    if (!program) return res.status(404).json({ error: 'Programa não encontrado.' });
    res.json(program);
  }));

  app.patch('/api/workouts/programs/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Programa não encontrado.' });

    const name = req.body?.name !== undefined ? text(req.body.name) : existing.name;
    if (!name) return res.status(400).json({ error: 'Dê um nome ao programa.' });

    if (req.body?.current_day_id !== undefined && req.body.current_day_id !== null) {
      const validDay = db.prepare(`
        SELECT id FROM workout_days WHERE id = ? AND program_id = ?
      `).get(req.body.current_day_id, existing.id);
      if (!validDay) return res.status(400).json({ error: 'Esse dia não pertence ao programa.' });
    }

    db.prepare(`
      UPDATE workout_programs
      SET name = ?, description = ?, current_day_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name,
      req.body?.description !== undefined ? text(req.body.description) : existing.description,
      req.body?.current_day_id !== undefined ? req.body.current_day_id : existing.current_day_id,
      existing.id,
    );

    if (req.body?.is_active === true || req.body?.is_active === 1) {
      setActiveProgram(db, existing.id);
    }
    res.json(getProgram(db, existing.id));
  }));

  app.post('/api/workouts/programs/:id/activate', handle((req, res) => {
    const program = setActiveProgram(db, req.params.id);
    if (!program) return res.status(404).json({ error: 'Programa não encontrado.' });
    res.json(program);
  }));

  app.post('/api/workouts/programs/:id/advance', handle((req, res) => {
    const program = advanceProgram(db, req.params.id, req.body?.current_day_id || null);
    if (!program) return res.status(404).json({ error: 'Programa não encontrado.' });
    res.json(program);
  }));

  app.delete('/api/workouts/programs/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Programa não encontrado.' });

    const tx = db.transaction(() => {
      const dayIds = db.prepare('SELECT id FROM workout_days WHERE program_id = ?').all(existing.id).map((r) => r.id);
      for (const dayId of dayIds) {
        const dayExerciseIds = db.prepare('SELECT id FROM workout_day_exercises WHERE workout_day_id = ?').all(dayId).map((r) => r.id);
        for (const dayExerciseId of dayExerciseIds) {
          db.prepare('UPDATE workout_session_exercises SET workout_day_exercise_id = NULL WHERE workout_day_exercise_id = ?').run(dayExerciseId);
        }
        db.prepare('DELETE FROM workout_day_exercises WHERE workout_day_id = ?').run(dayId);
        db.prepare('UPDATE workout_sessions SET workout_day_id = NULL WHERE workout_day_id = ?').run(dayId);
      }
      db.prepare('UPDATE workout_sessions SET workout_program_id = NULL WHERE workout_program_id = ?').run(existing.id);
      db.prepare('DELETE FROM workout_days WHERE program_id = ?').run(existing.id);
      db.prepare('DELETE FROM workout_programs WHERE id = ?').run(existing.id);
    });
    tx();

    if (existing.is_active) {
      const fallback = db.prepare('SELECT id FROM workout_programs ORDER BY created_at ASC LIMIT 1').get();
      if (fallback) setActiveProgram(db, fallback.id);
    }
    res.json({ success: true });
  }));

  app.post('/api/workouts/programs/:id/days', handle((req, res) => {
    const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(req.params.id);
    if (!program) return res.status(404).json({ error: 'Programa não encontrado.' });
    const name = text(req.body?.name);
    if (!name) return res.status(400).json({ error: 'Dê um nome ao dia.' });
    const dayType = WORKOUT_DAY_TYPES.includes(req.body?.day_type) ? req.body.day_type : 'training';
    const id = randomUUID();
    const position = nextPosition(db, 'workout_days', 'program_id', program.id);
    const duration = intOrNull(req.body?.estimated_duration_minutes, { min: 1, max: 1440 });

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO workout_days (
          id, program_id, name, day_type, position, estimated_duration_minutes, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, program.id, name, dayType, position, duration, text(req.body?.notes));
      if (!program.current_day_id) {
        db.prepare(`
          UPDATE workout_programs
          SET current_day_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(id, program.id);
      }
    });
    tx();
    res.status(201).json(getProgram(db, program.id));
  }));

  app.patch('/api/workouts/days/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_days WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Dia não encontrado.' });
    const name = req.body?.name !== undefined ? text(req.body.name) : existing.name;
    if (!name) return res.status(400).json({ error: 'Dê um nome ao dia.' });
    const dayType = WORKOUT_DAY_TYPES.includes(req.body?.day_type) ? req.body.day_type : existing.day_type;
    const duration = req.body?.estimated_duration_minutes === undefined
      ? existing.estimated_duration_minutes
      : intOrNull(req.body.estimated_duration_minutes, { min: 1, max: 1440 });

    db.prepare(`
      UPDATE workout_days
      SET name = ?, day_type = ?, estimated_duration_minutes = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name,
      dayType,
      duration,
      req.body?.notes !== undefined ? text(req.body.notes) : existing.notes,
      existing.id,
    );
    res.json(getProgram(db, existing.program_id));
  }));

  app.delete('/api/workouts/days/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_days WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Dia não encontrado.' });

    const tx = db.transaction(() => {
      const dayExerciseIds = db.prepare('SELECT id FROM workout_day_exercises WHERE workout_day_id = ?').all(existing.id).map((r) => r.id);
      for (const dayExerciseId of dayExerciseIds) {
        db.prepare('UPDATE workout_session_exercises SET workout_day_exercise_id = NULL WHERE workout_day_exercise_id = ?').run(dayExerciseId);
      }
      db.prepare('DELETE FROM workout_day_exercises WHERE workout_day_id = ?').run(existing.id);
      db.prepare('UPDATE workout_sessions SET workout_day_id = NULL WHERE workout_day_id = ?').run(existing.id);
      db.prepare('DELETE FROM workout_days WHERE id = ?').run(existing.id);

      const program = db.prepare('SELECT * FROM workout_programs WHERE id = ?').get(existing.program_id);
      if (program?.current_day_id === existing.id) {
        const first = db.prepare(`
          SELECT id FROM workout_days WHERE program_id = ? ORDER BY position ASC LIMIT 1
        `).get(existing.program_id);
        db.prepare(`
          UPDATE workout_programs
          SET current_day_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(first?.id || null, existing.program_id);
      }
    });
    tx();
    res.json(getProgram(db, existing.program_id));
  }));

  app.patch('/api/workouts/programs/:id/days/reorder', handle((req, res) => {
    const ids = Array.isArray(req.body?.ordered_ids) ? req.body.ordered_ids.map(String) : [];
    const actual = db.prepare('SELECT id FROM workout_days WHERE program_id = ?').all(req.params.id).map((r) => r.id);
    if (ids.length !== actual.length || actual.some((id) => !ids.includes(id))) {
      return res.status(400).json({ error: 'A ordem enviada não corresponde aos dias do programa.' });
    }
    const update = db.prepare('UPDATE workout_days SET position = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const tx = db.transaction(() => ids.forEach((id, index) => update.run(index, id)));
    tx();
    res.json(getProgram(db, req.params.id));
  }));

  app.get('/api/workouts/exercises', handle((req, res) => {
    const q = text(req.query?.q);
    const bodyPart = text(req.query?.body_part);
    const equipment = text(req.query?.equipment);
    const equipmentKey = text(req.query?.equipment_key);
    const targetMuscle = text(req.query?.target_muscle);
    const source = text(req.query?.source).toLowerCase();
    const hasMeta = req.query?.meta === '1' || req.query?.meta === 'true' || req.query?.meta === 'object' || req.query?.format === 'object';

    const limit = safeLimit(req.query?.limit, 50, 200);
    let offset = 0;
    if (req.query?.offset !== undefined && req.query?.offset !== '') {
      offset = Math.max(0, intOrNull(req.query.offset) ?? 0);
    } else if (req.query?.page !== undefined && req.query?.page !== '') {
      const page = Math.max(1, intOrNull(req.query.page) ?? 1);
      offset = (page - 1) * limit;
    }

    let whereClause = "WHERE e.status = 'active'";
    const params = [];

    if (q) {
      whereClause += ` AND (
        LOWER(e.name) LIKE LOWER(?)
        OR LOWER(COALESCE(e.name_pt, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(e.muscle_group, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(e.equipment, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(e.equipment_key, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(e.target_muscle, '')) LIKE LOWER(?)
        OR LOWER(COALESCE(e.body_part, '')) LIKE LOWER(?)
      )`;
      const needle = `%${q}%`;
      params.push(needle, needle, needle, needle, needle, needle, needle);
    }

    if (bodyPart) {
      whereClause += " AND LOWER(COALESCE(e.body_part, '')) = LOWER(?)";
      params.push(bodyPart);
    }

    if (equipmentKey) {
      whereClause += " AND LOWER(COALESCE(e.equipment_key, '')) = LOWER(?)";
      params.push(equipmentKey);
    } else if (equipment) {
      whereClause += " AND (LOWER(COALESCE(e.equipment, '')) = LOWER(?) OR LOWER(COALESCE(e.equipment_key, '')) = LOWER(?))";
      params.push(equipment, equipment);
    }

    if (targetMuscle) {
      whereClause += " AND LOWER(COALESCE(e.target_muscle, '')) = LOWER(?)";
      params.push(targetMuscle);
    }

    if (source === 'catalog') {
      whereClause += " AND (e.source = 'catalog' OR (e.source IS NULL AND e.is_custom = 0))";
    } else if (source === 'custom') {
      whereClause += " AND (e.source = 'custom' OR (e.source IS NULL AND e.is_custom = 1))";
    }

    const countSql = `SELECT COUNT(*) AS total FROM workout_exercises e ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params);
    const total = Number(totalRow?.total || 0);

    const itemsSql = `
      SELECT e.*,
        (SELECT COUNT(*) FROM workout_day_exercises wde WHERE wde.exercise_id = e.id) AS usage_count
      FROM workout_exercises e
      ${whereClause}
      ORDER BY usage_count DESC, e.updated_at DESC, e.name ASC
      LIMIT ? OFFSET ?
    `;
    const items = db.prepare(itemsSql).all(...params, limit, offset).map(presentExercise);

    res.setHeader('X-Total-Count', String(total));

    if (hasMeta) {
      return res.json({
        items,
        total,
        limit,
        offset,
      });
    }

    return res.json(items);
  }));

  app.get('/api/workouts/exercises/:id', handle((req, res) => {
    const exercise = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM workout_day_exercises wde WHERE wde.exercise_id = e.id) AS usage_count
      FROM workout_exercises e
      WHERE e.id = ? AND e.status = 'active'
    `).get(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercício não encontrado.' });
    res.json(presentExercise(exercise));
  }));

  app.get('/api/workouts/exercises/:id/stats', handle((req, res) => {
    const exercise = db.prepare(`
      SELECT id, name, tracking_type
      FROM workout_exercises
      WHERE id = ? AND status = 'active'
    `).get(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercício não encontrado.' });

    const workSets = db.prepare(`
      SELECT ss.id, ss.weight_kg, ss.reps, ss.duration_seconds, ss.distance_m, ss.completed_at, ss.set_role, s.id AS session_id, s.started_at
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      JOIN workout_sessions s ON s.id = ss.session_id
      WHERE se.exercise_id = ?
        AND (ss.set_role IS NULL OR ss.set_role != 'warmup')
      ORDER BY ss.completed_at ASC
    `).all(exercise.id);

    let bestWeight = null;
    let bestReps = null;
    let lastPerformedAt = null;
    const sessionIds = new Set();

    for (const s of workSets) {
      if (s.session_id) sessionIds.add(s.session_id);
      const w = s.weight_kg != null ? Number(s.weight_kg) : null;
      if (w !== null && Number.isFinite(w) && w > 0) {
        if (bestWeight === null || w > bestWeight) {
          bestWeight = w;
        }
      }
      const r = s.reps != null ? Number(s.reps) : null;
      if (r !== null && Number.isFinite(r) && r > 0) {
        if (bestReps === null || r > bestReps) {
          bestReps = r;
        }
      }
      const timestamp = s.completed_at || s.started_at;
      if (timestamp) {
        if (!lastPerformedAt || timestamp > lastPerformedAt) {
          lastPerformedAt = timestamp;
        }
      }
    }

    const best1rm = bestEstimated1rm(workSets);
    const lastSet = workSets.length ? workSets[workSets.length - 1] : null;
    const lastWeightRaw = lastSet?.weight_kg != null ? Number(lastSet.weight_kg) : null;
    const lastRepsRaw = lastSet?.reps != null ? Number(lastSet.reps) : null;

    res.json({
      exercise_id: exercise.id,
      best_1rm: best1rm,
      best_weight: bestWeight,
      best_reps: bestReps,
      last_weight: lastWeightRaw !== null && Number.isFinite(lastWeightRaw) ? lastWeightRaw : null,
      last_reps: lastRepsRaw !== null && Number.isFinite(lastRepsRaw) ? lastRepsRaw : null,
      last_performed_at: lastPerformedAt,
      total_work_sets: workSets.length,
      total_sessions: sessionIds.size,
    });
  }));

  app.post('/api/workouts/exercises', handle((req, res) => {
    const payload = normalizeExerciseBody(req.body);
    if (!payload.name) return res.status(400).json({ error: 'Dê um nome ao exercício.' });
    const duplicate = db.prepare(`
      SELECT * FROM workout_exercises WHERE LOWER(name) = LOWER(?) AND status = 'active' LIMIT 1
    `).get(payload.name);
    if (duplicate) return res.status(409).json({ error: 'Esse exercício já existe.', exercise: duplicate });
    const id = randomUUID();
    db.prepare(`
      INSERT INTO workout_exercises (
        id, name, category, muscle_group, equipment, tracking_type, instructions,
        is_custom, catalog_external_id, source, body_part, target_muscle,
        secondary_muscles_json, media_id, thumb_path, gif_path, attribution,
        instructions_json, equipment_key, is_bodyweight_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      payload.name,
      payload.category,
      payload.muscle_group,
      payload.equipment,
      payload.tracking_type,
      payload.instructions,
      payload.is_custom,
      payload.catalog_external_id,
      payload.source,
      payload.body_part,
      payload.target_muscle,
      payload.secondary_muscles_json,
      payload.media_id,
      payload.thumb_path,
      payload.gif_path,
      payload.attribution,
      payload.instructions_json,
      payload.equipment_key,
      payload.is_bodyweight_default,
    );
    res.status(201).json(db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(id));
  }));

  app.patch('/api/workouts/exercises/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Exercício não encontrado.' });
    const payload = normalizeExerciseBody(req.body, existing);
    if (!payload.name) return res.status(400).json({ error: 'Dê um nome ao exercício.' });
    db.prepare(`
      UPDATE workout_exercises
      SET name = ?, category = ?, muscle_group = ?, equipment = ?, tracking_type = ?, instructions = ?,
          is_custom = ?, catalog_external_id = ?, source = ?, body_part = ?, target_muscle = ?,
          secondary_muscles_json = ?, media_id = ?, thumb_path = ?, gif_path = ?, attribution = ?,
          instructions_json = ?, equipment_key = ?, is_bodyweight_default = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      payload.name,
      payload.category,
      payload.muscle_group,
      payload.equipment,
      payload.tracking_type,
      payload.instructions,
      payload.is_custom,
      payload.catalog_external_id,
      payload.source,
      payload.body_part,
      payload.target_muscle,
      payload.secondary_muscles_json,
      payload.media_id,
      payload.thumb_path,
      payload.gif_path,
      payload.attribution,
      payload.instructions_json,
      payload.equipment_key,
      payload.is_bodyweight_default,
      existing.id,
    );
    res.json(db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(existing.id));
  }));

  app.delete('/api/workouts/exercises/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Exercício não encontrado.' });
    db.prepare(`
      UPDATE workout_exercises SET status = 'archived', updated_at = datetime('now') WHERE id = ?
    `).run(existing.id);
    res.json({ success: true });
  }));

  app.post('/api/workouts/days/:id/exercises', handle((req, res) => {
    const day = db.prepare('SELECT * FROM workout_days WHERE id = ?').get(req.params.id);
    if (!day) return res.status(404).json({ error: 'Dia não encontrado.' });
    if (day.day_type === 'rest') return res.status(400).json({ error: 'Dia de descanso não recebe exercícios.' });
    const exercise = db.prepare('SELECT * FROM workout_exercises WHERE id = ? AND status = \'active\'').get(req.body?.exercise_id);
    if (!exercise) return res.status(404).json({ error: 'Exercício não encontrado.' });
    const id = randomUUID();
    const position = nextPosition(db, 'workout_day_exercises', 'workout_day_id', day.id);
    let config;
    try {
      config = normalizeDayExerciseBody(req.body);
    } catch (error) {
      if (error?.status === 400) return res.status(400).json({ error: error.message });
      throw error;
    }
    db.prepare(`
      INSERT INTO workout_day_exercises (
        id, workout_day_id, exercise_id, position, target_sets, rep_min, rep_max,
        target_duration_seconds, rest_seconds, purpose, target_rir_min, target_rir_max, notes, superset_group
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      day.id,
      exercise.id,
      position,
      config.target_sets,
      config.rep_min,
      config.rep_max,
      config.target_duration_seconds,
      config.rest_seconds,
      config.purpose,
      config.target_rir_min,
      config.target_rir_max,
      config.notes,
      config.superset_group,
    );
    res.status(201).json(getProgram(db, day.program_id));
  }));

  app.patch('/api/workouts/day-exercises/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_day_exercises WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Exercício do treino não encontrado.' });
    let config;
    try {
      config = normalizeDayExerciseBody(req.body, existing);
    } catch (error) {
      if (error?.status === 400) return res.status(400).json({ error: error.message });
      throw error;
    }
    db.prepare(`
      UPDATE workout_day_exercises
      SET target_sets = ?, rep_min = ?, rep_max = ?, target_duration_seconds = ?, rest_seconds = ?,
          purpose = ?, target_rir_min = ?, target_rir_max = ?, notes = ?, superset_group = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      config.target_sets,
      config.rep_min,
      config.rep_max,
      config.target_duration_seconds,
      config.rest_seconds,
      config.purpose,
      config.target_rir_min,
      config.target_rir_max,
      config.notes,
      config.superset_group,
      existing.id,
    );
    const day = db.prepare('SELECT * FROM workout_days WHERE id = ?').get(existing.workout_day_id);
    res.json(getProgram(db, day.program_id));
  }));

  app.delete('/api/workouts/day-exercises/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_day_exercises WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Exercício do treino não encontrado.' });
    const day = db.prepare('SELECT * FROM workout_days WHERE id = ?').get(existing.workout_day_id);
    db.prepare('UPDATE workout_session_exercises SET workout_day_exercise_id = NULL WHERE workout_day_exercise_id = ?').run(existing.id);
    db.prepare('DELETE FROM workout_day_exercises WHERE id = ?').run(existing.id);
    res.json(getProgram(db, day.program_id));
  }));

  app.patch('/api/workouts/days/:id/exercises/reorder', handle((req, res) => {
    const day = db.prepare('SELECT * FROM workout_days WHERE id = ?').get(req.params.id);
    if (!day) return res.status(404).json({ error: 'Dia não encontrado.' });
    const ids = Array.isArray(req.body?.ordered_ids) ? req.body.ordered_ids.map(String) : [];
    const actual = db.prepare('SELECT id FROM workout_day_exercises WHERE workout_day_id = ?').all(day.id).map((r) => r.id);
    if (ids.length !== actual.length || actual.some((id) => !ids.includes(id))) {
      return res.status(400).json({ error: 'A ordem enviada não corresponde aos exercícios do treino.' });
    }
    const update = db.prepare('UPDATE workout_day_exercises SET position = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const tx = db.transaction(() => ids.forEach((id, index) => update.run(index, id)));
    tx();
    res.json(getProgram(db, day.program_id));
  }));

  app.get('/api/workouts/sessions', handle((req, res) => {
    const limit = safeLimit(req.query?.limit, 30, 200);
    const status = WORKOUT_SESSION_STATUSES.includes(req.query?.status) ? req.query.status : 'completed';
    const rows = db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM workout_session_exercises se WHERE se.session_id = s.id) AS exercise_count,
        (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id) AS completed_sets,
        (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id AND (ss.set_role IS NULL OR ss.set_role != 'warmup')) AS completed_work_sets,
        (SELECT COUNT(*) FROM workout_session_sets ss WHERE ss.session_id = s.id AND ss.set_role = 'warmup') AS completed_warmup_sets
      FROM workout_sessions s
      WHERE s.status = ?
      ORDER BY s.started_at DESC
      LIMIT ?
    `).all(status, limit);
    res.json(rows);
  }));

  app.get('/api/workouts/sessions/active', handle((req, res) => {
    const active = db.prepare(`
      SELECT id FROM workout_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get();
    res.json(active ? getSessionDetail(db, active.id) : null);
  }));

  app.post('/api/workouts/sessions', handle((req, res) => {
    const isFreestyle = req.body?.freestyle === true || req.body?.kind === 'freestyle' || (!req.body?.workout_day_id && req.body?.workout_day_id !== 0);

    let day = null;
    if (!isFreestyle) {
      day = db.prepare(`
        SELECT d.*, p.name AS program_name
        FROM workout_days d
        JOIN workout_programs p ON p.id = d.program_id
        WHERE d.id = ?
      `).get(req.body?.workout_day_id);
      if (!day) return res.status(404).json({ error: 'Treino não encontrado.' });
      if (day.day_type === 'rest') return res.status(400).json({ error: 'Esse é um dia de descanso.' });
    }

    const existingActive = db.prepare(`
      SELECT * FROM workout_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get();
    if (existingActive) {
      if (!isFreestyle && day && existingActive.workout_day_id === day.id) {
        return res.status(409).json({ error: 'Já existe um treino em andamento.', session: getSessionDetail(db, existingActive.id) });
      }
      const workSetsCount = db.prepare(`
        SELECT COUNT(*) AS count FROM workout_session_sets
        WHERE session_id = ? AND (set_role IS NULL OR set_role != 'warmup')
      `).get(existingActive.id)?.count || 0;
      if (workSetsCount > 0) {
        return res.status(409).json({
          error: 'Já existe um treino em andamento com séries registradas. Termina ou abandona o treino antes de começar outro.',
          session: getSessionDetail(db, existingActive.id),
        });
      }
    }

    const sessionId = randomUUID();
    const startedAt = new Date().toISOString();
    const insertSessionExercise = db.prepare(`
      INSERT INTO workout_session_exercises (
        id, session_id, workout_day_exercise_id, exercise_id, exercise_name_snapshot,
        tracking_type, position, target_sets, rep_min, rep_max, target_duration_seconds,
        rest_seconds, purpose, target_rir_min, target_rir_max, notes, superset_group
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      if (existingActive) {
        const completedAt = startedAt;
        const startedMs = Date.parse(existingActive.started_at);
        const durationSeconds = Number.isFinite(startedMs)
          ? Math.max(0, Math.round((Date.parse(completedAt) - startedMs) / 1000))
          : null;
        db.prepare(`
          UPDATE workout_sessions
          SET status = 'abandoned', completed_at = ?, duration_seconds = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(completedAt, durationSeconds, existingActive.id);
      }

      if (isFreestyle) {
        const sessionName = text(req.body?.name, 'Treino Livre');
        db.prepare(`
          INSERT INTO workout_sessions (
            id, workout_program_id, workout_day_id, program_name_snapshot,
            workout_day_name_snapshot, status, started_at, kind
          ) VALUES (?, NULL, NULL, '', ?, 'active', ?, 'freestyle')
        `).run(sessionId, sessionName, startedAt);

        if (Array.isArray(req.body?.exercises)) {
          req.body.exercises.forEach((item, index) => {
            const exId = item.exercise_id || item.id;
            const exObj = db.prepare('SELECT * FROM workout_exercises WHERE id = ?').get(exId);
            if (exObj) {
              insertSessionExercise.run(
                randomUUID(),
                sessionId,
                null,
                exObj.id,
                exObj.name,
                exObj.tracking_type || 'reps',
                index,
                intOrNull(item.target_sets, { min: 1, max: 20 }) ?? 3,
                intOrNull(item.rep_min, { min: 0, max: 10000 }),
                intOrNull(item.rep_max, { min: 0, max: 10000 }),
                intOrNull(item.target_duration_seconds, { min: 1, max: 86400 }),
                intOrNull(item.rest_seconds, { min: 0, max: 3600 }) ?? 90,
                normalizePurpose(item.purpose, { purpose: 'strength' }),
                intOrNull(item.target_rir_min, { min: 0, max: 10 }),
                intOrNull(item.target_rir_max, { min: 0, max: 10 }),
                text(item.notes),
                text(item.superset_group) || null,
              );
            }
          });
        }
      } else {
        const dayExercises = exerciseRowsForDay(db, day.id);
        if (!dayExercises.length) {
          const err = new Error('Adicione pelo menos um exercício antes de começar.');
          err.status = 400;
          throw err;
        }

        db.prepare(`
          INSERT INTO workout_sessions (
            id, workout_program_id, workout_day_id, program_name_snapshot,
            workout_day_name_snapshot, status, started_at, kind
          ) VALUES (?, ?, ?, ?, ?, 'active', ?, 'program')
        `).run(sessionId, day.program_id, day.id, day.program_name, day.name, startedAt);

        for (const item of dayExercises) {
          insertSessionExercise.run(
            randomUUID(),
            sessionId,
            item.id,
            item.exercise_id,
            item.exercise_name,
            item.tracking_type,
            item.position,
            item.target_sets,
            item.rep_min,
            item.rep_max,
            item.target_duration_seconds,
            item.rest_seconds,
            item.purpose ?? 'strength',
            item.target_rir_min ?? null,
            item.target_rir_max ?? null,
            item.notes,
            item.superset_group ?? null,
          );
        }
      }
    });

    try {
      tx();
    } catch (e) {
      if (e?.status === 400) return res.status(400).json({ error: e.message });
      throw e;
    }

    res.status(201).json(getSessionDetail(db, sessionId));
  }));

  app.post('/api/workouts/sessions/:id/exercises', handle((req, res) => {
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });

    const exerciseId = req.body?.exercise_id || req.body?.id;
    const exercise = db.prepare("SELECT * FROM workout_exercises WHERE id = ? AND status = 'active'").get(exerciseId);
    if (!exercise) return res.status(404).json({ error: 'Exercício não encontrado.' });

    const posRow = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM workout_session_exercises WHERE session_id = ?').get(session.id);
    const position = Number(posRow?.next_pos || 0);

    const targetSets = intOrNull(req.body?.target_sets, { min: 1, max: 20 }) ?? 3;
    let repMin = intOrNull(req.body?.rep_min, { min: 0, max: 10000 });
    let repMax = intOrNull(req.body?.rep_max, { min: 0, max: 10000 });
    if (repMin !== null && repMax !== null && repMax < repMin) {
      [repMin, repMax] = [repMax, repMin];
    }
    let rirMin = intOrNull(req.body?.target_rir_min, { min: 0, max: 10 });
    let rirMax = intOrNull(req.body?.target_rir_max, { min: 0, max: 10 });
    if (rirMin !== null && rirMax !== null && rirMax < rirMin) {
      [rirMin, rirMax] = [rirMax, rirMin];
    }
    const targetDuration = intOrNull(req.body?.target_duration_seconds, { min: 1, max: 86400 });
    const restSeconds = intOrNull(req.body?.rest_seconds, { min: 0, max: 3600 }) ?? 90;
    const purpose = normalizePurpose(req.body?.purpose, { purpose: 'strength' });
    const supersetGroup = req.body?.superset_group !== undefined ? (text(req.body.superset_group) || null) : null;
    const notes = text(req.body?.notes);

    const id = randomUUID();
    db.prepare(`
      INSERT INTO workout_session_exercises (
        id, session_id, workout_day_exercise_id, exercise_id, exercise_name_snapshot,
        tracking_type, position, target_sets, rep_min, rep_max, target_duration_seconds,
        rest_seconds, purpose, target_rir_min, target_rir_max, notes, superset_group
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      session.id,
      req.body?.workout_day_exercise_id || null,
      exercise.id,
      exercise.name,
      exercise.tracking_type || 'reps',
      position,
      targetSets,
      repMin,
      repMax,
      targetDuration,
      restSeconds,
      purpose,
      rirMin,
      rirMax,
      notes,
      supersetGroup,
    );

    res.status(201).json(getSessionDetail(db, session.id));
  }));

  app.patch('/api/workouts/session-exercises/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_session_exercises WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Exercício da sessão não encontrado.' });
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(existing.session_id);
    if (session?.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });

    let exerciseId = existing.exercise_id;
    let exerciseNameSnapshot = existing.exercise_name_snapshot;
    let trackingType = existing.tracking_type;

    const requestedExerciseId = req.body?.exercise_id;
    if (requestedExerciseId !== undefined && requestedExerciseId !== existing.exercise_id) {
      const workSetsCount = db.prepare(`
        SELECT COUNT(*) AS count FROM workout_session_sets
        WHERE session_exercise_id = ? AND (set_role IS NULL OR set_role != 'warmup')
      `).get(existing.id)?.count || 0;
      if (workSetsCount > 0) {
        return res.status(400).json({ error: 'já tem série nesse exercício' });
      }
      const exercise = db.prepare("SELECT * FROM workout_exercises WHERE id = ? AND status = 'active'").get(requestedExerciseId);
      if (!exercise) return res.status(404).json({ error: 'Exercício não encontrado.' });
      exerciseId = exercise.id;
      exerciseNameSnapshot = exercise.name;
      trackingType = exercise.tracking_type || 'reps';
    }

    const targetSets = req.body?.target_sets !== undefined
      ? (intOrNull(req.body.target_sets, { min: 1, max: 20 }) ?? existing.target_sets)
      : existing.target_sets;
    const restSeconds = req.body?.rest_seconds !== undefined
      ? (intOrNull(req.body.rest_seconds, { min: 0, max: 3600 }) ?? existing.rest_seconds)
      : existing.rest_seconds;
    const supersetGroup = req.body?.superset_group !== undefined
      ? (text(req.body.superset_group) || null)
      : existing.superset_group;
    const notes = req.body?.notes !== undefined ? text(req.body.notes) : existing.notes;

    db.prepare(`
      UPDATE workout_session_exercises
      SET target_sets = ?, rest_seconds = ?, superset_group = ?, notes = ?,
          exercise_id = ?, exercise_name_snapshot = ?, tracking_type = ?
      WHERE id = ?
    `).run(
      targetSets,
      restSeconds,
      supersetGroup,
      notes,
      exerciseId,
      exerciseNameSnapshot,
      trackingType,
      existing.id,
    );

    res.json(getSessionDetail(db, existing.session_id));
  }));

  app.delete('/api/workouts/session-exercises/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_session_exercises WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Exercício da sessão não encontrado.' });
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(existing.session_id);
    if (session?.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM workout_session_sets WHERE session_exercise_id = ?').run(existing.id);
      db.prepare('DELETE FROM workout_session_exercises WHERE id = ?').run(existing.id);
    });
    tx();
    res.json(getSessionDetail(db, existing.session_id));
  }));

  app.get('/api/workouts/sessions/:id', handle((req, res) => {
    const session = getSessionDetail(db, req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    res.json(session);
  }));

  app.post('/api/workouts/sessions/:id/sets', handle((req, res) => {
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });

    const sessionExercise = db.prepare(`
      SELECT * FROM workout_session_exercises WHERE id = ? AND session_id = ?
    `).get(req.body?.session_exercise_id, session.id);
    if (!sessionExercise) return res.status(404).json({ error: 'Exercício não pertence à sessão.' });

    let payload;
    try {
      payload = sessionSetPayload(req.body);
    } catch (error) {
      if (error?.status === 400) return res.status(400).json({ error: error.message });
      throw error;
    }
    if (!validateSetForTracking(sessionExercise.tracking_type, payload)) {
      return res.status(400).json({ error: 'Preencha o resultado principal desta série.' });
    }
    const previousHistoricalSets = db.prepare(`
      SELECT ss.id, ss.weight_kg, ss.reps, ss.duration_seconds, ss.distance_m, ss.set_role
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      WHERE se.exercise_id = ?
        AND (ss.set_role IS NULL OR ss.set_role != 'warmup')
    `).all(sessionExercise.exercise_id);

    const prResult = detectPersonalRecord(payload, previousHistoricalSets);
    const isPr = prResult.is_pr ? 1 : 0;
    const prType = prResult.pr_type || null;

    const nextSet = db.prepare(`
      SELECT COALESCE(MAX(set_number), 0) + 1 AS next_number
      FROM workout_session_sets WHERE session_exercise_id = ?
    `).get(sessionExercise.id)?.next_number || 1;
    const id = randomUUID();
    db.prepare(`
      INSERT INTO workout_session_sets (
        id, session_id, session_exercise_id, set_number, weight_kg, reps,
        duration_seconds, distance_m, band_level, set_role, rir, technical_quality, notes, completed_at,
        is_pr, pr_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      session.id,
      sessionExercise.id,
      nextSet,
      payload.weight_kg,
      payload.reps,
      payload.duration_seconds,
      payload.distance_m,
      payload.band_level,
      payload.set_role,
      payload.rir,
      payload.technical_quality,
      payload.notes,
      new Date().toISOString(),
      isPr,
      prType,
    );
    const detail = getSessionDetail(db, session.id);
    res.status(201).json({
      ...detail,
      last_logged_set_id: id,
      is_pr: Boolean(isPr),
      pr_type: prType,
    });
  }));

  app.patch('/api/workouts/sets/:id', handle((req, res) => {
    const existing = db.prepare(`
      SELECT ss.*, se.tracking_type
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      WHERE ss.id = ?
    `).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Série não encontrada.' });
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(existing.session_id);
    if (session?.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });
    let payload;
    try {
      payload = sessionSetPayload(req.body, existing);
    } catch (error) {
      if (error?.status === 400) return res.status(400).json({ error: error.message });
      throw error;
    }
    if (!validateSetForTracking(existing.tracking_type, payload)) {
      return res.status(400).json({ error: 'Preencha o resultado principal desta série.' });
    }
    const previousHistoricalSets = db.prepare(`
      SELECT ss.id, ss.weight_kg, ss.reps, ss.duration_seconds, ss.distance_m, ss.set_role
      FROM workout_session_sets ss
      JOIN workout_session_exercises se ON se.id = ss.session_exercise_id
      WHERE se.exercise_id = (SELECT exercise_id FROM workout_session_exercises WHERE id = ?)
        AND ss.id != ?
        AND (ss.set_role IS NULL OR ss.set_role != 'warmup')
    `).all(existing.session_exercise_id, existing.id);

    const prResult = detectPersonalRecord(payload, previousHistoricalSets);
    const isPr = prResult.is_pr ? 1 : 0;
    const prType = prResult.pr_type || null;

    db.prepare(`
      UPDATE workout_session_sets
      SET weight_kg = ?, reps = ?, duration_seconds = ?, distance_m = ?, band_level = ?,
          set_role = ?, rir = ?, technical_quality = ?, notes = ?, is_pr = ?, pr_type = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      payload.weight_kg,
      payload.reps,
      payload.duration_seconds,
      payload.distance_m,
      payload.band_level,
      payload.set_role,
      payload.rir,
      payload.technical_quality,
      payload.notes,
      isPr,
      prType,
      existing.id,
    );
    res.json(getSessionDetail(db, existing.session_id));
  }));

  app.delete('/api/workouts/sets/:id', handle((req, res) => {
    const existing = db.prepare('SELECT * FROM workout_session_sets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Série não encontrada.' });
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(existing.session_id);
    if (session?.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });
    db.prepare('DELETE FROM workout_session_sets WHERE id = ?').run(existing.id);
    res.json(getSessionDetail(db, existing.session_id));
  }));

  app.post('/api/workouts/sessions/:id/finish', handle((req, res) => {
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });
    // Only working sets count toward finishing — a warmup-only session cannot be completed.
    const workSetsCount = db.prepare(`
      SELECT COUNT(*) AS count FROM workout_session_sets
      WHERE session_id = ? AND (set_role IS NULL OR set_role != 'warmup')
    `).get(session.id)?.count || 0;
    if (!workSetsCount) return res.status(400).json({ error: 'Registre pelo menos uma série de trabalho antes de finalizar.' });

    const completedAt = new Date().toISOString();
    const startedMs = Date.parse(session.started_at);
    const durationSeconds = Number.isFinite(startedMs)
      ? Math.max(1, Math.round((Date.parse(completedAt) - startedMs) / 1000))
      : null;

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE workout_sessions
        SET status = 'completed', completed_at = ?, duration_seconds = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(completedAt, durationSeconds, text(req.body?.notes, session.notes || ''), session.id);
      if (session.workout_program_id && session.workout_day_id) {
        const next = nextDayId(db, session.workout_program_id, session.workout_day_id);
        db.prepare(`
          UPDATE workout_programs
          SET current_day_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(next, session.workout_program_id);
      }
    });
    tx();
    res.json(getSessionDetail(db, session.id));
  }));

  app.post('/api/workouts/sessions/:id/abandon', handle((req, res) => {
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Essa sessão já foi encerrada.' });
    const completedAt = new Date().toISOString();
    const startedMs = Date.parse(session.started_at);
    const durationSeconds = Number.isFinite(startedMs)
      ? Math.max(0, Math.round((Date.parse(completedAt) - startedMs) / 1000))
      : null;
    db.prepare(`
      UPDATE workout_sessions
      SET status = 'abandoned', completed_at = ?, duration_seconds = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(completedAt, durationSeconds, session.id);
    res.json(getSessionDetail(db, session.id));
  }));
}
