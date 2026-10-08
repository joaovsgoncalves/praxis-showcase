import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { praxisApi } from '@/api/praxisClient';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Sparkles } from 'lucide-react';

/** Barra compacta de XP — rodapé do dashboard, sem competir com Agora. */
export default function XpProgressStrip({ className = '' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => praxisApi.gamification.get(),
    staleTime: 45_000,
  });

  if (isLoading || !data) return null;

  const { level, level_name, xp_total, next_level_xp, progress_pct } = data;
  const unlocked = (data.achievements || []).filter((achievement) => achievement.unlocked).length;

  return (
    <div
      className={`rounded-2xl border border-white/[0.05] bg-white/[0.018] px-4 py-3.5 sm:px-5 ${className}`}
      aria-label="Progresso de nível no Praxis"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:min-w-[210px]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-domain-gold/15 bg-domain-gold/[0.06]">
            <Sparkles className="h-3.5 w-3.5 text-domain-gold" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground/85">Nv. {level} · {level_name}</p>
            <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
              {xp_total.toLocaleString('pt-BR')}{next_level_xp ? ` / ${next_level_xp.toLocaleString('pt-BR')} XP` : ' XP'}
            </p>
          </div>
        </div>

        <Progress value={progress_pct} className="h-1.5 flex-1 [&>div]:bg-domain-gold" />

        {unlocked > 0 ? (
          <Link
            to="/conquistas"
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-domain-gold"
          >
            {unlocked} conquista{unlocked !== 1 ? 's' : ''}
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
