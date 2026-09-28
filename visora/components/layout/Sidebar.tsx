'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Database,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  KeyRound,
  Clock,
  Inbox,
  Archive,
  Users,
  CreditCard,
  Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fillBar } from '@/lib/anime';

const NAV_SECTIONS = [
  {
    label: 'Workspaces',
    items: [
      { label: 'All Projects', href: '/workspace', icon: FolderOpen, count: '24' },
      { label: 'Recent', href: '/workspace?filter=recent', icon: Clock },
      { label: 'Shared with me', href: '/workspace?filter=shared', icon: Inbox, count: '4' },
      { label: 'Archived', href: '/workspace?filter=archive', icon: Archive, count: '12' },
    ],
  },
  {
    label: 'Data Connectors',
    items: [
      { label: 'PostgreSQL', href: '/datasets?source=postgres', icon: Database, live: true },
      { label: 'Snowflake', href: '/datasets?source=snowflake', icon: Cloud, live: true },
      { label: 'Uploaded CSVs', href: '/datasets', icon: FileSpreadsheet, count: '41 files' },
    ],
  },
  {
    label: 'Team & Config',
    items: [
      { label: 'Members', href: '/workspace?config=team', icon: Users, count: '6' },
      { label: 'API Keys', href: '/workspace?config=api', icon: KeyRound, meta: '3 active' },
      { label: 'Billing', href: '/workspace?config=billing', icon: CreditCard },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const storageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storageRef.current) return;
    const bar = storageRef.current.querySelector('.storage-bar');
    if (!bar) return;
    // 14.8 GB of 50 GB → 29.6%
    const anim = fillBar(bar, 29.6, { delay: 400 });
    return () => anim.pause();
  }, []);

  return (
    <aside className="fixed bottom-0 left-0 top-12 z-30 hidden w-60 flex-col border-r border-outline-variant/30 bg-canvas-deep lg:flex">
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="label-mono-xs px-2 text-outline">{section.label}</p>
            <ul className="mt-2 space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/workspace' && pathname === item.href.split('?')[0]);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                        active
                          ? 'bg-primary-container/10 text-primary'
                          : 'text-text-muted hover:bg-surface-high hover:text-on-surface'
                      )}
                    >
                      <item.icon size={15} className={active ? 'text-primary' : 'text-outline'} />
                      <span>{item.label}</span>
                      {'count' in item && item.count && (
                        <span className="label-mono-xs ml-auto text-outline">{item.count}</span>
                      )}
                      {'meta' in item && item.meta && (
                        <span className="label-mono-xs ml-auto text-outline">{item.meta}</span>
                      )}
                      {'live' in item && item.live && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-tertiary">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" />
                          Synced
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Storage usage */}
      <div className="border-t border-outline-variant/30 p-4">
        <div ref={storageRef}>
          <p className="label-mono-xs text-outline">Storage Usage</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <HardDrive size={13} />
              <span className="code-metric">14.8 GB</span>
              <span className="text-outline">of 50 GB</span>
            </span>
            <a
              href="/workspace?config=billing"
              className="text-[11px] font-semibold text-primary hover:text-primary-container"
            >
              Upgrade
            </a>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-high">
            <div className="storage-bar h-full w-0 rounded-full bg-gradient-to-r from-primary to-primary-container" />
          </div>
        </div>
      </div>
    </aside>
  );
}