import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { praxisApi } from "@/api/praxisClient";
import { Card, CardContent } from "@/components/ui/card";
import { PraxisEmptyState, PraxisListSkeleton } from "@/components/layout/PraxisPage";
import { format1rm } from "@/lib/workoutV4";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_SESSION_LIMIT = 5;

function countCompletedInLast7Days(sessions = [], now = Date.now()) {
  const cutoff = now - WEEK_MS;
  return sessions.filter((session) => {
    const raw = session.completed_at || session.started_at;
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) && t >= cutoff && t <= now;
  }).length;
}

/** Unique exercises from the last completed sessions — never the full catalog. */
function uniqueExercisesFromSessions(details = []) {
  const seen = new Set();
  const unique = [];
  for (const detail of details) {
    for (const exercise of detail?.exercises || []) {
      if (!exercise?.exercise_id || seen.has(exercise.exercise_id)) continue;
      seen.add(exercise.exercise_id);
      unique.push(exercise);
    }
  }
  return unique;
}

function formatQty(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatLastSet(stats = {}) {
  const weight = formatQty(stats.last_weight);
  const repsNum = stats.last_reps == null || stats.last_reps === "" ? null : Number(stats.last_reps);
  const reps = repsNum != null && Number.isFinite(repsNum) ? String(repsNum) : null;
  if (weight && reps) return `${weight} × ${reps}`;
  if (weight) return `${weight} kg`;
  if (reps) return `${reps} ${repsNum === 1 ? "rep" : "reps"}`;
  return "—";
}

function formatBestLoad(stats = {}) {
  const weight = formatQty(stats.best_weight);
  if (!weight) return "—";
  return `${weight} kg`;
}

export default function WorkoutProgress() {
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["workouts", "history"],
    queryFn: () => praxisApi.workouts.sessions.list({ status: "completed", limit: 50 }),
    staleTime: 15_000,
  });

  const recentIds = useMemo(
    () => sessions.slice(0, RECENT_SESSION_LIMIT).map((session) => session.id),
    [sessions],
  );

  const weekCount = useMemo(() => countCompletedInLast7Days(sessions), [sessions]);

  const { data: progressItems = [], isLoading: loadingProgress } = useQuery({
    queryKey: ["workouts", "progress", recentIds],
    enabled: recentIds.length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const details = await Promise.all(
        recentIds.map((id) => praxisApi.workouts.sessions.get(id)),
      );
      const unique = uniqueExercisesFromSessions(details);
      const settled = await Promise.allSettled(
        unique.map(async (exercise) => {
          const stats = await praxisApi.workouts.exercises.stats(exercise.exercise_id);
          return {
            id: exercise.exercise_id,
            name: exercise.exercise_name_snapshot,
            stats,
          };
        }),
      );
      return settled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
    },
  });

  const waiting = loadingSessions || (recentIds.length > 0 && loadingProgress);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{weekCount}</span>
        {weekCount === 1 ? " treino" : " treinos"} nos últimos 7 dias
      </p>

      {waiting ? (
        <PraxisListSkeleton rows={3} />
      ) : !progressItems.length ? (
        <PraxisEmptyState
          icon={Dumbbell}
          title="Fecha um treino pra aparecer evolução."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {progressItems.map((item) => {
            const oneRm = format1rm(item.stats?.best_1rm);
            return (
              <Card key={item.id} className="border-border/70 bg-card/35 shadow-none">
                <CardContent className="p-4">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <dl className="mt-3 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">Última</dt>
                      <dd className="text-sm font-semibold tabular-nums">{formatLastSet(item.stats)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">Melhor</dt>
                      <dd className="text-sm font-semibold tabular-nums">{formatBestLoad(item.stats)}</dd>
                    </div>
                    {oneRm ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-xs text-muted-foreground">1RM est.</dt>
                        <dd className="text-sm font-semibold tabular-nums">{oneRm}</dd>
                      </div>
                    ) : null}
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
