'use client';

import { useEffect, useRef, useCallback } from 'react';

interface SoulOrbProps {
  /** 0-100: how "alive" the orb is. Based on XP, streaks, logs. */
  intensity: number;
  /** Size in pixels */
  size?: number;
}

export function SoulOrb({ intensity, size = 300 }: SoulOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = size;
    const H = size;
    const cx = W / 2;
    const cy = H / 2;
    const R = size * 0.25;
    const pct = Math.min(intensityRef.current, 100) / 100; // 0 to 1

    // Scale everything by intensity
    const numParticles = Math.floor(80 + pct * 420); // 80-500
    const numRingParticles = Math.floor(20 + pct * 60); // 20-80 per ring
    const numRings = pct > 0.3 ? (pct > 0.7 ? 3 : 2) : 1;
    const arcChance = pct * 0.03;
    const pulseChance = pct * 0.04;
    const connectionDist = 20 + pct * 20;

    // Color intensity: dim gray/dark red → vivid orange/red/gold
    const colorBrightness = 0.15 + pct * 0.85;

    // Particles
    const particles: { phi: number; theta: number; size: number; phase: number; speed: number; layer: number }[] = [];
    for (let i = 0; i < numParticles; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      particles.push({
        phi, theta,
        size: 0.6 + Math.random() * 1.5 * (0.5 + pct * 0.5),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        layer: Math.random(),
      });
    }

    // Rings
    const rings: { angle: number; radius: number; tiltX: number; speedMul: number; size: number; phase: number }[] = [];
    for (let r = 0; r < numRings; r++) {
      const tiltX = (r - 1) * 0.5 + Math.random() * 0.3;
      const radius = R + size * 0.04 + r * size * 0.03;
      const speedMul = 1.2 + r * 0.3;
      for (let i = 0; i < numRingParticles; i++) {
        const angle = (i / numRingParticles) * Math.PI * 2;
        rings.push({ angle, radius, tiltX, speedMul, size: 0.4 + Math.random() * 0.8, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Pulses & arcs
    const pulses: { lat: number; lon: number; radius: number; speed: number; maxRadius: number; color: number[] }[] = [];
    const arcs: { from: number; to: number; life: number; decay: number }[] = [];

    let t = 0;
    const dt = 0.015;
    const sin = Math.sin, cos = Math.cos, PI = Math.PI, PI2 = PI * 2;

    function project(x: number, y: number, z: number): [number, number, number, number] {
      const d = size * 0.875;
      const s = d / (d + z);
      return [cx + x * s, cy + y * s, s, z];
    }

    function sDist(p1: number, l1: number, p2: number, l2: number) {
      const a1 = p1 - PI / 2, a2 = p2 - PI / 2;
      const dl = l2 - l1, dp = a2 - a1;
      const a = sin(dp / 2) ** 2 + cos(a1) * cos(a2) * sin(dl / 2) ** 2;
      return 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    }

    function frame() {
      if (!ctx) return;
      t += dt;

      ctx.fillStyle = 'rgba(5, 5, 8, 1)';
      ctx.fillRect(0, 0, W, H);

      // Core glow
      const gp = sin(t * 1.2) * 0.02 + 0.05 + pct * 0.04;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + size * 0.08);
      g1.addColorStop(0, `rgba(${Math.floor(180 * colorBrightness)}, ${Math.floor(60 * colorBrightness)}, ${Math.floor(15 * colorBrightness)}, ${gp})`);
      g1.addColorStop(0.5, `rgba(${Math.floor(120 * colorBrightness)}, ${Math.floor(30 * colorBrightness)}, 8, ${gp * 0.4})`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const ry = t * 0.6;
      const rx = sin(t * 0.2) * 0.3 + 0.4;
      const cry = cos(ry), sry = sin(ry);
      const crx = cos(rx), srx = sin(rx);

      // Spawn effects
      if (pulses.length < 6 && Math.random() < pulseChance) {
        pulses.push({
          lat: (Math.random() - 0.5) * PI,
          lon: Math.random() * PI2,
          radius: 0,
          speed: 1.5 + Math.random() * 2,
          maxRadius: 1.2 + Math.random() * 0.8,
          color: [[255, 80, 30], [255, 140, 20], [255, 50, 10], [255, 180, 40]][Math.random() * 4 | 0],
        });
      }
      if (arcs.length < Math.floor(pct * 5) && Math.random() < arcChance) {
        const i = Math.random() * numParticles | 0;
        const j = (i + 1 + Math.floor(Math.random() * 10)) % numParticles;
        arcs.push({ from: i, to: j, life: 1, decay: 0.02 + Math.random() * 0.03 });
      }

      // Update
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].radius += pulses[i].speed * dt;
        if (pulses[i].radius > pulses[i].maxRadius) pulses.splice(i, 1);
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        arcs[i].life -= arcs[i].decay;
        if (arcs[i].life <= 0) arcs.splice(i, 1);
      }

      // Project particles
      const all: { x: number; y: number; s: number; z: number; sz: number; phase: number; layer: number; pBoost: number; pColor: number[] | null; idx: number; type: number }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const orbSpeed = t * 0.4 * p.speed;
        const breathe = sin(t * 2 + p.phase) * size * 0.005;
        const r = R + breathe;

        let x = r * sin(p.phi) * cos(p.theta + orbSpeed);
        let y = r * cos(p.phi);
        let z = r * sin(p.phi) * sin(p.theta + orbSpeed);

        let x2 = x * cry + z * sry;
        let z2 = -x * sry + z * cry;
        let y2 = y * crx - z2 * srx;
        let z3 = y * srx + z2 * crx;

        const pr = project(x2, y2, z3);

        let pBoost = 0, pColor: number[] | null = null;
        for (const pulse of pulses) {
          const dist = sDist(p.phi, p.theta + orbSpeed, pulse.lat + PI / 2, pulse.lon);
          const prog = pulse.radius / pulse.maxRadius;
          const diff = Math.abs(dist - pulse.radius);
          const ringW = 0.12 + prog * 0.08;
          if (diff < ringW) {
            const str = (1 - diff / ringW) * (1 - prog);
            if (str > pBoost) { pBoost = str; pColor = pulse.color; }
          }
        }

        all.push({ x: pr[0], y: pr[1], s: pr[2], z: pr[3], sz: p.size, phase: p.phase, layer: p.layer, pBoost, pColor, idx: i, type: 0 });
      }

      // Ring particles
      for (const rp of rings) {
        const a = rp.angle + t * rp.speedMul;
        let x = rp.radius * cos(a), y = 0, z = rp.radius * sin(a);
        const crxt = cos(rp.tiltX), srxt = sin(rp.tiltX);
        let y2 = y * crxt - z * srxt, z2 = y * srxt + z * crxt;
        let x3 = x * cry + z2 * sry, z3 = -x * sry + z2 * cry;
        let y3 = y2 * crx - z3 * srx, z4 = y2 * srx + z3 * crx;
        const pr = project(x3, y3, z4);
        const flicker = sin(t * 4 + rp.phase) * 0.3 + 0.7;
        all.push({ x: pr[0], y: pr[1], s: pr[2], z: pr[3], sz: rp.size * flicker, phase: rp.phase, layer: 0.5, pBoost: 0, pColor: null, idx: -1, type: 1 });
      }

      all.sort((a, b) => a.z - b.z);

      // Connections
      if (pct > 0.2) {
        ctx.lineWidth = 0.5;
        const front = all.filter(d => d.z < 30 && d.type === 0);
        for (let i = 0; i < front.length; i++) {
          for (let j = i + 1; j < front.length; j++) {
            const dx = front[i].x - front[j].x, dy = front[i].y - front[j].y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < connectionDist * connectionDist) {
              const dist = Math.sqrt(dist2);
              const alpha = (1 - dist / connectionDist) * 0.08 * Math.min(front[i].s, front[j].s) * colorBrightness;
              ctx.strokeStyle = `rgba(${Math.floor(180 * colorBrightness)}, ${Math.floor(70 * colorBrightness)}, 30, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(front[i].x, front[i].y);
              ctx.lineTo(front[j].x, front[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // Arcs
      for (const arc of arcs) {
        const a = all.find(d => d.idx === arc.from && d.type === 0);
        const b = all.find(d => d.idx === arc.to && d.type === 0);
        if (!a || !b || a.z > 60 || b.z > 60) continue;
        const mx = (a.x + b.x) / 2 + sin(t * 12 + arc.from) * size * 0.02;
        const my = (a.y + b.y) / 2 + cos(t * 10 + arc.to) * size * 0.02;
        ctx.strokeStyle = `rgba(255, 130, 40, ${arc.life * 0.4 * colorBrightness})`;
        ctx.lineWidth = arc.life * 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
      }

      // Particles
      for (const d of all) {
        const depthFade = Math.max(0, (d.s - 0.35) / 0.65);
        const breathe = sin(t * 2 + d.phase) * 0.15 + 0.85;
        let alpha = Math.max(0.02, depthFade * breathe * 0.8 * colorBrightness);

        let r: number, g: number, b: number;
        if (d.type === 1) {
          r = 255 * colorBrightness; g = 120 * colorBrightness; b = 30 * colorBrightness;
          alpha *= 0.4;
        } else {
          r = 255 * colorBrightness;
          g = (50 + d.layer * 100) * colorBrightness;
          b = (10 + d.layer * 30) * colorBrightness;
        }

        if (d.pBoost > 0 && d.pColor) {
          const tb = d.pBoost;
          r = r + (d.pColor[0] * colorBrightness - r) * tb;
          g = g + (d.pColor[1] * colorBrightness - g) * tb;
          b = b + (d.pColor[2] * colorBrightness - b) * tb;
          alpha = Math.min(1, alpha + tb * 0.7);
        }

        const sz = d.sz * d.s * (1 + d.pBoost * 2);

        if (sz > 0.6 && alpha > 0.06) {
          const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, sz * 4);
          grd.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.2})`);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(d.x, d.y, sz * 4, 0, PI2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, sz, 0, PI2);
        ctx.fill();

        if (d.pBoost > 0.5) {
          ctx.fillStyle = `rgba(255, 240, 180, ${(d.pBoost - 0.5) * 0.5 * colorBrightness})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, sz * 0.3, 0, PI2);
          ctx.fill();
        }
      }

      // Vignette
      const vg = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, W * 0.6);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(5, 5, 8, 0.6)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  useEffect(() => {
    const cleanup = render();
    return () => {
      cancelAnimationFrame(animRef.current);
      if (cleanup) cleanup();
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-full"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
