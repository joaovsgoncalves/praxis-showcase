import React from 'react';
import { formatTaskTimeLabel } from '@/lib/nowTask';

const LANES = [
  ['obrigatorio', 'Obrigatório'],
  ['renda', 'Renda'],
  ['avanco', 'Avanço'],
];

export default function TodayPriorities({ priorities }) {
  const filled = LANES.filter(([key]) => priorities?.[key]);
  if (!filled.length) return null;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3 sm:px-5" aria-labelledby="today-priorities-title">
      <h2 id="today-priorities-title" className="text-xs font-medium text-muted-foreground">Prioridades</h2>
      <div className="mt-2 divide-y divide-white/[0.05]">
        {filled.map(([key, label]) => {
          const task = priorities[key];
          const time = formatTaskTimeLabel(task);
          return (
            <div key={key} className="flex min-h-11 items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="w-24 shrink-0 text-xs font-medium text-domain-gold/85">{label}</span>
              <span className="min-w-0 truncate text-sm text-foreground/90">
                {task.title}{time ? ` · ${time}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
