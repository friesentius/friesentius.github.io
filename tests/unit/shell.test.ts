import { describe, expect, it } from 'vitest';
import {
  commandNames,
  complete,
  execute,
  History,
  type Line,
  type Part,
  type ShellConfig,
  type ShellState,
} from '../../src/lib/shell';

const config: ShellConfig = {
  context: 'home',
  cwd: '~',
  handle: 'friesentius',
  name: null,
  github: 'https://github.com/friesentius',
  company: { name: 'Matrix Automation Solutions', url: 'https://matrixautomate.co' },
  projects: [
    { slug: 'neokeys', summary: 'Obsidian plugin', href: '/work/neokeys', caseStudy: true },
    { slug: 'kanso', summary: 'Obsidian theme', href: '/work/kanso', caseStudy: true },
    {
      slug: 'potful',
      summary: 'Recipe site',
      href: '/work/potful',
      caseStudy: true,
      url: 'https://potful.io',
    },
    {
      slug: 'matrix',
      summary: 'Matrix Automation Solutions',
      href: '/#matrix',
      caseStudy: false,
      url: 'https://matrixautomate.co',
      listing: 'matrix@',
    },
  ],
};

/** The one-line prompt on every page but home. */
const page: ShellConfig = { ...config, context: 'page', cwd: '~/work/kanso' };

/** A project whose case study route differs from its listed name. */
const withTools: ShellConfig = {
  ...config,
  projects: [
    ...config.projects,
    {
      slug: 'tools',
      aliases: ['internal-tools'],
      summary: 'Internal tools',
      href: '/work/internal-tools',
      caseStudy: true,
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
    expect(rows).toHaveLength(commandNames('home').length);
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

  it('opens a project: goes to its case study', () => {
    const r = execute('open neokeys', config, state);
    expect(r.effects).toEqual([{ type: 'navigate', href: '/work/neokeys' }]);
    expect(plain(r.lines)).toEqual(['opening neokeys ...']);
  });

  it('accepts a trailing slash and any case', () => {
    expect(execute('open Kanso/', config, state).effects).toEqual([
      { type: 'navigate', href: '/work/kanso' },
    ]);
  });

  it('cd goes to pages, home, or opens a project', () => {
    const to = (input: string, cfg = config) => execute(input, cfg, state).effects;
    expect(to('cd cv')).toEqual([{ type: 'navigate', href: '/cv' }]);
    expect(to('cd work/')).toEqual([{ type: 'navigate', href: '/work' }]);
    expect(to('cd')).toEqual([{ type: 'navigate', href: '/' }]);
    expect(to('cd ~')).toEqual([{ type: 'navigate', href: '/' }]);
    expect(to('cd ..', page)).toEqual([{ type: 'navigate', href: '/work' }]);
    expect(to('cd kanso')).toEqual([{ type: 'navigate', href: '/work/kanso' }]);
    expect(to('cd toString')).toEqual([]);
  });

  it('cd .. goes to the parent of the current page', () => {
    const up = (cwd: string, context: ShellConfig['context'] = 'page') =>
      execute('cd ..', { ...config, context, cwd }, state).effects;
    expect(up('~/work/kanso')).toEqual([{ type: 'navigate', href: '/work' }]);
    expect(up('~/work')).toEqual([{ type: 'navigate', href: '/' }]);
    expect(up('~/cv')).toEqual([{ type: 'navigate', href: '/' }]);
    expect(up('~', 'home')).toEqual([{ type: 'navigate', href: '/' }]);
  });

  it('open and cd accept a project alias as well as its listed name', () => {
    const to = (input: string) => execute(input, withTools, state).effects;
    const tools = [{ type: 'navigate', href: '/work/internal-tools' }];
    expect(to('open tools')).toEqual(tools);
    expect(to('open internal-tools')).toEqual(tools);
    expect(to('cd internal-tools/')).toEqual(tools);
    expect(plain(execute('ls', withTools, state).lines)).toContain('tools/ | Internal tools');
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

  it('opens matrix on the home page', () => {
    expect(execute('open matrix', config, state).effects).toEqual([
      { type: 'navigate', href: '/#matrix' },
    ]);
  });

  it('explains open without a name or with an unknown one', () => {
    expect(plain(execute('open', config, state).lines)[0]).toMatch(/^usage: open <name>/);
    const r = execute('open nope', config, state);
    expect(plain(r.lines)).toEqual(['open: no such project: nope']);
    expect(r.effects).toEqual([]);
  });

  it('goes to the CV and Work pages', () => {
    expect(execute('cv', config, state).effects).toEqual([{ type: 'navigate', href: '/cv' }]);
    expect(execute('work', config, state).effects).toEqual([{ type: 'navigate', href: '/work' }]);
  });

  it('shows contact links and points to the show-email control in the pane', () => {
    const r = execute('contact', config, state);
    expect(r.effects).toEqual([{ type: 'navigate', href: '/#contact' }]);
    expect(plain(r.lines)).toEqual([
      'github | github.com/friesentius',
      'company | matrixautomate.co',
      'email | use "show email" in the contact pane',
    ]);
    const rows = r.lines[0];
    if (rows?.kind !== 'rows') throw new Error('expected rows');
    const company = rows.rows[1]?.[1][0];
    expect(typeof company !== 'string' && company?.href).toBe('https://matrixautomate.co');
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

  it('keeps page-context output to one line', () => {
    for (const cmd of ['help', 'ls', 'contact', 'whoami', 'open kanso', 'cv'])
      expect(execute(cmd, page, state).lines.every((l) => l.kind === 'text')).toBe(true);
    expect(plain(execute('help', page, state).lines)[0]).toMatch(
      /^commands: help ls open <name> home/,
    );
    const ls = execute('ls', page, state).lines[0];
    expect(
      ls?.kind === 'text' &&
        ls.parts.some((p) => typeof p !== 'string' && p.href === '/work/potful'),
    ).toBe(true);
    expect(execute('home', page, state).effects).toEqual([{ type: 'navigate', href: '/' }]);
    expect(execute('contact', page, state).effects).toEqual([
      { type: 'navigate', href: '/#contact' },
    ]);
  });

  it('only has reboot and clear on the home page, and home only elsewhere', () => {
    expect(commandNames('page')).not.toContain('reboot');
    expect(commandNames('page')).not.toContain('clear');
    expect(commandNames('home')).not.toContain('home');
    expect(plain(execute('reboot', page, state).lines)).toEqual([
      'reboot: command not found. try help',
    ]);
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
    expect(complete('h', page)).toEqual({
      kind: 'candidates',
      candidates: ['help', 'home'],
    });
  });

  it('extends to the common prefix', () => {
    expect(complete('co', config)).toEqual({ kind: 'replace', value: 'contact ' });
  });

  it('completes project names after open and cd', () => {
    expect(complete('open neo', config)).toEqual({ kind: 'replace', value: 'open neokeys' });
    expect(complete('cd k', config)).toEqual({ kind: 'replace', value: 'cd kanso' });
    expect(complete('cd w', config)).toEqual({ kind: 'replace', value: 'cd work' });
    expect(complete('open ', config)).toEqual({
      kind: 'candidates',
      candidates: ['neokeys', 'kanso', 'potful', 'matrix'],
    });
  });

  it('completes project aliases after open and cd', () => {
    expect(complete('open int', withTools)).toEqual({
      kind: 'replace',
      value: 'open internal-tools',
    });
    expect(complete('cd int', withTools)).toEqual({ kind: 'replace', value: 'cd internal-tools' });
    expect(complete('open to', withTools)).toEqual({ kind: 'replace', value: 'open tools' });
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
