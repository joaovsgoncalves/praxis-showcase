import React from 'react';
import { Compass, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatGuidanceTime, formatGuidanceReason } from '@/lib/projects';

export default function ContinuityPriorityPanel({
  guidance,
  isLoading = false,
  isError = false,
  onOpenProject,
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-white/[0.08] bg-card/25 p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
        </div>
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/[0.04]" />
      </section>
    );
  }

  if (isError) {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-white/[0.08] bg-card/25 p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          <Compass className="h-3.5 w-3.5 text-muted-foreground" />
          <span>O que vem primeiro</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível carregar a recomendação do dia. Suas frentes continuam disponíveis abaixo.
        </p>
      </section>
    );
  }

  const isFresh = Boolean(guidance?.fresh && Array.isArray(guidance?.priorities) && guidance.priorities.length > 0);

  if (!isFresh) {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-white/[0.08] bg-card/25 p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          <Compass className="h-3.5 w-3.5 text-muted-foreground" />
          <span>O que vem primeiro</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          O Sêneca ainda não atualizou a ordem de hoje. Suas frentes continuam disponíveis abaixo.
        </p>
      </section>
    );
  }

  const items = guidance.priorities.slice(0, 3);
  const p1 = items.find((p) => p.rank === 1) || items[0];
  const rest = items.filter((p) => p !== p1);
  const updateTimeText = formatGuidanceTime(guidance.generated_at);

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-domain-gold/20 bg-domain-gold/[0.03] p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-domain-gold" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-domain-gold/90">
            O que vem primeiro
          </h2>
        </div>
        {updateTimeText ? (
          <span className="text-[11px] text-muted-foreground/70">
            {updateTimeText}
          </span>
        ) : null}
      </div>

      {/* Prioridade 1 dominante */}
      <div className="rounded-xl border border-domain-gold/35 bg-[#161a23] p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="flex items-start gap-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-domain-gold/40 bg-domain-gold/10 text-xs font-bold tabular-nums text-domain-gold">
            01
          </span>
          <div className="min-w-0 flex-1">
            {p1.project?.name || p1.project_slug ? (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-domain-gold/90">
                {p1.project?.name || p1.project_slug}
              </span>
            ) : null}
            <p className="mt-0.5 text-base sm:text-lg font-semibold leading-snug text-stone-100">
              {p1.action}
            </p>
            {formatGuidanceReason(p1) ? (
              <p className="mt-1.5 text-xs text-muted-foreground/80">
                {formatGuidanceReason(p1)}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {p1.project_slug || p1.project ? (
                <button
                  type="button"
                  onClick={() => onOpenProject?.(p1)}
                  aria-label={`Abrir frente ${p1.project?.name || p1.project_slug || 'relacionada'}`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-stone-200 transition-colors hover:border-domain-gold/30 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-gold/50"
                >
                  <span>Abrir frente</span>
                  <ArrowRight className="h-3.5 w-3.5 text-domain-gold" />
                </button>
              ) : null}

              {p1.task_id ? (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  aria-label="Ver em Hoje"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-domain-gold px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-domain-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span>Ver em Hoje</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Prioridades 2 e 3 compactas */}
      {rest.length > 0 ? (
        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          {rest.map((item) => (
            <div
              key={item.rank}
              className="flex min-w-0 items-start gap-3 rounded-xl border border-white/[0.07] bg-[#141820]/90 p-3.5 sm:p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[10px] font-semibold tabular-nums text-stone-300">
                {String(item.rank).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                {item.project?.name || item.project_slug ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                    {item.project?.name || item.project_slug}
                  </span>
                ) : null}
                <p className="mt-0.5 text-sm font-medium leading-snug text-stone-200">
                  {item.action}
                </p>
                {formatGuidanceReason(item) ? (
                  <p className="mt-1 text-[11px] text-muted-foreground/75">
                    {formatGuidanceReason(item)}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.project_slug || item.project ? (
                    <button
                      type="button"
                      onClick={() => onOpenProject?.(item)}
                      aria-label={`Abrir frente ${item.project?.name || item.project_slug || 'relacionada'}`}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-gold/50"
                    >
                      <span>Abrir frente</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ) : null}

                  {item.task_id ? (
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      aria-label="Ver em Hoje"
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-domain-gold/30 bg-domain-gold/10 px-2.5 py-1.5 text-xs font-medium text-domain-gold transition-colors hover:bg-domain-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-gold/50"
                    >
                      <span>Ver em Hoje</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
