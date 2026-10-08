import React from 'react';
import { motion } from 'framer-motion';

// Three concentric Apple-Fitness-style rings.
// Sizes hand-tuned so labels around the outside have room.
const RINGS = [
  { key: 'habits', stroke: 'hsl(var(--domain-wellness))', glow: 'hsl(160 80% 50% / 0.55)', radius: 86, label: 'Hábitos' },
  { key: 'tasks',  stroke: 'hsl(var(--domain-ember))',    glow: 'hsl(22 95% 58% / 0.55)',  radius: 66, label: 'Tarefas' },
  { key: 'focus',  stroke: 'hsl(var(--domain-focus))',    glow: 'hsl(265 85% 65% / 0.55)', radius: 46, label: 'Foco' },
];

export default function ProgressRings({ habits = 0, tasks = 0, focus = 0, overall = null, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 10;

  const data = { habits, tasks, focus };
  const centerPct = Number.isFinite(overall) ? overall : (habits + tasks + focus) / 3;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          {RINGS.map(r => (
            <filter key={r.key} id={`glow-${r.key}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {RINGS.map((r) => {
          const c = 2 * Math.PI * r.radius;
          const value = Math.max(0, Math.min(100, data[r.key] || 0));
          const offset = c * (1 - value / 100);
          return (
            <g key={r.key}>
              <circle
                cx={cx} cy={cy} r={r.radius}
                fill="none"
                stroke="hsl(0 0% 100% / 0.06)"
                strokeWidth={stroke}
              />
              <motion.circle
                cx={cx} cy={cy} r={r.radius}
                fill="none"
                stroke={r.stroke}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                filter={`url(#glow-${r.key})`}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-mono text-5xl font-bold tracking-tighter text-foreground">
          {Math.round(centerPct)}
          <span className="text-muted-foreground text-xl">%</span>
        </span>
        <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mt-1">do dia</span>
      </div>
    </div>
  );
}

export function RingLegend({ habits = 0, tasks = 0, focus = 0 }) {
  const rows = [
    { color: 'hsl(var(--domain-wellness))', label: 'Hábitos', value: habits },
    { color: 'hsl(var(--domain-ember))',    label: 'Tarefas', value: tasks },
    { color: 'hsl(var(--domain-focus))',    label: 'Foco',    value: focus },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
          <span className="block w-2.5 h-2.5 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
          <span className="text-muted-foreground">{r.label}</span>
          <span className="ml-auto font-mono font-semibold text-foreground">{Math.round(r.value)}%</span>
        </div>
      ))}
    </div>
  );
}
