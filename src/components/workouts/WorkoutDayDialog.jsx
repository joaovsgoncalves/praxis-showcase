import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function WorkoutDayDialog({ open, onOpenChange, initial = null, onSubmit, busy = false }) {
  const [form, setForm] = useState({
    name: '',
    day_type: 'training',
    estimated_duration_minutes: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initial?.name || '',
      day_type: initial?.day_type || 'training',
      estimated_duration_minutes: initial?.estimated_duration_minutes ?? '',
      notes: initial?.notes || '',
    });
  }, [open, initial]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || busy) return;
    onSubmit?.({
      name: form.name.trim(),
      day_type: form.day_type,
      estimated_duration_minutes:
        form.day_type === 'training' && form.estimated_duration_minutes !== ''
          ? Number(form.estimated_duration_minutes)
          : null,
      notes: form.notes.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar dia' : 'Adicionar dia'}</DialogTitle>
          <DialogDescription>
            Crie um treino normal ou um dia de descanso dentro do ciclo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workout-day-name">Nome</Label>
            <Input
              id="workout-day-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ex.: Pull 2"
              autoFocus
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo do dia</Label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo do dia">
              {[
                { value: 'training', label: 'Treino' },
                { value: 'rest', label: 'Descanso' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={form.day_type === option.value}
                  onClick={() => setForm((current) => ({ ...current, day_type: option.value }))}
                  className={cn(
                    'min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                    form.day_type === option.value
                      ? 'border-primary bg-primary/12 text-foreground'
                      : 'border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {form.day_type === 'training' ? (
            <div className="space-y-2">
              <Label htmlFor="workout-day-duration">Duração estimada <span className="text-muted-foreground">(min)</span></Label>
              <Input
                id="workout-day-duration"
                type="number"
                inputMode="numeric"
                min="1"
                max="1440"
                value={form.estimated_duration_minutes}
                onChange={(event) => setForm((current) => ({ ...current, estimated_duration_minutes: event.target.value }))}
                placeholder="45"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="workout-day-notes">Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="workout-day-notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              placeholder="Foco do treino, observações..."
              maxLength={500}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!form.name.trim() || busy}>
              {busy ? 'Salvando...' : initial ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
