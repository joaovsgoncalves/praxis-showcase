import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/**
 * Sheet de “Não rolou” com anotação opcional em texto livre.
 */
export default function SkipHabitSheet({
  open,
  onOpenChange,
  habitTitle = 'Hábito',
  outcome = 'open',
  initialNote = '',
  busy = false,
  onConfirm,
  onUndo,
  onMarkDone,
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setNote(initialNote || '');
    }
  }, [open, initialNote, habitTitle]);

  const submit = () => {
    const cleaned = String(note || '').trim().slice(0, 280);
    onConfirm?.({
      skipReason: null,
      skipNote: cleaned || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-white/10 bg-card">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{habitTitle}</SheetTitle>
          <SheetDescription>
            {outcome === 'skipped'
              ? 'Já registrado como não rolou. Pode desfazer, adicionar uma anotação ou marcar feito.'
              : 'Se quiser, anote o motivo abaixo. É opcional.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Anotação (opcional)
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              placeholder="Se quiser, anote o que houve..."
              className="min-h-[88px] resize-none border-amber-500/20 bg-white/[0.03] text-sm"
              disabled={busy}
              autoFocus
            />
          </div>

          <Button
            type="button"
            className="w-full rounded-full bg-amber-600 text-white hover:bg-amber-500"
            disabled={busy}
            onClick={submit}
          >
            {outcome === 'skipped' ? 'Salvar anotação' : 'Registrar'}
          </Button>

          {outcome === 'skipped' && onUndo ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              disabled={busy}
              onClick={onUndo}
            >
              Desfazer
            </Button>
          ) : null}

          {outcome !== 'done' && onMarkDone ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full text-muted-foreground"
              disabled={busy}
              onClick={onMarkDone}
            >
              Na verdade fiz — marcar feito
            </Button>
          ) : null}

          {outcome === 'done' && onUndo ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              disabled={busy}
              onClick={onUndo}
            >
              Desfazer feito
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

