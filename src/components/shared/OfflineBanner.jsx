import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi, getStaleState, subscribeStaleState } from '@/api/praxisClient';
import { WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mounted once in AppLayout, so any screen served from the offline cache warns
// the user instead of showing yesterday's numbers as if they were fresh.
// Two signals: the client telling us it fell back to cache (__stale), and the
// health endpoint / navigator saying the backend is unreachable.
export default function OfflineBanner() {
  const [navigatorOnline, setNavigatorOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [stale, setStale] = useState(() => getStaleState());

  useEffect(() => {
    const onChange = () => setNavigatorOnline(navigator.onLine);
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    return () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
    };
  }, []);

  useEffect(() => subscribeStaleState(setStale), []);

  const { isError, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    queryFn: () => praxisApi.health(),
    refetchInterval: 60_000,
    retry: 0,
    staleTime: 30_000,
  });

  const isDown = !navigatorOnline || isError || stale.stale;
  if (!isDown) return null;

  const syncedAt = stale.cachedAt || dataUpdatedAt || null;
  const lastSync = syncedAt
    ? formatDistanceToNow(syncedAt, { locale: ptBR, addSuffix: true })
    : null;

  const message = !navigatorOnline
    ? 'Você está offline — mostrando a última cópia local.'
    : stale.stale
      ? 'Sem resposta do servidor — estes dados são de uma cópia salva, não do que está lá agora.'
      : 'API indisponível — mostrando dados em cache.';

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {lastSync && <span className="shrink-0 opacity-70">salvo {lastSync}</span>}
    </div>
  );
}
