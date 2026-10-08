import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Activity, Dumbbell, History, ListChecks, Play, Utensils } from 'lucide-react';
import { useWorkoutSessionActive } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/jota-fit', label: 'Hoje', icon: Play, end: true },
  { to: '/jota-fit/programa', label: 'Programa', icon: ListChecks },
  { to: '/jota-fit/biblioteca', label: 'Biblioteca', icon: Dumbbell },
  { to: '/jota-fit/progresso', label: 'Progresso', icon: History },
  { to: '/jota-fit/corpo', label: 'Corpo', icon: Activity },
  { to: '/jota-fit/nutricao', label: 'Dieta', icon: Utensils },
];

const linkClass = ({ isActive }) =>
  cn(
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors praxis-touch-target',
    isActive ? 'text-primary' : 'text-muted-foreground',
  );

export default function JotaFitLayout() {
  const sessionActive = useWorkoutSessionActive();

  return (
    <div className={sessionActive ? undefined : 'flex min-h-screen flex-col bg-background'}>
      {sessionActive ? null : (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <h1 className="font-display text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            JOTA FIT
          </h1>
          <Link
            to="/"
            className="shrink-0 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Praxis
          </Link>
        </header>
      )}

      <div className={sessionActive ? undefined : 'flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4'}>
        <Outlet />
      </div>

      {sessionActive ? null : (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
          aria-label="Seções do Jota Fit"
        >
          <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
