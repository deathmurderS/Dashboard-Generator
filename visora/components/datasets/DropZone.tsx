'use client';

import { useRef, useState } from 'react';
import { CloudUpload, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { glowPulse } from '@/lib/anime';

const ACCEPTED = '.csv,.xlsx,.xls';

export default function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openPicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') openPicker();
      }}
      className={cn(
        'group relative flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/60 bg-dot-grid bg-surface/40 px-8 py-14 text-center transition-all',
        dragging
          ? 'border-primary-container bg-primary-container/10 shadow-laser-strong'
          : 'hover:border-primary-container/60 hover:bg-surface/60',
        '[&.dragging]:duration-150'
      )}
      onMouseEnter={(e) => {
        // soft glow on hover via anime (design rule: animations via anime.js)
        const glow = glowPulse(e.currentTarget, { duration: 2000 });
        (e.currentTarget as HTMLDivElement & { __glow?: { pause: () => void } }).__glow = glow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement & { __glow?: { pause: () => void } }).__glow?.pause();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />

      <span
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-container/50 bg-primary-container/10 text-primary transition-transform',
          dragging ? 'scale-110' : 'group-hover:scale-105'
        )}
      >
        {dragging ? <FileUp size={28} /> : <CloudUpload size={30} />}
      </span>

      <h2 className="mt-6 font-heading text-xl font-semibold">
        {dragging ? 'Drop it right here' : 'Drop your CSV or Excel file here'}
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        or{' '}
        <span className="font-medium text-primary underline underline-offset-4">
          browse files
        </span>{' '}
        on your computer
      </p>
      <p className="label-mono-xs mt-5 text-outline">
        Supports .csv, .xlsx, .xls · Max 50MB
      </p>
    </div>
  );
}