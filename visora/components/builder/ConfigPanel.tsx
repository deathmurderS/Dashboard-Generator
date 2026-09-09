'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RefreshCw, Settings2, SlidersHorizontal, Unlink } from 'lucide-react';
import anime from 'animejs';
import type { Aggregation, WidgetConfig, WidgetKind } from '@/types';
import { WIDGET_MAX_COLUMNS, useBuilderStore } from '@/store/dashboardStore';
import { useDatasetStore } from '@/store/datasetStore';
import { cn, COLOR_SPECTRUM, recalculateRows } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type Tab = 'data' | 'style';

const KIND_LABEL: Record<WidgetKind, string> = {
  kpi: 'KPI Telemetry',
  line: 'Standard Chart · Line',
  bar: 'Standard Chart · Bar',
  donut: 'Standard Chart · Donut',
  area: 'Standard Chart · Area',
  geo: 'Advanced Optics · Geo Table',
  scatter: 'Advanced Optics · Scatter',
  heatmap: 'Advanced Optics · Cohort Matrix',
};

const AGGREGATIONS: Aggregation[] = ['sum', 'avg', 'count', 'median'];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label-mono-xs mb-1.5">{label}</p>
      {children}
    </div>
  );
}

export default function ConfigPanel() {
  const widget = useBuilderStore((s) => s.widgets.find((w) => w.id === s.selectedId) ?? null);
  const updateWidget = useBuilderStore((s) => s.updateWidget);
  const removeWidget = useBuilderStore((s) => s.removeWidget);
  const dataset = useDatasetStore((s) => s.dataset);
  const [tab, setTab] = useState<Tab>('data');
  const panelRef = useRef<HTMLElement>(null);
  const selectedId = widget?.id ?? null;

  // Slide in from the right every time a different widget gets selected.
  useEffect(() => {
    if (!panelRef.current || !selectedId) return;
    const anim = anime({
      targets: panelRef.current,
      translateX: [80, 0],
      opacity: [0, 1],
      duration: 420,
      easing: 'easeOutExpo',
    });
    return () => anim.pause();
  }, [selectedId]);

  const columnOptions = useMemo(() => {
    if (dataset) {
      return dataset.columns.map((c) => ({ value: c.name, label: `${c.name} · ${c.type}` }));
    }
    if (widget?.data?.length) {
      return Object.keys(widget.data[0]).map((k) => ({ value: k, label: k }));
    }
    return [];
  }, [dataset, widget]);

  if (!widget) return null;

  const set = (patch: Partial<WidgetConfig>) => updateWidget(widget.id, patch);
  const isTrend = widget.kind === 'line' || widget.kind === 'area';

  return (
    <aside
      ref={panelRef}
      className="flex w-80 shrink-0 flex-col border-l border-outline-variant/30 bg-canvas-deep/50"
    >
      <header className="border-b border-outline-variant/25 px-4 py-3">
        <p className="label-mono-xs text-primary">
          Selected Element — {KIND_LABEL[widget.kind]}
        </p>
        <p className="mt-1 truncate font-heading text-sm font-bold text-on-surface">
          {widget.title}
        </p>
        <p className="text-[11px] text-text-muted">{KIND_LABEL[widget.kind]}</p>
      </header>

      <div className="border-b border-outline-variant/25 px-4 py-3">
        <label className="label-mono-xs" htmlFor="widget-title">
          Display name
        </label>
        <Input
          id="widget-title"
          className="mt-1.5 h-8 text-xs"
          value={widget.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/25 px-4 pt-2.5">
        {(['data', 'style'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'relative px-3 pb-2 text-xs font-semibold transition-colors',
              tab === t ? 'text-primary' : 'text-text-muted hover:text-on-surface'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t === 'data' ? <SlidersHorizontal size={12} /> : <Settings2 size={12} />}
              {t === 'data' ? 'Data Mapping' : 'Style & Optics'}
            </span>
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {tab === 'data' ? (
          <>
            <Field label="X-axis dimension">
              <Select value={widget.xAxis ?? ''} onChange={(e) => set({ xAxis: e.target.value })}>
                <option value="">Not set</option>
                {columnOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Y-axis metric">
              <Select value={widget.yAxis ?? ''} onChange={(e) => set({ yAxis: e.target.value })}>
                <option value="">Not set</option>
                {columnOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Aggregation method">
              <div className="grid grid-cols-4 gap-1">
                {AGGREGATIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => set({ aggregation: a })}
                    aria-pressed={widget.aggregation === a}
                    className={cn(
                      'rounded-md border py-1.5 text-[11px] font-semibold transition-colors',
                      widget.aggregation === a
                        ? 'border-primary-container bg-primary-container/15 text-primary'
                        : 'border-outline-variant/40 text-text-muted hover:border-primary-container/50 hover:text-on-surface'
                    )}
                  >
                    {a === 'count' ? 'CNT' : a === 'median' ? 'MED' : a.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Group by category">
              <Select
                value={widget.groupBy ?? ''}
                onChange={(e) => set({ groupBy: e.target.value || undefined })}
              >
                <option value="">None</option>
                {columnOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sort order">
              <Select
                value={widget.sort ?? 'none'}
                onChange={(e) => set({ sort: e.target.value as WidgetConfig['sort'] })}
              >
                <option value="none">Keep source order</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Select>
            </Field>
            <Field label="Point limit (nodes)">
              <Input
                type="number"
                min={5}
                max={500}
                className="h-8 text-xs"
                value={widget.pointLimit ?? 50}
                onChange={(e) => set({ pointLimit: Number(e.target.value) || undefined })}
              />
            </Field>
            {isTrend && (
              <div className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface/60 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-on-surface">Trend smoothing</p>
                  <p className="text-[10px] text-text-muted">Soften jagged movement</p>
                </div>
                <Switch checked={!!widget.smooth} onCheckedChange={(v) => set({ smooth: v })} />
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Color spectrum">
              <div className="flex flex-wrap gap-2">
                {COLOR_SPECTRUM.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use color ${c}`}
                    onClick={() => set({ color: c })}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                      widget.color === c ? 'border-on-surface' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label={`Width — ${widget.w} of ${WIDGET_MAX_COLUMNS} columns`}>
              <input
                type="range"
                min={1}
                max={WIDGET_MAX_COLUMNS}
                value={widget.w}
                onChange={(e) => set({ w: Number(e.target.value) })}
                className="w-full accent-primary-container"
              />
            </Field>
            <Field label={`Height — ${widget.h} rows`}>
              <input
                type="range"
                min={3}
                max={12}
                value={widget.h}
                onChange={(e) => set({ h: Number(e.target.value) })}
                className="w-full accent-primary-container"
              />
            </Field>
            <div className="rounded-lg border border-outline-variant/30 bg-surface/60 px-3 py-2.5 text-[11px] leading-relaxed text-text-muted">
              Colors and sizing apply instantly. Fine-grained data choices live in the Data
              Mapping tab.
            </div>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="space-y-2 border-t border-outline-variant/25 p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (!widget.data || !widget.yAxis) return;
            set({ data: recalculateRows(widget.data, widget.yAxis, Date.now() % 100000) });
          }}
        >
          <RefreshCw size={13} /> RECALCULATE SERIES
        </Button>
        <Button variant="destructive" className="w-full" onClick={() => removeWidget(widget.id)}>
          <Unlink size={13} /> DETACH WIDGET
        </Button>
      </div>
    </aside>
  );
}