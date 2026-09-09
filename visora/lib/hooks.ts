import { useEffect, useRef, useState } from 'react';
import { staggerReveal } from '@/lib/anime';

/**
 * Observe a container and fire a stagger-reveal animation once when it
 * scrolls into the viewport. Returns a ref to attach to the container.
 */
export function useScrollReveal(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Fire the actual staggered reveal once the container becomes active
  // and new children have been rendered.
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const targets = containerRef.current.querySelectorAll('[data-reveal]');
    if (!targets.length) return;
    const anim = staggerReveal(targets, { distance: 26 });
    return () => anim.pause();
  }, [active]);

  return { containerRef, active };
}