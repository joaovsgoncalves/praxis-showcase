import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { fortalezaDateKey } from '@/lib/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_DOT = {
  high: 'bg-destructive',
  medium: 'bg-amber-500',
  low: 'bg-muted-foreground/40',
};

export default function AvoidanceWidget() {
  const today = fortalezaDateKey();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['avoidance', today],
    queryFn: () => praxisApi.insights.avoidance({ date: today }),
    staleTime: 60_000,
  });

  const praxiaMutation = useMutation({
    mutationFn: () => praxisApi.praxia.confront({ date: today }),
  });

  const items = data?.items ?? [];

  if (!isLoading && !isError && (data?.total_count ?? items.length) === 0) {
    return null;
  }

  return (
    <Card className="border-border/80 bg-card/40">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              O que estou evitando?
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? 'Lendo seus padrões com PraxIA…' : data?.headline}
            </p>
          </div>
          {data?.total_count > 0 && (
            <Badge variant="outline" className="shrink-0 tabular-nums font-normal">
              {items.length}
              {data.total_count > items.length ? ` de ${data.total_count}` : ''}{' '}
              {data.total_count === 1 ? 'item' : 'itens'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={
                    item.entity_id && item.type === 'task'
                      ? `/habitos-tarefas?tab=tasks&scope=overdue`
                      : item.action?.href || '/'
                  }
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/30 p-3 transition-colors hover:bg-card/50"
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      SEVERITY_DOT[item.severity] || SEVERITY_DOT.low,
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-50 mt-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && items.length === 0 && !isError && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nada pesando no radar. Se algo incomoda, grave na captura.
          </p>
        )}

        <div className="border-t border-border/60 pt-4 space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={praxiaMutation.isPending || isLoading}
            onClick={() => praxiaMutation.mutate()}
          >
            {praxiaMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-primary/80" />
            )}
            PraxIA — olhar o padrão
          </Button>

          {praxiaMutation.data?.lines?.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-card/30 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">PraxIA</p>
              {praxiaMutation.data.lines.map((line, i) => (
                <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                  {line}
                </p>
              ))}
              {praxiaMutation.data.source === 'llm' && (
                <p className="text-[10px] text-muted-foreground">Interpretação com IA · você decide o que fazer</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}