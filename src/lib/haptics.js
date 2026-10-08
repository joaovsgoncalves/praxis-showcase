/**
 * Feedback háptico seguro para mobile via navigator.vibrate.
 * No-op silencioso quando a API não existe (desktop, iOS Safari) ou quando o
 * usuário pediu redução de movimento. Nunca lança.
 */

const PATTERNS = {
  light: 10,        // concluir um item (tarefa/hábito)
  medium: [12, 40, 12], // bater meta / concluir ritual
  warning: [0, 30, 40, 30], // item atrasado / ação bloqueada
};

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Dispara uma vibração.
 * @param {'light'|'medium'|'warning'|number|number[]} pattern
 * @returns {boolean} true se a vibração foi acionada.
 */
export function haptic(pattern = 'light') {
  if (!canVibrate() || prefersReducedMotion()) return false;
  const resolved = typeof pattern === 'string' ? PATTERNS[pattern] : pattern;
  if (resolved == null) return false;
  try {
    return navigator.vibrate(resolved);
  } catch {
    return false;
  }
}

export const hapticLight = () => haptic('light');
export const hapticMedium = () => haptic('medium');
export const hapticWarning = () => haptic('warning');

export default haptic;
