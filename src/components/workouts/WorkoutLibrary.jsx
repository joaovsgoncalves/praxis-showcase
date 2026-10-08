import React, { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Dumbbell,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PraxisEmptyState } from '@/components/layout/PraxisPage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { thumbUrl, displayExerciseName } from '@/lib/workoutV4';
import ExerciseDetailSheet, {
  formatEquipment,
  formatMuscleName,
} from './ExerciseDetailSheet';
import WorkoutExerciseConfigDialog from './WorkoutExerciseConfigDialog';
import ExercisePickerDialog from './ExercisePickerDialog';

const BODY_PART_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'chest', label: 'Peitoral' },
  { id: 'back', label: 'Costas' },
  { id: 'upper arms', label: 'Braços' },
  { id: 'shoulders', label: 'Ombros' },
  { id: 'upper legs', label: 'Pernas' },
  { id: 'waist', label: 'Abdômen' },
  { id: 'lower legs', label: 'Panturrilhas' },
  { id: 'lower arms', label: 'Antebraço' },
  { id: 'cardio', label: 'Cardio' },
];

const SOURCE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'custom', label: 'Meus' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'all', label: 'Todos os equipamentos' },
  { value: 'body weight', label: 'Peso corporal' },
  { value: 'dumbbell', label: 'Halteres' },
  { value: 'barbell', label: 'Barra' },
  { value: 'cable', label: 'Polia / Cabo' },
  { value: 'leverage machine', label: 'Máquina' },
  { value: 'band', label: 'Elástico' },
  { value: 'smith machine', label: 'Smith' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'weighted', label: 'Com carga' },
];

function ExerciseRowItem({ exercise, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false);
  const img = !imgFailed ? thumbUrl(exercise) : null;
  const isCatalog = exercise.source === 'catalog' || (!exercise.is_custom && exercise.catalog_external_id);

  const targetMuscle =
    formatMuscleName(exercise.target_muscle) ||
    formatMuscleName(exercise.muscle_group) ||
    exercise.target_muscle ||
    exercise.muscle_group ||
    'Geral';
  const equipment = formatEquipment(exercise.equipment || exercise.equipment_key) || exercise.equipment || 'Livre';

  return (
    <button
      type="button"
      onClick={() => onSelect(exercise)}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-2xl border border-border/70 bg-card/35 p-3 text-left transition-all',
        'hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-secondary/30">
        {img ? (
          <img
            src={img}
            alt={displayExerciseName(exercise)}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain p-1 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <Dumbbell className="h-7 w-7 text-muted-foreground/60 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" aria-hidden />
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
            {displayExerciseName(exercise)}
          </p>
          {!isCatalog ? (
            <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
              Meu
            </span>
          ) : null}
        </div>

        <p className="mt-1 truncate text-sm text-muted-foreground">
          <span className="font-medium text-foreground/85">{targetMuscle}</span>
          {equipment ? (
            <>
              <span className="text-muted-foreground/40" aria-hidden> · </span>
              <span>{equipment}</span>
            </>
          ) : null}
        </p>
      </div>

      {/* Action indicator */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </div>
    </button>
  );
}

export default function WorkoutLibrary({
  summary = null,
  onOpenProgram = null,
}) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [source, setSource] = useState('all');
  const [bodyPart, setBodyPart] = useState('all');
  const [equipment, setEquipment] = useState('all');

  // Dialogs state
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configuringExercise, setConfiguringExercise] = useState(null);

  // Debounce search input ~250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['workouts', 'exercise-library', debouncedQuery, source, bodyPart, equipment],
    queryFn: ({ pageParam = 0 }) =>
      praxisApi.workouts.exercises.list({
        q: debouncedQuery || undefined,
        source: source !== 'all' ? source : undefined,
        body_part: bodyPart !== 'all' ? bodyPart : undefined,
        equipment: equipment !== 'all' ? equipment : undefined,
        limit: 40,
        offset: pageParam,
        meta: 1,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || typeof lastPage.total !== 'number') return undefined;
      const nextOffset = (lastPage.offset || 0) + (lastPage.items?.length || 0);
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    staleTime: 30_000,
  });

  const allExercises = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => (Array.isArray(page) ? page : page?.items || []));
  }, [data]);

  const totalCount = data?.pages?.[0]?.total ?? allExercises.length;
  const currentDay = summary?.current_day || null;
  const canAddToDay = Boolean(currentDay && currentDay.day_type === 'training');

  const addExerciseMutation = useMutation({
    mutationFn: ({ dayId, exerciseId, config }) =>
      praxisApi.workouts.days.addExercise(dayId, {
        exercise_id: exerciseId,
        ...config,
      }),
    onSuccess: () => {
      setConfigDialogOpen(false);
      setDetailOpen(false);
      setConfiguringExercise(null);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('Exercício adicionado ao treino', {
        description: currentDay ? `${configuringExercise?.name || 'Exercício'} entrou em ${currentDay.name}.` : undefined,
      });
    },
    onError: (err) => {
      toast.error('Não deu pra adicionar o exercício', {
        description: err?.message || 'Tenta novamente.',
      });
    },
  });

  const handleOpenDetail = (exercise) => {
    setSelectedExercise(exercise);
    setDetailOpen(true);
  };

  const handleAddToDay = (exercise) => {
    if (!canAddToDay || !currentDay) {
      if (currentDay?.day_type === 'rest') {
        toast.error('Hoje é dia de descanso', {
          description: 'Abre a aba Programa se quiser adicionar exercícios a outro dia do ciclo.',
        });
      } else {
        toast.error('Nenhum treino ativo hoje', {
          description: 'Abre a aba Programa para montar teu ciclo de treino primeiro.',
        });
      }
      return;
    }

    setConfiguringExercise(exercise);
    setConfigDialogOpen(true);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setSource('all');
    setBodyPart('all');
    setEquipment('all');
  };

  const hasActiveFilters = Boolean(searchInput || source !== 'all' || bodyPart !== 'all' || equipment !== 'all');

  return (
    <div className="space-y-4">
      {/* Search Bar & Create Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, músculo, equipamento..."
            className="pl-9 pr-9 h-11 rounded-xl bg-card/40 border-border/70 text-sm"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl shrink-0 px-3 text-xs sm:text-sm font-medium border-border/70 hover:border-primary/40 hover:bg-primary/10"
          onClick={() => setCreateCustomOpen(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Criar</span>
          <span className="sm:hidden">+</span>
        </Button>
      </div>

      {/* Source Segmented Chips */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/30 p-1 w-full sm:w-auto text-xs"
          role="group"
          aria-label="Filtrar por origem"
        >
          {SOURCE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSource(item.id)}
              className={cn(
                'min-h-8 rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                source === item.id
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Equipment Selector */}
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          aria-label="Filtrar por equipamento"
          className="hidden sm:block h-9 rounded-xl border border-border/70 bg-card/40 px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {EQUIPMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Body Part Horizontal Scroll Chips */}
      <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {BODY_PART_FILTERS.map((part) => {
            const active = bodyPart === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => setBodyPart(part.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/15 text-primary font-semibold'
                    : 'border-border/60 bg-card/25 text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {part.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Summary Header */}
      {!isLoading && !isError ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>
            {totalCount > 0 ? (
              <>
                <span className="tabular-nums font-semibold text-foreground">{totalCount}</span>{' '}
                {totalCount === 1 ? 'exercício encontrado' : 'exercícios encontrados'}
              </>
            ) : (
              'Nenhum exercício encontrado'
            )}
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar filtros
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-2.5" aria-label="Carregando exercícios">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/20 p-3"
            >
              <div className="h-[72px] w-[72px] animate-pulse rounded-xl bg-secondary/40 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-secondary/50" />
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-secondary/30" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Error State */}
      {isError ? (
        <PraxisEmptyState
          icon={Dumbbell}
          title="Erro ao carregar biblioteca"
          description={error?.message || 'A API de treinos não respondeu. Tenta novamente.'}
          action={
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => refetch()}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : null}

      {/* Exercise List */}
      {!isLoading && !isError && allExercises.length > 0 ? (
        <div className="space-y-2.5">
          {allExercises.map((exercise) => (
            <ExerciseRowItem
              key={exercise.id || exercise.catalog_external_id}
              exercise={exercise}
              onSelect={handleOpenDetail}
            />
          ))}

          {/* Load More Button */}
          {hasNextPage ? (
            <div className="pt-2 pb-4 text-center">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-border/70 text-sm font-medium hover:border-primary/40"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                    Carregando mais...
                  </>
                ) : (
                  <>
                    Carregar mais exercícios
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({allExercises.length} de {totalCount})
                    </span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="pt-2 pb-4 text-center text-xs text-muted-foreground/60">
              Você chegou ao fim dos resultados.
            </p>
          )}
        </div>
      ) : null}

      {/* Empty State */}
      {!isLoading && !isError && allExercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center bg-card/20 space-y-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl border border-border/70 bg-card/40 text-muted-foreground">
            <Dumbbell className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Nenhum exercício encontrado</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              {searchInput
                ? `Não achamos nada para "${searchInput}". Tenta outra busca ou cria um personalizado.`
                : 'Nenhum exercício corresponde aos filtros selecionados.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={handleResetFilters}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setCreateCustomOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Criar exercício personalizado
            </Button>
          </div>
        </div>
      ) : null}

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        exercise={selectedExercise}
        onAddToDay={handleAddToDay}
        canAddToDay={canAddToDay}
        currentDayName={currentDay?.name}
      />

      {/* Config Dialog for adding exercise to current day */}
      <WorkoutExerciseConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        exercise={configuringExercise}
        onSubmit={(config) => {
          if (!currentDay || !configuringExercise) return;
          addExerciseMutation.mutate({
            dayId: currentDay.id,
            exerciseId: configuringExercise.id,
            config,
          });
        }}
        busy={addExerciseMutation.isPending}
      />

      {/* Create Custom Exercise Dialog */}
      <ExercisePickerDialog
        open={createCustomOpen}
        onOpenChange={setCreateCustomOpen}
        onSelect={(createdExercise) => {
          queryClient.invalidateQueries({ queryKey: ['workouts', 'exercise-library'] });
          handleOpenDetail(createdExercise);
        }}
      />
    </div>
  );
}
