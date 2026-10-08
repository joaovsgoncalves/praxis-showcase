import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function WeeklyProgress({ habits = [], habitLogs = [] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return { date, dateStr: format(date, 'yyyy-MM-dd'), dayLabel: format(date, 'EEE', { locale: ptBR }) };
  });

  const getCompletionRate = (dateStr) => {
    if (habits.length === 0) return 0;
    const logsForDay = habitLogs.filter(l => l.date === dateStr && l.completed);
    return Math.round((logsForDay.length / habits.length) * 100);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Progresso Semanal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          {days.map(day => {
            const rate = getCompletionRate(day.dateStr);
            const isToday = day.dateStr === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={day.dateStr} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full max-w-[32px] h-24 bg-secondary rounded-lg relative overflow-hidden">
                  <div
                    className={cn(
                      "absolute bottom-0 w-full rounded-lg transition-[height] duration-200 ease-out",
                      rate > 80 ? "bg-accent" : rate > 50 ? "bg-primary" : rate > 0 ? "bg-chart-4" : "bg-transparent"
                    )}
                    style={{ height: `${rate}%` }}
                  />
                </div>
                <span className={cn("text-[10px] capitalize", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}