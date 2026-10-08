import React from 'react';
import { ChevronRight } from 'lucide-react';
import { FRONT_STATUS_LABELS } from '@/lib/projects';
import { cn } from '@/lib/utils';

export default function FrontRow({
  project,
  onOpen,
  isSubfront = false,
  parentName = '',
  recommendedRank = null,
}) {
  if (!project) return null;

  const statusLabel = FRONT_STATUS_LABELS[project.column] || 'Depois';
  const hasBlock = Boolean(String(project.blocked_note || '').trim());

  // Tipo / relação quando necessário
  let relationText = '';
  if (isSubfront && parentName) {
    relationText = project.kind === 'cliente' ? `Cliente · ${parentName}` : `Subfrente de ${parentName}`;
  } else if (!isSubfront && project.kind === 'cliente') {
    relationText = 'Cliente';
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(project)}
      aria-label={`Abrir frente ${project.name}`}
      className={cn(
        'group flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#141820]/70 px-3.5 py-2.5 text-left transition-colors',
        'hover:border-white/15 hover:bg-[#181d27]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-domain-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isSubfront && 'ml-3 sm:ml-5 border-l-2 border-l-white/20 pl-3 sm:pl-4 bg-[#12151c]/60'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="truncate text-sm font-medium text-stone-100 group-hover:text-white">
          {project.name}
        </span>
        {relationText ? (
          <span className="text-[11px] text-muted-foreground/65">
            {relationText}
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {hasBlock ? (
          <span
            className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
            title={project.blocked_note}
          >
            Bloqueada
          </span>
        ) : null}

        {recommendedRank != null ? (
          <span className="inline-flex items-center rounded-full border border-domain-gold/30 bg-domain-gold/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-domain-gold">
            #{recommendedRank} hoje
          </span>
        ) : null}

        <span className="text-xs text-muted-foreground/75">
          {statusLabel}
        </span>

        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-300" />
      </div>
    </button>
  );
}
