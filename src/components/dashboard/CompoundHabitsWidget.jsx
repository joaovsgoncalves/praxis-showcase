import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, Clock, Flame, Minus, Pencil, Sparkles } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fortalezaDateKey } from '@/lib/dates';
import { formatPreferredTime, isQuantitativeHabit } from '@/lib/habits';
import QuantLogSheet from '@/components/habits-tasks/QuantLogSheet';
import { sortCompoundHabitsForDay } from '@/lib/compoundHabitOrder';
import { toast } from 'sonner';
import SkipHabitSheet from '@/components/habits-tasks/SkipHabitSheet';
import HabitForm from '@/components/habits-tasks/HabitForm';

function habitDayState(habit) {
  if (habit?.day_outcome === 'skipped' || habit?.skipped_today) return 'skipped';
  if (habit?.day_outcome === 'done' || habit?.completed_today) return 'done';
  return 'open';
}

function ConfettiOverlay() {
  return (
    <div
      className="praxis-completion-glow pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl"
      aria-hidden
    />
  );
}

function CompoundHabitItem({
  compound,
  onToggleHabit,
  onSkipHabit,
  onOpenSkip,
  onCompleteMinimum,
  onEditCompound,
  collapsible = true,
  listItem = false,
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const prevAllDoneRef = useRef(null);
  const steps = compound.children || [];
  const completedCount = steps.filter((step) => habitDayState(step) === 'done').length;
  const skippedCount = steps.filter((step) => habitDayState(step) === 'skipped').length;
  const addressedCount = completedCount + skippedCount;
  const totalCount = steps.length;
  const isClosed = totalCount > 0 && addressedCount === totalCount;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const isPartial = addressedCount > 0 && !isClosed;
  const progressPercent = totalCount > 0 ? Math.round((addressedCount / totalCount) * 100) : 0;
  const nextStep = steps.find((step) => habitDayState(step) === 'open');
  const statusCopy = isClosed
    ? skippedCount > 0
      ? `Dia registrado · ${completedCount} ${completedCount === 1 ? 'feito' : 'feitos'} · ${skippedCount} não rolou`
      : 'Rotina concluída. Dia registrado.'
    : isPartial
      ? 'Você já começou. Siga pelo próximo passo.'
      : 'Comece pelo mínimo: só o primeiro passo.';

  useEffect(() => {
    if (prevAllDoneRef.current === false && allDone) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1200);
      return () => clearTimeout(timer);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  return (
    <div
      className={cn(
        'relative rounded-xl border transition-[background-color,border-color,box-shadow]',
        'p-3.5',
        isClosed
          ? 'border-domain-wellness/25 bg-domain-wellness/[0.07]'
          : 'border-border/70 bg-card/60 hover:border-amber-500/35',
      )}
    >
      {showConfetti && <ConfettiOverlay />}

      <div className="flex items-center gap-1.5">
        {collapsible ? (
          <button
            type="button"
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2.5 text-left',
              listItem && 'min-h-11 py-0.5',
            )}
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
          >
            <span className={cn(listItem ? 'text-xl' : 'text-lg')}>{compound.emoji || '⚡'}</span>
            <span
              className={cn(
                'flex-1 truncate font-medium',
                listItem ? 'text-base font-semibold tracking-[-0.02em]' : 'text-sm',
              )}
            >
              {compound.title}
            </span>
            <span
              className={cn(
                'shrink-0 tabular-nums text-muted-foreground',
                listItem ? 'rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium' : 'text-xs',
              )}
            >
              {completedCount}/{totalCount}
              {skippedCount > 0 ? ` · ${skippedCount} não rolou` : ''}
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
          </button>
        ) : (
          <div className={cn('flex min-w-0 flex-1 items-center gap-2.5', listItem && 'min-h-11')}>
            <span className={cn(listItem ? 'text-xl' : 'text-lg')}>{compound.emoji || '⚡'}</span>
            <span
              className={cn(
                'flex-1 truncate font-medium',
                listItem ? 'text-base font-semibold tracking-[-0.02em]' : 'text-sm',
              )}
            >
              {compound.title}
            </span>
            <span
              className={cn(
                'shrink-0 tabular-nums text-muted-foreground',
                listItem ? 'rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium' : 'text-xs',
              )}
            >
              {completedCount}/{totalCount}
              {skippedCount > 0 ? ` · ${skippedCount} não rolou` : ''}
            </span>
          </div>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'shrink-0 text-muted-foreground hover:text-foreground',
            listItem ? 'h-11 w-11' : 'h-8 w-8',
          )}
          aria-label={`Editar rotina ${compound.title}`}
          onClick={() => onEditCompound(compound)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      {(!collapsible || isOpen) && (
        <div className={cn(listItem ? 'mt-4' : 'mt-3')}>
          <Progress
            value={progressPercent}
            className={cn(
              listItem ? 'mb-2.5 h-2' : 'mb-2 h-1.5',
              isClosed ? '[&>div]:bg-green-500' : '[&>div]:bg-gold',
            )}
          />
          <div className={cn('flex items-center justify-between gap-2', listItem ? 'mb-3.5' : 'mb-3')}>
            <p className={cn('text-muted-foreground', listItem ? 'text-xs leading-snug' : 'text-[11px]')}>
              {statusCopy}
            </p>
            {!isClosed && nextStep && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  'shrink-0 text-gold hover:text-gold',
                  listItem ? 'h-9 px-2.5 text-xs' : 'h-7 px-2 text-[11px]',
                )}
                onClick={() => onCompleteMinimum(nextStep)}
              >
                <Flame className="h-3 w-3" />
                Mínimo
              </Button>
            )}
          </div>

          <ul className={cn(listItem ? 'space-y-2' : 'space-y-1.5')}>
            {steps.map((step) => {
              const state = habitDayState(step);
              const done = state === 'done';
              const skipped = state === 'skipped';
              const timeLabel = formatPreferredTime(step.preferred_time);
              const checkboxId = `compound-habit-${compound.id}-${step.id}`;
              return (
                <li
                  key={step.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg',
                    listItem ? 'min-h-11 gap-2.5 px-2 py-2' : 'px-1 py-1.5',
                    skipped && 'bg-amber-500/[0.06]',
                    timeLabel && !done && !skipped && 'bg-domain-gold/[0.04]',
                  )}
                >
                  {skipped ? (
                    <span
                      className={cn(
                        'flex shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400',
                        listItem ? 'h-5 w-5' : 'h-4 w-4',
                      )}
                      aria-hidden
                    >
                      <Minus className={listItem ? 'h-3 w-3' : 'h-2.5 w-2.5'} />
                    </span>
                  ) : (
                    <Checkbox
                      id={checkboxId}
                      checked={done}
                      onCheckedChange={() => onToggleHabit(step, done)}
                      className={cn(
                        'shrink-0',
                        listItem ? 'h-5 w-5' : 'h-4 w-4',
                        done
                          ? 'data-[state=checked]:border-green-500 data-[state=checked]:bg-green-500'
                          : 'border-muted-foreground/40',
                      )}
                    />
                  )}
                  <label
                    htmlFor={skipped ? undefined : checkboxId}
                    className={cn(
                      'min-w-0 flex-1 select-none',
                      listItem ? 'text-sm leading-snug' : 'text-xs',
                      skipped ? 'text-muted-foreground opacity-80' : 'cursor-pointer',
                      done
                        ? 'text-muted-foreground line-through'
                        : !skipped && 'text-foreground/80 group-hover:text-foreground',
                    )}
                  >
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className={listItem ? 'font-medium' : undefined}>{step.title}</span>
                      {timeLabel && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 rounded-full border border-domain-gold/25 bg-domain-gold/10 font-semibold tabular-nums text-domain-gold',
                            listItem ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]',
                          )}
                        >
                          <Clock className={listItem ? 'h-3 w-3' : 'h-2.5 w-2.5'} aria-hidden />
                          {timeLabel}
                        </span>
                      )}
                      {skipped && (
                        <span className={cn('font-medium text-amber-200/80', listItem ? 'text-[11px]' : 'text-[10px]')}>
                          Não rolou
                        </span>
                      )}
                    </span>
                    {skipped && step.skip_note && (
                      <span
                        className={cn(
                          'mt-0.5 block leading-snug text-amber-100/70',
                          listItem ? 'text-[11px]' : 'text-[10px]',
                        )}
                      >
                        “{step.skip_note}”
                      </span>
                    )}
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      'shrink-0 text-muted-foreground hover:text-foreground',
                      listItem ? 'h-11 w-11' : 'h-7 w-7',
                    )}
                    aria-label={`Editar rotina e passo ${step.title}`}
                    onClick={() => onEditCompound(compound)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {skipped ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'shrink-0 text-muted-foreground hover:text-foreground',
                          listItem ? 'h-11 px-2.5 text-xs' : 'h-7 px-2 text-[11px]',
                        )}
                        onClick={() => onOpenSkip(step)}
                      >
                        Nomear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          'shrink-0 rounded-full text-muted-foreground hover:text-foreground',
                          listItem ? 'h-11 px-3 text-xs' : 'h-7 px-2 text-[11px]',
                        )}
                        onClick={() => onToggleHabit(step, true)}
                      >
                        Desfazer
                      </Button>
                    </div>
                  ) : !done ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        'shrink-0 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
                        listItem ? 'h-11 min-w-[5.5rem] px-3 text-xs font-medium' : 'h-7 px-2 text-[11px]',
                      )}
                      onClick={() => onSkipHabit?.(step)}
                    >
                      Não rolou
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CompoundHabitsWidget({
  collapsible = true,
  compounds: compoundsProp,
  today: todayProp,
  status = 'active',
  variant = 'card',
  onEditCompound: onEditCompoundProp,
}) {
  const queryClient = useQueryClient();
  const today = todayProp || fortalezaDateKey();
  const habitParams = { date: today, status };
  const compoundQueryKey = ['habits', 'compounds', habitParams];
  const [skipHabitTarget, setSkipHabitTarget] = useState(null);
  const [quantHabitTarget, setQuantHabitTarget] = useState(null);
  const [editingCompound, setEditingCompound] = useState(null);

  const { data: queriedHabits = [], isLoading, isError } = useQuery({
    queryKey: compoundQueryKey,
    queryFn: () => praxisApi.habits.list(habitParams),
    enabled: compoundsProp === undefined,
    refetchInterval: 30000,
  });
  const compoundsRaw = compoundsProp
    ?? queriedHabits.filter((habit) => habit.kind === 'compound');
  const compounds = sortCompoundHabitsForDay(compoundsRaw);

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, isDone, value }) => {
      if (isDone) {
        const logs = await praxisApi.habitLogs.list({ habit_id: habitId, date: today });
        if (logs.length > 0) await praxisApi.habitLogs.delete(logs[0].id);
      } else {
        await praxisApi.habitLogs.create({
          habit_id: habitId,
          date: today,
          outcome: 'done',
          completed: true,
          ...(value !== undefined ? { value } : {}),
        });
      }
    },
    onMutate: async ({ habitId, isDone, value }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      await queryClient.cancelQueries({ queryKey: ['allHabits'] });
      await queryClient.cancelQueries({ queryKey: ['habitLogs'] });

      const prevHabits = queryClient.getQueriesData({ queryKey: ['habits'] });
      const prevAllHabits = queryClient.getQueriesData({ queryKey: ['allHabits'] });
      const prevLogs = queryClient.getQueriesData({ queryKey: ['habitLogs'] });

      const updateHabitItems = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((h) => {
          if (h.id === habitId) {
            return {
              ...h,
              completed_today: !isDone,
              skipped_today: false,
              day_outcome: isDone ? 'open' : 'done',
            };
          }
          if (h.children && Array.isArray(h.children)) {
            return {
              ...h,
              children: h.children.map((child) =>
                child.id === habitId
                  ? {
                      ...child,
                      completed_today: !isDone,
                      skipped_today: false,
                      day_outcome: isDone ? 'open' : 'done',
                    }
                  : child
              ),
            };
          }
          return h;
        });
      };

      queryClient.setQueriesData({ queryKey: ['habits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['allHabits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['habitLogs'] }, (old) => {
        if (!Array.isArray(old)) return old;
        if (isDone) {
          return old.filter((l) => !(l.habit_id === habitId && l.date === today));
        }
        const filtered = old.filter((l) => !(l.habit_id === habitId && l.date === today));
        return [
          ...filtered,
          {
            id: 'temp-' + Date.now(),
            habit_id: habitId,
            date: today,
            outcome: 'done',
            completed: true,
            ...(value !== undefined ? { value } : {}),
          },
        ];
      });

      return { prevHabits, prevAllHabits, prevLogs };
    },
    onError: (_err, _vars, context) => {
      context?.prevHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevLogs?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao atualizar hábito');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  const skipHabitMutation = useMutation({
    mutationFn: ({ habitId, skipReason, skipNote }) => praxisApi.habitLogs.create({
      habit_id: habitId,
      date: today,
      outcome: 'skipped',
      ...(skipReason ? { skip_reason: skipReason } : {}),
      ...(skipNote ? { note: skipNote } : {}),
    }),
    onMutate: async ({ habitId, skipReason, skipNote }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      await queryClient.cancelQueries({ queryKey: ['allHabits'] });
      await queryClient.cancelQueries({ queryKey: ['habitLogs'] });

      const prevHabits = queryClient.getQueriesData({ queryKey: ['habits'] });
      const prevAllHabits = queryClient.getQueriesData({ queryKey: ['allHabits'] });
      const prevLogs = queryClient.getQueriesData({ queryKey: ['habitLogs'] });

      const updateHabitItems = (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((h) => {
          if (h.id === habitId) {
            return {
              ...h,
              completed_today: false,
              skipped_today: true,
              day_outcome: 'skipped',
            };
          }
          if (h.children && Array.isArray(h.children)) {
            return {
              ...h,
              children: h.children.map((child) =>
                child.id === habitId
                  ? {
                      ...child,
                      completed_today: false,
                      skipped_today: true,
                      day_outcome: 'skipped',
                    }
                  : child
              ),
            };
          }
          return h;
        });
      };

      queryClient.setQueriesData({ queryKey: ['habits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['allHabits'] }, updateHabitItems);
      queryClient.setQueriesData({ queryKey: ['habitLogs'] }, (old) => {
        if (!Array.isArray(old)) return old;
        const filtered = old.filter((l) => !(l.habit_id === habitId && l.date === today));
        return [
          ...filtered,
          {
            id: 'temp-' + Date.now(),
            habit_id: habitId,
            date: today,
            outcome: 'skipped',
            skip_reason: skipReason || null,
            note: skipNote || null,
            completed: false,
          },
        ];
      });

      return { prevHabits, prevAllHabits, prevLogs };
    },
    onError: (_err, _vars, context) => {
      context?.prevHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevAllHabits?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      context?.prevLogs?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toast.error('Erro ao registrar');
    },
    onSuccess: () => {
      toast('Não rolou — registrado.');
      setSkipHabitTarget(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
    },
  });

  const updateCompoundMutation = useMutation({
    mutationFn: ({ id, data }) => praxisApi.habits.update(id, data),
    onSuccess: () => {
      toast('Rotina atualizada.');
      setEditingCompound(null);
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['allHabits'] });
    },
    onError: () => toast.error('Não deu pra salvar a rotina.'),
  });

  const openCompoundEditor = (compound) => {
    if (onEditCompoundProp) onEditCompoundProp(compound);
    else setEditingCompound(compound);
  };

  const content = (
    <>
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
      {isError && <p className="py-4 text-center text-sm text-destructive">Erro ao carregar as rotinas</p>}
      {!isLoading && !isError && compounds.length === 0 && variant === 'card' && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma rotina ainda</p>
          <p className="max-w-xs text-center text-xs text-muted-foreground/60">
            Agrupe passos que fazem sentido juntos no seu dia.
          </p>
        </div>
      )}
      {!isLoading && !isError && compounds.length > 0 && (
        <div className={cn(variant === 'card' ? 'space-y-3' : 'space-y-2.5')}>
          {compounds.map((compound) => (
            <CompoundHabitItem
              key={compound.id}
              compound={compound}
              collapsible={collapsible}
              listItem={variant !== 'card'}
              onToggleHabit={(stepOrId, isDone) => {
                const step = typeof stepOrId === 'object' ? stepOrId : compound.children?.find((c) => c.id === stepOrId);
                if (step && isQuantitativeHabit(step) && !isDone) {
                  setQuantHabitTarget(step);
                  return;
                }
                const habitId = typeof stepOrId === 'object' ? stepOrId.id : stepOrId;
                toggleHabitMutation.mutate({ habitId, isDone });
              }}
              onSkipHabit={(stepOrId) => {
                const habitId = typeof stepOrId === 'object' ? stepOrId.id : stepOrId;
                skipHabitMutation.mutate({ habitId });
              }}
              onOpenSkip={setSkipHabitTarget}
              onEditCompound={openCompoundEditor}
              onCompleteMinimum={(stepOrId) => {
                const step = typeof stepOrId === 'object' ? stepOrId : compound.children?.find((c) => c.id === stepOrId);
                if (step && isQuantitativeHabit(step)) {
                  setQuantHabitTarget(step);
                  return;
                }
                const habitId = typeof stepOrId === 'object' ? stepOrId.id : stepOrId;
                toggleHabitMutation.mutate({ habitId, isDone: false });
              }}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {variant !== 'card' ? content : (
        <Card className="praxis-dashboard-card">
          <CardHeader className="p-5 pb-3 sm:p-5 sm:pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-domain-gold/15 bg-domain-gold/[0.07]">
                <Sparkles className="h-4 w-4 text-domain-gold" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Hábitos compostos</p>
                <CardTitle className="mt-0.5 text-base tracking-[-0.025em]">Rotinas</CardTitle>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Faça, nomeie o que não rolou e siga pelo próximo passo.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-5 sm:pb-5">{content}</CardContent>
        </Card>
      )}

      <SkipHabitSheet
        open={Boolean(skipHabitTarget)}
        onOpenChange={(open) => { if (!open) setSkipHabitTarget(null); }}
        habitTitle={skipHabitTarget?.title || 'Hábito'}
        outcome={skipHabitTarget ? habitDayState(skipHabitTarget) : 'open'}
        initialNote={skipHabitTarget?.skip_note || ''}
        busy={skipHabitMutation.isPending}
        onConfirm={({ skipReason, skipNote }) =>
          skipHabitMutation.mutate({
            habitId: skipHabitTarget.id,
            skipReason,
            skipNote,
          })
        }
        onUndo={() => {
          if (!skipHabitTarget) return;
          toggleHabitMutation.mutate({ habitId: skipHabitTarget.id, isDone: true });
          setSkipHabitTarget(null);
        }}
        onMarkDone={() => {
          if (!skipHabitTarget) return;
          const target = skipHabitTarget;
          setSkipHabitTarget(null);
          if (isQuantitativeHabit(target)) {
            setQuantHabitTarget(target);
            return;
          }
          toggleHabitMutation.mutate({ habitId: target.id, isDone: false });
        }}
      />

      <QuantLogSheet
        open={Boolean(quantHabitTarget)}
        onOpenChange={(open) => {
          if (!open) setQuantHabitTarget(null);
        }}
        habit={quantHabitTarget}
        currentValue={
          quantHabitTarget
            ? (quantHabitTarget.value_today ?? quantHabitTarget.value ?? undefined)
            : undefined
        }
        busy={toggleHabitMutation.isPending}
        onConfirm={(value) => {
          if (!quantHabitTarget) return;
          const habitId = quantHabitTarget.id;
          setQuantHabitTarget(null);
          toggleHabitMutation.mutate({ habitId, isDone: false, value });
        }}
      />

      {!onEditCompoundProp && (
        <Dialog
          open={Boolean(editingCompound)}
          onOpenChange={(open) => { if (!open) setEditingCompound(null); }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar rotina</DialogTitle>
            </DialogHeader>
            {editingCompound && (
              <HabitForm
                key={editingCompound.id}
                initial={editingCompound}
                onSubmit={(data) => updateCompoundMutation.mutate({ id: editingCompound.id, data })}
                onCancel={() => setEditingCompound(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
