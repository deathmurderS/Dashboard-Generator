'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import { createClient } from '@/lib/supabase';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav onToggleMenu={() => setMobileOpen((o) => !o)} />
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-canvas-deep/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-12 h-[calc(100%-3rem)]">
            <aside className="flex h-full w-60 flex-col border-r border-outline-variant/30 bg-canvas-deep pt-3">
              <div className="flex items-center justify-between px-4 pb-4">
                <span className="font-heading text-base font-bold">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-xs text-text-muted"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" onClick={() => setMobileOpen(false)}>
                <Sidebar />
              </div>
              <button
                onClick={handleSignOut}
                className="m-3 flex items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-text-muted"
              >
                <LogOut size={14} /> Sign out
              </button>
            </aside>
          </div>
        </div>
      )}

      <main className="pb-6 pt-16 lg:pl-60">{children}</main>
    </div>
  );
}