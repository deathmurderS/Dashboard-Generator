import anime from 'animejs';

/** Targets anime.js can animate — mirrors the official AnimeTarget union. */
type AnimTarget = string | object | HTMLElement | SVGElement | NodeList | null;

/**
 * Centralized Anime.js helpers for the Visora design language.
 * Every page-level animation in the app goes through here so easing,
 * durations and cleanup stay consistent. All helpers clean up their
 * targets so React StrictMode double-mounts never double-run.
 */

const EASE = 'easeOutExpo';

export function cleanup(targets: AnimTarget | AnimTarget[]) {
  anime.remove(targets);
}

/** Staggered fade + slide-up for groups of elements (cards, rows, words). */
export function staggerReveal(
  targets: AnimTarget | AnimTarget[],
  options: { delay?: number; distance?: number; duration?: number; easing?: string } = {}
) {
  const { delay = 0, distance = 24, duration = 700, easing = EASE } = options;
  return anime({
    targets,
    translateY: [distance, 0],
    opacity: [0, 1],
    delay: anime.stagger(70, { start: delay, from: 'first' }),
    duration,
    easing,
  });
}

/** Slide in from the right (config panels / drawers). */
export function slideInRight(
  targets: AnimTarget | AnimTarget[],
  options: { delay?: number; distance?: number; duration?: number } = {}
) {
  const { delay = 0, distance = 80, duration = 420 } = options;
  return anime({
    targets,
    translateX: [distance, 0],
    opacity: [0, 1],
    delay,
    duration,
    easing: EASE,
  });
}

/** Staggered slide in from the left (column rows, list items). */
export function slideInLeft(
  targets: AnimTarget | AnimTarget[],
  options: { delay?: number; duration?: number; distance?: number } = {}
) {
  const { delay = 0, duration = 520, distance = 32 } = options;
  return anime({
    targets,
    translateX: [-distance, 0],
    opacity: [0, 1],
    delay: anime.stagger(42, { start: delay, from: 'first' }),
    duration,
    easing: EASE,
  });
}

/** Count a number up from 0 into a DOM node with the given formatter. */
export function countUp(
  target: HTMLElement,
  value: number,
  options: { duration?: number; format?: (v: number) => string } = {}
) {
  const { duration = 1200, format } = options;
  const obj = { v: 0 };
  return anime({
    targets: obj,
    v: value,
    duration,
    easing: 'easeOutCubic',
    round: 1,
    update: () => {
      const formatted = format
        ? format(obj.v)
        : Math.round(obj.v).toLocaleString('en-US');
      if (target) target.textContent = formatted;
    },
  });
}

/** Staggered hero-word reveal (each word wrapped in an inline-block span). */
export function wordReveal(
  words: AnimTarget,
  options: { delay?: number; duration?: number } = {}
) {
  const { delay = 50, duration = 800 } = options;
  return anime({
    targets: words,
    translateY: [28, 0],
    rotateX: [45, 0],
    opacity: [0, 1],
    delay: anime.stagger(90, { start: delay, from: 'first' }),
    duration,
    easing: EASE,
  });
}

/** Draw an SVG path in via stroke-dashoffset (sparklines). */
export function drawPath(
  targets: AnimTarget,
  options: { delay?: number; duration?: number } = {}
) {
  const { delay = 0, duration = 1100 } = options;
  const els = Array.isArray(targets) ? targets : [targets];
  els.forEach((el: unknown) => {
    const node = el as SVGPathElement;
    const len = node.getTotalLength?.() ?? 400;
    node.style.strokeDasharray = `${len}`;
    node.style.strokeDashoffset = `${len}`;
  });
  return anime({
    targets,
    strokeDashoffset: [anime.setDashoffset, 0],
    delay: anime.stagger(120, { start: delay, from: 'first' }),
    duration,
    easing: 'easeInOutSine',
  });
}

/** Slow continuous rotation (orbit rings, analyzer sweeps). */
export function spinLoop(targets: AnimTarget, options: { duration?: number } = {}) {
  const { duration = 40000 } = options;
  return anime({
    targets,
    rotate: '1turn',
    duration,
    easing: 'linear',
    loop: true,
  });
}

/** Background orb breathing / floating loop. */
export function breathe(
  targets: AnimTarget,
  options: { scale?: number; duration?: number } = {}
) {
  const { scale = 1.15, duration = 7000 } = options;
  return anime({
    targets,
    scale: [0.92, scale],
    opacity: [0.4, 0.75],
    translateY: [6, -10],
    direction: 'alternate',
    duration,
    easing: 'easeInOutSine',
    loop: true,
  });
}

/** Soft continuous glow pulse for CTA buttons. */
export function glowPulse(
  targets: AnimTarget,
  options: { color?: string; duration?: number } = {}
) {
  const { color = 'rgba(76, 215, 246, 0.55)', duration = 2200 } = options;
  return anime({
    targets,
    boxShadow: [
      `0 0 10px -2px ${color}`,
      `0 0 34px -4px ${color}`,
      `0 0 10px -2px ${color}`,
    ],
    duration,
    easing: 'easeInOutSine',
    loop: true,
  });
}

/** Fill a bar / progress meter from 0% to the target. */
export function fillBar(
  targets: AnimTarget,
  targetPercent: number,
  options: { duration?: number; delay?: number } = {}
) {
  const { duration = 1400, delay = 120 } = options;
  const obj = { p: 0 };
  return anime({
    targets: obj,
    p: targetPercent,
    duration,
    delay,
    easing: 'easeOutCubic',
    update: () => {
      if (Array.isArray(targets)) return;
      (targets as HTMLElement).style.width = `${obj.p.toFixed(1)}%`;
    },
  });
}

/** Save button success: spin 360°, then show a check. */
export function spinAndCheck(
  targets: AnimTarget,
  onComplete?: () => void
) {
  return anime({
    targets,
    rotate: '1turn',
    scale: [1, 1.06, 1],
    duration: 700,
    easing: 'easeInOutQuart',
    complete: () => {
      onComplete?.();
    },
  });
}

/** Pop-in for widgets entering the canvas (scale + fade). */
export function popIn(
  targets: AnimTarget,
  options: { duration?: number; delay?: number } = {}
) {
  const { duration = 420, delay = 0 } = options;
  return anime({
    targets,
    scale: [0.92, 1],
    opacity: [0, 1],
    delay,
    duration,
    easing: EASE,
  });
}