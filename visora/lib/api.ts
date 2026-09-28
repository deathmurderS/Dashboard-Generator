/**
 * Visora API integration layer.
 *
 * In production on Vercel, requests use relative paths (/api/...) directly.
 * For local standalone development with external FastAPI server,
 * NEXT_PUBLIC_API_URL can be set in .env.local (e.g. http://localhost:8000).
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

function getEndpoint(path: string): string {
  if (!API_BASE) {
    return path.startsWith('/api') ? path : `/api${path}`;
  }
  // When hitting an external standalone backend like http://localhost:8000
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** One column as produced by the profiler / accepted by the recommender. */
export interface ApiColumn {
  name: string;
  description?: string;
  semantic_type: 'numeric' | 'date' | 'category' | 'text';
  completeness: number;
  missing_count: number;
  distinct_count: number;
  distribution: number[];
  stats: Record<string, number | string>;
}

export interface ProfilerAnomaly {
  column: string;
  type: 'warning' | 'info';
  message: string;
  suggestion: string;
}

export interface ProfilerResult {
  filename: string;
  row_count: number;
  column_count: number;
  completeness_overall: number;
  columns: ApiColumn[];
  quality_anomalies: ProfilerAnomaly[];
}

export interface ChartRecommendation {
  chart_type: string;
  title: string;
  x_axis: string | null;
  y_axis: string | null;
  fit_score: number;
}

/** POST /api/profiler/analyze — upload a CSV/XLSX file for deep profiling. */
export async function analyzeFile(file: File): Promise<ProfilerResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(getEndpoint('/profiler/analyze'), {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .catch(() => ({ detail: 'The profiling service could not read this file.' }));
    throw new Error(detail.detail ?? 'The profiling service could not read this file.');
  }
  return res.json();
}

/** POST /api/recommender/suggest — chart blueprints for a profiled schema. */
export async function getRecommendations(
  columns: ApiColumn[],
  rowCount = 0
): Promise<ChartRecommendation[]> {
  const res = await fetch(getEndpoint('/recommender/suggest'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columns, row_count: rowCount }),
  });
  if (!res.ok) {
    throw new Error('The recommendation service could not process this schema.');
  }
  const data: { recommendations: ChartRecommendation[] } = await res.json();
  return data.recommendations;
}

/** GET /api/health — service heartbeat. */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(getEndpoint('/health'), { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
