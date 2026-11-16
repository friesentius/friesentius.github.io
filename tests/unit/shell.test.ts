import { describe, expect, it } from 'vitest';
import {
  COMMAND_NAMES,
  complete,
  execute,
  History,
  type Line,
  type Part,
  type ShellConfig,
  type ShellState,
} from '../../src/lib/shell';

const config: ShellConfig = {
  handle: 'friesentius',
  name: null,
  email: null,
  github: 'https://github.com/friesentius',
  company: { name: 'Matrix Automation Solutions', url: 'https://matrixautomate.co' },
  projects: [
    { slug: 'neokeys', summary: 'Obsidian plugin', target: 'p-neokeys', expandable: true },
    { slug: 'kanso', summary: 'Obsidian theme', target: 'p-kanso', expandable: true },
    {
      slug: 'potful',
      summary: 'Recipe site',
      target: 'p-potful',
      expandable: true,
      url: 'https://potful.io',
    },
    {
      slug: 'matrix',
      summary: 'Matrix Automation Solutions',
      target: 'matrix',
      expandable: false,
      url: 'https://matrixautomate.co',
      listing: 'matrix@',
    },
  ],
};

const state: ShellState = { theme: 'dark', motion: true, systemReducedMotion: false };

const partText = (p: Part) => (typeof p === 'string' ? p : p.text);

/** Flatten output lines to plain text, one string per line or row. */
function plain(lines: Line[]): string[] {
  return lines.flatMap((l) =>
    l.kind === 'text'
      ? [l.parts.map(partText).join('')]
      : l.rows.map(([a, b]) => `${a.map(partText).join('')} | ${b.map(partText).join('')}`),
  );
}

describe('execute', () => {
  it('ignores blank input', () => {
    expect(execute('   ', config, state)).toEqual({ lines: [], effects: [] });
  });

  it('lists every command in help', () => {
    const rows = plain(execute('help', config, state).lines);
    expect(rows).toHaveLength(COMMAND_NAMES.length);
    for (const name of [
      'help',
      'ls',
      'open',
      'cv',
      'contact',
      'whoami',
      'theme',
      'motion',
      'reboot',
      'clear',
    ]) {
      expect(rows.some((r) => r.startsWith(name))).toBe(true);
    }
  });

  it('lists projects with ls', () => {
    expect(plain(execute('ls', config, state).lines)).toEqual([
      'neokeys/ | Obsidian plugin',
      'kanso/ | Obsidian theme',
      'potful/ | Recipe site',
      'matrix@ | Matrix Automation Solutions',
    ]);
  });

  it('opens a project: expands its tile and scrolls to it', () => {
    const r = execute('open neokeys', config, state);
    expect(r.effects).toEqual([
      { type: 'expand', target: 'p-neokeys' },
      { type: 'goto', target: 'p-neokeys' },
    ]);
  });

  it('accepts cd, a trailing slash and any case', () => {
    expect(execute('cd Kanso/', config, state).effects).toContainEqual({
      type: 'goto',
      target: 'p-kanso',
    });
  });

  it('prints the external link when a project has one', () => {
    const r = execute('open potful', config, state);
    expect(plain(r.lines)[0]).toContain('potful.io');
    const line = r.lines[0];
    expect(
      line?.kind === 'text' &&
        line.parts.some((p) => typeof p !== 'string' && p.href === 'https://potful.io'),
    ).toBe(true);
  });

  it('opens matrix without expanding a tile', () => {
    expect(execute('open matrix', config, state).effects).toEqual([
      { type: 'goto', target: 'matrix' },
    ]);
  });

  it('explains open without a name or with an unknown one', () => {
    expect(plain(execute('open', config, state).lines)[0]).toMatch(/^usage: open <name>/);
    const r = execute('open nope', config, state);
    expect(plain(r.lines)).toEqual(['open: no such project: nope']);
    expect(r.effects).toEqual([]);
  });

  it('jumps to panes', () => {
    expect(execute('cv', config, state).effects).toEqual([{ type: 'goto', target: 'cv' }]);
    expect(execute('work', config, state).effects).toEqual([{ type: 'goto', target: 'work' }]);
  });

  it('shows contact links and marks a missing email as placeholder', () => {
    const r = execute('contact', config, state);
    expect(r.effects).toEqual([{ type: 'goto', target: 'contact' }]);
    const rows = r.lines[0];
    expect(rows?.kind).toBe('rows');
    if (rows?.kind !== 'rows') return;
    const email = rows.rows[2]?.[1][0];
    expect(typeof email !== 'string' && email?.placeholder).toBe(true);
    const company = rows.rows[1]?.[1][0];
    expect(typeof company !== 'string' && company?.href).toBe('https://matrixautomate.co');
  });

  it('links a real email when one is configured', () => {
    const r = execute('contact', { ...config, email: 'hi@example.com' }, state);
    const rows = r.lines[0];
    if (rows?.kind !== 'rows') throw new Error('expected rows');
    const email = rows.rows[2]?.[1][0];
    expect(typeof email !== 'string' && email?.href).toBe('mailto:hi@example.com');
  });

  it('whoami uses a placeholder until a name is set', () => {
    const r = execute('whoami', config, state);
    const line = r.lines[0];
    expect(
      line?.kind === 'text' && line.parts.some((p) => typeof p !== 'string' && p.placeholder),
    ).toBe(true);
    expect(plain(execute('whoami', { ...config, name: 'Ada' }, state).lines)[0]).toContain(
      'aka Ada.',
    );
  });

  it('reports the theme it switches to', () => {
    expect(plain(execute('theme', config, state).lines)).toEqual(['theme: light']);
    expect(plain(execute('theme', config, { ...state, theme: 'light' }).lines)).toEqual([
      'theme: dark',
    ]);
    expect(execute('theme', config, state).effects).toEqual([{ type: 'toggle-theme' }]);
  });

  it('toggles motion, but never overrides the OS setting', () => {
    expect(plain(execute('motion', config, state).lines)).toEqual(['motion: off']);
    expect(plain(execute('motion', config, { ...state, motion: false }).lines)).toEqual([
      'motion: on',
    ]);
    const locked = execute('motion', config, {
      ...state,
      motion: false,
      systemReducedMotion: true,
    });
    expect(locked.effects).toEqual([]);
  });

  it('reboots only with motion on', () => {
    expect(execute('reboot', config, state).effects).toEqual([{ type: 'reboot' }]);
    const r = execute('reboot', config, { ...state, motion: false });
    expect(r.effects).toEqual([]);
    expect(plain(r.lines)).toEqual(['reboot skipped: motion is off']);
  });

  it('clears', () => {
    expect(execute('clear', config, state)).toEqual({ lines: [], effects: [{ type: 'clear' }] });
  });

  it('reports unknown commands', () => {
    expect(plain(execute('rm -rf /', config, state).lines)).toEqual([
      'rm: command not found. try help',
    ]);
  });
});

describe('complete', () => {
  it('completes a unique command with a trailing space', () => {
    expect(complete('wh', config)).toEqual({ kind: 'replace', value: 'whoami ' });
  });

  it('lists candidates when ambiguous', () => {
    expect(complete('c', config)).toEqual({
      kind: 'candidates',
      candidates: ['cv', 'contact', 'clear'],
    });
  });

  it('extends to the common prefix', () => {
    expect(complete('co', config)).toEqual({ kind: 'replace', value: 'contact ' });
  });

  it('completes project names after open and cd', () => {
    expect(complete('open neo', config)).toEqual({ kind: 'replace', value: 'open neokeys' });
    expect(complete('cd k', config)).toEqual({ kind: 'replace', value: 'cd kanso' });
    expect(complete('open ', config)).toEqual({
      kind: 'candidates',
      candidates: ['neokeys', 'kanso', 'potful', 'matrix'],
    });
  });

  it('does nothing for empty input, no match, or other arguments', () => {
    expect(complete('', config)).toEqual({ kind: 'none' });
    expect(complete('zz', config)).toEqual({ kind: 'none' });
    expect(complete('help neo', config)).toEqual({ kind: 'none' });
  });
});

describe('History', () => {
  it('walks back and forward like a shell', () => {
    const h = new History();
    expect(h.prev()).toBeUndefined();
    h.push('ls');
    h.push('help');
    expect(h.prev()).toBe('help');
    expect(h.prev()).toBe('ls');
    expect(h.prev()).toBe('ls');
    expect(h.next()).toBe('help');
    expect(h.next()).toBe('');
  });

  it('skips blanks and immediate repeats', () => {
    const h = new History();
    h.push('ls');
    h.push('ls');
    h.push('  ');
    expect(h.prev()).toBe('ls');
    expect(h.prev()).toBe('ls');
    expect(h.next()).toBe('');
  });
});
