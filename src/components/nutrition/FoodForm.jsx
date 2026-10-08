import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { macrosImpliedKcal } from '@/lib/nutrition';

function str(v) {
  if (v == null || v === '') return '';
  return String(v);
}

export default function FoodForm({ initial = {}, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    brand: initial.brand || '',
    serving_label: initial.serving_label || '100 g',
    serving_grams: str(initial.serving_grams ?? 100),
    kcal: str(initial.kcal ?? ''),
    protein_g: str(initial.protein_g ?? ''),
    carbs_g: str(initial.carbs_g ?? ''),
    fat_g: str(initial.fat_g ?? ''),
    fiber_g: str(initial.fiber_g ?? ''),
    barcode: str(initial.barcode ?? ''),
    is_favorite: !!(initial.is_favorite === 1 || initial.is_favorite === true),
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const implied = macrosImpliedKcal({
    protein_g: form.protein_g,
    carbs_g: form.carbs_g,
    fat_g: form.fat_g,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const num = (v) => {
      if (v === '' || v == null) return 0;
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    };
    const gramsRaw = form.serving_grams === '' ? null : num(form.serving_grams);
    onSubmit?.({
      name,
      brand: form.brand.trim(),
      serving_label: form.serving_label.trim() || '100 g',
      serving_grams: gramsRaw,
      kcal: num(form.kcal),
      protein_g: num(form.protein_g),
      carbs_g: num(form.carbs_g),
      fat_g: num(form.fat_g),
      fiber_g: num(form.fiber_g),
      barcode: form.barcode.replace(/\D/g, '') || null,
      is_favorite: form.is_favorite ? 1 : 0,
      source: initial.source || 'custom',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="food-name">Nome</Label>
        <Input
          id="food-name"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Ex.: Frango peito grelhado"
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="food-brand">Marca (opcional)</Label>
        <Input
          id="food-brand"
          value={form.brand}
          onChange={(e) => setField('brand', e.target.value)}
          placeholder="Ex.: Seara"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="food-serving-label">Porção</Label>
          <Input
            id="food-serving-label"
            value={form.serving_label}
            onChange={(e) => setField('serving_label', e.target.value)}
            placeholder="100 g"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="food-serving-grams">Gramas da porção</Label>
          <Input
            id="food-serving-grams"
            type="number"
            inputMode="decimal"
            className="tabular-nums"
            value={form.serving_grams}
            onChange={(e) => setField('serving_grams', e.target.value)}
            placeholder="100"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Valores abaixo são <strong>por porção</strong> (não por 100 g se a porção for outra).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="food-kcal">Calorias</Label>
          <Input
            id="food-kcal"
            type="number"
            inputMode="decimal"
            className="tabular-nums"
            value={form.kcal}
            onChange={(e) => setField('kcal', e.target.value)}
            placeholder="165"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="food-protein">Proteína (g)</Label>
          <Input
            id="food-protein"
            type="number"
            inputMode="decimal"
            className="tabular-nums"
            value={form.protein_g}
            onChange={(e) => setField('protein_g', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="food-carbs">Carbo (g)</Label>
          <Input
            id="food-carbs"
            type="number"
            inputMode="decimal"
            className="tabular-nums"
            value={form.carbs_g}
            onChange={(e) => setField('carbs_g', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="food-fat">Gordura (g)</Label>
          <Input
            id="food-fat"
            type="number"
            inputMode="decimal"
            className="tabular-nums"
            value={form.fat_g}
            onChange={(e) => setField('fat_g', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="food-barcode">Código de barras — opcional</Label>
        <Input
          id="food-barcode"
          inputMode="numeric"
          autoComplete="off"
          className="tabular-nums tracking-wide"
          value={form.barcode}
          onChange={(e) => setField('barcode', e.target.value)}
          placeholder="Ex.: 7891000100103"
        />
        <p className="text-xs text-muted-foreground">
          Com o código salvo, da próxima vez o alimento aparece direto ao escanear.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="food-fiber">Fibra (g) — opcional</Label>
        <Input
          id="food-fiber"
          type="number"
          inputMode="decimal"
          className="tabular-nums"
          value={form.fiber_g}
          onChange={(e) => setField('fiber_g', e.target.value)}
        />
      </div>
      {(form.protein_g || form.carbs_g || form.fat_g) && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Macros somam ~{Math.round(implied)} kcal por porção
        </p>
      )}
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={!!form.is_favorite}
          onChange={(e) => setField('is_favorite', e.target.checked)}
        />
        Favorito
      </label>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting || !form.name.trim()}>
          {submitting ? 'Salvando…' : 'Salvar alimento'}
        </Button>
      </div>
    </form>
  );
}
