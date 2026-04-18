'use client';

import { useEffect, useRef } from 'react';

interface ParticleBurstProps {
  /** Triggers a fresh burst whenever this value changes. 0 = no burst. */
  trigger: number;
  /** Optional screen-flash alongside the burst. */
  flash?: boolean;
  /** Tint of the burst particles + flash. */
  color?: string;
  /** How many particles. */
  count?: number;
  /** Called after the animation fully finishes (~900ms). */
  onComplete?: () => void;
}

/**
 * Full-screen particle burst overlay. Fires once per `trigger` bump.
 * Reusable for level-ups, duel wins, prestige, daily chest claims, etc.
 *
 * Renders as position:fixed inset-0 pointer-events-none so it can't block
 * taps while it plays.
 */
export function ParticleBurst({
  trigger,
  flash = true,
  color = '#f97316',
  count = 80,
  onComplete,
}: ParticleBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;

    type P = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; sz: number; hue: number };
    const ps: P[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 5 + Math.random() * 9;
      ps.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 35 + Math.random() * 25,
        sz: 2 + Math.random() * 3,
        hue: Math.random() * 60 - 30,
      });
    }

    const flashEl = flashRef.current;
    if (flash && flashEl) {
      flashEl.style.opacity = '0.7';
      flashEl.style.transition = 'opacity 600ms ease-out';
      requestAnimationFrame(() => { flashEl.style.opacity = '0'; });
    }

    let done = false;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of ps) {
        p.life++;
        if (p.life > p.maxLife) continue;
        alive++;
        p.vy += 0.25;           // gravity
        p.vx *= 0.985;          // air drag
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const alpha = (1 - t) * 0.95;

        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.sz * 4);
        rg.addColorStop(0, `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        rg.addColorStop(1, `${color}00`);
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 4, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.sz * (1 - t * 0.7)), 0, Math.PI * 2); ctx.fill();
      }
      if (alive > 0) {
        animRef.current = requestAnimationFrame(draw);
      } else if (!done) {
        done = true;
        ctx.clearRect(0, 0, w, h);
        onComplete?.();
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [trigger, flash, color, count, onComplete]);

  if (!trigger) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[250]">
      {flash && (
        <div
          ref={flashRef}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${color}55, transparent 70%)`,
            opacity: 0,
          }}
        />
      )}
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
