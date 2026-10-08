import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { weekRange, taskBlock, layoutTimedBlocks } from '@/lib/taskLenses';
import { fortalezaNowTimeHHMM } from '@/lib/dates';
import { cleanPriorityPrefix, isTaskDone } from '@/lib/tasks';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const HOUR_HEIGHT = 56; // Altura em px por hora
const TOTAL_HOURS = HOURS.length; // 15 horas (07:00 às 22:00)
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT; // 840px

const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_NAMES_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function formatDayHeader(dateStr, index) {
  const parts = String(dateStr || '').split('-');
  const m = parts[1] || '01';
  const d = parts[2] || '01';
  const dow = DOW_LABELS[index] || '';
  return {
    dow,
    dayNum: String(Number(d)),
    dateFormatted: `${d}/${m}`,
  };
}

function formatWeekHeaderRange(start, end) {
  const startParts = String(start || '').split('-');
  const endParts = String(end || '').split('-');
  const startM = startParts[1] || '01';
  const startD = startParts[2] || '01';
  const endM = endParts[1] || '01';
  const endD = endParts[2] || '01';

  const endMonthLabel = MONTH_NAMES_SHORT[Number(endM) - 1] || '';
  if (startM === endM) {
    return `${startD} a ${endD} de ${endMonthLabel}`;
  }
  const startMonthLabel = MONTH_NAMES_SHORT[Number(startM) - 1] || '';
  return `${startD} de ${startMonthLabel} a ${endD} de ${endMonthLabel}`;
}

function getBlockPosition(block, durationMinutes) {
  const [startH, startM] = block.start.split(':').map(Number);
  const [endH, endM] = block.end.split(':').map(Number);

  const startMinFrom7 = (startH - 7) * 60 + startM;
  let duration = (endH * 60 + endM) - (startH * 60 + startM);
  if (duration <= 0) {
    duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;
  }

  const top = (startMinFrom7 / 60) * HOUR_HEIGHT;
  const height = Math.max(28, (duration / 60) * HOUR_HEIGHT);

  const minH = 48;
  const nextHeight = Math.max(minH, height);
  const clampedTop = Math.max(0, Math.min(TOTAL_HEIGHT - minH, top));
  const clampedHeight = Math.min(TOTAL_HEIGHT - clampedTop, nextHeight);

  return { top: clampedTop, height: clampedHeight };
}

function UntimedTaskChip({ task, onEditTask }) {
  const isDone = isTaskDone(task);
  return (
    <button
      type="button"
      onClick={() => onEditTask?.(task)}
      className={cn(
        'max-w-full truncate rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-left text-[11px] font-medium text-stone-200 hover:border-white/20',
        isDone && 'text-muted-foreground line-through',
      )}
      title={cleanPriorityPrefix(task.title)}
    >
      {cleanPriorityPrefix(task.title)}
    </button>
  );
}

function TimedTaskBlock({ task, block, col = 0, cols = 1, onEditTask }) {
  const isDone = isTaskDone(task);
  const { top, height } = getBlockPosition(block, task.duration_minutes);
  const gap = 3;
  const widthPct = 100 / Math.max(1, cols);
  const leftPct = col * widthPct;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEditTask?.(task);
      }}
      style={{
        top: `${top}px`,
        height: `${Math.max(48, height) - 4}px`,
        left: `calc(${leftPct}% + ${gap}px)`,
        width: `calc(${widthPct}% - ${gap * 2}px)`,
      }}
      className={cn(
        'absolute z-10 flex flex-col items-start justify-start overflow-hidden rounded-md border px-2 py-1.5 text-left',
        'border-white/[0.10] bg-[#161a23] hover:border-domain-gold/40 hover:z-20',
        isDone && 'opacity-55',
      )}
    >
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {block.start}-{block.end}
      </span>
      <span
        className={cn(
          'mt-0.5 line-clamp-2 break-normal text-[12px] font-medium leading-snug text-stone-100',
          isDone && 'line-through text-muted-foreground',
        )}
      >
        {cleanPriorityPrefix(task.title)}
      </span>
    </button>
  );
}

export default function TaskWeek({
  tasks = [],
  today,
  onEditTask,
  onCreateTaskAt,
}) {
  const todayColRef = useRef(null);
  const timeGridScrollRef = useRef(null);
  const [nowTime, setNowTime] = useState(() => fortalezaNowTimeHHMM());

  const { start, end, days } = weekRange(today);

  // Mantém horário do fuso Fortaleza atualizado a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(fortalezaNowTimeHHMM());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const scrollToToday = () => {
    if (todayColRef.current) {
      todayColRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
    if (timeGridScrollRef.current) {
      const [nowH, nowM] = nowTime.split(':').map(Number);
      const minutesFrom7 = (nowH - 7) * 60 + nowM;
      if (minutesFrom7 >= 0 && minutesFrom7 <= TOTAL_HOURS * 60) {
        const targetTop = (minutesFrom7 / 60) * HOUR_HEIGHT - 120;
        timeGridScrollRef.current.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        });
      }
    }
  };

  // Scroll inicial para posicionar o dia de hoje
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayColRef.current) {
        todayColRef.current.scrollIntoView({
          behavior: 'auto',
          inline: 'center',
          block: 'nearest',
        });
      }
      if (timeGridScrollRef.current) {
        const [nowH, nowM] = fortalezaNowTimeHHMM().split(':').map(Number);
        const minutesFrom7 = (nowH - 7) * 60 + nowM;
        if (minutesFrom7 >= 0 && minutesFrom7 <= TOTAL_HOURS * 60) {
          const targetTop = (minutesFrom7 / 60) * HOUR_HEIGHT - 120;
          timeGridScrollRef.current.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'auto',
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Filtra tarefas da semana atual (sem inbox sem data, sem ideias, sem canceladas)
  const weekTasks = tasks.filter((t) => {
    if (!t?.date) return false;
    if (t.category === 'ideias' || t.status === 'cancelled') return false;
    const d = String(t.date).slice(0, 10);
    return d >= start && d <= end;
  });

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-card/30 p-3 sm:p-4">
      {/* Barra de cabeçalho da semana */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {formatWeekHeaderRange(start, end)}
          </span>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-white/10 shrink-0">
            {weekTasks.length} {weekTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={scrollToToday}
          className="h-8 rounded-full px-3 text-xs font-medium gap-1.5 border-white/10 hover:border-primary/40 hover:bg-primary/10 transition-colors"
        >
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Hoje
        </Button>
      </div>

      {/* Grade com scroll horizontal no mobile e scroll vertical de horários */}
      <div
        ref={timeGridScrollRef}
        className="praxis-scroll-x max-h-[700px] overflow-y-auto overflow-x-auto snap-x snap-mandatory rounded-xl border border-white/[0.06] bg-background/50"
      >
        <div className="flex min-w-[700px] lg:min-w-0">
          {/* Coluna da esquerda: Marcadores de hora */}
          <div className="sticky left-0 z-20 w-12 sm:w-14 shrink-0 bg-background/95 backdrop-blur select-none border-r border-white/[0.06] pr-2">
            <div className="h-[34px] flex items-center justify-end">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <div className="h-[84px] flex items-center justify-end text-[10px] text-muted-foreground/50 font-medium">
              <span>Hora</span>
            </div>
            <div style={{ height: `${TOTAL_HEIGHT}px` }} className="relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="flex items-start justify-end text-[11px] font-mono tabular-nums text-muted-foreground/60"
                >
                  <span className="-translate-y-2">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7 Colunas dos dias da semana (Segunda a Domingo) */}
          <div className="grid grid-cols-7 flex-1 divide-x divide-white/[0.06]">
            {days.map((day, dayIndex) => {
              const isToday = day === today;
              const header = formatDayHeader(day, dayIndex);

              const dayUntimedTasks = weekTasks.filter(
                (t) => t.date === day && taskBlock(t) === null
              );
              const dayTimedLaid = layoutTimedBlocks(
                weekTasks
                  .filter((t) => t.date === day && taskBlock(t))
                  .map((task) => ({ task, ...taskBlock(task) })),
              );

              return (
                <div
                  key={day}
                  ref={isToday ? todayColRef : null}
                  className={cn(
                    'flex flex-col p-2 min-w-[130px] sm:min-w-[150px] lg:min-w-0 snap-start',
                    isToday && 'bg-white/[0.02]'
                  )}
                >
                  {/* Cabeçalho do dia */}
                  <div className="flex items-center justify-between pb-2 h-[34px]">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wider',
                          isToday ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {header.dow}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          isToday ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {header.dayNum}
                      </span>
                    </div>
                    {isToday && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                      >
                        Hoje
                      </Badge>
                    )}
                  </div>

                  {dayUntimedTasks.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {dayUntimedTasks.map((task) => (
                        <UntimedTaskChip key={task.id} task={task} onEditTask={onEditTask} />
                      ))}
                    </div>
                  )}

                  {/* Grade de horários do dia */}
                  <div
                    style={{ height: `${TOTAL_HEIGHT}px` }}
                    className="relative rounded-xl border border-white/[0.06] bg-card/20 overflow-hidden"
                  >
                    {/* Linhas / Células de hora clicáveis */}
                    {HOURS.map((hour) => {
                      const timeStr = `${String(hour).padStart(2, '0')}:00`;
                      return (
                        <div
                          key={hour}
                          onClick={() => onCreateTaskAt?.({ date: day, time: timeStr })}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="group relative border-t border-white/[0.04] first:border-t-0 transition-colors hover:bg-white/[0.03] cursor-pointer flex items-center justify-center"
                          title={`Criar tarefa às ${timeStr} (${header.dow} ${header.dayNum})`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onCreateTaskAt?.({ date: day, time: timeStr });
                            }
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 text-muted-foreground transition-opacity" />
                        </div>
                      );
                    })}

                    {/* Blocos de tarefas com horário */}
                    {dayTimedLaid.map((laid) => (
                      <TimedTaskBlock
                        key={laid.task.id}
                        task={laid.task}
                        block={laid}
                        col={laid.col}
                        cols={laid.cols}
                        onEditTask={onEditTask}
                      />
                    ))}

                    {/* Linha de agora (apenas no dia de hoje) */}
                    {isToday && (() => {
                      const [nowH, nowM] = nowTime.split(':').map(Number);
                      const minutesFrom7 = (nowH - 7) * 60 + nowM;
                      if (minutesFrom7 < 0 || minutesFrom7 > TOTAL_HOURS * 60) return null;
                      const nowTop = (minutesFrom7 / 60) * HOUR_HEIGHT;

                      return (
                        <div
                          id="praxis-week-now-line"
                          className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="relative -ml-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
                          <div className="h-[2px] w-full bg-rose-500/90 shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
