/**
 * Praxis Treinos V4 — Muscle Map (Fase 9 & Fase 10: Balance, Fatigue, Strength)
 *
 * Computes muscle metrics over a time window for 3 distinct modes:
 * - "balance": completed work-set volume (primary 1.0, secondary 0.4). unit = "sets"
 * - "fatigue": exponential decay by age days with halfLife = 7 days. unit = "sets"
 * - "strength": best estimated 1RM (Epley) from work sets targeting each muscle. unit = "kg"
 */
import {
  MUSCLES,
  MUSCLE_LABEL_PT,
  aliasMuscle,
  extractSecondaryMuscles,
} from "./muscles.js";
import { isWarmupSet } from "./pr.js";
import { estimate1rm } from "./oneRm.js";

/**
 * Computes muscle map payload for a given mode ("balance" | "fatigue" | "strength").
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
