// Work index filter chips. Without JavaScript the chips are hidden and every
// project shows; with it, the remaining cards slide into place.

import { motionOK } from './prefs';

export function setupFilters(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.wcard[data-type]'));
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('.fchip[data-f]'));
  const cmd = document.getElementById('lsCmd');
  const count = document.getElementById('lsCount');
  const empty = document.getElementById('wEmpty');
  let running: Animation[] = [];

  function apply(filter: string): void {
    running.forEach((a) => a.cancel());
    running = [];
    const before = new Map<HTMLElement, DOMRect>();
    cards.forEach((c) => {
      if (!c.hidden) before.set(c, c.getBoundingClientRect());
    });
    let shown = 0;
    cards.forEach((c) => {
      c.hidden = filter !== 'all' && c.dataset.type !== filter;
      if (!c.hidden) shown += 1;
    });
    chips.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
    if (cmd) cmd.textContent = `ls ~/work${filter === 'all' ? '' : ` --type=${filter}`}`;
    if (count) count.textContent = `${shown} ${shown === 1 ? 'entry' : 'entries'}`;
    if (empty) empty.hidden = shown > 0;
    if (!motionOK()) return;
    // FLIP: cards that stay slide from their old place, new ones unfold.
    cards.forEach((c, i) => {
      if (c.hidden) return;
      const now = c.getBoundingClientRect();
      const was = before.get(c);
      if (was) {
        const dx = was.left - now.left;
        const dy = was.top - now.top;
        if (dx || dy)
          running.push(
            c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
              duration: 460,
              easing: 'cubic-bezier(.2,.8,.2,1)',
            }),
          );
      } else {
        running.push(
          c.animate(
            [
              {
                opacity: 0,
                transform: 'translateY(10px) scale(.97)',
                clipPath: 'inset(0 0 100% 0 round 6px)',
              },
              { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0 round 6px)' },
            ],
            { duration: 420, delay: i * 50, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
          ),
        );
      }
    });
  }

  chips.forEach((b) => b.addEventListener('click', () => apply(b.dataset.f ?? 'all')));
}
