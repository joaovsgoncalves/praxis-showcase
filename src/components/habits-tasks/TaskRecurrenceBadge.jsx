import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatTaskRecurrenceLabel,
  getNextOccurrencePreview,
  formatNextDateBr,
} from '@/lib/taskRecurrence';

/**
 * Badge de recorrência + preview da próxima data (ao concluir ou já agendada).
 */
export default function TaskRecurrenceBadge({ task, allTasks = [], className }) {
  if (!task?.recurrence || task.recurrence === 'none') return null;

  const label = formatTaskRecurrenceLabel(task);
  const isDone = task.status === 'completed' || task.status === 'done';
  const preview = !isDone ? getNextOccurrencePreview(task, allTasks) : null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-blue-500/25 bg-blue-500/10 text-[10px] text-blue-200 sm:text-xs',
        className,
      )}
      title={label}
    >
      <Repeat className="h-3 w-3 shrink-0 opacity-80" />
      <span className="truncate max-w-[10rem] sm:max-w-none">{label}</span>
      {preview?.nextDate && (
        <span className="text-muted-foreground">
          · Próxima: {formatNextDateBr(preview.nextDate)}
          {preview.alreadyScheduled ? ' ✓' : ''}
        </span>
      )}
    </Badge>
  );
}