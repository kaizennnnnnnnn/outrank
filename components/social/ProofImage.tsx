'use client';

import { useState } from 'react';

interface ProofImageProps {
  src: string;
  alt: string;
}

/**
 * Thumbnail of a proof photo attached to a feed item. Tap to open a full-size
 * lightbox; Escape or backdrop tap closes it.
 */
export function ProofImage({ src, alt }: ProofImageProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => {
          // Don't let the click bubble up to wrapping Links
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="block w-full rounded-xl overflow-hidden border border-[#1e1e30] hover:border-orange-500/40 transition-colors"
        aria-label="View proof photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full max-h-72 object-cover"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
            aria-label="Close"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

export function VerifiedBadge({ size = 12 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 whitespace-nowrap"
      title="Verified with a proof photo"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.6 6.9L22 10l-5.5 4.9L18 22l-6-3.8L6 22l1.5-7.1L2 10l7.4-1.1z" opacity="0.18" />
        <path d="M12 2l2.6 6.9L22 10l-5.5 4.9L18 22l-6-3.8L6 22l1.5-7.1L2 10l7.4-1.1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <polyline points="8.5 12.5 11 15 16 9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}
