import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHero, PraxisListSkeleton, PraxisEmptyState } from '@/components/layout/PraxisPage';
import { Inbox, Mic, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { humanizeCaptureError, humanizeStoredCaptureError } from '@/lib/captureErrorMessage';
import { cn } from '@/lib/utils';

const STATUS_LABELS = {
  failed: { label: 'Falhou', variant: 'destructive' },
  transcribed: { label: 'Transcrito', variant: 'secondary' },
  parsed: { label: 'Revisar itens', variant: 'default' },
  processing: { label: 'Transcrevendo', variant: 'outline' },
  pending: { label: 'Na fila', variant: 'outline' },
};

const SOURCE_LABELS = {
  voice: 'Voz',
  text: 'Texto',
  share: 'Compartilhar',
  telegram: 'Telegram',
  app: 'App',
};

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'dd/MM HH:mm', { locale: ptBR });
  } catch {
    return iso;
  }
}

export default function CaptureInbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: captures = [], isLoading } = useQuery({
    queryKey: ['captures', 'inbox'],
    queryFn: () => praxisApi.captures.list({ status: 'failed,transcribed,parsed', limit: 40 }),
    refetchInterval: 20_000,
  });

  const retryMutation = useMutation({
    mutationFn: (id) => praxisApi.captures.retry(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['captures'] });
      toast('Transcrição OK', { description: 'Abrindo revisão dos itens.' });
      if (data?.text) {
        navigate(`/captura?capture=${id}`);
      }
    },
    onError: (error) => {
      const { title, detail } = humanizeCaptureError({
        status: error.status,
        body: error.body || {},
        message: error.message,
      });
      toast.error(title, { description: detail });
      queryClient.invalidateQueries({ queryKey: ['captures'] });
    },
  });

  return (
    <div className="praxis-page max-w-2xl">
      <PageHero
        kicker="Capturas"
        kickerIcon={Inbox}
        title="Revisar capturas"
        description="Áudios no servidor. Se a transcrição falhar, use Tentar de novo — sem gravar de novo."
        action={(
          <Button asChild variant="outline" size="sm" className="praxis-touch-target rounded-full">
            <Link to="/captura">
              <Mic className="w-4 h-4 mr-1" />
              Nova gravação
            </Link>
          </Button>
        )}
      />

      <Link to="/captura" className="sr-only">Voltar à captura</Link>

      {isLoading && <PraxisListSkeleton rows={4} />}

      {!isLoading && captures.length === 0 && (
        <PraxisEmptyState
          icon={Inbox}
          title="Fila zerada"
          description="Nenhuma captura pendente. Grave algo por voz quando surgir."
          action={(
            <Button asChild className="rounded-full praxis-touch-target">
              <Link to="/captura">
                <Mic className="mr-1.5 h-4 w-4" /> Nova captura
              </Link>
            </Button>
          )}
        />
      )}

      <div className="space-y-3">
        {captures.map((cap) => {
          const meta = STATUS_LABELS[cap.status] || STATUS_LABELS.pending;
          const preview = cap.transcript
            ? `${cap.transcript.slice(0, 120)}${cap.transcript.length > 120 ? '…' : ''}`
            : 'Sem transcrição ainda';
          const failDetail = cap.status === 'failed' ? humanizeStoredCaptureError(cap.error_message) : null;

          return (
            <Card key={cap.id} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={meta.variant === 'destructive' ? 'destructive' : 'outline'}>
                    {meta.label}
                  </Badge>
                  {cap.source && cap.source !== 'voice' && (
                    <Badge variant="secondary" className="text-[10px]">
                      {SOURCE_LABELS[cap.source] || cap.source}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{formatWhen(cap.updated_date || cap.created_date)}</span>
                </div>
                <p className="text-sm italic text-muted-foreground">&quot;{preview}&quot;</p>
                {failDetail && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive space-y-1">
                    <p className="font-medium">Por que falhou</p>
                    <p>{failDetail}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {cap.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="praxis-touch-target"
                      disabled={retryMutation.isPending}
                      onClick={() => retryMutation.mutate(cap.id)}
                    >
                      <RefreshCw className={cn('w-4 h-4 mr-1', retryMutation.isPending && 'animate-spin')} />
                      Tentar de novo
                    </Button>
                  )}
                  {(cap.status === 'transcribed' || cap.status === 'parsed') && cap.transcript && (
                    <Button size="sm" className="praxis-touch-target" onClick={() => navigate(`/captura?capture=${cap.id}`)}>
                      Continuar revisão
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}