import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet, ArrowRight } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBrl, formatDay } from '@/lib/finance';

export default function TodayFinanceCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance', 'overview'],
    queryFn: () => praxisApi.finance.overview(),
    retry: 1,
    staleTime: 30_000,
  });

  const nextDue = data?.next_due;
  const label = isLoading
    ? '…'
    : isError
      ? '—'
      : formatBrl(data?.caixa);

  return (
    <Card className="praxis-dashboard-card praxis-context-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Finanças</p>
              <h3 className="praxis-title mt-0.5 text-base font-semibold tracking-[-0.025em]">Caixa {label}</h3>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {isError
            ? 'Não deu para carregar o caixa agora.'
            : nextDue
              ? `Vence: ${nextDue.title} ${formatDay(nextDue.due_date)} · ${formatBrl(nextDue.amount)}`
              : data?.next_step?.label || 'Abrir o mapa do mês.'}
        </p>
        <div className="flex items-center border-t border-white/[0.05] pt-3">
          <Button asChild size="sm" variant="ghost" className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground">
            <Link to="/financas">
              Abrir Finanças
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
