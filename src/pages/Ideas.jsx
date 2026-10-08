// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Lightbulb, Plus, Trash2, Sparkles, Archive, ArrowRightCircle, Star } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IdeaForm from '@/components/ideas/IdeaForm';
import { fortalezaDateKey } from '@/lib/dates';
import {
  cleanIdeaTitle,
  IDEA_STATUS_LABELS,
  IDEA_STATUSES,
  ideasForWeeklyReview,
} from '@/lib/ideas';
import { toast } from 'sonner';
import { stripQueryParam } from '@/lib/urlDeepLinks';
import { PageHero, StatGrid, StatTile, PraxisBand, PraxisSplit, PraxisListSkeleton, PraxisEmptyState } from '@/components/layout/PraxisPage';

const statusFilterOptions = [
  { value: 'ativas', label: 'Ativas (captura + promissoras)' },
  ...IDEA_STATUSES.map((s) => ({ value: s, label: IDEA_STATUS_LABELS[s] })),
  { value: 'all', label: 'Todas' },
];

export default function Ideas() {
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ativas');
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get('from') === 'capture') {
      setShowIdeaForm(true);
      setSearchParams(stripQueryParam(searchParams, 'from'), { replace: true });
    }
    if (searchParams.get('new') === '1') {
      setShowIdeaForm(true);
      setSearchParams(stripQueryParam(searchParams, 'new'), { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['ideas'],
    queryFn: () => praxisApi.ideas.list(),
  });

  const filteredIdeas = useMemo(() => {
    if (statusFilter === 'all') return ideas;
    if (statusFilter === 'ativas') {
      return ideas.filter((i) => i.idea_status !== 'arquivada' && i.idea_status !== 'virou_tarefa');
    }
    return ideas.filter((i) => (i.idea_status || 'capturada') === statusFilter);
  }, [ideas, statusFilter]);

  const sortedIdeas = useMemo(() => {
    return [...filteredIdeas].sort((a, b) => {
      const aTime = new Date(a.updated_date || a.created_date || 0).getTime();
      const bTime = new Date(b.updated_date || b.created_date || 0).getTime();
      return bTime - aTime;
    });
  }, [filteredIdeas]);

  const weeklyReview = useMemo(() => ideasForWeeklyReview(ideas, 7), [ideas]);

  const invalidateIdeas = () => {
    queryClient.invalidateQueries({ queryKey: ['ideas'] });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardTasks'] });
  };

  const createIdea = useMutation({
    mutationFn: (data) => praxisApi.tasks.create(data),
    onSuccess: () => {
      invalidateIdeas();
      setShowIdeaForm(false);
    },
  });

  const updateIdea = useMutation({
    mutationFn: ({ id, data }) => praxisApi.tasks.update(id, data),
    onSuccess: invalidateIdeas,
  });

  const deleteIdea = useMutation({
    mutationFn: (id) => praxisApi.tasks.delete(id),
    onSuccess: invalidateIdeas,
  });

  const promoteIdea = useMutation({
    mutationFn: (id) => praxisApi.ideas.promoteToTask(id, { date: fortalezaDateKey(), priority: 'medium' }),
    onSuccess: (res) => {
      invalidateIdeas();
      toast.success('Virou tarefa', { description: res?.task?.title ? `"${cleanIdeaTitle(res.task.title)}" está no radar de hoje.` : 'Tarefa criada.' });
    },
    onError: (err) => {
      toast.error('Não deu', { description: err?.message || 'Tente de novo.' });
    },
  });

  const counts = useMemo(() => {
    const c = { capturada: 0, promissora: 0, virou_tarefa: 0, arquivada: 0 };
    ideas.forEach((i) => {
      const s = i.idea_status || 'capturada';
      if (c[s] !== undefined) c[s] += 1;
    });
    return c;
  }, [ideas]);

  return (
    <div className="praxis-page">
      <PageHero
        kicker="Banco de ideias"
        kickerIcon={Lightbulb}
        kickerClassName="text-cyan-300/90"
        title="Ideias"
        description="Guarde sem prazo. Quando fizer sentido, vira tarefa."
        action={(
          <Button onClick={() => setShowIdeaForm(true)} className="h-10 rounded-full px-4">
            <Plus className="mr-1.5 h-4 w-4" /> Nova ideia
          </Button>
        )}
      >
        <StatGrid>
          <StatTile label="Capturadas" value={counts.capturada} tone="cyan" />
          <StatTile label="Promissoras" value={counts.promissora} tone="amber" />
          <StatTile label="Viraram tarefa" value={counts.virou_tarefa} />
          <StatTile label="Arquivadas" value={counts.arquivada} />
        </StatGrid>
      </PageHero>

      <PraxisBand
        kicker="Fila"
        title="Suas ideias"
        trailing={(
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full rounded-full border-white/10 bg-white/[0.03] sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusFilterOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      >
        {isLoading ? (
          <PraxisListSkeleton rows={5} />
        ) : sortedIdeas.length === 0 ? (
          <div className="mx-auto w-full max-w-xl">
            <PraxisEmptyState
              icon={Lightbulb}
              title="Nenhuma ideia neste filtro"
              description="Guarde um pensamento sem data — quando fizer sentido, vira tarefa."
              action={(
                <>
                  <Button type="button" className="rounded-full praxis-touch-target" onClick={() => setShowIdeaForm(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> Nova ideia
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/revisao-semanal">Revisão semanal</Link>
                  </Button>
                </>
              )}
            />
          </div>
        ) : (
          <PraxisSplit
            aside={(
              <>
                <Card className="border-cyan-400/15 bg-cyan-500/5">
                  <CardContent className="space-y-3 p-5">
                    <p className="praxis-kicker-row text-cyan-200/90">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      <span>Revisão desta semana</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Promissoras e capturas dos últimos 7 dias — o que merece virar execução?
                    </p>
                    {weeklyReview.length === 0 ? (
                      <p className="text-sm text-muted-foreground/80">Nada na fila de revisão agora.</p>
                    ) : (
                      <ul className="space-y-2">
                        {weeklyReview.slice(0, 8).map((idea) => (
                          <li key={idea.id} className="text-sm leading-snug">
                            <span className="font-medium text-foreground">{cleanIdeaTitle(idea.title)}</span>
                            <span className="text-muted-foreground"> · {IDEA_STATUS_LABELS[idea.idea_status || 'capturada']}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button asChild variant="outline" size="sm" className="w-full rounded-full">
                      <Link to="/revisao-semanal">Abrir revisão semanal</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-2 p-5 text-sm leading-relaxed text-muted-foreground">
                    <p className="praxis-kicker-row">Dica</p>
                    <p>Ideia não leva hora nem prioridade alta — isso fica na tarefa, quando você decidir.</p>
                  </CardContent>
                </Card>
              </>
            )}
          >
            <div className="space-y-3">
              {sortedIdeas.map((idea) => {
                const status = idea.idea_status || 'capturada';
                const canPromote = status !== 'virou_tarefa' && status !== 'arquivada';
                return (
                  <Card key={idea.id} className="border-border/80 bg-card/90 shadow-sm">
                    <CardContent className="space-y-3 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-base font-medium leading-snug text-foreground">
                            {cleanIdeaTitle(idea.title)}
                          </p>
                          {idea.description && (
                            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                              {idea.description}
                            </p>
                          )}
                          <Badge variant="outline" className="text-xs font-normal">
                            {IDEA_STATUS_LABELS[status] || status}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Excluir esta ideia?')) deleteIdea.mutate(idea.id);
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {canPromote && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {status !== 'promissora' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => updateIdea.mutate({ id: idea.id, data: { idea_status: 'promissora' } })}
                            >
                              <Star className="mr-1 h-3.5 w-3.5" /> Promissora
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full"
                            disabled={promoteIdea.isPending}
                            onClick={() => promoteIdea.mutate(idea.id)}
                          >
                            <ArrowRightCircle className="mr-1 h-3.5 w-3.5" /> Transformar em tarefa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-muted-foreground"
                            onClick={() => updateIdea.mutate({ id: idea.id, data: { idea_status: 'arquivada' } })}
                          >
                            <Archive className="mr-1 h-3.5 w-3.5" /> Arquivar
                          </Button>
                        </div>
                      )}
                      {status === 'virou_tarefa' && (
                        <p className="text-xs text-muted-foreground">Já virou tarefa — veja em Hábitos & Tarefas ou no Dashboard.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </PraxisSplit>
        )}
      </PraxisBand>

      <Dialog open={showIdeaForm} onOpenChange={setShowIdeaForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova ideia</DialogTitle></DialogHeader>
          <IdeaForm onSubmit={(data) => createIdea.mutate(data)} onCancel={() => setShowIdeaForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}