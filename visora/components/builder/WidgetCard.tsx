'use client';

import { useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { GripVertical, Trash2, TrendingUp } from 'lucide-react';
import anime from 'animejs';
import type { WidgetConfig } from '@/types';
import { cn, COLOR_SPECTRUM } from '@/lib/utils';

const TOOLTIP_STYLE = {
  backgroundColor: '#171f33',
  border: '1px solid rgba(148,163,184,0.25)',
  borderRadius: 8,
  fontSize: 12,
  color: '#dae2fd',
};

const SPECTRUM = COLOR_SPECTRUM;

function ChartBody({ widget }: { widget: WidgetConfig }) {
  const data = widget.data ?? [];
  const nameKey = widget.xAxis ?? 'name';

  if (widget.kind === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fill: '#869397', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#869397', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(76,215,246,0.4)' }} />
          <Line
            type="monotone"
            dataKey={widget.yAxis ?? 'value'}
            stroke={widget.color ?? '#4cd7f6'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (widget.kind === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fill: '#869397', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#869397', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area
            type="monotone"
            dataKey={widget.yAxis ?? 'value'}
            stroke={widget.color ?? '#4edea3'}
            fill="rgba(78,222,163,0.18)"
            strokeWidth={2}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (widget.kind === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fill: '#869397', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#869397', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey={widget.yAxis ?? 'value'} fill={widget.color ?? '#06b6d4'} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (widget.kind === 'donut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Pie
            data={data}
            dataKey={widget.yAxis ?? 'value'}
            nameKey={nameKey}
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={3}
            isAnimationActive={true}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SPECTRUM[i % SPECTRUM.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (widget.kind === 'geo') {
    return (
      <div className="h-full overflow-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {data.slice(0, 8).map((row, i) => (
              <tr key={i} className="border-b border-outline-variant/15">
                <td className="py-1.5 pr-2 text-text-muted">{String(row[nameKey] ?? '—')}</td>
                <td className="code-metric py-1.5 text-right text-primary">
                  {String(row[widget.yAxis ?? ''] ?? '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (widget.kind === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" />
          <XAxis
            dataKey={nameKey}
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: '#869397', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey={widget.yAxis ?? 'value'}
            type="number"
            domain={['auto', 'auto']}
            tick={{ fill: '#869397', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={widget.color ?? '#ddb7ff'} isAnimationActive={true} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (widget.kind === 'heatmap') {
    const rowKey = widget.yAxis ?? 'plan';
    const rows: string[] = [];
    const cols: string[] = [];
    const cells = new Map<string, number>();
    let max = 0;
    data.forEach((row) => {
      const r = String(row[rowKey] ?? '—');
      const c = String(row[nameKey] ?? '—');
      const v = Number(row.value ?? 0);
      if (!rows.includes(r)) rows.push(r);
      if (!cols.includes(c)) cols.push(c);
      cells.set(`${r}|${c}`, v);
      if (v > max) max = v;
    });
    return (
      <div className="flex h-full flex-col justify-center gap-1 overflow-hidden">
        {rows.map((r) => (
          <div key={r} className="flex items-center gap-1">
            <span className="w-16 shrink-0 truncate text-right text-[10px] text-text-muted">
              {r}
            </span>
            <div className="flex flex-1 gap-1">
              {cols.map((c) => {
                const v = cells.get(`${r}|${c}`) ?? 0;
                const intensity = max > 0 ? v / max : 0;
                return (
                  <div
                    key={c}
                    title={`${r} · ${c}: ${v}`}
                    className="flex h-6 flex-1 items-center justify-center rounded-[3px] text-[9px] font-semibold"
                    style={{
                      backgroundColor: `rgba(6, 182, 212, ${(0.08 + intensity * 0.72).toFixed(2)})`,
                      color: intensity > 0.55 ? '#003640' : '#bcc9cd',
                    }}
                  >
                    {v}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-1 pl-[4.5rem] pt-0.5">
          {cols.map((c) => (
            <span key={c} className="flex-1 text-center text-[9px] text-outline">
              {c}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // kpi
  const value = data.length
    ? Number(data[data.length - 1]?.[widget.yAxis ?? ''] ?? data[0]?.[0] ?? 0)
    : 0;
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-end gap-2">
        <span className="code-metric text-4xl font-semibold text-primary">
          {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
        <span className="mb-1 inline-flex items-center gap-1 rounded border border-tertiary/30 bg-tertiary/5 px-1.5 py-0.5 text-[10px] text-tertiary">
          <TrendingUp size={10} /> +{widget.delta ?? 0}%
        </span>
      </div>
      <p className="mt-2 text-[11px] text-text-muted">
        {widget.aggregation?.toUpperCase() ?? 'SUM'} · {widget.yAxis ?? 'metric'}
      </p>
    </div>
  );
}

export interface WidgetCardProps {
  widget: WidgetConfig;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  /** dnd-kit listeners + attributes attached to the drag handle */
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
  /** Run the scale + fade pop-in when first mounted (freshly dropped widgets). */
  animateIn?: boolean;
}

export default function WidgetCard({
  widget,
  selected = false,
  onSelect,
  onRemove,
  dragHandleProps,
  isDragging = false,
  animateIn = false,
}: WidgetCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animateIn || !cardRef.current) return;
    const anim = anime({
      targets: cardRef.current,
      scale: [0.92, 1],
      opacity: [0, 1],
      duration: 420,
      easing: 'easeOutExpo',
    });
    return () => anim.pause();
  }, [animateIn]);

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-lg border bg-surface shadow-panel transition-colors',
        selected
          ? 'border-primary/70 shadow-reticle'
          : 'border-outline-variant/40 hover:border-outline-variant/70',
        isDragging && 'opacity-60'
      )}
    >
      <header className="flex items-center gap-1.5 border-b border-outline-variant/25 px-2.5 py-1.5">
        <span
          {...(dragHandleProps ?? {})}
          aria-roledescription="Drag handle"
          className={cn(
            'rounded p-0.5 text-outline/60',
            dragHandleProps
              ? 'cursor-grab touch-none active:cursor-grabbing hover:bg-surface-high hover:text-primary'
              : 'cursor-default'
          )}
        >
          <GripVertical size={12} />
        </span>
        <span className="flex-1 truncate text-[11px] font-semibold text-on-surface">
          {widget.title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove ${widget.title}`}
            className="rounded p-0.5 text-outline/50 opacity-0 transition-opacity hover:bg-error-container/20 hover:text-error focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 px-2.5 py-2">
        <ChartBody widget={widget} />
      </div>
    </div>
  );
}