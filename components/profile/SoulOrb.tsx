'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrbTier, OrbTier } from '@/constants/orbTiers';
import { Button } from '@/components/ui/Button';

interface SoulOrbProps {
  intensity: number; // 0-100
  tier: number;      // 1-5
  size?: number;
  onEvolve?: () => void;
}

export function SoulOrb({ intensity, tier, size = 300, onEvolve }: SoulOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, rotX: 0, rotY: 0 });
  const [evolving, setEvolving] = useState(false);
  const evolveRef = useRef(false);
  const canEvolve = intensity >= 100 && tier < 5;

  const handleEvolve = useCallback(() => {
    if (!canEvolve) return;
    setEvolving(true);
    evolveRef.current = true;
    // After animation, trigger the callback
    setTimeout(() => {
      setEvolving(false);
      evolveRef.current = false;
      onEvolve?.();
    }, 2500);
  }, [canEvolve, onEvolve]);

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

    const W = size, H = size, cx = W / 2, cy = H / 2;
    const config = getOrbTier(tier);
    const pct = Math.min(intensity, 100) / 100;
    const R = size * config.radius;
    const brightness = 0.4 + pct * 0.6;

    // Scale particles by intensity within the tier
    const numP = Math.floor(config.particles * (0.5 + pct * 0.5));

    type P = { phi: number; theta: number; size: number; phase: number; speed: number; layer: number };
    const particles: P[] = [];
    for (let i = 0; i < numP; i++) {
      particles.push({
        phi: Math.acos(1 - 2 * (i + 0.5) / numP),
        theta: Math.PI * (1 + Math.sqrt(5)) * i,
        size: 1.0 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
        layer: Math.random(),
      });
    }

    type Rng = { angle: number; radius: number; tiltX: number; speedMul: number; size: number; phase: number };
    const rings: Rng[] = [];
    for (let r = 0; r < config.rings; r++) {
      const tiltX = (r - 1) * 0.5 + Math.random() * 0.3;
      const radius = R + 10 + r * 10;
      const speedMul = 1 + r * 0.3;
      const rp = Math.floor(config.ringParticles * (0.5 + pct * 0.5));
      for (let i = 0; i < rp; i++) {
        rings.push({ angle: (i / rp) * Math.PI * 2, radius, tiltX, speedMul, size: 0.5 + Math.random() * 0.8, phase: Math.random() * Math.PI * 2 });
      }
    }

    type Pulse = { lat: number; lon: number; radius: number; speed: number; maxRadius: number; color: string };
    type Arc = { from: number; to: number; life: number; decay: number };
    const pulses: Pulse[] = [];
    const arcs: Arc[] = [];

    let t = 0;
    let evolveT = 0;
    const { sin, cos, PI, sqrt, asin, min, max, floor, random } = Math;
    const PI2 = PI * 2;

    function project(x: number, y: number, z: number) {
      const d = size * 0.9;
      const s = d / (d + z);
      return { px: cx + x * s, py: cy + y * s, s, z };
    }

    // Touch/mouse drag handlers
    const onStart = (x: number, y: number) => { dragRef.current.dragging = true; dragRef.current.lastX = x; dragRef.current.lastY = y; };
    const onMove = (x: number, y: number) => {
      if (!dragRef.current.dragging) return;
      dragRef.current.rotY += (x - dragRef.current.lastX) * 0.01;
      dragRef.current.rotX += (y - dragRef.current.lastY) * 0.01;
      dragRef.current.lastX = x;
      dragRef.current.lastY = y;
    };
    const onEnd = () => { dragRef.current.dragging = false; };

    canvas.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const touch = e.touches[0]; onStart(touch.clientX, touch.clientY); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const touch = e.touches[0]; onMove(touch.clientX, touch.clientY); }, { passive: false });
    canvas.addEventListener('touchend', onEnd);

    function hexToRgb(hex: string): [number, number, number] {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    }

    const colOuter = hexToRgb(config.colors.outer);
    const colMid = hexToRgb(config.colors.mid);
    const colInner = hexToRgb(config.colors.inner);
    const colCore = hexToRgb(config.colors.core);

    function frame() {
      t += 0.012;
      const isEvolving = evolveRef.current;
      if (isEvolving) evolveT += 0.012;

      // Evolution speed boost
      const speedBoost = isEvolving ? min(evolveT * 8, 10) : 1;
      // Evolution explosion (particles fly outward)
      const explodePhase = isEvolving && evolveT > 0.8 && evolveT < 1.8;
      const explodeAmount = explodePhase ? (evolveT - 0.8) * 1.5 : 0;
      const reformPhase = isEvolving && evolveT > 1.8;

      ctx.clearRect(0, 0, W, H);

      // Core glow
      const gp = sin(t * 1.2) * 0.02 + 0.06 + pct * config.glowIntensity * 0.08;
      const [gr, gg, gb] = colMid;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 30);
      g1.addColorStop(0, `rgba(${gr}, ${gg}, ${gb}, ${gp * (isEvolving ? 3 : 1)})`);
      g1.addColorStop(0.5, `rgba(${floor(gr * 0.5)}, ${floor(gg * 0.5)}, ${floor(gb * 0.3)}, ${gp * 0.4})`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      // Rotation: auto spin + manual drag
      const ry = t * 0.5 * speedBoost + dragRef.current.rotY;
      const rx = sin(t * 0.2) * 0.3 + 0.4 + dragRef.current.rotX;
      const cry = cos(ry), sry = sin(ry), crx = cos(rx), srx = sin(rx);

      // Spawn effects
      if (pulses.length < 6 && random() < config.pulseChance * pct) {
        pulses.push({ lat: (random() - 0.5) * PI, lon: random() * PI2, radius: 0, speed: 1.5 + random() * 2, maxRadius: 1.2, color: config.colors.inner });
      }
      if (arcs.length < config.maxArcs && random() < config.arcChance * pct) {
        const i = floor(random() * particles.length);
        const j = (i + 1 + floor(random() * 10)) % particles.length;
        arcs.push({ from: i, to: j, life: 1, decay: 0.02 + random() * 0.03 });
      }

      for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].radius += pulses[i].speed * 0.012; if (pulses[i].radius > pulses[i].maxRadius) pulses.splice(i, 1); }
      for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].life -= arcs[i].decay; if (arcs[i].life <= 0) arcs.splice(i, 1); }

      type Proj = { px: number; py: number; s: number; z: number; sz: number; phase: number; layer: number; pBoost: number; idx: number; type: number };
      const all: Proj[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const breathe = sin(t * 2 + p.phase) * 3;
        let r = R + breathe;

        // Explode outward during evolution
        if (explodePhase) r += explodeAmount * size * 0.3 * (0.5 + p.layer * 0.5);
        if (reformPhase) r = R + breathe; // snap back

        let x = r * sin(p.phi) * cos(p.theta + t * 0.4 * p.speed * speedBoost);
        let y = r * cos(p.phi);
        let z = r * sin(p.phi) * sin(p.theta + t * 0.4 * p.speed * speedBoost);
        let x2 = x * cry + z * sry, z2 = -x * sry + z * cry;
        let y2 = y * crx - z2 * srx, z3 = y * srx + z2 * crx;
        const pr = project(x2, y2, z3);

        let pBoost = 0;
        for (const pulse of pulses) {
          const a1 = p.phi - PI / 2, a2 = pulse.lat;
          const dp = a2 - a1;
          const a = sin(dp / 2) ** 2 + cos(a1) * cos(a2) * sin(0) ** 2;
          const dist = 2 * asin(sqrt(min(1, a)));
          const diff = Math.abs(dist - pulse.radius);
          if (diff < 0.15) pBoost = max(pBoost, (1 - diff / 0.15) * (1 - pulse.radius / pulse.maxRadius));
        }

        all.push({ ...pr, sz: p.size, phase: p.phase, layer: p.layer, pBoost, idx: i, type: 0 });
      }

      // Ring particles
      for (const rp of rings) {
        const a = rp.angle + t * rp.speedMul * speedBoost;
        let x = rp.radius * cos(a), y2 = 0, z = rp.radius * sin(a);
        const crxt = cos(rp.tiltX), srxt = sin(rp.tiltX);
        let y3 = y2 * crxt - z * srxt, z2 = y2 * srxt + z * crxt;
        let x3 = x * cry + z2 * sry, z3 = -x * sry + z2 * cry;
        let y4 = y3 * crx - z3 * srx, z4 = y3 * srx + z3 * crx;
        const pr = project(x3, y4, z4);
        all.push({ ...pr, sz: rp.size * (sin(t * 4 + rp.phase) * 0.3 + 0.7), phase: rp.phase, layer: 0.5, pBoost: 0, idx: -1, type: 1 });
      }

      all.sort((a, b) => a.z - b.z);

      // Connections
      if (pct > 0.15) {
        ctx.lineWidth = 0.5;
        const front = all.filter(d => d.z < 40 && d.type === 0);
        for (let i = 0; i < front.length; i++) {
          for (let j = i + 1; j < min(front.length, i + 12); j++) {
            const dx = front[i].px - front[j].px, dy = front[i].py - front[j].py;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < config.connectionDist * config.connectionDist) {
              const alpha = (1 - sqrt(dist2) / config.connectionDist) * 0.08 * brightness;
              ctx.strokeStyle = `rgba(${colMid[0]}, ${colMid[1]}, ${colMid[2]}, ${alpha})`;
              ctx.beginPath(); ctx.moveTo(front[i].px, front[i].py); ctx.lineTo(front[j].px, front[j].py); ctx.stroke();
            }
          }
        }
      }

      // Arcs
      for (const arc of arcs) {
        const a = all.find(d => d.idx === arc.from && d.type === 0);
        const b = all.find(d => d.idx === arc.to && d.type === 0);
        if (!a || !b || a.z > 60 || b.z > 60) continue;
        ctx.strokeStyle = `rgba(${colInner[0]}, ${colInner[1]}, ${colInner[2]}, ${arc.life * 0.4 * brightness})`;
        ctx.lineWidth = arc.life * 1.5;
        ctx.beginPath(); ctx.moveTo(a.px, a.py);
        ctx.quadraticCurveTo((a.px + b.px) / 2 + sin(t * 12) * 8, (a.py + b.py) / 2 + cos(t * 10) * 8, b.px, b.py);
        ctx.stroke();
      }

      // Draw particles
      for (const d of all) {
        const depthFade = max(0.1, (d.s - 0.2) / 0.8);
        const breathe = sin(t * 2 + d.phase) * 0.15 + 0.85;
        let alpha = max(0.08, depthFade * breathe * 0.9 * brightness);

        // Color interpolation based on layer + tier
        const lr = d.layer;
        let r = colOuter[0] + (colInner[0] - colOuter[0]) * lr;
        let g = colOuter[1] + (colInner[1] - colOuter[1]) * lr;
        let b = colOuter[2] + (colInner[2] - colOuter[2]) * lr;

        if (d.type === 1) { r = colMid[0]; g = colMid[1]; b = colMid[2]; alpha *= 0.5; }
        if (d.pBoost > 0) {
          r = r + (colCore[0] - r) * d.pBoost;
          g = g + (colCore[1] - g) * d.pBoost;
          b = b + (colCore[2] - b) * d.pBoost;
          alpha = min(1, alpha + d.pBoost * 0.6);
        }

        // During explosion, particles get brighter
        if (explodePhase) alpha = min(1, alpha * 2);

        const sz = d.sz * d.s * (1 + d.pBoost * 2);

        // Glow
        if (sz > 0.5 && alpha > 0.05) {
          const grd = ctx.createRadialGradient(d.px, d.py, 0, d.px, d.py, sz * 4);
          grd.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.2})`);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(d.px, d.py, sz * 4, 0, PI2); ctx.fill();
        }

        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.beginPath(); ctx.arc(d.px, d.py, max(0.3, sz), 0, PI2); ctx.fill();

        if (d.pBoost > 0.5) {
          ctx.fillStyle = `rgba(${colCore[0]}, ${colCore[1]}, ${colCore[2]}, ${(d.pBoost - 0.5) * 0.5})`;
          ctx.beginPath(); ctx.arc(d.px, d.py, sz * 0.3, 0, PI2); ctx.fill();
        }
      }

      // Evolution flash
      if (isEvolving && evolveT > 0.7 && evolveT < 1.0) {
        const flash = (1 - (evolveT - 0.7) / 0.3);
        ctx.fillStyle = `rgba(255, 200, 100, ${flash * 0.4})`;
        ctx.fillRect(0, 0, W, H);
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', () => {});
      canvas.removeEventListener('touchstart', () => {});
    };
  }, [intensity, tier, size]);

  const config = getOrbTier(tier);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, maxWidth: '100%', cursor: 'grab', touchAction: 'none' }}
      />
      <div className="mt-2 text-center">
        <p className="text-xs font-heading text-orange-400">{config.name}</p>
        <p className="text-[10px] text-slate-600">{intensity}% — {config.description}</p>
      </div>

      <AnimatePresence>
        {canEvolve && !evolving && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3"
          >
            <Button size="sm" onClick={handleEvolve} className="animate-pulse">
              Evolve
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {evolving && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.5 }}
          className="mt-3 text-sm font-heading text-orange-400"
        >
          Evolving...
        </motion.p>
      )}
    </div>
  );
}
