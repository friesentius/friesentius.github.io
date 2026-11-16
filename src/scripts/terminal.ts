// The browser side of the command prompt: renders output from src/lib/shell.ts
// and carries out its effects.

import { complete, execute, History, type Effect, type Line, type ShellConfig } from '../lib/shell';
import { navigate } from './chrome';
import { currentTheme, motionOK, setMotion, systemReducedMotion, toggleTheme } from './prefs';
import { renderPart } from './render';

export interface TerminalHooks {
  reboot: () => void;
}

export interface Terminal {
  run: (input: string, quiet?: boolean) => void;
  welcome: () => void;
}

const TONE_CLASS = { plain: '', ok: 'okl', err: 'err', echo: 'echo' } as const;

export function createTerminal(config: ShellConfig, hooks: TerminalHooks): Terminal | null {
  const out = document.getElementById('out');
  const form = document.getElementById('cmdForm') as HTMLFormElement | null;
  const input = document.getElementById('cmd') as HTMLInputElement | null;
  if (!out || !form || !input) return null;
  const history = new History();
  const themeBtn = document.getElementById('themeBtn');

  // Mark which edges have more output beyond them; CSS fades those edges.
  const syncFade = () => {
    const below = out.scrollHeight - out.clientHeight - out.scrollTop > 1;
    out.classList.toggle('more-above', out.scrollTop > 1);
    out.classList.toggle('more-below', below);
  };
  out.addEventListener('scroll', syncFade, { passive: true });
  new ResizeObserver(syncFade).observe(out);

  const scrollDown = () => {
    out.scrollTop = out.scrollHeight;
    syncFade();
  };

  function print(line: Line): void {
    if (line.kind === 'text') {
      const p = document.createElement('p');
      const cls = TONE_CLASS[line.tone];
      if (cls) p.className = cls;
      p.append(...line.parts.map(renderPart));
      out!.append(p);
    } else {
      const wrap = document.createElement('div');
      line.rows.forEach(([left, right], i) => {
        const row = document.createElement('div');
        row.className = 'row';
        if (motionOK()) {
          row.classList.add('enter');
          row.style.setProperty('--r', String(i));
        }
        const l = document.createElement('span');
        l.append(...left.map(renderPart));
        const r = document.createElement('span');
        r.append(...right.map(renderPart));
        row.append(l, r);
        wrap.append(row);
      });
      out!.append(wrap);
    }
    scrollDown();
  }

  function apply(effect: Effect): void {
    switch (effect.type) {
      case 'navigate':
        // A short pause lets the reply show before another page loads.
        navigate(effect.href, { delay: 260 });
        break;
      case 'toggle-theme':
        toggleTheme(themeBtn);
        break;
      case 'toggle-motion':
        setMotion(!motionOK());
        break;
      case 'reboot':
        window.setTimeout(hooks.reboot, 250);
        break;
      case 'clear':
        out!.replaceChildren();
        syncFade();
        break;
    }
  }

  function run(raw: string, quiet = false): void {
    const line = raw.trim();
    if (!line) return;
    if (!quiet) history.push(line);
    print({
      kind: 'text',
      tone: 'echo',
      parts: [{ text: '$', color: 'accent' }, ' ', { text: line, strong: true }],
    });
    const result = execute(line, config, {
      theme: currentTheme(),
      motion: motionOK(),
      systemReducedMotion: systemReducedMotion(),
    });
    result.lines.forEach(print);
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
        print({ kind: 'text', tone: 'echo', parts: [c.candidates.join('  ')] });
        e.preventDefault();
      }
    }
  });

  // Chips type themselves into the prompt, then run.
  document.querySelectorAll<HTMLButtonElement>('.chip[data-cmd]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd ?? '';
      if (!motionOK()) {
        run(cmd);
        return;
      }
      let i = 0;
      const step = () => {
        i += 1;
        input.value = cmd.slice(0, i);
        if (i < cmd.length) window.setTimeout(step, 28);
        else
          window.setTimeout(() => {
            input.value = '';
            run(cmd);
          }, 90);
      };
      step();
    });
  });

  function welcome(): void {
    out!.replaceChildren();
    print({
      kind: 'text',
      tone: 'plain',
      parts: [
        { text: 'login ok.', color: 'ok' },
        ` Welcome to ${config.handle}. Type a command, or tap one below.`,
      ],
    });
    run('help', true);
    // Start at the welcome line; on short screens the help list scrolls.
    out!.scrollTop = 0;
    syncFade();
  }

  return { run, welcome };
}
