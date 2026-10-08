import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, ChevronLeft, ChevronRight, Save, Trash2, BarChart3, Wand2, ListChecks, UtensilsCrossed, History, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { pickWeeklyTaskTitles, taskDatesForNextWeek } from '@/lib/weeklyReviewTasks';
import { PageHero } from '@/components/layout/PraxisPage';
import { Skeleton } from '@/components/ui/skeleton';

const SCORE_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Difícil' },
  { value: 2, emoji: '😕', label: 'Abaixo' },
  { value: 3, emoji: '😐', label: 'Mediano' },
  { value: 4, emoji: '🙂', label: 'Bom' },
  { value: 5, emoji: '🤩', label: 'Excelente' },
];

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

const empty = {
  highlights: '',
  blockers: '',
  learnings: '',
  next_week_focus: '',
  overall_score: 3,
};

const AREA_LABELS = {
  rca: 'RCA / trabalho',
  faculdade: 'Faculdade',
  saude: 'Saúde / treino',
  gofluxo: 'GoFluxo',
  animalia: 'Animália',
  projetos: 'Projetos',
  'vida-pratica': 'Vida prática',
};

function areaLabel(area) {
  return AREA_LABELS[area] || area;
}

function formatDateShort(ymd) {
  try {
    return format(new Date(`${ymd}T12:00:00`), 'dd MMM', { locale: ptBR });
  } catch {
    return ymd;
  }
}

export default function WeeklyReview() {
  const queryClient = useQueryClient();
  const [weekDate, setWeekDate] = useState(() => mondayOf(new Date()));
  const weekStart = format(weekDate, 'yyyy-MM-dd');
  const weekEnd = format(addDays(weekDate, 6), 'yyyy-MM-dd');

  const { data: current } = useQuery({
    queryKey: ['weeklyReviewCurrent', weekStart],
    queryFn: () => praxisApi.weeklyReviews.current(weekStart),
  });

  const { data: auto, isLoading: autoLoading } = useQuery({
    queryKey: ['weeklyInsights', weekStart],
    queryFn: () => praxisApi.insights.weekly(weekStart),
  });

  // fallback se insights antigo não trouxer nutrition (API desatualizada)
  const { data: nutritionSummary } = useQuery({
    queryKey: ['nutrition', 'summary', weekStart, weekEnd],
    queryFn: () => praxisApi.nutrition.summary({ from: weekStart, to: weekEnd }),
    enabled: !autoLoading && !!weekStart && !auto?.nutrition,
    retry: 1,
  });
  const nutrition = auto?.nutrition || (nutritionSummary
    ? {
        days_logged: nutritionSummary.days_logged,
        log_count: nutritionSummary.log_count,
        averages: nutritionSummary.averages,
        targets: nutritionSummary.targets,
        days_hit_protein: nutritionSummary.days_hit_protein,
        top_foods: nutritionSummary.top_foods?.slice(0, 5) || [],
      }
    : null);

  const { data: history = [] } = useQuery({
    queryKey: ['weeklyReviewHistory'],
    queryFn: () => praxisApi.weeklyReviews.list(8),
  });

  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (current?.review) {
      setForm({
        highlights: current.review.highlights || '',
        blockers: current.review.blockers || '',
        learnings: current.review.learnings || '',
        next_week_focus: current.review.next_week_focus || '',
        overall_score: current.review.overall_score || 3,
      });
    } else {
      setForm(empty);
    }
  }, [current]);

  const saveMutation = useMutation({
    mutationFn: () => praxisApi.weeklyReviews.save({ ...form, week_start: weekStart }),
    onSuccess: () => {
      toast.success('Revisão salva');
      queryClient.invalidateQueries({ queryKey: ['weeklyReviewCurrent'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyReviewHistory'] });
    },
    onError: () => toast.error('Falha ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => praxisApi.weeklyReviews.delete(id),
    onSuccess: () => {
      toast.success('Revisão removida');
      queryClient.invalidateQueries({ queryKey: ['weeklyReviewCurrent'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyReviewHistory'] });
      setForm(empty);
    },
  });

  const createWeekTasksMutation = useMutation({
    mutationFn: async () => {
      const suggested = auto?.suggested_priorities || [];
      const titles = pickWeeklyTaskTitles({
        suggestedPriorities: suggested,
        nextWeekFocus: form.next_week_focus,
      });
      const dates = taskDatesForNextWeek(weekStart);
      const created = [];
      for (let i = 0; i < titles.length; i++) {
        const t = await praxisApi.tasks.create({
          title: titles[i],
          date: dates[i],
          status: 'pending',
          priority: i === 0 ? 'high' : 'medium',
          category: 'pessoal',
          source: 'weekly_review',
        });
        created.push(t);
      }
      return created;
    },
    onSuccess: (created) => {
      toast.success(`${created.length} tarefa(s) criadas para a próxima semana`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    },
    onError: () => toast.error('Não foi possível criar as tarefas'),
  });

  const applyDrafts = () => {
    if (!auto?.drafts) return;
    setForm((f) => ({
      ...f,
      highlights: f.highlights.trim() ? f.highlights : auto.drafts.highlights || f.highlights,
      blockers: f.blockers.trim() ? f.blockers : auto.drafts.blockers || f.blockers,
      learnings: f.learnings.trim() ? f.learnings : auto.drafts.learnings || f.learnings,
      next_week_focus: f.next_week_focus.trim() ? f.next_week_focus : auto.drafts.next_week_focus || f.next_week_focus,
    }));
    toast.success('Rascunho automático aplicado nos campos vazios');
  };

  const goPrev = () => setWeekDate((d) => mondayOf(addDays(d, -7)));
  const goNext = () => setWeekDate((d) => mondayOf(addDays(d, 7)));
  const isCurrentWeek = useMemo(
    () => format(mondayOf(new Date()), 'yyyy-MM-dd') === weekStart,
    [weekStart],
  );

  const range = `${format(weekDate, 'dd MMM', { locale: ptBR })} – ${format(addDays(weekDate, 6), 'dd MMM yyyy', { locale: ptBR })}`;

  const v = auto?.victories;
  const priorities = auto?.suggested_priorities || [];

  return (
    <div className="praxis-page max-w-3xl">
      <PageHero
        kicker="Semana"
        kickerIcon={Sparkles}
        title="Revisão semanal"
        description="Resumo automático + seu texto — cerca de 10 minutos."
        action={(
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setWeekDate(mondayOf(new Date()))} disabled={isCurrentWeek}>
              Esta semana
            </Button>
            <Button variant="outline" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            Resumo automático · {range}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {autoLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-lg" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : auto ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <InsightBlock title="Vitórias">
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    <li>{v?.tasks_completed_count ?? 0} tarefa(s) concluída(s)</li>
                    <li>
                      Hábitos: {v?.habits_done ?? 0}/{v?.habits_target ?? 0}
                      {v?.habits_completion_pct != null ? ` (${v.habits_completion_pct}%)` : ''}
                    </li>
                    <li>{v?.focus_minutes ?? 0} min de foco · {v?.ideas_promoted ?? 0} ideia(s) viraram tarefa</li>
                  </ul>
                </InsightBlock>
                <InsightBlock title="Padrões">
                  <p className="text-muted-foreground leading-relaxed">{auto.patterns?.summary}</p>
                </InsightBlock>
                <InsightBlock title="Gargalos">
                  <p className="text-muted-foreground leading-relaxed">{auto.bottlenecks?.summary}</p>
                </InsightBlock>
                <InsightBlock title="Ideias na semana">
                  <p className="text-muted-foreground">
                    {auto.ideas?.new_captures ?? 0} nova(s) · {auto.ideas?.promissoras_count ?? 0} promissora(s) no banco
                  </p>
                </InsightBlock>
                <InsightBlock title="Macros (nutrição)">
                  {nutrition && nutrition.days_logged > 0 ? (
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        {nutrition.days_logged} dia(s) com log · média{' '}
                        <span className="text-foreground tabular-nums">
                          {Math.round(nutrition.averages?.kcal ?? 0).toLocaleString('pt-BR')} kcal
                        </span>
                        {nutrition.targets?.kcal != null
                          ? ` (meta ${Math.round(nutrition.targets.kcal).toLocaleString('pt-BR')})`
                          : ''}
                      </p>
                      <p className="tabular-nums text-xs">
                        P {nutrition.averages?.protein_g ?? '—'}g · C {nutrition.averages?.carbs_g ?? '—'}g · G{' '}
                        {nutrition.averages?.fat_g ?? '—'}g
                        {nutrition.days_hit_protein != null
                          ? ` · proteína ok em ${nutrition.days_hit_protein}d`
                          : ''}
                      </p>
                      {nutrition.top_foods?.length > 0 ? (
                        <p className="text-xs">
                          Top: {nutrition.top_foods.map((f) => f.name).slice(0, 3).join(', ')}
                        </p>
                      ) : null}
                      <Link
                        to="/jota-fit/nutricao"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
                      >
                        <UtensilsCrossed className="h-3 w-3" />
                        Abrir Nutrição
                      </Link>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sem refeições logadas nesta semana.{' '}
                      <Link to="/jota-fit/nutricao" className="text-primary hover:underline">
                        Registrar
                      </Link>
                    </p>
                  )}
                </InsightBlock>
              </div>

              {priorities.length > 0 && (
                <div>
                  <p className="mb-2 font-medium text-foreground">3 prioridades sugeridas</p>
                  <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                    {priorities.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ol>
                </div>
              )}

              <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={applyDrafts}>
                <Wand2 className="mr-1.5 h-4 w-4" />
                Preencher campos vazios com rascunho
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                className="rounded-full ml-0 sm:ml-2"
                disabled={createWeekTasksMutation.isPending || !auto}
                onClick={() => createWeekTasksMutation.mutate()}
              >
                <ListChecks className="mr-1.5 h-4 w-4" />
                {createWeekTasksMutation.isPending ? 'Criando…' : 'Criar 3 tarefas da semana'}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">Sem dados para esta semana.</p>
          )}
        </CardContent>
      </Card>

      {auto?.life_history && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <History className="h-4 w-4 text-primary" />
              Andamento da sua vida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">{auto.life_history.summary}</p>

            {auto.life_history.completed_by_area.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Áreas com movimento
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {auto.life_history.completed_by_area.map((a) => (
                    <span
                      key={a.area}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1 text-xs"
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {areaLabel(a.area)}
                      </span>
                      <span className="tabular-nums text-foreground">{a.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {auto.life_history.timeline.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Linha do tempo
                </p>
                <ul className="space-y-2 border-l border-border pl-3">
                  {auto.life_history.timeline.map((ev, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[13px] top-1.5 h-2 w-2 rounded-full bg-primary/60" />
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{formatDateShort(ev.date)}</span>
                        {ev.source === 'conclusao' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> concluído
                          </span>
                        )}
                        {ev.name && <span className="font-medium text-foreground">{ev.name}</span>}
                      </div>
                      {ev.text && <p className="mt-0.5 text-sm text-muted-foreground">{ev.text}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {auto.life_history.completed_by_area.length === 0 && auto.life_history.timeline.length === 0 && (
              <p className="text-muted-foreground">Sem movimento registrado nesta semana.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Sua revisão · {weekStart} → {weekEnd}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section
            label="✨ O que foi bem?"
            placeholder="3 vitórias, momentos de orgulho, hábitos que funcionaram…"
            value={form.highlights}
            onChange={(val) => setForm((f) => ({ ...f, highlights: val }))}
          />
          <Section
            label="🪨 O que emperrou?"
            placeholder="Bloqueios, distrações, hábitos que falharam, energia baixa…"
            value={form.blockers}
            onChange={(val) => setForm((f) => ({ ...f, blockers: val }))}
          />
          <Section
            label="💡 O que aprendi?"
            placeholder="Padrões, descobertas, ajustes de processo…"
            value={form.learnings}
            onChange={(val) => setForm((f) => ({ ...f, learnings: val }))}
          />
          <Section
            label="🎯 Foco da próxima semana"
            placeholder="3 prioridades concretas, mudança de rotina, coisa nova pra testar…"
            value={form.next_week_focus}
            onChange={(val) => setForm((f) => ({ ...f, next_week_focus: val }))}
          />

          <div>
            <p className="mb-2 text-sm font-medium">Como foi a semana no geral?</p>
            <div className="flex gap-2">
              {SCORE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, overall_score: opt.value }))}
                  className={`flex-1 rounded-lg border py-2 px-3 text-center transition-colors ${
                    form.overall_score === opt.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-secondary/40 hover:bg-secondary'
                  }`}
                >
                  <div className="text-lg">{opt.emoji}</div>
                  <div className="text-[10px]">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {current?.review && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate(current.review.id)}
                className="text-rose-400 hover:text-rose-400"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
              </Button>
            )}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Salvando…' : 'Salvar revisão'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revisões anteriores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((r) => {
              const opt = SCORE_OPTIONS.find((o) => o.value === r.overall_score);
              const start = new Date(`${r.week_start}T12:00:00`);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setWeekDate(mondayOf(start))}
                  className="flex w-full items-center justify-between rounded-md bg-secondary/40 p-2.5 text-left hover:bg-secondary"
                >
                  <span className="text-sm">
                    {format(start, 'dd MMM', { locale: ptBR })} – {format(addDays(start, 6), 'dd MMM yyyy', { locale: ptBR })}
                  </span>
                  <span className="text-base">{opt?.emoji || '📝'}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsightBlock({ title, children }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Section({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-y bg-secondary/40"
      />
    </div>
  );
}