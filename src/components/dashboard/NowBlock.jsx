import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/lib/categories';
import { formatTaskTimeLabel, isTaskOverdue } from '@/lib/nowTask';
import { Timer, CheckCircle2, Clock, AlertTriangle, Plus, Flame } from 'lucide-react';

export default function NowBlock({
  task,
  today,
  busy = false,
  onComplete,
  onSnooze15,
  onSnoozeTomorrow,
  onAddTask,
}) {
  if (!task) {
      return (
        <Card className="praxis-now-card praxis-tactile-card relative overflow-hidden border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),hsl(var(--card)/0.92)_52%,rgba(245,158,11,0.03))]">
                {/* Empty state: soft edge wash only — no big mid-card orb */}
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 bg-[radial-gradient(circle,rgba(245,158,11,0.08),transparent_70%)] opacity-70"
                  aria-hidden
                />
                <CardContent className="relative p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.7)]" aria-hidden />
                    Agora
                  </div>
                <h2 className="praxis-title mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-3xl">
                  Nada urgente na fila.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Bom momento para capturar o que está na cabeça ou criar o próximo passo de forma consciente.
                </p>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    className="praxis-touch-target praxis-glow-ember w-full gap-2 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 sm:w-auto"
                    onClick={onAddTask}
                  >
                    <Plus className="h-4 w-4" /> Nova tarefa
                  </Button>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Também dá para abrir o{' '}
                  <Link to="/foco" className="font-medium text-amber-200/90 underline-offset-4 hover:text-amber-100 hover:underline">
                    Modo foco
                  </Link>{' '}
                  ou registrar uma{' '}
                  <Link to="/ideias?new=1" className="font-medium text-amber-200/90 underline-offset-4 hover:text-amber-100 hover:underline">
                    ideia
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
    );
  }

  const overdue = isTaskOverdue(task, today);
  const timeLabel = formatTaskTimeLabel(task);

  return (
      <Card className="praxis-now-card group relative overflow-hidden border-domain-gold/18 bg-[linear-gradient(135deg,hsl(var(--domain-gold)/0.08),hsl(var(--card)/0.84)_50%,hsl(var(--primary)/0.05))]">
        {/* Anchored behind title block — supports hierarchy, not a random blob */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-40 w-56 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--domain-gold)/0.10),transparent_68%)] opacity-90 transition-opacity duration-500 group-hover:opacity-100 sm:h-48 sm:w-72"
          aria-hidden
        />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl flex-1">
              <div className="flex items-center gap-2 text-xs font-medium text-domain-gold">
                <span className="praxis-now-pulse relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-domain-gold/35" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-domain-gold" />
                </span>
                Agora
              </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {overdue ? (
                <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/[0.08] text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Atrasada
                </Badge>
              ) : null}
              {timeLabel ? (
                <Badge variant="outline" className="gap-1 border-white/[0.07] bg-white/[0.03] text-foreground/75">
                  <Clock className="h-3 w-3" /> {timeLabel}
                </Badge>
              ) : null}
              {task.priority === 'high' ? (
                <Badge className="border border-destructive/15 bg-destructive/10 text-xs text-destructive shadow-none">Prioridade alta</Badge>
              ) : null}
              <CategoryBadge category={task.category} />
            </div>

            <h2 className="praxis-title mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.055em] sm:text-4xl">
              {task.title}
            </h2>
            {task.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{task.description}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Uma coisa de cada vez.</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-[360px] lg:justify-end">
            <Button asChild className="praxis-touch-target w-full gap-2 rounded-full bg-domain-gold px-5 text-black hover:bg-domain-gold/90 sm:w-auto">
              <Link to={`/foco?taskId=${encodeURIComponent(task.id)}`}>
                <Timer className="h-4 w-4" /> Começar foco
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="praxis-touch-target w-full gap-2 rounded-full border border-domain-wellness/15 bg-domain-wellness/[0.08] text-domain-wellness hover:bg-domain-wellness/[0.13] sm:w-auto"
              disabled={busy}
              onClick={() => onComplete?.(task)}
            >
              <CheckCircle2 className="h-4 w-4" /> Concluir
            </Button>
            <div className="flex gap-2 sm:basis-full sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="praxis-touch-target flex-1 rounded-full px-3 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground sm:flex-none"
                disabled={busy}
                onClick={() => onSnooze15?.(task)}
              >
                +15 min
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="praxis-touch-target flex-1 rounded-full px-3 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground sm:flex-none"
                disabled={busy}
                onClick={() => onSnoozeTomorrow?.(task)}
              >
                Amanhã
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-white/[0.055] pt-4 text-[11px] text-muted-foreground/70">
          <Flame className="h-3.5 w-3.5 text-domain-gold/80" aria-hidden />
          O próximo passo fica visível até sair do caminho.
        </div>
      </CardContent>
    </Card>
  );
}
