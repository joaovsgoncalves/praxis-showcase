import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IDEA_STATUS_LABELS, IDEA_STATUSES } from '@/lib/ideas';

/** Form leve — sem hora, prioridade alta nem data obrigatória */
export default function IdeaForm({ onSubmit, onCancel, initial = {} }) {
  const [form, setForm] = useState({
    title: initial.title || '',
    description: initial.description || '',
    idea_status: initial.idea_status || 'capturada',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description?.trim() || '',
      category: 'ideias',
      priority: 'low',
      status: 'pending',
      source: 'manual_idea',
      idea_status: form.idea_status,
      date: null,
      time: null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">O que você quer lembrar?</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex.: App de checklist para farmácias pequenas"
          className="mt-1"
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Contexto (opcional)</label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Por que surgiu, próximo passo em mente, links…"
          rows={3}
          className="mt-1"
        />
      </div>
      {initial.id && (
        <div>
          <label className="text-sm text-muted-foreground">Status</label>
          <Select value={form.idea_status} onValueChange={(v) => setForm({ ...form, idea_status: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {IDEA_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{IDEA_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar ideia</Button>
      </div>
    </form>
  );
}