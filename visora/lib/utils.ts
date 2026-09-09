import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a byte count into a human friendly label ("4.2 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Format a number with thousands separators and optional decimals. */
export function formatNumber(value: number, maxFractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits });
}

export function formatPercent(ratio: number, maxFractionDigits = 1): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—';
  return `${(ratio * 100).toFixed(maxFractionDigits)}%`;
}

/** Relative "x ago" label from an ISO date string. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

/** Deterministic pseudo-random seed so mock sparklines look stable across renders. */
export function seededValue(seed: number): number {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

export function makeSpark(seed: number, points = 16, base = 40, variance = 30): number[] {
  return Array.from({ length: points }, (_, i) =>
    Math.round(base + (seededValue(seed + i) - 0.5) * variance * 2)
  );
}

/** Brand color spectrum offered in the builder Style & Optics panel. */
export const COLOR_SPECTRUM = [
  '#4cd7f6', // primary teal
  '#06b6d4', // primary container
  '#ddb7ff', // secondary purple
  '#4edea3', // tertiary green
  '#ffb4ab', // error rose
  '#869397', // outline grey
];

/** Produce a lightly-varied copy of a widget series (Recalculate Series action). */
export function recalculateRows(
  data: Record<string, string | number | null>[],
  valueKey: string,
  tick: number
): Record<string, string | number | null>[] {
  if (!valueKey) return data;
  return data.map((row, i) => {
    const current = Number(row[valueKey]);
    if (!Number.isFinite(current) || current === 0) return row;
    const factor = 1 + (seededValue(i * 7 + tick * 13) - 0.5) * 0.24;
    return { ...row, [valueKey]: Math.round(current * factor * 100) / 100 };
  });
}