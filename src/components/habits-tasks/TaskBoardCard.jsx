import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarClock,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTaskOpen, cleanPriorityPrefix } from '@/lib/tasks';
import { fortalezaAddDays } from '@/lib/dates';

const PRIORITY_CONFIG = {
  high: {
    label: 'Alta',
    dotClass: 'bg-rose-500',
  },
  medium: {
    label: 'Média',
    dotClass: 'bg-amber-400',
  },
  low: {
    label: 'Baixa',
    dotClass: 'bg-emerald-500',
  },
};

const COLUMN_NAMES = {
  inbox: 'Caixa',
  todo: 'A fazer',
  doing: 'Andamento',
  done: 'Feito',
};

function formatBoardRelativeDate(dateStr, timeStr, today) {
  const cleanTime = timeStr ? String(timeStr).slice(0, 5) : null;
  if (!dateStr) {
    return cleanTime || null;
  }

  let dateLabel = null;
  if (dateStr === today) {
    dateLabel = 'Hoje';
  } else if (dateStr === fortalezaAddDays(today, 1)) {
    dateLabel = 'Amanhã';
  } else if (dateStr === fortalezaAddDays(today, -1)) {
    dateLabel = 'Ontem';
  } else {
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const [ty, tm, td] = today.split('-').map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    if (diffDays > 1 && diffDays < 7) {
      dateLabel = weekdays[targetDate.getDay()];
    } else if (diffDays < -1 && diffDays > -7) {
      dateLabel = weekdays[targetDate.getDay()];
    } else {
      dateLabel = String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0');
    }
  }

  if (dateLabel && cleanTime) {
    return dateLabel + ', ' + cleanTime;
  }
  return dateLabel || cleanTime || null;
}

export default function TaskBoardCard({
  task,
  today,
  currentColumn,
  isDragDisabled = false,
  dragProvided,
  snapshot,
  onToggleComplete,
  onMoveToColumn,
  onEdit,
  onDelete,
  onNotToday,
}) {
  const isDone = task.status === 'completed' || task.status === 'done';
  const showNotToday =
    isTaskOpen(task) &&
    task.category !== 'ideias' &&
    (!task.date || task.date <= today);

  const relativeDateText = formatBoardRelativeDate(task.date, task.time, today);
  const priority = task.priority || 'medium';
  const priorityInfo = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <div
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      {...(!isDragDisabled ? dragProvided?.dragHandleProps : {})}
      style={dragProvided?.draggableProps?.style}
      className={cn(
        'group relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border px-3 py-2.5 transition-all select-none',
        snapshot?.isDragging
          ? 'z-50 border-domain-gold/40 bg-card shadow-2xl shadow-black/80 ring-1 ring-domain-gold/30'
          : 'border-white/[0.06] bg-[#161a23]/90 hover:border-white/[0.12] hover:bg-[#1c212c]',
        isDone && 'opacity-60',
        !isDragDisabled && 'cursor-grab active:cursor-grabbing'
      )}
    >
      {/* Linha 1: Checkbox + Título (line-clamp-1) + Menu ⋯ */}
      <div className="flex items-center gap-2 min-w-0">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => onToggleComplete?.(task)}
          className="h-3.5 w-3.5 rounded shrink-0 border-white/25 data-[state=checked]:bg-domain-gold data-[state=checked]:border-domain-gold data-[state=checked]:text-primary-foreground touch-manipulation"
          aria-label={'Completar ' + cleanPriorityPrefix(task.title)}
          onClick={(e) => e.stopPropagation()}
        />

        <p
          className={cn(
            'min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-1 break-normal overflow-hidden',
            isDone ? 'line-through text-muted-foreground/70' : 'text-stone-200'
          )}
          title={cleanPriorityPrefix(task.title)}
        >
          {cleanPriorityPrefix(task.title)}
        </p>

        <div className="shrink-0 -mr-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-muted-foreground/60 hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity touch-manipulation"
                aria-label={'Opções de ' + cleanPriorityPrefix(task.title)}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Mover para
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40">
                  {['inbox', 'todo', 'doing', 'done'].map((colKey) => (
                    <DropdownMenuItem
                      key={colKey}
                      disabled={currentColumn === colKey}
                      onClick={() => onMoveToColumn?.(task, colKey)}
                    >
                      {COLUMN_NAMES[colKey]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit?.(task)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              {showNotToday && onNotToday ? (
                <DropdownMenuItem onClick={() => onNotToday(task)}>
                  <CalendarClock className="mr-2 h-4 w-4" /> Não hoje
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(task)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Linha 2: Meta (hora/data relativa + ponto colorido de prioridade) */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 pl-5.5 leading-none">
        {relativeDateText && (
          <span className="inline-flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3 text-muted-foreground/60" />
            <span>{relativeDateText}</span>
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityInfo.dotClass)} />
          <span className="text-muted-foreground/75">{priorityInfo.label}</span>
        </span>
      </div>
    </div>
  );
}
