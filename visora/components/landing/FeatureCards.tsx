'use client';

import { UploadCloud, ScanSearch, LayoutDashboard } from 'lucide-react';
import { useScrollReveal } from '@/lib/hooks';

const STEPS = [
  {
    icon: UploadCloud,
    step: '01',
    title: 'Upload your file',
    description:
      'Drag in a CSV or Excel file. Visora handles the parsing, dirty values, and duplicate headers automatically.',
    badge: 'CSV & XLSX supported',
  },
  {
    icon: ScanSearch,
    step: '02',
    title: 'We analyze it automatically',
    description:
      'Our engine detects column types, flags missing values, and computes the trends that matter for your business.',
    badge: 'Automatic type detection',
  },
  {
    icon: LayoutDashboard,
    step: '03',
    title: 'Your dashboard is ready',
    description:
      'Walk away with a polished, shareable dashboard — charts, KPI cards, and executive summaries included.',
    badge: 'Share as link or PDF',
  },
];

export default function FeatureCards() {
  const { containerRef } = useScrollReveal();

  return (
    <section id="how-it-works" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-mono text-primary">How it works</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em] md:text-4xl">
            From raw file to ready dashboard in three steps
          </h2>
          <p className="mt-4 text-text-muted">
            No training videos. No 200-page manuals. Just three steps between
            you and a dashboard your stakeholders actually open.
          </p>
        </div>

        <div
          ref={containerRef}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {STEPS.map((step) => (
            <div
              key={step.step}
              data-reveal
              className="group relative overflow-hidden rounded-xl border border-outline-variant/40 bg-surface p-7 transition-colors hover:border-primary-container/50"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-container/5 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary-container/40 bg-primary-container/10 text-primary shadow-laser">
                  <step.icon size={20} />
                </span>
                <span className="code-metric text-4xl font-semibold text-outline-variant/60">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-6 font-heading text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {step.description}
              </p>
              <div className="mt-6 border-t border-outline-variant/25 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-canvas-deep/60 px-3 py-1 text-[11px] font-medium text-text-muted">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {step.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}