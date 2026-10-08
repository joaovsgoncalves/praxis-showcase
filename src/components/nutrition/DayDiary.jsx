import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  Star,
  Clock,
  Copy,
  UtensilsCrossed,
  Type,
  ScanBarcode,
} from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PraxisEmptyState, PraxisListSkeleton } from '@/components/layout/PraxisPage';
import {
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  formatGrams,
  formatKcal,
} from '@/lib/nutrition';
import MacroBars from '@/components/nutrition/MacroBars';
import NutritionTextEntry from '@/components/nutrition/NutritionTextEntry';
import NutritionBarcodeEntry from '@/components/nutrition/NutritionBarcodeEntry';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import NutritionQuantityField from '@/components/nutrition/NutritionQuantityField';
import NutritionConfirmDialog from '@/components/nutrition/NutritionConfirmDialog';
import { nutritionQuantityPayload, parseNutritionQuantity, recordedFoodReference } from '@/lib/nutritionQuantity';

import { fortalezaDateKey, fortalezaNowTimeHHMM } from '@/lib/dates';

const todayLocalISO = fortalezaDateKey;

function shiftDate(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatDateLabel(iso) {
  if (iso === todayLocalISO()) return 'Hoje';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function defaultSlotForHour() {
  const h = Number(fortalezaNowTimeHHMM().split(':')[0]);
  if (h < 10) return 'breakfast';
  if (h < 12) return 'snack_morning';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack_afternoon';
  return 'dinner';
}

const PICKER_TABS = [
  { id: 'recent', label: 'Recentes', icon: Clock },
  { id: 'fav', label: 'Favoritos', icon: Star },
  { id: 'meals', label: 'Refeições', icon: UtensilsCrossed },
  { id: 'search', label: 'Buscar', icon: Search },
];

export default function DayDiary({ date: controlledDate, onDateChange }) {
  const queryClient = useQueryClient();
  const [internalDate, setInternalDate] = useState(null);
  const date = controlledDate || internalDate || todayLocalISO();
  const setDate = (d) => {
    if (onDateChange) onDateChange(d);
    else setInternalDate(d);
  };

  const [addOpen, setAddOpen] = useState(false);
  const [addSlot, setAddSlot] = useState(defaultSlotForHour);
  const [pickerTab, setPickerTab] = useState('recent');
  const [foodQ, setFoodQ] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('servings');
  const [editLog, setEditLog] = useState(null);
  const [editServings, setEditServings] = useState('1');
  const [editQuantityUnit, setEditQuantityUnit] = useState('servings');
  const [textOpen, setTextOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const { data: day, isLoading, isError } = useQuery({
    queryKey: ['nutrition', 'day', date],
    queryFn: () => praxisApi.nutrition.day(date),
    retry: 1,
  });

  const { data: recentFoods = [], isLoading: recentLoading, isError: recentError, refetch: refetchRecent } = useQuery({
    queryKey: ['nutrition', 'foods', 'recent'],
    queryFn: () => praxisApi.nutrition.foods.recent({ limit: 12 }),
    enabled: addOpen,
    retry: 1,
  });

  const { data: favFoods = [], isLoading: favLoading, isError: favError, refetch: refetchFav } = useQuery({
    queryKey: ['nutrition', 'foods', { favorites: true }],
    queryFn: () => praxisApi.nutrition.foods.list({ favorites: true, limit: 30 }),
    enabled: addOpen,
    retry: 1,
  });

  const { data: savedMeals = [], isLoading: mealsLoading, isError: mealsError, refetch: refetchMeals } = useQuery({
    queryKey: ['nutrition', 'meals', { forAdd: true }],
    queryFn: () => praxisApi.nutrition.meals.list({ limit: 30 }),
    enabled: addOpen,
    retry: 1,
  });

  const { data: searchFoods = [], isLoading: searchLoading, isError: searchError, refetch: refetchSearch } = useQuery({
    queryKey: ['nutrition', 'foods', { q: foodQ, forAdd: true }],
    queryFn: () =>
      praxisApi.nutrition.foods.list({
        q: foodQ.trim() || undefined,
        limit: 30,
      }),
    enabled: addOpen && pickerTab === 'search',
    retry: 1,
  });

  const invalidateDay = () => {
    queryClient.invalidateQueries({ queryKey: ['nutrition', 'day'] });
    queryClient.invalidateQueries({ queryKey: ['nutrition', 'foods', 'recent'] });
  };

  const createMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.logs.create(data),
    onSuccess: () => {
      invalidateDay();
      setAddOpen(false);
      setSelectedFood(null);
      setServings('1');
      setFoodQ('');
      toast.success('Adicionado ao diário');
    },
    onError: () => toast.error('Não deu pra adicionar'),
  });

  const fromMealMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.logs.fromMeal(data),
    onSuccess: (res) => {
      invalidateDay();
      setAddOpen(false);
      setSelectedFood(null);
      toast.success(
        res?.created
          ? `Refeição adicionada com ${res.created} ${res.created === 1 ? 'item' : 'itens'}`
          : 'Refeição adicionada',
      );
    },
    onError: () => toast.error('Não deu pra adicionar a refeição'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => praxisApi.nutrition.logs.update(id, data),
    onSuccess: () => {
      invalidateDay();
      setEditLog(null);
      toast.success('Quantidade atualizada');
    },
    onError: () => toast.error('Não deu pra atualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => praxisApi.nutrition.logs.delete(id),
    onSuccess: () => {
      invalidateDay();
      setConfirmAction(null);
      toast.success('Removido');
    },
    onError: () => toast.error('Não deu pra remover'),
  });

  const copyYesterdayMut = useMutation({
    mutationFn: () =>
      praxisApi.nutrition.copyDay({
        to_date: date,
        from_date: shiftDate(date, -1),
      }),
    onSuccess: (res) => {
      invalidateDay();
      setConfirmAction(null);
      toast.success(
        res?.copied
          ? `Copiei ${res.copied} ${res.copied === 1 ? 'item' : 'itens'} de ontem`
          : 'Ontem estava vazio — nada pra copiar',
      );
    },
    onError: (err) => {
      const msg =
        err?.status === 409
          ? 'Este dia já tem comida. Apaga os itens se quiser copiar ontem.'
          : 'Não deu pra copiar ontem';
      toast.error(msg);
    },
  });

  const totals = day?.totals;
  const targets = day?.targets;
  const bySlot = day?.by_slot;
  const isEmptyDay = !isLoading && !isError && !(day?.logs?.length > 0);

  const remaining = useMemo(() => {
    if (!totals || !targets) return null;
    const r = (t, u) => (t == null ? null : Math.round((Number(t) - Number(u || 0)) * 10) / 10);
    return {
      kcal: r(targets.kcal, totals.kcal),
      protein_g: r(targets.protein_g, totals.protein_g),
      carbs_g: r(targets.carbs_g, totals.carbs_g),
      fat_g: r(targets.fat_g, totals.fat_g),
    };
  }, [totals, targets]);

  const openAdd = (slot) => {
    setAddSlot(slot || defaultSlotForHour());
    setSelectedFood(null);
    setServings('1');
    setFoodQ('');
    setPickerTab('recent');
    setAddOpen(true);
  };

  const quickAdd = (food, slot = addSlot) => {
    createMut.mutate({
      date,
      meal_slot: slot,
      food_item_id: food.id,
      servings: 1,
    });
  };

  const quickAddMeal = (meal, slot = addSlot) => {
    fromMealMut.mutate({
      meal_id: meal.id,
      date,
      meal_slot: slot,
      servings: 1,
    });
  };

  const submitAdd = () => {
    if (!selectedFood) return;
    const quantity = nutritionQuantityPayload(servings, quantityUnit);
    if (!quantity) return toast.error('Informe uma quantidade maior que zero');
    createMut.mutate({
      date,
      meal_slot: addSlot,
      food_item_id: selectedFood.id,
      ...quantity,
    });
  };

  const submitEdit = () => {
    if (!editLog) return;
    const quantity = nutritionQuantityPayload(editServings, editQuantityUnit);
    if (!quantity) return toast.error('Informe uma quantidade maior que zero');
    updateMut.mutate({ id: editLog.id, data: quantity });
  };

  const isMealsTab = pickerTab === 'meals';

  const pickerList =
    pickerTab === 'recent'
      ? recentFoods
      : pickerTab === 'fav'
        ? favFoods
        : pickerTab === 'meals'
          ? savedMeals
          : searchFoods;

  const pickerEmptyMsg =
    pickerTab === 'recent'
      ? 'Você ainda não adicionou nenhum alimento ao diário.'
      : pickerTab === 'fav'
        ? 'Nenhum favorito ainda. Marque a estrela em Alimentos.'
        : pickerTab === 'meals'
          ? 'Nenhuma refeição salva. Crie uma em Mais → Refeições.'
          : foodQ.trim()
            ? 'Nenhum alimento com esse nome.'
            : 'Digite o nome de um alimento para buscar.';

  const pickerLoading = pickerTab === 'recent'
    ? recentLoading
    : pickerTab === 'fav'
      ? favLoading
      : pickerTab === 'meals'
        ? mealsLoading
        : searchLoading;
  const pickerError = pickerTab === 'recent'
    ? recentError
    : pickerTab === 'fav'
      ? favError
      : pickerTab === 'meals'
        ? mealsError
        : searchError;
  const retryPicker = pickerTab === 'recent'
    ? refetchRecent
    : pickerTab === 'fav'
      ? refetchFav
      : pickerTab === 'meals'
        ? refetchMeals
        : refetchSearch;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={() => setDate(shiftDate(date, -1))}
          aria-label="Dia anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-0">
          <p className="text-sm font-semibold capitalize">{formatDateLabel(date)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{date}</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={() => setDate(shiftDate(date, 1))}
          aria-label="Próximo dia"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <PraxisListSkeleton rows={3} />
      ) : isError ? (
        <PraxisEmptyState
          title="Não carregou o diário"
          description="Verifique a conexão e tente novamente."
          compact
        />
      ) : (
        <>
          <Card className="border-border/80 bg-card/40 shadow-none">
            <CardContent className="space-y-3 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total do dia</p>
                  <p className="text-lg font-semibold tabular-nums leading-tight">
                    <span
                      className={
                        targets?.kcal != null &&
                        Number(totals?.kcal) > Number(targets.kcal) * 1.02
                          ? 'text-amber-400'
                          : undefined
                      }
                    >
                      {formatKcal(totals?.kcal)}
                    </span>
                    {targets?.kcal != null ? (
                      <span className="text-sm font-normal text-muted-foreground">
                        {' '}
                        / {formatKcal(targets.kcal)}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <MacroBars totals={totals || {}} targets={targets || {}} variant="full" />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              {remaining && remaining.kcal != null ? (
                <div className="space-y-1 text-xs tabular-nums">
                  <p className={Number(remaining.kcal) < 0 ? 'text-amber-400/95' : 'text-muted-foreground'}>
                    {Number(remaining.kcal) < 0
                      ? `Acima da meta: ${formatKcal(Math.abs(remaining.kcal))}`
                      : `Restam ${formatKcal(remaining.kcal)}`}
                  </p>
                  {remaining.protein_g != null ? (
                    <p className="text-muted-foreground">
                      {Number(remaining.protein_g) <= 0
                        ? 'Proteína: meta atingida'
                        : `Proteína: faltam ${formatGrams(remaining.protein_g)}`}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Diário do dia</p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {isEmptyDay ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full min-h-11"
                  disabled={copyYesterdayMut.isPending}
                  onClick={() => setConfirmAction({ type: 'copy' })}
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  {copyYesterdayMut.isPending ? 'Copiando…' : 'Copiar ontem'}
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-full min-h-11"
                onClick={() => openAdd()}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar
              </Button>
            </div>
          </div>

          {textOpen ? (
            <NutritionTextEntry
              date={date}
              defaultSlot={addSlot}
              showTrigger={false}
              open={textOpen}
              onOpenChange={setTextOpen}
            />
          ) : null}
          {barcodeOpen ? (
            <NutritionBarcodeEntry
              date={date}
              defaultSlot={addSlot}
              showTrigger={false}
              open={barcodeOpen}
              onOpenChange={setBarcodeOpen}
            />
          ) : null}

          {MEAL_SLOTS.map((slot) => {
            const items = bySlot?.[slot] || [];
            return (
              <section key={slot} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{MEAL_SLOT_LABELS[slot]}</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="min-h-11 rounded-full text-xs"
                    onClick={() => openAdd(slot)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {items.length > 0 ? (
                  <ul className="space-y-2">
                    {items.map((log) => (
                      <li key={log.id}>
                        <Card className="border-border/80 bg-card/40 shadow-none">
                          <CardContent className="flex items-center gap-3 px-3 py-2.5">
                            <button
                              type="button"
                              className="min-h-11 min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => {
                                setEditLog(log);
                                const grams = parseNutritionQuantity(log.grams);
                                setEditQuantityUnit(grams ? 'grams' : 'servings');
                                setEditServings(String(grams || log.servings || 1));
                              }}
                            >
                              <div className="flex min-w-0 items-baseline justify-between gap-2">
                                <p className="min-w-0 truncate text-sm font-medium leading-snug">
                                  {log.name_snapshot}
                                </p>
                                <p className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                                  {log.grams != null && Number(log.grams) > 0
                                    ? `${Number(log.grams)} g`
                                    : log.servings != null && Number(log.servings) !== 1
                                      ? `${Number(log.servings)}×`
                                      : formatKcal(log.kcal)}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs leading-snug text-muted-foreground tabular-nums">
                                {formatKcal(log.kcal)}
                                <span className="text-muted-foreground/60"> · </span>
                                P {formatGrams(log.protein_g)}
                                <span className="text-muted-foreground/60"> · </span>
                                C {formatGrams(log.carbs_g)}
                                <span className="text-muted-foreground/60"> · </span>
                                G {formatGrams(log.fat_g)}
                              </p>
                            </button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label="Remover"
                              onClick={() => setConfirmAction({ type: 'delete', log })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}

          {isEmptyDay ? (
            <PraxisEmptyState
              title="Diário vazio neste dia"
              description="Adicione uma comida ou copie os registros de ontem."
              compact
              action={
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="rounded-full" onClick={() => openAdd()}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Adicionar comida
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={copyYesterdayMut.isPending}
                    onClick={() => setConfirmAction({ type: 'copy' })}
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copiar ontem
                  </Button>
                </div>
              }
            />
          ) : null}
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar ao diário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full min-h-11"
                onClick={() => {
                  setAddOpen(false);
                  setTextOpen(true);
                }}
              >
                <Type className="w-4 h-4 mr-1.5" />
                Texto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full min-h-11"
                onClick={() => {
                  setAddOpen(false);
                  setBarcodeOpen(true);
                }}
              >
                <ScanBarcode className="w-4 h-4 mr-1.5" />
                Código
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Refeição</Label>
              <Select value={addSlot} onValueChange={setAddSlot}>
                <SelectTrigger className="bg-secondary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEAL_SLOT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-1 rounded-full bg-secondary/40 p-1">
              {PICKER_TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setPickerTab(t.id);
                      setSelectedFood(null);
                    }}
                    className={cn(
                      'flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      pickerTab === t.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {pickerTab === 'search' ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={foodQ}
                  onChange={(e) => setFoodQ(e.target.value)}
                  placeholder="Ovo, arroz…"
                  className="pl-9 bg-secondary/40"
                  autoFocus
                />
              </div>
            ) : null}

            <ul className="max-h-52 overflow-y-auto space-y-1 border border-border/60 rounded-lg p-1">
              {pickerLoading ? (
                <li className="p-3 text-xs text-muted-foreground" role="status">Carregando opções…</li>
              ) : pickerError ? (
                <li className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
                  <span>Não foi possível carregar esta lista.</span>
                  <Button type="button" variant="ghost" size="sm" className="min-h-11 rounded-full" onClick={() => retryPicker()}>
                    Tentar novamente
                  </Button>
                </li>
              ) : pickerList.length === 0 ? (
                <li className="p-3 text-xs leading-relaxed text-muted-foreground">
                  {pickerEmptyMsg}
                </li>
              ) : isMealsTab ? (
                pickerList.map((m) => (
                  <li key={m.id}>
                    <div className="flex items-center gap-1 rounded-md">
                      <div className="min-w-0 flex-1 rounded-md px-3 py-2 text-sm">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          {m.name}
                          {m.is_favorite ? (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          ) : null}
                        </span>
                        <span className="block text-xs tabular-nums text-muted-foreground">
                          {m.item_count} {m.item_count === 1 ? 'item' : 'itens'} · {formatKcal(m.totals?.kcal)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mr-1 min-h-11 shrink-0 rounded-full text-xs"
                        disabled={fromMealMut.isPending}
                        onClick={() => quickAddMeal(m)}
                        title="Adicionar refeição inteira"
                      >
                        Adicionar tudo
                      </Button>
                    </div>
                  </li>
                ))
              ) : (
                pickerList.map((f) => (
                  <li key={f.id}>
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded-md',
                        selectedFood?.id === f.id && 'bg-primary/15',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const grams = parseNutritionQuantity(f.serving_grams);
                          setSelectedFood(f);
                          setQuantityUnit(grams ? 'grams' : 'servings');
                          setServings(String(grams || 1));
                        }}
                        className={cn(
                          'min-h-11 min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selectedFood?.id === f.id
                            ? 'text-foreground'
                            : 'hover:bg-secondary/50 text-muted-foreground',
                        )}
                      >
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          {f.name}
                          {f.is_favorite ? (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          ) : null}
                        </span>
                        <span className="block text-xs tabular-nums">
                          {f.serving_label} · {formatKcal(f.kcal)}
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mr-1 min-h-11 shrink-0 rounded-full text-xs"
                        disabled={createMut.isPending}
                        onClick={() => quickAdd(f)}
                        title="Adicionar 1 porção"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {!isMealsTab && selectedFood ? (
              <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
                <p className="text-sm font-medium truncate">{selectedFood.name}</p>
                <NutritionQuantityField
                  id="add-quantity"
                  value={servings}
                  unit={quantityUnit}
                  onChange={setServings}
                  onUnitChange={setQuantityUnit}
                  reference={selectedFood}
                  disabled={createMut.isPending}
                />
                <Button
                  type="button"
                  className="w-full rounded-full min-h-11"
                  disabled={createMut.isPending || !nutritionQuantityPayload(servings, quantityUnit)}
                  onClick={submitAdd}
                >
                  {createMut.isPending ? 'Salvando…' : 'Salvar no diário'}
                </Button>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Toque no alimento para ajustar a quantidade ou use Adicionar para registrar uma porção.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLog} onOpenChange={(o) => !o && setEditLog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar quantidade</DialogTitle>
          </DialogHeader>
          {editLog ? (
            <div className="space-y-4">
              <p className="text-sm font-medium">{editLog.name_snapshot}</p>
              <NutritionQuantityField
                id="edit-quantity"
                value={editServings}
                unit={editQuantityUnit}
                onChange={setEditServings}
                onUnitChange={setEditQuantityUnit}
                reference={recordedFoodReference(editLog)}
                disabled={updateMut.isPending}
              />
              <Button
                type="button"
                className="w-full rounded-full min-h-11"
                disabled={updateMut.isPending || !nutritionQuantityPayload(editServings, editQuantityUnit)}
                onClick={submitEdit}
              >
                {updateMut.isPending ? 'Salvando…' : 'Atualizar'}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <NutritionConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === 'copy' ? 'Copiar o dia de ontem?' : 'Remover do diário?'}
        description={confirmAction?.type === 'copy'
          ? 'Os registros de ontem serão copiados para o dia aberto.'
          : confirmAction?.log
            ? `“${confirmAction.log.name_snapshot}” será removido deste dia. O alimento continuará no catálogo.`
            : ''}
        confirmLabel={confirmAction?.type === 'copy' ? 'Copiar registros' : 'Remover'}
        destructive={confirmAction?.type === 'delete'}
        busy={copyYesterdayMut.isPending || deleteMut.isPending}
        onConfirm={() => {
          if (confirmAction?.type === 'copy') copyYesterdayMut.mutate();
          if (confirmAction?.type === 'delete' && confirmAction.log) deleteMut.mutate(confirmAction.log.id);
        }}
      />
    </div>
  );
}
