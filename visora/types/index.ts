// ─── Visora domain types ─────────────────────────────────────────────────────

export type SemanticType = 'Date' | 'Numeric' | 'Category';

export interface ColumnProfile {
  id: string;
  name: string;
  type: SemanticType;
  include: boolean;
  /** 0..1 ratio of non-empty cells */
  completeness: number;
  distinctCount: number;
  nullCount: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  median?: number | null;
  entropy?: number | null;
  skew?: number | null;
  /** value distribution used for sparklines (12 bins) */
  spark: number[];
  label?: string;
}

export interface DatasetMeta {
  id?: string;
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  rowCount: number;
  columnCount: number;
  typeCounts: Record<SemanticType, number>;
  columns: ColumnProfile[];
  previewRows: Record<string, string | number | null>[];
  source: 'duckdb' | 'analyzer';
}

export type WidgetKind =
  | 'kpi'
  | 'line'
  | 'bar'
  | 'donut'
  | 'area'
  | 'geo'
  | 'scatter'
  | 'heatmap';

export type Aggregation = 'sum' | 'avg' | 'count' | 'median';

export interface WidgetConfig {
  id: string;
  kind: WidgetKind;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  xAxis?: string;
  yAxis?: string;
  aggregation?: Aggregation;
  groupBy?: string;
  sort?: 'asc' | 'desc' | 'none';
  pointLimit?: number;
  smooth?: boolean;
  color?: string;
  data?: Record<string, string | number | null>[];
  delta?: number;
}

export interface ProjectStatus {
  value: 'production' | 'draft' | 'executive' | 'experimental';
  label: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus['value'];
  badgeLabel: 'Live Sync' | 'Draft' | 'Archived';
  datasetName: string;
  lastEdited: string;
  spark: number[];
  collaborators: string[];
  /** Accent color of the card's top border. */
  accent?: 'teal' | 'purple' | 'gray';
  /** Thumbnail visual variant shown on the card. */
  visual?: 'sparkline' | 'kpi' | 'heatmap' | 'donut';
  /** Headline number for KPI-style thumbnails. */
  kpiValue?: string;
  /** Who edited the project last. */
  author?: string;
  /** Optional qualifier shown beside the status badge (e.g. "Realtime"). */
  badgeHint?: string;
}

export interface ProjectFilter {
  key: 'all' | 'production' | 'draft' | 'executive' | 'experimental';
  label: string;
  count: number;
}

export interface StorageUsage {
  usedGb: number;
  totalGb: number;
}

export interface ColumnStat {
  name: string;
  type: SemanticType;
  counts: Record<string, number>;
  completeness: number;
  nullCount: number;
  distinct: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  median?: number | null;
  entropy: number | null;
  skew: number | null;
  spark: number[];
  recommendation: string;
  recommendedVisual?: string;
}

export interface MetricCard {
  key: string;
  label: string;
  value: React.ReactNode | number;
  sub?: string;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'error';
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  workspace_name: string;
}

// ─── Server-side database rows ───────────────────────────────────────────────

export interface DatasetRow {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  row_count: number;
  column_count: number;
  column_types: Record<string, SemanticType>;
  schema_meta: Record<string, unknown>;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  dataset_id: string | null;
  name: string;
  status: string;
  widgets: unknown;
  created_at: string;
  updated_at: string;
}