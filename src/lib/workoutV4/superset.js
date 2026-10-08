/**
 * Praxis Treinos V4 — Superset & Freestyle session helpers (Fase 12)
 * Pure isomorphic helpers for rest skip between superset pairs and freestyle detection.
 */

/**
 * Determines whether the automatic rest timer should be skipped after completing a work set.
 * In a superset, if the next exercise in the session shares the same non-empty `superset_group`,
 * rest is skipped so the athlete moves directly to the paired exercise.
 *
 * @param {Array} exercises - List of session exercises in order
 * @param {number} currentIndex - Index of the exercise whose set was just completed
 * @returns {boolean} True if auto-rest should be skipped, false otherwise
 */
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

/**
 * Checks if a session is a freestyle (ad-hoc) session.
 *
 * @param {Object} session - Session object
 * @returns {boolean} True if freestyle, false if program-based
 */
export function isFreestyleSession(session) {
  if (!session) return false;
  if (session.kind === "freestyle") return true;
  return !session.workout_program_id && !session.workout_day_id;
}

/**
 * Returns all indices of exercises sharing the same superset_group as targetIndex.
 *
 * @param {Array} exercises - List of exercises
 * @param {number} targetIndex - Target exercise index
 * @returns {Array<number>} Array of matching exercise indices
 */
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
