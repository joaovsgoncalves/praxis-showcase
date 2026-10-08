import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale, Trash2 } from 'lucide-react';
import { praxisApi } from '@/api/praxisClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PraxisEmptyState } from '@/components/layout/PraxisPage';
import NutritionConfirmDialog from '@/components/nutrition/NutritionConfirmDialog';
import { toast } from 'sonner';

function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mini sparkline SVG — leve, sem recharts */
function WeightSparkline({ points = [] }) {
  const { path, w, h } = useMemo(() => {
    const width = 280;
    const height = 56;
    if (!points.length) return { path: '', w: width, h: height };
    const vals = points.map((p) => Number(p.weight_kg));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pad = 4;
    const coords = points.map((p, i) => {
      const x =
        points.length === 1
          ? width / 2
          : pad + (i / (points.length - 1)) * (width - pad * 2);
      const y = height - pad - ((Number(p.weight_kg) - min) / span) * (height - pad * 2);
      return [x, y];
    });
    const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
    return { path: d, w: width, h: height };
  }, [points]);

  if (!points.length) return null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-14 text-primary"
      role="img"
      aria-label="Tendência de peso"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-80"
      />
      {points.length > 0 ? (
        <circle
          cx={
            points.length === 1
              ? w / 2
              : 4 + ((points.length - 1) / (points.length - 1)) * (w - 8)
          }
          cy={
            (() => {
              const vals = points.map((p) => Number(p.weight_kg));
              const min = Math.min(...vals);
              const max = Math.max(...vals);
              const span = max - min || 1;
              const last = Number(points[points.length - 1].weight_kg);
              return h - 4 - ((last - min) / span) * (h - 8);
            })()
          }
          r="3.5"
          fill="currentColor"
        />
      ) : null}
    </svg>
  );
}

export default function WeightTracker() {
  const queryClient = useQueryClient();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(todayLocalISO);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: trend, isLoading } = useQuery({
    queryKey: ['nutrition', 'weight', 'trend'],
    queryFn: () => praxisApi.nutrition.weight.trend({ days: 45 }),
    retry: 1,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['nutrition', 'weight', 'list'],
    queryFn: () => praxisApi.nutrition.weight.list({ limit: 14 }),
    retry: 1,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['nutrition', 'weight'] });
    queryClient.invalidateQueries({ queryKey: ['nutrition', 'profile'] });
  };

  const saveMut = useMutation({
    mutationFn: (data) => praxisApi.nutrition.weight.upsert(data),
    onSuccess: () => {
      invalidate();
      setWeight('');
      toast.success('Peso salvo');
    },
    onError: () => toast.error('Não deu pra salvar o peso'),
  });

  const delMut = useMutation({
    mutationFn: (id) => praxisApi.nutrition.weight.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success('Peso removido');
    },
    onError: () => toast.error('Não deu pra remover'),
  });

  const latest = trend?.latest;
  const delta = trend?.delta_kg;
  const points = trend?.points || [];

  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-card/40 shadow-none">
        <CardContent className="px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="w-4 h-4 text-emerald-400/90 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Peso</p>
                <p className="text-xs text-muted-foreground">
                  Um registro por dia · tendência leve
                </p>
              </div>
            </div>
            {latest ? (
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold tabular-nums tracking-tight">
                  {Number(latest.weight_kg).toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })}{' '}
                  <span className="text-sm font-normal text-muted-foreground">kg</span>
                </p>
                {delta != null ? (
                  <p
                    className={`text-xs tabular-nums ${
                      delta < 0
                        ? 'text-emerald-400'
                        : delta > 0
                          ? 'text-amber-400'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta} kg vs anterior
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">…</p>
          ) : points.length >= 2 ? (
            <WeightSparkline points={points} />
          ) : points.length === 1 ? (
            <p className="text-xs text-muted-foreground">
              Mais um registro e a linha de tendência aparece.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground" htmlFor="weight-kg">
                Peso (kg)
              </Label>
              <Input
                id="weight-kg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="30"
                max="300"
                className="bg-secondary/40 tabular-nums"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={latest ? String(latest.weight_kg) : '80.0'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground" htmlFor="weight-date">
                Data
              </Label>
              <Input
                id="weight-date"
                type="date"
                className="bg-secondary/40 tabular-nums"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            className="w-full rounded-full"
            disabled={saveMut.isPending || !weight}
            onClick={() => {
              const n = Number(String(weight).replace(',', '.'));
              if (!Number.isFinite(n)) {
                toast.error('Peso inválido');
                return;
              }
              saveMut.mutate({ weight_kg: n, date });
            }}
          >
            {saveMut.isPending ? 'Salvando…' : 'Salvar peso'}
          </Button>
        </CardContent>
      </Card>

      {logs.length === 0 && !isLoading ? (
        <PraxisEmptyState
          title="Nenhum peso ainda"
          description="Registre seu peso quando quiser acompanhar a tendência."
          compact
        />
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium tabular-nums">{log.date}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {Number(log.weight_kg).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
                  {log.note ? ` · ${log.note}` : ''}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Apagar peso de ${log.date}`}
                onClick={() => setDeleteTarget(log)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <NutritionConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Apagar registro de peso?"
        description={deleteTarget ? `O registro de ${deleteTarget.date} será removido.` : ''}
        confirmLabel="Apagar"
        destructive
        busy={delMut.isPending}
        onConfirm={() => deleteTarget && delMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
