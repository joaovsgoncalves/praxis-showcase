import { Card, CardContent } from '@/components/ui/card';
import { Droplets, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAILY_GOAL_ML = 4000;
const GLASS_ML = 500;
const GLASS_COUNT = DAILY_GOAL_ML / GLASS_ML;
const STEP_ML = 250;

/** Linguagem humana — evita “4.000 ml” estilo planilha */
function formatLitersShort(ml) {
  if (ml >= 1000) {
    const L = ml / 1000;
    const rounded = Math.round(L * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded} L` : `${rounded.toLocaleString('pt-BR')} L`;
  }
  return `${Math.round(ml)} ml`;
}

export default function WaterTracker({ amountMl = 0, onUpdate }) {
  const safeAmount = Math.min(DAILY_GOAL_ML, Math.max(0, Number(amountMl) || 0));
  const filledGlasses = Math.min(GLASS_COUNT, Math.floor(safeAmount / GLASS_ML));
  const partialGlass = safeAmount % GLASS_ML;
  const remainingMl = Math.max(0, DAILY_GOAL_ML - safeAmount);
  const pct = Math.min(100, (safeAmount / DAILY_GOAL_ML) * 100);

  const updateAmount = (nextMl) => {
    onUpdate(Math.min(DAILY_GOAL_ML, Math.max(0, nextMl)));
  };

  const statusLine =
    safeAmount >= DAILY_GOAL_ML
      ? 'Meta do dia — 4 litros'
      : remainingMl >= 1000
        ? `Faltam ${formatLitersShort(remainingMl)}`
        : `Faltam ${formatLitersShort(remainingMl)}`;

  return (
    <Card className="border-border/80 bg-card/40 shadow-none">
      <CardContent className="px-5 py-4 sm:px-5 sm:py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Droplets className="w-4 h-4 text-blue-400 shrink-0" aria-hidden />
            <span className="text-sm font-semibold">Água</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {filledGlasses === GLASS_COUNT && partialGlass === 0
              ? '4 L'
              : `${filledGlasses} de ${GLASS_COUNT} copos`}
          </span>
        </div>

        <div
          className="h-2.5 w-full rounded-full bg-secondary/60 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(safeAmount)}
          aria-valuemin={0}
          aria-valuemax={DAILY_GOAL_ML}
          aria-label="Progresso de água no dia"
        >
          <div
            className="h-full rounded-full bg-blue-500/75 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 px-1" aria-hidden>
          {Array.from({ length: GLASS_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                updateAmount(
                  i < filledGlasses ? i * GLASS_ML : Math.min(DAILY_GOAL_ML, (i + 1) * GLASS_ML),
                )
              }
              className="p-1 rounded-md hover:bg-secondary/40 transition-colors"
              aria-label={`Copo ${i + 1} de ${GLASS_COUNT}`}
            >
              <div
                className={cn(
                  'w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border transition-colors',
                  i < filledGlasses
                    ? 'bg-blue-500/80 border-blue-400/80'
                    : 'bg-transparent border-border/80',
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-0.5">
          <button
            type="button"
            onClick={() => updateAmount(safeAmount - STEP_ML)}
            className="w-10 h-10 shrink-0 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Menos um gole (250 ml)"
          >
            <Minus className="w-4 h-4 text-muted-foreground" />
          </button>
          <p className="text-xs text-muted-foreground text-center flex-1 leading-snug">{statusLine}</p>
          <button
            type="button"
            onClick={() => updateAmount(safeAmount + STEP_ML)}
            className="w-10 h-10 shrink-0 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center hover:bg-blue-500/25 transition-colors"
            aria-label="Mais um gole (250 ml)"
          >
            <Plus className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}