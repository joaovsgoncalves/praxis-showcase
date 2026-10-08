/**
 * Praxis Treinos V4 — Set Prefill & Weight Cascade (Fase 7)
 *
 * Provides intelligent prefill for session set logging:
 * - Prefills next work set from last completed work set of the same exercise.
 * - Falls back to previous session's work sets if no work sets completed yet in current session.
 * - Warmup sets NEVER prefill work sets.
 * - Warmup history is isolated to warmup sets.
 * - Weight cascade automatically suggests the load from the last completed work set across remaining slots.
 */

import { isWarmupSet } from './pr.js';

export const EMPTY_SET_FORM = {
  weight_kg: '',
  reps: '',
  duration_seconds: '',
  distance_m: '',
  band_level: '',
  set_role: 'work',
  rir: '',
  technical_quality: '',
  note: '',
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

/**
 * Computes prefill values for the next set form.
 *
 * @param {Object} exercise Current exercise object with \`sets\`, \`previous_sets\`, and metadata.
 * @param {'work'|'warmup'} role Target set role ('work' or 'warmup').
 * @param {Object} options Configuration options ({ cascadeWeight: boolean, targetSlotIndex: number }).
 * @returns {Object} Prefilled form values conforming to EMPTY_SET_FORM structure.
 */
export function computeSetPrefill(exercise, role = 'work', options = {}) {
  const { cascadeWeight = true, targetSlotIndex } = options;
  const targetRole = role === 'warmup' ? 'warmup' : 'work';
  const currentSets = exercise?.sets || [];
  const currentWorkSets = getWorkSets(currentSets);
  const currentWarmupSets = getWarmupSets(currentSets);
  const previousSets = exercise?.previous_sets || [];
  const previousWorkSets = getWorkSets(previousSets);
  const previousWarmupSets = getWarmupSets(previousSets);

  if (targetRole === 'warmup') {
    const lastWarmup = currentWarmupSets.length > 0
      ? currentWarmupSets[currentWarmupSets.length - 1]
      : (previousWarmupSets.length > 0 ? previousWarmupSets[0] : null);

    return {
      ...EMPTY_SET_FORM,
      weight_kg: lastWarmup?.weight_kg != null ? lastWarmup.weight_kg : '',
      reps: lastWarmup?.reps != null ? lastWarmup.reps : '',
      duration_seconds: lastWarmup?.duration_seconds != null
        ? lastWarmup.duration_seconds
        : (exercise?.target_duration_seconds ?? ''),
      distance_m: lastWarmup?.distance_m != null ? lastWarmup.distance_m : '',
      band_level: lastWarmup?.band_level != null ? lastWarmup.band_level : '',
      set_role: 'warmup',
      rir: '',
      technical_quality: '',
      note: '',
    };
  }

  // targetRole === 'work'
  // 1. If current session has completed work sets:
  // When cascadeWeight is enabled (default), cascade load from the last completed work set.
  if (currentWorkSets.length > 0) {
    const lastWork = currentWorkSets[currentWorkSets.length - 1];
    return {
      ...EMPTY_SET_FORM,
      weight_kg: lastWork.weight_kg != null ? lastWork.weight_kg : '',
      reps: lastWork.reps != null ? lastWork.reps : '',
      duration_seconds: lastWork.duration_seconds != null
        ? lastWork.duration_seconds
        : (exercise?.target_duration_seconds ?? ''),
      distance_m: lastWork.distance_m != null ? lastWork.distance_m : '',
      band_level: lastWork.band_level != null ? lastWork.band_level : '',
      set_role: 'work',
      rir: lastWork.rir != null ? String(lastWork.rir) : '',
      technical_quality: '',
      note: '',
    };
  }

  // 2. If current session has NO completed work sets yet:
  // Prefill from previous session's work sets (CRITICAL: ignore any warmup sets from previous session).
  if (previousWorkSets.length > 0) {
    const slotIdx = typeof targetSlotIndex === 'number' ? targetSlotIndex : 0;
    const prevWork = previousWorkSets[slotIdx] || previousWorkSets[previousWorkSets.length - 1];
    return {
      ...EMPTY_SET_FORM,
      weight_kg: prevWork.weight_kg != null ? prevWork.weight_kg : '',
      reps: prevWork.reps != null ? prevWork.reps : '',
      duration_seconds: prevWork.duration_seconds != null
        ? prevWork.duration_seconds
        : (exercise?.target_duration_seconds ?? ''),
      distance_m: prevWork.distance_m != null ? prevWork.distance_m : '',
      band_level: prevWork.band_level != null ? prevWork.band_level : '',
      set_role: 'work',
      rir: prevWork.rir != null ? String(prevWork.rir) : '',
      technical_quality: '',
      note: '',
    };
  }

  // 3. No work sets in current session AND no work sets in previous session:
  // Return clean empty form with exercise target defaults.
  return {
    ...EMPTY_SET_FORM,
    weight_kg: '',
    reps: '',
    duration_seconds: exercise?.target_duration_seconds ?? '',
    distance_m: '',
    band_level: '',
    set_role: 'work',
    rir: '',
    technical_quality: '',
    note: '',
  };
}
