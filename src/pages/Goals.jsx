import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, Target, Trash2, CheckCircle2, Pencil, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import GoalWizard from '@/components/goals/GoalWizard';
import GoalQuickForm from '@/components/goals/GoalQuickForm';
import { computeGoalProgress, goalProgressDetail } from '@/lib/goalProgress';
import { fortalezaDateKey } from '@/lib/dates';
import {
  GOAL_STARTER_TEMPLATES,
  goalPayloadFromStarter,
} from '@/lib/goalStarterTemplates';
import { PageHero, StatGrid, StatTile, PraxisEmptyState } from '@/components/layout/PraxisPage';

const timeframeLabels = { short: 'Curto prazo', medium: 'Médio prazo', long: 'Longo prazo' };
const statusLabels = { active: 'Ativa', paused: 'Pausada', completed: 'Concluída', abandoned: 'Abandonada' };

export default function Goals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showQuick, setShowQuick] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardPreset, setWizardPreset] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const today = fortalezaDateKey();

  const { data: goals = [] } = useQuery({ queryKey: ['allGoals'], queryFn: () => praxisApi.goals.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['goalTasks'], queryFn: () => praxisApi.tasks.list() });
  const { data: habits = [] } = useQuery({ queryKey: ['goalHabits'], queryFn: () => praxisApi.habits.list() });
  const { data: habitLogs = [] } = useQuery({
    queryKey: ['goalHabitLogs', today],
    queryFn: () => praxisApi.habitLogs.list({ from: addDays(today, -6), to: today }),
  });

  const invalidateGoals = () => {
    queryClient.invalidateQueries({ queryKey: ['allGoals'] });
    queryClient.invalidateQueries({ queryKey: ['goalTasks'] });
    queryClient.invalidateQueries({ queryKey: ['goalHabits'] });
  };

  const createGoal = useMutation({
    mutationFn: (data) => praxisApi.goals.create(data),
    onSuccess: (_data, variables) => {
      invalidateGoals();
      setShowWizard(false);
      setShowQuick(false);
      setWizardPreset(null);
      toast.success(variables?.initial_link ? 'Meta e vínculo criados' : 'Meta salva');
    },
    onError: (err) => {
      toast.error('Não deu pra salvar a meta', {
        description: err?.message || 'Tente de novo.',
      });
    },
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }) => praxisApi.goals.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
      if (variables?.data?.title != null || variables?.data?.timeframe != null) {
        setEditingGoal(null);
        toast.success('Meta atualizada');
      }
    },
    onError: (err) => {
      toast.error('Não deu pra atualizar a meta', {
        description: err?.message || 'Tente de novo.',
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => praxisApi.goals.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allGoals'] });
      toast.success('Meta excluída');
    },
    onError: (err) => {
      toast.error('Não deu pra excluir', {
        description: err?.message || 'Tente de novo.',
      });
    },
  });

  const filtered = goals.filter((g) => filter === 'all' || g.timeframe === filter);
  const activeGoals = goals.filter((g) => g.status === 'active');

  useEffect(() => {
    const starter = searchParams.get('starter');
    const payload = starter ? goalPayloadFromStarter(starter) : null;
    if (!payload) return;
    setWizardPreset(payload);
    setShowWizard(true);
    const next = new URLSearchParams(searchParams);
    next.delete('starter');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const completedGoals = goals.filter((g) => g.status === 'completed');
  const averageProgress = goals.length
    ? Math.round(
        goals.reduce((sum, goal) => sum + computeGoalProgress(goal, tasks, habits, habitLogs), 0) / goals.length,
      )
    : 0;

  const openQuick = () => {
    setEditingGoal(null);
    setShowQuick(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setShowQuick(false);
  };

  return (
    <div className="praxis-page">
      <PageHero
        kicker="Metas"
        kickerIcon={Target}
        title="Metas pessoais"
        description="Escreva o que importa — curto, médio ou longo prazo. Prazo e primeiro passo quando quiser."
        action={(
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              onClick={openQuick}
              className="h-11 min-h-11 w-full rounded-full px-4 shadow-lg shadow-primary/20 sm:w-auto"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Escrever meta
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setWizardPreset(null); setShowWizard(true); }}
              className="h-11 min-h-11 w-full rounded-full px-4 sm:w-auto"
            >
              <Wand2 className="mr-1.5 h-4 w-4" /> Criar meta guiada
            </Button>
          </div>
        )}
      >
        <StatGrid className="sm:grid-cols-3 lg:grid-cols-3">
          <StatTile label="Ativas" value={String(activeGoals.length)} valueClassName="tabular-nums" />
          <StatTile label="Progresso médio" value={`${averageProgress}%`} tone="cyan" valueClassName="tabular-nums" />
          <StatTile label="Concluídas" value={String(completedGoals.length)} valueClassName="tabular-nums" />
        </StatGrid>
      </PageHero>

      <section className="praxis-panel rounded-3xl p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'short', 'medium', 'long'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn('min-h-10 rounded-full px-3', filter === f && 'bg-primary')}
            >
              {f === 'all' ? 'Todas' : timeframeLabels[f]}
            </Button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="mx-auto w-full max-w-xl">
          <PraxisEmptyState
            icon={Target}
            title={goals.length === 0 ? 'Nenhuma meta ainda' : 'Nada neste filtro'}
            description={
              goals.length === 0
                ? 'Anote o que quer alcançar — só título e horizonte. Depois você liga tarefa ou hábito se quiser.'
                : 'Troque o filtro ou escreva outra meta.'
            }
            action={(
              <>
                <Button onClick={openQuick} className="min-h-11 rounded-full">
                  <Plus className="mr-1.5 h-4 w-4" /> Escrever meta
                </Button>
                {GOAL_STARTER_TEMPLATES.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    className="min-h-11 rounded-full"
                    onClick={() => {
                      setWizardPreset(goalPayloadFromStarter(t.id));
                      setShowWizard(true);
                    }}
                  >
                    {t.emoji} {t.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => { setWizardPreset(null); setShowWizard(true); }}
                  className="min-h-11 rounded-full"
                >
                  <Wand2 className="mr-1.5 h-4 w-4" /> Meta guiada
                </Button>
              </>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((goal) => {
            const detail = goalProgressDetail(goal, tasks, habits, habitLogs);
            const progress = detail.percent;
            return (
              <Card key={goal.id} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-snug">{goal.title}</CardTitle>
                      {goal.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px]">{timeframeLabels[goal.timeframe]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{statusLabels[goal.status]}</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                        aria-label="Editar meta"
                        onClick={() => openEdit(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {goal.status === 'active' && (
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/10 hover:text-accent"
                          aria-label="Concluir meta"
                          onClick={() => updateGoal.mutate({ id: goal.id, data: { status: 'completed' } })}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Excluir meta"
                        onClick={() => deleteGoal.mutate(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground">
                      Prazo: {format(new Date(`${goal.deadline}T12:00:00`), 'dd/MM/yyyy')}
                    </p>
                  )}
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {detail.tasksLabel || detail.habitsLabel ? 'Progresso (vínculos)' : 'Progresso manual'}
                      </span>
                      <span className="font-medium text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {(detail.tasksLabel || detail.habitsLabel) && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {[detail.tasksLabel, detail.habitsLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Ajuste manual (opcional)</p>
                    <Slider
                      value={[goal.manual_progress || 0]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => updateGoal.mutate({ id: goal.id, data: { manual_progress: v } })}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cadastro rápido */}
      <Dialog open={showQuick} onOpenChange={(v) => { setShowQuick(v); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Escrever meta</DialogTitle>
          </DialogHeader>
          <GoalQuickForm
            busy={createGoal.isPending}
            submitLabel="Salvar meta"
            onCancel={() => setShowQuick(false)}
            onSubmit={(payload) => createGoal.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      {/* Editar meta existente */}
      <Dialog open={Boolean(editingGoal)} onOpenChange={(v) => { if (!v) setEditingGoal(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
          </DialogHeader>
          {editingGoal ? (
            <GoalQuickForm
              key={editingGoal.id}
              initial={editingGoal}
              busy={updateGoal.isPending}
              submitLabel="Salvar alterações"
              onCancel={() => setEditingGoal(null)}
              onSubmit={(payload) => updateGoal.mutate({ id: editingGoal.id, data: payload })}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Wizard guiado (preservado) */}
      <Dialog open={showWizard} onOpenChange={(v) => { setShowWizard(v); if (!v) setWizardPreset(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova meta guiada</DialogTitle>
          </DialogHeader>
          <GoalWizard
            busy={createGoal.isPending}
            preset={wizardPreset}
            onCancel={() => { setShowWizard(false); setWizardPreset(null); }}
            onSubmit={(payload) => createGoal.mutate(payload)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
