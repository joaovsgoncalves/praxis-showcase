import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PraxisEmptyState, PraxisListSkeleton } from '@/components/layout/PraxisPage';
import MacroBars from '@/components/nutrition/MacroBars';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toYmd(dt);
}

function mondayOfYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + diff);
  return toYmd(dt);
}

function formatRange(from, to) {
  const f = from.split('-');
  const t = to.split('-');
  return `${f[2]}/${f[1]} – ${t[2]}/${t[1]}/${t[0]}`;
}

const RANGES = [
  { id: '7', label: '7 dias', days: 7 },
  { id: '14', label: '14 dias', days: 14 },
  { id: 'week', label: 'Semana' },
  { id: '30', label: '30 dias', days: 30 },
];

/**
 * Histórico de macros (fase 9) — médias + lista de dias com log.
 * onOpenDay(date) opcional pra voltar ao diário.
 */
export default function NutritionHistory({ onOpenDay }) {
  const today = toYmd(new Date());
  const [rangeId, setRangeId] = useState('14');
  const [weekStart, setWeekStart] = useState(() => mondayOfYmd(today));

  const { from, to } = useMemo(() => {
    if (rangeId === 'week') {
      return { from: weekStart, to: addDaysYmd(weekStart, 6) };
    }
    const days = RANGES.find((r) => r.id === rangeId)?.days || 14;
    return { from: addDaysYmd(today, -(days - 1)), to: today };
  }, [rangeId, weekStart, today]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['nutrition', 'summary', from, to],
    queryFn: () => praxisApi.nutrition.summary({ from, to }),
    retry: 1,
  });

  const daysWithLog = useMemo(
    () => (data?.days || []).filter((d) => d.has_log).slice().reverse(),
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            type="button"
            size="sm"
            variant={rangeId === r.id ? 'default' : 'outline'}
            className="rounded-full h-8 text-xs"
            onClick={() => setRangeId(r.id)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {rangeId === 'week' ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full"
            onClick={() => setWeekStart((w) => addDaysYmd(w, -7))}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatRange(from, to)}
          </p>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full"
            onClick={() => setWeekStart((w) => addDaysYmd(w, 7))}
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground tabular-nums text-center">
          {formatRange(from, to)}
        </p>
      )}

      {isLoading ? (
        <PraxisListSkeleton rows={3} />
      ) : isError ? (
        <PraxisEmptyState
          title="Não carregou o histórico"
          description="Verifique a conexão e tente novamente."
        />
      ) : !data || data.days_logged === 0 ? (
        <PraxisEmptyState
          title="Sem registros neste período"
          description="Loga refeições no Diário pra ver médias e tendência."
        />
      ) : (
        <>
          <Card className="border-border/80 bg-card/40 shadow-none">
            <CardContent className="px-4 py-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Média nos dias com log</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatKcal(data.averages?.kcal)}
                  {data.targets?.kcal != null ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {' '}
                      / meta {formatKcal(data.targets.kcal)}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  {data.days_logged} {data.days_logged === 1 ? 'dia' : 'dias'} com comida · {data.log_count} {data.log_count === 1 ? 'item' : 'itens'}
                  {data.days_hit_protein != null
                    ? ` · proteína ≥90% meta em ${data.days_hit_protein} dia(s)`
                    : ''}
                </p>
              </div>
              <MacroBars
                totals={{
                  kcal: data.averages?.kcal ?? 0,
                  protein_g: data.averages?.protein_g ?? 0,
                  carbs_g: data.averages?.carbs_g ?? 0,
                  fat_g: data.averages?.fat_g ?? 0,
                }}
                targets={data.targets || {}}
                variant="full"
              />
            </CardContent>
          </Card>

          {data.top_foods?.length > 0 ? (
            <Card className="border-border/80 bg-card/40 shadow-none">
              <CardContent className="px-4 py-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Mais registrados</p>
                <ul className="space-y-1">
                  {data.top_foods.map((f) => (
                    <li
                      key={f.name}
                      className="flex justify-between gap-2 text-sm tabular-nums"
                    >
                      <span className="truncate text-foreground">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">{f.count}×</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Dias com log</p>
            <ul className="space-y-2">
              {daysWithLog.map((d) => (
                <li key={d.date}>
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left rounded-xl border border-border/60 bg-card/30 px-3 py-2.5',
                      'hover:bg-secondary/30 transition-colors',
                    )}
                    onClick={() => onOpenDay?.(d.date)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium tabular-nums">{d.date}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {d.log_count} {d.log_count === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {formatKcal(d.totals?.kcal)} · P {formatGrams(d.totals?.protein_g)} · C{' '}
                      {formatGrams(d.totals?.carbs_g)} · G {formatGrams(d.totals?.fat_g)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
