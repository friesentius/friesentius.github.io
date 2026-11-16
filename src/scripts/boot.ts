// The boot sequence: a short typed log over a fixed overlay, then a CRT
// switch-off and the panes tiling in. It plays once per browser session
// (decided before first paint in Base.astro), is skippable with any key, a
// tap or the skip button, and never runs with motion off.

import { finishTyping, typeInto } from './effects';
import { motionOK } from './prefs';

export interface BootLine {
  label: string;
  /** Right-hand value; `display` is replaced with the viewport size. */
  value?: string;
}

const root = document.documentElement;
const STEP = 165;

let timers: number[] = [];
let finished = true;
let onDone: () => void = () => {};

export function isBooting(): boolean {
  return root.classList.contains('booting');
}

function line(spec: BootLine): HTMLElement {
  const p = document.createElement('div');
  p.className = 'bl';
  const ok = document.createElement('span');
  ok.className = 'okb';
  ok.textContent = '[ ok ]';
  const label = document.createElement('span');
  label.className = 'lbl';
  label.textContent = spec.label;
  p.append(ok, label);
  const value = spec.value === 'display' ? `${innerWidth}x${innerHeight}` : spec.value;
  if (value) {
    const lead = document.createElement('span');
    lead.className = 'lead2';
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = value;
    p.append(lead, val);
  }
  return p;
}

/** Play the boot log. `done` runs once the panes are visible again. */
export function runBoot(lines: BootLine[], done: () => void): void {
  const overlay = document.getElementById('boot');
  const log = document.getElementById('bootLog');
  const bar = document.getElementById('bootBar');
  if (!overlay || !log || !bar || !motionOK()) {
    root.classList.remove('booting');
    done();
    return;
  }
  finished = false;
  onDone = done;
  try {
    sessionStorage.setItem('fs-booted', '1');
  } catch {
    // Without session storage the boot may replay on the next load; harmless.
  }
  log.replaceChildren();
  bar.style.transform = 'scaleX(0)';
  overlay.classList.remove('off');
  root.classList.remove('tiled');
  root.classList.add('booting', 'boot-live');

  // Every line is laid out up front and revealed in turn, so the log has its
  // final height from the first frame and the centred overlay never moves.
  const title = document.createElement('div');
  title.className = 'bl title';
  title.textContent = 'starting friesentius';
  const rows = lines.map(line);
  const login = document.createElement('div');
  login.className = 'bl';
  const label = document.createElement('span');
  label.className = 'lbl';
  label.textContent = 'login:';
  const who = document.createElement('span');
  who.className = 'login';
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  login.append(label, who, cursor);
  [...rows, login].forEach((r) => r.classList.add('pending'));
  log.append(title, ...rows, login);

  rows.forEach((row, i) => {
    timers.push(
      window.setTimeout(
        () => {
          row.classList.remove('pending');
          bar.style.transform = `scaleX(${(i + 1) / (rows.length + 2)})`;
        },
        120 + i * STEP,
      ),
    );
  });
  timers.push(
    window.setTimeout(
      () => {
        login.classList.remove('pending');
        typeInto(who, 'friesentius', 45, { reserve: false }, () => {
          bar.style.transform = 'scaleX(1)';
          timers.push(window.setTimeout(() => finishBoot(false), 260));
        });
      },
      120 + rows.length * STEP,
    ),
  );
}

/** End the boot now. `instant` skips the CRT switch-off. */
export function finishBoot(instant: boolean): void {
  if (finished) return;
  finished = true;
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  finishTyping();
  const overlay = document.getElementById('boot');
  const reveal = () => {
    root.classList.remove('booting', 'boot-live');
    if (motionOK()) root.classList.add('tiled');
    overlay?.classList.remove('off');
    onDone();
  };
  if (instant || !motionOK() || !overlay) {
    reveal();
    return;
  }
  overlay.classList.add('off');
  window.setTimeout(reveal, 480);
}

/** Skip on any plain key press, a tap on the overlay, or the skip button. */
export function bindSkip(): void {
  const skip = (e: Event) => {
    if (finished || !isBooting()) return;
    if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey || e.altKey)) return;
    finishBoot(false);
  };
  document.addEventListener('keydown', skip, true);
  document.getElementById('boot')?.addEventListener('pointerdown', skip);
  document.getElementById('skipBoot')?.addEventListener('click', skip);
}
