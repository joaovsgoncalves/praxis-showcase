import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, ScanBarcode } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import FoodForm from '@/components/nutrition/FoodForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MEAL_SLOTS, MEAL_SLOT_LABELS, formatGrams, formatKcal } from '@/lib/nutrition';
import { toast } from 'sonner';

/**
 * Fase 12 — barcode: cola o código (ou digita) → Open Food Facts / cache → loga.
 * Câmera nativa fica pra mobile nativo; no web colar EAN basta.
 */
export default function NutritionBarcodeEntry({
  date,
  defaultSlot = 'snack_afternoon',
  onLogged,
  showTrigger = true,
  open: openProp,
  onOpenChange,
}) {
  const queryClient = useQueryClient();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = (o) => {
    if (!controlled) setUncontrolledOpen(o);
    onOpenChange?.(o);
  };
  const [code, setCode] = useState('');
  const [slot, setSlot] = useState(defaultSlot);
  const [servings, setServings] = useState('1');
  const [result, setResult] = useState(null);
  // Código escaneado que não existe em lugar nenhum — vira cadastro manual
  // pré-preenchido em vez de sumir junto com o toast de erro.
  const [unknownCode, setUnknownCode] = useState('');
  const [creatingFood, setCreatingFood] = useState(false);

  const reset = () => {
    setCode('');
    setResult(null);
    setServings('1');
    setUnknownCode('');
    setCreatingFood(false);
  };

  const lookupMut = useMutation({
    mutationFn: (raw) => praxisApi.nutrition.barcode.lookup(raw),
    onSuccess: (data) => {
      setResult(data);
      setUnknownCode('');
      setCreatingFood(false);
      toast.success(
        data.source === 'cache'
          ? 'Achei no teu catálogo'
          : 'Achei no Open Food Facts (salvo no catálogo)',
      );
    },
    onError: (err, raw) => {
      setResult(null);
      // 404 = código válido, produto desconhecido: guarda pro cadastro manual.
      const notFound = err?.status === 404 || err?.body?.source === 'not_found';
      setUnknownCode(notFound ? err?.body?.barcode || raw : '');
      setCreatingFood(false);
      toast.error(
        notFound
          ? 'Não achei esse produto — dá pra cadastrar com o código'
          : err?.message || 'Não deu pra buscar o código',
      );
    },
  });

  const createFoodMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.foods.create(data),
    onSuccess: (food) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'foods'] });
      setResult({ source: 'cache', barcode: food.barcode || unknownCode, food });
      setUnknownCode('');
      setCreatingFood(false);
      toast.success('Alimento cadastrado com o código');
    },
    onError: (err) =>
      toast.error('Não deu pra cadastrar', { description: err?.message }),
  });

  const logMut = useMutation({
    mutationFn: ({ foodId, meal_slot, servings: s }) =>
      praxisApi.nutrition.logs.create({
        date,
        food_item_id: foodId,
        meal_slot,
        servings: s,
        source: 'barcode',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'day'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'foods'] });
      toast.success('No diário');
      setOpen(false);
      reset();
      onLogged?.();
    },
    onError: () => toast.error('Não deu pra registrar'),
  });

  const food = result?.food;
  const onSearch = () => {
    const digits = String(code).replace(/\D/g, '');
    if (digits.length < 8) {
      toast.error('Código precisa ter pelo menos 8 dígitos');
      return;
    }
    setUnknownCode('');
    setCreatingFood(false);
    lookupMut.mutate(digits);
  };

  return (
    <>
      {showTrigger ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setSlot(defaultSlot || 'snack_afternoon');
            setOpen(true);
          }}
        >
          <ScanBarcode className="w-4 h-4 mr-1.5" />
          Código
        </Button>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (o) setSlot(defaultSlot || 'snack_afternoon');
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código de barras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Digite ou cole o código de barras. A busca consulta o seu catálogo e o{' '}
              <span className="text-foreground">Open Food Facts</span>. Confira o produto
              e a porção antes de salvar.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="barcode-code">Código</Label>
              <Input
                id="barcode-code"
                inputMode="numeric"
                autoComplete="off"
                className="bg-secondary/40 tabular-nums tracking-wide"
                placeholder="Ex.: 7891000100103"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSearch();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              className="w-full rounded-full"
              disabled={lookupMut.isPending || !code.trim()}
              onClick={onSearch}
            >
              {lookupMut.isPending ? 'Buscando…' : 'Buscar produto'}
            </Button>

            {unknownCode && !creatingFood ? (
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold leading-snug">
                    Esse código não está em lugar nenhum ainda
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Nem no teu catálogo, nem no Open Food Facts. Cadastra os macros
                    uma vez e o código{' '}
                    <span className="tabular-nums text-foreground">{unknownCode}</span>{' '}
                    passa a achar o produto direto.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => setCreatingFood(true)}
                >
                  <PackagePlus className="w-4 h-4 mr-1.5" />
                  Cadastrar com este código
                </Button>
              </div>
            ) : null}

            {creatingFood && unknownCode ? (
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                <p className="mb-3 text-sm font-semibold leading-snug">
                  Novo alimento ·{' '}
                  <span className="tabular-nums font-normal text-muted-foreground">
                    {unknownCode}
                  </span>
                </p>
                <FoodForm
                  key={unknownCode}
                  initial={{ barcode: unknownCode, source: 'barcode' }}
                  submitting={createFoodMut.isPending}
                  onCancel={() => setCreatingFood(false)}
                  onSubmit={(data) => createFoodMut.mutate(data)}
                />
              </div>
            ) : null}

            {food ? (
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold leading-snug">{food.name}</p>
                  {food.brand ? (
                    <p className="text-xs text-muted-foreground">{food.brand}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground tabular-nums pt-1">
                    {food.serving_label || 'porção'} · {formatKcal(food.kcal)} · P{' '}
                    {formatGrams(food.protein_g)} · C {formatGrams(food.carbs_g)} · G{' '}
                    {formatGrams(food.fat_g)}
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Fonte: {result.source === 'cache' ? 'catálogo local' : 'Open Food Facts'}
                    {result.barcode ? ` · ${result.barcode}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Refeição</Label>
                    <Select value={slot} onValueChange={setSlot}>
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
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="bc-serv">
                      Porções
                    </Label>
                    <Input
                      id="bc-serv"
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0.25"
                      className="bg-secondary/40 tabular-nums"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={logMut.isPending}
                  onClick={() => {
                    const s = Number(String(servings).replace(',', '.'));
                    if (!Number.isFinite(s) || s <= 0 || s > 1_000_000) {
                      toast.error('Informe uma quantidade válida, maior que zero');
                      return;
                    }
                    logMut.mutate({
                      foodId: food.id,
                      meal_slot: slot,
                      servings: s,
                    });
                  }}
                >
                  {logMut.isPending ? 'Gravando…' : 'Adicionar ao diário'}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
