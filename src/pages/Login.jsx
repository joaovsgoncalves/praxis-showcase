import React, { useState } from 'react';
import { Hammer, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { praxisApi } from '@/api/praxisClient';
import { PraxisCenteredShell } from '@/components/layout/PraxisPage';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const pwd = password.trim();
    if (!pwd) return;
    setLoading(true);
    try {
      const session = await praxisApi.auth.login(pwd);
      onSuccess?.(session);
    } catch (err) {
      const msg = err?.message || '';
      const status = err?.status;
      if (msg.includes('503') || status === 503) {
        setError('Login ainda não configurado no servidor. Defina PRAXIS_APP_PASSWORD na VPS.');
      } else if (msg.includes('401') || status === 401) {
        setError('Senha incorreta. Confere maiúsculas, símbolos e tenta de novo.');
      } else if (msg.includes('429') || status === 429) {
        setError('Muitas tentativas — espera uns 15 min e tenta de novo.');
      } else {
        setError('Não foi possível entrar. Tenta de novo ou abre em aba anônima.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PraxisCenteredShell>
      <Card className="glass-surface border-white/10 shadow-xl shadow-black/20">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-domain-gold/30 bg-domain-gold/10">
              <Hammer className="h-7 w-7 text-domain-gold" aria-hidden />
            </div>
            <p className="praxis-kicker text-primary">Praxis</p>
            <h1 className="praxis-title text-2xl font-bold">Entrar</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Uso pessoal — a senha fica só no servidor, não no navegador.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="pl-10 praxis-touch-target"
                />
              </div>
            </div>

            {error ? (
              <Alert variant="destructive" className="text-left">
                <AlertDescription role="alert">{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="w-full rounded-full praxis-touch-target"
              disabled={loading || !password.trim()}
            >
              {loading ? 'Entrando…' : 'Entrar no Praxis'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PraxisCenteredShell>
  );
}