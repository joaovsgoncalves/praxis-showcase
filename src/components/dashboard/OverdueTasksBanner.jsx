import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OverdueTasksBanner({ count }) {
  if (!count || count <= 0) return null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <span>
          <strong>{count}</strong> {count === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
        </span>
      </div>
      <Button asChild size="sm" variant="secondary" className="praxis-touch-target">
        <Link to="/habitos-tarefas?tab=tasks&scope=overdue">Ver atrasadas</Link>
      </Button>
    </div>
  );
}