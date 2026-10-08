import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { parseRecurrenceDays, normalizePreferredTime } from '@/lib/habits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const WEEK_DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

function initialSteps(initial) {
  if (initial.kind === 'compound' && Array.isArray(initial.children)) {
    return initial.children.map((child) => ({
      id: child.id,
      title: child.title || '',
      preferred_time: normalizePreferredTime(child.preferred_time) || '',
    }));
  }
  return [{ title: '', preferred_time: '' }];
}

export default function HabitForm({ onSubmit, onCancel, goals = [], initial = {} }) {
  const isEditing = Boolean(initial.id);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    kind: initial.kind === 'compound' ? 'compound' : 'simple',
    tracking_mode: initial.tracking_mode || 'check',
    since_date: initial.since_date || '',
    title: initial.title || '',
    description: initial.description || '',
    emoji: initial.emoji || '',
    frequency: initial.frequency || 'daily',
    category: initial.category || 'pessoal',
    streak_target: initial.streak_target || 30,
    goal_id: initial.goal_id || '',
    source: initial.source || 'manual',
    recurrence_days: parseRecurrenceDays(initial),
    target_value: initial.target_value ?? '',
    unit: initial.unit || '',
    quick_increment: initial.quick_increment ?? '',
    preferred_time: normalizePreferredTime(initial.preferred_time) || '',
    children: initialSteps(initial),
  });
  const isCompound = form.kind === 'compound';

  const setKind = (kind) => {
    if (isEditing && kind !== form.kind) return;
    setError('');
    setForm((current) => ({ ...current, kind }));
  };

  const toggleWeekDay = (day) => {
    setForm((current) => {
      const set = new Set(current.recurrence_days);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...current, recurrence_days: [...set].sort((a, b) => a - b) };
    });
  };

  const updateStep = (index, changes) => {
    setForm((current) => ({
      ...current,
      children: current.children.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step
      ),
    }));
  };

  const addStep = () => {
    setForm((current) => ({
      ...current,
      children: [...current.children, { title: '', preferred_time: '' }],
    }));
  };

  const removeStep = (index) => {
    setForm((current) => ({
      ...current,
      children: current.children.filter((_, stepIndex) => stepIndex !== index),
    }));
  };

  const moveStep = (index, direction) => {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.children.length) return current;
      const children = [...current.children];
      [children[index], children[target]] = [children[target], children[index]];
      return { ...current, children };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError(isCompound ? 'Dê um nome para a rotina.' : 'Dê um nome para o hábito.');
      return;
    }
    if (isCompound && form.children.length === 0) {
      setError('Adicione pelo menos um passo.');
      return;
    }
    if (isCompound && form.children.some((step) => !step.title.trim())) {
      setError('Todo passo precisa de um nome.');
      return;
    }

    const common = {
      kind: form.kind,
      tracking_mode: form.tracking_mode,
      since_date: form.since_date,
      title: form.title.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      category: form.category,
      goal_id: form.goal_id || null,
      source: form.source,
      recurrence_days: form.frequency === 'weekly' ? form.recurrence_days : [],
    };
    if (isCompound) {
      onSubmit({
        ...common,
        emoji: form.emoji.trim(),
        children: form.children.map((step) => ({
          ...(step.id ? { id: step.id } : {}),
          title: step.title.trim(),
          preferred_time: normalizePreferredTime(step.preferred_time) || '',
        })),
      });
      return;
    }

    onSubmit({
      ...common,
      streak_target: Number(form.streak_target),
      target_value: form.target_value === '' || form.target_value == null
        ? null
        : Number(form.target_value),
      unit: form.unit?.trim() || '',
      quick_increment: form.quick_increment === '' || form.quick_increment == null ? null : Number(form.quick_increment),
      preferred_time: normalizePreferredTime(form.preferred_time) || '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Tipo</p>
        <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.025] p-1">
          <button
            type="button"
            aria-pressed={!isCompound}
            onClick={() => setKind('simple')}
            className={cn(
              'min-h-10 rounded-lg px-3 text-sm font-medium transition-colors',
              !isCompound ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              isEditing && isCompound && 'cursor-not-allowed opacity-45',
            )}
          >
            Simples
          </button>
          <button
            type="button"
            aria-pressed={isCompound}
            onClick={() => setKind('compound')}
            className={cn(
              'min-h-10 rounded-lg px-3 text-sm font-medium transition-colors',
              isCompound ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              isEditing && !isCompound && 'cursor-not-allowed opacity-45',
            )}
          >
            Rotina (composto)
          </button>
        </div>
        {isEditing && (
          <p className="text-[11px] text-muted-foreground">O tipo não muda depois de criado.</p>
        )}
      </div>

      <div className={cn('grid gap-3', isCompound && 'grid-cols-[76px_minmax(0,1fr)]')}>
        {isCompound && (
          <div className="space-y-1.5">
            <label htmlFor="habit-emoji" className="text-xs font-medium text-muted-foreground">Emoji</label>
            <Input
              id="habit-emoji"
              aria-label="Emoji da rotina"
              placeholder="⚡"
              maxLength={8}
              value={form.emoji}
              onChange={(event) => setForm((current) => ({ ...current, emoji: event.target.value }))}
              className="bg-secondary/50 text-center text-lg"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="habit-title" className="text-xs font-medium text-muted-foreground">
            {isCompound ? 'Nome da rotina' : 'Nome do hábito'}
          </label>
          <Input
            id="habit-title"
            placeholder={isCompound ? 'Ex.: Rotina matinal' : 'Ex.: Beber água'}
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="bg-secondary/50"
          />
        </div>
      </div>

      {!isCompound && (
        <Textarea
          aria-label="Descrição"
          placeholder="Descrição (opcional)"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="h-20 resize-none bg-secondary/50"
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select value={form.frequency} onValueChange={(value) => setForm((current) => ({ ...current, frequency: value }))}>
          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekdays">Dias úteis</SelectItem>
            <SelectItem value="weekends">Fins de semana</SelectItem>
            <SelectItem value="weekly">Semanal (escolher dias)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}>
          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <SelectItem key={key} value={key}>{category.emoji} {category.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.frequency === 'weekly' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Dias da semana</p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleWeekDay(value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  form.recurrence_days.includes(value)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isCompound ? (
        <div className="space-y-3 border-t border-white/[0.07] pt-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Passos da rotina</p>
              <p className="text-xs text-muted-foreground">A ordem abaixo é a ordem de execução.</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={addStep}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar passo
            </Button>
          </div>
          <div className="space-y-2">
            {form.children.map((step, index) => (
              <div
                key={step.id || `new-step-${index}`}
                className="grid gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:grid-cols-[28px_minmax(0,1fr)_126px_auto] sm:items-end"
              >
                <span className="self-center text-center text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <label htmlFor={`step-title-${index}`} className="text-[11px] text-muted-foreground">Passo</label>
                  <Input
                    id={`step-title-${index}`}
                    value={step.title}
                    placeholder="Nome do passo"
                    onChange={(event) => updateStep(index, { title: event.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`step-time-${index}`} className="text-[11px] text-muted-foreground">Horário opcional</label>
                  <Input
                    id={`step-time-${index}`}
                    type="time"
                    value={step.preferred_time}
                    onChange={(event) => updateStep(index, { preferred_time: event.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    disabled={index === 0}
                    aria-label={`Subir passo ${index + 1}`}
                    onClick={() => moveStep(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    disabled={index === form.children.length - 1}
                    aria-label={`Descer passo ${index + 1}`}
                    onClick={() => moveStep(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover passo ${index + 1}`}
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor="habit-preferred-time" className="text-xs font-medium text-muted-foreground">
              Horário preferido (opcional)
            </label>
            <Input
              id="habit-preferred-time"
              type="time"
              value={form.preferred_time}
              onChange={(event) => setForm((current) => ({ ...current, preferred_time: event.target.value }))}
              className="bg-secondary/50"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="number"
              placeholder="Meta de streak (dias)"
              value={form.streak_target}
              onChange={(event) => setForm((current) => ({ ...current, streak_target: event.target.value }))}
              className="bg-secondary/50"
            />
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="Meta diária (opcional, ex: 8)"
              value={form.target_value}
              onChange={(event) => setForm((current) => ({ ...current, target_value: event.target.value }))}
              className="bg-secondary/50"
            />
          </div>
          {form.target_value !== '' && form.target_value != null && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Unidade (ex: copos, min, km, L)"
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                className="bg-secondary/50"
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Passo rápido (opcional, ex: 0.5)"
                aria-label="Passo rápido para somar à meta"
                value={form.quick_increment}
                onChange={(event) => setForm((current) => ({ ...current, quick_increment: event.target.value }))}
                className="bg-secondary/50"
              />
            </div>
          )}
        </>
      )}

      {goals.length > 0 && (
        <Select
          value={form.goal_id || 'none'}
          onValueChange={(value) => setForm((current) => ({ ...current, goal_id: value === 'none' ? '' : value }))}
        >
          <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Vincular a meta (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {goals.map((goal) => <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          {isEditing ? 'Salvar alterações' : isCompound ? 'Criar rotina' : 'Criar hábito'}
        </Button>
      </div>
    </form>
  );
}
