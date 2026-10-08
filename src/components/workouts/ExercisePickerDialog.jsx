import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Sparkles } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { WORKOUT_CATEGORIES, WORKOUT_TRACKING_TYPES, TRACKING_LABELS, WORKOUT_CATEGORY_LABELS } from '@/lib/workouts';
import { thumbUrl, displayExerciseName } from '@/lib/workoutV4';

const EMPTY_CUSTOM = {
  name: '',
  category: 'strength',
  tracking_type: 'reps',
  muscle_group: '',
  equipment: '',
  instructions: '',
};

export default function ExercisePickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Adicionar exercício',
}) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const deferredQuery = useDeferredValue(query.trim());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCreating(false);
    setCustom(EMPTY_CUSTOM);
  }, [open]);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['workouts', 'exercise-library', deferredQuery],
    queryFn: () => praxisApi.workouts.exercises.list({ q: deferredQuery || undefined, limit: 80 }),
    enabled: open && !creating,
    staleTime: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => praxisApi.workouts.exercises.create(payload),
    onSuccess: (exercise) => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'exercise-library'] });
      toast.success('Exercício criado', { description: `${exercise.name} já entrou na tua biblioteca.` });
      onSelect?.(exercise);
      onOpenChange(false);
    },
    onError: (error) => {
      const duplicate = error?.body?.exercise;
      if (error?.status === 409 && duplicate) {
        onSelect?.(duplicate);
        onOpenChange(false);
        return;
      }
      toast.error('Não deu pra criar', { description: error?.message || 'Tenta novamente.' });
    },
  });

  const visibleExercises = useMemo(() => {
    const list = Array.isArray(exercises) ? exercises : (exercises?.items || []);
    return list.filter((exercise) => exercise?.status !== 'archived');
  }, [exercises]);

  const handleCreate = (event) => {
    event.preventDefault();
    if (!custom.name.trim() || createMutation.isPending) return;
    createMutation.mutate({ ...custom, name: custom.name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl p-0 gap-0">
        <div className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-5 pb-4 pt-5 backdrop-blur">
          <DialogHeader className="pr-8">
            <DialogTitle>{creating ? 'Criar exercício' : title}</DialogTitle>
            <DialogDescription>
              {creating ? 'Define como esse movimento será acompanhado nos teus treinos.' : 'Escolhe um existente ou cria um exercício teu.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {creating ? (
          <form onSubmit={handleCreate} className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="custom-exercise-name">Nome</Label>
              <Input
                id="custom-exercise-name"
                value={custom.name}
                onChange={(event) => setCustom((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Front Lever Pull-Up"
                autoFocus
                maxLength={100}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-exercise-category">Categoria</Label>
                <select
                  id="custom-exercise-category"
                  value={custom.category}
                  onChange={(event) => setCustom((current) => ({ ...current, category: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {WORKOUT_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-exercise-tracking">Como medir</Label>
                <select
                  id="custom-exercise-tracking"
                  value={custom.tracking_type}
                  onChange={(event) => setCustom((current) => ({ ...current, tracking_type: event.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {WORKOUT_TRACKING_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-exercise-muscle">Grupo muscular <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="custom-exercise-muscle"
                  value={custom.muscle_group}
                  onChange={(event) => setCustom((current) => ({ ...current, muscle_group: event.target.value }))}
                  placeholder="Ex.: Costas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-exercise-equipment">Equipamento <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="custom-exercise-equipment"
                  value={custom.equipment}
                  onChange={(event) => setCustom((current) => ({ ...current, equipment: event.target.value }))}
                  placeholder="Ex.: Barra fixa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-exercise-instructions">Observações <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea
                id="custom-exercise-instructions"
                value={custom.instructions}
                onChange={(event) => setCustom((current) => ({ ...current, instructions: event.target.value }))}
                rows={3}
                placeholder="Técnica, pegada, progressão..."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={createMutation.isPending}>
                Voltar à biblioteca
              </Button>
              <Button type="submit" disabled={!custom.name.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar e adicionar'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar exercício..."
                className="pl-9"
                autoFocus
              />
            </div>

            <Button type="button" variant="outline" className="w-full justify-start rounded-xl border-dashed" onClick={() => {
              setCustom((current) => ({ ...current, name: query.trim() || '' }));
              setCreating(true);
            }}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Criar exercício personalizado
            </Button>

            <div className="space-y-2">
              {isLoading ? (
                <div className="space-y-2" aria-label="Carregando exercícios">
                  {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-secondary/50" />)}
                </div>
              ) : visibleExercises.length ? (
                visibleExercises.map((exercise) => {
                  const img = thumbUrl(exercise);
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => {
                        onSelect?.(exercise);
                        onOpenChange(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/35 px-4 py-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary overflow-hidden border border-border/50">
                        {img ? (
                          <img src={img} alt={displayExerciseName(exercise)} loading="lazy" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <Sparkles className="h-4 w-4" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{displayExerciseName(exercise)}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {WORKOUT_CATEGORY_LABELS[exercise.category] || 'Exercício'} · {TRACKING_LABELS[exercise.tracking_type] || 'Repetições'}
                        </p>
                      </div>
                      {Number(exercise.usage_count) > 0 ? (
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{exercise.usage_count}× usado</span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center">
                  <p className="text-sm font-semibold">Nada encontrado</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Cria “{query || 'teu exercício'}” e já adiciona ao treino.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
