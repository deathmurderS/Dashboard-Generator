'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ArrowRight, Loader2 } from 'lucide-react';
import DropZone from '@/components/datasets/DropZone';
import DataPreviewTable from '@/components/datasets/DataPreviewTable';
import { Button } from '@/components/ui/button';
import { useDatasetStore } from '@/store/datasetStore';
import { analyzeDataset } from '@/lib/analyze';
import { loadCsvText } from '@/lib/duckdb';
import { countUp } from '@/lib/anime';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { DatasetMeta, SemanticType } from '@/types';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const TYPE_BADGE: Record<SemanticType, string> = {
  Date: 'border-secondary/40 bg-secondary/10 text-secondary',
  Numeric: 'border-primary-container/40 bg-primary-container/10 text-primary',
  Category: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
};

/** Demo file so the "State 2: Loaded" toggle can showcase the loaded UI instantly. */
const DEMO_CSV = `customer_id,signup_date,plan,monthly_spend_usd,support_tickets,region,status
CUS-1001,2025-07-14,Enterprise,1249.00,2,North America,Active
CUS-1002,2025-07-18,Pro,499.00,0,EMEA,Active
CUS-1003,2025-08-02,Pro,499.00,5,APAC,Churn Risk
CUS-1004,2025-08-09,Basic,49.00,1,North America,Active
CUS-1005,2025-08-21,Enterprise,1249.00,3,EMEA,Dormant
CUS-1006,2025-09-03,Basic,49.00,0,APAC,Active
CUS-1007,2025-09-11,Pro,499.00,2,North America,Churn Risk
CUS-1008,2025-09-19,Team,899.00,1,EMEA,Active
CUS-1009,2025-10-01,Basic,49.00,0,APAC,Dormant
CUS-1010,2025-10-12,Enterprise,1249.00,4,North America,Active
CUS-1011,2025-10-25,Team,899.00,0,EMEA,Active
CUS-1012,2025-11-06,Pro,499.00,3,APAC,Churn Risk
`;

async function parseFile(file: File): Promise<Record<string, string | number | null>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    const result = Papa.parse<Record<string, string | number | null>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (h) => h.trim() || 'column',
    });
    return (result.data as Record<string, string | number | null>[]).filter(
      (r) => r && Object.keys(r).length > 0
    );
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string | number | null>>(ws, {
      defval: null,
      raw: true,
    });
  }
  throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
}

function AnimatedMetric({
  label,
  value,
  format,
  tone = 'text-primary',
}: {
  label: string;
  value: number;
  format?: (v: number) => string;
  tone?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const anim = countUp(ref.current, value, {
      duration: 1000,
      format: format ?? ((v) => Math.round(v).toLocaleString()),
    });
    return () => anim.pause();
  }, [value, format]);

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
      <p className="label-mono text-text-muted">{label}</p>
      <p className={cn('code-metric mt-2 text-3xl font-semibold', tone)}>
        <span ref={ref}>0</span>
      </p>
    </div>
  );
}

export default function DatasetsPage() {
  const router = useRouter();
  const { dataset, parsing, error, setDataset, setParsing, setError } = useDatasetStore();
  const [pretendProgress, setPretendProgress] = useState(0);

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 50MB. Please try a smaller file.');
      return;
    }
    setParsing(true);
    setError(null);
    setPretendProgress(0);

    const progressTimer = window.setInterval(() => {
      setPretendProgress((p) => Math.min(92, p + Math.random() * 12));
    }, 160);

    try {
      const rows = await parseFile(file);
      const meta = analyzeDataset(rows, file.name, file.size);

      let duckdbReady = false;
      try {
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = await file.text();
          await loadCsvText(text, 'uploaded');
          duckdbReady = true;
        }
      } catch {
        duckdbReady = false;
      }
      setDataset({ ...meta, source: duckdbReady ? 'duckdb' : 'analyzer' });

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
            await supabase.storage.from('datasets').upload(path, file, { upsert: false });
          }
        } catch {
          // Storage upload is best-effort; local analysis still succeeds.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      window.clearInterval(progressTimer);
      setParsing(false);
      setPretendProgress(100);
    }
  }

  function reset() {
    setDataset(null);
    setError(null);
  }

  const loaded = !!dataset;

  function handleStateToggle(next: 'empty' | 'loaded') {
    if (next === 'empty') {
      reset();
      return;
    }
    if (!dataset) void loadDemo();
  }

  async function loadDemo() {
    const file = new File([DEMO_CSV], 'Q3_Customer_Churn.csv', { type: 'text/csv' });
    await handleFile(file);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono-xs text-outline">
            INTERACTIVE WORKFLOW SHOWCASE
            <span className="mx-1.5 text-primary/60">•</span> Data Ingestion Flow
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.02em]">
            Dataset Upload &amp; Preview
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Drop a CSV or Excel file to parse, preview and profile it — everything happens right
            in your browser.
          </p>
        </div>
        <div className="flex rounded-lg border border-outline-variant/40 p-1">
          {(
            [
              { key: 'empty', label: 'State 1: Empty' },
              { key: 'loaded', label: 'State 2: Loaded' },
            ] as const
          ).map(({ key, label }) => {
            const active = (key === 'loaded') === loaded;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleStateToggle(key)}
                aria-pressed={active}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  active ? 'bg-surface-high text-primary' : 'text-text-muted hover:text-on-surface'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-error/40 bg-error-container/10 p-3 text-xs text-error">
          {error}
        </div>
      )}

      {!dataset && (
        <div className="mt-8">
          <p className="label-mono-xs mb-3 flex items-center gap-2 text-outline">
            <span className="h-1.5 w-1.5 rounded-full bg-outline" />
            STATE 1: EMPTY (BEFORE UPLOAD)
          </p>
          <DropZone onFile={handleFile} />
          {parsing && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary-container/40 bg-primary-container/10 p-4">
              <Loader2 size={16} className="animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">Parsing and analyzing…</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-high">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${pretendProgress}%` }}
                  />
                </div>
              </div>
              <span className="code-metric text-xs text-primary">
                {Math.round(pretendProgress)}%
              </span>
            </div>
          )}
        </div>
      )}

      {dataset && !parsing && (
        <div className="mt-8 space-y-8">
          <p className="label-mono-xs flex items-center gap-2 text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            STATE 2: FILE LOADED
          </p>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <AnimatedMetric label="Total Rows" value={dataset.rowCount} />
            <AnimatedMetric
              label="Total Columns"
              value={dataset.columnCount}
              tone="text-secondary"
            />
            <div className="rounded-xl border border-outline-variant/30 bg-surface p-5">
              <p className="label-mono text-text-muted">Detected Column Types</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(dataset.typeCounts) as SemanticType[]).map((type) => (
                  <span
                    key={type}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs',
                      TYPE_BADGE[type]
                    )}
                  >
                    {type}
                    <span className="code-metric text-[11px]">{dataset.typeCounts[type]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DataPreviewTable
            dataset={dataset}
            onReset={reset}
            onProceed={() => router.push('/profiler')}
          />
        </div>
      )}

      <p className="pb-6 pt-10 text-center text-[11px] text-outline">© 2026 Visora Inc.</p>
    </div>
  );
}