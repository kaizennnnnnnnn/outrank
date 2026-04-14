'use client';

import { useEffect, useRef } from 'react';

interface SoulOrbProps {
  intensity: number; // 0-100
  size?: number;
}

export function SoulOrb({ intensity, size = 300 }: SoulOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx: CanvasRenderingContext2D = maybeCtx;

    // Handle retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const W = size, H = size, cx = W / 2, cy = H / 2;
    const R = size * 0.28;
    const pct = Math.min(intensity, 100) / 100;

    // Color brightness: even at 0% we show dim gray particles
    const brightness = 0.12 + pct * 0.88;

    // Particle count scales with intensity, but always at least 120
    const NUM = Math.floor(120 + pct * 380);
    const numRings = pct > 0.3 ? (pct > 0.7 ? 3 : 2) : 1;
    const ringParts = Math.floor(25 + pct * 55);

    // Init sphere particles
    type Particle = { phi: number; theta: number; size: number; phase: number; speed: number; layer: number };
    const particles: Particle[] = [];
    for (let i = 0; i < NUM; i++) {
      particles.push({
        phi: Math.acos(1 - 2 * (i + 0.5) / NUM),
        theta: Math.PI * (1 + Math.sqrt(5)) * i,
        size: 0.8 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        layer: Math.random(),
      });
    }

    // Init ring particles
    type Ring = { angle: number; radius: number; tiltX: number; speedMul: number; size: number; phase: number };
    const rings: Ring[] = [];
    for (let r = 0; r < numRings; r++) {
      const tiltX = (r - 1) * 0.5 + Math.random() * 0.3;
      const radius = R + 12 + r * 10;
      const speedMul = 1 + r * 0.3;
      for (let i = 0; i < ringParts; i++) {
        rings.push({
          angle: (i / ringParts) * Math.PI * 2,
          radius, tiltX, speedMul,
          size: 0.4 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Pulses and arcs
    type Pulse = { lat: number; lon: number; radius: number; speed: number; maxRadius: number; color: number[] };
    type Arc = { from: number; to: number; life: number; decay: number };
    const pulses: Pulse[] = [];
    const arcs: Arc[] = [];

    let t = 0;
    const { sin, cos, PI, sqrt, asin, min, max, floor, random } = Math;
    const PI2 = PI * 2;

    function project(x: number, y: number, z: number) {
      const d = size * 0.9;
      const s = d / (d + z);
      return { px: cx + x * s, py: cy + y * s, s, z };
    }

    function sDist(p1: number, l1: number, p2: number, l2: number) {
      const a1 = p1 - PI / 2, a2 = p2 - PI / 2;
      const dp = a2 - a1, dl = l2 - l1;
      const a = sin(dp / 2) ** 2 + cos(a1) * cos(a2) * sin(dl / 2) ** 2;
      return 2 * asin(sqrt(min(1, a)));
    }

    function frame() {
      t += 0.012;
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, W, H);

      // Core glow
      const gp = sin(t * 1.2) * 0.02 + 0.04 + pct * 0.05;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 30);
      g1.addColorStop(0, `rgba(${floor(200 * brightness)}, ${floor(60 * brightness)}, ${floor(15 * brightness)}, ${gp})`);
      g1.addColorStop(0.5, `rgba(${floor(100 * brightness)}, ${floor(30 * brightness)}, 8, ${gp * 0.4})`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const ry = t * 0.6, rx = sin(t * 0.2) * 0.3 + 0.4;
      const cry = cos(ry), sry = sin(ry), crx = cos(rx), srx = sin(rx);

      // Spawn
      if (pulses.length < 6 && random() < pct * 0.04) {
        pulses.push({
          lat: (random() - 0.5) * PI, lon: random() * PI2,
          radius: 0, speed: 1.5 + random() * 2, maxRadius: 1.2 + random() * 0.8,
          color: [[255, 80, 30], [255, 140, 20], [255, 50, 10], [255, 180, 40]][random() * 4 | 0],
        });
      }
      if (arcs.length < floor(pct * 5) && random() < pct * 0.03) {
        const i = random() * NUM | 0;
        const j = (i + 1 + floor(random() * 10)) % NUM;
        arcs.push({ from: i, to: j, life: 1, decay: 0.02 + random() * 0.03 });
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].radius += pulses[i].speed * 0.012;
        if (pulses[i].radius > pulses[i].maxRadius) pulses.splice(i, 1);
      }
      for (let i = arcs.length - 1; i >= 0; i--) {
        arcs[i].life -= arcs[i].decay;
        if (arcs[i].life <= 0) arcs.splice(i, 1);
      }

      // Build projected list
      type Proj = { px: number; py: number; s: number; z: number; sz: number; phase: number; layer: number; pBoost: number; pColor: number[] | null; idx: number; type: number };
      const all: Proj[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const orbSpeed = t * 0.4 * p.speed;
        const breathe = sin(t * 2 + p.phase) * 3;
        const r = R + breathe;
        let x = r * sin(p.phi) * cos(p.theta + orbSpeed);
        let y = r * cos(p.phi);
        let z = r * sin(p.phi) * sin(p.theta + orbSpeed);
        let x2 = x * cry + z * sry, z2 = -x * sry + z * cry;
        let y2 = y * crx - z2 * srx, z3 = y * srx + z2 * crx;
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
        all.push({ ...pr, sz: p.size, phase: p.phase, layer: p.layer, pBoost, pColor, idx: i, type: 0 });
      }

      for (const rp of rings) {
        const a = rp.angle + t * rp.speedMul;
        let x = rp.radius * cos(a), y2 = 0, z = rp.radius * sin(a);
        const crxt = cos(rp.tiltX), srxt = sin(rp.tiltX);
        let y3 = y2 * crxt - z * srxt, z2 = y2 * srxt + z * crxt;
        let x3 = x * cry + z2 * sry, z3 = -x * sry + z2 * cry;
        let y4 = y3 * crx - z3 * srx, z4 = y3 * srx + z3 * crx;
        const pr = project(x3, y4, z4);
        const flicker = sin(t * 4 + rp.phase) * 0.3 + 0.7;
        all.push({ ...pr, sz: rp.size * flicker, phase: rp.phase, layer: 0.5, pBoost: 0, pColor: null, idx: -1, type: 1 });
      }

      all.sort((a, b) => a.z - b.z);

      // Connections
      if (pct > 0.15) {
        const connDist = 20 + pct * 20;
        ctx.lineWidth = 0.5;
        const front = all.filter(d => d.z < 40 && d.type === 0);
        for (let i = 0; i < front.length; i++) {
          for (let j = i + 1; j < min(front.length, i + 15); j++) {
            const dx = front[i].px - front[j].px, dy = front[i].py - front[j].py;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < connDist * connDist) {
              const dist = sqrt(dist2);
              const alpha = (1 - dist / connDist) * 0.08 * min(front[i].s, front[j].s) * brightness;
              ctx.strokeStyle = `rgba(${floor(180 * brightness)}, ${floor(70 * brightness)}, 30, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(front[i].px, front[i].py);
              ctx.lineTo(front[j].px, front[j].py);
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
        const mx = (a.px + b.px) / 2 + sin(t * 12 + arc.from) * 8;
        const my = (a.py + b.py) / 2 + cos(t * 10) * 8;
        ctx.strokeStyle = `rgba(255, 130, 40, ${arc.life * 0.4 * brightness})`;
        ctx.lineWidth = arc.life * 1.5;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.quadraticCurveTo(mx, my, b.px, b.py);
        ctx.stroke();
      }

      // Draw particles
      for (const d of all) {
        const depthFade = max(0, (d.s - 0.35) / 0.65);
        const breathe = sin(t * 2 + d.phase) * 0.15 + 0.85;
        let alpha = max(0.03, depthFade * breathe * 0.8 * brightness);

        let r: number, g: number, b: number;
        if (d.type === 1) {
          r = 255 * brightness; g = 120 * brightness; b = 30 * brightness;
          alpha *= 0.4;
        } else {
          // Low intensity = gray, high = red/orange
          const gray = 1 - pct; // how gray (0=full color, 1=gray)
          r = (60 + gray * 40 + (1 - gray) * 195) * brightness;
          g = (30 + gray * 30 + (1 - gray) * (d.layer * 100)) * brightness;
          b = (20 + gray * 20 + (1 - gray) * (d.layer * 30)) * brightness;
        }

        if (d.pBoost > 0 && d.pColor) {
          const tb = d.pBoost;
          r = r + (d.pColor[0] * brightness - r) * tb;
          g = g + (d.pColor[1] * brightness - g) * tb;
          b = b + (d.pColor[2] * brightness - b) * tb;
          alpha = min(1, alpha + tb * 0.7);
        }

        const sz = d.sz * d.s * (1 + d.pBoost * 2);

        // Glow
        if (sz > 0.5 && alpha > 0.05) {
          const grd = ctx.createRadialGradient(d.px, d.py, 0, d.px, d.py, sz * 4);
          grd.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.2})`);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(d.px, d.py, sz * 4, 0, PI2);
          ctx.fill();
        }

        // Core dot
        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(d.px, d.py, max(0.3, sz), 0, PI2);
        ctx.fill();

        // Hot center on pulsed
        if (d.pBoost > 0.5) {
          ctx.fillStyle = `rgba(255, 240, 180, ${(d.pBoost - 0.5) * 0.5 * brightness})`;
          ctx.beginPath();
          ctx.arc(d.px, d.py, sz * 0.3, 0, PI2);
          ctx.fill();
        }
      }

      // Vignette
      const vg = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, W * 0.55);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(5, 5, 8, 0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [intensity, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, maxWidth: '100%' }}
      className="rounded-full"
    />
  );
}
