'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Columns3, Download, FileSpreadsheet, ListFilter, RefreshCcw, Search, X } from 'lucide-react';
import type { ColumnProfile, DatasetMeta, SemanticType } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatNumber } from '@/lib/utils';
import { slideInLeft } from '@/lib/anime';

const TYPE_STYLES: Record<SemanticType, string> = {
  Date: 'border-secondary/40 bg-secondary/10 text-secondary',
  Numeric: 'border-primary-container/40 bg-primary-container/10 text-primary',
  Category: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
};

const TYPE_LABEL: Record<SemanticType, string> = {
  Date: 'DATE',
  Numeric: 'NUMERIC',
  Category: 'CATEGORY',
};

export default function DataPreviewTable({
  dataset,
  onReset,
  onProceed,
}: {
  dataset: DatasetMeta;
  onReset: () => void;
  onProceed: () => void;
}) {
  const rowsRef = useRef<HTMLTableSectionElement>(null);
  const [search, setSearch] = useState('');
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);

  const columns = dataset.columns;
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.name)),
    [columns, hiddenCols]
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return dataset.previewRows;
    const q = search.trim().toLowerCase();
    return dataset.previewRows.filter((row) =>
      Object.entries(row).some(([k, v]) => {
        if (hiddenCols.has(k)) return false;
        return String(v ?? '').toLowerCase().includes(q);
      })
    );
  }, [dataset.previewRows, search, hiddenCols]);

  // Row stagger reveal after dataset loads.
  useEffect(() => {
    if (!rowsRef.current) return;
    const targets = rowsRef.current.querySelectorAll('tr[data-row]');
    if (!targets.length) return;
    const anim = slideInLeft(targets, { distance: 14, duration: 380 });
    return () => anim.pause();
  }, [dataset.id, search, hiddenCols.size]);

  const toggleColumn = useCallback((name: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  function exportCsv() {
    const header = visibleColumns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(',');
    const lines = dataset.previewRows.map((row) =>
      visibleColumns
        .map((c) => `"${String(row[c.name] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.replace(/\.[^.]+$/, '')}_preview.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* File meta header */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-container/40 bg-primary-container/10 text-primary">
          <FileSpreadsheet size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{dataset.name}</p>
          <p className="text-[11px] text-text-muted">{dataset.sizeLabel} parsed</p>
        </div>
        <Badge variant="success" className="ml-2">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> Ready
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RefreshCcw size={13} /> Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X size={13} /> Remove
          </Button>
        </div>
      </div>

      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold">Data Preview</h3>
        <span className="label-mono-xs rounded-full border border-outline-variant/40 px-2.5 py-1 text-text-muted">
          Showing first {Math.min(15, dataset.previewRows.length)} sample rows
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64 max-w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter rows…"
            className="input-field w-full pl-8 text-xs"
          />
        </div>

        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setShowColPicker((s) => !s)}>
            <Columns3 size={13} /> Columns
          </Button>
          {showColPicker && (
            <div className="absolute left-0 top-10 z-30 w-56 rounded-lg border border-outline-variant/40 bg-surface-high p-2 shadow-panel">
              {columns.map((col) => (
                <label
                  key={col.name}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-surface-highest"
                >
                  <Checkbox
                    checked={!hiddenCols.has(col.name)}
                    onCheckedChange={() => toggleColumn(col.name)}
                  />
                  <span className="truncate">{col.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          <ListFilter size={13} />
          Showing {visibleColumns.length} of {columns.length} columns
        </div>
      </div>

      {/* Preview table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant/30">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-surface-high">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.name}
                    className="whitespace-nowrap border-b border-outline-variant/30 px-4 py-2.5 text-left"
                  >
                    <div className="text-[11px] font-semibold text-on-surface">{col.name}</div>
                    <span
                      className={cn(
                        'label-mono-xs mt-1 inline-block rounded px-1.5 py-0.5',
                        TYPE_STYLES[col.type]
                      )}
                    >
                      {TYPE_LABEL[col.type]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={rowsRef}>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-4 py-10 text-center text-text-muted"
                  >
                    No rows match your filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr
                    key={i}
                    data-row
                    className={cn(
                      'border-b border-outline-variant/15',
                      i % 2 === 0 ? 'bg-canvas-deep/40' : 'bg-surface/40',
                      'hover:bg-surface-high/60'
                    )}
                  >
                    {visibleColumns.map((col) => {
                      const raw = row[col.name];
                      const el = raw ?? null;
                      return (
                        <td
                          key={col.name}
                          className={cn(
                            'whitespace-nowrap px-4 py-2 text-on-surface/90',
                            col.type === 'Numeric' && 'code-metric'
                          )}
                        >
                          {el === null ? (
                            <span className="text-outline">—</span>
                          ) : (
                            String(el)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <span>
          First {filteredRows.length} of {formatNumber(dataset.rowCount)} rows
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="iconSm" disabled>
            ←
          </Button>
          <span className="code-metric">Page 1 / 1</span>
          <Button variant="ghost" size="iconSm" disabled>
            →
          </Button>
        </div>
      </div>

      {/* Table actions footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download size={13} /> Export preview
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RefreshCcw size={13} /> Upload another file
          </Button>
        </div>
        <Button size="sm" onClick={onProceed}>
          Proceed to Profiler <ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}