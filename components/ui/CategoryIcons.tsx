'use client';

// Custom SVG icons for all 52 categories
// Consistent style: 24x24 viewBox, 1.5-2px stroke, rounded caps

interface SvgProps {
  size?: number;
  className?: string;
}

const defaultProps = { size: 24, className: '' };

function Svg({ size = 24, className, children }: SvgProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

// BODY & FITNESS
export function GymIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 6.5L4 9l2.5 2.5" stroke="none" />
      <rect x="2" y="8" width="3" height="8" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="19" y="8" width="3" height="8" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="5" y="6" width="3" height="12" rx="1.5" />
      <rect x="16" y="6" width="3" height="12" rx="1.5" />
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.5" />
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
    </Svg>
  );
}

export function RunningIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="14" cy="4" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="4" r="2" />
      <path d="M8 22l3-7 3 2" />
      <path d="M11 15l-2-3 4-3 3 2" />
      <path d="M16 11l2-2" />
      <path d="M6 19l3-4" />
    </Svg>
  );
}

export function StepsIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M8 3C8 3 6 5 6 8c0 2 1 3 2 3s2-1 2-3c0-3-2-5-2-5z" fill="currentColor" opacity="0.15" />
      <path d="M8 3C8 3 6 5 6 8c0 2 1 3 2 3s2-1 2-3c0-3-2-5-2-5z" />
      <ellipse cx="8" cy="12.5" rx="1.5" ry="1" />
      <path d="M16 10c0 0-2 2-2 5 0 2 1 3 2 3s2-1 2-3c0-3-2-5-2-5z" fill="currentColor" opacity="0.15" />
      <path d="M16 10c0 0-2 2-2 5 0 2 1 3 2 3s2-1 2-3c0-3-2-5-2-5z" />
      <ellipse cx="16" cy="19.5" rx="1.5" ry="1" />
    </Svg>
  );
}

export function WaterIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" fill="currentColor" opacity="0.15" />
      <path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" />
      <path d="M8 16a4 4 0 004 4" strokeWidth="1.5" opacity="0.5" />
    </Svg>
  );
}

export function SleepIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" opacity="0.15" />
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </Svg>
  );
}

export function ColdShowerIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function YogaIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="5" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M4 18l4-4 4 2 4-2 4 4" />
      <path d="M12 9v6" />
      <path d="M8 12l4 2 4-2" />
    </Svg>
  );
}

export function SwimmingIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M2 16c1.5-1 3-1.5 4 0s3 1 4 0 3-1.5 4 0 3 1 4 0 3-1.5 4 0" />
      <path d="M2 20c1.5-1 3-1.5 4 0s3 1 4 0 3-1.5 4 0 3 1 4 0 3-1.5 4 0" opacity="0.4" />
      <circle cx="10" cy="6" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="10" cy="6" r="2" />
      <path d="M16 12l-4-2-2 2-4-1" />
    </Svg>
  );
}

export function CyclingIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="17" r="3.5" opacity="0.15" fill="currentColor" />
      <circle cx="18" cy="17" r="3.5" opacity="0.15" fill="currentColor" />
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M12 17l-3-7h5l3 7" />
      <circle cx="12" cy="7" r="1.5" />
    </Svg>
  );
}

export function CaloriesIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 1 2 2 3 3 3 0-3 2-6 4-8 1 3 4 6 4 12 0 4-3 7-7 7z" fill="currentColor" opacity="0.15" />
      <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 1 2 2 3 3 3 0-3 2-6 4-8 1 3 4 6 4 12 0 4-3 7-7 7z" />
      <path d="M10 17c0 1 .5 2 2 2s2-1 2-2-1-2-2-3c-1 1-2 2-2 3z" fill="currentColor" opacity="0.3" />
    </Svg>
  );
}

// MIND & LEARNING
export function BookIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" fill="currentColor" opacity="0.1" />
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z" />
      <line x1="8" y1="7" x2="16" y2="7" strokeWidth="1.5" opacity="0.4" />
      <line x1="8" y1="10" x2="13" y2="10" strokeWidth="1.5" opacity="0.4" />
    </Svg>
  );
}

export function MeditationIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.08" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2 2" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </Svg>
  );
}

export function JournalIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="currentColor" opacity="0.1" />
      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <line x1="15" y1="5" x2="19" y2="9" />
    </Svg>
  );
}

export function GraduationIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M22 10l-10-6L2 10l10 6 10-6z" fill="currentColor" opacity="0.15" />
      <path d="M22 10l-10-6L2 10l10 6 10-6z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
      <line x1="22" y1="10" x2="22" y2="16" />
    </Svg>
  );
}

export function GlobeIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1" />
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </Svg>
  );
}

export function HeadphonesIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5z" fill="currentColor" opacity="0.2" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5z" />
      <path d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" fill="currentColor" opacity="0.2" />
      <path d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
    </Svg>
  );
}

export function ChessIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M8 21h8m-4-18v3m-3 0h6l-1 4h-4l-1-4zm-2 7h8l1 7H5l1-7z" fill="currentColor" opacity="0.1" />
      <path d="M8 21h8m-4-18v3m-3 0h6l-1 4h-4l-1-4zm-2 7h8l1 7H5l1-7z" />
    </Svg>
  );
}

export function FlashcardsIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="14" height="17" rx="2" fill="currentColor" opacity="0.08" transform="rotate(-5 11 12)" />
      <rect x="4" y="4" width="14" height="17" rx="2" transform="rotate(-5 11 12)" />
      <rect x="6" y="3" width="14" height="17" rx="2" fill="currentColor" opacity="0.08" transform="rotate(3 13 11)" />
      <rect x="6" y="3" width="14" height="17" rx="2" transform="rotate(3 13 11)" />
    </Svg>
  );
}

// FINANCE
export function SavingsIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10m-3-7.5C9 8.5 10 8 12 8s3 .5 3 1.5S13 11 12 11s-3 .5-3 1.5S10 14 12 14s3 .5 3 1.5c0 1-1 1.5-3 1.5" />
    </Svg>
  );
}

// CREATIVITY
export function PaletteIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.5 5.6-5.6C23 5.8 18 2 12 2z" fill="currentColor" opacity="0.1" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.5 5.6-5.6C23 5.8 18 2 12 2z" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="10" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="18" cy="11.5" r="1.5" fill="currentColor" />
    </Svg>
  );
}

export function CameraIconCustom(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" fill="currentColor" opacity="0.1" />
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

export function MusicIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

export function VideoIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polygon points="10 9 16 12 10 15" fill="currentColor" opacity="0.4" />
    </Svg>
  );
}

export function WritingIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="currentColor" opacity="0.1" />
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" opacity="0.4" />
      <line x1="8" y1="17" x2="12" y2="17" opacity="0.4" />
    </Svg>
  );
}

// CAREER
export function CodeIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" strokeWidth="1.5" opacity="0.4" />
    </Svg>
  );
}

export function GitIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.15" />
      <circle cx="18" cy="9" r="3" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="18" r="3" />
      <circle cx="18" cy="9" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 9v3c0 2 2 3 3 3h3" />
      <line x1="12" y1="15" x2="12" y2="9" />
    </Svg>
  );
}

export function RocketIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2C12 2 8 6 8 14l4 4 4-4c0-8-4-12-4-12z" fill="currentColor" opacity="0.15" />
      <path d="M12 2C12 2 8 6 8 14l4 4 4-4c0-8-4-12-4-12z" />
      <circle cx="12" cy="11" r="2" />
      <path d="M5 18l3-4m11 4l-3-4" />
    </Svg>
  );
}

export function CrosshairIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.08" />
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </Svg>
  );
}

export function MailIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 7 12 13 2 7" />
    </Svg>
  );
}

export function PhoneIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.68 2.36a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.76.32 1.55.55 2.36.68A2 2 0 0122 16.92z" />
    </Svg>
  );
}

// LIFESTYLE
export function ScreenIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </Svg>
  );
}

export function ShieldCheckIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" opacity="0.1" />
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </Svg>
  );
}

export function SunriseIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M17 18a5 5 0 00-10 0" />
      <line x1="12" y1="9" x2="12" y2="2" />
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
      <line x1="1" y1="18" x2="3" y2="18" />
      <line x1="21" y1="18" x2="23" y2="18" />
      <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
      <line x1="23" y1="22" x2="1" y2="22" />
      <polyline points="8 6 12 2 16 6" />
    </Svg>
  );
}

export function TreeIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 22v-6m0 0l-4-5h3l-3-4h3L8 3l4 4 4-4-3 4h3l-3 4h3l-4 5z" fill="currentColor" opacity="0.12" />
      <path d="M12 22v-6m0 0l-4-5h3l-3-4h3L8 3l4 4 4-4-3 4h3l-3 4h3l-4 5z" />
    </Svg>
  );
}

export function HeartIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor" opacity="0.15" />
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Svg>
  );
}

export function SparkleIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" fill="currentColor" opacity="0.15" />
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </Svg>
  );
}

export function PillIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M10.5 1.5l-8 8a5 5 0 007 7l8-8a5 5 0 00-7-7z" fill="currentColor" opacity="0.1" />
      <path d="M10.5 1.5l-8 8a5 5 0 007 7l8-8a5 5 0 00-7-7z" />
      <line x1="6" y1="10" x2="14" y2="2" strokeWidth="1.5" opacity="0.3" />
    </Svg>
  );
}

export function StretchIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="4" r="2" />
      <path d="M4 17l4-2 4 4 4-4 4 2" />
      <path d="M12 8v6" />
      <path d="M7 11l5 2 5-2" />
    </Svg>
  );
}

export function CoffeeIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" fill="currentColor" opacity="0.1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" opacity="0.4" />
      <line x1="10" y1="1" x2="10" y2="4" opacity="0.4" />
      <line x1="14" y1="1" x2="14" y2="4" opacity="0.4" />
    </Svg>
  );
}

export function FoodIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="11" width="18" height="10" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M3 15h18" opacity="0.3" />
      <path d="M12 2c-3 0-6 3-6 6h12c0-3-3-6-6-6z" fill="currentColor" opacity="0.1" />
      <path d="M12 2c-3 0-6 3-6 6h12c0-3-3-6-6-6z" />
    </Svg>
  );
}

// MUSIC INSTRUMENTS — distinct from MusicIcon (musical notes)
export function GuitarIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <ellipse cx="9" cy="16" rx="5" ry="6" fill="currentColor" opacity="0.12" />
      <ellipse cx="9" cy="16" rx="5" ry="6" />
      <circle cx="9" cy="16" r="2" />
      <line x1="14" y1="11" x2="20" y2="3" />
      <rect x="18" y="2" width="3" height="3" rx="0.5" transform="rotate(45 19.5 3.5)" />
      <line x1="9" y1="10" x2="9" y2="14" opacity="0.4" />
      <line x1="9" y1="18" x2="9" y2="21" opacity="0.4" />
    </Svg>
  );
}

export function PianoIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="6" width="20" height="13" rx="1.5" fill="currentColor" opacity="0.1" />
      <rect x="2" y="6" width="20" height="13" rx="1.5" />
      <line x1="7" y1="6" x2="7" y2="19" opacity="0.5" />
      <line x1="12" y1="6" x2="12" y2="19" opacity="0.5" />
      <line x1="17" y1="6" x2="17" y2="19" opacity="0.5" />
      <rect x="5" y="6" width="2" height="7" fill="currentColor" />
      <rect x="10" y="6" width="2" height="7" fill="currentColor" />
      <rect x="15" y="6" width="2" height="7" fill="currentColor" />
    </Svg>
  );
}

export function PencilDrawIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M3 21l3.5-1 11-11-2.5-2.5-11 11z" fill="currentColor" opacity="0.12" />
      <path d="M3 21l3.5-1 11-11-2.5-2.5-11 11z" />
      <path d="M14 6.5L17 3.5l3.5 3.5-3 3" />
      <line x1="13" y1="9" x2="15" y2="11" opacity="0.4" />
      <line x1="3" y1="21" x2="6.5" y2="20" />
    </Svg>
  );
}

// MIND addenda
export function TrophyThreeIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M6 4h12v6a6 6 0 01-12 0V4z" fill="currentColor" opacity="0.12" />
      <path d="M6 4h12v6a6 6 0 01-12 0V4z" />
      <path d="M6 5H3v3a3 3 0 003 3" />
      <path d="M18 5h3v3a3 3 0 01-3 3" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <text x="12" y="11" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">3</text>
    </Svg>
  );
}

export function MirrorIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="9" rx="7" ry="6" fill="currentColor" opacity="0.1" />
      <ellipse cx="12" cy="9" rx="7" ry="6" />
      <ellipse cx="12" cy="9" rx="4" ry="3.5" opacity="0.4" />
      <line x1="12" y1="15" x2="12" y2="20" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </Svg>
  );
}

// FINANCE addenda
export function ChartUpIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="3" width="20" height="18" rx="2" fill="currentColor" opacity="0.06" />
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <polyline points="5 16 9 12 12 14 19 7" strokeWidth="2" />
      <polyline points="15 7 19 7 19 11" strokeWidth="2" />
    </Svg>
  );
}

export function MoneyPlusIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </Svg>
  );
}

export function WalletNoIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M3 7h18a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" fill="currentColor" opacity="0.1" />
      <path d="M3 7h18a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
      <path d="M16 12h2v2h-2z" fill="currentColor" />
      <line x1="6" y1="6" x2="18" y2="20" stroke="currentColor" strokeWidth="2" />
    </Svg>
  );
}

export function BudgetReviewIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity="0.06" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="9" x2="13" y2="9" opacity="0.5" />
      <line x1="7" y1="13" x2="11" y2="13" opacity="0.5" />
      <line x1="7" y1="17" x2="14" y2="17" opacity="0.5" />
      <polyline points="15 14 17 16 20 12" strokeWidth="2" />
    </Svg>
  );
}

// LIFESTYLE / SOCIAL addenda
export function CallParentIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.68 2.36a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.76.32 1.55.55 2.36.68A2 2 0 0122 16.92z" />
      <path d="M16 4l1.5 1.5L20 3" strokeWidth="1.5" />
      <circle cx="18" cy="4" r="1" fill="currentColor" />
    </Svg>
  );
}

export function MoonHeartIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" opacity="0.12" />
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      <path d="M14.5 12c0-1 .8-1.8 1.8-1.8.5 0 1 .2 1.3.6.3-.4.8-.6 1.3-.6 1 0 1.8.8 1.8 1.8 0 1.5-3.1 3.5-3.1 3.5s-3.1-2-3.1-3.5z" fill="currentColor" />
    </Svg>
  );
}

export function WaveHandIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M9 11V6a1.5 1.5 0 013 0v5" />
      <path d="M12 11V5a1.5 1.5 0 013 0v6" />
      <path d="M15 11V6.5a1.5 1.5 0 013 0V13a6 6 0 01-6 6h-1a6 6 0 01-6-6v-1a1.5 1.5 0 013 0v1" />
      <path d="M2 8c1 0 2 1 2 2" opacity="0.4" />
      <path d="M2 5c2 0 3 1 3 3" opacity="0.4" />
    </Svg>
  );
}

export function StarSparkleIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2l1.8 5.6L20 9l-4.8 3.6L17 19l-5-3.4L7 19l1.8-6.4L4 9l6.2-1.4L12 2z" fill="currentColor" opacity="0.18" />
      <path d="M12 2l1.8 5.6L20 9l-4.8 3.6L17 19l-5-3.4L7 19l1.8-6.4L4 9l6.2-1.4L12 2z" />
      <circle cx="20" cy="4" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="4" cy="19" r="1" fill="currentColor" opacity="0.6" />
    </Svg>
  );
}

// HEALTH / DENTAL addenda
export function ToothIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M12 2c-3 0-6 1.5-6 5 0 2 1 4 1 7s0 8 2 8 2-4 3-6 1-2 0-2 0 2 0 4 1 4 3 4 2-5 2-8 1-5 1-7c0-3.5-3-5-6-5z" fill="currentColor" opacity="0.12" />
      <path d="M12 2c-3 0-6 1.5-6 5 0 2 1 4 1 7s0 8 2 8 2-4 3-6 1-2 0-2 0 2 0 4 1 4 3 4 2-5 2-8 1-5 1-7c0-3.5-3-5-6-5z" />
    </Svg>
  );
}

export function SunscreenIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="8" width="10" height="13" rx="1.5" fill="currentColor" opacity="0.12" />
      <rect x="7" y="8" width="10" height="13" rx="1.5" />
      <rect x="9" y="5" width="6" height="3" rx="0.5" />
      <line x1="9" y1="13" x2="15" y2="13" opacity="0.5" />
      <text x="12" y="18" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">SPF</text>
    </Svg>
  );
}

export function ToothbrushIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="14" width="14" height="3" rx="1" transform="rotate(-30 10 15.5)" fill="currentColor" opacity="0.15" />
      <rect x="3" y="14" width="14" height="3" rx="1" transform="rotate(-30 10 15.5)" />
      <rect x="14" y="6" width="6" height="3.5" rx="0.5" transform="rotate(-30 17 7.75)" fill="currentColor" opacity="0.3" />
      <line x1="14.5" y1="9" x2="15.2" y2="11" strokeWidth="1.5" opacity="0.6" />
      <line x1="16" y1="8.5" x2="16.7" y2="10.5" strokeWidth="1.5" opacity="0.6" />
      <line x1="17.5" y1="8" x2="18.2" y2="10" strokeWidth="1.5" opacity="0.6" />
      <line x1="19" y1="7.5" x2="19.7" y2="9.5" strokeWidth="1.5" opacity="0.6" />
    </Svg>
  );
}

// Distinct re-styling for slugs that previously shared icons
export function VocabularyIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="currentColor" opacity="0.08" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <text x="7" y="13" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">Aa</text>
      <line x1="13" y1="11" x2="18" y2="11" opacity="0.5" />
      <line x1="13" y1="14" x2="17" y2="14" opacity="0.4" />
      <line x1="6" y1="17" x2="18" y2="17" opacity="0.3" />
    </Svg>
  );
}

export function NoSocialIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="2" width="12" height="20" rx="2" fill="currentColor" opacity="0.08" />
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <line x1="9" y1="6" x2="15" y2="6" opacity="0.4" />
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />
    </Svg>
  );
}

export function NoAlcoholIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M9 3h6l-1 6a4 4 0 11-4 0L9 3z" fill="currentColor" opacity="0.1" />
      <path d="M9 3h6l-1 6a4 4 0 11-4 0L9 3z" />
      <line x1="12" y1="14" x2="12" y2="20" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="3" y1="4" x2="21" y2="22" stroke="currentColor" strokeWidth="2.5" />
    </Svg>
  );
}

export function NoJunkIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M5 9h14l-2 11H7L5 9z" fill="currentColor" opacity="0.1" />
      <path d="M5 9h14l-2 11H7L5 9z" />
      <path d="M3 9h18" />
      <path d="M9 4l3 5 3-5" />
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" />
    </Svg>
  );
}

export function DesignVectorIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="6" height="6" rx="1" fill="currentColor" opacity="0.18" />
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" fill="currentColor" opacity="0.18" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <line x1="9" y1="6" x2="18" y2="6" opacity="0.5" />
      <line x1="6" y1="9" x2="6" y2="18" opacity="0.5" />
      <path d="M9 9l9 9" strokeDasharray="2 2" opacity="0.6" />
    </Svg>
  );
}

export function ClientHandshakeIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <path d="M11 11l-2.5-2.5a2 2 0 00-2.8 2.8L11 16l5.3-4.7a2 2 0 00-2.8-2.8L11 11z" fill="currentColor" opacity="0.15" />
      <path d="M11 11l-2.5-2.5a2 2 0 00-2.8 2.8L11 16l5.3-4.7a2 2 0 00-2.8-2.8L11 11z" />
      <path d="M2 18l4-4" opacity="0.4" />
      <path d="M22 6l-4 4" opacity="0.4" />
    </Svg>
  );
}

// Generic fallback
export function GenericIcon(p: SvgProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.08" />
      <circle cx="12" cy="12" r="9" />
      <polyline points="9 12 11 14 15 10" />
    </Svg>
  );
}

// Category slug → icon mapping. Every slug declared in
// `constants/categories.ts` must resolve here so no habit ever falls
// back to GenericIcon. Aliases (drawing/drawings, savings/save-money)
// each get a distinct visual treatment.
const CATEGORY_ICON_MAP: Record<string, React.ComponentType<SvgProps>> = {
  // BODY
  'gym':            GymIcon,
  'running':        RunningIcon,
  'steps':          StepsIcon,
  'water':          WaterIcon,
  'sleep':          SleepIcon,
  'cold-shower':    ColdShowerIcon,
  'yoga':           YogaIcon,
  'swimming':       SwimmingIcon,
  'cycling':        CyclingIcon,
  'calories':       CaloriesIcon,

  // MIND
  'books':          BookIcon,
  'pages':          WritingIcon,           // pages = pages-of-text, not whole books
  'meditation':     MeditationIcon,
  'journaling':     JournalIcon,
  'courses':        GraduationIcon,
  'language':       GlobeIcon,
  'podcasts':       HeadphonesIcon,
  'chess':          ChessIcon,
  'flashcards':     FlashcardsIcon,
  'vocabulary':     VocabularyIcon,        // distinct "Aa" card from language globe
  'gratitude':      HeartIcon,
  'three-wins':     TrophyThreeIcon,
  'reflection':     MirrorIcon,

  // FINANCE
  'savings':        SavingsIcon,
  'save-money':     SavingsIcon,
  'no-impulse':     WalletNoIcon,          // wallet-with-strike, distinct from generic shield
  'expenses':       BudgetReviewIcon,
  'side-income':    MoneyPlusIcon,
  'investments':    ChartUpIcon,
  'invest':         ChartUpIcon,
  'no-spend':       WalletNoIcon,
  'budget-review':  BudgetReviewIcon,

  // CREATIVITY
  'designs':        DesignVectorIcon,      // vector-grid, distinct from PaletteIcon
  'drawings':       PaletteIcon,
  'drawing':        PencilDrawIcon,
  'photos':         CameraIconCustom,
  'music':          MusicIcon,
  'guitar':         GuitarIcon,
  'piano':          PianoIcon,
  'videos':         VideoIcon,
  'writing':        WritingIcon,

  // CAREER
  'coding':         CodeIcon,
  'commits':        GitIcon,
  'projects':       RocketIcon,
  'deep-work':      CrosshairIcon,
  'outreach':       MailIcon,
  'clients':        ClientHandshakeIcon,   // handshake, distinct from HeartIcon
  'networking':     PhoneIcon,

  // LIFESTYLE
  'screen-time':    ScreenIcon,
  'alcohol-free':   NoAlcoholIcon,
  'junk-free':      NoJunkIcon,
  'early-wake':     SunriseIcon,
  'outside':        TreeIcon,
  'no-social':      NoSocialIcon,
  'call-parent':    CallParentIcon,
  'date-night':     MoonHeartIcon,
  'friend-checkin': WaveHandIcon,
  'compliment':     StarSparkleIcon,

  // HEALTH
  'supplements':    PillIcon,
  'meal-prep':      FoodIcon,
  'no-caffeine':    CoffeeIcon,
  'skincare':       SparkleIcon,
  'stretch':        StretchIcon,
  'floss':          ToothIcon,
  'sunscreen':      SunscreenIcon,
  'brush-twice':    ToothbrushIcon,
};

export function getCategoryIconComponent(slug: string): React.ComponentType<SvgProps> {
  return CATEGORY_ICON_MAP[slug] || GenericIcon;
}
