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

import { isWarmupSet } from "./pr.js";

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

  return num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + " kg";
}
