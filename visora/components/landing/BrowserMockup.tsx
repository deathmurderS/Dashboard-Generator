'use client';

import { useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { countUp } from '@/lib/anime';

const KPIS = [
  {
    label: 'ARR Growth',
    value: 4.2,
    format: (v: number) => `$${v.toFixed(1)}M`,
    color: 'text-primary',
    delta: '+18.4% YoY',
  },
  {
    label: 'Customer Retention',
    value: 96.4,
    format: (v: number) => `${v.toFixed(1)}%`,
    color: 'text-tertiary',
    delta: '+2.1 pts',
  },
  {
    label: 'Average Deal Size',
    value: 34850,
    format: (v: number) => `$${Math.round(v).toLocaleString('en-US')}`,
    color: 'text-secondary',
    delta: '+6.8%',
  },
];

const SEGMENTS = [
  { name: 'Enterprise SaaS', revenue: '$1.86M', growth: '+22.4%' },
  { name: 'Mid-Market', revenue: '$1.24M', growth: '+14.1%' },
  { name: 'SMB', revenue: '$0.71M', growth: '+9.6%' },
  { name: 'EMEA Expansion', revenue: '$0.39M', growth: '+31.2%' },
];

const TIER_BARS = [
  { label: 'Enterprise', pct: 56, color: '#06b6d4' },
  { label: 'Mid-Market', pct: 27, color: '#ddb7ff' },
  { label: 'Growth', pct: 17, color: '#4edea3' },
];

const DONUT_RADIUS = 34;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function KpiCard({ kpi, index }: { kpi: (typeof KPIS)[number]; index: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (ref.current) {
        countUp(ref.current, kpi.value, { duration: 1500, format: kpi.format });
      }
    }, 800 + index * 220);
    return () => window.clearTimeout(timer);
  }, [kpi, index]);

  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface p-4">
      <p className="label-mono-xs text-text-muted">{kpi.label}</p>
      <p className={`code-metric mt-1 text-2xl font-semibold ${kpi.color}`}>
        <span ref={ref}>{kpi.format(0)}</span>
      </p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-tertiary">
        <TrendingUp size={11} /> {kpi.delta}
      </p>
    </div>
  );
}

export default function BrowserMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-low shadow-panel">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 bg-surface px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-error/70" />
        <span className="h-3 w-3 rounded-full bg-secondary/60" />
        <span className="h-3 w-3 rounded-full bg-tertiary" />
        <div className="ml-4 flex-1 rounded-md bg-canvas-deep px-3 py-1 text-xs text-text-muted">
          visora.com/app/executive-summary
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tertiary/30 bg-tertiary/5 px-2.5 py-1 text-[10px] font-semibold text-tertiary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
          Live Synced
        </span>
      </div>

      <div className="grid-reticle space-y-3 p-4">
        {/* KPI cards */}
        <div className="grid gap-3 md:grid-cols-3">
          {KPIS.map((kpi, i) => (
            <KpiCard key={kpi.label} kpi={kpi} index={i} />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-outline-variant/30 bg-surface p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <p className="label-mono-xs text-text-muted">Monthly Sales Growth</p>
              <div className="flex items-center gap-3 text-[10px] text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-primary" /> New revenue
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-3 rounded-full bg-secondary" /> Renewals
                </span>
              </div>
            </div>
            <svg viewBox="0 0 400 120" className="mt-3 h-32 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mockArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 60, 90].map((y) => (
                <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#3d494c" strokeOpacity="0.4" strokeDasharray="4 6" />
              ))}
              <path
                d="M0,100 L40,92 L80,86 L120,74 L160,78 L200,62 L240,54 L280,44 L320,30 L360,22 L400,10 L400,120 L0,120 Z"
                fill="url(#mockArea)"
              />
              <path
                d="M0,100 L40,92 L80,86 L120,74 L160,78 L200,62 L240,54 L280,44 L320,30 L360,22 L400,10"
                fill="none"
                stroke="#4cd7f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0,108 L40,104 L80,98 L120,96 L160,88 L200,86 L240,76 L280,72 L320,60 L360,52 L400,44"
                fill="none"
                stroke="#ddb7ff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="rounded-lg border border-outline-variant/30 bg-surface p-4">
            <p className="label-mono-xs text-text-muted">Tier Breakdown</p>
            <div className="mt-2 flex items-center gap-4">
              <svg viewBox="0 0 90 90" className="h-20 w-20 shrink-0">
                {(() => {
                  let acc = 0;
                  return TIER_BARS.map((tier) => {
                    const dash = (tier.pct / 100) * DONUT_CIRCUMFERENCE;
                    const offset = -(acc / 100) * DONUT_CIRCUMFERENCE;
                    acc += tier.pct;
                    return (
                      <circle
                        key={tier.label}
                        cx="45"
                        cy="45"
                        r={DONUT_RADIUS}
                        fill="none"
                        stroke={tier.color}
                        strokeWidth="12"
                        strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE - dash}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 45 45)"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="flex-1 space-y-2">
                {TIER_BARS.map((tier) => (
                  <div key={tier.label}>
                    <div className="flex justify-between text-[10px] text-text-muted">
                      <span>{tier.label}</span>
                      <span className="code-metric">{tier.pct}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-canvas-deep">
                      <div className="h-full rounded-full" style={{ width: `${tier.pct}%`, backgroundColor: tier.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Segments table */}
        <div className="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface">
          <div className="flex items-center justify-between border-b border-outline-variant/25 px-4 py-2.5">
            <p className="label-mono-xs text-text-muted">Top Performing Segments</p>
            <span className="rounded border border-outline-variant/40 px-2 py-0.5 text-[10px] text-text-muted">Q3 2026</span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="label-mono-xs px-4 py-2 font-medium text-outline">Segment</th>
                <th className="label-mono-xs px-4 py-2 font-medium text-outline">Revenue</th>
                <th className="label-mono-xs px-4 py-2 text-right font-medium text-outline">Growth</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTS.map((segment) => (
                <tr key={segment.name} className="border-t border-outline-variant/20">
                  <td className="px-4 py-2 text-on-surface">{segment.name}</td>
                  <td className="code-metric px-4 py-2 text-text-muted">{segment.revenue}</td>
                  <td className="code-metric px-4 py-2 text-right text-tertiary">{segment.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}