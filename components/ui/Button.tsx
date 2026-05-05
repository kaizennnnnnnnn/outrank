'use client';

import { ButtonHTMLAttributes, CSSProperties, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

// Editorial (Direction B v2) filled-ink + hairline-outline CTAs.
// Square corners, uppercase letterspaced labels — match the onboarding
// pattern so this single primitive carries the new look across the app.
const variantStyle: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
  primary: {
    background: 'var(--b-ink)',
    color: 'var(--b-paper)',
    border: '1px solid var(--b-ink)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--b-ink)',
    border: '1px solid var(--b-ink)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--b-ink-60)',
    border: '1px solid transparent',
  },
  danger: {
    background: '#ef4444',
    color: '#ffffff',
    border: '1px solid #ef4444',
  },
  // Kept for back-compat with any lingering call sites; reads as a
  // hairline-ink button just like `secondary`.
  outline: {
    background: 'transparent',
    color: 'var(--b-ink)',
    border: '1px solid var(--b-ink)',
  },
};

const sizes = {
  sm: 'px-3 py-1.5',
  md: 'px-5 py-2.5',
  lg: 'px-7 py-3',
};

const fontSizeMap = { sm: 10, md: 11, lg: 12 } as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, disabled, children, style, ...props },
    ref,
  ) => {
    const spinnerColor = variant === 'primary' ? 'var(--b-paper)' : 'currentColor';
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        whileHover={{ opacity: 0.9 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-body transition-opacity duration-150 focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
          sizes[size],
          className,
        )}
        style={{
          fontSize: fontSizeMap[size],
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderRadius: 0,
          ...variantStyle[variant],
          ...style,
        }}
        disabled={disabled || loading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke={spinnerColor}
              strokeWidth="3"
              fill="none"
            />
            <path
              className="opacity-90"
              fill={spinnerColor}
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
