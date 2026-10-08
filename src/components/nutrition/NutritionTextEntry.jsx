import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Type } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';

/**
 * Fase 8 — entrada por texto (base p/ transcript/A.N.A. no futuro).
 * Parse heurístico → confirmação → grava logs.
 */
export default function NutritionTextEntry({
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
  const [text, setText] = useState('');
  const [slot, setSlot] = useState(defaultSlot);
  const [parsed, setParsed] = useState(null);
  const [selected, setSelected] = useState({}); // food_item_id -> bool

  const reset = () => {
    setText('');
    setParsed(null);
    setSelected({});
  };

  const parseMut = useMutation({
    mutationFn: () =>
      praxisApi.nutrition.parseText({
        text,
        meal_slot: slot === 'auto' ? undefined : slot,
      }),
    onSuccess: (data) => {
      setParsed(data);
      const next = {};
      for (const c of data.candidates || []) {
        next[c.food_item_id] = true;
      }
      setSelected(next);
      if (!(data.candidates || []).length) {
        toast.message('Não achei alimentos no catálogo — tenta outros nomes');
      }
    },
    onError: () => toast.error('Não deu pra interpretar o texto'),
  });

  const confirmMut = useMutation({
    mutationFn: (items) =>
      praxisApi.nutrition.logs.fromText({
        date,
        meal_slot: parsed?.meal_slot || slot,
        items,
        source: 'text',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'day'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'foods', 'recent'] });
      const count = res.created || 0;
      toast.success(`${count} ${count === 1 ? 'item adicionado' : 'itens adicionados'} ao diário`);
      setOpen(false);
      reset();
      onLogged?.(res);
    },
    onError: () => toast.error('Não deu pra gravar'),
  });

  const onConfirm = () => {
    const items = (parsed?.candidates || [])
      .filter((c) => selected[c.food_item_id])
      .map((c) => ({
        food_item_id: c.food_item_id,
        servings: c.servings,
        grams: c.grams,
        meal_slot: c.meal_slot,
      }));
    if (!items.length) {
      toast.error('Marca pelo menos um item');
      return;
    }
    confirmMut.mutate(items);
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
          <Type className="w-4 h-4 mr-1.5" />
          Texto
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
            <DialogTitle>Adicionar por texto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Descreva os alimentos e as quantidades. Confira os resultados do catálogo
              antes de salvar no diário.
            </p>
            <div className="space-y-1.5">
              <Label>Refeição</Label>
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
              <Label htmlFor="nutrition-text">Texto</Label>
              <Textarea
                id="nutrition-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Ex.: 150g frango peito e 100g arroz no almoço"
                className="bg-secondary/40 resize-none"
              />
            </div>
            <Button
              type="button"
              className="w-full rounded-full"
              disabled={!text.trim() || parseMut.isPending}
              onClick={() => parseMut.mutate()}
            >
              {parseMut.isPending ? 'Interpretando…' : 'Interpretar'}
            </Button>

            {parsed ? (
              <div className="space-y-3">
                {(parsed.candidates || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum match. Cadastre o alimento na aba Alimentos ou reformule.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {parsed.candidates.map((c) => (
                      <li key={`${c.food_item_id}-${c.phrase}`}>
                        <label
                          className={cn(
                            'flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2 cursor-pointer',
                            selected[c.food_item_id] && 'bg-primary/10 border-primary/30',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-border"
                            checked={!!selected[c.food_item_id]}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [c.food_item_id]: e.target.checked,
                              }))
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{c.food_name}</p>
                            <p className="text-xs text-muted-foreground">
                              “{c.phrase}” · {c.servings}× · {formatKcal(c.preview?.kcal)} · P{' '}
                              {formatGrams(c.preview?.protein_g)}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {parsed.unmatched?.length ? (
                  <p className="text-xs text-muted-foreground">
                    Sem match: {parsed.unmatched.join('; ')}
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={confirmMut.isPending || !(parsed.candidates || []).length}
                  onClick={onConfirm}
                >
                  {confirmMut.isPending ? 'Gravando…' : 'Confirmar no diário'}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
