// Tiling-window behaviour: the active pane and the home page's project tiles.

import { motionOK } from './prefs';

const panes = () => Array.from(document.querySelectorAll<HTMLElement>('.pane'));

/** Mark a pane active and light its workspace tab in the top bar, if it has one. */
export function setActive(pane: Element | null): void {
  panes().forEach((p) => p.classList.toggle('active', p === pane));
  document.querySelectorAll<HTMLAnchorElement>('.ws a[data-ws]').forEach((a) => {
    if (pane && a.dataset.ws === pane.id) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
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

  // Arriving on a pane's hash (a /#contact link from another page) lights its tab.
  const hashed = location.hash && document.getElementById(location.hash.slice(1));
  if (hashed) setActive(hashed.closest('.pane'));
}
