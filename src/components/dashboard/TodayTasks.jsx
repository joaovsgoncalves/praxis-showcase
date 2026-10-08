import React, { useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Timer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GripVertical,
  Pencil,
  CalendarClock,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CategoryBadge } from '@/lib/categories';
import { sparkFromElement } from '@/lib/celebration';
import TaskRecurrenceBadge from '@/components/habits-tasks/TaskRecurrenceBadge';
import { sortPendingWithOverdueFirst, addDaysToDateKey } from '@/lib/taskListFilters';
import { SectionHeading } from '@/components/layout/PraxisPage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const priorityStyles = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-domain-gold/[0.08] text-domain-gold border-domain-gold/15',
  low: 'bg-white/[0.03] text-muted-foreground border-white/[0.06]',
};

const priorityLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export default function TodayTasks({
  tasks,
  today,
  allTasksForRecurrence,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onNotToday,
  notTodayBusy = false,
  onReorderPending,
  reorderBusy = false,
}) {
  const rowRefs = useRef(new Map());
  const recurrencePool = allTasksForRecurrence ?? tasks;
  const isDone = (task) => task.status === 'completed' || task.status === 'done';
  const completedOn = (task) =>
    task.completed_date || String(task.completed_at || task.updated_date || '').slice(0, 10);
  const pending = sortPendingWithOverdueFirst(
      tasks.filter((t) => !isDone(t)),
      today,
    );
    const overduePending = pending.filter((t) => t.date && today && t.date < today);
    const todayPending = pending.filter((t) => !t.date || !today || t.date >= today);
    const completed = tasks.filter((t) => isDone(t));
    const overdueCount = overduePending.length;
  const cleanedOverdueCount = completed.filter(
    (t) => t.date && today && t.date < today && completedOn(t) === today
  ).length;
  const donePct = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const upcomingOpenCount = React.useMemo(() => {
    if (!allTasksForRecurrence || !today) return 0;
    const endOfWeek = addDaysToDateKey(today, 7);
    return allTasksForRecurrence.filter((t) => {
      if (t.status === 'cancelled' || isDone(t)) return false;
      const d = (t.date || '').slice(0, 10);
      return Boolean(d && d > today && d <= endOfWeek);
    }).length;
  }, [allTasksForRecurrence, today]);

  const handleComplete = (task) => {
    if (!isDone(task)) {
      sparkFromElement(rowRefs.current.get(task.id), 'ember');
    }
    onToggleComplete?.(task);
  };

  const handleDragEnd = (result) => {
    if (!result.destination || reorderBusy) return;
    onReorderPending?.(result.source.index, result.destination.index);
  };

  return (
    <Card className="praxis-dashboard-card">
      <CardHeader className="p-5 pb-4 sm:p-5 sm:pb-4">
        <SectionHeading
          kicker="Hoje"
          title="Tarefas"
          trailing={
            <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 && (
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
              >
                {overdueCount} atrasada{overdueCount === 1 ? '' : 's'}
              </Badge>
            )}
            {cleanedOverdueCount > 0 && (
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/10 text-[10px] text-green-400"
              >
                {cleanedOverdueCount} limpa{cleanedOverdueCount === 1 ? '' : 's'} hoje
              </Badge>
            )}
            <span className="text-sm text-muted-foreground tabular-nums">
              {completed.length}/{tasks.length} concluídas
            </span>
            </div>
          }
        />
        {tasks.length > 0 && (
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2 rail-inset">
            <motion.div
              className="h-full w-full origin-left rounded-full"
              initial={false}
              animate={{ scaleX: Math.max(0, Math.min(1, donePct / 100)) }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              style={{
                transformOrigin: 'left center',
                background: 'linear-gradient(90deg, hsl(var(--domain-ember)), hsl(var(--domain-gold)))',
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2.5 px-5 pb-5 sm:px-5 sm:pb-5">
        <AnimatePresence mode="popLayout" initial={false}>
          {pending.length === 0 && completed.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4 text-center space-y-1.5"
            >
              <p className="text-sm text-muted-foreground">
                {upcomingOpenCount > 0
                  ? `Nenhuma tarefa para hoje · ${upcomingOpenCount} na semana`
                  : 'Nenhuma tarefa para hoje.'}
              </p>
              {upcomingOpenCount > 0 && (
                <Link
                  to="/habitos-tarefas?tab=tasks&scope=week"
                  className="inline-block text-xs font-medium text-primary hover:underline"
                >
                  Ver tarefas da semana →
                </Link>
              )}
            </motion.div>
          )}
                    {overduePending.length > 0 && (
                                          <div className="flex items-center justify-between gap-2 px-1 pt-1">
                                            <div className="text-xs font-semibold text-destructive">
                                              Atrasadas · {overduePending.length}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground/65">Vêm de dias anteriores</p>
                                          </div>
                                        )}
                                        {todayPending.length > 0 && overduePending.length === 0 && (
                                          <div className="flex items-center justify-between gap-2 px-1 pt-1">
                                            <div className="text-xs font-medium text-muted-foreground">
                                              Pendentes de hoje
                                            </div>
                                            <p className="text-[10px] text-muted-foreground/65">Arraste ⋮⋮ para ordenar</p>
                                          </div>
                                        )}
                                      </AnimatePresence>

                  {pending.length > 0 && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="dashboard-today-pending">
                        {(dropProvided) => (
                          <div
                            ref={dropProvided.innerRef}
                            {...dropProvided.droppableProps}
                            className="space-y-3"
                          >
                            {pending.map((task, index) => {
                              const isOverdue = Boolean(task.date && today && task.date < today);
                              const showOverdueDivider =
                                overduePending.length > 0
                                && todayPending.length > 0
                                && index === overduePending.length;
                              return (
                              <React.Fragment key={task.id}>
                                {showOverdueDivider ? (
                                  <div className="flex items-center justify-between gap-2 px-1 pt-2">
                                    <div className="text-xs font-medium text-muted-foreground">
                                      Hoje · {todayPending.length}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/65">Arraste ⋮⋮ para ordenar</p>
                                  </div>
                                ) : null}
                              <Draggable
                                draggableId={String(task.id)}
                                index={index}
                                isDragDisabled={reorderBusy}
                              >
                                {(dragProvided, snapshot) => (
                                  <div
                                    ref={(el) => {
                                      dragProvided.innerRef(el);
                                      if (el) rowRefs.current.set(task.id, el);
                                      else rowRefs.current.delete(task.id);
                                    }}
                                    {...dragProvided.draggableProps}
                                    style={dragProvided.draggableProps.style}
                                    className={cn(
                                      'flex flex-col gap-3 rounded-xl border bg-white/[0.022] p-3.5 transition-[background-color,border-color,box-shadow] sm:flex-row sm:items-start',
                                      snapshot.isDragging
                                        ? 'z-10 border-domain-gold/30 bg-white/[0.045] shadow-lg shadow-black/20'
                                        : isOverdue
                                          ? 'border-destructive/25 bg-destructive/[0.04] hover:border-destructive/35'
                                          : 'border-white/[0.055] hover:border-white/[0.09] hover:bg-white/[0.035]'
                                    )}
                                  >
                          <div className="flex items-start gap-2 flex-1 min-w-0 w-full">
                            <button
                              type="button"
                              className="mt-1.5 shrink-0 rounded-lg p-1 text-muted-foreground touch-manipulation hover:bg-white/[0.03] hover:text-foreground"
                              aria-label="Arrastar para reordenar"
                              {...dragProvided.dragHandleProps}
                            >
                              <GripVertical className="h-5 w-5" />
                            </button>
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleComplete(task)}
                              className="mt-1 h-5 w-5 shrink-0 border-muted-foreground/40 touch-manipulation"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-sm font-semibold leading-snug break-words sm:text-[15px]">{task.title}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <CategoryBadge category={task.category} />
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'border px-2 py-0.5 text-[10px]',
                                    priorityStyles[task.priority || 'medium']
                                  )}
                                >
                                  {priorityLabels[task.priority || 'medium']}
                                </Badge>
                                <TaskRecurrenceBadge task={task} allTasks={recurrencePool} />
                              </div>
                              {task.time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium text-muted-foreground">{task.time}</span>
                                </div>
                              )}
                              {task.date && today && task.date < today && (
                                <div className="flex items-center gap-1 text-destructive">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-xs font-medium">Atrasada desde {task.date}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto shrink-0">
                            {onNotToday ? (
                              <Button
                                type="button"
                                size="default"
                                variant="outline"
                                disabled={notTodayBusy}
                                className="h-9 flex-1 gap-1.5 rounded-lg border-amber-500/25 bg-amber-500/10 px-3 text-xs text-amber-100 touch-manipulation hover:bg-amber-500/20 sm:flex-none sm:min-w-[7.5rem]"
                                onClick={() => onNotToday(task)}
                              >
                                <CalendarClock className="w-4 h-4" />
                                Não hoje
                              </Button>
                            ) : null}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-muted-foreground hover:text-foreground touch-manipulation"
                                  aria-label={`Mais opções para ${task.title}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link to={`/foco?taskId=${task.id}`} className="flex items-center">
                                    <Timer className="mr-2 h-4 w-4" /> Iniciar foco
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditTask?.(task)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                {onNotToday && (
                                  <DropdownMenuItem onClick={() => onNotToday(task)}>
                                    <CalendarClock className="mr-2 h-4 w-4" /> Não hoje
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => onDeleteTask?.(task)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                                              )}
                                            </Draggable>
                                            </React.Fragment>
                                            );
                                          })}
                                          {dropProvided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </DragDropContext>
                                )}

        <AnimatePresence mode="popLayout" initial={false}>
          {completed.length > 0 && (
            <div className="px-1 pt-4 text-xs font-medium text-domain-wellness/80">
              Concluídas hoje
            </div>
          )}
          {completed.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center gap-3 rounded-xl border border-domain-wellness/15 bg-domain-wellness/[0.065] p-3"
            >
              <Checkbox
                checked
                onCheckedChange={() => onToggleComplete(task)}
                className="h-5 w-5 border-domain-wellness data-[state=checked]:bg-domain-wellness touch-manipulation"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-domain-wellness/90 line-through break-words">{task.title}</p>
                {task.date && today && task.date < today && (
                  <p className="text-[11px] text-green-400/80 mt-0.5">Limpa hoje · era de {task.date}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 rounded-lg touch-manipulation text-muted-foreground hover:text-foreground"
                    aria-label={`Opções da tarefa ${task.title}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onEditTask?.(task)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteTask?.(task)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <CategoryBadge category={task.category} className="opacity-60 hidden sm:flex" />
              <CheckCircle2 className="w-5 h-5 text-domain-wellness shrink-0" />
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}