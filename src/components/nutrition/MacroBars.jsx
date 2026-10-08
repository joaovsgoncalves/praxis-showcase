import { cn } from '@/lib/utils';
import { formatGrams, formatKcal } from '@/lib/nutrition';

const ROWS = [
  {
    key: 'kcal',
    label: 'Calorias',
    short: 'kcal',
    barClass: 'bg-primary',
    format: (n) => formatKcal(n),
  },
  {
    key: 'protein_g',
    label: 'Proteína',
    short: 'P',
    barClass: 'bg-blue-500/80',
    format: (n) => formatGrams(n),
  },
  {
    key: 'carbs_g',
    label: 'Carbo',
    short: 'C',
    barClass: 'bg-amber-500/80',
    format: (n) => formatGrams(n),
  },
  {
    key: 'fat_g',
    label: 'Gordura',
    short: 'G',
    barClass: 'bg-violet-500/80',
    format: (n) => formatGrams(n),
  },
];

function pct(used, target) {
  const t = Number(target);
  if (!t || t <= 0) return 0;
  return Math.min(100, Math.max(0, ((Number(used) || 0) / t) * 100));
}

/**
 * Barras de kcal + P/C/G.
 * Coluna de valores com largura mínima pra alinhar o eixo direito.
 * @param {'full'|'compact'} variant
 */
export default function MacroBars({
  totals = {},
  targets = {},
  variant = 'full',
  className,
}) {
  const compact = variant === 'compact';

  return (
    <div
      className={cn('space-y-2.5', compact && 'space-y-2', className)}
      role="group"
      aria-label="Progresso de macros do dia"
    >
      {ROWS.map((row) => {
        const used = totals[row.key] ?? 0;
        const target = targets[row.key];
        const hasTarget = target != null && Number(target) > 0;
        const p = hasTarget ? pct(used, target) : 0;
        const over = hasTarget && Number(used) > Number(target) * 1.02;
        const usedLabel = row.format(used);
        const targetLabel = hasTarget ? row.format(target) : null;
        const valueText = hasTarget
          ? `${usedLabel} de ${targetLabel}${over ? ', acima da meta' : ''}`
          : usedLabel;

        return (
          <div key={row.key} className="space-y-1">
            <div className="grid grid-cols-[minmax(4.5rem,auto)_1fr] items-baseline gap-x-3 text-xs">
              <span
                className={cn(
                  'text-muted-foreground shrink-0',
                  compact && 'w-7',
                )}
                id={`macro-label-${row.key}`}
              >
                {compact ? row.short : row.label}
              </span>
              <span className="min-w-0 justify-self-end text-right tabular-nums">
                <span
                  className={cn(
                    'font-medium',
                    over ? 'text-amber-400' : 'text-foreground',
                  )}
                >
                  {usedLabel}
                </span>
                {hasTarget ? (
                  <span className="text-muted-foreground"> / {targetLabel}</span>
                ) : null}
              </span>
            </div>
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-full bg-secondary/60',
                compact ? 'h-1.5' : 'h-2',
                over && 'ring-1 ring-inset ring-amber-400/35',
              )}
              role="progressbar"
              aria-valuenow={Math.round(Number(used) || 0)}
              aria-valuemin={0}
              aria-valuemax={hasTarget ? Math.round(Number(target)) : 100}
              aria-valuetext={valueText}
              aria-labelledby={`macro-label-${row.key}`}
            >
              <div
                className={cn(
                  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out',
                  'motion-reduce:transition-none',
                  row.barClass,
                  over && 'opacity-95',
                  !hasTarget && Number(used) > 0 && 'w-full opacity-40',
                )}
                style={{
                  width: hasTarget
                    ? `${p}%`
                    : Number(used) > 0
                      ? '100%'
                      : '0%',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
