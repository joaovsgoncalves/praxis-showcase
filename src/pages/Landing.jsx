import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AudioLines,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Dumbbell,
  Leaf,
  LogOut,
  Mic,
  MoonStar,
  MoveRight,
  Target,
  Utensils,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PraxisLivePreview, PraxisVoiceFlowDemo } from '@/components/landing/PraxisLivePreview';
import PraxisBrand from '@/components/brand/PraxisBrand';
import { useAuth } from '@/lib/AuthContext';

const flowSteps = [
  {
    number: '01',
    icon: Mic,
    title: 'Fale do seu jeito',
    description: 'Despeje tudo em um áudio, sem formulário, categoria ou organização prévia.',
    accent: 'text-domain-gold',
    shell: 'border-domain-gold/20 bg-domain-gold/10',
  },
  {
    number: '02',
    icon: BrainCircuit,
    title: 'A PraxIA organiza',
    description: 'Seu dia vira tarefas, hábitos, blocos de foco e prioridades prontas para agir.',
    accent: 'text-primary',
    shell: 'border-primary/20 bg-primary/10',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Execute o que importa',
    description: 'Abra o Hoje, veja o próximo passo e pare de gastar energia decidindo por onde começar.',
    accent: 'text-domain-wellness',
    shell: 'border-domain-wellness/20 bg-domain-wellness/10',
  },
];

const featureCards = [
  {
    icon: CircleDot,
    eyebrow: 'Hoje',
    title: 'Uma tela para saber o que fazer agora.',
    description: 'Prioridade, tarefas, hábitos, agenda e rotinas no lugar certo — sem transformar seu dia em um painel infinito.',
    accent: 'domain-gold',
  },
  {
    icon: AudioLines,
    eyebrow: 'Voz + PraxIA',
    title: 'Pensamento bagunçado entra. Próximo passo claro sai.',
    description: 'Fale naturalmente. A PraxIA interpreta, organiza e devolve estrutura sem te obrigar a alimentar o sistema manualmente.',
    accent: 'domain-focus',
  },
  {
    icon: Utensils,
    eyebrow: 'Nutrição',
    title: 'Macros e refeições sem virar uma planilha.',
    description: 'Registre em gramas, acompanhe calorias e proteína e mantenha o foco no que realmente move o resultado.',
    accent: 'domain-wellness',
  },
  {
    icon: Dumbbell,
    eyebrow: 'Jota Fit',
    title: 'Seu corpo também faz parte da execução.',
    description: 'Treino, recuperação e rotina física dentro do mesmo sistema que organiza o resto da sua vida.',
    accent: 'domain-ember',
  },
  {
    icon: Target,
    eyebrow: 'Metas e rotinas',
    title: 'A intenção precisa sobreviver ao cotidiano.',
    description: 'Transforme objetivos grandes em rotinas repetíveis e mantenha o que importa visível quando a motivação cai.',
    accent: 'domain-sky',
  },
  {
    icon: MoonStar,
    eyebrow: 'Revisão',
    title: 'Feche o dia em minutos, não em páginas.',
    description: 'Veja o que avançou, o que travou e o que precisa mudar amanhã sem transformar reflexão em mais uma tarefa.',
    accent: 'domain-pink',
  },
];

function AppPreview() {
  return <PraxisLivePreview />;
}

function SectionLabel({ children }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-domain-gold" />
      {children}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/';
  };

  const scrollToHowItWorks = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const firstName = (user?.display_name || user?.username || '').split(' ')[0] || 'de volta';
  const heroTitle = isAuthenticated
    ? { line1: `Bem-vindo de volta, ${firstName}.`, line2: 'Seu dia está esperando.' }
    : { line1: 'Pare de planejar a vida.', line2: 'Comece a executá-la.' };
  const heroSubtitle = isAuthenticated
    ? 'Abra o Praxis e vá direto pro próximo passo. Sua rotina, hábitos, foco e revisão continuam exatamente onde você parou.'
    : 'Fale o que precisa fazer. A PraxIA organiza seu dia em tarefas, hábitos, foco e revisão — sem formulários, planilhas ou dez minutos escolhendo categorias.';

  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-domain-gold/30 selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.055] bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#topo" aria-label="Praxis — início">
            <PraxisBrand />
          </a>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Navegação principal">
            <a className="transition-colors hover:text-foreground" href="#como-funciona">Como funciona</a>
            <a className="transition-colors hover:text-foreground" href="#recursos">Recursos</a>
            <a className="transition-colors hover:text-foreground" href="#filosofia">Por que Praxis</a>
          </nav>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full bg-domain-gold px-4 text-xs font-semibold text-black hover:bg-domain-gold/90"
              >
                <Link to="/">
                  Abrir app
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
              <Button
                type="button"
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Sair
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" className="h-9 rounded-full border-white/10 bg-white/[0.035] px-4 text-xs hover:bg-white/[0.07]">
              <Link to="/entrar">Entrar</Link>
            </Button>
          )}
        </div>
      </header>

      <main>
        <section id="topo" className="relative isolate overflow-hidden px-4 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-40 lg:px-8 lg:pb-40 lg:pt-44">
          <div className="landing-grid absolute inset-0 -z-20 opacity-40" />
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--domain-gold)/0.10),transparent_63%)] blur-3xl" />
          <div className="pointer-events-none absolute -right-[15%] top-[20%] -z-10 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.09),transparent_66%)] blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 xl:gap-20">
            <motion.div
              className="relative z-10 max-w-2xl"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-domain-gold/15 bg-domain-gold/[0.065] px-3.5 py-2 text-xs font-medium text-domain-gold">
                <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                Seu dia sai da cabeça e entra em movimento
              </div>

              <h1 className="praxis-title text-[clamp(3.15rem,8vw,6.6rem)] font-bold leading-[0.92] tracking-[-0.075em]">
                {heroTitle.line1}
                <span className="mt-2 block bg-[linear-gradient(100deg,hsl(var(--domain-gold)),hsl(42_92%_72%),hsl(var(--domain-gold)))] bg-clip-text text-transparent">{heroTitle.line2}</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
                {heroSubtitle}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                {isAuthenticated ? (
                  <Button asChild size="lg" className="group h-12 rounded-full bg-domain-gold px-6 text-sm font-semibold text-black shadow-[0_14px_45px_hsl(var(--domain-gold)/0.20)] hover:bg-domain-gold/90">
                    <Link to="/">
                      Abrir o app
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="group h-12 rounded-full bg-domain-gold px-6 text-sm font-semibold text-black shadow-[0_14px_45px_hsl(var(--domain-gold)/0.20)] hover:bg-domain-gold/90">
                    <Link to="/entrar">
                      Entrar no Praxis
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </Button>
                )}
                <Button type="button" onClick={scrollToHowItWorks} size="lg" variant="ghost" className="group h-12 rounded-full px-5 text-sm text-muted-foreground hover:bg-white/[0.04] hover:text-foreground">
                  Ver como funciona
                  <ChevronDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden />
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {['Fale naturalmente', 'Organize em segundos', 'Execute sem atrito'].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-domain-wellness/25 bg-domain-wellness/10">
                      <Check className="h-2.5 w-2.5 text-domain-wellness" aria-hidden />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative lg:pl-2"
              initial={{ opacity: 0, y: 30, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <AppPreview />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-white/[0.055] bg-white/[0.018] px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground md:text-left">Um sistema para transformar intenção em prática</p>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-foreground/70">
              <span className="flex items-center gap-2"><Mic className="h-4 w-4 text-domain-gold" /> Fale</span>
              <MoveRight className="hidden h-4 w-4 text-white/15 sm:block" aria-hidden />
              <span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /> Organize</span>
              <MoveRight className="hidden h-4 w-4 text-white/15 sm:block" aria-hidden />
              <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-domain-wellness" /> Execute</span>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Como funciona</SectionLabel>
              <h2 className="praxis-title text-4xl font-bold tracking-[-0.055em] sm:text-5xl lg:text-6xl">Menos interface. Mais movimento.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                O Praxis encurta a distância entre pensar em fazer e realmente começar.
              </p>
            </div>

            <div className="mt-16 grid gap-4 lg:grid-cols-3 lg:gap-5">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.article
                    key={step.number}
                    className="group relative overflow-hidden rounded-3xl border border-white/[0.065] bg-[#0d0d0f] p-6 transition-colors hover:border-white/[0.1] hover:bg-[#111114] sm:p-7"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.28 }}
                    transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="mb-8 flex items-center justify-between gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${step.shell}`}>
                        <Icon className={`h-5 w-5 ${step.accent}`} aria-hidden />
                      </div>
                      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/55">{step.number}</span>
                    </div>
                    <h3 className="praxis-title text-2xl font-semibold tracking-[-0.04em]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                  </motion.article>
                );
              })}
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.022] px-5 py-12 sm:px-10 sm:py-16 lg:px-14">
              <div className="landing-grid absolute inset-0 opacity-20" />
              <div className="relative grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div className="text-center lg:text-left">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-domain-gold">Input primário: você</p>
                  <h3 className="praxis-title mt-4 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">Fale como quem manda um áudio para um amigo.</h3>
                  <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
                    “Hoje eu preciso treinar, responder o Breno, estudar 40 minutos e resolver o EncarteZap.” O Praxis entende a bagunça e devolve clareza.
                  </p>
                </div>
                <PraxisVoiceFlowDemo />
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-24 border-y border-white/[0.055] bg-white/[0.016] px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <SectionLabel>Um sistema só</SectionLabel>
                <h2 className="praxis-title max-w-2xl text-4xl font-bold tracking-[-0.055em] sm:text-5xl lg:text-6xl">Sua vida inteira não precisa morar em seis aplicativos.</h2>
              </div>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end lg:text-lg">
                Tarefas, foco, hábitos, treino, nutrição, metas, rotinas e revisão compartilham o mesmo contexto. Menos troca de ferramenta. Menos recomeço. Mais continuidade.
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.eyebrow}
                    className={`card-domain ${feature.accent} group rounded-3xl border border-white/[0.06] bg-background/45 p-6 transition-colors hover:border-white/[0.11] hover:bg-white/[0.028] sm:p-7`}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, delay: (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="mb-10 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.065] bg-white/[0.035]">
                        <Icon className="h-5 w-5 text-domain" aria-hidden />
                      </div>
                      <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground/30 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                    </div>
                    <p className="text-xs font-medium text-domain">{feature.eyebrow}</p>
                    <h3 className="praxis-title mt-3 text-2xl font-semibold leading-tight tracking-[-0.04em]">{feature.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="filosofia" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
              <div>
                <SectionLabel>Por que Praxis</SectionLabel>
                <h2 className="praxis-title text-4xl font-bold tracking-[-0.055em] sm:text-5xl lg:text-6xl">Porque saber o que fazer não é o mesmo que fazer.</h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                  Praxis é ação consciente. O produto existe para uma coisa simples: reduzir o espaço entre a intenção e a prática.
                </p>
                <div className="mt-8 flex items-center gap-3 text-sm font-medium text-foreground/85">
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-domain-gold/20 bg-[#0c0c10]">
                    <img src="/praxis-logo.png?v=8" alt="" width={36} height={36} className="h-[86%] w-[86%] object-contain" />
                  </span>
                  <span>Fale. Organize. Execute.</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.022] p-6 sm:p-8 lg:p-10">
                <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 bg-[radial-gradient(circle,hsl(var(--primary)/0.09),transparent_68%)]" />
                <div className="relative grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.055] bg-black/15 p-5 sm:p-6">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035]">
                      <CalendarDays className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Antes</p>
                    <p className="praxis-title mt-2 text-xl font-semibold">Planejar para sentir que avançou.</p>
                    <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                      <li className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/20" /> Anotações espalhadas</li>
                      <li className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/20" /> Decidir a mesma coisa todo dia</li>
                      <li className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/20" /> Culpa por não manter o sistema</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-domain-gold/15 bg-domain-gold/[0.055] p-5 sm:p-6">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-domain-gold/20 bg-domain-gold/10">
                      <Zap className="h-5 w-5 text-domain-gold" aria-hidden />
                    </div>
                    <p className="text-xs font-medium text-domain-gold">Com Praxis</p>
                    <p className="praxis-title mt-2 text-xl font-semibold">Organizar para começar a executar.</p>
                    <ul className="mt-5 space-y-3 text-sm text-foreground/75">
                      <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-domain-wellness" /> Um lugar para o dia inteiro</li>
                      <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-domain-wellness" /> Clareza do próximo passo</li>
                      <li className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-domain-wellness" /> Revisão curta e honesta</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 sm:pb-32 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] border border-domain-gold/15 bg-[linear-gradient(135deg,hsl(var(--domain-gold)/0.085),hsl(var(--background))_48%,hsl(var(--primary)/0.06))] px-6 py-16 text-center sm:px-10 sm:py-20 lg:px-16 lg:py-24">
            <div className="landing-grid absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[600px] -translate-x-1/2 bg-[radial-gradient(circle,hsl(var(--domain-gold)/0.12),transparent_66%)] blur-2xl" />
            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-domain-gold/20 bg-domain-gold/10">
                <Leaf className="h-6 w-6 text-domain-gold" aria-hidden />
              </div>
              <h2 className="praxis-title text-4xl font-bold tracking-[-0.06em] sm:text-5xl lg:text-6xl">Menos plano. Mais prática.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                Abra o Praxis, fale o que está na cabeça e comece pelo próximo passo que realmente importa.
              </p>
              {isAuthenticated ? (
                <Button asChild size="lg" className="group mt-9 h-12 rounded-full bg-domain-gold px-7 text-sm font-semibold text-black shadow-[0_14px_45px_hsl(var(--domain-gold)/0.18)] hover:bg-domain-gold/90">
                  <Link to="/">
                    Abrir o app
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="group mt-9 h-12 rounded-full bg-domain-gold px-7 text-sm font-semibold text-black shadow-[0_14px_45px_hsl(var(--domain-gold)/0.18)] hover:bg-domain-gold/90">
                  <Link to="/entrar">
                    Entrar no Praxis
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.055] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <PraxisBrand />
          <p className="text-xs text-muted-foreground">Fale. Organize. Execute. — Praxis {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
