import React, { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pill } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PraxisEmptyState, PraxisListSkeleton } from '@/components/layout/PraxisPage';
import {
  REGIMEN_FREQUENCY_LABELS,
  REGIMEN_KIND_LABELS,
  REGIMEN_TIMING_LABELS,
  REGIMEN_TIMING_ORDER,
} from '@/lib/nutrition';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RegimenDay({ date }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['nutrition', 'regimen', date],
    queryFn: () => praxisApi.nutrition.regimen.day(date),
    enabled: !!date,
    retry: 1,
  });

  const toggleMut = useMutation({
    mutationFn: (id) => praxisApi.nutrition.regimen.toggle(id, { date }),
    onSuccess: (next) => {
      queryClient.setQueryData(['nutrition', 'regimen', date], next);
    },
    onError: () => toast.error('Não deu pra marcar'),
  });

  const groups = useMemo(() => {
    const items = data?.items || [];
    return REGIMEN_TIMING_ORDER.map((timing) => ({
      timing,
      label: REGIMEN_TIMING_LABELS[timing],
      items: items.filter((item) => item.timing === timing),
    })).filter((group) => group.items.length > 0);
  }, [data]);

  if (isLoading && !data) return <PraxisListSkeleton rows={2} />;
  if (isError) {
    return (
      <PraxisEmptyState
        title="Não foi possível carregar a rotina"
        description="Verifique a conexão e tente novamente."
        compact
        action={<Button className="min-h-11 rounded-full" onClick={() => refetch()}>Tentar novamente</Button>}
      />
    );
  }

  const due = data?.due_count ?? 0;
  const taken = data?.taken_count ?? 0;

  return (
    <Card className="border-border/80 bg-card/40 shadow-none">
      <CardContent className="space-y-3 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Pill className="w-4 h-4 text-sky-400/90 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold">Suplementos e remédio</p>
              <p className="text-xs text-muted-foreground">Whey e alimentos continuam no diário</p>
            </div>
          </div>
          {due > 0 ? (
            <p className="text-xs tabular-nums text-muted-foreground shrink-0">
              {taken}/{due}
            </p>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada para marcar hoje.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.timing} className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-1.5">
                  {group.items.map((item) => {
                    const pending = toggleMut.isPending && toggleMut.variables === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggleMut.mutate(item.id)}
                          disabled={pending}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left min-h-11',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            item.taken
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-border/60 bg-secondary/20',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'h-5 w-5 rounded-md border flex items-center justify-center shrink-0 text-[11px]',
                              item.taken
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border bg-background',
                            )}
                          >
                            {item.taken ? '✓' : ''}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{item.name}</span>
                              {item.kind === 'medication' ? (
                                <span className="text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-amber-500/15 text-amber-300">
                                  {REGIMEN_KIND_LABELS.medication}
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">
                              {[item.dose_label, REGIMEN_FREQUENCY_LABELS[item.frequency]]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
