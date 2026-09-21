'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Check,
  Download,
  Eye,
  Filter,
  FolderOpen,
  Loader2,
  Pencil,
  Redo2,
  Save,
  Undo2,
  X,
} from 'lucide-react';
import type { WidgetConfig, WidgetKind } from '@/types';
import { ROW_HEIGHT, WIDGET_MAX_COLUMNS, useBuilderStore } from '@/store/dashboardStore';
import { useDatasetStore } from '@/store/datasetStore';
import { cn } from '@/lib/utils';
import { glowPulse, spinAndCheck } from '@/lib/anime';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import WidgetLibrary from '@/components/builder/WidgetLibrary';
import Canvas from '@/components/builder/Canvas';
import ConfigPanel from '@/components/builder/ConfigPanel';
import WidgetCard from '@/components/builder/WidgetCard';

/** Starter widgets laid out on a fresh canvas (KPI, trend, bars, geo table). */
const SEED: { kind: WidgetKind; x: number; y: number; overrides?: Partial<WidgetConfig> }[] = [
  {
    kind: 'kpi',
    x: 0,
    y: 0,
    overrides: { title: 'ARR Growth vs Target', w: 4, h: 8, delta: 18.4 },
  },
  {
    kind: 'line',
    x: 4,
    y: 0,
    overrides: { title: 'Monthly Churn Rate vs Retention Cohort', w: 8, h: 8 },
  },
  {
    kind: 'bar',
    x: 0,
    y: 8,
    overrides: { title: 'Revenue by Customer Tier', w: 6, h: 7, aggregation: 'sum' },
  },
  {
    kind: 'geo',
    x: 6,
    y: 8,
    overrides: { title: 'Geographic Churn Dispersion', w: 6, h: 7 },
  },
];

interface FilterChip {
  id: number;
  column: string;
  value: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function BuilderPage() {
  const projectName = useBuilderStore((s) => s.projectName);
  const setProjectName = useBuilderStore((s) => s.setProjectName);
  const mode = useBuilderStore((s) => s.mode);
  const setMode = useBuilderStore((s) => s.setMode);
  const widgets = useBuilderStore((s) => s.widgets);
  const addWidget = useBuilderStore((s) => s.addWidget);
  const updateWidget = useBuilderStore((s) => s.updateWidget);
  const selectWidget = useBuilderStore((s) => s.selectWidget);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const canUndo = useBuilderStore((s) => s.past.length > 0);
  const canRedo = useBuilderStore((s) => s.future.length > 0);
  const saved = useBuilderStore((s) => s.saved);
  const saving = useBuilderStore((s) => s.saving);
  const setSaving = useBuilderStore((s) => s.setSaving);
  const markSaved = useBuilderStore((s) => s.markSaved);
  const dataset = useDatasetStore((s) => s.dataset);

  const [activeDrag, setActiveDrag] = useState<{
    source: 'library' | 'canvas';
    kind?: WidgetKind;
    widget?: WidgetConfig;
  } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const saveIconRef = useRef<HTMLSpanElement>(null);
  const seededRef = useRef(false);
  const filterIdRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const isEdit = mode === 'edit';

  // Lay down the four starter widgets the first time the studio opens.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (useBuilderStore.getState().widgets.length === 0) {
      SEED.forEach(({ kind, x, y, overrides }) => addWidget(kind, x, y, overrides));
      selectWidget(null);
    }
  }, [addWidget, selectWidget]);

  // Glow pulse on the save button while there are unsaved changes.
  useEffect(() => {
    if (saved || !saveBtnRef.current) return;
    const anim = glowPulse(saveBtnRef.current);
    return () => {
      anim.pause();
    };
  }, [saved]);

  // ⌘S / Ctrl+S saves the dashboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleSave() {
    if (saving) return;
    setSaving(true);
    spinAndCheck(saveIconRef.current, () => {
      markSaved();
      setSaving(false);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1600);
    });
  }

  function handleExport() {
    const payload = { project: projectName, filters, widgets };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.visora.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.source === 'canvas') {
      const widget = useBuilderStore.getState().widgets.find((w) => w.id === data.id);
      setActiveDrag({ source: 'canvas', widget });
    } else if (data?.source === 'library') {
      setActiveDrag({ source: 'library', kind: data.kind });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, delta, over, activatorEvent } = event;
    if (!over) return;
    const data = active.data.current;

    // Dropping a brand-new widget from the library onto the canvas.
    if (data?.source === 'library') {
      if (over.data.current?.source !== 'canvas-area') return;
      const rect = over.rect;
      const pointer = activatorEvent as PointerEvent | null;
      if (!pointer || typeof pointer.clientX !== 'number') {
        addWidget(data.kind, 0, 0);
        return;
      }
      const colWidth = rect.width / WIDGET_MAX_COLUMNS;
      const dropX = pointer.clientX + delta.x;
      const dropY = pointer.clientY + delta.y;
      const x = clamp(Math.floor((dropX - rect.left) / colWidth), 0, WIDGET_MAX_COLUMNS - 3);
      const y = Math.max(0, Math.floor((dropY - rect.top) / ROW_HEIGHT));
      addWidget(data.kind, x, y);
      return;
    }

    // Moving an existing widget around the grid.
    if (data?.source === 'canvas') {
      const widget = useBuilderStore.getState().widgets.find((w) => w.id === data.id);
      if (!widget) return;
      const colWidth = over.rect.width / WIDGET_MAX_COLUMNS;
      const x = clamp(
        widget.x + Math.round(delta.x / colWidth),
        0,
        WIDGET_MAX_COLUMNS - widget.w
      );
      const y = Math.max(0, widget.y + Math.round(delta.y / ROW_HEIGHT));
      if (x !== widget.x || y !== widget.y) updateWidget(widget.id, { x, y });
    }
  }

  function addFilter() {
    if (!filterColumn || !filterValue.trim()) return;
    filterIdRef.current += 1;
    setFilters((list) => [
      ...list,
      { id: filterIdRef.current, column: filterColumn, value: filterValue.trim() },
    ]);
    setFilterValue('');
    setFilterOpen(false);
  }

  const filterColumns = dataset
    ? dataset.columns.map((c) => c.name)
    : widgets[0]?.data?.length
      ? Object.keys(widgets[0].data[0])
      : [];

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-[620px] flex-col">
      <DndContext
        sensors={sensors}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        {/* Top sub-bar */}
        <div className="relative flex items-center justify-between gap-3 border-b border-outline-variant/30 bg-canvas-deep/40 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              aria-label="Project name"
              className="w-44 rounded-md border border-transparent bg-transparent px-2 py-1 font-heading text-sm font-bold text-on-surface outline-none transition-colors hover:border-outline-variant/40 focus:border-primary-container/60"
            />
            {saved ? (
              <Badge variant="success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
                Live Synced
              </Badge>
            ) : (
              <Badge variant="muted">Unsaved changes</Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Edit / View mode toggle */}
            <div className="mr-1 flex rounded-lg border border-outline-variant/40 p-0.5">
              {(
                [
                  { key: 'edit', icon: Pencil, label: 'Edit' },
                  { key: 'view', icon: Eye, label: 'View' },
                ] as const
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={mode === key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    mode === key
                      ? 'bg-surface-high text-primary'
                      : 'text-text-muted hover:text-on-surface'
                  )}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
              className="rounded-md border border-outline-variant/40 p-2 text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary disabled:opacity-40"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
              className="rounded-md border border-outline-variant/40 p-2 text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary disabled:opacity-40"
            >
              <Redo2 size={14} />
            </button>

            <button
              type="button"
              aria-label="Open project"
              className="rounded-md border border-outline-variant/40 p-2 text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary"
            >
              <FolderOpen size={14} />
            </button>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-outline-variant/40 px-3 text-xs font-semibold text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary"
            >
              <Filter size={13} /> Add Filter
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-outline-variant/40 px-3 text-xs font-semibold text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary"
            >
              <Download size={13} /> Export
            </button>

            <button
              ref={saveBtnRef}
              type="button"
              onClick={handleSave}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary-container px-4 text-sm font-semibold text-on-primary-container shadow-laser"
            >
              <span ref={saveIconRef} className="inline-flex">
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : justSaved ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
              </span>
              {justSaved ? 'Saved' : 'SAVE DASHBOARD'}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-outline-variant/40 bg-surface p-3 shadow-panel">
                <p className="label-mono-xs mb-2">Add a filter</p>
                <Select
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                  className="mb-2"
                >
                  <option value="">Pick a column…</option>
                  {filterColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="Must contain…"
                  aria-label="Filter value"
                  className="input-field mb-3 h-8 text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-text-muted hover:text-on-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addFilter}
                    className="rounded-md bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/25 bg-canvas-deep/20 px-4 py-2">
            <span className="label-mono-xs text-outline">Filters</span>
            {filters.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-container/40 bg-primary-container/10 py-0.5 pl-2.5 pr-1 text-[11px] text-primary"
              >
                {f.column}: {f.value}
                <button
                  type="button"
                  aria-label={`Remove filter ${f.column}`}
                  onClick={() => setFilters((list) => list.filter((x) => x.id !== f.id))}
                  className="rounded-full p-0.5 hover:bg-primary-container/20"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 3-panel workspace */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {isEdit && <WidgetLibrary />}
          <Canvas editMode={isEdit} />
          {isEdit && <ConfigPanel />}
        </div>

        <footer className="border-t border-outline-variant/30 px-4 py-2 text-center text-[11px] text-text-muted">
          © 2026 Visora Inc.
        </footer>

        <DragOverlay dropAnimation={{ duration: 220, easing: 'ease' }}>
          {activeDrag ? (
            <div
              className="pointer-events-none rotate-1 rounded-lg shadow-reticle"
              style={{
                width: activeDrag.widget
                  ? (activeDrag.widget.w / WIDGET_MAX_COLUMNS) * 100 + '%'
                  : 260,
                minWidth: 200,
              }}
            >
              {activeDrag.widget ? (
                <div style={{ height: activeDrag.widget.h * ROW_HEIGHT }}>
                  <WidgetCard widget={activeDrag.widget} />
                </div>
              ) : (
                <div className="rounded-lg border border-primary/60 bg-surface px-4 py-6 text-center text-xs font-semibold text-primary">
                  Drop to place widget
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}