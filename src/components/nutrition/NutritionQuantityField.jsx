import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import { convertNutritionQuantity, parseNutritionQuantity } from '@/lib/nutritionQuantity';

export default function NutritionQuantityField({ id, value, unit, onChange, onUnitChange, reference, disabled = false }) {
  const gramsPerServing = parseNutritionQuantity(reference?.serving_grams);
  const amount = parseNutritionQuantity(value);
  const scale = amount == null ? null : unit === 'grams' ? (gramsPerServing ? amount / gramsPerServing : null) : amount;
  const invalid = scale == null;
  const changeUnit = (next) => {
    onChange(convertNutritionQuantity(value, unit, next, gramsPerServing));
    onUnitChange(next);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Quantidade</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 bg-secondary/40 tabular-nums"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={`${id}-help`}
        />
        <select
          aria-label="Unidade da quantidade"
          value={unit}
          disabled={disabled}
          onChange={(event) => changeUnit(event.target.value)}
          className="min-h-11 shrink-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {gramsPerServing ? <option value="grams">Gramas (g)</option> : null}
          <option value="servings">Porções</option>
        </select>
      </div>
      <p id={`${id}-help`} className="text-xs text-muted-foreground" role={invalid ? 'status' : undefined}>
        {invalid ? 'Informe uma quantidade maior que zero.' : gramsPerServing
          ? `1 porção = ${formatGrams(gramsPerServing)}${reference?.serving_label && reference.serving_label !== '100 g' ? ` · ${reference.serving_label}` : ''}`
          : 'Este registro não tem conversão para gramas. Use porções.'}
      </p>
      {scale != null ? (
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          Prévia: {formatKcal(Number(reference?.kcal || 0) * scale)} · P {formatGrams(Number(reference?.protein_g || 0) * scale)} · C {formatGrams(Number(reference?.carbs_g || 0) * scale)} · G {formatGrams(Number(reference?.fat_g || 0) * scale)}
        </p>
      ) : null}
    </div>
  );
}
