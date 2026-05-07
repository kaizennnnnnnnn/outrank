'use client';

import createGlobe from 'cobe';
import { useEffect, useRef } from 'react';

/**
 * Active-lifters globe — cobe-rendered 3D Earth that auto-rotates with
 * red activity markers pulsing across major cities. Replaces the prior
 * flat SVG continent strip in onboarding phase 6.
 *
 * Marker pulse uses a "breath + ping" combo: a small steady sine wave
 * for ambient breath, plus a sharp Math.pow(sin, 10) spike that fires
 * a ping every cycle. Same palette as the rest of the editorial chrome
 * (accent red on dark space).
 */

type Marker = { location: [number, number]; size: number };

// 49 real cities — same set as the source HTML reference. Sized so the
// dot density matches the "cities lit at night" cluster look.
const BASE_MARKERS: Marker[] = [
  { location: [40.7128, -74.006], size: 0.1 },
  { location: [34.0522, -118.2437], size: 0.09 },
  { location: [41.8781, -87.6298], size: 0.06 },
  { location: [37.7749, -122.4194], size: 0.08 },
  { location: [47.6062, -122.3321], size: 0.05 },
  { location: [25.7617, -80.1918], size: 0.05 },
  { location: [43.6532, -79.3832], size: 0.06 },
  { location: [49.2827, -123.1207], size: 0.05 },
  { location: [19.4326, -99.1332], size: 0.08 },
  { location: [4.711, -74.0721], size: 0.05 },
  { location: [-12.0464, -77.0428], size: 0.05 },
  { location: [-33.4489, -70.6693], size: 0.05 },
  { location: [-34.6037, -58.3816], size: 0.06 },
  { location: [-23.5505, -46.6333], size: 0.1 },
  { location: [-22.9068, -43.1729], size: 0.06 },
  { location: [51.5074, -0.1278], size: 0.1 },
  { location: [48.8566, 2.3522], size: 0.09 },
  { location: [52.52, 13.405], size: 0.06 },
  { location: [40.4168, -3.7038], size: 0.06 },
  { location: [41.9028, 12.4964], size: 0.06 },
  { location: [59.3293, 18.0686], size: 0.04 },
  { location: [60.1699, 24.9384], size: 0.04 },
  { location: [64.1466, -21.9426], size: 0.03 },
  { location: [55.7558, 37.6173], size: 0.09 },
  { location: [41.0082, 28.9784], size: 0.09 },
  { location: [30.0444, 31.2357], size: 0.08 },
  { location: [6.5244, 3.3792], size: 0.08 },
  { location: [-1.2921, 36.8219], size: 0.05 },
  { location: [-26.2041, 28.0473], size: 0.06 },
  { location: [25.2048, 55.2708], size: 0.08 },
  { location: [24.7136, 46.6753], size: 0.06 },
  { location: [35.6892, 51.389], size: 0.06 },
  { location: [24.8607, 67.0011], size: 0.06 },
  { location: [19.076, 72.8777], size: 0.1 },
  { location: [28.7041, 77.1025], size: 0.09 },
  { location: [12.9716, 77.5946], size: 0.06 },
  { location: [23.8103, 90.4125], size: 0.06 },
  { location: [13.7563, 100.5018], size: 0.08 },
  { location: [1.3521, 103.8198], size: 0.08 },
  { location: [-6.2088, 106.8456], size: 0.09 },
  { location: [14.5995, 120.9842], size: 0.08 },
  { location: [22.3193, 114.1694], size: 0.08 },
  { location: [31.2304, 121.4737], size: 0.1 },
  { location: [39.9042, 116.4074], size: 0.09 },
  { location: [37.5665, 126.978], size: 0.09 },
  { location: [35.6762, 139.6503], size: 0.1 },
  { location: [34.6937, 135.5023], size: 0.06 },
  { location: [-33.8688, 151.2093], size: 0.08 },
  { location: [-37.8136, 144.9631], size: 0.06 },
];

interface Props {
  size?: number;
  className?: string;
}

export function ActiveLiftersGlobe({ size = 320, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phiRef = useRef(0);
  const timeRef = useRef(0);
  const visibleRef = useRef(true);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedRef.current = mq.matches; };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const onVis = () => { visibleRef.current = document.visibilityState !== 'hidden'; };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const liveMarkers: Marker[] = BASE_MARKERS.map((m) => ({
      location: [...m.location] as [number, number],
      size: m.size,
    }));

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: 0,
      theta: 0.3,
      dark: 0.85,
      diffuse: 1.4,
      mapSamples: 18000,
      mapBrightness: 7,
      mapBaseBrightness: 0.05,
      baseColor: [0.12, 0.13, 0.2],
      markerColor: [1.0, 0.3, 0.28],
      glowColor: [0.55, 0.15, 0.15],
      markers: liveMarkers,
      onRender: (state) => {
        const animate = !reducedRef.current && visibleRef.current;
        if (animate) {
          phiRef.current += 0.003;
          timeRef.current += 0.04;
        }
        state.phi = phiRef.current;

        if (!reducedRef.current) {
          for (let i = 0; i < liveMarkers.length; i++) {
            const breath = 0.2 * Math.sin(timeRef.current + i * 0.5);
            const wave = Math.sin(timeRef.current * 0.35 + i * 1.7);
            const ping = wave > 0 ? Math.pow(wave, 10) * 0.5 : 0;
            liveMarkers[i].size =
              BASE_MARKERS[i].size * 0.6 * (1 + breath + ping);
          }
          state.markers = liveMarkers;
        }
      },
    });

    return () => globe.destroy();
  }, [size]);

  return (
    <div
      role="img"
      aria-label="Spinning 3D globe with glowing red activity markers across major world cities"
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {/* Atmosphere outer glow — red halo behind the canvas, sells the
          sphere as a planet with an atmosphere. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-22%',
          background:
            'radial-gradient(circle at center, rgba(255,90,90,0.18) 0%, rgba(220,60,50,0.06) 38%, transparent 68%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          contain: 'layout paint size',
        }}
      />
      {/* Specular highlight — soft warm glint on the upper-left */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '6%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 28%, rgba(255,200,195,0.10) 0%, rgba(255,200,195,0.025) 22%, transparent 46%)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
