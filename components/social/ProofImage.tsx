'use client';

import { useState } from 'react';

interface ProofImageProps {
  src: string;
  alt: string;
}

/**
 * Editorial Direction B v2 proof thumbnail. Hairline frame; tap to open
 * a full-size lightbox. Lightbox itself stays dark — that's the photo
 * surface, not the editorial chrome.
 */
export function ProofImage({ src, alt }: ProofImageProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          display: 'block',
          width: '100%',
          padding: 0,
          background: 'transparent',
          border: '1px solid var(--b-rule)',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
        aria-label="View proof photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          style={{ width: '100%', maxHeight: 288, objectFit: 'cover', display: 'block' }}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] animate-in fade-in duration-200"
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              background: 'var(--b-paper)',
              color: 'var(--b-ink)',
              border: '1px solid var(--b-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Verified-with-a-photo chip. Editorial: small accent ✓ glyph + italic
 * "Verified" in display Fraunces.
 */
export function VerifiedBadge({ size = 12 }: { size?: number }) {
  return (
    <span
      title="Verified with a proof photo"
      className="font-display"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 6px',
        border: '1px solid var(--b-accent)',
        color: 'var(--b-accent)',
        fontSize: 10,
        fontStyle: 'italic',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-11" />
      </svg>
      Verified
    </span>
  );
}
