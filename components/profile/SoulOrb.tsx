'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrbTier, MAX_ORB_TIER } from '@/constants/orbTiers';
import { getOrbBaseColor, getOrbPulseColor, getOrbRingColor, isRainbowColor } from '@/constants/orbColors';
import { Button } from '@/components/ui/Button';

interface SoulOrbProps {
  intensity: number;
  tier: number;
  size?: number;
  onEvolve?: () => void;
  baseColorId?: string;
  pulseColorId?: string;
  ringColorId?: string;
  hideLabel?: boolean;
}

export function SoulOrb({ intensity, tier, size = 300, onEvolve, baseColorId, pulseColorId, ringColorId, hideLabel }: SoulOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, rotX: 0, rotY: 0 });
  const evolveRef = useRef(false);
  const evolveTimeRef = useRef(0);
  const [evolving, setEvolving] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  // Evolve button only appears when the caller explicitly provides onEvolve,
  // so orb previews (duel result modal, other users' profiles, etc.) never
  // show the button.
  const canEvolve = intensity >= 100 && tier < MAX_ORB_TIER && !!onEvolve;

  const handleEvolve = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canEvolve) return;
    setEvolving(true);
    evolveRef.current = true;
    evolveTimeRef.current = 0;
    // Phase 1: animation plays (0-2.2s)
    // Phase 2: fade out (2.2s)
    setTimeout(() => setFadeOut(true), 2200);
    // Phase 3: switch tier while faded (2.7s)
    setTimeout(() => {
      onEvolve?.();
    }, 2700);
    // Phase 4: fade back in (3s)
    setTimeout(() => {
      setFadeOut(false);
      setEvolving(false);
      evolveRef.current = false;
      evolveTimeRef.current = 0;
    }, 3200);
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
    // Apply custom colors if set
    const customBase = baseColorId ? getOrbBaseColor(baseColorId) : null;
    const customPulse = pulseColorId ? getOrbPulseColor(pulseColorId) : null;
    if (customBase) {
      config.colors.outer = customBase.outer;
      config.colors.mid = customBase.mid;
      config.colors.inner = customBase.inner;
      config.colors.core = customBase.core;
      config.colors.glow = customBase.glow;
    }
    // Pulse colors for waves and sparks
    const pulseColors = customPulse || {
      outer: config.colors.outer,
      mid: config.colors.mid,
      inner: config.colors.inner,
      core: config.colors.core,
      glow: config.colors.glow,
    };
    const pct = Math.min(intensity, 100) / 100;
    const R = size * config.radius;
    const brightness = 0.4 + pct * 0.6;
    const isSmall = size <= 100;
    // Cap main-sphere particles for perf. Tiers 6-10 compensate with more
    // rings / satellites / arcs rather than raw particle count.
    const PARTICLE_CAP = 700;
    const rawNumP = isSmall
      ? Math.floor(config.particles * 0.25)
      : Math.floor(config.particles * (0.5 + pct * 0.5));
    const numP = Math.min(rawNumP, isSmall ? 200 : PARTICLE_CAP);
    const particleScale = isSmall ? 0.5 : 1.0;
    const speedMultiplier = isSmall ? 2.0 : 1.0;
    // Heavy mode = skip per-particle radial gradients (biggest perf cost) for
    // high-tier / dense orbs. The solid fill still looks dense because
    // brightness is controlled via alpha.
    const heavyMode = config.tier >= 6;

    type P = { phi: number; theta: number; size: number; phase: number; speed: number; layer: number };
    const particles: P[] = [];
    for (let i = 0; i < numP; i++) {
      particles.push({
        phi: Math.acos(1 - 2 * (i + 0.5) / numP),
        theta: Math.PI * (1 + Math.sqrt(5)) * i,
        size: (1.0 + Math.random() * 2.0) * particleScale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
        layer: Math.random(),
      });
    }

    type Rng = { angle: number; radius: number; tiltX: number; speedMul: number; size: number; phase: number; colorIdx: number };
    const rings: Rng[] = [];
    const ringCount = isSmall ? 0 : config.rings; // No rings for small orbs
    for (let r = 0; r < ringCount; r++) {
      const tiltX = (r - 1) * 0.5 + Math.random() * 0.3;
      const radius = R + 10 + r * 8;
      const rp = Math.floor(config.ringParticles * (0.5 + pct * 0.5));
      for (let i = 0; i < rp; i++) {
        // Split each ring into halves / quarters so the palette shows clearly.
        // First half of particles uses outer+mid, second half uses inner+core.
        const halfIdx = i < rp / 2 ? 0 : 2;
        const colorIdx = halfIdx + (i % 2); // 0=outer, 1=mid, 2=inner, 3=core
        rings.push({ angle: (i / rp) * Math.PI * 2, radius, tiltX, speedMul: 1 + r * 0.3, size: 0.5 + Math.random() * 0.8, phase: Math.random() * Math.PI * 2, colorIdx });
      }
    }

    type Pulse = { lat: number; lon: number; radius: number; speed: number; maxRadius: number };
    type Arc = { from: number; to: number; life: number; decay: number };
    const pulses: Pulse[] = [];
    const arcs: Arc[] = [];

    // Satellites — orbiting micro-orbs introduced at tier 6+
    type Satellite = { angle: number; radius: number; tiltX: number; tiltY: number; speed: number; size: number; trail: { x: number; y: number; a: number }[] };
    const satellites: Satellite[] = [];
    const satCount = !isSmall ? (config.satellites || 0) : 0;
    // Keep satellites fully inside the canvas — leave margin for their glow radius.
    const satSizeMax = 3.0;
    const canvasHalf = size / 2;
    const satGlowMargin = satSizeMax * 4;
    const maxSatRadius = Math.max(R + 6, canvasHalf - satGlowMargin - 4);
    const satBaseOffset = Math.max(8, (maxSatRadius - R) * 0.35);
    const satJitter = Math.max(4, (maxSatRadius - R - satBaseOffset) * 0.7);
    for (let i = 0; i < satCount; i++) {
      satellites.push({
        angle: (i / satCount) * Math.PI * 2,
        radius: Math.min(R + satBaseOffset + Math.random() * satJitter, maxSatRadius),
        tiltX: (Math.random() - 0.5) * 1.2,
        tiltY: (Math.random() - 0.5) * 1.2,
        speed: 0.6 + Math.random() * 0.8,
        size: 1.6 + Math.random() * (satSizeMax - 1.6),
        trail: [],
      });
    }

    let t = 0;
    const { sin, cos, PI, sqrt, asin, min, max, floor, random } = Math;
    const PI2 = PI * 2;

    function hexToRgb(hex: string): [number, number, number] {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    const colOuter = hexToRgb(config.colors.outer);
    const colMid = hexToRgb(config.colors.mid);
    const colInner = hexToRgb(config.colors.inner);
    const colCore = hexToRgb(config.colors.core);
    // Pulse tint uses saturated mid so the color shows instead of white
    const pulseRgb = hexToRgb(pulseColors.mid);
    const pulseInnerRgb = hexToRgb(pulseColors.inner);
    const pulseMidRgb = hexToRgb(pulseColors.mid);

    // Ring colors — equipped from shop. Rainbow cycles hue over time.
    // Each ring particle picks one of these 4 slots via colorIdx so a single
    // palette (e.g. Sunset) visibly shows mid AND inner AND outer, not just mid.
    const ringCol = ringColorId ? getOrbRingColor(ringColorId) : null;
    const ringPalette: [number, number, number][] = ringCol
      ? [hexToRgb(ringCol.outer), hexToRgb(ringCol.mid), hexToRgb(ringCol.inner), hexToRgb(ringCol.core)]
      : [colOuter, colMid, colInner, colCore];
    const ringIsRainbow = isRainbowColor(ringColorId);
    const baseIsRainbow = isRainbowColor(baseColorId);
    const pulseIsRainbow = isRainbowColor(pulseColorId);
    // HSL helper for rainbow cycling
    function hslRgb(h: number, s: number, l: number): [number, number, number] {
      h = ((h % 360) + 360) % 360;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (h < 60)       { r = c; g = x; }
      else if (h < 120) { r = x; g = c; }
      else if (h < 180) { g = c; b = x; }
      else if (h < 240) { g = x; b = c; }
      else if (h < 300) { r = x; b = c; }
      else              { r = c; b = x; }
      return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }

    function project(x: number, y: number, z: number) {
      const d = size * 0.9;
      const s = d / (d + z);
      return { px: cx + x * s, py: cy + y * s, s, z };
    }

    // Touch handlers
    const onStart = (x: number, y: number) => { dragRef.current = { ...dragRef.current, dragging: true, lastX: x, lastY: y }; };
    const onMove = (x: number, y: number) => {
      if (!dragRef.current.dragging) return;
      dragRef.current.rotY += (x - dragRef.current.lastX) * 0.03;
      dragRef.current.rotX += (y - dragRef.current.lastY) * 0.02;
      dragRef.current.lastX = x; dragRef.current.lastY = y;
    };
    const onEnd = () => { dragRef.current.dragging = false; };

    const md = (e: MouseEvent) => onStart(e.clientX, e.clientY);
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const ts = (e: TouchEvent) => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); };
    const tm = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };

    canvas.addEventListener('mousedown', md);
    canvas.addEventListener('mousemove', mm);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', ts, { passive: false });
    canvas.addEventListener('touchmove', tm, { passive: false });
    canvas.addEventListener('touchend', onEnd);

    function frame() {
      t += 0.012;
      const isEvolving = evolveRef.current;
      if (isEvolving) evolveTimeRef.current += 0.012;
      const eT = evolveTimeRef.current;

      // Evolution phases (total ~3s):
      // 0-1s: spin faster
      // 1-1.5s: particles pull inward (contract)
      // 1.5-2s: particles push outward slightly then snap back (contained explosion)
      // 2-3s: settle into new form
      const speedBoost = isEvolving ? min(1 + eT * 6, 8) : 1;
      const contractPhase = isEvolving && eT > 0.8 && eT <= 1.4;
      const burstPhase = isEvolving && eT > 1.4 && eT <= 2.0;
      const settlePhase = isEvolving && eT > 2.0;

      let radiusMod = 1.0;
      if (contractPhase) radiusMod = 1.0 - (eT - 0.8) * 0.5; // shrink to 0.7
      if (burstPhase) {
        const burstT = (eT - 1.4) / 0.6;
        radiusMod = 0.7 + burstT * 0.5; // expand to 1.2 then back
        if (burstT > 0.5) radiusMod = 1.2 - (burstT - 0.5) * 0.4; // back to 1.0
      }
      if (settlePhase) radiusMod = 1.0;

      // Clamp radius so particles never leave canvas
      const maxR = size * 0.42;

      ctx.clearRect(0, 0, W, H);

      // Core glow — brighter during burst
      const glowBoost = burstPhase ? 2.5 : (contractPhase ? 1.5 : 1.0);
      const gp = (sin(t * 1.2) * 0.02 + 0.06 + pct * config.glowIntensity * 0.08) * glowBoost;
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 25);
      g1.addColorStop(0, `rgba(${colMid[0]}, ${colMid[1]}, ${colMid[2]}, ${min(gp, 0.4)})`);
      g1.addColorStop(0.6, `rgba(${floor(colMid[0] * 0.4)}, ${floor(colMid[1] * 0.4)}, ${floor(colMid[2] * 0.3)}, ${min(gp * 0.3, 0.15)})`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      // Rhythmic pulse wave through the orb — uses pulse color, expands from center
      if (!isEvolving) {
        const beatT = (t * 0.8) % 1;
        const beatRadius = beatT * R * 1.3;
        const beatAlpha = (1 - beatT) * 0.45 * pct;
        if (beatAlpha > 0.01) {
          const pw = ctx.createRadialGradient(cx, cy, Math.max(0, beatRadius - R * 0.2), cx, cy, beatRadius + R * 0.1);
          pw.addColorStop(0, 'transparent');
          pw.addColorStop(0.7, `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, ${beatAlpha * 0.6})`);
          pw.addColorStop(1, `rgba(${pulseInnerRgb[0]}, ${pulseInnerRgb[1]}, ${pulseInnerRgb[2]}, 0)`);
          ctx.fillStyle = pw;
          ctx.beginPath();
          ctx.arc(cx, cy, beatRadius + R * 0.1, 0, PI2);
          ctx.fill();
        }
      }

      const ry = t * 0.5 * speedBoost * speedMultiplier + dragRef.current.rotY;
      const rx = sin(t * 0.2) * 0.3 + 0.4 + dragRef.current.rotX;
      const cry = cos(ry), sry = sin(ry), crx = cos(rx), srx = sin(rx);

      // Spawn
      if (pulses.length < 6 && random() < config.pulseChance * pct && !isEvolving) {
        pulses.push({ lat: (random() - 0.5) * PI, lon: random() * PI2, radius: 0, speed: 1.5 + random() * 2, maxRadius: 1.2 });
      }
      if (arcs.length < config.maxArcs && random() < config.arcChance * pct) {
        const i = floor(random() * particles.length);
        const j = (i + 1 + floor(random() * 10)) % particles.length;
        arcs.push({ from: i, to: j, life: 1, decay: 0.02 + random() * 0.03 });
      }

      for (let i = pulses.length - 1; i >= 0; i--) { pulses[i].radius += pulses[i].speed * 0.012; if (pulses[i].radius > pulses[i].maxRadius) pulses.splice(i, 1); }
      for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].life -= arcs[i].decay; if (arcs[i].life <= 0) arcs.splice(i, 1); }

      type Proj = { px: number; py: number; s: number; z: number; sz: number; layer: number; pBoost: number; idx: number; type: number; phase: number };
      const all: Proj[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const breathe = sin(t * 2 + p.phase) * 3;
        let r = min((R + breathe) * radiusMod, maxR);

        let x = r * sin(p.phi) * cos(p.theta + t * 0.4 * p.speed * speedBoost);
        let y = r * cos(p.phi);
        let z = r * sin(p.phi) * sin(p.theta + t * 0.4 * p.speed * speedBoost);
        let x2 = x * cry + z * sry, z2 = -x * sry + z * cry;
        let y2 = y * crx - z2 * srx, z3 = y * srx + z2 * crx;
        const pr = project(x2, y2, z3);

        let pBoost = 0;
        for (const pulse of pulses) {
          const dist = Math.abs(p.phi - (pulse.lat + PI / 2));
          const diff = Math.abs(dist - pulse.radius);
          if (diff < 0.15) pBoost = max(pBoost, (1 - diff / 0.15) * (1 - pulse.radius / pulse.maxRadius));
        }

        all.push({ ...pr, sz: p.size, layer: p.layer, pBoost, idx: i, type: 0, phase: p.phase });
      }

      for (const rp of rings) {
        const a = rp.angle + t * rp.speedMul * speedBoost;
        const rr = min(rp.radius * radiusMod, maxR);
        let x = rr * cos(a), yy = 0, z = rr * sin(a);
        const crxt = cos(rp.tiltX), srxt = sin(rp.tiltX);
        let y3 = yy * crxt - z * srxt, z2 = yy * srxt + z * crxt;
        let x3 = x * cry + z2 * sry, z3 = -x * sry + z2 * cry;
        let y4 = y3 * crx - z3 * srx, z4 = y3 * srx + z3 * crx;
        const pr = project(x3, y4, z4);
        all.push({ ...pr, sz: rp.size * (sin(t * 4 + rp.phase) * 0.3 + 0.7), layer: 0.5, pBoost: 0, idx: rp.colorIdx, type: 1, phase: rp.phase });
      }

      all.sort((a, b) => a.z - b.z);

      // Connections — O(n²)-ish. Skip the inner loop in heavy mode;
      // the satellites + extra rings + arcs already provide visual density.
      if (pct > 0.15 && !heavyMode) {
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
        ctx.strokeStyle = `rgba(${pulseInnerRgb[0]}, ${pulseInnerRgb[1]}, ${pulseInnerRgb[2]}, ${arc.life * 0.7 * brightness})`;
        ctx.lineWidth = arc.life * 2;
        ctx.beginPath(); ctx.moveTo(a.px, a.py);
        ctx.quadraticCurveTo((a.px + b.px) / 2 + sin(t * 12) * 8, (a.py + b.py) / 2 + cos(t * 10) * 8, b.px, b.py);
        ctx.stroke();
      }

      // Satellites (tier 6+) — orbiting micro-orbs with motion trails
      for (const sat of satellites) {
        sat.angle += 0.008 * sat.speed * speedBoost;
        const rr = sat.radius * radiusMod;
        const x0 = rr * cos(sat.angle);
        const y0 = rr * sin(sat.angle) * cos(sat.tiltX);
        const z0 = rr * sin(sat.angle) * sin(sat.tiltX);
        // apply global rotation
        const x1 = x0 * cry + z0 * sry;
        const z1 = -x0 * sry + z0 * cry;
        const y2 = y0 * crx - z1 * srx;
        const z2 = y0 * srx + z1 * crx;
        const pr = project(x1, y2, z2);

        // Trail: shorter (6 vs 10) and rendered as simple circles.
        sat.trail.push({ x: pr.px, y: pr.py, a: 1 });
        if (sat.trail.length > 6) sat.trail.shift();

        for (let i = 0; i < sat.trail.length; i++) {
          const tpt = sat.trail[i];
          const trailAlpha = (i / sat.trail.length) * 0.5 * brightness;
          ctx.fillStyle = `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, ${trailAlpha})`;
          ctx.beginPath();
          ctx.arc(tpt.x, tpt.y, sat.size * (i / sat.trail.length) * 0.7, 0, PI2);
          ctx.fill();
        }

        // Simpler halo — no radial gradient, just two stacked translucent disks.
        if (pr.z < 50) {
          ctx.fillStyle = `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, ${0.25 * brightness})`;
          ctx.beginPath(); ctx.arc(pr.px, pr.py, sat.size * 3, 0, PI2); ctx.fill();
          ctx.fillStyle = `rgba(${colCore[0]}, ${colCore[1]}, ${colCore[2]}, ${brightness})`;
          ctx.beginPath(); ctx.arc(pr.px, pr.py, sat.size, 0, PI2); ctx.fill();
        }
      }

      // Particles
      for (const d of all) {
        const depthFade = max(0.1, (d.s - 0.2) / 0.8);
        const breathe = sin(t * 2 + d.phase) * 0.15 + 0.85;
        let alpha = max(0.08, depthFade * breathe * 0.9 * brightness);

        const lr = d.layer;
        let r = colOuter[0] + (colInner[0] - colOuter[0]) * lr;
        let g = colOuter[1] + (colInner[1] - colOuter[1]) * lr;
        let b = colOuter[2] + (colInner[2] - colOuter[2]) * lr;

        // Rainbow base color: override with time-shifted hue keyed to position
        if (baseIsRainbow && d.type === 0) {
          const hue = (t * 60 + d.idx * 4 + d.phase * 30) % 360;
          const rb = hslRgb(hue, 0.8, 0.55);
          r = rb[0]; g = rb[1]; b = rb[2];
        }

        if (d.type === 1) {
          // Ring particle — rainbow cycles hue; otherwise pick from the 4-color palette
          if (ringIsRainbow) {
            const hue = (t * 80 + d.idx * 90 + d.phase * 40) % 360;
            const rb = hslRgb(hue, 0.85, 0.6);
            r = rb[0]; g = rb[1]; b = rb[2];
          } else {
            const slot = ((d.idx % 4) + 4) % 4;
            const c = ringPalette[slot];
            r = c[0]; g = c[1]; b = c[2];
          }
          alpha *= 0.65;
        }
        if (d.pBoost > 0) {
          let pr = pulseRgb[0], pg = pulseRgb[1], pb = pulseRgb[2];
          if (pulseIsRainbow) {
            const hue = (t * 120 + d.phase * 60) % 360;
            const rb = hslRgb(hue, 0.9, 0.55);
            pr = rb[0]; pg = rb[1]; pb = rb[2];
          }
          r += (pr - r) * d.pBoost;
          g += (pg - g) * d.pBoost;
          b += (pb - b) * d.pBoost;
          alpha = min(1, alpha + d.pBoost * 0.6);
        }

        // Burst phase: particles glow brighter
        if (burstPhase) alpha = min(1, alpha * 1.8);

        const sz = d.sz * d.s * (1 + d.pBoost * 2);

        // Radial halo is the single most expensive op in this loop. Skip it
        // entirely in heavy mode — the visual impact is minor because the
        // solid fill + connections + arcs still read as a glowing sphere.
        if (!heavyMode && sz > 0.5 && alpha > 0.05) {
          const grd = ctx.createRadialGradient(d.px, d.py, 0, d.px, d.py, sz * (isSmall ? 2 : 4));
          grd.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.2})`);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(d.px, d.py, sz * (isSmall ? 2 : 4), 0, PI2); ctx.fill();
        }

        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.beginPath(); ctx.arc(d.px, d.py, max(0.3, sz), 0, PI2); ctx.fill();

        if (d.pBoost > 0.5) {
          ctx.fillStyle = `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, ${(d.pBoost - 0.5) * 0.7})`;
          ctx.beginPath(); ctx.arc(d.px, d.py, sz * 0.3, 0, PI2); ctx.fill();
        }
      }

      // Burst sparks — explosion particles radiating outward
      if (burstPhase) {
        const burstProgress = (eT - 1.4) / 0.6;
        // Inner ring of sparks
        const numSparks = 36;
        for (let i = 0; i < numSparks; i++) {
          const angle = (i / numSparks) * PI2 + burstProgress * 0.5;
          const dist = burstProgress * R * 0.9;
          const sparkX = cx + cos(angle) * dist;
          const sparkY = cy + sin(angle) * dist;
          const sparkAlpha = (1 - burstProgress) * 0.9;
          const sparkSize = (1 - burstProgress) * 4;
          ctx.fillStyle = `rgba(${pulseRgb[0]}, ${pulseRgb[1]}, ${pulseRgb[2]}, ${sparkAlpha})`;
          ctx.beginPath(); ctx.arc(sparkX, sparkY, max(0.5, sparkSize), 0, PI2); ctx.fill();
          // Spark glow
          const sg = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, sparkSize * 4);
          sg.addColorStop(0, `rgba(${colCore[0]}, ${colCore[1]}, ${colCore[2]}, ${sparkAlpha * 0.4})`);
          sg.addColorStop(1, 'transparent');
          ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sparkX, sparkY, sparkSize * 4, 0, PI2); ctx.fill();
        }
        // Outer ring of smaller sparks
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * PI2 - burstProgress * 0.3;
          const dist = burstProgress * R * 1.2;
          const sparkX = min(max(cx + cos(angle) * dist, 5), W - 5);
          const sparkY = min(max(cy + sin(angle) * dist, 5), H - 5);
          const sparkAlpha = (1 - burstProgress) * 0.5;
          const sparkSize = (1 - burstProgress) * 2;
          ctx.fillStyle = `rgba(${colInner[0]}, ${colInner[1]}, ${colInner[2]}, ${sparkAlpha})`;
          ctx.beginPath(); ctx.arc(sparkX, sparkY, max(0.3, sparkSize), 0, PI2); ctx.fill();
        }
        // Central flash glow
        const flashAlpha = (1 - burstProgress) * 0.3;
        const flashG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
        flashG.addColorStop(0, `rgba(${colCore[0]}, ${colCore[1]}, ${colCore[2]}, ${flashAlpha})`);
        flashG.addColorStop(1, 'transparent');
        ctx.fillStyle = flashG; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, PI2); ctx.fill();
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', md);
      canvas.removeEventListener('mousemove', mm);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', ts);
      canvas.removeEventListener('touchmove', tm);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [intensity, tier, size, baseColorId, pulseColorId, ringColorId]);

  const config = getOrbTier(tier);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        style={{
          width: size, height: size, maxWidth: '100%', cursor: 'grab', touchAction: 'none',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out',
        }}
      />
      {!hideLabel && <div className="mt-2 text-center">
        <p className="text-xs font-heading text-orange-400">{config.name}</p>
        <p className="text-[10px] text-slate-600">{intensity}% — {config.description}</p>
      </div>}

      <AnimatePresence>
        {canEvolve && !evolving && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
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
          transition={{ duration: 3 }}
          className="mt-3 text-sm font-heading text-orange-400"
        >
          Evolving...
        </motion.p>
      )}
    </div>
  );
}
