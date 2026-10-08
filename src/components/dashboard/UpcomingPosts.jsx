import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const priorityStyles = {
  high: 'bg-destructive/15 text-destructive border-destructive/20',
  medium: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const priorityLabels = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export default function UpcomingPosts() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['upcomingPosts'],
    queryFn: () => praxisApi.tasks.list({ category: 'jotav_fit', status: 'pending' }),
  });

  const upcoming = tasks
    .filter(t => t.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    <Card className="border-pink-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-pink-400" />
          <CardTitle>Próximos Posts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Camera className="w-8 h-8 text-pink-500/30" />
            <p className="text-sm text-muted-foreground">Nenhum post agendado</p>
          </div>
        ) : (
          <AnimatePresence>
            {upcoming.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-pink-500/5 hover:bg-pink-500/10 transition-colors cursor-default"
              >
                <div className="flex flex-col items-center gap-0.5 min-w-[44px]">
                  <Calendar className="w-3 h-3 text-pink-400/60" />
                  <span className="text-[11px] font-medium text-pink-300">
                    {format(parseISO(task.date), 'dd/MM')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] border shrink-0',
                    priorityStyles[task.priority || 'medium']
                  )}
                >
                  {priorityLabels[task.priority || 'medium']}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
