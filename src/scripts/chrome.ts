// The parts every page shares: the top bar's theme and motion toggles, the
// 0-3 workspace keys and links, and navigation that stays on the page when
// the target is a pane of the current page.

import { gotoPane } from './panes';
import { motionOK, onMotionChange, setMotion, systemReducedMotion, toggleTheme } from './prefs';

const root = document.documentElement;

const samePath = (a: string, b: string) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

/**
 * Go to a site path. A path on the current page (such as `/#contact` on the
 * home page) scrolls to and focuses that pane instead of reloading.
 */
export function navigate(href: string, { delay = 0 }: { delay?: number } = {}): void {
  const url = new URL(href, location.href);
  if (url.origin === location.origin && samePath(url.pathname, location.pathname)) {
    const id = decodeURIComponent(url.hash.slice(1)) || 'top';
    if (document.getElementById(id)) {
      if (url.hash && location.hash !== url.hash) history.pushState(null, '', url.hash);
      gotoPane(id);
      return;
    }
  }
  if (delay && motionOK()) window.setTimeout(() => location.assign(url.href), delay);
  else location.assign(url.href);
}

/** Workspace key -> link target. */
const KEYS: Record<string, string> = { '0': '/', '1': '/work', '2': '/cv', '3': '/#contact' };

export function setupChrome(): void {
  const themeBtn = document.getElementById('themeBtn');
  themeBtn?.addEventListener('click', () => toggleTheme(themeBtn));
  const motionBtn = document.getElementById('motionBtn');
  motionBtn?.addEventListener('click', () => setMotion(!motionOK()));
  // The button cannot override the OS setting; say so (phones show a short label).
  const syncMotionTitle = () => {
    if (motionBtn)
      motionBtn.title = systemReducedMotion()
        ? 'Off: your system asks for reduced motion'
        : 'Turn animations on or off';
  };
  syncMotionTitle();
  onMotionChange(() => {
    syncMotionTitle();
    // Pages that tile in from the first frame never replay it later.
    if (!motionOK()) root.classList.remove('tiled');
  });

  // Top-bar links to a pane of this page (Contact and the brand on the home
  // page) scroll to it like the keys do; every other link is a normal link.
  document.querySelectorAll<HTMLAnchorElement>('.bar a[href]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const url = new URL(a.href);
      if (!samePath(url.pathname, location.pathname)) return;
      e.preventDefault();
      navigate(a.href);
    });
  });

  // Keys 0-3 switch workspaces, like a tiling window manager.
  document.addEventListener('keydown', (e) => {
    if (root.classList.contains('booting') || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    const href = KEYS[e.key];
    if (href) {
      e.preventDefault();
      navigate(href);
    }
  });
}
