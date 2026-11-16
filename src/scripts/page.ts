// Entry point for every page but home: top bar, panes, effects and the
// one-line prompt. Page-specific behaviour lives in its own module.

import type { ShellConfig } from '../lib/shell';
import { setupChrome } from './chrome';
import { setupEmail } from './email';
import { setupScramble, startClock, startScrambleReveal, syncReveal } from './effects';
import { setupPanes } from './panes';
import { motionOK, onMotionChange } from './prefs';
import { setupPrompt } from './prompt';

export function start(): void {
  const data = JSON.parse(document.getElementById('site-data')?.textContent ?? '{}') as {
    shell: ShellConfig;
  };
  setupChrome();
  setupEmail();
  setupPanes();
  setupScramble(() => false);
  startClock();
  syncReveal();
  startScrambleReveal();
  setupPrompt(data.shell);
  onMotionChange(() => {
    if (motionOK()) startScrambleReveal();
    syncReveal();
  });
}
