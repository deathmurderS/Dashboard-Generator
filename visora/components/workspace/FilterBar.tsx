'use client';

import { LayoutGrid, List } from 'lucide-react';
import type { ProjectFilter } from '@/types';
import { cn } from '@/lib/utils';

const TAGS: ProjectFilter[] = [
  { key: 'all', label: 'All', count: 24 },
  { key: 'production', label: 'Production', count: 14 },
  { key: 'draft', label: 'Draft', count: 5 },
  { key: 'executive', label: 'Executive', count: 3 },
  { key: 'experimental', label: 'Experimental', count: 2 },
];

export interface FilterBarProps {
  active: ProjectFilter['key'];
  onChange: (key: ProjectFilter['key']) => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export default function FilterBar({ active, onChange, view, onViewChange }: FilterBarProps) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 bg-canvas-deep/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-mono-xs mr-1 text-outline">Tags</span>
        {TAGS.map((tag) => {
          const isActive = active === tag.key;
          return (
            <button
              key={tag.key}
              type="button"
              onClick={() => onChange(tag.key)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                isActive
                  ? 'bg-primary-container text-canvas-deep'
                  : 'border border-outline-variant/40 text-text-muted hover:border-primary-container/60 hover:text-on-surface'
              )}
            >
              {tag.label}
              <span
                className={cn(
                  'code-metric text-[10px]',
                  isActive ? 'text-canvas-deep/70' : 'text-outline'
                )}
              >
                {tag.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/40 px-2.5 py-1 text-[11px] text-text-muted transition-colors hover:border-primary-container/60 hover:text-on-surface"
        >
          Sort: Last Edited
        </button>
        <div className="flex rounded-md border border-outline-variant/40 p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => onViewChange('grid')}
            className={cn(
              'rounded p-1 transition-colors',
              view === 'grid' ? 'bg-surface-high text-primary' : 'text-text-muted'
            )}
          >
            <LayoutGrid size={13} />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onViewChange('list')}
            className={cn(
              'rounded p-1 transition-colors',
              view === 'list' ? 'bg-surface-high text-primary' : 'text-text-muted'
            )}
          >
            <List size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}