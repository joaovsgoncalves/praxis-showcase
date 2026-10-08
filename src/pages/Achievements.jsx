import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar } from 'lucide-react';
import { PageHero, PraxisEmptyState } from '@/components/layout/PraxisPage';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const levelEmojis = {
  1: '🌱',
  2: '📖',
  3: '💪',
  4: '🎯',
  5: '🔥',
  6: '🧠',
  7: '👑',
};

function AchievementCard({ achievement, index }) {
  const { emoji, name, description, xp_reward, unlocked, unlocked_at } = achievement;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        className={cn(
          'h-full transition-colors duration-200',
          unlocked
            ? 'bg-card border-gold/30 hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10'
            : 'bg-card/50 border-border/50 opacity-60 grayscale hover:opacity-75'
        )}
      >
        <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
          {/* Emoji */}
          <span className={cn('text-4xl', !unlocked && 'filter grayscale')}>
            {unlocked ? (emoji || '🏆') : '🔒'}
          </span>

          {/* Name */}
          <h3 className={cn(
            'text-sm font-semibold',
            unlocked ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {name}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          )}

          {/* XP Reward */}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              unlocked
                ? 'bg-gold/10 text-gold border-gold/20'
                : 'bg-secondary/40 text-muted-foreground border-border/50'
            )}
          >
            +{xp_reward} XP
          </Badge>

          {/* Unlock date or locked status */}
          {unlocked && unlocked_at ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(unlocked_at), 'dd/MM/yyyy')}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/60">
              🔒 Bloqueado
            </span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Achievements() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => praxisApi.gamification.get(),
  });

  const achievements = data?.achievements || [];

  // Sort: unlocked first, then locked
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return 0;
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="praxis-page">
      <PageHero
        kicker="Progresso"
        kickerIcon={Trophy}
        kickerClassName="text-gold"
        title="Conquistas"
        description="Complete tarefas e hábitos para desbloquear medalhas."
      />

      {!isLoading && unlockedCount > 0 && (
        <p className="text-sm text-muted-foreground -mt-4">
          <span className="tabular-nums font-medium text-foreground">{unlockedCount}</span>
          {' '}desbloqueada{unlockedCount !== 1 ? 's' : ''}
        </p>
      )}

      {data && (
        <Card className="bg-card border-gold/20">
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-4xl">{levelEmojis[data.level] || '⭐'}</span>
            <div>
              <p className="text-lg font-bold text-gold">
                Nível {data.level} — {data.level_name}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {data.xp_total} XP total · Próximo nível em {data.next_level_xp - data.xp_total} XP
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="mx-auto w-full max-w-xl">
          <PraxisEmptyState
            icon={Trophy}
            title="Erro ao carregar conquistas"
            description="Tenta de novo em instantes. Se continuar, confere a conexão."
          />
        </div>
      )}

      {!isLoading && !isError && achievements.length === 0 && (
        <div className="mx-auto w-full max-w-xl">
          <PraxisEmptyState
            icon={Trophy}
            title="Nenhuma conquista disponível ainda"
            description="Continue completando tarefas e hábitos para desbloquear medalhas."
          />
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && achievements.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sorted.map((achievement, index) => (
            <AchievementCard
              key={achievement.id || achievement.slug || index}
              achievement={achievement}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
