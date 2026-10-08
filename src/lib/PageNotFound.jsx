import { Link, useLocation } from 'react-router-dom';
import { Hammer, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PraxisCenteredShell } from '@/components/layout/PraxisPage';

export default function PageNotFound() {
  const location = useLocation();
  const path = location.pathname || '/';

  return (
    <PraxisCenteredShell maxWidth="max-w-lg">
      <Card className="glass-surface border-white/10">
        <CardContent className="p-8 sm:p-10 text-center space-y-6">
          <p className="praxis-kicker text-muted-foreground">Praxis</p>
          <p className="text-6xl font-light tabular-nums text-muted-foreground/40" aria-hidden>
            404
          </p>
          <div className="space-y-2">
            <h1 className="praxis-title text-2xl font-bold">Página não encontrada</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Não existe rota para{' '}
              <span className="font-mono text-xs text-foreground/90 break-all">{path}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-2">
            <Button asChild className="rounded-full praxis-touch-target gap-2">
              <Link to="/">
                <Home className="h-4 w-4" aria-hidden />
                Ir para o Hoje
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full praxis-touch-target gap-2">
              <Link to="/captura">
                <Hammer className="h-4 w-4" aria-hidden />
                Captura
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PraxisCenteredShell>
  );
}