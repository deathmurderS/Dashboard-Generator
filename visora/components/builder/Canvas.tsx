'use client';

import { useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Minus, MousePointerClick, Plus } from 'lucide-react';
import type { WidgetConfig } from '@/types';
import { ROW_HEIGHT, WIDGET_MAX_COLUMNS, useBuilderStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
import WidgetCard from '@/components/builder/WidgetCard';

function DraggableWidget({ widget, editMode }: { widget: WidgetConfig; editMode: boolean }) {
  const selectedId = useBuilderStore((s) => s.selectedId);
  const selectWidget = useBuilderStore((s) => s.selectWidget);
  const removeWidget = useBuilderStore((s) => s.removeWidget);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    data: { source: 'canvas', id: widget.id },
    disabled: !editMode,
  });

  const handleProps = editMode
    ? ({ ...listeners, ...attributes } as unknown as HTMLAttributes<HTMLElement>)
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `${widget.x + 1} / span ${widget.w}`,
        gridRow: `${widget.y + 1} / span ${widget.h}`,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 30 : undefined,
      }}
      className="p-1.5"
    >
      <WidgetCard
        widget={widget}
        selected={selectedId === widget.id}
        onSelect={() => selectWidget(widget.id)}
        onRemove={editMode ? () => removeWidget(widget.id) : undefined}
        dragHandleProps={handleProps}
        isDragging={isDragging}
        animateIn
      />
    </div>
  );
}

export default function Canvas({ editMode }: { editMode: boolean }) {
  const widgets = useBuilderStore((s) => s.widgets);
  const [zoom, setZoom] = useState(100);
  const [savedAt, setSavedAt] = useState('--:--');

  // Stamp the "last auto-saved" time once on mount (client-only to avoid hydration drift).
  useEffect(() => {
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-grid',
    data: { source: 'canvas-area' },
  });

  const rows = Math.max(10, ...widgets.map((w) => w.y + w.h)) + 2;

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* HUD strip */}
      <div className="flex items-center justify-between border-b border-outline-variant/25 bg-canvas-deep/40 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3 text-[11px] text-text-muted">
          <span className="label-mono-xs text-primary">Grid Reticle</span>
          <span className="code-metric shrink-0">{WIDGET_MAX_COLUMNS}-col fluid</span>
          <span className="hidden text-outline/60 sm:inline">·</span>
          <span className="code-metric hidden shrink-0 sm:inline">Gutter: 16px</span>
          <span className="hidden text-outline/60 sm:inline">·</span>
          <span className="code-metric shrink-0">Cards pinned: {widgets.length}/16</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
            className="rounded-md border border-outline-variant/40 p-1.5 text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary"
          >
            <Minus size={12} />
          </button>
          <span className="code-metric w-10 text-center text-[11px] text-on-surface">{zoom}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(150, z + 25))}
            className="rounded-md border border-outline-variant/40 p-1.5 text-text-muted transition-colors hover:border-primary-container/60 hover:text-primary"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Scrollable zoomable grid */}
      <div className={cn('flex-1 overflow-auto p-4', isOver && 'bg-primary-container/5')}>
        <div
          ref={setNodeRef}
          className={cn(
            'grid-reticle rounded-xl border border-outline-variant/30 bg-canvas-deep/40',
            isOver && 'border-primary/60'
          )}
          style={{
            width: `${10000 / zoom}%`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: '0 0',
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${WIDGET_MAX_COLUMNS}, minmax(0, 1fr))`,
              gridAutoRows: `${ROW_HEIGHT}px`,
              minHeight: rows * ROW_HEIGHT,
            }}
          >
            {widgets.map((w) => (
              <DraggableWidget key={w.id} widget={w} editMode={editMode} />
            ))}
            {widgets.length === 0 && (
              <div
                style={{ gridColumn: '1 / -1' }}
                className="flex h-56 flex-col items-center justify-center gap-2 text-text-muted"
              >
                <MousePointerClick size={20} className="text-primary" />
                <p className="text-sm font-medium">Your canvas is clear</p>
                <p className="text-xs">Drag a widget in from the library to begin building.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Canvas status footer */}
      <div className="flex items-center justify-between border-t border-outline-variant/25 bg-canvas-deep/40 px-4 py-2">
        <span className="label-mono-xs text-outline">Optical Reticle</span>
        <span className="code-metric text-[11px] text-text-muted">Last auto-saved {savedAt}</span>
      </div>
    </section>
  );
}