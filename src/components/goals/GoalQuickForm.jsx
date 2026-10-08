import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMEFRAME_OPTIONS = [
  { value: 'short', label: 'Curto prazo' },
  { value: 'medium', label: 'Médio prazo' },
  { value: 'long', label: 'Longo prazo' },
];

/**
 * Cadastro/edição rápida de meta: título + horizonte obrigatórios;
 * descrição e prazo opcionais. Sem tarefa/hábito.
 */
export default function GoalQuickForm({
  initial = null,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = 'Salvar meta',
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [timeframe, setTimeframe] = useState(initial?.timeframe || 'short');
  const [deadline, setDeadline] = useState(initial?.deadline || '');

  const canSubmit = title.trim().length >= 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    onSubmit?.({
      title: trimmed,
      description: description.trim(),
      timeframe,
      // empty string → API clears / leaves null on create
      deadline: deadline || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal-quick-title">O que você quer alcançar?</Label>
        <Input
          id="goal-quick-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Correr 5 km sem parar"
          className="min-h-11 bg-secondary/50"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Horizonte</Label>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="min-h-11 bg-secondary/50" aria-label="Horizonte da meta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEFRAME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-quick-desc">Descrição (opcional)</Label>
        <Textarea
          id="goal-quick-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contexto, por quê, como vai medir…"
          className="min-h-[72px] resize-none bg-secondary/50"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-quick-deadline">Prazo (opcional)</Label>
        <Input
          id="goal-quick-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="min-h-11 bg-secondary/50"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-full"
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={!canSubmit || busy}
          className="min-h-11 rounded-full"
        >
          {busy ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
