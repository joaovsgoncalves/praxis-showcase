import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { Flame, Target, Timer } from 'lucide-react';
import { fortalezaDateKey, fortalezaDisplayDate } from '@/lib/dates';

const DEFAULT_FOCUS_GOAL_SEC = 25 * 60 * 4;

export default function HeroDay({
  habitsDone = 0,
  habitsTotal = 0,
  tasksDone = 0,
  tasksTotal = 0,
  userName,
}) {
  const { greeting, emoji, tagline, clock } = useTimeOfDay();
  const today = fortalezaDateKey();

  const { data: focusToday = [] } = useQuery({
    queryKey: ['focusToday', today],
    queryFn: () => praxisApi.focus.list({ date: today }),
    staleTime: 30_000,
  });
  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => praxisApi.user.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => praxisApi.habits.list({ status: 'active' }),
    staleTime: 60_000,
  });

  const focusGoalSec = settings?.pomodoro_focus
    ? settings.pomodoro_focus * 60 * 4
    : DEFAULT_FOCUS_GOAL_SEC;
  const focusSec = focusToday.reduce((sum, session) => sum + (session.duration_seconds || 0), 0);

  const trackableItemsTotal = habitsTotal + tasksTotal;
  const dayPct = trackableItemsTotal > 0
    ? ((habitsDone + tasksDone) / trackableItemsTotal) * 100
    : (focusGoalSec > 0 ? Math.min(100, (focusSec / focusGoalSec) * 100) : 0);
  const roundedDayPct = Math.round(dayPct);

  const bestStreak = useMemo(
    () => habits.reduce((max, habit) => Math.max(max, habit.current_streak || 0), 0),
    [habits],
  );

  const dateStr = format(fortalezaDisplayDate(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const focusMin = Math.round(focusSec / 60);
  const focusGoalMin = Math.round(focusGoalSec / 60);

  const missionStats = [
    { label: 'Tarefas', value: `${tasksDone}/${tasksTotal}`, icon: Target, tone: 'text-domain-ember' },
    { label: 'Hábitos', value: `${habitsDone}/${habitsTotal}`, icon: Flame, tone: 'text-domain-wellness' },
    { label: 'Foco', value: `${focusMin}/${focusGoalMin}m`, icon: Timer, tone: 'text-domain-focus' },
  ];

  return (
    <section className="praxis-dashboard-summary praxis-tactile-card relative overflow-hidden rounded-2xl border border-amber-500/15 bg-card/70 p-4 sm:p-5">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-amber-500/90 sm:text-xs">
            <span>
              {emoji} Praxis · {dateStr}
            </span>
            <span className="text-amber-500/35" aria-hidden>
              ·
            </span>
            <time
              className="tabular-nums tracking-wide text-amber-400/95"
              dateTime={clock}
            >
              {clock}
            </time>
          </p>
          <h1 className="praxis-title mt-1.5 text-xl font-bold leading-tight tracking-[-0.04em] sm:text-2xl">
            {greeting}
            {userName ? `, ${userName.split(' ')[0]}` : ''}
          </h1>
          <p
            key={tagline}
            className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm"
          >
            {tagline}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:justify-end">
          {bestStreak > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1 text-xs font-semibold text-amber-400 shadow-[0_0_18px_-6px_rgba(245,158,11,0.55)]">
              <Flame className="h-4 w-4 animate-pulse fill-amber-500/25" aria-hidden />
              {bestStreak} dias
            </span>
          ) : null}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/20 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <svg
              className="h-14 w-14 -rotate-90 transform"
              viewBox="0 0 36 36"
              role="img"
              aria-label={`Progresso do dia: ${roundedDayPct}%`}
            >
              <path
                className="text-white/15"
                strokeWidth="3.4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-400 transition-all duration-500 ease-out"
                strokeDasharray={`${Math.max(roundedDayPct, roundedDayPct === 0 ? 0 : roundedDayPct)}, 100`}
                strokeWidth="3.6"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-sm font-extrabold tabular-nums text-foreground">
              {roundedDayPct}%
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08] rail-inset">
        <div
          className="praxis-progress-fill h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
          style={{ width: `${Math.max(0, Math.min(100, roundedDayPct))}%` }}
        />
      </div>

      <div className="relative mt-3 grid grid-cols-3 divide-x divide-white/[0.07] rounded-xl border border-white/[0.07] bg-black/15">
        {missionStats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex min-w-0 items-center gap-2 px-2.5 py-2.5 sm:px-3 sm:py-3">
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/[0.06] sm:flex">
              <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-0.5 truncate text-xs font-semibold tabular-nums sm:text-sm">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
