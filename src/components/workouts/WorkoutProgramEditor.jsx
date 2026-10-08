import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Link2,
  Unlink,
} from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatSeconds, formatWorkoutTarget, workoutDayShortLabel } from '@/lib/workouts';
import WorkoutProgramDialog from './WorkoutProgramDialog';
import WorkoutDayDialog from './WorkoutDayDialog';
import ExercisePickerDialog from './ExercisePickerDialog';
import WorkoutExerciseConfigDialog from './WorkoutExerciseConfigDialog';

function workoutExerciseAsCatalog(exercise) {
  return {
    id: exercise.exercise_id,
    name: exercise.exercise_name,
    category: exercise.exercise_category,
    tracking_type: exercise.tracking_type,
    muscle_group: exercise.muscle_group,
    equipment: exercise.equipment,
  };
}

export default function WorkoutProgramEditor({
  program,
  programs = [],
  activeSession = null,
  onStart,
  onContinue,
  starting = false,
}) {
  const queryClient = useQueryClient();
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [programDialog, setProgramDialog] = useState({ open: false, initial: null });
  const [dayDialog, setDayDialog] = useState({ open: false, initial: null });
  const [picker, setPicker] = useState({ open: false, day: null });
  const [exerciseConfig, setExerciseConfig] = useState({ open: false, day: null, exercise: null, initial: null });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workouts'] });
  const fail = (title) => (error) => toast.error(title, {
    description: error?.message || 'Tenta novamente.',
  });

  useEffect(() => {
    if (!program?.days?.length) {
      setSelectedDayId(null);
      return;
    }
    const stillExists = program.days.some((day) => day.id === selectedDayId);
    if (!stillExists) {
      setSelectedDayId(program.current_day_id || program.days[0].id);
    }
  }, [program, selectedDayId]);

  const selectedDay = useMemo(
    () => program?.days?.find((day) => day.id === selectedDayId) || null,
    [program, selectedDayId],
  );

  const createProgram = useMutation({
    mutationFn: (data) => praxisApi.workouts.programs.create(data),
    onSuccess: async (created) => {
      if (!created.is_active) await praxisApi.workouts.programs.activate(created.id);
      setProgramDialog({ open: false, initial: null });
      refresh();
      toast.success('Programa criado', { description: 'Agora monta os dias do teu ciclo.' });
    },
    onError: fail('Não deu pra criar o programa'),
  });

  const updateProgram = useMutation({
    mutationFn: ({ id, data }) => praxisApi.workouts.programs.update(id, data),
    onSuccess: () => {
      setProgramDialog({ open: false, initial: null });
      refresh();
      toast('Programa atualizado');
    },
    onError: fail('Não deu pra atualizar'),
  });

  const activateProgram = useMutation({
    mutationFn: (id) => praxisApi.workouts.programs.activate(id),
    onSuccess: () => {
      refresh();
      toast('Programa ativado');
    },
    onError: fail('Não deu pra trocar o programa'),
  });

  const deleteProgram = useMutation({
    mutationFn: (id) => praxisApi.workouts.programs.delete(id),
    onSuccess: () => {
      setSelectedDayId(null);
      refresh();
      toast('Programa removido', { description: 'O histórico das sessões foi preservado.' });
    },
    onError: fail('Não deu pra remover o programa'),
  });

  const createDay = useMutation({
    mutationFn: (data) => praxisApi.workouts.days.create(program.id, data),
    onSuccess: (updated) => {
      const newest = updated.days?.[updated.days.length - 1];
      if (newest) setSelectedDayId(newest.id);
      setDayDialog({ open: false, initial: null });
      refresh();
      toast('Dia adicionado');
    },
    onError: fail('Não deu pra adicionar o dia'),
  });

  const updateDay = useMutation({
    mutationFn: ({ id, data }) => praxisApi.workouts.days.update(id, data),
    onSuccess: () => {
      setDayDialog({ open: false, initial: null });
      refresh();
      toast('Dia atualizado');
    },
    onError: fail('Não deu pra atualizar o dia'),
  });

  const deleteDay = useMutation({
    mutationFn: (id) => praxisApi.workouts.days.delete(id),
    onSuccess: () => {
      refresh();
      toast('Dia removido');
    },
    onError: fail('Não deu pra remover o dia'),
  });

  const reorderDays = useMutation({
    mutationFn: (orderedIds) => praxisApi.workouts.programs.reorderDays(program.id, orderedIds),
    onSuccess: refresh,
    onError: fail('Não deu pra reorganizar os dias'),
  });

  const setCurrentDay = useMutation({
    mutationFn: (dayId) => praxisApi.workouts.programs.update(program.id, { current_day_id: dayId }),
    onSuccess: () => {
      refresh();
      toast('Próximo treino atualizado');
    },
    onError: fail('Não deu pra definir o próximo treino'),
  });

  const addExercise = useMutation({
    mutationFn: ({ dayId, exerciseId, config }) => praxisApi.workouts.days.addExercise(dayId, {
      exercise_id: exerciseId,
      ...config,
    }),
    onSuccess: () => {
      setExerciseConfig({ open: false, day: null, exercise: null, initial: null });
      refresh();
      toast('Exercício adicionado');
    },
    onError: fail('Não deu pra adicionar o exercício'),
  });

  const updateExercise = useMutation({
    mutationFn: ({ id, config }) => praxisApi.workouts.dayExercises.update(id, config),
    onSuccess: () => {
      setExerciseConfig({ open: false, day: null, exercise: null, initial: null });
      refresh();
      toast('Exercício atualizado');
    },
    onError: fail('Não deu pra atualizar o exercício'),
  });

  const deleteExercise = useMutation({
    mutationFn: (id) => praxisApi.workouts.dayExercises.delete(id),
    onSuccess: () => {
      refresh();
      toast('Exercício removido do treino');
    },
    onError: fail('Não deu pra remover o exercício'),
  });

  const reorderExercises = useMutation({
    mutationFn: ({ dayId, orderedIds }) => praxisApi.workouts.days.reorderExercises(dayId, orderedIds),
    onSuccess: refresh,
    onError: fail('Não deu pra reorganizar os exercícios'),
  });

  const moveItem = (items, index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return null;
    const copy = [...items];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    return copy.map((item) => item.id);
  };

  const handlePairSuperset = async (index) => {
    if (!selectedDay?.exercises || index >= selectedDay.exercises.length - 1) return;
    const currentEx = selectedDay.exercises[index];
    const nextEx = selectedDay.exercises[index + 1];
    const groupId = "SS_" + Math.random().toString(36).slice(2, 8);
    try {
      await praxisApi.workouts.dayExercises.update(currentEx.id, { superset_group: groupId });
      await praxisApi.workouts.dayExercises.update(nextEx.id, { superset_group: groupId });
      refresh();
      toast.success("Superset criado", { description: `${currentEx.exercise_name} + ${nextEx.exercise_name} agrupados em par.` });
    } catch (err) {
      toast.error("Não deu pra criar o superset", { description: err?.message });
    }
  };

  const handleUnpairSuperset = async (group) => {
    if (!selectedDay?.exercises || !group) return;
    const paired = selectedDay.exercises.filter((ex) => ex.superset_group === group);
    try {
      for (const ex of paired) {
        await praxisApi.workouts.dayExercises.update(ex.id, { superset_group: null });
      }
      refresh();
      toast("Superset desfeito");
    } catch (err) {
      toast.error("Não deu pra desfazer o superset", { description: err?.message });
    }
  };

  const confirmDeleteProgram = () => {
    if (!program) return;
    const ok = window.confirm(`Remover o programa “${program.name}”? O histórico de treinos realizados será preservado.`);
    if (ok) deleteProgram.mutate(program.id);
  };

  if (!program) return null;

  return (
    <div className="space-y-5">
      {programs.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 praxis-hide-scrollbar praxis-scroll-x" aria-label="Programas de treino">
          {programs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.is_active ? null : activateProgram.mutate(item.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                item.is_active
                  ? 'border-primary/50 bg-primary/12 text-foreground'
                  : 'border-border/70 bg-card/30 text-muted-foreground hover:text-foreground',
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/50 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold tracking-tight">{program.name}</p>
                {program.is_active ? <Badge variant="secondary" className="rounded-full">Ativo</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {program.days.length} {program.days.length === 1 ? 'dia' : 'dias'} no ciclo
                {program.description ? ` · ${program.description}` : ''}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Opções do programa">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProgramDialog({ open: true, initial: program })}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar programa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProgramDialog({ open: true, initial: null })}>
                  <Plus className="mr-2 h-4 w-4" /> Novo programa
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={confirmDeleteProgram}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remover programa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Dias do ciclo</p>
            <p className="text-xs text-muted-foreground">Toca num dia para montar o treino.</p>
          </div>
          <Button type="button" size="sm" className="rounded-full" onClick={() => setDayDialog({ open: true, initial: null })}>
            <Plus className="mr-1.5 h-4 w-4" /> Dia
          </Button>
        </div>

        {program.days.length ? (
          <div className="space-y-2">
            {program.days.map((day, index) => {
              const isSelected = day.id === selectedDayId;
              const isCurrent = day.id === program.current_day_id;
              return (
                <div
                  key={day.id}
                  className={cn(
                    'group rounded-2xl border transition-colors',
                    isSelected ? 'border-primary/45 bg-primary/7' : 'border-border/70 bg-card/35',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDayId(day.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums',
                      isCurrent ? 'border-primary/35 bg-primary/12 text-primary' : 'border-border/60 bg-secondary/35 text-muted-foreground',
                    )}>
                      {day.day_type === 'rest' ? <RotateCcw className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{day.name}</p>
                        {isCurrent ? <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary">Próximo</span> : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{workoutDayShortLabel(day)}</p>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform text-muted-foreground', isSelected && 'rotate-90 text-primary')} />
                  </button>

                  {isSelected ? (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2.5">
                      <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={() => setDayDialog({ open: true, initial: day })}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      {!isCurrent ? (
                        <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={() => setCurrentDay.mutate(day.id)}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Marcar como próximo
                        </Button>
                      ) : null}
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          aria-label="Mover dia para cima"
                          disabled={index === 0 || reorderDays.isPending}
                          onClick={() => {
                            const ordered = moveItem(program.days, index, -1);
                            if (ordered) reorderDays.mutate(ordered);
                          }}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          aria-label="Mover dia para baixo"
                          disabled={index === program.days.length - 1 || reorderDays.isPending}
                          onClick={() => {
                            const ordered = moveItem(program.days, index, 1);
                            if (ordered) reorderDays.mutate(ordered);
                          }}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                          aria-label="Remover dia"
                          onClick={() => {
                            if (window.confirm(`Remover “${day.name}” do programa?`)) deleteDay.mutate(day.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-5 py-9 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">Teu ciclo ainda está vazio</p>
            <p className="mt-1 text-xs text-muted-foreground">Adiciona Pull 1, Legs, Push, descanso... na ordem que quiser.</p>
          </div>
        )}
      </div>

      {selectedDay ? (
        <Card className="border-border/80 bg-card/35 shadow-none">
          <CardContent className="p-0">
            <div className="border-b border-border/70 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Treino selecionado</p>
                  <h3 className="mt-1 text-base font-semibold leading-tight">{selectedDay.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{workoutDayShortLabel(selectedDay)}</p>
                </div>
                {selectedDay.day_type === 'training' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {onStart ? (
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 rounded-full"
                        onClick={() => (activeSession?.workout_day_id === selectedDay.id ? onContinue?.() : onStart(selectedDay.id))}
                        disabled={activeSession?.workout_day_id !== selectedDay.id && (starting || !selectedDay.exercises?.length)}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                        {activeSession?.workout_day_id === selectedDay.id ? 'Continuar treino' : starting ? 'Começando...' : 'Começar este treino'}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-full"
                      onClick={() => setPicker({ open: true, day: selectedDay })}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> Exercício
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {selectedDay.day_type === 'rest' ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-semibold">Dia de descanso</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Sem exercícios. Quando chegar nele, basta concluir o descanso para avançar no ciclo.</p>
              </div>
            ) : selectedDay.exercises?.length ? (
              <div className="divide-y divide-border/60">
                {selectedDay.exercises.map((exercise, index) => (
                  <div key={exercise.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/55 text-xs font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </div>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                      onClick={() => setExerciseConfig({
                        open: true,
                        day: selectedDay,
                        exercise: workoutExerciseAsCatalog(exercise),
                        initial: exercise,
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{exercise.exercise_name}</p>
                        {exercise.superset_group ? (
                          <Badge variant="outline" className="h-5 shrink-0 border-primary/40 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Superset
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatWorkoutTarget(exercise)}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {formatSeconds(exercise.rest_seconds)} descanso</span>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label="Mover exercício para cima"
                        disabled={index === 0 || reorderExercises.isPending}
                        onClick={() => {
                          const ordered = moveItem(selectedDay.exercises, index, -1);
                          if (ordered) reorderExercises.mutate({ dayId: selectedDay.id, orderedIds: ordered });
                        }}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label="Mover exercício para baixo"
                        disabled={index === selectedDay.exercises.length - 1 || reorderExercises.isPending}
                        onClick={() => {
                          const ordered = moveItem(selectedDay.exercises, index, 1);
                          if (ordered) reorderExercises.mutate({ dayId: selectedDay.id, orderedIds: ordered });
                        }}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label={`Opções de ${exercise.exercise_name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setExerciseConfig({
                            open: true,
                            day: selectedDay,
                            exercise: workoutExerciseAsCatalog(exercise),
                            initial: exercise,
                          })}>
                            <Pencil className="mr-2 h-4 w-4" /> Configurar
                          </DropdownMenuItem>
                          {!exercise.superset_group && index < selectedDay.exercises.length - 1 ? (
                            <DropdownMenuItem onClick={() => handlePairSuperset(index)}>
                              <Link2 className="mr-2 h-4 w-4" /> Criar Superset com próximo
                            </DropdownMenuItem>
                          ) : null}
                          {exercise.superset_group ? (
                            <DropdownMenuItem onClick={() => handleUnpairSuperset(exercise.superset_group)}>
                              <Unlink className="mr-2 h-4 w-4" /> Desfazer Superset
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (window.confirm(`Remover “${exercise.exercise_name}” deste treino?`)) deleteExercise.mutate(exercise.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-semibold">Nenhum exercício ainda</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Monta o treino na ordem em que você realmente executa.</p>
                <Button type="button" className="mt-4 rounded-full" onClick={() => setPicker({ open: true, day: selectedDay })}>
                  <Plus className="mr-1.5 h-4 w-4" /> Adicionar exercício
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <WorkoutProgramDialog
        open={programDialog.open}
        onOpenChange={(open) => setProgramDialog((current) => ({ ...current, open }))}
        initial={programDialog.initial}
        busy={createProgram.isPending || updateProgram.isPending}
        onSubmit={(data) => {
          if (programDialog.initial) updateProgram.mutate({ id: programDialog.initial.id, data });
          else createProgram.mutate(data);
        }}
      />

      <WorkoutDayDialog
        open={dayDialog.open}
        onOpenChange={(open) => setDayDialog((current) => ({ ...current, open }))}
        initial={dayDialog.initial}
        busy={createDay.isPending || updateDay.isPending}
        onSubmit={(data) => {
          if (dayDialog.initial) updateDay.mutate({ id: dayDialog.initial.id, data });
          else createDay.mutate(data);
        }}
      />

      <ExercisePickerDialog
        open={picker.open}
        onOpenChange={(open) => setPicker((current) => ({ ...current, open }))}
        onSelect={(exercise) => {
          const day = picker.day;
          setPicker({ open: false, day: null });
          setExerciseConfig({ open: true, day, exercise, initial: null });
        }}
      />

      <WorkoutExerciseConfigDialog
        open={exerciseConfig.open}
        onOpenChange={(open) => setExerciseConfig((current) => ({ ...current, open }))}
        exercise={exerciseConfig.exercise}
        initial={exerciseConfig.initial}
        busy={addExercise.isPending || updateExercise.isPending}
        onSubmit={(config) => {
          if (exerciseConfig.initial) {
            updateExercise.mutate({ id: exerciseConfig.initial.id, config });
          } else {
            addExercise.mutate({
              dayId: exerciseConfig.day.id,
              exerciseId: exerciseConfig.exercise.id,
              config,
            });
          }
        }}
      />
    </div>
  );
}
