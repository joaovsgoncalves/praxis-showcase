import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { praxisApi } from '@/api/praxisClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfDay, addDays, subDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Flame } from 'lucide-react';

const WEEKS = 13;        // 13 weeks ≈ 91 days
const TOTAL_DAYS = WEEKS * 7;
const WEEK_LABELS = ['', 'Seg', '', 'Qua', '', 'Sex', ''];

// Map a 0..1 ratio → an opacity step. We use 5 buckets so cells read as a
// rough "intensity" rather than continuous noise.
function bucket(ratio) {
  if (ratio === 0) return 0;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

const BUCKET_BG = [
  'hsl(var(--secondary))',
  'hsl(22 95% 58% / 0.20)',
  'hsl(22 95% 58% / 0.40)',
  'hsl(40 95% 55% / 0.65)',
  'hsl(40 95% 55% / 0.95)',
];

export default function HabitsHeatmap() {
  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => praxisApi.habits.list({ status: 'active' }),
    staleTime: 60_000,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ['habitLogsAll'],
    queryFn: () => praxisApi.habitLogs.list({}),
    staleTime: 60_000,
  });

  const grid = useMemo(() => {
    const today = startOfDay(new Date());
    // Anchor on Sunday so columns are full weeks.
    const todayDow = getDay(today); // 0=Sun
    // We want today to land in the *last* column. Calculate first cell:
    const firstCellOffset = TOTAL_DAYS - 1 - (6 - todayDow);
    const firstCell = subDays(today, firstCellOffset);

    const habitCount = Math.max(1, habits.length);
    const cells = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const date = addDays(firstCell, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const completed = logs.filter(l => l.date === dateStr && l.completed).length;
      const ratio = Math.min(1, completed / habitCount);
      cells.push({ date, dateStr, completed, ratio, future: date > today });
    }
    return cells;
  }, [habits.length, logs]);

  const cols = useMemo(() => {
    const out = Array.from({ length: WEEKS }, () => []);
    grid.forEach((cell, idx) => {
      const col = Math.floor(idx / 7);
      out[col].push(cell);
    });
    return out;
  }, [grid]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = null;
    cols.forEach((col, i) => {
      const first = col[0];
      const m = first?.date.getMonth();
      if (m !== undefined && m !== lastMonth) {
        labels.push({ col: i, label: format(first.date, 'MMM', { locale: ptBR }) });
        lastMonth = m;
      } else {
        labels.push({ col: i, label: '' });
      }
    });
    return labels;
  }, [cols]);

  const last30 = grid.slice(-30).filter(c => !c.future);
  const avg30 = last30.length
    ? Math.round((last30.reduce((s, c) => s + c.ratio, 0) / last30.length) * 100)
    : 0;
  const bestStreak = useMemo(
    () => habits.reduce((m, h) => Math.max(m, h.current_streak || 0), 0),
    [habits]
  );

  if (habits.length === 0) return null;

  return (
    <Card className="card-domain domain-ember">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-domain-ember" />
            Mapa de Hábitos
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Média 30d: <span className="text-foreground font-semibold">{avg30}%</span></span>
            <span>Melhor streak: <span className="text-domain-ember font-semibold">{bestStreak}d</span></span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-2 px-2 praxis-hide-scrollbar praxis-scroll-x">
          <div className="min-w-[560px]">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-1.5 ml-7">
              {monthLabels.map((m, i) => (
                <div key={i} className="w-3.5 text-[9px] text-muted-foreground/70 capitalize">
                  {m.label}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {/* Weekday labels */}
              <div className="flex flex-col gap-[3px] mr-1.5">
                {WEEK_LABELS.map((l, i) => (
                  <div key={i} className="w-5 h-3.5 text-[9px] text-muted-foreground/60 leading-[14px]">
                    {l}
                  </div>
                ))}
              </div>

              {cols.map((col, i) => (
                <div key={i} className="flex flex-col gap-[3px]">
                  {col.map((cell) => {
                    const b = bucket(cell.ratio);
                    return (
                      <div
                        key={cell.dateStr}
                        title={`${format(cell.date, "d 'de' MMM", { locale: ptBR })} · ${cell.completed}/${habits.length}`}
                        className="w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125"
                        style={{
                          background: cell.future ? 'transparent' : BUCKET_BG[b],
                          border: cell.future ? '1px dashed hsl(var(--border))' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Intensity legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground/70">
              <span>menos</span>
              {BUCKET_BG.map((bg, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-[3px]" style={{ background: bg }} />
              ))}
              <span>mais</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
