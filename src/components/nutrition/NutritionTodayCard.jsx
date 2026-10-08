import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UtensilsCrossed, Plus, ArrowRight } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MacroBars from '@/components/nutrition/MacroBars';
import { formatKcal, isNutritionShowOnToday } from '@/lib/nutrition';

/** Resumo compacto de macros no Hoje. */
export default function NutritionTodayCard() {
  const { data: settings } = useQuery({
    queryKey: ['me'],
    queryFn: () => praxisApi.user.getSettings(),
    staleTime: 60_000,
  });

  const show = isNutritionShowOnToday(settings);

  const { data: day, isLoading, isError } = useQuery({
    queryKey: ['nutrition', 'day', 'today'],
    queryFn: () => praxisApi.nutrition.day(),
    enabled: show,
    retry: 1,
    staleTime: 30_000,
  });

  if (!show) return null;

  const totals = day?.totals || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const targets = day?.targets || {};
  const hasTarget = targets.kcal != null;
  const empty = !isLoading && !isError && (day?.logs?.length ?? 0) === 0;
  const caloriesLabel = isLoading
    ? '…'
    : isError
      ? '—'
      : hasTarget
        ? `${Math.round(totals.kcal || 0).toLocaleString('pt-BR')} / ${Math.round(targets.kcal).toLocaleString('pt-BR')} kcal`
        : formatKcal(totals.kcal);

  return (
    <Card className="praxis-dashboard-card praxis-context-card">
      <CardContent className="space-y-4 p-5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-domain-wellness/15 bg-domain-wellness/[0.07]">
              <UtensilsCrossed className="h-4 w-4 text-domain-wellness" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Nutrição</p>
              <h3 className="praxis-title mt-0.5 text-base font-semibold tracking-[-0.025em]">Macros do dia</h3>
            </div>
          </div>
          <span className="shrink-0 pt-1 text-[11px] tabular-nums text-muted-foreground">{caloriesLabel}</span>
        </div>

        {isError ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Não deu para carregar os macros agora.
          </p>
        ) : empty && !hasTarget ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ainda sem registros. Defina a meta e adicione refeições em Nutrição.
          </p>
        ) : empty && hasTarget ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ainda sem comida registrada hoje — meta {formatKcal(targets.kcal)}.
          </p>
        ) : (
          <MacroBars totals={totals} targets={targets} variant="compact" />
        )}

        <div className="flex items-center gap-2 border-t border-white/[0.05] pt-3">
          <Button asChild size="sm" className="h-9 flex-1 rounded-full bg-domain-wellness/90 text-black hover:bg-domain-wellness">
            <Link to="/jota-fit/nutricao">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Comida
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground">
            <Link to="/jota-fit/nutricao">
              Diário
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
