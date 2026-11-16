// Tiling-window behaviour: the active pane, project tiles, workspace links and
// the 1-3 jump keys.

import { isBooting } from './boot';
import { motionOK } from './prefs';

const panes = () => Array.from(document.querySelectorAll<HTMLElement>('.pane'));

export function setActive(pane: Element | null): void {
  panes().forEach((p) => p.classList.toggle('active', p === pane));
}

/** Scroll to an element (a pane or a tile inside one) and focus its pane. */
export function gotoPane(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const pane = el.closest<HTMLElement>('.pane') ?? el;
  setActive(pane);
  el.scrollIntoView({ behavior: motionOK() ? 'smooth' : 'auto', block: 'start' });
  pane.focus({ preventScroll: true });
}

/** Open or close a project tile, morphing the grid with a view transition. */
export function setTile(tile: HTMLDetailsElement, open: boolean): void {
  if (tile.open === open) return;
  const apply = () => {
    tile.open = open;
  };
  if (motionOK() && typeof document.startViewTransition === 'function') {
    // Tiles get their own snapshot names only for this morph. Permanent names
    // would also split them out of the theme reveal's circle.
    const tiles = Array.from(document.querySelectorAll<HTMLElement>('.tile'));
    tiles.forEach((t) => (t.style.viewTransitionName = `t-${t.id.slice(2)}`));
    document.startViewTransition(apply).finished.finally(() => {
      tiles.forEach((t) => (t.style.viewTransitionName = ''));
    });
  } else apply();
}

export function expandTile(id: string): void {
  const tile = document.getElementById(id);
  if (tile instanceof HTMLDetailsElement) setTile(tile, true);
}

export function setupPanes(): void {
  panes().forEach((p) => p.addEventListener('pointerdown', () => setActive(p)));

  // Tiles are native <details>, so they work without JavaScript. With it, the
  // toggle runs inside a view transition so the grid morphs instead of jumping.
  document.querySelectorAll<HTMLDetailsElement>('details.tile').forEach((tile) => {
    tile.querySelector('summary')?.addEventListener('click', (e) => {
      e.preventDefault();
      setTile(tile, !tile.open);
    });
  });

  // Highlight the workspace whose pane is in the middle of the viewport.
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.ws a[data-ws]'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => {
          if (a.dataset.ws === e.target.id) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  links.forEach((a) => {
    const target = a.dataset.ws && document.getElementById(a.dataset.ws);
    if (target) io.observe(target);
  });

  // Keys 1-3 jump between workspaces, like a tiling window manager.
  const keys: Record<string, string> = { '1': 'work', '2': 'cv', '3': 'contact' };
  document.addEventListener('keydown', (e) => {
    if (isBooting() || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    const id = keys[e.key];
    if (id) {
      e.preventDefault();
      gotoPane(id);
    }
  });
}
