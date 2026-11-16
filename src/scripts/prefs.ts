// Theme and motion preferences. The inline script in Base.astro applies the
// saved values before first paint; this module changes them at runtime.

const root = document.documentElement;
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqLight = window.matchMedia('(prefers-color-scheme: light)');

export function store(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked site data): the
    // choice then lasts for this page view only.
  }
}

/** True when animations may run: the OS allows it and the visitor did not turn them off. */
export function motionOK(): boolean {
  return !mqReduce.matches && root.getAttribute('data-motion') !== 'reduced';
}

export function systemReducedMotion(): boolean {
  return mqReduce.matches;
}

const motionListeners = new Set<() => void>();

export function onMotionChange(fn: () => void): void {
  motionListeners.add(fn);
}

function motionChanged(): void {
  root.classList.toggle('calm', !motionOK());
  motionListeners.forEach((fn) => fn());
}

export function setMotion(on: boolean): void {
  if (on) {
    root.removeAttribute('data-motion');
    store('fs-motion', null);
  } else {
    root.setAttribute('data-motion', 'reduced');
    store('fs-motion', 'reduced');
  }
  motionChanged();
}

mqReduce.addEventListener('change', motionChanged);

export type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  const t = root.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return mqLight.matches ? 'light' : 'dark';
}

/**
 * Switch the theme. With motion on and View Transitions available, the new
 * theme is revealed as a circle growing from `origin`.
 */
export function setTheme(next: Theme, origin?: Element | null): void {
  const apply = () => {
    root.setAttribute('data-theme', next);
    store('fs-theme', next);
  };
  if (!motionOK() || typeof document.startViewTransition !== 'function') {
    apply();
    return;
  }
  const r = origin?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth - 40;
  const y = r ? r.top + r.height / 2 : 20;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 520,
          easing: 'cubic-bezier(.6,0,.2,1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {});
}

export function toggleTheme(origin?: Element | null): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next, origin);
  return next;
}
