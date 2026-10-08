import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Share2, Mic } from 'lucide-react';
import { PageHero } from '@/components/layout/PraxisPage';

function buildSharedText({ title, text, url }) {
  const parts = [];
  if (text?.trim()) parts.push(text.trim());
  if (title?.trim() && title.trim() !== text?.trim()) parts.push(title.trim());
  if (url?.trim()) parts.push(url.trim());
  return parts.join('\n').trim();
}

export default function ShareCapture() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState('');

  const payload = useMemo(
    () =>
      buildSharedText({
        title: searchParams.get('title') || '',
        text: searchParams.get('text') || '',
        url: searchParams.get('url') || '',
      }),
    [searchParams],
  );

  useEffect(() => {
    if (started.current) return;
    if (!payload || payload.length < 2) {
      setError('Nada para capturar. Compartilhe um texto ou link de outro app.');
      return;
    }
    started.current = true;
    (async () => {
      try {
        const res = await praxisApi.captures.createText(payload, 'share');
        navigate(`/captura?capture=${res.capture_id}`, { replace: true });
      } catch (e) {
        setError(e?.message || 'Falha ao enfileirar. Tente de novo.');
        started.current = false;
      }
    })();
  }, [payload, navigate]);

  return (
    <div className="praxis-page mx-auto max-w-lg">
      <PageHero
        kicker="Captura"
        kickerIcon={Share2}
        title="Compartilhamento"
        description="O Praxis organiza o que você mandou de outro app em tarefas e ideias."
      />

      <Card className="mt-6 border-border/80 bg-card/60">
        <CardContent className="py-12 px-6 text-center space-y-5">
          <Share2 className="mx-auto h-10 w-10 text-primary" aria-hidden />

          {error ? (
            <>
              <Alert variant="destructive" className="text-left">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild variant="default" className="rounded-full praxis-touch-target">
                  <Link to="/captura">
                    <Mic className="mr-2 h-4 w-4" /> Ir para captura
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full praxis-touch-target">
                  <Link to="/">Voltar ao Hoje</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="praxis-title text-lg font-semibold">Enviando para o Praxis…</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Organizando a partir do que você compartilhou.
              </p>
              {payload ? (
                <p className="text-xs text-muted-foreground/80 line-clamp-3 max-w-sm mx-auto border-t border-border/40 pt-4">
                  {payload}
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}