/**
 * In-browser column type inference & dataset analysis.
 *
 * TypeScript port of the old repo's backend detector.py + frontend
 * UploadPreview parsing logic. It samples up to 200 non-empty values per
 * column, applies a 90% match threshold (Numeric → Date → Category), and
 * computes the stats shown across the Datasets and Profiler pages:
 * completeness, distinct count, min/max/mean/median, entropy, skew, and a
 * 12-bin distribution sparkline.
 */

import type { ColumnProfile, DatasetMeta, SemanticType } from '@/types';
import { formatBytes } from '@/lib/utils';

const SAMPLE_SIZE = 200;
const MATCH_THRESHOLD = 0.9;
const FLAT_DELIMITERS = /[|;]\s?/;

function sampleNonEmpty(values: (string | number | null | undefined)[]): (string | number)[] {
  const cleaned = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  return cleaned.slice(0, SAMPLE_SIZE) as (string | number)[];
}

function isNumeric(sample: (string | number)[]): boolean {
  if (sample.length === 0) return false;
  let matched = 0;
  for (const v of sample) {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '').replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(n)) matched += 1;
  }
  return matched / sample.length >= MATCH_THRESHOLD;
}

function isDate(sample: (string | number)[]): boolean {
  if (sample.length === 0) return false;
  // Guard: purely numeric columns should not be treated as epoch dates.
  if (isNumeric(sample)) return false;
  let matched = 0;
  for (const v of sample) {
    const d = new Date(String(v).replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) matched += 1;
  }
  return matched / sample.length >= MATCH_THRESHOLD;
}

export function inferType(values: (string | number | null | undefined)[]): SemanticType {
  const sample = sampleNonEmpty(values);
  if (sample.length === 0) return 'Category';
  if (isNumeric(sample)) return 'Numeric';
  if (isDate(sample)) return 'Date';
  return 'Category';
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function entropyOf<T>(values: T[]): number | null {
  if (values.length < 2) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const total = values.length;
  let e = 0;
  for (const c of counts.values()) {
    const p = c / total;
    e -= p * Math.log2(p);
  }
  return e;
}

/** 12-bin distribution histogram for numeric-ish sequences. */
function buildSpark(values: (string | number | null | undefined)[]): number[] {
  const nums = values.map(toNumber).filter((n): n is number => n !== null);
  const bins = 12;
  if (nums.length < 2) return Array(bins).fill(0);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const counts = Array(bins).fill(0);
  for (const n of nums) {
    const idx = Math.min(bins - 1, Math.floor(((n - min) / range) * bins));
    counts[idx] += 1;
  }
  const peak = Math.max(...counts, 1);
  return counts.map((c) => Math.round((c / peak) * 100));
}

export function profileColumn(name: string, values: (string | number | null | undefined)[]): ColumnProfile {
  const type = inferType(values);
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  const completeness = values.length === 0 ? 0 : nonEmpty.length / values.length;
  const nullCount = values.length - nonEmpty.length;

  const nums = nonEmpty.map(toNumber).filter((n): n is number => n !== null).sort((a, b) => a - b);
  const distinct = new Set(nonEmpty.map((v) => String(v).trim().toLowerCase())).size;

  let label: string | undefined;
  if (/date|tanggal|time|created|signup|day|month|year/i.test(name)) label = 'Time dimension';
  if (/revenue|mrr|amount|spend|price|cost|qty|count|score|rate|pct|avg|mean/i.test(name)) label = 'Business metric';
  if (/plan|region|status|name|category|country|customer|source|channel/i.test(name)) label = 'Dimension';

  let skew: number | null = null;
  if (nums.length >= 5) {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const median = medianOf(nums);
    const std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length) || 1;
    skew = (3 * (mean - median)) / std;
  }

  return {
    id: `col-${name}`,
    name,
    type,
    include: true,
    completeness,
    distinctCount: distinct,
    nullCount,
    min: nums.length ? nums[0] : null,
    max: nums.length ? nums[nums.length - 1] : null,
    mean: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
    median: nums.length ? medianOf(nums) : null,
    entropy: entropyOf(nonEmpty.map((v) => String(v).trim().toLowerCase())),
    skew,
    spark: buildSpark(values),
    label,
  };
}

/** Analyze a parsed tabular dataset (array of header → cell maps). */
export function analyzeDataset(
  rows: Record<string, string | number | null>[],
  fileName: string,
  sizeBytes: number
): DatasetMeta {
  if (!rows.length) {
    throw new Error('The file does not contain any data rows.');
  }
  const columns = Object.keys(rows[0] ?? {}).filter((c) => c.trim() !== '');
  const profiles = columns.map((col) =>
    profileColumn(col, rows.map((r) => r[col] ?? null))
  );

  const typeCounts: Record<SemanticType, number> = { Date: 0, Numeric: 0, Category: 0 };
  profiles.forEach((p) => (typeCounts[p.type] += 1));

  return {
    name: fileName,
    sizeBytes,
    sizeLabel: formatBytes(sizeBytes),
    rowCount: rows.length,
    columnCount: columns.length,
    typeCounts,
    columns: profiles,
    previewRows: rows.slice(0, 15),
    source: 'analyzer',
  };
}

/**
 * Split a multi-value categorical cell ("A|B") into its parts. Mirrors the
 * old backend's MULTI_VALUE_DELIMITERS heuristic used by chart generation.
 */
export function splitMultiValue(v: string): string[] | null {
  if (!FLAT_DELIMITERS.test(v)) return null;
  return v
    .split(FLAT_DELIMITERS)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Basic chart recommendation by semantic shape — ported from charts.py logic. */
export function recommendForColumn(col: ColumnProfile): string {
  if (col.type === 'Date') return 'Line trend';
  if (col.type === 'Numeric') {
    if (col.distinctCount > 250) return 'Histogram';
    return 'KPI + Sparkline';
  }
  if (col.distinctCount <= 10) return 'Donut / Bar';
  return 'Bar (top categories)';
}