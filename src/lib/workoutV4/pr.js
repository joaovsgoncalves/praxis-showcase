/**
 * Personal Record (PR) detection & toast formatting for Praxis Treinos V4 (Fase 6).
 */

export function isWarmupSet(set) {
  return set?.set_role === "warmup";
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
