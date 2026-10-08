import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import {
  Dumbbell,
  Flame,
  Layers,
  ListOrdered,
  Plus,
  Target,
  Wrench,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  aliasMuscle,
  gifUrl,
  MUSCLE_LABEL_PT,
  thumbUrl,
  format1rm,
  preferSteps,
  displayExerciseName,
} from '@/lib/workoutV4';
import {
  TRACKING_LABELS,
  WORKOUT_CATEGORY_LABELS,
} from '@/lib/workouts';
import ExerciseMedia from './ExerciseMedia';

export const BODY_PART_LABEL_PT = {
  chest: 'Peitoral',
  back: 'Costas',
  'upper arms': 'Braços',
  shoulders: 'Ombros',
  'upper legs': 'Pernas',
  waist: 'Abdômen',
  'lower legs': 'Panturrilhas',
  'lower arms': 'Antebraço',
  cardio: 'Cardio',
  neck: 'Pescoço',
};

export const EQUIPMENT_LABEL_PT = {
  'body weight': 'Peso corporal',
  dumbbell: 'Halteres',
  barbell: 'Barra',
  cable: 'Polia / Cabo',
  'leverage machine': 'Máquina',
  band: 'Elástico',
  'smith machine': 'Smith',
  kettlebell: 'Kettlebell',
  weighted: 'Com carga',
  'stability ball': 'Bola suíça',
  'medicine ball': 'Medicine ball',
  'ez barbell': 'Barra W / EZ',
  roller: 'Rolo de liberação',
  'wheel roller': 'Roda abdominal',
  assisted: 'Assistido',
  'trap bar': 'Barra hexagonal',
  rope: 'Corda',
  'bosu ball': 'Bosu',
};

export function formatBodyPart(bodyPart) {
  if (!bodyPart || typeof bodyPart !== 'string') return null;
  const key = bodyPart.trim().toLowerCase();
  return BODY_PART_LABEL_PT[key] || bodyPart;
}

export function formatEquipment(equipment) {
  if (!equipment || typeof equipment !== 'string') return null;
  const key = equipment.trim().toLowerCase();
  return EQUIPMENT_LABEL_PT[key] || equipment;
}

export function formatMuscleName(muscle) {
  if (!muscle || typeof muscle !== 'string') return null;
  const canonical = aliasMuscle(muscle);
  if (canonical && MUSCLE_LABEL_PT[canonical]) {
    return MUSCLE_LABEL_PT[canonical];
  }
  return muscle;
}

export { preferSteps };

export function extractInstructionSteps(exercise) {
  return preferSteps(exercise, 'pt');
}

export function extractSecondaryMuscles(exercise) {
  if (!exercise) return [];
  const raw = exercise.secondary_muscles_json || exercise.secondary_muscles;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export default function ExerciseDetailSheet({
  open,
  onOpenChange,
  exercise,
  onAddToDay,
  canAddToDay = false,
  currentDayName = null,
}) {
  const { data: stats } = useQuery({
    queryKey: ['workouts', 'exercises', exercise?.id, 'stats'],
    queryFn: () => praxisApi.workouts.exercises.stats(exercise.id),
    enabled: Boolean(open && exercise?.id),
    staleTime: 30_000,
  });

  if (!exercise) return null;

  const hasMedia = Boolean(gifUrl(exercise) || thumbUrl(exercise));
  const isCatalog = exercise.source === 'catalog' || (!exercise.is_custom && exercise.catalog_external_id);
  const targetMuscleDisplay =
    formatMuscleName(exercise.target_muscle) ||
    formatMuscleName(exercise.muscle_group) ||
    exercise.target_muscle ||
    exercise.muscle_group ||
    'Geral';
  const bodyPartDisplay = formatBodyPart(exercise.body_part);
  const equipmentDisplay = formatEquipment(exercise.equipment || exercise.equipment_key) || exercise.equipment || 'Livre';
  const secondaryMuscles = extractSecondaryMuscles(exercise);
  const steps = preferSteps(exercise, 'pt');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border border-border/80 bg-background/98 shadow-2xl [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-background/85 [&>button]:p-1.5">
        {hasMedia ? (
          <ExerciseMedia
            exercise={exercise}
            variant="encyclopedia"
            className="border-b border-border/70"
          />
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2.5 border-b border-border/70 bg-secondary/20 p-8 text-center text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card/40 text-primary/80">
              <Dumbbell className="h-7 w-7" aria-hidden />
            </div>
            <span className="text-xs font-medium">Exercício sem prévia de mídia</span>
          </div>
        )}

        <div className="border-b border-border/70 px-5 pb-3.5 pt-4">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {displayExerciseName(exercise)}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground/90">{targetMuscleDisplay}</span>
              {' · '}
              {equipmentDisplay}
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {!isCatalog ? (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wider font-semibold border-primary/40 bg-primary/10 text-primary"
                >
                  Personalizado
                </Badge>
              ) : null}
              {exercise.category ? (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {WORKOUT_CATEGORY_LABELS[exercise.category] || exercise.category}
                </Badge>
              ) : null}
              {exercise.tracking_type ? (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {TRACKING_LABELS[exercise.tracking_type] || exercise.tracking_type}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-5 p-5">
          {/* Anatomy & Target Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card/30 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Target className="h-3.5 w-3.5" aria-hidden />
                <span>Alvo principal</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {targetMuscleDisplay}
              </p>
            </div>

            {bodyPartDisplay ? (
              <div className="rounded-xl border border-border/70 bg-card/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Flame className="h-3.5 w-3.5" aria-hidden />
                  <span>Região</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-foreground">
                  {bodyPartDisplay}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-border/70 bg-card/30 p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
                <span>Equipamento</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {equipmentDisplay}
              </p>
            </div>
          </div>

          {/* Personal Bests / 1RM Stats */}
          {stats && (stats.best_1rm || stats.best_weight) ? (
            <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/10 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" aria-hidden />
                  <span>Melhores marcas registradas</span>
                </span>
                {stats.last_performed_at ? (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Último: {new Date(stats.last_performed_at).toLocaleDateString('pt-BR')}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {stats.best_1rm ? (
                  <div className="rounded-lg border border-primary/20 bg-background/60 p-2.5 text-center">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      1RM Estimado
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {format1rm(stats.best_1rm)}
                    </span>
                  </div>
                ) : null}
                {stats.best_weight ? (
                  <div className="rounded-lg border border-primary/20 bg-background/60 p-2.5 text-center">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Carga Máxima
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {stats.best_weight.toLocaleString('pt-BR')} kg
                      {stats.best_reps ? <span className="text-xs font-normal text-muted-foreground ml-1">({stats.best_reps} reps)</span> : null}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Secondary Muscles */}
          {secondaryMuscles.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border/60 bg-card/20 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
                <span>Músculos secundários / sinergistas</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {secondaryMuscles.map((muscleItem, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="border-border/80 bg-background/50 text-xs font-normal"
                  >
                    {formatMuscleName(muscleItem) || muscleItem}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Execution Steps */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <ListOrdered className="h-4 w-4 text-primary" aria-hidden />
                <span>Instruções de execução</span>
              </h3>
              {steps.length > 0 ? (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {steps.length} {steps.length === 1 ? 'passo' : 'passos'}
                </span>
              ) : null}
            </div>

            {steps.length > 0 ? (
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/25 overflow-hidden">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 text-xs sm:text-sm leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold tabular-nums text-primary">
                      {idx + 1}
                    </span>
                    <p className="text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Instruções detalhadas não cadastradas para este exercício.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-10 border-t border-border/70 bg-background/95 p-4 backdrop-blur">
          <Button
            type="button"
            className="h-12 w-full rounded-xl text-sm font-semibold shadow-md"
            onClick={() => onAddToDay?.(exercise)}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {canAddToDay && currentDayName
              ? `Adicionar a ${currentDayName}`
              : 'Adicionar ao dia'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
