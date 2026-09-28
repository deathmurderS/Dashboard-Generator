import { create } from 'zustand';
import type { WidgetConfig, WidgetKind } from '@/types';

export const WIDGET_MAX_COLUMNS = 12;

/** Pixel height of one canvas row unit in the dashboard builder. */
export const ROW_HEIGHT = 44;

interface BuilderState {
  projectId: string;
  projectName: string;
  mode: 'edit' | 'view';
  widgets: WidgetConfig[];
  selectedId: string | null;
  past: WidgetConfig[][];
  future: WidgetConfig[][];
  saved: boolean;
  saving: boolean;
  setProjectName: (name: string) => void;
  setMode: (mode: 'edit' | 'view') => void;
  addWidget: (kind: WidgetKind, x: number, y: number, overrides?: Partial<WidgetConfig>) => WidgetConfig;
  updateWidget: (id: string, patch: Partial<WidgetConfig>) => void;
  removeWidget: (id: string) => void;
  selectWidget: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
  hydrate: (widgets: WidgetConfig[], projectName?: string, projectId?: string) => void;
}

let widgetCounter = 0;
function nextId(): string {
  widgetCounter += 1;
  return `widget-${Date.now().toString(36)}-${widgetCounter}`;
}

const KIND_DEFAULTS: Record<WidgetKind, Partial<WidgetConfig>> = {
  kpi: { title: 'KPI Telemetry', w: 3, h: 5, aggregation: 'count', delta: 12.4 },
  line: { title: 'Line Trend', w: 6, h: 7, xAxis: 'signup_date', yAxis: 'mrr_amount', aggregation: 'sum', smooth: true, pointLimit: 50 },
  bar: { title: 'Bar Chart', w: 6, h: 7, xAxis: 'plan', yAxis: 'monthly_spend', aggregation: 'avg', pointLimit: 12 },
  donut: { title: 'Share of Total', xAxis: 'region', yAxis: 'revenue', aggregation: 'sum', w: 4, h: 6 },
  area: { title: 'Cumulative Growth', xAxis: 'signup_date', yAxis: 'revenue', aggregation: 'sum', smooth: true, w: 6, h: 5 },
  geo: { title: 'Geographic Dispatch', xAxis: 'region', yAxis: 'active_users', aggregation: 'sum', w: 6, h: 6 },
  scatter: { title: 'Correlation Optics', xAxis: 'monthly_spend', yAxis: 'retention', w: 6, h: 6, pointLimit: 60 },
  heatmap: { title: 'Cohort Matrix', xAxis: 'week', yAxis: 'plan', w: 6, h: 6 },
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  projectId: 'demo-executive-summary',
  projectName: 'Executive Summary',
  mode: 'edit',
  widgets: [],
  selectedId: null,
  past: [],
  future: [],
  saved: true,
  saving: false,

  setProjectName: (name) => set({ projectName: name, saved: false }),
  setMode: (mode) => set({ mode }),
  setSaving: (saving) => set({ saving }),

  selectWidget: (id) => set({ selectedId: id }),

  addWidget: (kind, x, y, overrides) => {
    const id = nextId();
    const defaults = KIND_DEFAULTS[kind];
    const widget: WidgetConfig = {
      id,
      kind,
      title: defaults.title ?? '',
      x,
      y,
      w: defaults.w ?? 4,
      h: defaults.h ?? 6,
      aggregation: defaults.aggregation,
      xAxis: defaults.xAxis,
      yAxis: defaults.yAxis,
      pointLimit: defaults.pointLimit,
      smooth: defaults.smooth,
      delta: KindDefaults.delta(kind),
      data: sampleData[kind] as WidgetConfig['data'],
      ...overrides,
    };
    set((state) => ({
      past: [...state.past, state.widgets],
      future: [],
      widgets: [...state.widgets, widget],
      selectedId: id,
      saved: false,
    }));
    return widget;
  },

  updateWidget: (id, patch) =>
    set((state) => ({
      widgets: state.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      saved: false,
    })),

  removeWidget: (id) =>
    set((state) => ({
      past: [...state.past, state.widgets],
      future: [],
      widgets: state.widgets.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      saved: false,
    })),

  undo: () =>
    set((state) => {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        future: [state.widgets, ...state.future],
        widgets: previous,
        saved: false,
      };
    }),

  redo: () =>
    set((state) => {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        future: state.future.slice(1),
        past: [...state.past, state.widgets],
        widgets: next,
        saved: false,
      };
    }),

  markSaved: () => set({ saved: true }),
  hydrate: (widgets, projectName = 'Untitled dashboard', projectId = 'default') =>
    set({ widgets, projectName, projectId, past: [], future: [], selectedId: null, saved: false }),
}));

// Sample chart datasets so the builder canvas renders instantly with the
// four starter widgets even before any user data is connected.
const KindDefaults = {
  delta: (kind: WidgetKind) => (kind === 'kpi' ? 12.4 : undefined),
};

const sampleData: Record<WidgetKind, Record<string, unknown>[] | undefined> = {
  kpi: [{ label: 'Jan', value: 0 }],
  line: [
    { signup_date: 'Jan 03', mrr_amount: 41800 },
    { signup_date: 'Feb 03', mrr_amount: 45200 },
    { signup_date: 'Mar 03', mrr_amount: 43900 },
    { signup_date: 'Apr 03', mrr_amount: 49800 },
    { signup_date: 'May 03', mrr_amount: 54600 },
    { signup_date: 'Jun 03', mrr_amount: 58900 },
    { signup_date: 'Jul 03', mrr_amount: 62300 },
    { signup_date: 'Aug 03', mrr_amount: 58700 },
    { signup_date: 'Sep 03', mrr_amount: 68100 },
    { signup_date: 'Oct 03', mrr_amount: 73400 },
    { signup_date: 'Nov 03', mrr_amount: 79200 },
    { signup_date: 'Dec 03', mrr_amount: 86400 },
  ],
  bar: [
    { plan: 'Pro', monthly_spend: 129 },
    { plan: 'Business', monthly_spend: 499 },
    { plan: 'Scale', monthly_spend: 990 },
    { plan: 'Enterprise', monthly_spend: 2300 },
  ],
  donut: [
    { region: 'EMEA', revenue: 42 },
    { region: 'AMER', revenue: 38 },
    { region: 'APAC', revenue: 16 },
    { region: 'LATAM', revenue: 4 },
  ],
  area: [
    { signup_date: 'Q1', revenue: 120 },
    { signup_date: 'Q2', revenue: 240 },
    { signup_date: 'Q3', revenue: 420 },
    { signup_date: 'Q4', revenue: 690 },
  ],
  geo: [
    { region: 'North America', active_users: 12480 },
    { region: 'Europe', active_users: 9800 },
    { region: 'Asia Pacific', active_users: 7234 },
    { region: 'Latin America', active_users: 3480 },
  ],
  scatter: [
    { monthly_spend: 19, retention: 84 },
    { monthly_spend: 49, retention: 87 },
    { monthly_spend: 99, retention: 89 },
    { monthly_spend: 129, retention: 90 },
    { monthly_spend: 199, retention: 88 },
    { monthly_spend: 299, retention: 92 },
    { monthly_spend: 499, retention: 94 },
    { monthly_spend: 690, retention: 93 },
    { monthly_spend: 890, retention: 95 },
    { monthly_spend: 1200, retention: 96 },
    { monthly_spend: 1490, retention: 94 },
    { monthly_spend: 1890, retention: 97 },
  ],
  heatmap: [
    { week: 'W1', plan: 'Pro', value: 38 },
    { week: 'W1', plan: 'Business', value: 52 },
    { week: 'W1', plan: 'Enterprise', value: 71 },
    { week: 'W2', plan: 'Pro', value: 44 },
    { week: 'W2', plan: 'Business', value: 49 },
    { week: 'W2', plan: 'Enterprise', value: 76 },
    { week: 'W3', plan: 'Pro', value: 51 },
    { week: 'W3', plan: 'Business', value: 61 },
    { week: 'W3', plan: 'Enterprise', value: 69 },
    { week: 'W4', plan: 'Pro', value: 47 },
    { week: 'W4', plan: 'Business', value: 66 },
    { week: 'W4', plan: 'Enterprise', value: 82 },
    { week: 'W5', plan: 'Pro', value: 58 },
    { week: 'W5', plan: 'Business', value: 72 },
    { week: 'W5', plan: 'Enterprise', value: 88 },
    { week: 'W6', plan: 'Pro', value: 63 },
    { week: 'W6', plan: 'Business', value: 79 },
    { week: 'W6', plan: 'Enterprise', value: 91 },
  ],
};