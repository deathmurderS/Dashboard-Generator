'use client';

import { useEffect, useRef } from 'react';
import { Eye, MoreHorizontal, Sparkles } from 'lucide-react';
import type { ColumnProfile } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatNumber, formatPercent } from '@/lib/utils';
import { drawPath } from '@/lib/anime';

const TYPE_META: Record<ColumnProfile['type'], { label: string; classes: string }> = {
  Date: { label: 'DATE', classes: 'border-secondary/40 bg-secondary/10 text-secondary' },
  Numeric: { label: 'NUMERIC', classes: 'border-primary-container/40 bg-primary-container/10 text-primary' },
  Category: { label: 'CATEGORY', classes: 'border-tertiary/40 bg-tertiary/10 text-tertiary' },
};

function linePath(spark: number[]): string {
  if (!spark.length) return '';
  const w = 96;
  const h = 28;
  const max = Math.max(...spark, 1);
  return spark
    .map((v, i) => {
      const x = (i / (spark.length - 1)) * w;
      const y = h - (v / max) * (h - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function Sparkline({ spark, color = '#4cd7f6' }: { spark: number[]; color?: string }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!pathRef.current) return;
    const anim = drawPath(pathRef.current);
    return () => anim.pause();
  }, [spark]);

  return (
    <svg viewBox="0 0 96 28" className="h-7 w-24" preserveAspectRatio="none" aria-hidden>
      <path
        ref={pathRef}
        d={linePath(spark)}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ColumnRow({
  col,
  checked,
  onToggle,
  onInspect,
}: {
  col: ColumnProfile;
  checked: boolean;
  onToggle: () => void;
  onInspect?: (col: ColumnProfile) => void;
}) {
  const meta = TYPE_META[col.type];
  const warn = col.completeness < 0.95;

  return (
    <tr data-row className="group border-b border-outline-variant/15 transition-colors hover:bg-surface-high/40">
      <td className="px-4 py-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Include ${col.name}`} />
      </td>

      <td className="px-4 py-3">
        <div className="text-[13px] font-medium text-on-surface">{col.name}</div>
        {col.label && <div className="mt-0.5 text-[11px] text-text-muted">{col.label}</div>}
      </td>

      <td className="px-4 py-3">
        <span className={cn('label-mono-xs inline-block rounded px-1.5 py-0.5', meta.classes)}>
          {meta.label}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-highest">
            <div
              className={cn('h-full rounded-full', warn ? 'bg-error' : 'bg-tertiary')}
              style={{ width: `${Math.round(col.completeness * 100)}%` }}
            />
          </div>
          <span className={cn('code-metric text-xs', warn ? 'text-error' : 'text-tertiary')}>
            {formatPercent(col.completeness)}
          </span>
        </div>
      </td>

      <td className="code-metric px-4 py-3 text-xs text-text-muted">
        {formatNumber(col.distinctCount, 0)}
      </td>

      <td className="px-4 py-3">
        <Sparkline
          spark={col.spark}
          color={col.type === 'Date' ? '#ddb7ff' : col.type === 'Numeric' ? '#4cd7f6' : '#4edea3'}
        />
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        {col.type === 'Numeric' ? (
          <div className="space-y-0.5">
            <div className="flex gap-2 text-[11px]">
              <span className="text-outline">min</span>
              <span className="code-metric text-text-muted">{formatNumber(Number(col.min ?? 0))}</span>
              <span className="ml-2 text-outline">max</span>
              <span className="code-metric text-text-muted">{formatNumber(Number(col.max ?? 0))}</span>
            </div>
            <div className="flex gap-2 text-[11px]">
              <span className="text-outline">mean</span>
              <span className="code-metric text-text-muted">{formatNumber(Number(col.mean ?? 0))}</span>
              <span className="ml-2 text-outline">median</span>
              <span className="code-metric text-text-muted">{formatNumber(Number(col.median ?? 0))}</span>
            </div>
            <div className="flex gap-2 text-[11px]">
              <span className="text-outline">entropy</span>
              <span className="code-metric text-text-muted">
                {col.entropy === null ? '—' : col.entropy.toFixed(2)}
              </span>
              <span className="ml-2 text-outline">skew</span>
              <span className="code-metric text-text-muted">
                {col.skew === null ? '—' : col.skew.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 text-[11px] text-text-muted">
            <div className="flex gap-2">
              <span className="text-outline">unique</span>
              <span className="code-metric">{formatNumber(col.distinctCount, 0)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-outline">missing</span>
              <span className="code-metric">{formatNumber(col.nullCount, 0)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-outline">entropy</span>
              <span className="code-metric">
                {col.entropy === null ? '—' : col.entropy.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          <button
            title="Inspect column"
            onClick={() => onInspect?.(col)}
            className="rounded p-1.5 text-text-muted hover:bg-surface-highest hover:text-primary"
          >
            <Eye size={14} />
          </button>
          <button
            title="AI recommendation"
            onClick={() => onInspect?.(col)}
            className="rounded p-1.5 text-text-muted hover:bg-surface-highest hover:text-secondary"
          >
            <Sparkles size={14} />
          </button>
          <button className="rounded p-1.5 text-text-muted hover:bg-surface-highest hover:text-on-surface">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}