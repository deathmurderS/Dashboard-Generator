'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Bell, ChevronDown, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Workspace', href: '/workspace' },
  { label: 'Datasets', href: '/datasets' },
  { label: 'Profiler', href: '/profiler' },
  { label: 'Studio Builder', href: '/builder' },
];

export default function TopNav({ onToggleMenu }: { onToggleMenu?: () => void }) {
  const pathname = usePathname();
  const [initial, setInitial] = useState('V');

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const email = data.user?.email ?? '';
        setInitial(email ? email[0].toUpperCase() : 'V');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-outline-variant/30 bg-canvas/90 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Toggle menu"
          className="rounded-md p-1.5 text-text-muted hover:bg-surface-high lg:hidden"
        >
          <Menu size={18} />
        </button>
        <Link href="/workspace" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary-container/50 bg-primary-container/10">
            <BarChart3 size={14} className="text-primary" />
          </span>
          <span className="font-heading text-sm font-bold">Visora</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[13px] transition-colors',
                  active
                    ? 'bg-primary-container/10 text-primary'
                    : 'text-text-muted hover:bg-surface-high hover:text-on-surface'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-full border border-outline-variant/40 px-3 py-1 text-xs text-text-muted transition-colors hover:border-primary-container/60 hover:text-on-surface sm:inline-flex"
        >
          Production Workspace <ChevronDown size={12} />
        </button>
        {pathname === '/datasets' && (
          <span className="label-mono-xs hidden items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/10 px-2.5 py-1 text-tertiary lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
            DATASET ENGINE: READY
          </span>
        )}
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-high hover:text-on-surface"
        >
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <span
          aria-label="Account"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary text-[11px] font-bold text-canvas-deep"
        >
          {initial}
        </span>
      </div>
    </header>
  );
}