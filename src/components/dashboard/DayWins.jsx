import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Timer, Sparkles, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isTaskDone } from '@/lib/tasks';
import { sparkFromElement } from '@/lib/celebration';

/**
 * Vitórias do dia — só o que importa para fechar o dia com clareza.
 */
export default function DayWins({ tasks = [], today, onToggleComplete, onEditTask }) {
  const rowRefs = useRef(new Map());
  const todayPending = tasks
    .filter((t) => t.date === today && !isTaskDone(t));

  const todayDone = tasks.filter((t) => t.date === today && isTaskDone(t)).length;
  const todayTotal = tasks.filter((t) => t.date === today).length;
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  const handleToggle = (task) => {
    if (!isTaskDone(task)) {
      sparkFromElement(rowRefs.current.get(task.id), 'gold');
    }
    onToggleComplete?.(task);
  };

  return (
    <Card className="border-border/80 bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-domain-gold shrink-0" />
              Vitórias do dia
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pendências de hoje — marque e siga.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-semibold tabular-nums text-domain-gold">{pct}%</p>
            <p className="text-[10px] text-muted-foreground">
              do dia
            </p>
          </div>
        </div>
        {todayTotal > 0 && (
          <div className="h-1.5 bg-secondary/80 rounded-full overflow-hidden mt-3">
            <motion.div
              className="h-full w-full origin-left rounded-full bg-domain-gold"
              initial={false}
              animate={{ scaleX: Math.max(0, Math.min(1, pct / 100)) }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              style={{ transformOrigin: 'left center' }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {todayPending.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground py-2 text-center"
            >
              Nenhuma tarefa pendente para hoje.
            </motion.p>
          ) : (
            todayPending.map((task) => (
              <motion.div
                key={task.id}
                layout
                ref={(el) => { if (el) rowRefs.current.set(task.id, el); else rowRefs.current.delete(task.id); }}
                exit={{ opacity: 0, scale: 0.98 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex flex-col gap-2.5 p-3.5 rounded-xl border border-white/10',
                  'bg-secondary/40 hover:bg-secondary/70 transition-colors sm:flex-row sm:items-center sm:gap-3'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleToggle(task)}
                    className="h-6 w-6 shrink-0 touch-manipulation"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-snug break-words">{task.title}</p>
                    {task.time && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{task.time}</p>
                    )}
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto shrink-0">
                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    className="flex-1 gap-2 h-11 touch-manipulation sm:flex-none"
                    onClick={() => onEditTask?.(task)}
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button asChild size="default" variant="secondary" className="flex-1 sm:flex-none gap-2 h-11 touch-manipulation">
                    <Link to={`/foco?taskId=${task.id}`}>
                      <Timer className="w-4 h-4" />
                      Foco
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        {todayDone > 0 && (
          <p className="text-xs text-domain-wellness pt-2">
            {todayDone} concluída{todayDone === 1 ? '' : 's'} hoje — bom movimento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}