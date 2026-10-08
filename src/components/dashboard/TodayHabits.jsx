import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Flame, Minus, MoreHorizontal, Sliders, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryBadge } from '@/lib/categories';
import { sparkAt } from '@/lib/celebration';
import {
  countHabitDayOutcomes,
  formatPreferredTime,
  getHabitDayOutcome,
  isQuantitativeHabit,
  isQuickIncrementHabit,
  formatHabitProgress,
  formatQuickIncrementButtonLabel,
  formatQuickIncrementAriaLabel,
  SKIP_REASON_LABELS,
  todayLogForHabit,
} from '@/lib/habits';
import QuantLogSheet from '@/components/habits-tasks/QuantLogSheet';
import SkipHabitSheet from '@/components/habits-tasks/SkipHabitSheet';
import CompoundHabitsWidget from '@/components/dashboard/CompoundHabitsWidget';
import SinceHabitCard from '@/components/dashboard/SinceHabitCard';
import { partitionCompoundHabitsForDay } from '@/lib/compoundHabitOrder';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LONG_PRESS_MS = 480;

export default function TodayHabits({
  habits,
  compounds = [],
  sinceHabits = [],
  summaryHabits,
  habitLogs,
  onToggleHabit,
  onQuickIncrement,
  onSkipHabit,
  onDeleteHabit,
  title = 'Hábitos de Hoje',
  today: todayProp,
}) {
  const [savingHabitId, setSavingHabitId] = useState(null);
  const today = todayProp || new Date().toISOString().split('T')[0];
  const rowRefs = useRef(new Map());
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const [skipSheetHabit, setSkipSheetHabit] = useState(null);
  const [quantSheetHabit, setQuantSheetHabit] = useState(null);

  const habitsForSummary = summaryHabits || habits;
  const { beforeChecks, afterChecks } = partitionCompoundHabitsForDay(compounds);
  const hasRows = habits.length > 0 || compounds.length > 0 || sinceHabits.length > 0;
  const { done: doneCount, skipped: skippedCount, open: openCount } = countHabitDayOutcomes(
    habitsForSummary,
    habitLogs,
    today,
  );
  const donePct = habitsForSummary.length > 0
    ? Math.round((doneCount / habitsForSummary.length) * 100)
    : 0;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const openSkipSheet = (habit) => {
    setSkipSheetHabit(habit);
  };

  const handleIncrement = async (habit, evt) => {
    if (savingHabitId === habit.id) return;
    setSavingHabitId(habit.id);

    const log = todayLogForHabit(habitLogs, habit.id, today);
    const prevVal = (log && log.value != null && Number.isFinite(Number(log.value)))
      ? Number(log.value)
      : 0;
    const inc = Number(habit.quick_increment) || 0.5;
    const nextVal = Math.round((prevVal + inc) * 1000) / 1000;

    const target = rowRefs.current.get(habit.id);
    const rect = (evt?.currentTarget || target)?.getBoundingClientRect?.();
    if (rect) sparkAt(rect.left + 28, rect.top + rect.height / 2);

    try {
      if (onQuickIncrement) {
        await onQuickIncrement(habit, inc);
      } else {
        await onToggleHabit?.(habit.id, false, nextVal);
      }
    } finally {
      setSavingHabitId(null);
    }
  };

  const handlePrimaryTap = (habit, evt) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    const log = todayLogForHabit(habitLogs, habit.id, today);
    const outcome = getHabitDayOutcome(log);

    if (outcome === 'done') {
      onToggleHabit?.(habit.id, true);
      return;
    }
    if (outcome === 'skipped') {
      // Undo skip → open
      onToggleHabit?.(habit.id, true);
      return;
    }
    // open → done
    if (isQuickIncrementHabit(habit)) {
      handleIncrement(habit, evt);
      return;
    }
    if (isQuantitativeHabit(habit)) {
      setQuantSheetHabit(habit);
      return;
    }
    const target = rowRefs.current.get(habit.id);
    const rect = (evt?.currentTarget || target)?.getBoundingClientRect?.();
    if (rect) sparkAt(rect.left + 28, rect.top + rect.height / 2);
    onToggleHabit?.(habit.id, false);
  };

  const handlePointerDown = (habit) => {
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      const log = todayLogForHabit(habitLogs, habit.id, today);
      const outcome = getHabitDayOutcome(log);
      if (outcome === 'skipped') {
        onToggleHabit?.(habit.id, true);
      } else {
        onSkipHabit?.(habit.id);
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearLongPress();
  };

  const confirmSkip = ({ skipReason = null, skipNote = null } = {}) => {
    if (!skipSheetHabit) return;
    onSkipHabit?.(skipSheetHabit.id, skipReason, skipNote);
    setSkipSheetHabit(null);
  };

  const undoFromSheet = () => {
    if (!skipSheetHabit) return;
    onToggleHabit?.(skipSheetHabit.id, true);
    setSkipSheetHabit(null);
  };

  const markDoneFromSheet = () => {
    if (!skipSheetHabit) return;
    const h = skipSheetHabit;
    setSkipSheetHabit(null);
    if (isQuantitativeHabit(h)) {
      setQuantSheetHabit(h);
      return;
    }
    const target = rowRefs.current.get(h.id);
    const rect = target?.getBoundingClientRect?.();
    if (rect) sparkAt(rect.left + 28, rect.top + rect.height / 2);
    onToggleHabit?.(h.id, false);
  };

  const sheetLog = skipSheetHabit
    ? todayLogForHabit(habitLogs, skipSheetHabit.id, today)
    : null;
  const sheetOutcome = getHabitDayOutcome(sheetLog);

  return (
    <Card className="praxis-dashboard-card">
      <CardHeader className="p-5 pb-4 sm:p-5 sm:pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Consistência</p>
            <h3 className="praxis-title mt-1 text-xl font-semibold tracking-[-0.035em]">{title}</h3>
          </div>
          <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {doneCount}/{habitsForSummary.length}
            {skippedCount > 0 || openCount > 0 ? (
              <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal">
                {doneCount} feitos
                {skippedCount > 0 ? ` · ${skippedCount} não rolou` : ''}
                {openCount > 0 ? ` · ${openCount} abertos` : ''}
              </span>
            ) : null}
          </span>
        </div>
        {habitsForSummary.length > 0 ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055] rail-inset">
            <div
              className="praxis-progress-fill h-full rounded-full bg-gradient-to-r from-domain-wellness to-domain-gold"
              style={{ width: `${donePct}%` }}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-2.5 px-5 pb-5 sm:px-5 sm:pb-5">
        {!hasRows ? (
          <p className="py-5 text-center text-sm text-muted-foreground">
            Nenhum hábito essencial para hoje.
          </p>
        ) : null}

        {beforeChecks.length > 0 ? (
          <CompoundHabitsWidget
            collapsible
            compounds={beforeChecks}
            today={today}
            variant="inline"
          />
        ) : null}

        {habits.map((habit) => {
          const log = todayLogForHabit(habitLogs, habit.id, today);
          const outcome = getHabitDayOutcome(log);
          const done = outcome === 'done';
          const skipped = outcome === 'skipped';
          return (
            <div
              key={habit.id}
              ref={(el) => {
                if (el) rowRefs.current.set(habit.id, el);
                else rowRefs.current.delete(habit.id);
              }}
              className={cn(
                              'praxis-tactile-card flex w-full items-center gap-3 rounded-xl border p-3.5 text-left',
                              done && 'border-amber-500/25 bg-amber-500/[0.08]',
                              skipped && 'border-amber-500/20 bg-amber-500/[0.07]',
                              !done && !skipped && 'border-border/70 bg-card/60 hover:border-amber-500/35',
                            )}
            >
              {/* Área principal de toque para marcar como feito */}
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
                onClick={(event) => handlePrimaryTap(habit, event)}
                onPointerDown={() => handlePointerDown(habit)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label={isQuickIncrementHabit(habit)
                  ? formatQuickIncrementAriaLabel(habit)
                  : `Alternar conclusão do hábito: ${habit.title}`}
              >
                {skipped ? (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400/90"
                    aria-hidden
                  >
                    <Minus className="h-3 w-3" />
                  </span>
                ) : (
                  <Checkbox
                    checked={done}
                    tabIndex={-1}
                    className={cn(
                      'h-5 w-5 shrink-0 pointer-events-none',
                      done
                                              ? 'border-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950'
                                              : 'border-muted-foreground/50 hover:border-amber-500/60',
                    )}
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        'min-w-0 truncate text-sm font-semibold sm:text-[15px]',
                        done && 'text-muted-foreground/80 line-through decoration-amber-500/50',
                                                skipped && 'text-muted-foreground opacity-75',
                      )}
                    >
                      {habit.title}
                    </p>
                    <CategoryBadge category={habit.category} />
                    {isQuickIncrementHabit(habit) ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums',
                          done
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            : 'border-domain-wellness/30 bg-domain-wellness/10 text-domain-wellness',
                        )}
                      >
                        {formatHabitProgress(log?.value, habit.target_value, habit.unit)}
                      </span>
                    ) : null}
                    {formatPreferredTime(habit.preferred_time) ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-domain-gold/25 bg-domain-gold/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-domain-gold">
                        {formatPreferredTime(habit.preferred_time)}
                      </span>
                    ) : null}
                    {skipped && log?.skip_reason ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-200/80">
                        {SKIP_REASON_LABELS[log.skip_reason] || log.skip_reason}
                      </span>
                    ) : null}
                  </div>
                  {skipped && log?.note ? (
                    <p className="mt-1 text-[11px] leading-snug text-amber-100/75">
                      “{log.note}”
                    </p>
                  ) : null}
                </div>
              </button>

              {habit.current_streak > 0 ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-500">
                                <Flame className="h-3 w-3 fill-amber-500/20" aria-hidden />
                                {habit.current_streak}d
                              </span>
                            ) : null}

              <div className="flex items-center gap-1 shrink-0">
                {isQuickIncrementHabit(habit) && !done && !skipped ? (
                  <button
                    type="button"
                    className="flex min-h-[44px] min-w-[72px] items-center justify-center rounded-full border border-domain-wellness/40 bg-domain-wellness/15 px-3.5 text-xs font-bold text-domain-wellness shadow-sm transition-transform hover:bg-domain-wellness/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-wellness focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50 touch-manipulation"
                    disabled={savingHabitId === habit.id}
                    aria-label={formatQuickIncrementAriaLabel(habit)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIncrement(habit, e);
                    }}
                  >
                    {savingHabitId === habit.id ? (
                      <span className="animate-pulse">…</span>
                    ) : (
                      formatQuickIncrementButtonLabel(habit)
                    )}
                  </button>
                ) : null}
                {skipped ? (
                  <>
                    <button
                      type="button"
                      className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground touch-manipulation"
                      aria-label={`Nomear motivo — ${habit.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openSkipSheet(habit);
                      }}
                    >
                      Nomear
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground touch-manipulation"
                      aria-label={`Desfazer não rolou — ${habit.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHabit?.(habit.id, true);
                      }}
                    >
                      Desfazer
                    </button>
                  </>
                ) : !isQuickIncrementHabit(habit) ? (
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100/95 transition-colors hover:bg-amber-500/20 touch-manipulation"
                    aria-label={`Não rolou — ${habit.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSkipHabit?.(habit.id);
                    }}
                  >
                    Não rolou
                  </button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground touch-manipulation"
                      aria-label={`Opções do hábito ${habit.title}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isQuantitativeHabit(habit) ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuantSheetHabit(habit);
                        }}
                      >
                        <Sliders className="mr-2 h-4 w-4" /> Ajustar quantidade
                      </DropdownMenuItem>
                    ) : null}
                    {skipped ? (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openSkipSheet(habit);
                          }}
                        >
                          Nomear falha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleHabit?.(habit.id, true);
                          }}
                        >
                          Desfazer não rolou
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSkipHabit?.(habit.id);
                          }}
                        >
                          <Minus className="mr-2 h-4 w-4" /> Não rolou
                        </DropdownMenuItem>
                        {(done || (log?.value != null && Number(log.value) > 0)) ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleHabit?.(habit.id, true);
                            }}
                          >
                            {done ? "Desfazer conclusão" : "Zerar registro de hoje"}
                          </DropdownMenuItem>
                        ) : null}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHabit?.(habit);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {sinceHabits.map((habit) => (
          <SinceHabitCard key={habit.id} habit={habit} />
        ))}

        {afterChecks.length > 0 ? (
          <CompoundHabitsWidget
            collapsible
            compounds={afterChecks}
            today={today}
            variant="inline"
          />
        ) : null}
      </CardContent>

      <SkipHabitSheet
        open={Boolean(skipSheetHabit)}
        onOpenChange={(open) => { if (!open) setSkipSheetHabit(null); }}
        habitTitle={skipSheetHabit?.title || 'Hábito'}
        outcome={sheetOutcome}
        initialNote={sheetLog?.note || ''}
        onConfirm={confirmSkip}
        onUndo={undoFromSheet}
        onMarkDone={markDoneFromSheet}
      />

      <QuantLogSheet
        open={Boolean(quantSheetHabit)}
        onOpenChange={(open) => {
          if (!open) setQuantSheetHabit(null);
        }}
        habit={quantSheetHabit}
        currentValue={
          quantSheetHabit
            ? todayLogForHabit(habitLogs, quantSheetHabit.id, today)?.value
            : undefined
        }
        onConfirm={(value) => {
          if (!quantSheetHabit) return;
          const habitId = quantSheetHabit.id;
          setQuantSheetHabit(null);
          onToggleHabit?.(habitId, false, value);
        }}
      />
    </Card>
  );
}
