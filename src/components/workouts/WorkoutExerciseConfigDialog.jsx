import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TRACKING_LABELS, WORKOUT_CATEGORY_LABELS, WORKOUT_PURPOSES } from '@/lib/workouts';

/** Objetivos em que o critério é técnico, não carga — RIR fica de-enfatizado. */
const RIR_SOFT_PURPOSES = ['skill', 'preparation'];

function defaultsFor(exercise, initial) {
  const trackingType = exercise?.tracking_type || initial?.tracking_type || 'reps';
  return {
    target_sets: initial?.target_sets ?? 3,
    rep_min: initial?.rep_min ?? (['reps', 'weight_reps'].includes(trackingType) ? 8 : ''),
    rep_max: initial?.rep_max ?? (['reps', 'weight_reps'].includes(trackingType) ? 12 : ''),
    target_duration_seconds: initial?.target_duration_seconds ?? (trackingType === 'duration' ? 10 : ''),
    rest_seconds: initial?.rest_seconds ?? 90,
    purpose: initial?.purpose ?? 'strength',
    target_rir_min: initial?.target_rir_min ?? '',
    target_rir_max: initial?.target_rir_max ?? '',
    notes: initial?.notes || '',
    superset_group: initial?.superset_group ?? '',
  };
}

export default function WorkoutExerciseConfigDialog({
  open,
  onOpenChange,
  exercise,
  initial = null,
  onSubmit,
  busy = false,
}) {
  const [form, setForm] = useState(() => defaultsFor(exercise, initial));
  const trackingType = exercise?.tracking_type || initial?.tracking_type || 'reps';
  const isRepBased = ['reps', 'weight_reps'].includes(trackingType);
  const rirSoft = RIR_SOFT_PURPOSES.includes(form.purpose);

  useEffect(() => {
    if (open) setForm(defaultsFor(exercise, initial));
  }, [open, exercise, initial]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    onSubmit?.({
      target_sets: Number(form.target_sets) || 1,
      rep_min: isRepBased && form.rep_min !== '' ? Number(form.rep_min) : null,
      rep_max: isRepBased && form.rep_max !== '' ? Number(form.rep_max) : null,
      target_duration_seconds:
        trackingType === 'duration' && form.target_duration_seconds !== ''
          ? Number(form.target_duration_seconds)
          : null,
      rest_seconds: form.rest_seconds !== '' ? Number(form.rest_seconds) : 0,
      purpose: form.purpose || 'strength',
      target_rir_min: form.target_rir_min !== '' ? Number(form.target_rir_min) : null,
      target_rir_max: form.target_rir_max !== '' ? Number(form.target_rir_max) : null,
      notes: form.notes.trim(),
      superset_group: form.superset_group ? form.superset_group.trim() : (initial?.superset_group ?? null),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Configurar exercício' : 'Adicionar ao treino'}</DialogTitle>
          <DialogDescription>
            {exercise?.name || initial?.exercise_name || 'Exercício'} · {WORKOUT_CATEGORY_LABELS[exercise?.category || initial?.exercise_category] || 'Exercício'} · {TRACKING_LABELS[trackingType] || 'Repetições'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Objetivo do exercício">
              {WORKOUT_PURPOSES.map((option) => {
                const active = form.purpose === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setForm((current) => ({ ...current, purpose: option.value }))}
                    className={cn(
                      'min-h-10 rounded-lg border px-1 py-2 text-xs font-medium transition-colors',
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exercise-target-sets">Séries</Label>
              <Input
                id="exercise-target-sets"
                type="number"
                inputMode="numeric"
                min="1"
                max="20"
                value={form.target_sets}
                onChange={(event) => setForm((current) => ({ ...current, target_sets: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exercise-rest-seconds">Descanso <span className="text-muted-foreground">(s)</span></Label>
              <Input
                id="exercise-rest-seconds"
                type="number"
                inputMode="numeric"
                min="0"
                max="3600"
                step="15"
                value={form.rest_seconds}
                onChange={(event) => setForm((current) => ({ ...current, rest_seconds: event.target.value }))}
              />
            </div>
          </div>

          {isRepBased ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exercise-rep-min">Reps mín.</Label>
                <Input
                  id="exercise-rep-min"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.rep_min}
                  onChange={(event) => setForm((current) => ({ ...current, rep_min: event.target.value }))}
                  placeholder="8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise-rep-max">Reps máx.</Label>
                <Input
                  id="exercise-rep-max"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={form.rep_max}
                  onChange={(event) => setForm((current) => ({ ...current, rep_max: event.target.value }))}
                  placeholder="12"
                />
              </div>
            </div>
          ) : null}

          <div className={cn('space-y-2', rirSoft && 'opacity-70')}>
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="exercise-rir-min">RIR alvo <span className="text-muted-foreground">(opcional)</span></Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="exercise-rir-min" className="text-xs text-muted-foreground">de</Label>
                <Input
                  id="exercise-rir-min"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10"
                  value={form.target_rir_min}
                  onChange={(event) => setForm((current) => ({ ...current, target_rir_min: event.target.value }))}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="exercise-rir-max" className="text-xs text-muted-foreground">até</Label>
                <Input
                  id="exercise-rir-max"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10"
                  value={form.target_rir_max}
                  onChange={(event) => setForm((current) => ({ ...current, target_rir_max: event.target.value }))}
                  placeholder="—"
                />
              </div>
            </div>
            {rirSoft ? (
              <p className="text-xs text-muted-foreground">Use notas para o critério técnico; RIR é opcional.</p>
            ) : null}
          </div>

          {trackingType === 'duration' ? (
            <div className="space-y-2">
              <Label htmlFor="exercise-duration-target">Meta por série <span className="text-muted-foreground">(segundos)</span></Label>
              <Input
                id="exercise-duration-target"
                type="number"
                inputMode="numeric"
                min="1"
                max="86400"
                value={form.target_duration_seconds}
                onChange={(event) => setForm((current) => ({ ...current, target_duration_seconds: event.target.value }))}
                placeholder="10"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="exercise-workout-notes">Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="exercise-workout-notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              placeholder="Ex.: Straddle, foco em amplitude"
              maxLength={500}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || !Number(form.target_sets)}>
              {busy ? 'Salvando...' : initial ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
