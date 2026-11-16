// Home page entry point: wires the boot sequence, prompt, panes and effects.

import type { ShellConfig } from '../lib/shell';
import { bindSkip, finishBoot, isBooting, runBoot, type BootLine } from './boot';
import {
  finishTyping,
  setupScramble,
  startClock,
  startRotator,
  startScrambleReveal,
  syncReveal,
  typeInto,
} from './effects';
import { setupChrome } from './chrome';
import { setupPanes } from './panes';
import { motionOK, onMotionChange } from './prefs';
import { createTerminal } from './terminal';

interface SiteData {
  shell: ShellConfig;
  boot: BootLine[];
}

export function start(): void {
  const data = JSON.parse(document.getElementById('site-data')?.textContent ?? '{}') as SiteData;

  setupChrome();
  setupPanes();
  setupScramble(isBooting);
  startClock();
  const rotator = startRotator();
  syncReveal();

  let welcomed = false;
  const terminal = createTerminal(data.shell, {
    reboot: () => {
      welcomed = false;
      runBoot(data.boot, afterBoot);
    },
  });

  function afterBoot(): void {
    if (welcomed) return;
    welcomed = true;
    const tagline = document.querySelector<HTMLElement>('#tagline [data-type]');
    if (tagline && motionOK()) typeInto(tagline, tagline.textContent ?? '', 22);
    startScrambleReveal();
    terminal?.welcome();
  }

  onMotionChange(() => {
    if (!motionOK()) {
      finishTyping();
      finishBoot(true);
    } else {
      startScrambleReveal();
    }
    syncReveal();
    rotator.sync();
  });

  bindSkip();
  if (isBooting() && motionOK()) runBoot(data.boot, afterBoot);
  else {
    document.documentElement.classList.remove('booting');
    afterBoot();
  }
}
