'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Edge-of-viewport decorations for the landing page.
 * Visible only on screens wider than 1280px (xl) to fill the empty gutters
 * left and right of the content column. Purely decorative: fixed position,
 * pointer-events none, rendered in faint primary/20 tones.
 */

const TICKER_VALUES = [
  '48,210',
  '$1.24M',
  '99.98%',
  '0.42ms',
  '12,847',
  '4.2TB',
  '82.4%',
  '3,901',
  '56.7%',
  '24,650',
  '99.1%',
  '1,204',
  '7.3K',
  '0.982',
];

export default function SideDecor() {
  const tickerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: { pause: () => void }[] = [];

    // Left rail: endless vertical data stream (seamless -50% loop over the
    // duplicated value list).
    if (tickerRef.current) {
      anims.push(
        anime({
          targets: tickerRef.current,
          translateY: ['0%', '-50%'],
          duration: 26000,
          easing: 'linear',
          loop: true,
        })
      );
    }

    // Right rail: slow floating mini chart card.
    if (cardRef.current) {
      anims.push(
        anime({
          targets: cardRef.current,
          translateY: [-9, 9],
          duration: 5200,
          easing: 'easeInOutSine',
          direction: 'alternate',
          loop: true,
        })
      );
    }

    return () => {
      anims.forEach((a) => a.pause());
    };
  }, []);

  return (
    <>
      {/* Left — scrolling column of metrics */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-5 top-0 z-0 hidden h-screen select-none overflow-hidden xl:block"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
        }}
      >
        <div ref={tickerRef} className="flex flex-col items-start gap-7 will-change-transform">
          {[...TICKER_VALUES, ...TICKER_VALUES].map((value, i) => (
            <span
              key={`${value}-${i}`}
              className="code-metric flex items-center gap-2 text-[11px] tracking-widest text-primary/20"
            >
              <span className="h-1 w-1 rounded-full bg-primary/20" />
              {value}
            </span>
          ))}
        </div>
      </div>

      {/* Right — floating mini chart card */}
      <div
        aria-hidden
        className="pointer-events-none fixed right-6 top-1/3 z-0 hidden select-none xl:block"
      >
        <div
          ref={cardRef}
          className="w-44 rounded-lg border border-primary/20 bg-surface-low/40 p-3 shadow-panel backdrop-blur-sm will-change-transform"
        >
          <p className="label-mono-xs text-primary/20">ARR pacing</p>
          <p className="code-metric mt-1 text-lg font-semibold text-primary/20">$1.24M</p>
          <svg viewBox="0 0 160 48" className="mt-2 h-10 w-full" preserveAspectRatio="none">
            <path
              d="M0,40 L20,34 L40,36 L60,26 L80,28 L100,18 L120,14 L140,10 L160,6 L160,48 L0,48 Z"
              fill="currentColor"
              className="text-primary/10"
            />
            <path
              d="M0,40 L20,34 L40,36 L60,26 L80,28 L100,18 L120,14 L140,10 L160,6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-primary/20"
            />
          </svg>
          <div className="code-metric mt-2 flex items-center justify-between text-[10px] text-primary/20">
            <span>+12.4%</span>
            <span>Q3 · live</span>
          </div>
        </div>
      </div>
    </>
  );
}