import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CATEGORIES } from '@/lib/categories';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Lightbulb, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = [
  { value: 1, short: 'Seg' },
  { value: 2, short: 'Ter' },
  { value: 3, short: 'Qua' },
  { value: 4, short: 'Qui' },
  { value: 5, short: 'Sex' },
  { value: 6, short: 'Sáb' },
  { value: 0, short: 'Dom' },
];

function BestTimeSuggestion({ onSelect, visible }) {
  const { data, isLoading } = useQuery({
    queryKey: ['bestHours'],
    queryFn: () => praxisApi.insights.bestHours(),
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  if (!visible || isLoading || !data?.best_hours?.length) return null;

  const bestHours = data.best_hours.slice(0, 3);
  const hourLabels = bestHours.map(h => h.label).join(' e ');

  return (
    <div className="flex items-center gap-2 mt-1.5 px-1 py-1.5 bg-secondary/40 rounded-md text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200">
      <Lightbulb className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
      <span className="truncate">💡 Você foca melhor entre {hourLabels}. Agendar?</span>
      <div className="flex gap-1 ml-auto shrink-0">
        {bestHours.map((h) => (
          <button
            key={h.hour}
            type="button"
            onClick={() => onSelect(`${String(h.hour).padStart(2, '0')}:00`)}
            className="px-2 py-0.5 bg-secondary hover:bg-primary hover:text-primary-foreground rounded text-xs font-medium transition-colors cursor-pointer"
          >
            {h.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TaskForm({ onSubmit, onCancel, goals = [], initial = {} }) {
  const initialDays = (() => {
    if (Array.isArray(initial.recurrence_days)) return initial.recurrence_days;
    if (typeof initial.recurrence_days === 'string') {
      try { return JSON.parse(initial.recurrence_days || '[]'); } catch { return []; }
    }
    return [];
  })();

  const [form, setForm] = useState({
    title: initial.title || '',
    description: initial.description || '',
    date: initial.date || '',
    time: initial.time || '',
    duration_minutes: initial.duration_minutes || '',
    priority: initial.priority || 'medium',
    category: initial.category || 'pessoal',
    goal_id: initial.goal_id || '',
    source: initial.source || 'manual',
    recurrence: initial.recurrence || 'none',
    recurrence_days: initialDays,
  });

  const isCreating = !initial.id;
  const recurrenceNeedsDate = form.recurrence !== 'none' && !form.date;
  const willSyncCalendar = Boolean(form.date && form.time);

  const toggleDay = (value) => {
    setForm(f => ({
      ...f,
      recurrence_days: f.recurrence_days.includes(value)
        ? f.recurrence_days.filter(d => d !== value)
        : [...f.recurrence_days, value].sort(),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (recurrenceNeedsDate) return;
    const payload = {
      ...form,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
      recurrence_days: form.recurrence === 'weekly' ? form.recurrence_days : [],
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input placeholder="Título da tarefa" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary/50" />
      <Textarea placeholder="Descrição (opcional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary/50 h-20 resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal bg-secondary/50">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.date ? format(new Date(form.date + 'T12:00:00'), 'dd/MM/yyyy') : 'Data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.date ? new Date(form.date + 'T12:00:00') : undefined} onSelect={(d) => setForm(f => ({ ...f, date: d ? format(d, 'yyyy-MM-dd') : '' }))} /></PopoverContent>
        </Popover>
        <div>
          <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="bg-secondary/50" />
          <BestTimeSuggestion
            visible={isCreating && !form.time}
            onSelect={(time) => setForm(f => ({ ...f, time }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <SelectItem key={key} value={key}>{cat.emoji} {cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Repeat className="w-4 h-4" />
          <span>Recorrência</span>
        </div>
        <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem recorrência</SelectItem>
            <SelectItem value="daily">Todo dia</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
        {form.recurrence === 'weekly' && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {WEEKDAYS.map(d => {
              const active = form.recurrence_days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-md border transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/40 border-border hover:bg-secondary'
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        )}
        {recurrenceNeedsDate && (
          <p className="text-xs text-destructive">⚠️ Defina uma data inicial para a recorrência funcionar.</p>
        )}
        {willSyncCalendar && (
          <p className="text-xs text-sky-400/90">📅 Vai sincronizar com o Google Agenda e lembrar 30/10 min antes.</p>
        )}
      </div>

      {goals.length > 0 && (
        <Select
          value={form.goal_id || 'none'}
          onValueChange={v => setForm(f => ({ ...f, goal_id: v === 'none' ? '' : v }))}
        >
          <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Vincular a meta (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2 justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={recurrenceNeedsDate} className="bg-primary hover:bg-primary/90">{isCreating ? 'Criar Tarefa' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
