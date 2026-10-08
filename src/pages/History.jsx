import React, { useState } from 'react';
import { praxisApi } from '@/api/praxisClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Timer, Flame, Smile, Zap, BarChart3 } from 'lucide-react';
import { PageHero, StatGrid, StatTile } from '@/components/layout/PraxisPage';
import HabitsHeatmap from '@/components/dashboard/HabitsHeatmap';
import CorrelationWidget from '@/components/dashboard/CorrelationWidget';
import UpcomingPosts from '@/components/dashboard/UpcomingPosts';
import WeeklyProgress from '@/components/dashboard/WeeklyProgress';

export default function History() {
  const [range, setRange] = useState('30');

  const { data: wellnessChecks = [] } = useQuery({ queryKey: ['wellnessAll'], queryFn: () => praxisApi.wellness.list() });
  const { data: habits = [] } = useQuery({ queryKey: ['habitsAll'], queryFn: () => praxisApi.habits.list({ status: 'active' }) });
  const { data: habitLogs = [] } = useQuery({ queryKey: ['habitLogsAll'], queryFn: () => praxisApi.habitLogs.list() });
  const { data: focusSessions = [] } = useQuery({ queryKey: ['focusAll'], queryFn: () => praxisApi.focus.list() });

  const days = Number(range);
  const dateRange = Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const wellnessData = dateRange.map(date => {
    const check = wellnessChecks.find(w => w.date === date);
    return {
      date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
      mood: check?.mood || null,
      sleep: check?.sleep_quality || null,
      productivity: check?.productivity || null,
    };
  });

  const habitData = dateRange.map(date => {
    const logsForDay = habitLogs.filter(l => l.date === date && l.completed);
    const rate = habits.length > 0 ? Math.round((logsForDay.length / habits.length) * 100) : 0;
    return { date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), rate };
  });

  const focusData = dateRange.map(date => {
    const sessions = focusSessions.filter(s => s.date === date);
    const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60);
    const totalCycles = sessions.reduce((sum, s) => sum + (s.cycles_completed || 0), 0);
    return { date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), minutes: totalMinutes, cycles: totalCycles };
  });

  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
  const totalCycles = focusSessions.reduce((sum, s) => sum + (s.cycles_completed || 0), 0);

  const chartTooltipStyle = { contentStyle: { background: 'hsl(240 5% 10%)', border: '1px solid hsl(240 4% 18%)', borderRadius: '8px', color: 'hsl(0 0% 95%)' } };

  return (
    <div className="praxis-page">
      <PageHero
        kicker="Histórico"
        kickerIcon={BarChart3}
        title="Histórico"
        description="Foco, hábitos e bem-estar nos últimos dias."
        action={(
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
              <TabsTrigger value="90">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />

      <StatGrid className="mt-0 sm:grid-cols-3 lg:grid-cols-3">
        <StatTile
          align="center"
          icon={Timer}
          label="Tempo de foco total"
          value={`${Math.round(totalFocusMinutes)}min`}
          valueClassName="tabular-nums"
        />
        <StatTile
          align="center"
          icon={Zap}
          label="Ciclos Pomodoro"
          value={String(totalCycles)}
          valueClassName="tabular-nums"
        />
        <StatTile
          align="center"
          icon={Flame}
          label="Hábitos concluídos"
          value={String(habitLogs.filter((l) => l.completed).length)}
          valueClassName="tabular-nums"
        />
      </StatGrid>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Smile className="w-4 h-4 text-chart-4" />Bem-estar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={wellnessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} interval="preserveStartEnd" />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} />
                <Tooltip {...chartTooltipStyle} />
                <Line type="monotone" dataKey="mood" stroke="hsl(40 90% 60%)" name="Humor" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="sleep" stroke="hsl(200 80% 60%)" name="Sono" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="productivity" stroke="hsl(265 85% 65%)" name="Produtividade" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Flame className="w-4 h-4 text-accent" />Taxa de Hábitos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={habitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="rate" fill="hsl(160 80% 50%)" name="Conclusão (%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Timer className="w-4 h-4 text-primary" />Sessões de Foco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={focusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="minutes" fill="hsl(265 85% 65%)" name="Minutos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 pt-4 border-t border-border">
        <p className="text-sm font-medium text-muted-foreground">Extras (antes no Hoje)</p>
        <HabitsHeatmap />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyProgress habits={habits} habitLogs={habitLogs} />
          <CorrelationWidget />
        </div>
        <UpcomingPosts />
      </div>
    </div>
  );
}