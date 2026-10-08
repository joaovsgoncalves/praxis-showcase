import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  AudioLines,
  BrainCircuit,
  Check,
  CircleDot,
  Flame,
  Focus,
  Mic,
  MoonStar,
  Play,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react';

const PHASES = [
  {
    key: 'listening',
    label: 'PraxIA ouvindo',
    status: 'Ouvindo seu dia…',
    transcript: 'Hoje eu preciso terminar a landing, ligar para os clientes e treinar às 19h.',
    progress: 42,
  },
  {
    key: 'organizing',
    label: 'Organizando',
    status: 'Separando prioridade, tarefas e rotina…',
    transcript: 'Entendi. Tirando o ruído e montando a ordem do seu dia.',
    progress: 56,
  },
  {
    key: 'ready',
    label: 'Dia organizado',
    status: 'Pronto para executar',
    transcript: '3 tarefas · 1 bloco de foco · 1 treino · revisão às 21h',
    progress: 68,
  },
];

const WAVE = [9, 14, 8, 20, 16, 24, 12, 18, 11, 22, 15, 9, 17, 12, 20, 8];

function PreviewBrand() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0c0c10]">
        <img src="/praxis-logo.png?v=8" alt="" width={36} height={36} className="h-[86%] w-[86%] object-contain" />
      </div>
      <span className="praxis-title hidden text-sm font-bold sm:inline">Praxis</span>
    </div>
  );
}

function AnimatedWave({ active = true, compact = false }) {
  return (
    <div className={`flex items-center justify-center gap-[3px] ${compact ? 'h-7' : 'h-9'}`} aria-hidden>
      {WAVE.map((height, index) => (
        <motion.span
          key={`${height}-${index}`}
          className="w-[3px] rounded-full bg-domain-gold/80"
          animate={active ? { height: [5, height, 7, Math.max(9, height * 0.7), 5], opacity: [0.35, 1, 0.55, 0.9, 0.35] } : { height: 5, opacity: 0.35 }}
          transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.045, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function StatusPill({ phase }) {
  const Icon = phase.key === 'listening' ? Mic : phase.key === 'organizing' ? BrainCircuit : Sparkles;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase.key}
        initial={{ opacity: 0, y: 5, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -5, scale: 0.97 }}
        transition={{ duration: 0.28 }}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-medium ${
          phase.key === 'ready'
            ? 'border-domain-wellness/20 bg-domain-wellness/10 text-domain-wellness'
            : phase.key === 'organizing'
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-domain-gold/20 bg-domain-gold/10 text-domain-gold'
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {phase.label}
      </motion.div>
    </AnimatePresence>
  );
}

export function PraxisLivePreview() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const phase = PHASES[phaseIndex];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 18, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 18, mass: 0.5 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [-2.8, 2.8]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [2, -2]);
  const { scrollYProgress } = useScroll();
  const floatY = useTransform(scrollYProgress, [0, 0.45], [0, reduceMotion ? 0 : -28]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % PHASES.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const tasks = useMemo(
    () => [
      { label: 'Ligar para clientes prioritários', done: phaseIndex >= 1 },
      { label: 'Treinar planche + front lever', done: phaseIndex >= 2 },
      { label: 'Revisar o dia às 21h', done: false },
    ],
    [phaseIndex],
  );

  const handlePointerMove = (event) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetPointer = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div className="relative mx-auto w-full max-w-[720px] lg:mr-0" style={{ y: floatY }}>
      <motion.div
        className="pointer-events-none absolute -inset-12 rounded-[3.4rem] bg-[radial-gradient(circle_at_50%_50%,hsl(var(--domain-gold)/0.16),transparent_58%)] blur-3xl"
        animate={reduceMotion ? undefined : { opacity: [0.5, 0.9, 0.55], scale: [0.98, 1.035, 0.99] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="landing-app-frame relative overflow-hidden rounded-[1.9rem] border border-white/[0.09] bg-[#111114]/95 shadow-[0_35px_120px_rgba(0,0,0,0.58)]"
        style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1400 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
      >
        <motion.div
          className="pointer-events-none absolute inset-y-0 -left-1/3 z-20 w-1/3 bg-gradient-to-r from-transparent via-white/[0.055] to-transparent"
          animate={reduceMotion ? undefined : { x: ['0%', '520%'] }}
          transition={{ duration: 7, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
        />

        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-domain-wellness"
              animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.7, repeat: Infinity }}
            />
            Sexta, 10 de julho
          </div>
        </div>

        <div className="grid min-h-[470px] grid-cols-[76px_1fr] sm:grid-cols-[154px_1fr]">
          <aside className="border-r border-white/[0.055] p-3 sm:p-4">
            <div className="mb-7"><PreviewBrand /></div>
            <div className="space-y-1.5">
              {[
                ['Hoje', CircleDot, true],
                ['Tarefas', Check, false],
                ['Revisar', MoonStar, false],
              ].map(([label, Icon, active]) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${active ? 'bg-domain-gold/10 text-domain-gold' : 'text-muted-foreground'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
          </aside>

          <main className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Boa tarde, Jota</p>
                <h3 className="praxis-title mt-1 text-xl font-bold sm:text-2xl">O que importa agora?</h3>
              </div>
              <motion.div
                key={phase.progress}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden rounded-full border border-domain-gold/15 bg-domain-gold/[0.07] px-3 py-1.5 text-[10px] font-medium text-domain-gold sm:block"
              >
                {phase.progress}% do dia concluído
              </motion.div>
            </div>

            <motion.div
              className="relative overflow-hidden rounded-2xl border border-domain-gold/15 bg-[linear-gradient(135deg,hsl(var(--domain-gold)/0.11),transparent_70%)] p-4 sm:p-5"
              animate={reduceMotion ? undefined : { boxShadow: ['0 0 0 rgba(0,0,0,0)', '0 0 42px hsl(var(--domain-gold)/0.08)', '0 0 0 rgba(0,0,0,0)'] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-domain-gold">
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                    Agora
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug sm:text-base">Finalizar a landing da Praxis</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">90 min de foco · prioridade alta</p>
                </div>
                <motion.button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-domain-gold text-black shadow-[0_0_30px_hsl(var(--domain-gold)/0.22)]"
                  aria-label="Iniciar foco"
                  whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                >
                  <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
                </motion.button>
              </div>
            </motion.div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">Hoje</span>
                  <motion.span key={phaseIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] tabular-nums text-domain-wellness">
                    {phaseIndex === 0 ? '1/5' : phaseIndex === 1 ? '2/5' : '3/5'}
                  </motion.span>
                </div>
                <div className="space-y-2.5">
                  {tasks.map((task, index) => (
                    <motion.div key={task.label} layout className="flex items-center gap-2.5 text-[10px] leading-snug sm:text-[11px]">
                      <motion.span
                        animate={task.done ? { scale: [1, 1.18, 1], backgroundColor: 'hsl(var(--domain-wellness) / 0.15)' } : { scale: 1 }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${task.done ? 'border-domain-wellness/40 text-domain-wellness' : 'border-white/15 text-transparent'}`}
                      >
                        <Check className="h-2.5 w-2.5" aria-hidden />
                      </motion.span>
                      <motion.span animate={{ opacity: task.done ? 0.58 : 0.9 }} className={task.done ? 'line-through decoration-white/20' : ''}>
                        {task.label}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">Macros</span>
                  <Utensils className="h-3.5 w-3.5 text-domain-wellness" aria-hidden />
                </div>
                <p className="praxis-title text-2xl font-bold tabular-nums">1.548 <span className="text-[10px] font-medium text-muted-foreground">/ 2.000 kcal</span></p>
                <div className="mt-4 space-y-2.5">
                  {[
                    ['Proteína', 78, '132g / 170g', 'bg-domain-wellness'],
                    ['Carbo', 62, '184g / 295g', 'bg-domain-sky'],
                    ['Gordura', 48, '42g / 88g', 'bg-domain-gold'],
                  ].map(([label, value, detail, fill], index) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-[9px] text-muted-foreground">
                        <span>{label}</span>
                        <span className="tabular-nums">{detail}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className={`h-full rounded-full ${fill}`}
                          initial={{ width: reduceMotion ? `${value}%` : 0 }}
                          whileInView={{ width: `${value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </motion.div>

      <motion.div
        className="absolute -left-2 top-[34%] hidden w-[260px] rounded-2xl border border-white/[0.09] bg-background/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl md:block lg:-left-12"
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-between gap-3">
          <StatusPill phase={phase} />
          <motion.span
            className={`h-2 w-2 rounded-full ${phase.key === 'ready' ? 'bg-domain-wellness' : phase.key === 'organizing' ? 'bg-primary' : 'bg-domain-gold'}`}
            animate={reduceMotion ? undefined : { scale: [0.7, 1.2, 0.7], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.3, repeat: Infinity }}
          />
        </div>
        <div className="mt-3 min-h-[3.35rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-xs leading-relaxed text-foreground/85"
            >
              “{phase.transcript}”
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-3"><AnimatedWave active={phase.key === 'listening'} compact /></div>
      </motion.div>

      <motion.div
        className="absolute -bottom-7 right-3 hidden w-[255px] rounded-2xl border border-white/[0.09] bg-background/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:block lg:-right-8"
        animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
        transition={{ duration: 6.3, repeat: Infinity, ease: 'easeInOut', delay: -2.2 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={phase.key}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -7 }}
            transition={{ duration: 0.32 }}
          >
            <div className={`flex items-center gap-2 text-[10px] font-medium ${phase.key === 'ready' ? 'text-domain-wellness' : phase.key === 'organizing' ? 'text-primary' : 'text-domain-gold'}`}>
              {phase.key === 'ready' ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : phase.key === 'organizing' ? <BrainCircuit className="h-3.5 w-3.5" aria-hidden /> : <AudioLines className="h-3.5 w-3.5" aria-hidden />}
              {phase.status}
            </div>
            <div className="mt-3 space-y-2">
              {[
                ['3 tarefas', Check, phaseIndex >= 1],
                ['1 bloco de foco', Focus, phaseIndex >= 1],
                ['1 treino às 19h', Zap, phaseIndex >= 2],
              ].map(([label, Icon, visible], index) => (
                <motion.div
                  key={label}
                  initial={false}
                  animate={{ opacity: visible ? 1 : 0.32, x: visible ? 0 : 5 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-2.5 py-2 text-[10px] text-foreground/80"
                >
                  <Icon className={`h-3.5 w-3.5 ${visible ? 'text-domain-wellness' : 'text-muted-foreground'}`} aria-hidden />
                  {label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export function PraxisVoiceFlowDemo() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const phase = PHASES[phaseIndex];

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % PHASES.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const outputs = [
    ['3', 'tarefas', Check],
    ['1', 'foco', Focus],
    ['1', 'treino', Flame],
  ];

  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03] p-6 sm:p-8">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--domain-gold)/0.12),transparent_56%)]"
        animate={reduceMotion ? undefined : { opacity: [0.45, 0.85, 0.45], scale: [0.98, 1.04, 0.98] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative flex flex-col items-center text-center">
        <StatusPill phase={phase} />

        <div className="relative mt-6 flex h-24 w-24 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border border-domain-gold/20 bg-domain-gold/[0.05]"
            animate={reduceMotion ? undefined : { scale: phase.key === 'listening' ? [1, 1.14, 1] : 1.02, opacity: phase.key === 'listening' ? [0.5, 1, 0.5] : 0.45 }}
            transition={{ duration: 1.6, repeat: phase.key === 'listening' ? Infinity : 0 }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-primary/15 bg-primary/[0.04]"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
          <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-background/90 shadow-[0_0_55px_hsl(var(--domain-gold)/0.12)]">
            {phase.key === 'listening' ? <Mic className="h-6 w-6 text-domain-gold" aria-hidden /> : phase.key === 'organizing' ? <BrainCircuit className="h-6 w-6 text-primary" aria-hidden /> : <Sparkles className="h-6 w-6 text-domain-wellness" aria-hidden />}
          </div>
        </div>

        <div className="mt-3"><AnimatedWave active={phase.key === 'listening'} compact /></div>

        <div className="mt-5 min-h-[3.4rem] max-w-md">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-xs leading-relaxed text-foreground/80 sm:text-sm"
            >
              {phase.transcript}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground sm:text-xs">
          {outputs.map(([value, label, Icon], index) => {
            const visible = phaseIndex >= 1 || (phaseIndex === 0 && index === 0);
            return (
              <motion.div
                key={label}
                animate={{ opacity: visible ? 1 : 0.28, y: visible ? 0 : 5, borderColor: visible ? 'hsl(0 0% 100% / 0.08)' : 'hsl(0 0% 100% / 0.04)' }}
                transition={{ duration: 0.32, delay: index * 0.07 }}
                className="rounded-xl border bg-white/[0.025] p-2.5"
              >
                <Icon className={`mx-auto mb-1.5 h-3.5 w-3.5 ${visible ? 'text-domain-wellness' : 'text-muted-foreground'}`} aria-hidden />
                <span className="block text-sm font-semibold text-foreground">{value}</span>
                {label}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
