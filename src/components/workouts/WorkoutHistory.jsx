import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Clock3, Dumbbell, Layers3, X } from "lucide-react";
import { praxisApi } from "@/api/praxisClient";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PraxisEmptyState, PraxisListSkeleton } from "@/components/layout/PraxisPage";
import { cn } from "@/lib/utils";
import {
  format1rm,
  sessionsToHeatmapDays,
} from "@/lib/workoutV4";
import {
  formatSessionDuration,
  formatSetResult,
  formatSetRir,
  formatTechnicalQuality,
  isWarmupSet,
  workoutDateLabel,
} from "@/lib/workouts";
import WorkoutHeatmap from "./WorkoutHeatmap";

/** séries de trabalho registradas — cai para o total legado quando o campo não existe. */
function workSetsCount(session = {}) {
  if (session.completed_work_sets != null) return Number(session.completed_work_sets);
  return Number(session.completed_sets || 0);
}

/** Rótulos estáveis por série: aquecimentos viram A1/A2…, séries de trabalho mantêm o número. */
function labelSets(sets = []) {
  let warmup = 0;
  let work = 0;
  return sets.map((set) => {
    if (isWarmupSet(set)) {
      warmup += 1;
      return { set, label: `A${warmup}`, warmup: true };
    }
    work += 1;
    return { set, label: `${work}`, warmup: false };
  });
}

export default function WorkoutHistory() {
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: sessions = [], isLoading, isError, error } = useQuery({
    queryKey: ["workouts", "history"],
    queryFn: () => praxisApi.workouts.sessions.list({ status: "completed", limit: 50 }),
    staleTime: 15_000,
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["workouts", "history", selectedId],
    queryFn: () => praxisApi.workouts.sessions.get(selectedId),
    enabled: Boolean(selectedId),
  });

  const filteredSessions = useMemo(() => {
    if (!selectedDate) return sessions;
    return sessions.filter((s) => {
      const datePart = s.started_at ? s.started_at.slice(0, 10) : "";
      return datePart === selectedDate;
    });
  }, [sessions, selectedDate]);

  if (isLoading) return <PraxisListSkeleton rows={5} />;

  if (isError) {
    return (
      <PraxisEmptyState
        icon={CalendarClock}
        title="Não consegui abrir o histórico"
        description={error?.message || "Tenta novamente daqui a pouco."}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Year contribution heatmap (weeks × 7) in Praxis Dark + Gold */}
      <WorkoutHeatmap
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        fallbackDays={sessionsToHeatmapDays(sessions)}
      />

      {/* Filter banner if a specific day is clicked */}
      {selectedDate ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs">
          <span className="text-foreground">
            Exibindo treinos de{" "}
            <strong>
              {selectedDate.split("-").reverse().join("/")}
            </strong>{" "}
            ({filteredSessions.length}{" "}
            {filteredSessions.length === 1 ? "encontrado" : "encontrados"})
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Ver todos <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {!sessions.length ? (
        <PraxisEmptyState
          icon={CalendarClock}
          title="Nenhum treino concluído ainda"
          description="Quando você finalizar a primeira sessão, ela aparece aqui com duração, séries e exercícios."
        />
      ) : !filteredSessions.length ? (
        <PraxisEmptyState
          icon={CalendarClock}
          title="Nenhum treino neste dia"
          description="Não encontramos sessões concluídas na data selecionada."
          action={
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Limpar filtro de data
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelectedId(session.id)}
              className="w-full rounded-2xl border border-border/70 bg-card/35 px-4 py-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {session.workout_day_name_snapshot}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {workoutDateLabel(session.started_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />{" "}
                      {formatSessionDuration(session.duration_seconds)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Layers3 className="h-3.5 w-3.5" /> {workSetsCount(session)}{" "}
                      séries
                      {Number(session.completed_warmup_sets) > 0 ? (
                        <span className="text-muted-foreground/70">
                          {" "}
                          +{session.completed_warmup_sets} aquec.
                        </span>
                      ) : null}
                    </span>
                    <span>
                      {session.exercise_count}{" "}
                      {Number(session.exercise_count) === 1
                        ? "exercício"
                        : "exercícios"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl">
          {loadingDetail || !detail ? (
            <div className="space-y-3 py-6">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-secondary/45" />
              ))}
            </div>
          ) : (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle>{detail.workout_day_name_snapshot}</DialogTitle>
                <DialogDescription>
                  {workoutDateLabel(detail.started_at)} · {formatSessionDuration(detail.duration_seconds)} · {workSetsCount(detail)} séries de trabalho
                  {Number(detail.completed_warmup_sets) > 0 ? ` · ${detail.completed_warmup_sets} aquec.` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                {detail.exercises.map((exercise, index) => {
                  const labelled = labelSets(exercise.sets);
                  const workDone = labelled.filter((item) => !item.warmup).length;
                  const warmupDone = labelled.length - workDone;
                  return (
                    <Card key={exercise.id} className="border-border/70 bg-card/35 shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-xs font-semibold tabular-nums text-muted-foreground">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{exercise.exercise_name_snapshot}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {workDone} {workDone === 1 ? "série de trabalho" : "séries de trabalho"}
                              {warmupDone ? ` · ${warmupDone} aquec.` : ""}
                            </p>
                          </div>
                        </div>

                        {labelled.length ? (
                          <div className="mt-3 flex flex-col gap-1.5">
                            {labelled.map(({ set, label, warmup }) => {
                              const rir = formatSetRir(set.rir);
                              const quality = formatTechnicalQuality(set.technical_quality);
                              return (
                                <div
                                  key={set.id}
                                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground"
                                >
                                  <span className={cn("font-semibold tabular-nums", warmup ? "text-muted-foreground/80" : "text-foreground")}>
                                    {label}.
                                  </span>
                                  <span className="tabular-nums">{formatSetResult(set, exercise.tracking_type)}</span>
                                  {!warmup && set.estimated_1rm ? (
                                    <span className="tabular-nums text-muted-foreground/80">1RM ~{format1rm(set.estimated_1rm)}</span>
                                  ) : null}
                                  {warmup ? <span className="uppercase tracking-wide text-muted-foreground/70">aquec.</span> : null}
                                  {rir ? <span className="tabular-nums">{rir}</span> : null}
                                  {quality ? <span>{quality}</span> : null}
                                  {set.notes ? <span className="italic text-muted-foreground/80">“{set.notes}”</span> : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">Sem séries registradas.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
