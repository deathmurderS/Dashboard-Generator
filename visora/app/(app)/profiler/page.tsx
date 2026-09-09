'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Database, Download, RefreshCcw, Sparkles, Zap } from 'lucide-react';
import type { ColumnProfile, DatasetMeta, SemanticType } from '@/types';
import ColumnRow from '@/components/profiler/ColumnRow';
import BottomDock from '@/components/profiler/BottomDock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDatasetStore } from '@/store/datasetStore';
import { analyzeDataset, recommendForColumn } from '@/lib/analyze';
import { slideInLeft } from '@/lib/anime';
import { cn, formatBytes, formatNumber, formatPercent } from '@/lib/utils';

// ─── Demo dataset (used when a visitor opens the Profiler directly) ─────────
function generateDemoRows(): Record<string, string | number | null>[] {
  const plans = ['Pro', 'Business', 'Scale', 'Enterprise'];
  const regions = ['EMEA', 'AMER', 'APAC', 'LATAM'];
  const statuses = ['active', 'active', 'active', 'churned', 'trial'];
  const rows: Record<string, string | number | null>[] = [];
  const start = Date.UTC(2025, 0, 1);
  for (let i = 0; i < 640; i++) {
    const plan = plans[i % plans.length];
    const signup = new Date(start + (i % 310) * 86400000).toISOString().slice(0, 10);
    rows.push({
      customer_id: 1000 + i,
      signup_date: signup,
      plan,
      monthly_spend: i % 7 === 0 ? null : 29 + (i % 12) * 37 + (i % 5) * 4.5,
      support_tickets: i % 11,
      region: regions[i % regions.length],
      status: statuses[i % statuses.length],
      mrr_amount: 49 + (i % 23) * 120 + i * 2.4,
      active_users: 10 + ((i * 7) % 900),
      churn_risk: Math.round((5 + ((i * 13) % 22)) * 10) / 10,
      nps_score: 20 + ((i * 3) % 60),
      revenue: 100 + ((i * 31) % 4000) * 1.75,
      campaign_id: `CAMP-${1000 + (i % 8) * 100}`,
      first_touch: regions[(i + 2) % regions.length],
    });
  }
  return rows;
}

function buildDemoDataset(): DatasetMeta {
  return analyzeDataset(generateDemoRows(), 'Q3_Customer_Churn.csv', 4_418_304);
}

const FILTER_PILLS: { key: 'all' | SemanticType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Numeric', label: 'Numeric' },
  { key: 'Date', label: 'Temporal' },
  { key: 'Category', label: 'Category' },
];

type SortKey = 'name' | 'type' | 'completeness' | 'distinct';

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tint = 'text-primary',
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="label-mono text-text-muted">{label}</p>
        <Icon size={15} className={tint} />
      </div>
      <p className={cn('code-metric mt-3 text-2xl font-semibold', tint)}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}

export default function ProfilerPage() {
  const router = useRouter();
  const stored = useDatasetStore((s) => s.dataset);
  const { setDataset, includeMap, toggleColumnIncluded } = useDatasetStore();
  const [dataset, setLocalDataset] = useState<DatasetMeta | null>(stored);
  const [pill, setPill] = useState<'all' | SemanticType>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [verifiedAll, setVerifiedAll] = useState(false);

  useEffect(() => {
    if (!stored) {
      const demo = buildDemoDataset();
      setLocalDataset(demo);
      setDataset(demo);
    } else {
      setLocalDataset(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  // Staggered slide-in for column rows.
  useEffect(() => {
    if (!tableRef.current) return;
    const targets = tableRef.current.querySelectorAll('tr[data-row]');
    if (!targets.length) return;
    const anim = slideInLeft(targets, { distance: 22, duration: 440 });
    return () => anim.pause();
  }, [dataset?.id, pill, sortKey, search]);

  // All columns verified → glow the Generate CTA.
  useEffect(() => {
    if (!dataset) return;
    const allVerified = dataset.columns.every((c) => includeMap[c.id] !== false);
    setVerifiedAll(allVerified);
  }, [dataset, includeMap]);

  // ⌘↵ / Ctrl+↵ jumps straight to the dashboard builder.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        router.push('/builder');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const columns = useMemo<ColumnProfile[]>(() => {
    if (!dataset) return [];
    let list = dataset.columns;
    if (pill !== 'all') list = list.filter((c) => c.type === pill);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'type') return a.type.localeCompare(b.type);
      if (sortKey === 'completeness') return b.completeness - a.completeness;
      return b.distinctCount - a.distinctCount;
    });
  }, [dataset, pill, search, sortKey]);

  if (!dataset) return null;

  const totalCells = dataset.rowCount * dataset.columnCount;
  const missingCells = dataset.columns.reduce((acc, c) => acc + c.nullCount, 0);
  const completeness = totalCells ? 1 - missingCells / totalCells : 1;
  const skews = dataset.columns.map((c) => c.skew ?? 0).filter(Boolean);
  const avgSkew = skews.length ? skews.reduce((a, b) => a + b, 0) / skews.length : 0;
  const verifiedCount = dataset.columns.filter((c) => includeMap[c.id] !== false).length;
  const anomalies = dataset.columns.filter((c) => c.completeness < 0.95);

  function exportMeta() {
    const blob = new Blob([JSON.stringify({ dataset, anomalies }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.replace(/\.[^.]+$/, '')}_meta.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function rescan() {
    const demo = buildDemoDataset();
    setDataset(demo);
    setLocalDataset(demo);
  }

  function selectAll() {
    dataset.columns.forEach((c) => {
      if (includeMap[c.id] === false) toggleColumnIncluded(c.id);
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 pb-32">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className="border-primary-container/40 bg-primary-container/10 text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                TELEMETRY PROBE ACTIVE
              </Badge>
              <span className="code-metric text-[11px] text-outline">
                SESSION #{dataset.id.replace(/-/g, '').slice(0, 6).toUpperCase()}
              </span>
              <Badge className="border-tertiary/40 bg-tertiary/10 text-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                LIVE INGESTION
              </Badge>
            </div>
            <h1 className="mt-3 font-heading text-2xl font-bold tracking-[-0.02em]">
              Data Profiling Report: <span className="text-primary">{dataset.name}</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {formatNumber(dataset.rowCount, 0)} rows · {dataset.columns.length} features ·{' '}
              {dataset.sizeLabel} parsed in-browser
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={rescan}>
              <RefreshCcw size={13} /> Re-scan Dataset
            </Button>
            <Button variant="outline" size="sm" onClick={exportMeta}>
              <Download size={13} /> Export Meta
            </Button>
          </div>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Activity} label="Columns" value={String(dataset.columns.length)} sub="semantic profile complete" />
        <MetricCard icon={Zap} label="Valid" value={formatPercent(completeness)} sub={`${formatNumber(missingCells, 0)} missing cells`} tint={completeness >= 0.95 ? 'text-tertiary' : 'text-error'} />
        <MetricCard icon={Sparkles} label="Distribution" value={avgSkew === 0 ? 'Normal' : avgSkew.toFixed(2)} sub={Math.abs(avgSkew) < 0.5 ? 'balanced columns' : 'needs attention'} tint="text-secondary" />
        <MetricCard icon={Database} label="Rows" value={formatNumber(dataset.rowCount, 0)} sub={`${(dataset.sizeBytes / dataset.rowCount / 1024).toFixed(1)} KB / row`} />
      </div>

      {/* ── Search + filter pills + sort ─────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-md bg-canvas-deep p-1">
          {FILTER_PILLS.map((f) => {
            const active = pill === f.key;
            const count =
              f.key === 'all'
                ? dataset.columns.length
                : dataset.columns.filter((c) => c.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setPill(f.key)}
                className={cn(
                  'rounded px-3 py-1.5 text-xs transition-colors',
                  active
                    ? 'bg-surface-high text-primary'
                    : 'text-text-muted hover:text-on-surface'
                )}
              >
                {f.label}
                <span className="code-metric ml-1.5 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search columns…"
          className="input-field w-52 text-xs"
        />

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="input-field w-44 text-xs"
          aria-label="Sort columns"
        >
          <option value="name">Sort by name</option>
          <option value="type">Sort by type</option>
          <option value="completeness">Sort by completeness</option>
          <option value="distinct">Sort by distinct count</option>
        </select>

        <button
          type="button"
          onClick={selectAll}
          className="ml-auto rounded-md border border-outline-variant/40 px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary"
        >
          Select All
        </button>
      </div>

      {/* ── Column inventory table ───────────────────────────────────── */}
      <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/30">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-surface-high">
              <tr className="label-mono-xs text-text-muted">
                <th className="px-4 py-2.5 text-left font-medium">Inc</th>
                <th className="px-4 py-2.5 text-left font-medium">Column Identifier</th>
                <th className="px-4 py-2.5 text-left font-medium">Semantic Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Completeness &amp; Nulls</th>
                <th className="px-4 py-2.5 text-left font-medium">Distinct Count</th>
                <th className="px-4 py-2.5 text-left font-medium">Distribution Profile</th>
                <th className="hidden px-4 py-2.5 text-left font-medium lg:table-cell">
                  Statistical Metrics
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Operations</th>
              </tr>
            </thead>
            <tbody ref={tableRef}>
              {columns.map((col) => (
                <ColumnRow
                  key={col.id}
                  col={col}
                  checked={includeMap[col.id] !== false}
                  onToggle={() => toggleColumnIncluded(col.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom insight panels ────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Quality anomalies */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="label-mono text-error">Quality Anomalies ({anomalies.length})</p>
            <span className="label-mono-xs rounded border border-error/40 bg-error/10 px-1.5 py-0.5 text-error">
              ACTIONABLE
            </span>
          </div>
          {anomalies.length === 0 ? (
            <p className="mt-3 text-sm text-tertiary">No quality issues found. Nice and clean.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {anomalies.slice(0, 4).map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
                  <span className="text-text-muted">
                    <span className="font-medium text-on-surface">{a.name}</span> has{' '}
                    {formatNumber(a.nullCount, 0)} missing values (
                    {formatPercent(1 - a.completeness)}). Suggested: fill with the median.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recommended visuals */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="label-mono text-secondary">Recommended Visuals</p>
            <span className="label-mono-xs rounded border border-secondary/40 bg-secondary/10 px-1.5 py-0.5 text-secondary">
              AI ENGINE
            </span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {dataset.columns.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-text-muted">{c.name}</span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-secondary/30 bg-secondary/5 px-1.5 py-0.5 text-[10px] text-secondary">
                  <Sparkles size={10} /> {recommendForColumn(c)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Memory & storage footprint */}
        <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="label-mono text-text-muted">Memory &amp; Storage Footprint</p>
            <span className="label-mono-xs rounded border border-tertiary/40 bg-tertiary/10 px-1.5 py-0.5 text-tertiary">
              OPTIMAL
            </span>
          </div>
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">In-memory dataset</span>
              <span className="code-metric text-on-surface">{dataset.sizeLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Estimated workspace</span>
              <span className="code-metric text-on-surface">
                {formatBytes(dataset.sizeBytes * 3)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Partition</span>
              <span className="code-metric text-tertiary">verified ✓</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-high">
              <div className="h-full w-[34%] rounded-full bg-gradient-to-r from-primary to-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky bottom dock ───────────────────────────────────────── */}
      <BottomDock
        verifiedCount={verifiedCount}
        total={dataset.columns.length}
        verifiedAll={verifiedAll}
        onGenerate={() => router.push('/builder')}
      />

      <p className="pb-6 pt-10 text-center text-[11px] text-outline">© 2026 Visora Inc.</p>
    </div>
  );
}