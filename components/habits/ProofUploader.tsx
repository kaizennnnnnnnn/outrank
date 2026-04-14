'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProofUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function ProofUploader({ file, onFileChange }: ProofUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }

    if (!f.type.startsWith('image/')) {
      alert('Only images are allowed');
      return;
    }

    onFileChange(f);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">Proof photo (optional)</label>
      {file ? (
        <div className="relative rounded-xl overflow-hidden border border-[#1e1e30]">
          <Image
            src={URL.createObjectURL(file)}
            alt="Proof"
            width={400}
            height={200}
            className="w-full h-32 object-cover"
          />
          <button
            onClick={() => onFileChange(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full h-20 rounded-xl border-2 border-dashed border-[#1e1e30] flex flex-col items-center justify-center gap-1',
            'text-slate-600 hover:text-slate-400 hover:border-[#2d2d45] transition-colors'
          )}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span className="text-xs">Add photo proof</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
