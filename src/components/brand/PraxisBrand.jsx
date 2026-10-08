import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Marca canônica da Praxis — logo P+seta (mesmo monograma do favicon/PWA).
 * Usada na landing e dentro do produto para uma identidade só.
 */
export default function PraxisBrand({
  compact = false,
  tagline = 'Menos plano. Mais prática.',
  className,
  markClassName,
  nameClassName,
  taglineClassName,
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
              className={cn(
                'praxis-brand-mark relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl',
                'border border-white/10 bg-[#0c0c10] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                markClassName,
              )}
              aria-hidden
            >
              <img
                src="/praxis-logo.png?v=8"
                alt=""
                width={40}
                height={40}
                decoding="async"
                className="h-[86%] w-[86%] object-contain"
              />
            </div>

      {!compact ? (
        <div className="min-w-0">
          <p className={cn('praxis-title text-lg font-bold leading-none tracking-[-0.055em]', nameClassName)}>
            Praxis
          </p>
          {tagline ? (
            <p
              className={cn(
                'mt-1 truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground',
                taglineClassName,
              )}
            >
              {tagline}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
