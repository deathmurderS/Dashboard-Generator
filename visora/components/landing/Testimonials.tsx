'use client';

import { Quote, Star } from 'lucide-react';
import { useScrollReveal } from '@/lib/hooks';

const TESTIMONIALS = [
  {
    quote:
      'I used to lose every Monday wrestling CSV exports into slide decks. Now I drop the file in and the executive update builds itself.',
    name: 'Sarah Jenkins',
    role: 'VP of Marketing',
    initials: 'SJ',
  },
  {
    quote:
      'Our churn and ops numbers were stuck in spreadsheets for months. Visora gave us a live dashboard before the end of the week.',
    name: 'Marcus Vance',
    role: 'Head of Operations',
    initials: 'MV',
  },
  {
    quote:
      'My team stopped filing ad-hoc reporting tickets with data. They just open Visora, build what they need, and share it.',
    name: 'Aileen Frost',
    role: 'Founder, Cyclely',
    initials: 'AF',
  },
];

export default function Testimonials() {
  const { containerRef } = useScrollReveal();

  return (
    <section id="customers" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-mono text-secondary">Customer stories</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em] md:text-4xl">
            Built for the people who live in the data
          </h2>
        </div>

        <div ref={containerRef} className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              data-reveal
              className="flex flex-col justify-between rounded-xl border border-outline-variant/40 bg-surface-high/40 p-7"
            >
              <div>
                <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-on-surface/90">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>
              <figcaption className="mt-8 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-container/40 bg-primary-container/10 font-heading text-sm font-semibold text-primary">
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}