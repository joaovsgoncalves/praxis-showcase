import React, { useEffect, useRef } from 'react';

/**
 * Atmosfera ouro da Praxis — pontos que sobem de verdade.
 *
 * - Sempre anima (reduced-motion só deixa mais calmo, não congela).
 * - Canvas full-viewport, atrás do conteúdo (z-0).
 * - Partículas grandes o bastante pra ler no celular com cards por cima.
 */
export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return undefined;

    let raf = 0;
    let alive = true;
    let last = performance.now();
    let calm =
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMq = (e) => {
      calm = e.matches === true;
    };
    mq?.addEventListener?.('change', onMq);

    const cssSize = () => ({
      w: Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1),
      h: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1),
    });

    const resize = () => {
      const { w, h } = cssSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // reset transform every resize — draw in CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const countFor = () => {
      const { w, h } = cssSize();
      const area = w * h;
      // density dialed down 2026-08-06 — was too loud over content cards.
      // 22000 px² per particle (was 12000) → ~40% fewer on a 1366×768.
      const base = Math.round(area / 22000);
      const n = Math.max(28, Math.min(60, base));
      return calm ? Math.max(18, Math.round(n * 0.55)) : n;
    };

    const spawn = (fromBottom) => {
      const { w, h } = cssSize();
      // speed in px/sec — clearly rising even at a glance
      const speedScale = calm ? 0.45 : 1;
      return {
        x: Math.random() * w,
        y: fromBottom ? h + Math.random() * 60 : Math.random() * h,
        r: calm ? 1.6 + Math.random() * 2.2 : 2.2 + Math.random() * 3.4,
        vx: (Math.random() - 0.5) * 28 * speedScale,
        vy: -(55 + Math.random() * 85) * speedScale,
        life: fromBottom ? 0 : Math.random() * 0.55,
        maxLife: (calm ? 8 : 5.5) + Math.random() * (calm ? 6 : 5),
        hue: 34 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
        spin: (0.9 + Math.random() * 1.8) * (Math.random() < 0.5 ? -1 : 1),
      };
    };

    const particles = Array.from({ length: countFor() }, () => spawn(false));

    const draw = (dt) => {
      const { w, h } = cssSize();
      ctx.clearRect(0, 0, w, h);

      const want = countFor();
      while (particles.length < want) particles.push(spawn(true));
      if (particles.length > want + 12) particles.length = want;

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life += dt;
        p.phase += dt * p.spin;
        p.x += p.vx * dt + Math.sin(p.phase) * 10 * dt;
        p.y += p.vy * dt;

        const t = p.life / p.maxLife;
        if (t >= 1 || p.y < -40 || p.x < -60 || p.x > w + 60) {
          particles[i] = spawn(true);
          continue;
        }

        // fade in / out
        const env = t < 0.12 ? t / 0.12 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const tw = 0.75 + Math.sin(p.phase * 1.7) * 0.25;
        // 2026-08-06 dial-down: opacity 0.82 → 0.55, halo 5.2× → 2.8×.
        // Still visible, doesn't paint over task text.
        const alpha = Math.min(0.9, Math.max(0.15, env * tw * (calm ? 0.4 : 0.55)));
        const radius = p.r * (1 - t * 0.2);
        const halo = radius * (calm ? 2.4 : 2.8);

        // soft glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
        g.addColorStop(0, `hsla(${p.hue}, 96%, 68%, ${alpha})`);
        g.addColorStop(0.4, `hsla(${p.hue}, 92%, 56%, ${alpha * 0.4})`);
        g.addColorStop(1, `hsla(${p.hue}, 85%, 48%, 0)`);
        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(p.x, p.y, halo, 0, Math.PI * 2);
        ctx.fill();

        // bright core
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 100%, 82%, ${Math.min(1, alpha * 1.15)})`;
        ctx.arc(p.x, p.y, Math.max(1.1, radius * 0.78), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (now) => {
      if (!alive) return;
      // Never hard-stop on hidden tab forever: if visible, keep going.
      if (typeof document !== 'undefined' && document.hidden) {
        last = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.048, Math.max(0.001, (now - last) / 1000));
      last = now;
      try {
        draw(dt);
      } catch {
        // keep loop alive even if a frame fails
      }
      raf = requestAnimationFrame(tick);
    };

    // mark state for quick debug in DevTools
    canvas.dataset.praxisParticles = calm ? 'calm' : 'live';
    last = performance.now();
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-80"
      aria-hidden
    />
  );
}
