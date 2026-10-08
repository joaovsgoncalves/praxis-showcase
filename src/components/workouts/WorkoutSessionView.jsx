import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flag,
  Flame,
  Minus,
  Pause,
  Plus,
  Trash2,
} from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import ExerciseMedia from '@/components/workouts/ExerciseMedia';
import ExercisePickerDialog from '@/components/workouts/ExercisePickerDialog';
import { useSessionWakeLock } from '@/lib/workoutV4/wakeLock';
import {
  formatPrToastDescription,
  computeSetPrefill,
  getWorkSets,
  getWarmupSets,
  EMPTY_SET_FORM,
  estimate1rm,
  bestEstimated1rm,
  format1rm,
  shouldSkipAutoRest,
} from '@/lib/workoutV4';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  formatBandLevel,
  formatClock,
  formatPurpose,
  formatRestDuration,
  formatSessionElapsed,
  formatSeconds,
  formatSetResult,
  formatSetRir,
  formatTargetRir,
  formatTechnicalQuality,
  formatWorkoutTarget,
  isWarmupSet,
  trackingUsesBand,
  trackingUsesRir,
  trackingUsesWeight,
  WORKOUT_BAND_LEVELS,
  WORKOUT_RIR_MAX_CHIP,
  WORKOUT_RIR_OPTIONS,
  WORKOUT_TECHNICAL_QUALITIES,
} from '@/lib/workouts';
import { cn } from '@/lib/utils';

function localRestKey(sessionId) {
  return `praxis:workout-rest:${sessionId}`;
}

function loadRestTimer(sessionId) {
  try {
    const raw = localStorage.getItem(localRestKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.endsAt || parsed.endsAt <= Date.now()) {
      localStorage.removeItem(localRestKey(sessionId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function workSetsOf(exercise) {
  return getWorkSets(exercise?.sets);
}

function warmupSetsOf(exercise) {
  return getWarmupSets(exercise?.sets);
}

function hasPrimaryResult(form, trackingType) {
  if (trackingType === 'duration') return form.duration_seconds !== '';
  if (trackingType === 'distance') return form.distance_m !== '';
  if (trackingType === 'distance_duration') return form.distance_m !== '' || form.duration_seconds !== '';
  return form.reps !== '';
}

function lastWorkSet(sets) {
  if (!sets?.length) return null;
  for (let index = sets.length - 1; index >= 0; index -= 1) {
    if (!isWarmupSet(sets[index])) return sets[index];
  }
  return sets[sets.length - 1];
}

function formatLastLoad(set, trackingType) {
  if (!set) return null;
  if (trackingUsesWeight(trackingType) && set.weight_kg != null && set.reps != null) {
    return `${Number(set.weight_kg).toLocaleString('pt-BR')}kg × ${set.reps}`;
  }
  if (set.reps != null && trackingUsesBand(trackingType)) {
    const band = formatBandLevel(set.band_level);
    if (band && set.band_level !== 'none') return `${set.reps} × ${band.toLowerCase()}`;
    return `${set.reps} reps`;
  }
  const formatted = formatSetResult(set, trackingType);
  return formatted === '—' ? null : formatted;
}

function toOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function StepperInput({
  id,
  label,
  value,
  onChange,
  step = 1,
  inputMode = 'decimal',
  placeholder = '0',
  suffix,
}) {
  const adjust = (direction) => {
    const current = Number(value);
    const base = Number.isFinite(current) ? current : 0;
    const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    const next = Math.max(0, Number((base + direction * step).toFixed(decimals)));
    onChange(String(next));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">{label}</label>
        {suffix ? <span className="text-[10px] text-muted-foreground/75">{suffix}</span> : null}
      </div>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] overflow-hidden rounded-xl border border-border/80 bg-background/55">
        <button
          type="button"
          className="flex min-h-14 items-center justify-center border-r border-border/70 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={`Diminuir ${label.toLowerCase()}`}
          onClick={() => adjust(-1)}
        >
          <Minus className="h-5 w-5" />
        </button>
        <Input
          id={id}
          type="number"
          inputMode={inputMode}
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-14 min-h-12 rounded-none border-0 bg-transparent px-1 text-center text-3xl font-semibold tabular-nums shadow-none focus-visible:ring-0 md:text-3xl"
        />
        <button
          type="button"
          className="flex min-h-14 items-center justify-center border-l border-border/70 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={`Aumentar ${label.toLowerCase()}`}
          onClick={() => adjust(1)}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function BandPicker({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">Elástico</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Elástico da série">
        {WORKOUT_BAND_LEVELS.map((band) => {
          const active = value === band.value;
          return (
            <button
              key={band.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? '' : band.value)}
              className={cn(
                'min-h-10 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary/50 bg-primary/15 text-foreground'
                  : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground',
              )}
            >
              {band.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkoutSessionView({ sessionId, onExit }) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setForm, setSetForm] = useState(EMPTY_SET_FORM);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [restTimer, setRestTimer] = useState(() => loadRestTimer(sessionId));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState('add');
  const toastedPrSetIds = useRef(new Set());
  const lastExerciseIdRef = useRef(null);
  const lastSetsCountRef = useRef(null);

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['workouts', 'session', sessionId],
    queryFn: () => praxisApi.workouts.sessions.get(sessionId),
    enabled: Boolean(sessionId),
    refetchOnWindowFocus: true,
  });

  useSessionWakeLock(session?.status === 'active');

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setRestTimer(loadRestTimer(sessionId));
  }, [sessionId]);

  useEffect(() => {
    if (!session?.exercises?.length) return;
    const firstIncomplete = session.exercises.findIndex((exercise) => exercise.sets.length < Number(exercise.target_sets || 1));
    setCurrentIndex((current) => {
      if (current >= 0 && current < session.exercises.length) return current;
      return firstIncomplete >= 0 ? firstIncomplete : 0;
    });
  }, [session?.exercises?.length]);

  const currentExercise = session?.exercises?.[currentIndex] || null;

  useEffect(() => {
    if (!currentExercise) return;
    const exerciseId = currentExercise.id;
    const setsCount = currentExercise.sets?.length ?? 0;
    const isExerciseChanged = exerciseId !== lastExerciseIdRef.current;
    const isSetsCountChanged = setsCount !== lastSetsCountRef.current;

    if (isExerciseChanged || isSetsCountChanged) {
      lastExerciseIdRef.current = exerciseId;
      lastSetsCountRef.current = setsCount;
      setSetForm(computeSetPrefill(currentExercise, 'work'));
      setIsFormDirty(false);
      setShowDetails(false);
    }
  }, [currentExercise?.id, currentExercise?.exercise_id, currentExercise?.sets?.length]);

  const updateFormField = (field, value) => {
    setIsFormDirty(true);
    setSetForm((current) => ({ ...current, [field]: value }));
  };

  const handleRoleChange = (role) => {
    setSetForm((current) => {
      if (!isFormDirty) {
        return computeSetPrefill(currentExercise, role);
      }
      return { ...current, set_role: role };
    });
  };

  const elapsedSeconds = useMemo(() => {
    if (!session?.started_at) return 0;
    const started = Date.parse(session.started_at);
    if (!Number.isFinite(started)) return 0;
    return Math.max(0, Math.floor((now - started) / 1000));
  }, [now, session?.started_at]);

  const restRemaining = restTimer?.endsAt ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (restTimer?.endsAt && restTimer.endsAt <= now) {
      localStorage.removeItem(localRestKey(sessionId));
      setRestTimer(null);
    }
  }, [now, restTimer, sessionId]);

  const sessionProgress = useMemo(() => {
    if (!session?.exercises?.length) return 0;
    const totalTargets = session.exercises.reduce((sum, exercise) => sum + Math.max(1, Number(exercise.target_sets || 1)), 0);
    const done = session.exercises.reduce((sum, exercise) => sum + workSetsOf(exercise).length, 0);
    return totalTargets ? Math.min(100, Math.round((done / totalTargets) * 100)) : 0;
  }, [session]);

  const totalWorkSets = useMemo(
    () => session?.exercises?.reduce((sum, exercise) => sum + workSetsOf(exercise).length, 0) || 0,
    [session],
  );

  const totalWarmupSets = useMemo(
    () => session?.exercises?.reduce((sum, exercise) => sum + warmupSetsOf(exercise).length, 0) || 0,
    [session],
  );

  const updateSessionCache = (updated) => {
    queryClient.setQueryData(['workouts', 'session', sessionId], updated);
    queryClient.invalidateQueries({ queryKey: ['workouts', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['workouts', 'history'] });
  };

  const exerciseBest1rm = useMemo(() => {
    if (!currentExercise) return null;
    const allSets = [
      ...(currentExercise.sets || []),
      ...(currentExercise.previous_sets || []),
    ];
    return bestEstimated1rm(allSets);
  }, [currentExercise]);

  const exerciseRestSeconds = Number(currentExercise?.rest_seconds) > 0 ? Number(currentExercise.rest_seconds) : 90;

  const startRest = (seconds, exerciseId) => {
    const duration = Number(seconds) > 0 ? Number(seconds) : 90;
    const payload = { endsAt: Date.now() + duration * 1000, exerciseId };
    localStorage.setItem(localRestKey(sessionId), JSON.stringify(payload));
    setRestTimer(payload);
  };

  const handleStartManualRest = () => {
    if (restRemaining > 0) return;
    startRest(exerciseRestSeconds, currentExercise?.id);
  };

  const adjustRest = (deltaSeconds) => {
    if (!restTimer?.endsAt) return;
    const next = { ...restTimer, endsAt: Math.max(Date.now(), restTimer.endsAt + deltaSeconds * 1000) };
    if (next.endsAt <= Date.now()) {
      localStorage.removeItem(localRestKey(sessionId));
      setRestTimer(null);
      return;
    }
    localStorage.setItem(localRestKey(sessionId), JSON.stringify(next));
    setRestTimer(next);
  };

  const addSessionExercise = useMutation({
    mutationFn: (payload) => praxisApi.workouts.sessions.addExercise(sessionId, payload),
    onSuccess: (updated) => {
      updateSessionCache(updated);
      setPickerOpen(false);
      if (updated?.exercises?.length) {
        setCurrentIndex(updated.exercises.length - 1);
      }
      toast.success("Exercício adicionado");
    },
    onError: (mutationError) => toast.error("Não deu pra adicionar o exercício", { description: mutationError?.message }),
  });

  const swapSessionExercise = useMutation({
    mutationFn: (payload) => praxisApi.workouts.sessions.updateExercise(currentExercise.id, payload),
    onSuccess: (updated) => {
      updateSessionCache(updated);
      setPickerOpen(false);
      const updatedExercise = updated.exercises?.find((exercise) => exercise.id === currentExercise?.id);
      if (updatedExercise) {
        lastExerciseIdRef.current = updatedExercise.id;
        lastSetsCountRef.current = updatedExercise.sets?.length ?? 0;
        setSetForm(computeSetPrefill(updatedExercise, 'work'));
        setIsFormDirty(false);
        setShowDetails(false);
      }
      toast.success('Exercício trocado');
    },
    onError: (mutationError) => toast.error(mutationError?.message || 'já tem série nesse exercício'),
  });

  const openAddPicker = () => {
    setPickerMode('add');
    setPickerOpen(true);
  };

  const openSwapPicker = () => {
    if (!currentExercise || swapSessionExercise.isPending) return;
    if (workSetsOf(currentExercise).length > 0) {
      toast.error('já tem série nesse exercício');
      return;
    }
    setPickerMode('swap');
    setPickerOpen(true);
  };

  const handlePickerSelect = (exercise) => {
    if (pickerMode === 'swap') {
      if (!currentExercise) return;
      if (workSetsOf(currentExercise).length > 0) {
        toast.error('já tem série nesse exercício');
        setPickerOpen(false);
        return;
      }
      if (exercise.id === currentExercise.exercise_id) {
        setPickerOpen(false);
        return;
      }
      swapSessionExercise.mutate({ exercise_id: exercise.id });
      return;
    }
    addSessionExercise.mutate({ exercise_id: exercise.id });
  };

  const addSet = useMutation({
    mutationFn: (payload) => praxisApi.workouts.sessions.addSet(sessionId, payload),
    onSuccess: (updated, variables) => {
      updateSessionCache(updated);
      // Warmups don't trigger the rest timer — only working sets do.
      if (variables?.set_role !== 'warmup') {
        const skipRest = shouldSkipAutoRest(updated.exercises || session.exercises, currentIndex);
        if (skipRest) {
          toast('Superset: direto pro próximo exercício', { duration: 2500 });
          if (currentIndex < (updated.exercises?.length || session.exercises.length) - 1) {
            goToExercise(currentIndex + 1);
          }
        } else {
          startRest(currentExercise?.rest_seconds, currentExercise?.id);
        }
      }
      const updatedExercise = updated.exercises?.find((exercise) => exercise.id === currentExercise?.id);
      if (updatedExercise) {
        lastExerciseIdRef.current = updatedExercise.id;
        lastSetsCountRef.current = updatedExercise.sets?.length ?? 0;
        setSetForm(computeSetPrefill(updatedExercise, 'work'));
      }
      setIsFormDirty(false);
      setShowDetails(false);

      // PR detection & toast (guarded once per set id)
      const newSets = updatedExercise?.sets || [];
      const loggedSet = newSets[newSets.length - 1];
      if (
        loggedSet &&
        (loggedSet.is_pr === 1 || loggedSet.is_pr === true || (updated?.is_pr && updated?.last_logged_set_id === loggedSet.id))
      ) {
        if (!toastedPrSetIds.current.has(loggedSet.id)) {
          toastedPrSetIds.current.add(loggedSet.id);
          const description = formatPrToastDescription(loggedSet, currentExercise || updatedExercise);
          toast.success('Novo PR!', { description });
        }
      }
    },
    onError: (mutationError) => toast.error('Não deu pra registrar a série', { description: mutationError?.message || 'Confere os campos e tenta de novo.' }),
  });

  const deleteSet = useMutation({
    mutationFn: (setId) => praxisApi.workouts.sessions.deleteSet(setId),
    onSuccess: (updated) => {
      updateSessionCache(updated);
      const updatedExercise = updated.exercises?.find((exercise) => exercise.id === currentExercise?.id);
      if (updatedExercise) {
        lastExerciseIdRef.current = updatedExercise.id;
        lastSetsCountRef.current = updatedExercise.sets?.length ?? 0;
        setSetForm(computeSetPrefill(updatedExercise, 'work'));
      }
      setIsFormDirty(false);
      toast('Série removida');
    },
    onError: (mutationError) => toast.error('Não deu pra remover', { description: mutationError?.message }),
  });

  const finishSession = useMutation({
    mutationFn: () => praxisApi.workouts.sessions.finish(sessionId),
    onSuccess: (updated) => {
      localStorage.removeItem(localRestKey(sessionId));
      queryClient.setQueryData(['workouts', 'session', sessionId], updated);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('Treino concluído', { description: `${updated.workout_day_name_snapshot} · ${updated.completed_work_sets ?? totalWorkSets} séries de trabalho.` });
      onExit?.({ completed: true, session: updated });
    },
    onError: (mutationError) => toast.error('Não deu pra finalizar', { description: mutationError?.message || 'Tenta novamente.' }),
  });

  const abandonSession = useMutation({
    mutationFn: () => praxisApi.workouts.sessions.abandon(sessionId),
    onSuccess: (updated) => {
      localStorage.removeItem(localRestKey(sessionId));
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast('Treino encerrado sem concluir');
      onExit?.({ completed: false, session: updated });
    },
    onError: (mutationError) => toast.error('Não deu pra encerrar', { description: mutationError?.message }),
  });

  const handleAddSet = () => {
    if (!currentExercise || !hasPrimaryResult(setForm, currentExercise.tracking_type) || addSet.isPending) return;
    const payload = {
      session_exercise_id: currentExercise.id,
      weight_kg: toOptionalNumber(setForm.weight_kg),
      reps: toOptionalNumber(setForm.reps),
      duration_seconds: toOptionalNumber(setForm.duration_seconds),
      distance_m: toOptionalNumber(setForm.distance_m),
      set_role: setForm.set_role === 'warmup' ? 'warmup' : 'work',
    };
    if (trackingUsesBand(currentExercise.tracking_type) && setForm.band_level) {
      payload.band_level = setForm.band_level;
    }
    if (trackingUsesRir(currentExercise.tracking_type) && setForm.rir !== '') {
      payload.rir = Number(setForm.rir);
    }
    if (setForm.technical_quality) payload.technical_quality = setForm.technical_quality;
    if (setForm.note?.trim()) payload.notes = setForm.note.trim();
    addSet.mutate(payload);
  };

  const goToExercise = (nextIndex) => {
    if (!session?.exercises?.length) return;
    const safeIndex = Math.max(0, Math.min(nextIndex, session.exercises.length - 1));
    setCurrentIndex(safeIndex);
  };

  if (isLoading) {
    return (
      <div className="praxis-page max-w-xl space-y-4 pb-28">
        <div className="h-20 animate-pulse rounded-2xl bg-secondary/45" />
        <div className="h-96 animate-pulse rounded-2xl bg-secondary/35" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="praxis-page max-w-xl pb-28">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <p className="font-semibold">Não consegui abrir esse treino</p>
            <p className="mt-2 text-sm text-muted-foreground">{error?.message || 'A sessão não foi encontrada.'}</p>
            <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => onExit?.()}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status !== 'active') {
    return (
      <div className="praxis-page max-w-xl pb-28">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Check className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold">Sessão já encerrada</p>
            <p className="mt-1 text-sm text-muted-foreground">{session.workout_day_name_snapshot}</p>
            <Button type="button" className="mt-4 rounded-full" onClick={() => onExit?.()}>
              Voltar aos treinos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trackingType = currentExercise?.tracking_type || 'reps';
  const isReps = ['reps', 'weight_reps'].includes(trackingType);
  const isWeight = trackingUsesWeight(trackingType);
  const isBand = trackingUsesBand(trackingType);
  const isRir = trackingUsesRir(trackingType);
  const isDuration = ['duration', 'distance_duration'].includes(trackingType);
  const isDistance = ['distance', 'distance_duration'].includes(trackingType);
  const canAdd = hasPrimaryResult(setForm, trackingType) && !addSet.isPending;
  const loadColumnLabel = isWeight ? 'Kg' : isBand ? 'Elástico' : '—';

  const isWarmup = setForm.set_role === 'warmup';
  const purpose = currentExercise?.purpose || 'strength';
  const isSkill = purpose === 'skill';
  const purposeLabel = formatPurpose(purpose);
  const targetRirLabel = formatTargetRir(currentExercise || {});
  const currentWorkCount = workSetsOf(currentExercise).length;
  const currentWarmupCount = warmupSetsOf(currentExercise).length;
  const nextWorkNumber = currentWorkCount + 1;
  const nextWarmupNumber = currentWarmupCount + 1;
  const nextSetLabel = isWarmup ? `A${nextWarmupNumber}` : `${nextWorkNumber}`;
  const targetSets = Math.max(1, Number(currentExercise?.target_sets || 1));
  const seriesLine = isWarmup
    ? `Aquecimento ${nextSetLabel}`
    : `Série ${nextWorkNumber} de ${targetSets}`;
  const lastLoad = formatLastLoad(lastWorkSet(currentExercise?.previous_sets), trackingType);
  const moreHasValue = isWarmup
    || setForm.rir !== ''
    || Boolean(setForm.technical_quality)
    || Boolean(setForm.note);

  // Stable per-set display labels: warmups get A1/A2…, working sets keep their ordinal.
  const setLabels = new Map();
  let warmupSeen = 0;
  let workSeen = 0;
  for (const set of currentExercise?.sets || []) {
    if (isWarmupSet(set)) {
      warmupSeen += 1;
      setLabels.set(set.id, { label: `A${warmupSeen}`, warmup: true });
    } else {
      workSeen += 1;
      setLabels.set(set.id, { label: `${workSeen}`, warmup: false });
    }
  }

  return (
    <div className="praxis-page max-w-xl space-y-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="icon" className="-ml-2 rounded-full" onClick={() => onExit?.({ keepActive: true })} aria-label="Voltar aos treinos">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{session.workout_day_name_snapshot}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatSessionElapsed(elapsedSeconds)} em andamento</p>
          </div>
          <div className="w-10" aria-hidden />
        </div>
        <Progress value={sessionProgress} className="h-2 bg-primary/25" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{sessionProgress}% do planejado</span>
          <span>
            {totalWorkSets} {totalWorkSets === 1 ? 'série' : 'séries'} de trabalho
            {totalWarmupSets ? <span className="text-muted-foreground/70"> · {totalWarmupSets} aquec.</span> : null}
          </span>
        </div>
      </header>

      {restRemaining > 0 ? (
        <Card className="border-primary/35 bg-primary/10 shadow-none">
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Pause className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Descanso</p>
            </div>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-[-0.04em] sm:text-5xl">{formatClock(restRemaining)}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-xl tabular-nums" onClick={() => adjustRest(-15)}>−15s</Button>
              <Button type="button" variant="outline" className="h-11 rounded-xl tabular-nums" onClick={() => adjustRest(15)}>+15s</Button>
              <Button type="button" variant="secondary" className="h-11 rounded-xl" onClick={() => adjustRest(-restRemaining)}>Pular</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center gap-2 overflow-x-auto pb-1 praxis-hide-scrollbar praxis-scroll-x" aria-label="Exercícios da sessão">
        {session.exercises.map((exercise, index) => {
          const done = workSetsOf(exercise).length >= Number(exercise.target_sets || 1);
          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() => goToExercise(index)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                currentIndex === index
                  ? 'border-primary/50 bg-primary/12 text-foreground'
                  : 'border-border/70 bg-card/30 text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
              {exercise.superset_group ? <span className="text-[10px] font-semibold text-primary">SS</span> : null}
              {index + 1}. {exercise.exercise_name_snapshot}
            </button>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 rounded-full border-dashed px-3 text-xs"
          onClick={openAddPicker}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Exercício
        </Button>
      </div>

      {session.exercises.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/30">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Dumbbell className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold">Sessão livre iniciada</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Adiciona os exercícios que você vai executar hoje.
            </p>
            <Button type="button" className="mt-5 rounded-full" onClick={openAddPicker}>
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar primeiro exercício
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {currentExercise ? (
        <>
          <Card className="overflow-hidden border-border/80 bg-card/45 shadow-none">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                    {currentExercise.exercise_name_snapshot}
                    {currentExercise.superset_group ? (
                      <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-primary">SS</span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-base font-medium tabular-nums text-primary">{seriesLine}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs"
                  disabled={swapSessionExercise.isPending}
                  onClick={openSwapPicker}
                >
                  Trocar
                </Button>
              </div>

              {lastLoad ? (
                <p className="text-sm tabular-nums text-muted-foreground">Última: {lastLoad}</p>
              ) : null}

              <div className={cn('grid gap-3', (isWeight || (isDistance && isDuration)) && 'sm:grid-cols-2')}>
                {isReps ? (
                  <StepperInput
                    id="session-reps"
                    label="Repetições"
                    value={setForm.reps}
                    onChange={(value) => updateFormField('reps', value)}
                    step={1}
                    inputMode="numeric"
                  />
                ) : isDuration ? (
                  <StepperInput
                    id="session-duration"
                    label="Tempo (s)"
                    value={setForm.duration_seconds}
                    onChange={(value) => updateFormField('duration_seconds', value)}
                    step={5}
                    inputMode="numeric"
                    suffix="±5s"
                  />
                ) : (
                  <StepperInput
                    id="session-distance"
                    label="Distância (m)"
                    value={setForm.distance_m}
                    onChange={(value) => updateFormField('distance_m', value)}
                    step={1}
                  />
                )}

                {isWeight ? (
                  <StepperInput
                    id="session-weight"
                    label="Carga (kg)"
                    value={setForm.weight_kg}
                    onChange={(value) => updateFormField('weight_kg', value)}
                    step={2.5}
                    suffix="±2,5"
                  />
                ) : isDistance && isDuration ? (
                  <StepperInput
                    id="session-distance-b"
                    label="Distância (m)"
                    value={setForm.distance_m}
                    onChange={(value) => updateFormField('distance_m', value)}
                    step={1}
                  />
                ) : null}
              </div>

              {isBand ? (
                <BandPicker
                  value={setForm.band_level}
                  onChange={(value) => updateFormField('band_level', value)}
                />
              ) : null}

              <div className="rounded-xl border border-border/60 bg-background/25">
                <button
                  type="button"
                  onClick={() => setShowDetails((value) => !value)}
                  aria-expanded={showDetails}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    Mais
                    {moreHasValue ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Opções preenchidas" /> : null}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showDetails && 'rotate-180')} />
                </button>

                {showDetails ? (
                  <div className="space-y-4 border-t border-border/60 px-3 py-3">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Tipo da série</p>
                      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Tipo da série">
                        {[
                          { value: 'work', label: 'Trabalho' },
                          { value: 'warmup', label: 'Aquecimento' },
                        ].map((option) => {
                          const active = setForm.set_role === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => handleRoleChange(option.value)}
                              className={cn(
                                'flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
                                active
                                  ? 'border-primary/45 bg-primary/12 text-foreground'
                                  : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {option.value === 'warmup' ? <Flame className="h-3.5 w-3.5" aria-hidden /> : null}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isRir ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-muted-foreground">RIR <span className="font-normal">(opcional)</span></p>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="RIR da série">
                          {WORKOUT_RIR_OPTIONS.map((value) => {
                            const active = setForm.rir !== '' && Number(setForm.rir) === value;
                            const label = value >= WORKOUT_RIR_MAX_CHIP ? `${WORKOUT_RIR_MAX_CHIP}+` : `${value}`;
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => updateFormField('rir', setForm.rir !== '' && Number(setForm.rir) === value ? '' : String(value))}
                                className={cn(
                                  'min-h-10 min-w-10 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors',
                                  active
                                    ? 'border-primary/50 bg-primary/15 text-foreground'
                                    : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground',
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">Qualidade técnica <span className="font-normal">(opcional)</span></p>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Qualidade técnica">
                        {WORKOUT_TECHNICAL_QUALITIES.map((option) => {
                          const active = setForm.technical_quality === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => updateFormField('technical_quality', setForm.technical_quality === option.value ? '' : option.value)}
                              className={cn(
                                'min-h-10 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                active
                                  ? 'border-primary/50 bg-primary/15 text-foreground'
                                  : 'border-border/70 bg-background/40 text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="session-set-note" className="text-[11px] font-medium text-muted-foreground">Nota <span className="font-normal">(opcional)</span></label>
                      <Input
                        id="session-set-note"
                        type="text"
                        value={setForm.note}
                        onChange={(event) => updateFormField('note', event.target.value)}
                        placeholder="Nota rápida (lado, parede, dor...)"
                        maxLength={140}
                        className="h-11 text-sm"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {currentExercise.sets?.length ? (
            <Card className="overflow-hidden border-border/80 bg-card/45 shadow-none">
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 border-b border-border/60 bg-secondary/25 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="tabular-nums">#</span>
                    <span>{isDuration && !isReps ? 'Tempo' : isDistance && !isReps ? 'Dist.' : 'Reps'}</span>
                    <span>{isDuration && isDistance ? 'Dist.' : loadColumnLabel}</span>
                    <span className="sr-only">Ação</span>
                  </div>

                  <div className="divide-y divide-border/50">
                    {currentExercise.sets.map((set) => {
                      const meta = setLabels.get(set.id) || { label: `${set.set_number}`, warmup: isWarmupSet(set) };
                      const rirLabel = formatSetRir(set.rir);
                      const qualityLabel = formatTechnicalQuality(set.technical_quality);
                      const set1rm = !meta.warmup
                        ? (set.estimated_1rm || estimate1rm(set.weight_kg, set.reps))
                        : null;
                      const extras = [];
                      if (set1rm) extras.push(`1RM ~${format1rm(set1rm)}`);
                      if (rirLabel) extras.push(rirLabel);
                      if (qualityLabel) extras.push(qualityLabel);
                      return (
                        <div
                          key={set.id}
                          className={cn('px-3 py-2.5', meta.warmup && 'bg-secondary/10')}
                        >
                          <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums',
                                meta.warmup ? 'text-muted-foreground' : 'text-primary',
                              )}
                            >
                              {meta.warmup ? <Flame className="h-3 w-3" aria-hidden /> : null}
                              {meta.label}
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                              {isReps && set.reps != null
                                ? set.reps
                                : isDuration && !isReps && set.duration_seconds != null
                                  ? formatSeconds(set.duration_seconds)
                                  : isDistance && set.distance_m != null
                                    ? set.distance_m
                                    : formatSetResult(set, trackingType)}
                            </span>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {isWeight && set.weight_kg != null
                                ? `${Number(set.weight_kg).toLocaleString('pt-BR')} kg`
                                : isBand && set.band_level
                                  ? (WORKOUT_BAND_LEVELS.find((b) => b.value === set.band_level)?.label || set.band_level)
                                  : isDistance && isDuration && set.distance_m != null
                                    ? `${set.distance_m} m`
                                    : '—'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 justify-self-end rounded-full text-muted-foreground hover:text-destructive"
                              aria-label={`Remover série ${meta.label}`}
                              disabled={deleteSet.isPending}
                              onClick={() => deleteSet.mutate(set.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {(meta.warmup || extras.length || set.notes || set.is_pr) ? (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-8 text-[11px] text-muted-foreground">
                              {meta.warmup ? <span className="font-medium uppercase tracking-wide text-muted-foreground/80">Aquecimento</span> : null}
                              {!meta.warmup && (set.is_pr === 1 || set.is_pr === true) ? (
                                <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                  PR
                                </span>
                              ) : null}
                              {extras.map((chip) => <span key={chip} className="tabular-nums">{chip}</span>)}
                              {set.notes ? <span className="italic text-muted-foreground/80">“{set.notes}”</span> : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {isSkill
                ? 'Skill · tentativas de qualidade · parar por técnica'
                : `${formatWorkoutTarget(currentExercise)} · ${formatSeconds(currentExercise.rest_seconds)} de descanso`}
              {!isSkill && targetRirLabel ? <span className="text-muted-foreground/80"> · {targetRirLabel}</span> : null}
              {purposeLabel ? <span className="text-muted-foreground/80"> · {purposeLabel}</span> : null}
              {exerciseBest1rm ? <span className="tabular-nums text-muted-foreground/80"> · 1RM est. {format1rm(exerciseBest1rm)}</span> : null}
            </p>
            {currentExercise.notes ? (
              <details className="group rounded-lg bg-background/30 px-3 py-2">
                <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-muted-foreground marker:content-none">
                  <span>Nota do exercício</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
                </summary>
                <p className="pb-1 pt-1.5 text-xs leading-relaxed text-muted-foreground">{currentExercise.notes}</p>
              </details>
            ) : null}
            {restRemaining <= 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 rounded-xl border-border/80 px-4 text-xs font-medium tabular-nums transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                onClick={handleStartManualRest}
              >
                <Pause className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Descansar {formatRestDuration(exerciseRestSeconds)}
              </Button>
            ) : null}
          </div>

          <ExerciseMedia exercise={currentExercise} defaultMode="mini" />
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={currentIndex === 0} onClick={() => goToExercise(currentIndex - 1)}>
          <ChevronLeft className="mr-1.5 h-4 w-4" /> Anterior
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={currentIndex >= session.exercises.length - 1} onClick={() => goToExercise(currentIndex + 1)}>
          Próximo <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>

      <Card className="border-border/70 bg-card/30 shadow-none">
        <CardContent className="space-y-3 p-4">
          <Button
            type="button"
            variant={totalWorkSets ? 'secondary' : 'outline'}
            className="h-12 w-full rounded-xl"
            disabled={!totalWorkSets || finishSession.isPending}
            onClick={() => {
              const remaining = session.exercises.reduce(
                (sum, exercise) => sum + Math.max(0, Number(exercise.target_sets || 1) - workSetsOf(exercise).length),
                0,
              );
              const ok = remaining > 0
                ? window.confirm(`Ainda faltam ${remaining} série(s) do planejado. Finalizar mesmo assim?`)
                : true;
              if (ok) finishSession.mutate();
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            {finishSession.isPending ? 'Finalizando...' : 'Finalizar treino'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl text-muted-foreground hover:text-destructive"
            disabled={abandonSession.isPending}
            onClick={() => {
              const ok = window.confirm('Encerrar este treino sem concluir? As séries já registradas ficam no histórico como sessão abandonada.');
              if (ok) abandonSession.mutate();
            }}
          >
            {abandonSession.isPending ? 'Encerrando...' : 'Abandonar sessão'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        <span>O treino continua salvo mesmo se você fechar a Praxis.</span>
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={pickerMode === 'swap' ? 'Trocar exercício' : 'Adicionar exercício'}
        onSelect={handlePickerSelect}
      />

      {currentExercise ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-3 pt-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-xl">
            <Button
              type="button"
              className="h-14 w-full rounded-xl text-lg"
              disabled={!canAdd}
              onClick={handleAddSet}
            >
              {addSet.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
