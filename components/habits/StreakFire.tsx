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
    const baseY = size * 0.93;
    const scale = size / 300;

    // Flame particles — metaball bodies that rise, shrink, and shift hue
    type FlameP = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; maxR: number;
      life: number; maxLife: number;
      seed: number;
      active: boolean;
    };
    const flames: FlameP[] = [];
    for (let i = 0; i < 80; i++) {
      flames.push({ x: 0, y: 0, vx: 0, vy: 0, r: 0, maxR: 0, life: 0, maxLife: 0, seed: 0, active: false });
    }

    function spawnFlame(fromCenter: boolean) {
      for (const f of flames) {
        if (!f.active) {
          // Two spawn zones: center (big bodies) and edges (small tongues)
          const spread = fromCenter ? 8 * scale : 18 * scale;
          f.x = cx + (Math.random() - 0.5) * spread;
          f.y = baseY - Math.random() * 6 * scale;
          f.vx = (Math.random() - 0.5) * (fromCenter ? 0.8 : 1.8) * scale;
          f.vy = -(fromCenter ? 2.2 + Math.random() * 1.5 : 1.2 + Math.random() * 2.2) * scale;
          f.life = 0;
          f.maxLife = fromCenter ? 34 + Math.random() * 18 : 20 + Math.random() * 20;
          f.maxR = (fromCenter ? 22 + Math.random() * 10 : 10 + Math.random() * 8) * scale;
          f.r = f.maxR * 0.4;
          f.seed = Math.random() * Math.PI * 2;
          f.active = true;
          return;
        }
      }
    }

    // Sparks — bright embers that float up and twist
    type Spark = {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      sz: number; active: boolean;
      twist: number;
    };
    const sparks: Spark[] = [];
    for (let i = 0; i < 30; i++) {
      sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, sz: 0, active: false, twist: 0 });
    }

    function spawnSpark() {
      for (const s of sparks) {
        if (!s.active) {
          s.x = cx + (Math.random() - 0.5) * 36 * scale;
          s.y = baseY - 40 * scale - Math.random() * 60 * scale;
          s.vx = (Math.random() - 0.5) * 2.8 * scale;
          s.vy = -(1.2 + Math.random() * 2.5) * scale;
          s.life = 0;
          s.maxLife = 30 + Math.random() * 45;
          s.sz = (0.5 + Math.random() * 1.8) * scale;
          s.twist = Math.random() * Math.PI * 2;
          s.active = true;
          return;
        }
      }
    }

    let time = 0;
    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, size, size);
      time += 0.016;
      frame++;

      // Wind — two oscillators at different frequencies give the flame a
      // living, multi-directional lean without looking like a wildfire.
      const wind =
        Math.sin(time * 0.55) * 0.9 +
        Math.sin(time * 1.3 + 0.7) * 0.4;
      // Occasional "gust" — stronger, briefer horizontal burst
      const gust = Math.sin(time * 0.22) > 0.85
        ? Math.sin(time * 3.0) * 1.8
        : 0;

      // Spawn: aggressive center flames + edge tongues
      if (frame % 1 === 0) {
        spawnFlame(true);
        if (Math.random() > 0.3) spawnFlame(false);
        if (Math.random() > 0.6) spawnFlame(false);
      }
      if (frame % 4 === 0) spawnSpark();

      const s = scale;
      const sin = Math.sin;

      // Ambient ground glow — warm halo under the flame
      const glowPulse = sin(time * 4) * 0.04 + 0.12;
      const glow = ctx.createRadialGradient(cx, baseY - 20 * s, 5 * s, cx, baseY - 10 * s, 110 * s);
      glow.addColorStop(0, `rgba(255, 150, 40, ${glowPulse * 1.8})`);
      glow.addColorStop(0.35, `rgba(255, 80, 10, ${glowPulse * 0.7})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Hot base — always-on bright core at the bottom of the flame
      const baseGlow = ctx.createRadialGradient(
        cx, baseY - 18 * s, 2 * s,
        cx, baseY - 18 * s, 38 * s
      );
      baseGlow.addColorStop(0, 'rgba(255, 255, 220, 0.75)');
      baseGlow.addColorStop(0.3, 'rgba(255, 230, 120, 0.55)');
      baseGlow.addColorStop(0.7, 'rgba(255, 140, 30, 0.25)');
      baseGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = baseGlow;
      ctx.fillRect(0, 0, size, size);

      // Additive blending for fire body
      ctx.globalCompositeOperation = 'lighter';

      // Update + draw flame metaballs
      for (const f of flames) {
        if (!f.active) continue;
        f.life++;

        // Turbulence: multi-frequency sway for a flickering, dancing flame.
        // Height ratio — higher particles sway and lean more.
        const heightFromBase = Math.max(0, baseY - f.y);
        const heightRatio = Math.min(1, heightFromBase / (size * 0.75));
        const swayStrength = 0.12 + heightRatio * 0.35;
        const turb =
          sin(f.life * 0.24 + f.seed) * swayStrength * s +
          sin(time * 2.2 + f.y * 0.03 + f.seed * 0.5) * swayStrength * 0.6 * s;
        // Wind pushes particles harder the higher they rise — keeps the base
        // anchored but lets the tip flick left/right in different directions.
        const windPush = (wind + gust) * heightRatio * 0.22 * s;
        f.vx += turb + windPush;
        f.vx *= 0.93;
        f.vy -= 0.06 * s;
        f.x += f.vx;
        f.y += f.vy;

        if (f.life >= f.maxLife) { f.active = false; continue; }

        const lifeT = f.life / f.maxLife;
        // Radius curve: grow fast, then taper
        const rCurve = lifeT < 0.2
          ? f.maxR * (0.4 + lifeT * 3.0)
          : f.maxR * (1 - (lifeT - 0.2) * 1.15);
        f.r = Math.max(0.5, rCurve);

        // Color: bright yellow-white near base, orange middle, red-dark at top
        // heightRatio from 0 (base) to 1 (top)
        const coreHot = Math.max(0, 1 - heightRatio * 1.5) * (1 - lifeT);
        const red = 255;
        const green = Math.floor(
          40 + (1 - heightRatio) * 180 + coreHot * 35
        );
        const blue = Math.floor(coreHot * 80);
        const alpha = (1 - lifeT) * (0.55 + (1 - heightRatio) * 0.3);

        if (f.r > 1) {
          // Outer wide soft glow
          const outer = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.8);
          outer.addColorStop(0, `rgba(${red}, ${Math.min(255, green)}, ${Math.min(255, blue)}, ${alpha * 0.85})`);
          outer.addColorStop(0.5, `rgba(${red}, ${Math.floor(green * 0.6)}, 0, ${alpha * 0.28})`);
          outer.addColorStop(1, 'rgba(40, 0, 0, 0)');
          ctx.fillStyle = outer;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Tighter mid body
          ctx.fillStyle = `rgba(${red}, ${Math.min(255, green + 25)}, ${Math.min(255, blue + 10)}, ${alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 0.95, 0, Math.PI * 2);
          ctx.fill();

          // Hot yellow-white core for low-altitude particles
          if (coreHot > 0.25 && f.r > 2) {
            ctx.fillStyle = `rgba(255, ${Math.min(255, 220 + Math.floor(coreHot * 35))}, ${Math.min(255, 140 + Math.floor(coreHot * 60))}, ${coreHot * alpha * 0.95})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Sparks — bright twisting embers
      for (const sp of sparks) {
        if (!sp.active) continue;
        sp.life++;
        sp.twist += 0.22;
        sp.vx += sin(sp.twist) * 0.1 * s;
        sp.vy -= 0.035 * s;
        sp.x += sp.vx;
        sp.y += sp.vy;
        if (sp.life >= sp.maxLife) { sp.active = false; continue; }
        const t = sp.life / sp.maxLife;
        const alpha = (1 - t) * 0.95;
        const sz = sp.sz * (1 - t * 0.4);

        // Glow halo
        const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sz * 5);
        sg.addColorStop(0, `rgba(255, ${210 + Math.floor(Math.random() * 45)}, 90, ${alpha * 0.55})`);
        sg.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sz * 5, 0, Math.PI * 2);
        ctx.fill();

        // Bright pinpoint
        ctx.fillStyle = `rgba(255, ${230 + Math.floor(Math.random() * 25)}, ${140 + Math.floor(Math.random() * 70)}, ${alpha})`;
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
