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
    const baseY = size * 0.88;
    const scale = size / 300; // scale factor from the original 300px animation

    // Sparks
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; sz: number; active: boolean }[] = [];
    for (let i = 0; i < 15; i++) {
      sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, sz: 0, active: false });
    }

    function spawnSpark() {
      for (const s of sparks) {
        if (!s.active) {
          s.x = cx + (Math.random() - 0.5) * 20 * scale;
          s.y = baseY - 20 * scale - Math.random() * 40 * scale;
          s.vx = (Math.random() - 0.5) * 1.5 * scale;
          s.vy = -(0.3 + Math.random() * 1) * scale;
          s.life = 0;
          s.maxLife = 20 + Math.random() * 30;
          s.sz = (0.5 + Math.random() * 1.5) * scale;
          s.active = true;
          return;
        }
      }
    }

    let time = 0;
    let sparkTimer = 0;

    function draw() {
      ctx.clearRect(0, 0, size, size);
      time += 0.016;
      sparkTimer++;
      if (sparkTimer % 3 === 0) spawnSpark();

      const { sin } = Math;
      const s = scale;

      // Ambient glow
      const glow = ctx.createRadialGradient(cx, baseY - 30 * s, 5 * s, cx, baseY - 20 * s, 80 * s);
      glow.addColorStop(0, 'rgba(255, 120, 0, 0.12)');
      glow.addColorStop(0.5, 'rgba(255, 60, 0, 0.04)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      // Outer flame
      const w1 = sin(time * 3.2) * 6 * s;
      const w2 = sin(time * 4.1 + 1) * 5 * s;
      const w3 = sin(time * 2.7 + 2) * 4 * s;
      const tipY = size * 0.15 + sin(time * 3.8) * 8 * s;
      const tipX = cx + sin(time * 2.5) * 5 * s;

      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.bezierCurveTo(cx + 22 * s + w1, baseY - 15 * s, cx + 55 * s + w2, baseY - 50 * s, cx + 52 * s + w3, baseY - 90 * s);
      ctx.bezierCurveTo(cx + 46 * s + w1, baseY - 120 * s, cx + 28 * s + w2, baseY - 150 * s, tipX, tipY);
      ctx.bezierCurveTo(cx - 28 * s - w2, baseY - 150 * s, cx - 46 * s - w1, baseY - 120 * s, cx - 52 * s - w3, baseY - 90 * s);
      ctx.bezierCurveTo(cx - 55 * s - w2, baseY - 50 * s, cx - 22 * s - w1, baseY - 15 * s, cx, baseY);
      ctx.closePath();
      const outerG = ctx.createLinearGradient(cx, baseY, cx, size * 0.1);
      outerG.addColorStop(0, '#ff4500');
      outerG.addColorStop(0.3, '#ff5e00');
      outerG.addColorStop(0.6, '#ff3000');
      outerG.addColorStop(1, '#cc1100');
      ctx.fillStyle = outerG;
      ctx.fill();

      // Inner flame
      const iw1 = sin(time * 3.8 + 0.5) * 4 * s;
      const iw2 = sin(time * 4.5 + 1.5) * 3 * s;
      const iTipY = size * 0.28 + sin(time * 4.2 + 1) * 6 * s;
      const iTipX = cx + sin(time * 3.0 + 0.5) * 3 * s;

      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.bezierCurveTo(cx + 14 * s + iw1, baseY - 12 * s, cx + 34 * s + iw2, baseY - 35 * s, cx + 32 * s + iw1, baseY - 60 * s);
      ctx.bezierCurveTo(cx + 28 * s + iw2, baseY - 82 * s, cx + 16 * s + iw1, baseY - 100 * s, iTipX, iTipY);
      ctx.bezierCurveTo(cx - 16 * s - iw1, baseY - 100 * s, cx - 28 * s - iw2, baseY - 82 * s, cx - 32 * s - iw1, baseY - 60 * s);
      ctx.bezierCurveTo(cx - 34 * s - iw2, baseY - 35 * s, cx - 14 * s - iw1, baseY - 12 * s, cx, baseY);
      ctx.closePath();
      const midG = ctx.createLinearGradient(cx, baseY, cx, size * 0.25);
      midG.addColorStop(0, '#ffcc00');
      midG.addColorStop(0.3, '#ffaa00');
      midG.addColorStop(0.7, '#ff7700');
      midG.addColorStop(1, '#ff5500');
      ctx.fillStyle = midG;
      ctx.fill();

      // Core flame
      const cw1 = sin(time * 5.0 + 2) * 2 * s;
      const cTipY = size * 0.42 + sin(time * 4.8 + 2) * 5 * s;
      const cTipX = cx + sin(time * 3.5 + 1) * 2 * s;

      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.bezierCurveTo(cx + 8 * s + cw1, baseY - 8 * s, cx + 18 * s, baseY - 25 * s, cx + 16 * s + cw1, baseY - 40 * s);
      ctx.bezierCurveTo(cx + 12 * s, baseY - 55 * s, cx + 6 * s, baseY - 68 * s, cTipX, cTipY);
      ctx.bezierCurveTo(cx - 6 * s, baseY - 68 * s, cx - 12 * s, baseY - 55 * s, cx - 16 * s - cw1, baseY - 40 * s);
      ctx.bezierCurveTo(cx - 18 * s, baseY - 25 * s, cx - 8 * s - cw1, baseY - 8 * s, cx, baseY);
      ctx.closePath();
      const coreG = ctx.createLinearGradient(cx, baseY, cx, size * 0.4);
      coreG.addColorStop(0, '#ffffee');
      coreG.addColorStop(0.3, '#ffeeaa');
      coreG.addColorStop(0.7, '#ffdd55');
      coreG.addColorStop(1, '#ffbb00');
      ctx.fillStyle = coreG;
      ctx.fill();

      // Sparks
      ctx.globalCompositeOperation = 'lighter';
      for (const sp of sparks) {
        if (!sp.active) continue;
        sp.life++;
        sp.vx += sin(sp.life * 0.15) * 0.04 * s;
        sp.vy -= 0.02 * s;
        sp.x += sp.vx;
        sp.y += sp.vy;
        if (sp.life >= sp.maxLife) { sp.active = false; continue; }
        const t = sp.life / sp.maxLife;
        const alpha = (1 - t) * 0.7;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.sz * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${160 + Math.random() * 60},${20 + Math.random() * 30},${alpha})`;
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
