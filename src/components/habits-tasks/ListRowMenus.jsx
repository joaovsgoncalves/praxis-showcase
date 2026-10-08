import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ArrowUp, ArrowDown, Pencil, Trash2, CalendarClock, MinusCircle, Sliders } from 'lucide-react';

/** Menu ⋯ — reordenar, editar, excluir */
export function TaskRowMenu({
  label,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onNotToday,
  showNotToday = false,
  disableUp,
  disableDown,
  busy,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label={`Mais ações — ${label}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled={busy || disableUp} onClick={onMoveUp}>
          <ArrowUp className="mr-2 h-4 w-4" /> Subir
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy || disableDown} onClick={onMoveDown}>
          <ArrowDown className="mr-2 h-4 w-4" /> Descer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        {showNotToday && onNotToday ? (
          <DropdownMenuItem onClick={onNotToday}>
            <CalendarClock className="mr-2 h-4 w-4" /> Não hoje
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HabitRowMenu({
  label,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onNaoRolou,
  onNomear,
  onUndoDayOutcome,
  onAdjustQuantity,
  hasValue = false,
  dayOutcome,
  canCheckIn = false,
  disableUp,
  disableDown,
  busy,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label={`Mais ações — ${label}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled={busy || disableUp} onClick={onMoveUp}>
          <ArrowUp className="mr-2 h-4 w-4" /> Subir
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy || disableDown} onClick={onMoveDown}>
          <ArrowDown className="mr-2 h-4 w-4" /> Descer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        {canCheckIn && onAdjustQuantity ? (
          <DropdownMenuItem onClick={onAdjustQuantity}>
            <Sliders className="mr-2 h-4 w-4" /> Ajustar quantidade
          </DropdownMenuItem>
        ) : null}
        {canCheckIn && dayOutcome !== 'skipped' && onNaoRolou ? (
          <DropdownMenuItem onClick={onNaoRolou}>
            <MinusCircle className="mr-2 h-4 w-4" /> Não rolou
          </DropdownMenuItem>
        ) : null}
        {canCheckIn && dayOutcome === 'skipped' && onNomear ? (
          <DropdownMenuItem onClick={onNomear}>
            Nomear falha
          </DropdownMenuItem>
        ) : null}
        {canCheckIn && (dayOutcome === 'done' || dayOutcome === 'skipped' || hasValue) && onUndoDayOutcome ? (
          <DropdownMenuItem onClick={onUndoDayOutcome}>
            Desfazer registro do dia
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
