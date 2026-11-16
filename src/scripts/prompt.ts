// The one-line prompt on every page but home: the same commands as the home
// shell (src/lib/shell.ts, `page` context), with the latest reply shown on a
// single status line.

import { complete, execute, History, type Effect, type Line, type ShellConfig } from '../lib/shell';
import { navigate } from './chrome';
import { currentTheme, motionOK, setMotion, systemReducedMotion, toggleTheme } from './prefs';
import { renderPart } from './render';

const TONE_CLASS = { plain: '', ok: 'okl', err: 'err', echo: '' } as const;

export function setupPrompt(config: ShellConfig): void {
  const form = document.getElementById('pForm') as HTMLFormElement | null;
  const input = document.getElementById('pIn') as HTMLInputElement | null;
  const out = document.getElementById('pOut');
  if (!form || !input || !out) return;
  const history = new History();
  const themeBtn = document.getElementById('themeBtn');

  function show(lines: Line[]): void {
    const nodes: Node[] = [];
    let tone = '';
    lines.forEach((line, i) => {
      if (i) nodes.push(document.createTextNode(' '));
      if (line.kind === 'text') {
        tone = TONE_CLASS[line.tone];
        nodes.push(...line.parts.map(renderPart));
      } else {
        line.rows.forEach(([l, r], j) => {
          if (j) nodes.push(document.createTextNode('  '));
          nodes.push(...l.map(renderPart), document.createTextNode(' '), ...r.map(renderPart));
        });
      }
    });
    out!.className = `p-out${tone ? ` ${tone}` : ''}`;
    out!.replaceChildren(...nodes);
  }

  function apply(effect: Effect): void {
    if (effect.type === 'navigate') navigate(effect.href, { delay: 260 });
    else if (effect.type === 'toggle-theme') toggleTheme(themeBtn);
    else if (effect.type === 'toggle-motion') setMotion(!motionOK());
  }

  function run(raw: string): void {
    const line = raw.trim();
    if (!line) return;
    history.push(line);
    const result = execute(line, config, {
      theme: currentTheme(),
      motion: motionOK(),
      systemReducedMotion: systemReducedMotion(),
    });
    show(result.lines);
    result.effects.forEach(apply);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      const prev = history.prev();
      if (prev !== undefined) input.value = prev;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      input.value = history.next();
      e.preventDefault();
    } else if (e.key === 'Tab' && input.value.trim()) {
      // Only claim Tab when there is something to complete, so keyboard
      // users can still tab out of an empty prompt.
      const c = complete(input.value, config);
      if (c.kind === 'replace') {
        input.value = c.value;
        e.preventDefault();
      } else if (c.kind === 'candidates') {
        show([{ kind: 'text', tone: 'plain', parts: [c.candidates.join('  ')] }]);
        e.preventDefault();
      }
    }
  });

  document.querySelectorAll<HTMLButtonElement>('.chip[data-cmd]').forEach((chip) => {
    chip.addEventListener('click', () => run(chip.dataset.cmd ?? ''));
  });
}
