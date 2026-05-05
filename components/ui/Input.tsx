'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, onFocus, onBlur, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const borderColor = error ? '#ef4444' : 'var(--b-ink)';
    const borderWidth = focused ? 2 : 1;
    return (
      <div className="w-full">
        {label && (
          <label
            className="spread block"
            style={{
              fontSize: 9,
              color: 'var(--b-ink-60)',
              marginBottom: 6,
            }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--b-ink-60)' }}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={cn(
              'w-full font-body focus:outline-none',
              icon ? 'pl-10' : 'px-3',
              !icon && '',
              className,
            )}
            style={{
              background: 'transparent',
              color: 'var(--b-ink)',
              border: `${borderWidth}px solid ${borderColor}`,
              borderRadius: 0,
              fontSize: 13,
              padding: icon ? '10px 12px 10px 40px' : '10px 12px',
              // Compensate for the 1px width swing on focus so adjacent
              // layout doesn't jiggle.
              margin: focused ? -1 : 0,
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <p
            className="font-body"
            style={{ marginTop: 6, fontSize: 11, color: '#ef4444' }}
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
