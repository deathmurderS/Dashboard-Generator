'use client';

import Link from 'next/link';
import type { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn, timeAgo } from '@/lib/utils';

const ACCENT_BORDER: Record<NonNullable<Project['accent']>, string> = {
  teal: 'border-t-primary-container',
  purple: 'border-t-secondary',
  gray: 'border-t-outline/60',
};

const ACCENT_TEXT: Record<NonNullable<Project['accent']>, string> = {
  teal: 'text-primary',
  purple: 'text-secondary',
  gray: 'text-outline',
};

const STATUS_VARIANT: Record<Project['badgeLabel'], 'success' | 'muted' | 'outline'> = {
  'Live Sync': 'success',
  Draft: 'muted',
  Archived: 'outline',
};

/** Deterministic intensity grid for the purple heatmap thumbnail. */
const HEAT: number[][] = [
  [0.25, 0.55, 0.85, 0.4, 0.7, 0.95, 0.45, 0.3],
  [0.5, 0.8, 0.35, 0.9, 0.6, 0.25, 0.75, 0.55],
  [0.65, 0.3, 0.6, 0.45, 0.85, 0.5, 0.35, 0.75],
];

function Thumb({ project }: { project: Project }) {
  const visual = project.visual ?? 'sparkline';

  if (visual === 'kpi') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1">
        <span
          className={cn(
            'code-metric text-2xl font-semibold',
            ACCENT_TEXT[project.accent ?? 'teal']
          )}
        >
          {project.kpiValue ?? '$0'}
        </span>
        <span className="label-mono-xs text-outline">ARR</span>
      </div>
    );
  }

  if (visual === 'heatmap') {
    return (
      <div className="grid h-full w-full grid-cols-8 content-center gap-1 px-4">
        {/* Cells scale the opacity of the secondary (#ddb7ff) token */}
        {HEAT.flat().map((v, i) => (
          <span
            key={i}
            className="h-4 rounded-[2px]"
            style={{ backgroundColor: `rgba(221, 183, 255, ${(0.08 + v * 0.7).toFixed(2)})` }}
          />
        ))}
      </div>
    );
  }

  if (visual === 'donut') {
    return (
      <div className="flex h-full items-center justify-center text-outline">
        <svg width="56" height="56" viewBox="0 0 42 42" className="-rotate-90">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="6" />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="6" strokeDasharray="38 62" />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="18 82" strokeDashoffset="-38" />
        </svg>
      </div>
    );
  }

  // sparkline (default)
  const sparkId = `spark-${project.id}`;
  const max = Math.max(...project.spark, 1);
  const points = project.spark
    .map((v, i) => `${(i / (project.spark.length - 1)) * 100},${34 - (v / max) * 28}`)
    .join(' ');
  return (
    <div className={cn('h-full w-full', ACCENT_TEXT[project.accent ?? 'teal'])}>
      <svg className="h-full w-full" viewBox="0 0 120 34" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <polyline points={`0,34 ${points} 120,34`} fill={`url(#${sparkId})`} stroke="none" opacity="0.3" />
        <defs>
          <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: (id: string) => void;
}) {
  const accent = project.accent ?? 'teal';

  return (
    <Link
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onOpen?.(project.id);
      }}
      data-reveal
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-outline-variant/40 border-t-2 bg-surface transition-all hover:border-primary-container/60 hover:shadow-laser',
        ACCENT_BORDER[accent]
      )}
    >
      {/* Thumbnail visual */}
      <div className="relative m-3 mb-0 h-24 overflow-hidden rounded-lg border border-outline-variant/30 bg-canvas-deep/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container/5 to-transparent" />
        <Thumb project={project} />
      </div>

      <div className="flex flex-1 flex-col p-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[project.badgeLabel]}>
            <span className="label-mono-xs uppercase">{project.badgeLabel}</span>
          </Badge>
          {project.badgeHint && (
            <span className="text-[10px] uppercase tracking-wide text-outline">
              {project.badgeHint}
            </span>
          )}
        </div>

        <h3 className="mt-2.5 font-heading text-[15px] font-semibold leading-snug">
          {project.name}
        </h3>

        <p className="mb-4 mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-muted">
          {project.description}
        </p>

        <div className="mt-auto flex items-center gap-2 border-t border-outline-variant/20 pt-3 text-[11px] text-text-muted">
          <span className="truncate rounded border border-outline-variant/30 px-1.5 py-0.5 font-mono">
            {project.datasetName}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-outline">
            {timeAgo(project.lastEdited)} · {project.author ?? 'Team'}
          </span>
        </div>
      </div>
    </Link>
  );
}
