import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

const levelEmojis = {
  1: '🌱',
  2: '📖',
  3: '💪',
  4: '🎯',
  5: '🔥',
  6: '🧠',
  7: '👑',
};

function ConfettiEffect() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#D4AF37', '#FFD700', '#FFA500', '#FFFFFF'];
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);
  return null;
}

export default function GamificationWidget() {
  const levelUpShown = useRef(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => praxisApi.gamification.get(),
    refetchInterval: 30_000,
  });

  // Detect level up from mutation cache is handled externally via addXp.
  // This widget simply displays the current state.
  // We listen for leveled_up from the addXp mutation responses via a global event.
  useEffect(() => {
    const handler = (e) => {
      const { leveled_up, level, level_name } = e.detail || {};
      if (leveled_up && !levelUpShown.current.has(level)) {
        levelUpShown.current.add(level);
        toast.success('Subiu de nível no Praxis', { description: `Nível ${level} — ${level_name}`, duration: 6000 });
        // Dispatch custom event so the widget can show confetti
        window.dispatchEvent(new CustomEvent('praxis-confetti'));
      }
    };
    window.addEventListener('praxis-level-up', handler);
    return () => window.removeEventListener('praxis-level-up', handler);
  }, []);

  const [showConfetti, setShowConfetti] = React.useState(false);
  useEffect(() => {
    const handler = () => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    };
    window.addEventListener('praxis-confetti', handler);
    return () => window.removeEventListener('praxis-confetti', handler);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) return null;

  const { level, level_name, xp_total, next_level_xp, progress_pct, achievements = [] } = data;
  const emoji = levelEmojis[level] || '⭐';
  const unlockedAchievements = achievements.filter(a => a.unlocked).slice(0, 3);

  return (
    <Card className="relative overflow-hidden">
      {showConfetti && <ConfettiEffect />}

      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-gold" />
          Nível & Progresso
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Level display */}
        <div className="flex items-center gap-5">
          <motion.div
            key={level}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="text-6xl"
          >
            {emoji}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tight text-gold">Nv. {level}</span>
              <span className="text-base font-medium text-foreground/80 truncate">{level_name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{xp_total} XP total</p>
          </div>
        </div>

        {/* XP Progress */}
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progresso</span>
            <span>{xp_total} / {next_level_xp} XP</span>
          </div>
          <Progress value={progress_pct} className="h-3 [&>div]:bg-gold" />
        </div>

        {/* Recent Achievements */}
        {unlockedAchievements.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Conquistas Recentes
            </p>
            <div className="space-y-1.5">
              {unlockedAchievements.map((a) => (
                <div
                  key={a.id || a.slug}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gold/5 border border-gold/10"
                >
                  <span className="text-base">{a.emoji || '🏆'}</span>
                  <span className="text-xs font-medium flex-1 truncate">{a.name}</span>
                  <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20 text-[10px] shrink-0">
                    +{a.xp_reward} XP
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to all achievements */}
        <Link
          to="/conquistas"
          className="flex items-center justify-center gap-1 text-xs font-medium text-gold hover:text-gold/80 transition-colors pt-1"
        >
          Ver todas as conquistas
          <ChevronRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
