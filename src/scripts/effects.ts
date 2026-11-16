// Decorative effects: typing, the rotating project word, scramble-decode
// headings, scroll reveals and the status clock. Every one of them is calm
// under reduced motion and none of them changes layout.

import { motionOK } from './prefs';

const $$ = (sel: string, ctx: ParentNode = document) =>
  Array.from(ctx.querySelectorAll<HTMLElement>(sel));

/* ---------------- typing ---------------- */

interface TypeJob {
  el: HTMLElement;
  text: string;
  timer: number;
  done?: () => void;
}

const typing = new Set<TypeJob>();

/**
 * Type `text` into `el`. By default the untyped remainder is kept in the DOM
 * but hidden, so the element has its final size from the first frame; pass
 * `reserve: false` where a following cursor should track the typed text.
 */
export function typeInto(
  el: HTMLElement,
  text: string,
  speed: number,
  { reserve = true }: { reserve?: boolean } = {},
  done?: () => void,
): void {
  if (!motionOK()) {
    el.textContent = text;
    done?.();
    return;
  }
  const typed = document.createElement('span');
  const rest = document.createElement('span');
  rest.className = 'typing-rest';
  rest.setAttribute('aria-hidden', 'true');
  el.replaceChildren(typed, rest);
  let i = 0;
  const job: TypeJob = { el, text, timer: 0, done };
  const step = () => {
    i += 1;
    typed.textContent = text.slice(0, i);
    if (reserve) rest.textContent = text.slice(i);
    if (i < text.length) job.timer = window.setTimeout(step, speed);
    else finishJob(job);
  };
  if (reserve) rest.textContent = text;
  typing.add(job);
  job.timer = window.setTimeout(step, speed);
}

function finishJob(job: TypeJob): void {
  window.clearTimeout(job.timer);
  typing.delete(job);
  job.el.textContent = job.text;
  job.done?.();
}

/** Complete every running typing effect immediately. */
export function finishTyping(): void {
  Array.from(typing).forEach(finishJob);
}

/* ---------------- rotating project word ---------------- */

export function startRotator(): { sync: () => void } {
  const rot = document.getElementById('rot');
  if (!rot) return { sync: () => {} };
  const words = $$('span:not(.static)', rot);
  let idx = 0;
  let timer = 0;
  let onscreen = true;
  const tick = () => {
    if (!motionOK() || document.hidden || !onscreen) {
      sync();
      return;
    }
    const cur = words[idx];
    idx = (idx + 1) % words.length;
    const nxt = words[idx];
    words.forEach((w) => w.classList.remove('is-out'));
    cur?.classList.remove('is-on');
    cur?.classList.add('is-out');
    nxt?.classList.add('is-on');
  };
  function sync() {
    const run = motionOK() && !document.hidden && onscreen;
    if (run && !timer) timer = window.setInterval(tick, 2200);
    else if (!run && timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  }
  new IntersectionObserver((entries) => {
    onscreen = entries.some((e) => e.isIntersecting);
    sync();
  }).observe(rot);
  document.addEventListener('visibilitychange', sync);
  sync();
  return { sync };
}

/* ---------------- scramble and decode ---------------- */

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789$#%&*+=/<>_|{}';

interface Scramble {
  el: HTMLElement;
  run: () => void;
  seen: boolean;
}

const scrambles: Scramble[] = [];

/**
 * Prepare every `[data-scramble]` element: screen readers get a stable copy
 * of the text, and the visible copy decodes through random glyphs on hover,
 * tap or focus (and once when it first scrolls into view).
 */
export function setupScramble(isBooting: () => boolean): void {
  $$('[data-scramble]').forEach((el) => {
    const text = el.textContent ?? '';
    el.setAttribute('aria-hidden', 'true');
    const sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = text;
    el.after(sr);
    let timer = 0;
    const run = () => {
      if (!motionOK() || timer || isBooting()) return;
      // Lock the width so the random glyphs can never reflow the line.
      el.style.width = `${el.getBoundingClientRect().width}px`;
      el.style.whiteSpace = 'nowrap';
      el.style.overflow = 'hidden';
      el.style.verticalAlign = 'bottom';
      let frame = 0;
      timer = window.setInterval(() => {
        frame += 1;
        const settled = Math.floor(frame / 1.5);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text.charAt(i);
          out +=
            ch === ' ' || ch === '[' || ch === ']' || i < settled
              ? ch
              : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        }
        el.textContent = out;
        if (settled >= text.length) {
          window.clearInterval(timer);
          timer = 0;
          el.textContent = text;
          el.style.cssText = '';
        }
      }, 45);
    };
    const trigger = el.closest('.pt, h1, .handle') ?? el;
    trigger.addEventListener('pointerenter', run);
    trigger.addEventListener('pointerdown', run);
    trigger.addEventListener('focusin', run);
    scrambles.push({ el, run, seen: false });
  });
}

let scrambleIO: IntersectionObserver | null = null;

/** Decode each scramble heading once as it first scrolls into view. */
export function startScrambleReveal(): void {
  if (!motionOK()) return;
  scrambleIO?.disconnect();
  scrambleIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const item = scrambles.find((x) => x.el === e.target);
        if (item && !item.seen) {
          item.seen = true;
          window.setTimeout(item.run, 120 + Math.random() * 220);
        }
        scrambleIO?.unobserve(e.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  scrambles.forEach((x) => {
    if (!x.seen) scrambleIO?.observe(x.el);
  });
}

/* ---------------- scroll reveal fallback ---------------- */

let revealIO: IntersectionObserver | null = null;

/**
 * Browsers with scroll-driven animations reveal `.rv` elements in pure CSS.
 * Others get an IntersectionObserver fallback; with motion off everything is
 * simply shown.
 */
export function syncReveal(): void {
  const root = document.documentElement;
  const native = CSS.supports('animation-timeline: view()');
  if (native) return;
  if (!motionOK()) {
    revealIO?.disconnect();
    root.classList.remove('io');
    return;
  }
  root.classList.add('io');
  revealIO?.disconnect();
  revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          revealIO?.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  $$('.rv:not(.in)').forEach((el) => revealIO?.observe(el));
}

/* ---------------- status clock ---------------- */

export function startClock(): void {
  const clock = document.getElementById('clock');
  const dims = document.getElementById('sysDim');
  const tick = () => {
    const d = new Date();
    if (clock)
      clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (dims) dims.textContent = `tty: ${innerWidth}x${innerHeight}`;
  };
  tick();
  window.setInterval(tick, 15000);
  window.addEventListener('resize', tick);
}
