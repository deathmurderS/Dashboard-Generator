'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { glowPulse } from '@/lib/anime';

interface BottomDockProps {
  verifiedCount: number;
  total: number;
  verifiedAll: boolean;
  onGenerate: () => void;
}

/**
 * Sticky floating dock at the bottom of the Profiler.
 * Shows verified-column progress and the glowing "Generate Dashboard" CTA
 * (⌘Enter / Ctrl+Enter shortcut included). Glows only when every column
 * has been verified.
 */
export default function BottomDock({
  verifiedCount,
  total,
  verifiedAll,
  onGenerate,
}: BottomDockProps) {
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Glow pulse on the CTA once all columns are verified.
  useEffect(() => {
    if (!verifiedAll || !ctaRef.current) return;
    const anim = glowPulse(ctaRef.current);
    return () => {
      anim.pause();
    };
  }, [verifiedAll]);

  // ⌘Enter / Ctrl+Enter generates the dashboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onGenerate();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onGenerate]);

  const remaining = total - verifiedCount;

  return (
    <div className="pointer-events-none sticky bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-outline-variant/50 bg-surface/95 py-3 pl-4 pr-3 shadow-reticle backdrop-blur">
        <span
          className={verifiedAll ? 'text-tertiary' : 'text-outline'}
          aria-hidden="true"
        >
          <CheckCircle2 size={22} />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            {verifiedCount} of {total} columns verified
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                verifiedAll ? 'animate-pulse bg-tertiary' : 'animate-pulse bg-primary'
              }`}
              aria-hidden="true"
            />
          </p>
          <p className="label-mono-xs mt-0.5 text-text-muted">
            {verifiedAll ? 'Dataset schema certified' : `${remaining} column${remaining === 1 ? '' : 's'} still need review`}
          </p>
        </div>

        <button
          type="button"
          className="ml-2 hidden rounded-lg border border-outline-variant/40 px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary sm:block"
        >
          Preset Templates
        </button>

        <button
          ref={ctaRef}
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 text-sm font-bold text-on-primary-container shadow-laser"
        >
          <Sparkles size={15} aria-hidden="true" />
          Generate Dashboard
          <kbd className="rounded border border-on-primary-container/30 bg-on-primary-container/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
            ⌘↵
          </kbd>
        </button>
      </div>
    </div>
  );
}