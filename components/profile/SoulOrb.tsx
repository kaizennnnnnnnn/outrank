'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrbTier, MAX_ORB_TIER } from '@/constants/orbTiers';
import { getOrbBaseColor, getOrbPulseColor, getOrbRingColor, isRainbowColor, isMythicBaseColor } from '@/constants/orbColors';
import { Button } from '@/components/ui/Button';

interface SoulOrbProps {
  intensity: number;
  tier: number;
  size?: number;
  onEvolve?: () => void;
  /** Fires when the user taps the Ascend button (shown at tier 10). */
  onAscend?: () => void;
  /** Fires when the user performs a Full Awakening (only shown at 100% awakening). */
  onFullAwaken?: () => void;
  baseColorId?: string;
  pulseColorId?: string;
  ringColorId?: string;
  hideLabel?: boolean;
  /** Skip body particles. Used by shop "ring only" and "pulse only" previews. */
  hideBody?: boolean;
  /** Skip ring particles. Used by shop "base only" and "pulse only" previews. */
  hideRings?: boolean;
  /** Skip pulse spawning. Used by shop "base only" and "ring only" previews. */
  hidePulse?: boolean;
  /** When false, disables drag, evolve/ascend/awaken buttons, and related UI.
   *  Meant for static previews (shop modal, nav FAB). Defaults to true. */
  interactive?: boolean;
  /** Optional hook that lets the parent fire the evolve animation from
   *  an external button (e.g. the orb page's primary EVOLVE row).
   *  SoulOrb calls this once on mount, passing in its internal evolve
   *  trigger; the parent can stash it in a ref and invoke on click.
   *  When unused (every other call site), nothing changes. */
  registerEvolveTrigger?: (trigger: () => void) => void;
  /** Like registerEvolveTrigger, but for Ascend. Calling the registered
   *  trigger opens the SoulOrb's confirm modal; confirming runs the
   *  ritual animation and fires onAscend at the flash apex. */
  registerAscendTrigger?: (trigger: () => void) => void;
  /** Like registerEvolveTrigger, but for Full Awaken. */
  registerFullAwakenTrigger?: (trigger: () => void) => void;
  /** When true, SoulOrb does NOT render its own Full Awaken / Ascend /
   *  Evolve buttons under the awakening bar. The parent provides its
   *  own external action surface and uses the registered triggers
   *  above to fire animations. The awakening bar still renders, so
   *  it remains the last visual element in SoulOrb — letting the
   *  parent's button row sit literally underneath it. */
  suppressInternalActions?: boolean;
  /** Optional 0..1 ref the parent updates ~60Hz from a voice-session
   *  audio analyser. When provided, the render loop reads it each
   *  frame and uses it to push particles outward + brighten the body
   *  so the orb visibly "speaks" with the voice. 0 outside a session
   *  → no visual change. */
  audioLevelRef?: { current: number };
  /** Optional boolean ref the parent sets to true while a voice
   *  session is connected. When true, the orb sits at a constantly
   *  enlarged baseline so even silent listening reads as "alive."
   *  Stacks with audioLevelRef for the dynamic motion. */
  voiceActiveRef?: { current: boolean };
}

export function SoulOrb({ intensity, tier, size = 300, onEvolve, onAscend, onFullAwaken, baseColorId, pulseColorId, ringColorId, hideLabel, hideBody, hideRings, hidePulse, interactive = true, registerEvolveTrigger, registerAscendTrigger, registerFullAwakenTrigger, suppressInternalActions = false, audioLevelRef, voiceActiveRef }: SoulOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, rotX: 0, rotY: 0 });
  const evolveRef = useRef(false);
  const evolveTimeRef = useRef(0);
  const [evolving, setEvolving] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showAscendConfirm, setShowAscendConfirm] = useState(false);
  const [ascending, setAscending] = useState(false);
  const [ascendPhase, setAscendPhase] = useState<'collapse' | 'rebirth' | null>(null);
  const [showFullAwakenConfirm, setShowFullAwakenConfirm] = useState(false);
  const [awakening, setAwakeningState] = useState(false);
  const [awakenPhase, setAwakenPhase] = useState<'charge' | 'beams' | 'flash' | 'respawn' | null>(null);
  // Evolve is gated purely on whether the caller provided an `onEvolve`
  // callback. The profile page only sets onEvolve when the user has an
  // evolution charge, so this keeps evolve-availability in sync with charges
  // without needing SoulOrb to know about the awakening mechanic.
  // No internal `tier < MAX_ORB_TIER` check — /orb pins tier to MAX for
  // visual uniformity regardless of the user's real tier, so gating on it
  // here would lock evolve off even when charges are available.
  const canEvolve = !!onEvolve;
  const canFullAwaken = !!onFullAwaken;

  const triggerAscend = useCallback(() => {
    setShowAscendConfirm(false);
    setAscending(true);
    setAscendPhase('collapse');
    // 0-1.5s: collapse phase — orb spirals and crunches to a point
    // 1.5s: fire the real onAscend (firestore tier reset to 1) at the flash apex
    setTimeout(() => {
      onAscend?.();
      setAscendPhase('rebirth');
    }, 1500);
    // 2.8s: animation done, clear state
    setTimeout(() => {
      setAscending(false);
      setAscendPhase(null);
    }, 2800);
  }, [onAscend]);

  // Full Awakening ritual — 5 phases, ~4.5s total. Each phase drives a
  // different CSS overlay in the render tree. Fires onFullAwaken at the
  // flash apex (2.4s) so the Firestore update lands while the screen is
  // white and the user can't tell which frame corresponds to the change.
  const triggerFullAwaken = useCallback(() => {
    setShowFullAwakenConfirm(false);
    setAwakeningState(true);
    setAwakenPhase('charge');
    // 0-1.1s: charge — orb scale pulses + draws energy inward
    setTimeout(() => setAwakenPhase('beams'), 1100);
    // 1.1-2.3s: beams — 8 rays fan out radially
    setTimeout(() => setAwakenPhase('flash'), 2300);
    // 2.3-3.0s: flash — full-screen rainbow bloom. Fire onFullAwaken at apex.
    setTimeout(() => {
      onFullAwaken?.();
      setAwakenPhase('respawn');
    }, 2400);
    // 3.0-4.5s: respawn — transformation + rainbow aurora settle
    setTimeout(() => {
      setAwakeningState(false);
      setAwakenPhase(null);
    }, 4500);
  }, [onFullAwaken]);

  const handleEvolve = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canEvolve) return;
    setEvolving(true);
    evolveRef.current = true;
    evolveTimeRef.current = 0;
    // Phase 1 (0-2.0s):   rapid spin accelerating, scale grows to 1.14
    // Phase 2 (2.0-2.15s): EXPLOSION — flash + shockwaves + burst dots
    //                      canvas fades to white as the bloom peaks
    setTimeout(() => setFadeOut(true), 2000);
    // Phase 3 (2.15s):    tier swap masked behind the white peak
    setTimeout(() => {
      onEvolve?.();
    }, 2150);
    // Phase 4 (2.5s):     canvas fades back in at the new tier. The
    //                     orb page schedules its loot modal to land
    //                     ~850ms after the onEvolve callback (so the
    //                     reward shows roughly one second after the
    //                     spin ends, per the requested cadence).
    setTimeout(() => {
      setFadeOut(false);
      setEvolving(false);
      evolveRef.current = false;
      evolveTimeRef.current = 0;
    }, 2500);
  }, [canEvolve, onEvolve]);

  // Hand the evolve trigger up to a parent that wants to drive the
  // animation from an external button. Re-registers when handleEvolve
  // changes so the latest closure (with the current `canEvolve` etc)
  // is always the one that runs.
  useEffect(() => {
    registerEvolveTrigger?.(() => handleEvolve());
  }, [registerEvolveTrigger, handleEvolve]);

  // Same pattern for Ascend / Full Awaken — the registered trigger
  // opens the existing confirm modals so the ritual animations still
  // run, but the entry point is now the parent's external button.
  useEffect(() => {
    registerAscendTrigger?.(() => setShowAscendConfirm(true));
  }, [registerAscendTrigger]);
  useEffect(() => {
    registerFullAwakenTrigger?.(() => setShowFullAwakenConfirm(true));
  }, [registerFullAwakenTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const dpr = window.devicePixelRatio || 1;
    // Render onto a canvas larger than the apparent orb so the voice
    // splash has room to scatter beyond R without clipping at the
    // edges. The outer wrapper stays at `size`, so page layout is
    // unaffected — only the canvas pixels grow.
    const CANVAS_BUFFER = 1.35;
    const canvasW = size * CANVAS_BUFFER;
    canvas.width = canvasW * dpr;
    canvas.height = canvasW * dpr;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasW + 'px';
    ctx.scale(dpr, dpr);

    const W = canvasW, H = canvasW, cx = W / 2, cy = H / 2;
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
    // Visuals are decoupled from awakening: the orb always renders as
    // if fully awakened (pct=1), so the body/glow/pulse/arcs all run
    // at peak strength regardless of progress. The awakening bar below
    // still displays the real percentage via the intensity prop.
    const pct = 1;
    const R = size * config.radius;
    const brightness = 0.4 + pct * 0.6;
    const isSmall = size <= 100;
    // Cap main-sphere particles for perf. Tiers 6-10 compensate with more
    // rings / satellites / arcs rather than raw particle count.
    // At small sizes (landing hero, leaderboard rows) we previously
    // dropped to 25% of full particle count — that left huge gaps and
    // each remaining dot read as a smoke puff. Bumping to ~55% of
    // full + lowering particleScale gives the orb a finer, denser dot
    // pattern that still scales perf-wise.
    const PARTICLE_CAP = 700;
    const rawNumP = isSmall
      ? Math.floor(config.particles * 0.55)
      : Math.floor(config.particles * (0.5 + pct * 0.5));
    const numP = Math.min(rawNumP, isSmall ? 360 : PARTICLE_CAP);
    const particleScale = isSmall ? 0.35 : 1.0;
    const speedMultiplier = isSmall ? 2.0 : 1.0;
    // Heavy mode = skip per-particle radial gradients (biggest perf cost) for
    // high-tier / dense orbs. The solid fill still looks dense because
    // brightness is controlled via alpha.
    const heavyMode = config.tier >= 6;

    type P = { phi: number; theta: number; size: number; phase: number; speed: number; layer: number };
    const particles: P[] = [];
    // hideBody skips allocating AND drawing body particles — used by shop
    // "ring only" and "pulse only" previews.
    if (!hideBody) {
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
    }

    type Rng = { angle: number; radius: number; tiltX: number; speedMul: number; size: number; phase: number; colorIdx: number };
    const rings: Rng[] = [];
    // hideRings skips allocating AND drawing rings — for "base only" and
    // "pulse only" previews. For previews rings still render even at small
    // sizes, so we only gate on the explicit hideRings flag there.
    // Capped at 6 so the max-tier render isn't visually noisy with concentric
    // rings — felt too busy around the body. Lower tiers (< 6 rings) are
    // unaffected.
    const ringCount = hideRings ? 0 : (isSmall && interactive ? 0 : Math.min(config.rings, 6));
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

    // Drag-to-rotate only attaches for interactive orbs. Previews in the
    // shop and the nav FAB stay still.
    if (interactive) {
      canvas.addEventListener('mousedown', md);
      canvas.addEventListener('mousemove', mm);
      canvas.addEventListener('mouseup', onEnd);
      canvas.addEventListener('mouseleave', onEnd);
      canvas.addEventListener('touchstart', ts, { passive: false });
      canvas.addEventListener('touchmove', tm, { passive: false });
      canvas.addEventListener('touchend', onEnd);
    }

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

      // Core glow — brighter during burst. Part of the BODY signature, so
      // skip when hideBody (ring-only / pulse-only previews) so the
      // isolated layer reads clearly.
      // Voice-driven particle splash. No uniform scaling — instead
      // each particle in the draw loop gets its own random direction
      // and magnitude derived from its index, so the body visibly
      // SCATTERS with the voice instead of inflating like a balloon.
      // Outer particles fly further than inner ones, giving the
      // "bead with particles splashing" feel the orb is meant to
      // have. Skipped entirely below the threshold so silent voice
      // sessions look identical to idle.
      const audioSplash = audioLevelRef?.current ?? 0;
      const splashOn = audioSplash > 0.03;

      if (!hideBody) {
        const glowBoost = burstPhase ? 2.5 : (contractPhase ? 1.5 : 1.0);
        const gp = (sin(t * 1.2) * 0.02 + 0.06 + pct * config.glowIntensity * 0.08) * glowBoost;
        const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R + 25);
        g1.addColorStop(0, `rgba(${colMid[0]}, ${colMid[1]}, ${colMid[2]}, ${min(gp, 0.4)})`);
        g1.addColorStop(0.6, `rgba(${floor(colMid[0] * 0.4)}, ${floor(colMid[1] * 0.4)}, ${floor(colMid[2] * 0.3)}, ${min(gp * 0.3, 0.15)})`);
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, W, H);
      }

      // Rhythmic pulse wave through the orb — uses pulse color, expands from center.
      // This is the pulse's dedicated visual (doesn't need body particles), so when
      // previewing a pulse color we render this at full strength + force pct to
      // 1 so the wave is clearly visible.
      // Rhythmic pulse wave through the orb — uses pulse color, expands from center.
      // This is the pulse's dedicated visual (doesn't need body particles), so when
      // previewing a pulse color we render this at full strength + force pct to
      // 1 so the wave is clearly visible.
      if (!isEvolving && !hidePulse) {
        const beatT = (t * 0.8) % 1;
        const beatRadius = beatT * R * 1.3;
        // Boost alpha when body is hidden (pulse-only preview) so the wave is
        // clearly visible against empty space instead of half-transparent.
        // Floor at 0.45 so the cosmetic pulse is always visible — even
        // at 0% awakening — since the user paid for the pulse colour
        // in the shop and expects to see it. Higher awakening still
        // strengthens the pulse linearly above the floor.
        const pulseAlphaMult = hideBody ? 2.2 : Math.max(0.45, pct);
        const beatAlpha = (1 - beatT) * 0.45 * pulseAlphaMult;
        if (beatAlpha > 0.01) {
          const pw = ctx.createRadialGradient(cx, cy, Math.max(0, beatRadius - R * 0.2), cx, cy, beatRadius + R * 0.1);
          pw.addColorStop(0, 'transparent');
          pw.addColorStop(0.7, `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, ${Math.min(beatAlpha * 0.6, 0.7)})`);
          pw.addColorStop(1, `rgba(${pulseInnerRgb[0]}, ${pulseInnerRgb[1]}, ${pulseInnerRgb[2]}, 0)`);
          ctx.fillStyle = pw;
          ctx.beginPath();
          ctx.arc(cx, cy, beatRadius + R * 0.1, 0, PI2);
          ctx.fill();
        }
        // Second offset wave — gives the preview a richer "multi-wave" look
        // that was missing with just the single beat wave. Only when hideBody
        // (so it doesn't muddy the full-orb render).
        if (hideBody) {
          const beatT2 = ((t * 0.8) + 0.5) % 1;
          const beatRadius2 = beatT2 * R * 1.3;
          const beatAlpha2 = (1 - beatT2) * 0.45 * pulseAlphaMult;
          if (beatAlpha2 > 0.01) {
            const pw2 = ctx.createRadialGradient(cx, cy, Math.max(0, beatRadius2 - R * 0.2), cx, cy, beatRadius2 + R * 0.1);
            pw2.addColorStop(0, 'transparent');
            pw2.addColorStop(0.7, `rgba(${pulseInnerRgb[0]}, ${pulseInnerRgb[1]}, ${pulseInnerRgb[2]}, ${Math.min(beatAlpha2 * 0.55, 0.6)})`);
            pw2.addColorStop(1, `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, 0)`);
            ctx.fillStyle = pw2;
            ctx.beginPath();
            ctx.arc(cx, cy, beatRadius2 + R * 0.1, 0, PI2);
            ctx.fill();
          }
        }
      }

      const ry = t * 0.5 * speedBoost * speedMultiplier + dragRef.current.rotY;
      const rx = sin(t * 0.2) * 0.3 + 0.4 + dragRef.current.rotX;
      const cry = cos(ry), sry = sin(ry), crx = cos(rx), srx = sin(rx);

      // Spawn — gated so preview modes don't churn on arrays they'll never draw.
      // Spawn rate floored at 0.45 of full so the cosmetic pulse keeps
      // travelling through the orb at any awakening, including 0%.
      if (!hidePulse && pulses.length < 6 && random() < config.pulseChance * Math.max(0.45, pct) && !isEvolving) {
        pulses.push({ lat: (random() - 0.5) * PI, lon: random() * PI2, radius: 0, speed: 1.5 + random() * 2, maxRadius: 1.2 });
      }
      if (!hideBody && arcs.length < config.maxArcs && random() < config.arcChance * pct) {
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

        // Per-particle splash on top of d.px/d.py. Each particle's
        // direction and magnitude are derived from its stable idx so
        // it looks chaotic but stays consistent across frames (no
        // jitter). Outer particles (d.layer near 1) splash much more
        // than inner ones, so the orb's core stays compact while the
        // outside scatters — that's the "bead with particles
        // splashing all over" feel.
        let ex = d.px;
        let ey = d.py;
        if (splashOn) {
          const dx = d.px - cx;
          const dy = d.py - cy;
          const len = sqrt(dx * dx + dy * dy) || 1;
          // Deterministic per-particle random unit vector.
          const seed = d.idx * 2.39996;
          const randX = cos(seed);
          const randY = sin(seed);
          // 40% radial + 60% random — leans into chaos so the splash
          // reads as scattering rather than uniform expansion.
          const pushX = (dx / len) * 0.4 + randX * 0.6;
          const pushY = (dy / len) * 0.4 + randY * 0.6;
          // Outer particles fly nearly twice as far as inner ones, so
          // the core stays compact like a bead while the surface
          // shells erupt.
          const layerWeight = 0.2 + d.layer * 1.15;
          const variance = 0.5 + ((d.idx * 7) % 13) / 13 * 0.6;
          // Magnitude bumped 0.22 → 0.34 for clearly aggressive splash.
          const mag = audioSplash * R * 0.34 * layerWeight * variance;
          ex = d.px + pushX * mag;
          ey = d.py + pushY * mag;
          // Clamp inside canvas. 3px margin keeps the dot fully drawn.
          if (ex < 3) ex = 3;
          else if (ex > W - 3) ex = W - 3;
          if (ey < 3) ey = 3;
          else if (ey > H - 3) ey = H - 3;
        }

        // Radial halo is the single most expensive op in this loop. Skip it
        // entirely in heavy mode — the visual impact is minor because the
        // solid fill + connections + arcs still read as a glowing sphere.
        // At small sizes the halo radius and alpha are both clamped down
        // hard so each dot stays a crisp pin-prick instead of bleeding
        // into its neighbours and looking like a smoke cloud.
        if (!heavyMode && sz > 0.5 && alpha > 0.05) {
          const haloRadius = sz * (isSmall ? 1.3 : 4);
          const haloAlpha = alpha * (isSmall ? 0.12 : 0.2);
          const grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, haloRadius);
          grd.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${haloAlpha})`);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(ex, ey, haloRadius, 0, PI2); ctx.fill();
        }

        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.beginPath(); ctx.arc(ex, ey, max(isSmall ? 0.22 : 0.3, sz), 0, PI2); ctx.fill();

        if (d.pBoost > 0.5) {
          ctx.fillStyle = `rgba(${pulseMidRgb[0]}, ${pulseMidRgb[1]}, ${pulseMidRgb[2]}, ${(d.pBoost - 0.5) * 0.7})`;
          ctx.beginPath(); ctx.arc(ex, ey, sz * 0.3, 0, PI2); ctx.fill();
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
      if (interactive) {
        canvas.removeEventListener('mousedown', md);
        canvas.removeEventListener('mousemove', mm);
        canvas.removeEventListener('mouseup', onEnd);
        canvas.removeEventListener('mouseleave', onEnd);
        canvas.removeEventListener('touchstart', ts);
        canvas.removeEventListener('touchmove', tm);
        canvas.removeEventListener('touchend', onEnd);
      }
    };
  }, [intensity, tier, size, baseColorId, pulseColorId, ringColorId, hideBody, hideRings, hidePulse, interactive]);

  const config = getOrbTier(tier);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Light-theme backdrop — the orb is designed to glow against
            empty space; on cream paper it loses its ground. This soft
            dark radial pocket is hidden on the default Ink theme via
            CSS and only fades in under [data-theme='light']. The
            gradient feathers to transparent at 90% so it doesn't read
            as a black disc plopped onto the page. */}
        <div
          aria-hidden
          className="orb-light-backdrop absolute pointer-events-none rounded-full"
          style={{
            inset: -size * 0.06,
            background:
              'radial-gradient(circle, rgba(8,8,16,0.92) 0%, rgba(8,8,16,0.78) 50%, rgba(8,8,16,0.32) 80%, rgba(8,8,16,0) 100%)',
          }}
        />

        {/* Spin wrapper sized to canvas-buffer (1.35x size) and
            absolutely centered inside the size-bound parent so the
            voice splash has room to scatter past the orb radius
            without clipping. Page layout still sees `size`.
            Centered via negative offsets (not translate) — the spin
            keyframe writes its own `transform: rotate(...) scale(...)`,
            and using translate here would get clobbered and snap the
            wrapper's top-left corner to the parent center mid-spin. */}
        <div
          className={
            ascending ? 'animate-ascend-collapse'
            : evolving ? 'orb-evolving-spin'
            : ''
          }
          style={{
            width: size * 1.35,
            height: size * 1.35,
            transformOrigin: 'center',
            position: 'absolute',
            left: -size * 0.175,
            top: -size * 0.175,
          }}
        >
          <canvas
            ref={canvasRef}
            className={isMythicBaseColor(baseColorId) ? 'orb-mythic-pulse' : ''}
            style={{
              width: size * 1.35, height: size * 1.35, maxWidth: '100%', cursor: 'grab', touchAction: 'none',
              opacity: fadeOut ? 0 : 1,
              transition: 'opacity 0.5s ease-in-out',
              position: 'relative',
            }}
          />
        </div>

        {/* Evolve bloom — radial white flash that SLAMS open at the
            apex of the spin (~78% through) and dissipates outward.
            The fast onset reads as an explosion rather than a grow. */}
        {evolving && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-full animate-orb-evolve-flash"
            style={{
              background:
                'radial-gradient(circle, #ffffff 0%, #fef3c7 18%, #fde68a 40%, rgba(253,224,71,0.5) 60%, rgba(249,168,212,0.25) 80%, transparent 95%)',
              mixBlendMode: 'screen',
              transformOrigin: 'center',
            }}
          />
        )}

        {/* Evolve shockwaves — three staggered rings blast outward at
            the explosion moment. Pure border + transform; no box-shadow
            animation. Delays compress the gap so the rings fire as a
            tight burst rather than a slow ripple. */}
        {evolving && (
          <>
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none rounded-full animate-orb-evolve-shockwave"
              style={{ border: '3px solid #ffffff' }}
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none rounded-full animate-orb-evolve-shockwave"
              style={{ border: '2px solid #fde68a', animationDelay: '0.12s' }}
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none rounded-full animate-orb-evolve-shockwave"
              style={{ border: '2px solid #f9a8d4', animationDelay: '0.22s' }}
            />
          </>
        )}

        {/* Burst particles — 8 sparkle dots fly outward radially at
            the explosion peak. Each wrapper rotates to its cardinal
            direction; the inner dot animates translateY along the
            rotated -y axis (= radially outward in world coords).
            --burst-distance scales with the orb size. */}
        {evolving && Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`burst-${i}`}
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              width: 0,
              height: 0,
              transform: `rotate(${i * 45}deg)`,
              zIndex: 6,
            }}
          >
            <div
              className="rounded-full animate-orb-evolve-burst"
              style={{
                position: 'absolute',
                left: -4,
                top: -4,
                width: 8,
                height: 8,
                background: i % 2 === 0 ? '#ffffff' : '#fde047',
                boxShadow:
                  i % 2 === 0
                    ? '0 0 12px #fde047, 0 0 4px #ffffff'
                    : '0 0 10px #f9a8d4, 0 0 4px #ffffff',
                ['--burst-distance' as string]: `${size * 0.5}px`,
              } as React.CSSProperties}
            />
          </div>
        ))}

        {/* Ascension flash overlay — bloom of white/gold at collapse */}
        {ascending && (
          <div
            className="absolute inset-0 pointer-events-none animate-ascend-flash rounded-full"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, #fde68a 30%, #f472b6 55%, transparent 75%)',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Expanding shockwave rings */}
        {ascending && (
          <>
            <div
              className="absolute inset-0 pointer-events-none animate-ascend-shockwave rounded-full"
              style={{ border: '4px solid #fde68a', boxShadow: '0 0 24px #f472b6' }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-ascend-shockwave rounded-full"
              style={{ border: '3px solid #ec4899', animationDelay: '0.4s' }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-ascend-shockwave rounded-full"
              style={{ border: '2px solid #a855f7', animationDelay: '0.8s' }}
            />
          </>
        )}

        {/* ---- FULL AWAKENING ritual layers ---- */}

        {/* Charge pulse: orb magnifies and brightens pulling light in */}
        {awakening && (
          <div
            className="absolute inset-0 pointer-events-none animate-awaken-charge rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(253,224,71,0.6), rgba(236,72,153,0.35) 50%, transparent 80%)',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* 8 radiating beams — only present during beams/flash phases */}
        {awakening && (awakenPhase === 'beams' || awakenPhase === 'flash') && (
          <div className="absolute inset-0 pointer-events-none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const beamColors = ['#fde047', '#ec4899', '#22d3ee', '#a855f7', '#fde047', '#ec4899', '#22d3ee', '#a855f7'];
              return (
                <div
                  key={deg}
                  className="absolute top-1/2 left-1/2 origin-left animate-awaken-beam"
                  style={{
                    width: size * 0.9,
                    height: 4,
                    transform: `rotate(${deg}deg)`,
                    background: `linear-gradient(90deg, transparent, ${beamColors[i]}, transparent)`,
                    boxShadow: `0 0 14px ${beamColors[i]}, 0 0 6px #fff`,
                    animationDelay: `${i * 0.04}s`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Full-screen rainbow flash — covers the whole orb viewport */}
        {awakening && (
          <div
            className="absolute inset-0 pointer-events-none animate-awaken-flash rounded-full"
            style={{
              background:
                'radial-gradient(circle, #ffffff 0%, #fef3c7 14%, #fde047 28%, #f9a8d4 46%, #c084fc 66%, #22d3ee 82%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Five expanding shockwaves in prismatic order — bigger than Ascend */}
        {awakening && (
          <>
            <div
              className="absolute inset-0 pointer-events-none animate-awaken-shockwave rounded-full"
              style={{ border: '5px solid #fef3c7', boxShadow: '0 0 32px #fde047' }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-awaken-shockwave rounded-full"
              style={{ border: '4px solid #f9a8d4', boxShadow: '0 0 24px #ec4899', animationDelay: '0.35s' }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-awaken-shockwave rounded-full"
              style={{ border: '3px solid #c084fc', boxShadow: '0 0 20px #a855f7', animationDelay: '0.7s' }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-awaken-shockwave rounded-full"
              style={{ border: '3px solid #22d3ee', boxShadow: '0 0 18px #22d3ee', animationDelay: '1.05s' }}
            />
            <div
              className="absolute inset-0 pointer-events-none animate-awaken-shockwave rounded-full"
              style={{ border: '2px solid #fef3c7', animationDelay: '1.4s' }}
            />
          </>
        )}

        {/* Respawn aurora ring — appears after the flash during the transform */}
        {awakening && awakenPhase === 'respawn' && (
          <div
            className="absolute -inset-6 pointer-events-none rounded-full animate-awaken-aurora"
            style={{
              background:
                'conic-gradient(from 0deg, #fde047, #ec4899, #a855f7, #22d3ee, #fde047, #ec4899, #a855f7, #22d3ee, #fde047)',
              filter: 'blur(14px)',
              opacity: 0.55,
            }}
          />
        )}
      </div>

      {!hideLabel && <div className="mt-2 text-center">
        <p className="text-xs font-heading text-orange-400">{config.name}</p>
      </div>}

      {/* Non-interactive preview mode (shop modal / nav FAB) short-circuits
          before the evolve / ascend / awaken button cluster — nothing below
          makes sense for a static render. */}
      {!interactive ? null : (
      <>
      <AnimatePresence>
        {/* Awakening progress bar — always visible while the orb is
            interactive, so the user can see how far they are from the
            full-awakening unlock. Rendered above the action buttons
            so the bar and the eventual Full Awaken button read as a
            stacked unit. */}
        {interactive && !evolving && !ascending && !awakening && (
          <div className="mt-3" style={{ width: '100%', maxWidth: 280 }}>
            <EditorialAwakeningBar awakening={intensity} />
          </div>
        )}

        {/* Full Awaken takes top billing when available — even ahead of Ascend.
            This is the long-road 100% payoff and should feel like THE button. */}
        {!suppressInternalActions && canFullAwaken && !evolving && !ascending && !awakening && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFullAwakenConfirm(true); }}
              className="awaken-cta font-display"
              style={{
                position: 'relative',
                padding: '12px 28px',
                color: '#ffffff',
                border: '1px solid var(--b-ink)',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 600,
                fontStyle: 'italic',
                letterSpacing: '0.02em',
              }}
            >
              <span className="awaken-cta-label">Full Awaken</span>
            </button>
          </motion.div>
        )}

        {/* Ascend only when at tier cap AND Full Awaken isn't taking focus. */}
        {!suppressInternalActions && tier >= MAX_ORB_TIER && onAscend && !canFullAwaken && !evolving && !ascending && !awakening && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAscendConfirm(true); }}
              className="text-sm font-heading font-bold text-white tracking-[0.15em] uppercase px-6 py-2.5 rounded-xl animate-frame-pulse bg-gradient-to-r from-pink-600 via-fuchsia-500 to-orange-400 shadow-[0_8px_30px_-6px_rgba(236,72,153,0.85)]"
            >
              Ascend
            </button>
          </motion.div>
        )}

        {!suppressInternalActions && canEvolve && !evolving && !awakening && tier < MAX_ORB_TIER && (
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

      {ascending && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.8 }}
          className="mt-3 text-sm font-heading font-bold tracking-[0.25em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-fuchsia-300 to-orange-300"
        >
          {ascendPhase === 'rebirth' ? 'Reborn' : 'Ascending'}
        </motion.p>
      )}

      {awakening && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 4.5 }}
          className="mt-3 text-base font-heading font-bold tracking-[0.3em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-pink-400 via-fuchsia-400 to-cyan-300"
          style={{ backgroundSize: '200% 100%', animation: 'shop-mythic-bg 2s linear infinite' }}
        >
          {awakenPhase === 'charge'   ? 'Charging'   :
           awakenPhase === 'beams'    ? 'Radiating'  :
           awakenPhase === 'flash'    ? 'Awakening!' :
           awakenPhase === 'respawn'  ? 'Awakened'   : ''}
        </motion.p>
      )}

      <AscendConfirmModal
        isOpen={showAscendConfirm}
        onClose={() => setShowAscendConfirm(false)}
        onConfirm={triggerAscend}
        tier={tier}
        baseColorId={baseColorId}
        pulseColorId={pulseColorId}
        ringColorId={ringColorId}
      />

      <FullAwakenConfirmModal
        isOpen={showFullAwakenConfirm}
        onClose={() => setShowFullAwakenConfirm(false)}
        onConfirm={triggerFullAwaken}
      />
      </>
      )}
    </div>
  );
}

// ---- Ascend confirmation modal ----

interface AscendConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tier: number;
  baseColorId?: string;
  pulseColorId?: string;
  ringColorId?: string;
}

function AscendConfirmModal({ isOpen, onClose, onConfirm, tier, baseColorId, pulseColorId, ringColorId }: AscendConfirmProps) {
  const currentConfig = getOrbTier(tier);
  const starterConfig = getOrbTier(1);

  const rewards: { icon: string; label: string; detail: string; color: string }[] = [
    { icon: 'frag', label: '+500 Fragments',     detail: 'Spend in the shop on cosmetics',           color: '#f59e0b' },
    { icon: 'frame', label: 'Ascension Frame',   detail: 'Exclusive shimmering profile frame',       color: '#ec4899' },
    { icon: 'name', label: 'Ascendant Title',    detail: 'Rainbow name effect unlocked',             color: '#a855f7' },
    { icon: 'count', label: '+1 Ascension',      detail: 'Forever marked on your profile',           color: '#22d3ee' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(236,72,153,0.22), transparent 55%), linear-gradient(180deg, #0f0b18 0%, #07070c 100%)',
              border: '1px solid rgba(236,72,153,0.4)',
              boxShadow: '0 20px 80px -20px rgba(236,72,153,0.55), inset 0 1px 0 rgba(236,72,153,0.2)',
            }}
          >
            {/* Decorative top glow bar */}
            <div
              className="h-0.5 w-full"
              style={{ background: 'linear-gradient(90deg, transparent, #ec4899 50%, transparent)' }}
            />

            <div className="p-6 pt-7 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-pink-300/90">
                Ascension Ritual
              </p>
              <h2 className="font-heading text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-fuchsia-200 to-orange-300">
                Ascend your orb?
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-[320px] mx-auto">
                Your orb will <b className="text-pink-300">collapse into a new beginning</b>. You keep all your progress — and earn permanent rewards.
              </p>
            </div>

            {/* Before → After orb preview */}
            <div className="mx-6 mb-4 p-4 rounded-2xl bg-[#0d0d15] border border-[#1e1e30] flex items-center justify-around">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">Now</div>
                <MiniOrbPreview tier={tier} baseColorId={baseColorId} pulseColorId={pulseColorId} ringColorId={ringColorId} size={56} />
                <p className="text-[10px] font-heading text-orange-300 mt-2">{currentConfig.name}</p>
              </div>
              <div className="flex flex-col items-center text-slate-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-pink-400">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
                <span className="text-[9px] font-bold uppercase tracking-widest text-pink-400 mt-1">Reborn</span>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">After</div>
                <MiniOrbPreview tier={1} baseColorId={baseColorId} pulseColorId={pulseColorId} ringColorId={ringColorId} size={56} />
                <p className="text-[10px] font-heading text-slate-400 mt-2">{starterConfig.name}</p>
              </div>
            </div>

            {/* Rewards grid */}
            <div className="px-6 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">You will receive</p>
              <div className="grid grid-cols-2 gap-2">
                {rewards.map((r) => (
                  <div
                    key={r.label}
                    className="rounded-xl p-2.5 border flex flex-col gap-0.5"
                    style={{
                      background: `linear-gradient(145deg, ${r.color}18, #0b0b14 70%)`,
                      borderColor: `${r.color}40`,
                    }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: r.color }}>{r.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-6 pt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1e1e30] hover:bg-[#2a2a40] text-sm font-medium text-slate-300 transition-colors"
              >
                Not yet
              </button>
              <button
                onClick={onConfirm}
                className="flex-[1.5] px-4 py-3 rounded-xl text-sm font-heading font-bold uppercase tracking-[0.15em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] animate-frame-pulse"
                style={{
                  background: 'linear-gradient(90deg, #db2777 0%, #e11d48 40%, #ea580c 100%)',
                  boxShadow: '0 0 30px -8px rgba(236,72,153,0.9)',
                }}
              >
                Ascend now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Static orb preview for the ascend modal — uses the equipped colors. */
function MiniOrbPreview({ tier, baseColorId, pulseColorId, ringColorId, size }: {
  tier: number;
  baseColorId?: string;
  pulseColorId?: string;
  ringColorId?: string;
  size: number;
}) {
  const config = getOrbTier(tier);
  const base = baseColorId ? getOrbBaseColor(baseColorId) : {
    outer: config.colors.outer, mid: config.colors.mid, inner: config.colors.inner, core: config.colors.core, glow: config.colors.glow,
  };
  const ring = ringColorId ? getOrbRingColor(ringColorId) : base;
  const pulse = pulseColorId ? getOrbPulseColor(pulseColorId) : base;
  const baseIsRainbow = isRainbowColor(baseColorId);

  const orbBg = baseIsRainbow
    ? `conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)`
    : `radial-gradient(circle at 32% 28%, #ffffff 0%, ${base.core} 12%, ${base.inner} 38%, ${base.mid} 66%, ${base.outer} 100%)`;

  return (
    <div
      className="relative inline-block animate-mini-orb-core"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${size * 0.25}px ${base.mid}cc)`,
      }}
    >
      {tier >= 2 && (
        <div
          className="absolute inset-0 rounded-full animate-mini-orb-ring"
          style={{
            background: `conic-gradient(from 0deg, ${ring.outer}, ${ring.mid}, ${ring.inner}, ${ring.core}, ${ring.mid}, ${ring.outer})`,
            WebkitMaskImage: 'radial-gradient(ellipse 55% 18% at 50% 50%, transparent 62%, black 66%)',
            maskImage: 'radial-gradient(ellipse 55% 18% at 50% 50%, transparent 62%, black 66%)',
          }}
        />
      )}
      <div
        className="absolute rounded-full"
        style={{
          inset: size * 0.14,
          background: orbBg,
          boxShadow: `0 0 ${size * 0.35}px ${base.mid}aa, inset 0 -${size * 0.1}px ${size * 0.2}px ${base.outer}`,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: size * 0.26,
          background: `radial-gradient(circle at 34% 30%, ${pulse.core}cc, ${pulse.inner}44 50%, transparent 75%)`,
          mixBlendMode: 'screen',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 0.22, height: size * 0.16,
          left: size * 0.24, top: size * 0.22,
          background: 'radial-gradient(ellipse, #ffffffdd 0%, transparent 80%)',
        }}
      />
    </div>
  );
}

// ---- Full Awaken confirmation modal ----
//
// Shown when the user taps the Full Awaken CTA. Displays the permanent reward
// set (exclusive Awakened cosmetic on first run, stacking +5% XP multiplier
// forever, fragments, XP, evolution charges) and asks one final yes/no before
// kicking off the ritual animation.
function FullAwakenConfirmModal({ isOpen, onClose, onConfirm }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const rewards: { label: string; detail: string; color: string }[] = [
    { label: '+5% XP Forever',        detail: 'Permanent multiplier, stacks every awakening',     color: '#fde047' },
    { label: 'Awakened Cosmetic',     detail: 'Mythic frame + name effect (first awakening)',     color: '#f9a8d4' },
    { label: '+2000 Fragments',       detail: 'Massive shop payout',                              color: '#fbbf24' },
    { label: '+1000 XP',              detail: 'Instant XP injection',                             color: '#22d3ee' },
    { label: '+2 Evolutions',         detail: 'Two ranks queued up and ready',                    color: '#ec4899' },
    { label: 'Awakening resets',      detail: 'Climb again for another permanent +5%',            color: '#a855f7' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl overflow-hidden animate-shop-mythic-border"
            style={{
              background:
                'radial-gradient(ellipse 100% 70% at 0% 0%,   rgba(253,224,71,0.32), transparent 55%),' +
                'radial-gradient(ellipse 100% 70% at 100% 0%, rgba(236,72,153,0.28), transparent 55%),' +
                'radial-gradient(ellipse 100% 70% at 100% 100%, rgba(34,211,238,0.28), transparent 55%),' +
                'radial-gradient(ellipse 100% 70% at 0% 100%,   rgba(168,85,247,0.28), transparent 55%),' +
                'linear-gradient(180deg, #120a1f 0%, #07070c 100%)',
              border: '1px solid rgba(253,224,71,0.5)',
            }}
          >
            <div
              className="h-0.5 w-full animate-shop-mythic-bg"
              style={{
                background: 'linear-gradient(90deg, #fde047, #ec4899, #a855f7, #22d3ee, #fde047)',
                backgroundSize: '200% 100%',
              }}
            />

            <div className="p-6 pt-7 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-200/90">
                Full Awakening
              </p>
              <h2
                className="font-heading text-3xl font-bold mt-2 bg-clip-text text-transparent animate-shop-mythic-bg"
                style={{
                  background: 'linear-gradient(90deg, #fde047, #f9a8d4, #c084fc, #22d3ee, #fde047)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }}
              >
                Break the ceiling?
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-[340px] mx-auto">
                You hit 100%. Burn your awakening to lock in a <b className="text-amber-200">permanent XP bonus</b> and unlock rewards nothing else in the game can give.
              </p>
            </div>

            <div className="px-6 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Permanent rewards</p>
              <div className="grid grid-cols-2 gap-2">
                {rewards.map((r) => (
                  <div
                    key={r.label}
                    className="rounded-xl p-2.5 border flex flex-col gap-0.5"
                    style={{
                      background: `linear-gradient(145deg, ${r.color}22, #0b0b14 75%)`,
                      borderColor: `${r.color}55`,
                    }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: r.color }}>{r.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{r.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 pt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1e1e30] hover:bg-[#2a2a40] text-sm font-medium text-slate-300 transition-colors"
              >
                Not yet
              </button>
              <button
                onClick={onConfirm}
                className="flex-[1.7] relative px-4 py-3 rounded-xl text-sm font-heading font-bold uppercase tracking-[0.2em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] animate-shop-mythic-border"
                style={{
                  background: 'linear-gradient(90deg, #d97706 0%, #db2777 40%, #9333ea 75%, #0891b2 100%)',
                  boxShadow: '0 0 40px -8px rgba(253,224,71,0.9)',
                  backgroundSize: '200% 100%',
                }}
              >
                Awaken now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Editorial Awakening Bar ────────────────────────────────────────
//
// 0-100 progress bar in editorial chrome: hairline ink frame, accent
// red fill with a slow shine sweep, italic Fraunces percentage label
// above. Used inline in the orb command surface so the user always
// sees how far they are from the next full-awakening unlock.

function EditorialAwakeningBar({ awakening }: { awakening: number }) {
  const pct = Math.max(0, Math.min(100, awakening));
  const atMax = pct >= 100;
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          className="spread"
          style={{
            fontSize: 8.5,
            color: atMax ? 'var(--b-accent)' : 'var(--b-ink-60)',
            letterSpacing: '0.22em',
          }}
        >
          {atMax ? 'Awakening · Ready' : 'Awakening'}
        </span>
        <span
          className="font-display tabular"
          style={{
            fontSize: 14,
            fontStyle: 'italic',
            fontWeight: 600,
            color: atMax ? 'var(--b-accent)' : 'var(--b-ink)',
            lineHeight: 1,
          }}
        >
          {pct}<span style={{ fontSize: 9, fontStyle: 'normal', color: 'var(--b-ink-60)', marginLeft: 1 }}>%</span>
        </span>
      </div>
      <div
        className={atMax ? 'awaken-bar awaken-bar-max' : 'awaken-bar'}
        style={{
          position: 'relative',
          height: 6,
          border: '1px solid var(--b-ink)',
          background: 'var(--b-paper)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: 'var(--b-accent)',
            transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
}
