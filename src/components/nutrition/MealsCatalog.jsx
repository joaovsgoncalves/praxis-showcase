import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Star, Search } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PraxisEmptyState, PraxisListSkeleton } from '@/components/layout/PraxisPage';
import NutritionConfirmDialog from '@/components/nutrition/NutritionConfirmDialog';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function MealForm({ initial, foods, foodsLoading, foodsError, onRetryFoods, onSubmit, onCancel, submitting }) {
  const [name, setName] = useState(initial?.name || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [isFavorite, setIsFavorite] = useState(!!(initial?.is_favorite === 1 || initial?.is_favorite));
  const [q, setQ] = useState('');
  const [items, setItems] = useState(() =>
    (initial?.items || []).map((it) => ({
      food_item_id: it.food_item_id,
      name: it.food_name || it.name,
      servings: String(it.servings ?? 1),
      kcal: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
    })),
  );

  const filteredFoods = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return (foods || []).slice(0, 20);
    return (foods || [])
      .filter((f) => f.name?.toLowerCase().includes(qq) || f.brand?.toLowerCase().includes(qq))
      .slice(0, 20);
  }, [foods, q]);

  const totals = useMemo(() => {
    let kcal = 0;
    let protein_g = 0;
    let carbs_g = 0;
    let fat_g = 0;
    for (const it of items) {
      const s = Number(String(it.servings).replace(',', '.')) || 1;
      kcal += (Number(it.kcal) || 0) * s;
      protein_g += (Number(it.protein_g) || 0) * s;
      carbs_g += (Number(it.carbs_g) || 0) * s;
      fat_g += (Number(it.fat_g) || 0) * s;
    }
    return {
      kcal: Math.round(kcal),
      protein_g: Math.round(protein_g * 10) / 10,
      carbs_g: Math.round(carbs_g * 10) / 10,
      fat_g: Math.round(fat_g * 10) / 10,
    };
  }, [items]);

  const addFood = (food) => {
    if (items.some((i) => i.food_item_id === food.id)) {
      toast.message('Já está na refeição');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        food_item_id: food.id,
        name: food.name,
        servings: '1',
        kcal: food.kcal,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
      },
    ]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (items.length === 0) {
      toast.error('Adicione pelo menos 1 alimento');
      return;
    }
    onSubmit?.({
      name: n,
      notes: notes.trim(),
      is_favorite: isFavorite ? 1 : 0,
      items: items.map((it) => ({
        food_item_id: it.food_item_id,
        servings: Number(String(it.servings).replace(',', '.')) || 1,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="meal-name">Nome da refeição</Label>
        <Input
          id="meal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Almoço de sempre"
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meal-notes">Notas (opcional)</Label>
        <Input
          id="meal-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: Pós-treino"
        />
      </div>

      <div className="space-y-2">
        <Label>Itens</Label>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum alimento ainda.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.food_item_id}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatKcal((Number(it.kcal) || 0) * (Number(String(it.servings).replace(',', '.')) || 1))}
                  </p>
                </div>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="w-16 h-9 tabular-nums bg-secondary/40"
                  value={it.servings}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((x) =>
                        x.food_item_id === it.food_item_id
                          ? { ...x, servings: e.target.value }
                          : x,
                      ),
                    )
                  }
                  aria-label={`Porções de ${it.name}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  onClick={() =>
                    setItems((prev) => prev.filter((x) => x.food_item_id !== it.food_item_id))
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground tabular-nums">
          Total ≈ {formatKcal(totals.kcal)} · P {formatGrams(totals.protein_g)} · C{' '}
          {formatGrams(totals.carbs_g)} · G {formatGrams(totals.fat_g)}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Adicionar do catálogo</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar alimento…"
            className="pl-9 bg-secondary/40"
          />
        </div>
        <ul className="max-h-36 overflow-y-auto space-y-1 border border-border/60 rounded-lg p-1">
          {foodsLoading ? (
            <li className="p-2 text-xs text-muted-foreground" role="status">Carregando alimentos…</li>
          ) : foodsError ? (
            <li className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
              <span>Não foi possível carregar os alimentos.</span>
              <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-full" onClick={onRetryFoods}>
                Tentar novamente
              </Button>
            </li>
          ) : filteredFoods.length === 0 ? (
            <li className="p-2 text-xs text-muted-foreground">
              {q.trim() ? 'Nenhum alimento encontrado.' : 'Cadastre um alimento antes de montar a refeição.'}
            </li>
          ) : (
            filteredFoods.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => addFood(f)}
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {f.serving_label} · {formatKcal(f.kcal)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={isFavorite}
          onChange={(e) => setIsFavorite(e.target.checked)}
        />
        Favorita
      </label>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? 'Salvando…' : 'Salvar refeição'}
        </Button>
      </div>
    </form>
  );
}

export default function MealsCatalog() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const { data: meals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['nutrition', 'meals'],
    queryFn: () => praxisApi.nutrition.meals.list({ limit: 50 }),
    retry: 1,
  });

  const { data: foods = [], isLoading: foodsLoading, isError: foodsError, refetch: refetchFoods } = useQuery({
    queryKey: ['nutrition', 'foods', { forMeals: true }],
    queryFn: () => praxisApi.nutrition.foods.list({ limit: 100 }),
    retry: 1,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['nutrition', 'meals'] });
  };

  const createMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.meals.create(data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      toast.success('Refeição salva');
    },
    onError: () => toast.error('Não deu pra criar a refeição'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => praxisApi.nutrition.meals.update(id, data),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Refeição atualizada');
    },
    onError: () => toast.error('Não deu pra atualizar'),
  });

  const toggleFav = useMutation({
    mutationFn: (meal) =>
      praxisApi.nutrition.meals.update(meal.id, {
        is_favorite: meal.is_favorite ? 0 : 1,
      }),
    onSuccess: invalidate,
  });

  const archiveMut = useMutation({
    mutationFn: (id) => praxisApi.nutrition.meals.delete(id),
    onSuccess: () => {
      invalidate();
      setArchiveTarget(null);
      toast.success('Refeição arquivada');
    },
    onError: () => toast.error('Não deu pra arquivar'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova refeição
        </Button>
      </div>

      {isLoading ? (
        <PraxisListSkeleton rows={3} />
      ) : isError ? (
        <PraxisEmptyState
          title="Não foi possível carregar as refeições"
          description="Verifique a conexão e tente novamente."
          compact
          action={<Button className="min-h-11 rounded-full" onClick={() => refetch()}>Tentar novamente</Button>}
        />
      ) : meals.length === 0 ? (
        <PraxisEmptyState
          title="Nenhuma refeição salva"
          description="Monte uma refeição que você repete e adicione tudo ao diário de uma vez."
          compact
          action={
            <Button className="rounded-full" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Criar refeição
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {meals.map((meal) => (
            <li key={meal.id}>
              <Card className="border-border/80 bg-card/40 shadow-none">
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => toggleFav.mutate(meal)}
                    aria-label={meal.is_favorite ? 'Tirar dos favoritos' : 'Favoritar'}
                  >
                    <Star
                      className={cn(
                        'w-4 h-4',
                        meal.is_favorite && 'fill-amber-400 text-amber-400',
                      )}
                    />
                  </button>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium truncate">{meal.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {meal.item_count} {meal.item_count === 1 ? 'item' : 'itens'} · {formatKcal(meal.totals?.kcal)} · P{' '}
                      {formatGrams(meal.totals?.protein_g)} · C{' '}
                      {formatGrams(meal.totals?.carbs_g)} · G{' '}
                      {formatGrams(meal.totals?.fat_g)}
                    </p>
                    {meal.items?.length ? (
                      <p className="text-xs text-muted-foreground/80 truncate">
                        {meal.items
                          .map((i) => i.food_name)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      aria-label={`Editar ${meal.name}`}
                      onClick={() => {
                        setShowForm(false);
                        setEditing(meal);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 text-muted-foreground hover:text-destructive"
                      aria-label={`Arquivar ${meal.name}`}
                      onClick={() => setArchiveTarget(meal)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={showForm || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar refeição' : 'Nova refeição'}</DialogTitle>
          </DialogHeader>
          <MealForm
            key={editing?.id || 'new'}
            initial={editing || {}}
            foods={foods}
            foodsLoading={foodsLoading}
            foodsError={foodsError}
            onRetryFoods={() => refetchFoods()}
            submitting={createMut.isPending || updateMut.isPending}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSubmit={(data) => {
              if (editing) updateMut.mutate({ id: editing.id, data });
              else createMut.mutate(data);
            }}
          />
        </DialogContent>
      </Dialog>
      <NutritionConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Arquivar refeição?"
        description={archiveTarget ? `“${archiveTarget.name}” sairá das refeições salvas. Seus registros anteriores continuarão no diário.` : ''}
        confirmLabel="Arquivar"
        destructive
        busy={archiveMut.isPending}
        onConfirm={() => archiveTarget && archiveMut.mutate(archiveTarget.id)}
      />
    </div>
  );
}
