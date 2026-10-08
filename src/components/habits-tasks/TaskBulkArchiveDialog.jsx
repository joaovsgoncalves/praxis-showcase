import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cleanTaskTitle } from '@/components/habits-tasks/NoiseCleanupDialog';

export default function TaskBulkArchiveDialog({
  open,
  onOpenChange,
  tasks,
  busy,
  onConfirm,
}) {
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (open && tasks?.length) {
      setSelected(new Set(tasks.map((t) => t.id)));
    }
  }, [open, tasks]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = tasks.length > 0 && selected.size === tasks.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Arquivar tarefas</DialogTitle>
          <DialogDescription>
            As selecionadas saem das listas ativas (status cancelada). Nada é apagado do banco.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa selecionável.</p>
          ) : (
            tasks.map((task) => (
              <label
                key={task.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3"
              >
                <Checkbox
                  checked={selected.has(task.id)}
                  onCheckedChange={() => toggle(task.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{cleanTaskTitle(task.title)}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.date || 'sem data'}
                    {task.time ? ` · ${task.time}` : ''}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || selected.size === 0}
            onClick={() => {
              if (
                !window.confirm(
                  `Arquivar ${selected.size} tarefa(s)? Elas deixam de aparecer nas listas do dia.`,
                )
              ) {
                return;
              }
              onConfirm(Array.from(selected));
            }}
          >
            Arquivar selecionadas ({selected.size})
          </Button>
        </DialogFooter>
        {tasks.length > 1 && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))}
          >
            {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}