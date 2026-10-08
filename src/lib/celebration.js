import confetti from 'canvas-confetti';

/** Pequena explosão no ponto do toque — hábitos e tarefas. */
export function sparkAt(x, y, palette = 'gold') {
  const colors =
    palette === 'ember'
      ? ['#FB923C', '#F59E0B', '#FFC857', '#FFFFFF']
      : ['#FFC857', '#F59E0B', '#34D399', '#FFFFFF'];
  confetti({
    particleCount: 16,
    spread: 42,
    startVelocity: 24,
    gravity: 0.85,
    ticks: 95,
    scalar: 0.75,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors,
  });
}

export function sparkFromElement(el, palette = 'gold') {
  const rect = el?.getBoundingClientRect?.();
  if (!rect) return;
  sparkAt(rect.left + rect.width / 2, rect.top + rect.height / 2, palette);
}