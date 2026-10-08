import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

function Delta({ value, label, unit = '' }) {
  const positive = value > 0.05;
  const negative = value < -0.05;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const tone = positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-muted-foreground';
  const sign = value > 0 ? '+' : '';
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
        <Icon className="w-3 h-3" />
        {sign}{value}{unit}
      </span>
    </div>
  );
}

export default function CorrelationWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['correlation', 60],
    queryFn: () => praxisApi.insights.correlation(60),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !data) return null;

  if (!data.enough_data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary" />
            Insight de Bem-estar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{data.message}</p>
        </CardContent>
      </Card>
    );
  }

  const { high_completion: high, low_completion: low, insight } = data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-primary" />
          Hábitos × Bem-estar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Comparação dos últimos {data.days_analyzed} dias com check-in.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] uppercase tracking-wide text-emerald-400/80">Dias ≥ 80%</p>
            {high ? (
              <>
                <p className="text-sm font-semibold mt-1">😊 {high.mood}/5 humor</p>
                <p className="text-[11px] text-muted-foreground">💤 {high.sleep_hours}h · ⚡ {high.productivity}/5</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{high.days} dias</p>
              </>
            ) : <p className="text-xs text-muted-foreground mt-1">—</p>}
          </div>
          <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20">
            <p className="text-[10px] uppercase tracking-wide text-rose-400/80">Dias &lt; 80%</p>
            {low ? (
              <>
                <p className="text-sm font-semibold mt-1">😐 {low.mood}/5 humor</p>
                <p className="text-[11px] text-muted-foreground">💤 {low.sleep_hours}h · ⚡ {low.productivity}/5</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{low.days} dias</p>
              </>
            ) : <p className="text-xs text-muted-foreground mt-1">—</p>}
          </div>
        </div>

        {insight && (
          <div className="pt-1 space-y-0.5 border-t border-border">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground pt-1">
              Diferença (alta vs baixa)
            </p>
            <Delta value={insight.mood_delta} label="Humor" />
            <Delta value={insight.sleep_delta} label="Sono" unit="h" />
            <Delta value={insight.productivity_delta} label="Produtividade" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
