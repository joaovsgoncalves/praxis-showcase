import React, { useEffect, useRef } from 'react';

// A canvas of rising embers whose intensity scales with `intensity` (0..1).
// Lightweight: ~24-60 sprites depending on intensity, requestAnimationFrame loop.
// The element is purely decorative — pointer-events: none in the .ember-canvas class.
export default function EmberCanvas({ intensity = 0.5 }) {
  const ref = useRef(null);
  const rafRef = useRef(null);
  const intensityRef = useRef(intensity);

  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    const W = () => canvas.clientWidth;
    const H = () => canvas.clientHeight;

    const targetCount = () => 18 + Math.round(intensityRef.current * 56);
    const particles = [];

    const spawn = (atBottom = true) => {
      const i = intensityRef.current;
      particles.push({
        x: Math.random() * W(),
        y: atBottom ? H() + Math.random() * 20 : Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.3 - Math.random() * (0.6 + i * 1.4),
        r: 0.6 + Math.random() * (0.9 + i * 1.4),
        life: 0,
        maxLife: 120 + Math.random() * (140 + i * 220),
        hue: 22 + Math.random() * 20 - i * 10, // shifts slightly toward gold as intensity rises
      });
    };

    // Pre-fill so it doesn't look empty at mount.
    for (let i = 0; i < targetCount() / 2; i++) spawn(false);

    let prev = performance.now();
    const tick = (now) => {
      const dt = Math.min(50, now - prev);
      prev = now;

      ctx.clearRect(0, 0, W(), H());

      // Replenish toward target count.
      while (particles.length < targetCount()) spawn(true);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        p.x += p.vx;
        p.y += p.vy;
        // Slight wobble for organic feel
        p.vx += (Math.random() - 0.5) * 0.012;

        const t = p.life / p.maxLife;
        if (t >= 1 || p.y < -5) {
          particles.splice(i, 1);
          continue;
        }
        // Fade in then fade out
        const alpha = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) * (0.55 + intensityRef.current * 0.4);
        const r = p.r * (1 - t * 0.4);

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
        grad.addColorStop(0.6, `hsla(${p.hue}, 95%, 55%, ${alpha * 0.55})`);
        grad.addColorStop(1, `hsla(${p.hue}, 90%, 45%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      obs.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ember-canvas absolute inset-0 w-full h-full" />;
}
