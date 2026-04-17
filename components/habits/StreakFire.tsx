'use client';

import { useEffect, useRef } from 'react';

interface StreakFireProps {
  size?: number;
  streak: number;
}

export function StreakFire({ size = 60, streak }: StreakFireProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const baseY = size * 0.92;
    const scale = size / 300;

    // Flame particles — metaball-style bodies that rise and shrink
    type FlameP = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; maxR: number;
      life: number; maxLife: number;
      hue: number;
      active: boolean;
    };
    const flames: FlameP[] = [];
    for (let i = 0; i < 60; i++) {
      flames.push({ x: 0, y: 0, vx: 0, vy: 0, r: 0, maxR: 0, life: 0, maxLife: 0, hue: 0, active: false });
    }

    function spawnFlame() {
      for (const f of flames) {
        if (!f.active) {
          const spread = 14 * scale;
          f.x = cx + (Math.random() - 0.5) * spread;
          f.y = baseY;
          f.vx = (Math.random() - 0.5) * 1.2 * scale;
          f.vy = -(1.6 + Math.random() * 1.8) * scale;
          f.life = 0;
          f.maxLife = 28 + Math.random() * 22;
          f.maxR = (16 + Math.random() * 10) * scale;
          f.r = f.maxR * 0.3;
          f.hue = 15 + Math.random() * 30;
          f.active = true;
          return;
        }
      }
    }

    // Sparks — bright embers that float higher
    type Spark = {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      sz: number; active: boolean;
      twist: number;
    };
    const sparks: Spark[] = [];
    for (let i = 0; i < 25; i++) {
      sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, sz: 0, active: false, twist: 0 });
    }

    function spawnSpark() {
      for (const s of sparks) {
        if (!s.active) {
          s.x = cx + (Math.random() - 0.5) * 30 * scale;
          s.y = baseY - 30 * scale - Math.random() * 60 * scale;
          s.vx = (Math.random() - 0.5) * 2.5 * scale;
          s.vy = -(1 + Math.random() * 2.2) * scale;
          s.life = 0;
          s.maxLife = 30 + Math.random() * 40;
          s.sz = (0.6 + Math.random() * 1.8) * scale;
          s.twist = Math.random() * Math.PI * 2;
          s.active = true;
          return;
        }
      }
    }

    let time = 0;
    let flameTimer = 0;
    let sparkTimer = 0;

    function draw() {
      ctx.clearRect(0, 0, size, size);
      time += 0.016;
      flameTimer++;
      sparkTimer++;

      // Spawn flame particles aggressively
      if (flameTimer % 1 === 0) {
        spawnFlame();
        if (Math.random() > 0.4) spawnFlame();
      }
      if (sparkTimer % 3 === 0) spawnSpark();

      const s = scale;

      // Ambient glow pulsing with heartbeat
      const glowPulse = Math.sin(time * 4) * 0.03 + 0.1;
      const glow = ctx.createRadialGradient(cx, baseY - 35 * s, 5 * s, cx, baseY - 25 * s, 90 * s);
      glow.addColorStop(0, `rgba(255, 140, 30, ${glowPulse * 1.5})`);
      glow.addColorStop(0.4, `rgba(255, 60, 0, ${glowPulse * 0.5})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Update and draw flame bodies (back-to-front)
      ctx.globalCompositeOperation = 'lighter';
      for (const f of flames) {
        if (!f.active) continue;
        f.life++;
        // Turbulence — adds horizontal sway and makes the flame dance
        const turbulence = Math.sin(f.life * 0.3 + f.x * 0.1) * 0.15 * s
          + Math.sin(time * 3 + f.y * 0.02) * 0.2 * s;
        f.vx += turbulence;
        f.vx *= 0.94; // damping
        f.vy -= 0.04 * s; // upward acceleration
        f.x += f.vx;
        f.y += f.vy;

        if (f.life >= f.maxLife) { f.active = false; continue; }

        const lifeT = f.life / f.maxLife;
        // Radius: grows then shrinks
        const rCurve = lifeT < 0.25
          ? f.maxR * (0.3 + lifeT * 2.8)
          : f.maxR * (1 - (lifeT - 0.25) * 1.1);
        f.r = Math.max(0.5, rCurve);

        // Color shifts from red-orange at bottom to yellow-white at top
        const heightT = Math.max(0, Math.min(1, (baseY - f.y) / (size * 0.7)));
        const r = 255;
        const g = Math.floor(60 + heightT * 180 + (1 - lifeT) * 20);
        const b = Math.floor(heightT * heightT * 80);
        const alpha = (1 - lifeT) * 0.65;

        // Outer soft glow
        const g1 = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.5);
        g1.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
        g1.addColorStop(0.5, `rgba(${r}, ${Math.floor(g * 0.7)}, 0, ${alpha * 0.3})`);
        g1.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Hot core
        if (f.r > 2) {
          ctx.fillStyle = `rgba(${r}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 40)}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Sparks — bright embers that twist upward
      for (const sp of sparks) {
        if (!sp.active) continue;
        sp.life++;
        sp.twist += 0.2;
        sp.vx += Math.sin(sp.twist) * 0.08 * s;
        sp.vy -= 0.03 * s;
        sp.x += sp.vx;
        sp.y += sp.vy;
        if (sp.life >= sp.maxLife) { sp.active = false; continue; }
        const t = sp.life / sp.maxLife;
        const alpha = (1 - t) * 0.9;
        const sz = sp.sz * (1 - t * 0.4);

        // Spark glow
        const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sz * 4);
        sg.addColorStop(0, `rgba(255, ${200 + Math.floor(Math.random() * 55)}, 80, ${alpha * 0.6})`);
        sg.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz * 4, 0, Math.PI * 2);
        ctx.fill();

        // Bright spark
        ctx.fillStyle = `rgba(255, ${220 + Math.floor(Math.random() * 35)}, ${120 + Math.floor(Math.random() * 60)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size, streak]);

  if (streak === 0) return null;

  return (
    <div className="inline-flex items-center gap-1">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
      />
      <span className="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 text-sm">
        {streak}d
      </span>
    </div>
  );
}
