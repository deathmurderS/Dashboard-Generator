'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import { breathe } from '@/lib/anime';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Templates', href: '#templates' },
  { label: 'Pricing', href: '#pricing' },
];

export default function Navbar() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbRef.current) return;
    const anim = breathe(orbRef.current.querySelectorAll('.nav-orb'));
    return () => anim.pause();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-canvas/80 backdrop-blur-xl">
      <div
        ref={orbRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="nav-orb absolute -top-16 left-[12%] h-40 w-40 rounded-full bg-primary-container/15 blur-3xl" />
        <div className="nav-orb absolute -top-10 right-[18%] h-32 w-32 rounded-full bg-secondary-container/10 blur-3xl" />
      </div>

      <nav className="relative flex h-16 w-full items-center justify-between px-8 lg:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary-container/50 bg-primary-container/10 shadow-laser">
            <BarChart3 size={16} className="text-primary" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight text-on-surface">
            Visora
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-muted transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-text-muted transition-colors hover:text-primary"
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-full bg-primary-container px-5 py-2 text-sm font-semibold text-on-primary-container shadow-laser transition-all hover:shadow-laser-strong active:scale-[0.98]"
          >
            Get Started Free
          </Link>
        </div>
      </nav>
    </header>
  );
}