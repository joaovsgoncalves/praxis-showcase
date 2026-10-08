import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Poll pending-count no Hoje — badge + toast quando fila cresce (STT terminou ou falhou).
 */
export default function CapturePendingBanner() {
  const prevCount = useRef(null);

  const { data } = useQuery({
    queryKey: ['captures', 'pending-count'],
    queryFn: () => praxisApi.captures.pendingCount(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const count = data?.count ?? 0;

  useEffect(() => {
    if (prevCount.current === null) {
      prevCount.current = count;
      return;
    }
    if (count > prevCount.current) {
      const delta = count - prevCount.current;
      toast.success(delta === 1 ? 'Captura pronta para revisar' : `${delta} capturas na fila`, { description: 'Abra Revisar capturas para ver transcrição ou tentar de novo.' });
    }
    prevCount.current = count;
  }, [count]);

  if (count <= 0) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <Inbox className="w-4 h-4 text-primary shrink-0" />
        <span>
          <strong>{count}</strong> {count === 1 ? 'captura na fila' : 'capturas na fila'}
        </span>
      </div>
      <Button asChild size="sm" variant="secondary" className="praxis-touch-target">
        <Link to="/capturas">Abrir fila</Link>
      </Button>
    </div>
  );
}