import { useEffect } from 'react';
import { toast } from 'sonner';

const shownLevels = new Set();

/** Dispara toast Praxis quando API retorna xp_sync.leveled_up (evento interno: praxis-level-up). */
export function notifyPraxisLevelUp(detail) {
  if (!detail?.leveled_up) return;
  const level = detail.level;
  if (shownLevels.has(level)) return;
  shownLevels.add(level);
  toast.success('Subiu de nível no Praxis', { description: `Nível ${level} — ${detail.level_name || ''}`.trim(), duration: 6000 });
  window.dispatchEvent(new CustomEvent('praxis-confetti'));
}

export function usePraxisLevelUpListener() {
  useEffect(() => {
    const handler = (e) => notifyPraxisLevelUp(e.detail);
    window.addEventListener('praxis-level-up', handler);
    return () => window.removeEventListener('praxis-level-up', handler);
  }, []);
}

export function dispatchPraxisLevelUpFromResponse(payload) {
  const xp = payload?.xp_sync;
  if (!xp?.leveled_up) return;
  window.dispatchEvent(new CustomEvent('praxis-level-up', { detail: xp }));
}