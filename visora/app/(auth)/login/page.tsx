'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import { glowPulse, slideInLeft, spinLoop, staggerReveal } from '@/lib/anime';

const STAT_PILLS = [
  { value: '50K+', label: 'rows/sec' },
  { value: '99.9%', label: 'uptime' },
  { value: '<42ms', label: 'response' },
];

function OrbitRings() {
  const ringsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ringsRef.current) return;
    const ringEls = ringsRef.current.querySelectorAll('.orbit-ring');
    const anims = Array.from(ringEls).map((el, i) =>
      spinLoop(el, { duration: 26000 + i * 14000 })
    );
    return () => anims.forEach((a) => a.pause());
  }, []);

  return (
    <div ref={ringsRef} className="relative flex items-center justify-center" aria-hidden>
      <div className="absolute h-40 w-40 rounded-full border border-primary/15" />
      <div className="orbit-ring absolute h-64 w-64 rounded-full border border-dashed border-primary/20" />
      <div className="orbit-ring absolute h-80 w-80 rounded-full border border-secondary/15" />
      <div className="orbit-ring absolute h-[22rem] w-[22rem] rounded-full border border-dashed border-tertiary/15" />
      <div className="absolute flex h-24 w-24 items-center justify-center rounded-full border border-primary-container/50 bg-primary-container/20 shadow-laser">
        <BarChart3 size={30} className="text-primary" />
      </div>
      <div className="absolute right-8 top-1/4 h-2 w-2 animate-pulse rounded-full bg-primary shadow-laser" />
      <div className="absolute bottom-1/4 left-6 h-1.5 w-1.5 rounded-full bg-secondary" />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const redirect = searchParams.get('redirect') ?? '/workspace';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const signInRef = useRef<HTMLButtonElement>(null);
  const [configured] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (formRef.current) {
      const fields = formRef.current.querySelectorAll('[data-field]');
      const anim = staggerReveal(fields, { distance: 16, duration: 520 });
      return () => anim.pause();
    }
  }, []);

  useEffect(() => {
    if (ringRef.current) {
      const orbit = ringRef.current.querySelectorAll('.orb-ring');
      const anims = Array.from(orbit).map((el, i) => spinLoop(el, { duration: 30000 + i * 16000 }));
      return () => anims.forEach((a) => a.pause());
    }
  }, []);

  useEffect(() => {
    if (signInRef.current) {
      const anim = glowPulse(signInRef.current);
      return () => anim.pause();
    }
  }, []);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${redirect}` },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!configured) {
        throw new Error(
          'Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
        );
      }
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'Invalid login credentials'
          ? 'That email and password combination was not recognized.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4 lg:p-8">
      <div className="grid w-full max-w-7xl overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-low shadow-panel lg:grid-cols-12">
      {/* ── Left branding panel ─────────────────────────────────────── */}
      <section className="relative hidden overflow-hidden border-r border-outline-variant/30 p-12 lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-primary-container/10 blur-[110px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-secondary-container/10 blur-[110px]" />
        </div>

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-container/50 bg-primary-container/10 shadow-laser">
              <BarChart3 size={18} className="text-primary" />
            </span>
            <span className="font-heading text-lg font-bold">Visora</span>
          </Link>
        </div>

        <div ref={ringRef} className="relative mt-24 flex items-center justify-center" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="orb-ring absolute h-64 w-64 rounded-full border border-dashed border-primary/15"
              style={{ width: 220 + i * 80, height: 220 + i * 80 }}
            />
          ))}
          <div className="absolute flex h-20 w-20 items-center justify-center rounded-full border border-primary-container/50 bg-primary-container/20 shadow-laser">
            <BarChart3 size={26} className="text-primary" />
          </div>
          <div className="absolute -right-3 top-8 z-10 inline-flex items-center gap-1.5 rounded-full border border-tertiary/30 bg-surface px-3 py-1 text-[10px] font-semibold text-tertiary shadow-panel">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary" /> Live Sync
          </div>
          <div className="absolute -left-3 bottom-8 z-10 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-surface px-3 py-1 text-[10px] font-semibold text-secondary shadow-panel">
            <Sparkles size={10} /> Automated ML
          </div>
        </div>

        <div className="relative mt-auto space-y-10">
          <div>
            <h2 className="font-heading text-4xl font-bold leading-[1.15] tracking-[-0.02em]">
              Precision Analytics{' '}
              <span className="text-gradient-teal">Engine</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm text-text-muted">
              Sub-second queries, zero-friction dashboards, and automated data
              profiling for teams that move fast.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {STAT_PILLS.map((pill) => (
              <div
                key={pill.label}
                className="inline-flex items-baseline gap-1.5 rounded-lg border border-outline-variant/40 bg-surface px-4 py-2"
              >
                <span className="code-metric text-lg font-semibold text-primary">
                  {pill.value}
                </span>
                <span className="label-mono-xs text-text-muted">{pill.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <section className="grid-reticle flex flex-col items-center justify-center bg-canvas-deep/40 px-6 py-16 lg:col-span-7">
        <div className="w-full max-w-sm">
          {/* Mobile brand mark */}
          <Link href="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-container/50 bg-primary-container/10 shadow-laser">
              <BarChart3 size={18} className="text-primary" />
            </span>
            <span className="font-heading text-lg font-bold">Visora</span>
          </Link>

          <div ref={formRef} className="space-y-6">
            <div data-field>
              <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {mode === 'signup'
                  ? 'Create your free workspace in under a minute.'
                  : 'Sign in to your Visora workspace.'}
              </p>
            </div>

            {!configured && (
              <div data-field className="rounded-lg border border-error/40 bg-error-container/10 p-3 text-xs text-error">
                Supabase isn&apos;t configured on this install. Add your keys to
                .env.local then restart the dev server.
              </div>
            )}

            {error && (
              <div data-field className="rounded-lg border border-error/40 bg-error-container/10 p-3 text-xs text-error">
                {error}
              </div>
            )}

            <div data-field>
              <Button
                variant="outline"
                type="button"
                className="h-11 w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Signing you in...
                  </>
                ) : (
                  <>
                    <GoogleMark /> Continue with Google
                  </>
                )}
              </Button>
            </div>

            <div data-field className="flex items-center gap-3">
              <span className="h-px flex-1 bg-outline-variant/40" />
              <span className="text-[11px] uppercase tracking-widest text-text-muted">
                or continue with email
              </span>
              <span className="h-px flex-1 bg-outline-variant/40" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div data-field>
                <label htmlFor="email" className="label-mono block text-text-muted">
                  Email address
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="input-field w-full pl-9"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div data-field>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="label-mono text-text-muted">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="input-field w-full pl-9 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-on-surface"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div data-field className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
                  <Checkbox checked={keepSignedIn} onCheckedChange={setKeepSignedIn} />
                  Keep me signed in
                </label>
              </div>

              <div data-field>
                <Button
                  ref={signInRef}
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing you in...
                    </>
                  ) : mode === 'signup' ? (
                    'Get started free'
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
            </form>

            <div data-field className="text-center text-xs text-text-muted">
              {mode === 'signup' ? 'Already have an account?' : 'New to Visora?'}{' '}
              <Link
                href={mode === 'signup' ? '/login' : '/login?mode=signup'}
                className="font-medium text-primary hover:underline"
              >
                {mode === 'signup' ? 'Sign in' : 'Get started free'}
              </Link>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-center gap-4 border-t border-outline-variant/30 pt-6 text-[11px] text-text-muted">
            <Link href="#" className="hover:text-primary">Platform Docs</Link>
            <span className="inline-flex items-center gap-1 text-tertiary">
              <ShieldCheck size={12} /> SOC2 Type II
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap size={12} className="text-primary" /> Status 100%
            </span>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.23-2.45H12v4.63h6.46a5.56 5.56 0 0 1-2.4 3.66v3h3.87c2.27-2.09 3.57-5.17 3.57-8.84z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.3A7.2 7.2 0 0 1 4.88 12c0-.8.14-1.57.4-2.3v-3.1H1.28a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.98 11.98 0 0 0 1.28 6.6l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-text-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}