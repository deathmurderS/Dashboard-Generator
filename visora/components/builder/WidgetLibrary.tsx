'use client';

import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Activity,
  BarChart3,
  Crosshair,
  Gauge,
  Globe,
  LayoutGrid,
  GripVertical,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Search,
  TrendingUp,
} from 'lucide-react';
import type { WidgetKind } from '@/types';
import { useBuilderStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface WidgetDef {
  kind: WidgetKind;
  label: string;
  hint: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

const CATEGORIES: { label: string; items: WidgetDef[] }[] = [
  {
    label: 'STANDARD CHARTS',
    items: [
      { kind: 'bar', label: 'Bar Chart', hint: 'Compare values side by side', icon: BarChart3 },
      { kind: 'line', label: 'Line Trend', hint: 'Track movement over time', icon: LineChartIcon },
      { kind: 'area', label: 'Area Stream', hint: 'Cumulative build-up', icon: Activity },
      { kind: 'donut', label: 'Donut / Ratio', hint: 'Share of the whole', icon: PieChartIcon },
    ],
  },
  {
    label: 'KPI TELEMETRY',
    items: [
      { kind: 'kpi', label: 'Single Metric Value', hint: 'One headline number', icon: Gauge },
      { kind: 'kpi', label: 'Radial Gauge', hint: 'Progress toward a goal', icon: Activity },
      { kind: 'kpi', label: 'Cohort Delta', hint: 'Change versus last period', icon: TrendingUp },
    ],
  },
  {
    label: 'ADVANCED OPTICS',
    items: [
      { kind: 'heatmap', label: 'Matrix Heatmap', hint: 'Intensity across groups', icon: LayoutGrid },
      { kind: 'scatter', label: 'Scatter Dispersion', hint: 'How two measures relate', icon: Crosshair },
      { kind: 'geo', label: 'Pivot Grid', hint: 'Breakdown by region or row', icon: Globe },
    ],
  },
];

function LibraryItem({ def }: { def: WidgetDef }) {
  const addWidget = useBuilderStore((s) => s.addWidget);
  const widgets = useBuilderStore((s) => s.widgets);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${def.label}`,
    data: { source: 'library', kind: def.kind },
  });

  function handleAdd() {
    // Click-to-add: place the widget below everything currently on the canvas.
    const bottom = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    addWidget(def.kind, 0, bottom);
  }

  const Icon = def.icon;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={handleAdd}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex w-full cursor-grab touch-none items-center gap-2.5 rounded-lg border border-outline-variant/30 bg-surface/70 px-2.5 py-2 text-left transition-colors hover:border-primary-container/60 hover:bg-surface-high active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-outline-variant/40 bg-canvas-deep text-primary transition-colors group-hover:border-primary-container/60">
        <Icon size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-on-surface">{def.label}</span>
        <span className="block truncate text-[10px] text-text-muted">{def.hint}</span>
      </span>
      <GripVertical
        size={12}
        className="shrink-0 cursor-grab text-outline/60 transition-colors group-hover:text-primary"
      />
    </button>
  );
}

export default function WidgetLibrary() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-outline-variant/30 bg-canvas-deep/50">
      <div className="border-b border-outline-variant/25 p-3">
        <div className="flex items-center justify-between">
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-on-surface">
            Library
          </p>
          <span className="rounded border border-outline-variant/40 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-outline">
            {CATEGORIES.reduce((n, cat) => n + cat.items.length, 0)} TYPES
          </span>
        </div>
        <div className="relative mt-2.5">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search widgets…"
            aria-label="Search widgets"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        {filtered.map((cat) => (
          <section key={cat.label}>
            <p className="label-mono-xs text-outline">{cat.label}</p>
            <div className="mt-2 space-y-1.5">
              {cat.items.map((def) => (
                <LibraryItem key={def.label} def={def} />
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="px-1 text-xs text-text-muted">No widgets match “{query}”.</p>
        )}
      </div>

      <div className="border-t border-outline-variant/25 p-3 text-[11px] leading-relaxed text-text-muted">
        Drag a widget onto the canvas — or click it to drop it in below the grid.
      </div>
    </aside>
  );
}