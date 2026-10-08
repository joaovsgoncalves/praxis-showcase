import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HabitGridRow({ habit, isDone, onToggleDone, onSkipClick }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { scale: 1.01, y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className="praxis-tactile-card flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/60"
    >
      <div className="flex items-center gap-3.5">
        <Button
          variant={isDone ? 'default' : 'outline'}
          size="icon"
          className={cn(
            'h-9 w-9 rounded-full transition-all duration-200 shadow-sm',
            isDone
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-amber-500/20'
              : 'border-border/80 hover:border-amber-500/60 hover:bg-amber-500/10'
          )}
          onClick={() => onToggleDone(habit, isDone)}
          aria-label={isDone ? `Desmarcar ${habit.title}` : `Concluir ${habit.title}`}
        >
          <Check className={cn('w-4 h-4 stroke-[3]', isDone ? 'opacity-100' : 'opacity-30')} />
        </Button>
        <div>
          <p className={cn('text-sm font-semibold tracking-tight transition-all', isDone && 'line-through text-muted-foreground/70')}>
            {habit.title}
          </p>
          {(habit.streak > 0 || habit.current_streak > 0) && (
            <p className="text-xs text-amber-500 font-mono flex items-center gap-1 mt-0.5 font-medium">
              <Flame className="w-3.5 h-3.5 fill-amber-500/20" />
              {habit.streak || habit.current_streak}d de sequência
            </p>
          )}
        </div>
      </div>
      {onSkipClick && !isDone && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 rounded-lg"
          onClick={() => onSkipClick(habit)}
          title="Não rolou hoje"
          aria-label={`Marcar que ${habit.title} não rolou hoje`}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
}
