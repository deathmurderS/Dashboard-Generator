'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, Search, Sparkles } from 'lucide-react';
import type { Project, ProjectFilter } from '@/types';
import ProjectCard from '@/components/workspace/ProjectCard';
import FilterBar from '@/components/workspace/FilterBar';
import { Button } from '@/components/ui/button';
import { staggerReveal } from '@/lib/anime';
import { makeSpark } from '@/lib/utils';

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Q3 Customer Churn & Retention',
    description: 'Cohort retention curves, churn-risk flags and save-offer outcomes for the quarter.',
    status: 'production',
    badgeLabel: 'Live Sync',
    badgeHint: 'Realtime',
    datasetName: 'Q3_Customer_Churn.csv',
    lastEdited: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    spark: makeSpark(1, 16, 45, 34),
    accent: 'teal',
    visual: 'sparkline',
    author: 'Sarah Jenkins',
    collaborators: ['SJ', 'MV'],
  },
  {
    id: 'p2',
    name: 'Enterprise ARR & Pipeline Forecast',
    description: 'Booked ARR pacing against target with pipeline-weighted forecast bands.',
    status: 'production',
    badgeLabel: 'Live Sync',
    datasetName: 'enterprise_arr_2026.csv',
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    spark: makeSpark(2, 16, 42, 30),
    accent: 'teal',
    visual: 'kpi',
    kpiValue: '$42.8M',
    author: 'Marcus Vance',
    collaborators: ['MV'],
  },
  {
    id: 'p3',
    name: 'Global Latency & Edge Performance',
    description: 'P50 and P95 response times across edge regions with degradation hot spots.',
    status: 'draft',
    badgeLabel: 'Draft',
    datasetName: 'edge_latency_q3.xlsx',
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    spark: makeSpark(3, 16, 50, 22),
    accent: 'purple',
    visual: 'heatmap',
    author: 'Aris Thorne',
    collaborators: ['AF'],
  },
  {
    id: 'p4',
    name: 'Marketing Channel Attribution 2024',
    description: 'Spend-to-revenue attribution split across paid, organic and partner channels.',
    status: 'executive',
    badgeLabel: 'Archived',
    datasetName: 'channel_attribution_2024.csv',
    lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    spark: makeSpark(4, 16, 38, 24),
    accent: 'gray',
    visual: 'donut',
    author: 'Sarah Jenkins',
    collaborators: ['SJ'],
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter['key']>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  /** Open a project in the dashboard studio (per-project routes come later). */
  function openProject(_id: string) {
    router.push('/builder');
  }

  useEffect(() => {
    if (!gridRef.current) return;
    const targets = gridRef.current.querySelectorAll('[data-reveal]');
    if (!targets.length) return;
    const anim = staggerReveal(targets, { distance: 26 });
    return () => anim.pause();
  }, [activeFilter]);

  const visibleProjects =
    activeFilter === 'all'
      ? MOCK_PROJECTS
      : MOCK_PROJECTS.filter((p) => p.status === activeFilter);

  return (
    <div className="mx-auto max-w-[1200px] px-6">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em]">
            Welcome back, <span className="text-gradient-teal">Sarah</span>
          </h1>
          <button className="mt-1 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-primary">
            Production Workspace <ChevronDown size={13} />
          </button>
        </div>

        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            className="input-field w-72 pl-9 text-xs"
            placeholder="Search projects…"
            aria-label="Search projects"
          />
          <kbd className="label-mono-xs absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-outline-variant/40 px-1.5 py-0.5 text-outline">
            ⌘K
          </kbd>
        </div>

        <Button onClick={() => router.push('/datasets')}>
          <Plus size={15} /> New Project
        </Button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <FilterBar
        active={activeFilter}
        onChange={setActiveFilter}
        view={view}
        onViewChange={setView}
      />

      {/* ── Project grid ────────────────────────────────────────────── */}
      <div ref={gridRef} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={openProject} />
        ))}

        {/* Create New Project card */}
        <button
          data-reveal
          onClick={() => router.push('/datasets')}
          className="group flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/50 bg-surface/40 p-6 transition-all hover:border-primary-container/70 hover:shadow-laser"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary-container/50 bg-primary-container/10 text-primary transition-transform group-hover:scale-110">
            <Plus size={22} />
          </span>
          <p className="mt-4 font-heading text-[15px] font-semibold">Create New Project</p>
          <p className="mt-1 text-xs text-text-muted">Start from a fresh upload</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['BLANK CANVAS', 'SALES FUNNEL', 'CHURN MATRIX'].map((tpl) => (
              <span
                key={tpl}
                className="label-mono-xs inline-flex items-center gap-1 rounded-full border border-outline-variant/40 px-2.5 py-1 text-outline transition-colors group-hover:border-primary-container/50 group-hover:text-primary"
              >
                <Plus size={11} /> {tpl}
              </span>
            ))}
          </div>
        </button>
      </div>

      {/* ── Footer status bar ───────────────────────────────────────── */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 py-5 text-xs text-text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-tertiary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
            All systems operational
          </span>
          <span className="text-outline/70">·</span>
          <span>Auto-saving enabled</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="code-metric text-[11px] text-outline">
            Showing {visibleProjects.length + 1} of 24 projects
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded border border-outline-variant/40 px-2.5 py-1 hover:text-primary">
              ←
            </button>
            <span className="code-metric">1/4</span>
            <button className="rounded border border-outline-variant/40 px-2.5 py-1 hover:text-primary">
              →
            </button>
          </div>
        </div>
      </div>

      <p className="pb-6 text-center text-[11px] text-outline">© 2026 Visora Inc.</p>
    </div>
  );
}