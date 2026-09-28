'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { breathe, wordReveal } from '@/lib/anime';
import BrowserMockup from '@/components/landing/BrowserMockup';

const HERO_WORDS = ['Turn', 'your', 'data', 'into'];

export default function Hero() {
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const orbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anims: ReturnType<typeof wordReveal>[] = [];

    if (wordsRef.current.length) {
      anims.push(wordReveal(wordsRef.current));
    }

    if (orbsRef.current) {
      anims.push(breathe(orbsRef.current.querySelectorAll('.hero-orb')));
    }

    return () => {
      anims.forEach((a) => a.pause());
    };
  }, []);

  function setWordRef(el: HTMLSpanElement | null, i: number) {
    if (el) wordsRef.current[i] = el;
  }

  return (
    <section className="relative grid-reticle overflow-hidden pb-24 pt-32 md:pt-40">
      <div ref={orbsRef} aria-hidden className="pointer-events-none absolute inset-0">
        <div className="hero-orb absolute -left-32 top-24 h-96 w-96 rounded-full bg-primary-container/10 blur-[120px]" />
        <div className="hero-orb absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-secondary-container/10 blur-[110px]" />
        <div className="hero-orb absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-tertiary-container/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-8 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="label-mono mb-6 inline-flex items-center gap-2 rounded-full border border-primary-container/40 bg-primary-container/10 px-4 py-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Instant BI for modern teams
          </div>

          <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-[-0.03em] md:text-6xl">
            {HERO_WORDS.map((word, i) => (
              <span key={word} ref={(el) => setWordRef(el, i)} className="mr-[0.28em] inline-block text-gradient-soft">
                {word}
              </span>
            ))}
            <span className="inline-block text-gradient-soft">dashboards</span>{' '}
            <span className="inline-block text-gradient-teal">instantly</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-text-muted md:text-lg">
            Drop in a CSV or Excel file, and Visora turns it into polished,
            live executive dashboards. No SQL. No data team required.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary-container px-6 py-3 font-semibold text-on-primary-container shadow-laser transition-all hover:shadow-laser-strong active:scale-[0.98]"
            >
              Get Started Free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/60 px-6 py-3 font-medium text-on-surface transition-colors hover:border-primary-container/70 hover:text-primary"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Works with Excel & CSV
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Free 14-day trial
            </span>
          </div>
        </div>

        {/* Browser mockup */}
        <div className="mx-auto mt-16 max-w-6xl">
          <BrowserMockup />
        </div>
      </div>
    </section>
  );
}
