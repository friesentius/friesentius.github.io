// The site's command prompt, as pure logic with no DOM access.
//
// `execute` turns one input line into printable output plus a list of effects
// (navigate to a page, toggle the theme, ...). The browser layers render the
// output and carry out the effects: `src/scripts/terminal.ts` for the home
// page's full shell, `src/scripts/prompt.ts` for the one-line prompt on the
// other pages. Keeping the logic here makes every command unit-testable.

/** One run of output text. A plain string is printed as-is. */
export type Part =
  | string
  | {
      text: string;
      href?: string;
      external?: boolean;
      placeholder?: boolean;
      strong?: boolean;
      /** Colour a run like the prompt sign (`accent`) or a success message (`ok`). */
      color?: 'accent' | 'ok';
    };

export type Tone = 'plain' | 'ok' | 'err' | 'echo';

export type Line =
  { kind: 'text'; tone: Tone; parts: Part[] } | { kind: 'rows'; rows: Array<[Part[], Part[]]> };

export type Effect =
  /**
   * Go to a site path such as `/cv` or `/#contact`. When the path is the
   * current page, the browser layer scrolls to the hash's pane instead.
   */
  | { type: 'navigate'; href: string }
  | { type: 'toggle-theme' }
  | { type: 'toggle-motion' }
  | { type: 'reboot' }
  | { type: 'clear' };

export interface ShellProject {
  /** What `open` takes, e.g. `neokeys`. */
  slug: string;
  summary: string;
  /** Where `open` goes: the case study, or a pane on the home page. */
  href: string;
  /** A project with a case study (as opposed to the Matrix Automation link). */
  caseStudy: boolean;
  /** External link printed by `open`, if any. */
  url?: string;
  /** Printed by `ls` instead of `slug/`. */
  listing?: string;
}

/**
 * `home` is the full terminal on the home page (multi-line output, tables,
 * `reboot` and `clear`). `page` is the one-line prompt on every other page, so
 * its output always fits on a single wrapped line.
 */
export type ShellContext = 'home' | 'page';

export interface ShellConfig {
  context: ShellContext;
  handle: string;
  /** Owner's display name, or null while it is still a placeholder. */
  name: string | null;
  github: string;
  company: { name: string; url: string };
  projects: ShellProject[];
}

export interface ShellState {
  theme: 'light' | 'dark';
  /** Whether animations currently run. */
  motion: boolean;
  /** True when the OS asks for reduced motion, which the site always honours. */
  systemReducedMotion: boolean;
}

export interface Result {
  lines: Line[];
  effects: Effect[];
}

interface Command {
  name: string;
  usage: string;
  help: string;
  /** Contexts the command exists in; all of them when omitted. */
  only?: ShellContext;
  run: (arg: string, config: ShellConfig, state: ShellState) => Result;
}

/** Site pages that `cd` and the page commands go to. */
export const PAGES: Readonly<Record<string, { href: string; label: string }>> = {
  home: { href: '/', label: '~/' },
  work: { href: '/work', label: '~/work' },
  cv: { href: '/cv', label: '~/cv' },
  contact: { href: '/#contact', label: '~/#contact' },
};

const text = (tone: Tone, ...parts: Part[]): Line => ({ kind: 'text', tone, parts });
const strong = (t: string): Part => ({ text: t, strong: true });
const link = (url: string): Part => ({
  text: url.replace(/^https?:\/\//, ''),
  href: url,
  external: true,
});

const go = (name: keyof typeof PAGES): Result => {
  const page = PAGES[name]!;
  return {
    lines: [text('ok', `-> ${page.label}`)],
    effects: [{ type: 'navigate', href: page.href }],
  };
};

function contactRows(config: ShellConfig): Line {
  // The email address is never part of the shell's data: it lives only in
  // the Contact pane's ContactEmail component, the one place that reveals it.
  return {
    kind: 'rows',
    rows: [
      [['github'], [link(config.github)]],
      [['company'], [link(config.company.url)]],
      [['email'], ['in the contact pane']],
    ],
  };
}

function commandsFor(context: ShellContext): Command[] {
  return COMMANDS.filter((c) => !c.only || c.only === context);
}

const COMMANDS: Command[] = [
  {
    name: 'help',
    usage: 'help',
    help: 'this list',
    run: (_arg, config) => {
      const commands = commandsFor(config.context);
      if (config.context === 'home') {
        return {
          lines: [
            { kind: 'rows', rows: commands.map((c) => [[c.usage], [c.help]] as [Part[], Part[]]) },
          ],
          effects: [],
        };
      }
      const parts: Part[] = ['commands:'];
      commands.forEach((c) => parts.push(' ', strong(c.usage)));
      parts.push('. Keys 0-3 switch pages.');
      return { lines: [text('plain', ...parts)], effects: [] };
    },
  },
  {
    name: 'ls',
    usage: 'ls',
    help: 'list projects',
    run: (_arg, config) => {
      if (config.context === 'home') {
        return {
          lines: [
            {
              kind: 'rows',
              rows: config.projects.map((p) => [[p.listing ?? `${p.slug}/`], [p.summary]]),
            },
          ],
          effects: [],
        };
      }
      const parts: Part[] = [];
      config.projects.forEach((p, i) => {
        if (i) parts.push('  ');
        parts.push({ text: p.listing ?? `${p.slug}/`, href: p.href });
      });
      return { lines: [text('plain', ...parts)], effects: [] };
    },
  },
  {
    name: 'open',
    usage: 'open <name>',
    help: 'open a project (see ls)',
    run: (arg, config) => {
      if (!arg)
        return {
          lines: [text('err', 'usage: open <name>. try ', strong('ls'))],
          effects: [],
        };
      const project = config.projects.find((p) => p.slug === arg);
      if (!project) return { lines: [text('err', `open: no such project: ${arg}`)], effects: [] };
      const parts: Part[] = [`opening ${project.slug}`];
      if (project.url) parts.push(' (', link(project.url), ')');
      parts.push(' ...');
      return { lines: [text('ok', ...parts)], effects: [{ type: 'navigate', href: project.href }] };
    },
  },
  {
    name: 'home',
    usage: 'home',
    help: 'go to the home page',
    only: 'page',
    run: () => go('home'),
  },
  {
    name: 'work',
    usage: 'work',
    help: 'all projects',
    run: () => go('work'),
  },
  {
    name: 'cv',
    usage: 'cv',
    help: 'the full CV',
    run: () => go('cv'),
  },
  {
    name: 'contact',
    usage: 'contact',
    help: 'how to get in touch',
    run: (_arg, config) =>
      config.context === 'home'
        ? {
            lines: [contactRows(config)],
            effects: [{ type: 'navigate', href: PAGES.contact!.href }],
          }
        : go('contact'),
  },
  {
    name: 'whoami',
    usage: 'whoami',
    help: 'who runs this site',
    run: (_arg, config) => {
      const name: Part = config.name ?? { text: '[Full name]', placeholder: true };
      const builds = config.projects
        .filter((p) => p.caseStudy)
        .map((p) => p.slug)
        .join(', ');
      return {
        lines: [
          text(
            'plain',
            `${config.handle}, aka `,
            name,
            `. Runs ${config.company.name}. Projects: ${builds}.`,
          ),
        ],
        effects: [],
      };
    },
  },
  {
    name: 'theme',
    usage: 'theme',
    help: 'toggle light/dark',
    run: (_arg, _config, state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      return { lines: [text('ok', `theme: ${next}`)], effects: [{ type: 'toggle-theme' }] };
    },
  },
  {
    name: 'motion',
    usage: 'motion',
    help: 'toggle animations',
    run: (_arg, _config, state) => {
      if (state.systemReducedMotion) {
        return {
          lines: [text('err', 'motion: off (your system asks for reduced motion)')],
          effects: [],
        };
      }
      return {
        lines: [text('ok', `motion: ${state.motion ? 'off' : 'on'}`)],
        effects: [{ type: 'toggle-motion' }],
      };
    },
  },
  {
    name: 'reboot',
    usage: 'reboot',
    help: 'replay the boot',
    only: 'home',
    run: (_arg, _config, state) =>
      state.motion
        ? { lines: [text('ok', 'rebooting...')], effects: [{ type: 'reboot' }] }
        : { lines: [text('err', 'reboot skipped: motion is off')], effects: [] },
  },
  {
    name: 'clear',
    usage: 'clear',
    help: 'clear the screen',
    only: 'home',
    run: () => ({ lines: [], effects: [{ type: 'clear' }] }),
  },
];

/** Command names available in a context, in help order, for tab completion. */
export function commandNames(context: ShellContext): string[] {
  return commandsFor(context).map((c) => c.name);
}

/** `cd` goes to a page (`cd cv`, `cd ~`, `cd ..`) or, failing that, opens a project. */
function cd(arg: string, config: ShellConfig, state: ShellState): Result {
  if (!arg || arg === '~' || arg === '/') return go('home');
  if (arg === '..') return config.context === 'page' ? go('work') : go('home');
  if (Object.hasOwn(PAGES, arg)) return go(arg as keyof typeof PAGES);
  return COMMANDS.find((c) => c.name === 'open')!.run(arg, config, state);
}

export function execute(input: string, config: ShellConfig, state: ShellState): Result {
  const line = input.trim();
  if (!line) return { lines: [], effects: [] };
  const [head = '', rawArg = ''] = line.split(/\s+/);
  const name = head.toLowerCase();
  const arg = rawArg.toLowerCase().replace(/(.)\/$/, '$1');
  if (name === 'sudo') return { lines: [text('err', 'nice try.')], effects: [] };
  if (name === 'cd') return cd(arg, config, state);
  const command = commandsFor(config.context).find((c) => c.name === name);
  if (!command) {
    return {
      lines: [text('err', `${head}: command not found. try `, strong('help'))],
      effects: [],
    };
  }
  return command.run(arg, config, state);
}

export type Completion =
  | { kind: 'none' }
  | { kind: 'replace'; value: string }
  | { kind: 'candidates'; candidates: string[] };

function commonPrefix(words: string[]): string {
  let prefix = words[0] ?? '';
  for (const w of words) while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

/** Tab completion: command names first, then project names after `open`, pages too after `cd`. */
export function complete(value: string, config: ShellConfig): Completion {
  if (!value.trim()) return { kind: 'none' };
  const parts = value.split(' ');
  const last = (parts[parts.length - 1] ?? '').toLowerCase();
  const head = (parts[0] ?? '').toLowerCase();
  const slugs = config.projects.map((p) => p.slug);
  let pool: readonly string[];
  if (parts.length === 1) pool = commandNames(config.context);
  else if (parts.length === 2 && head === 'open') pool = slugs;
  else if (parts.length === 2 && head === 'cd') pool = [...Object.keys(PAGES), ...slugs];
  else return { kind: 'none' };
  const matches = pool.filter((c) => c.startsWith(last));
  if (matches.length === 0) return { kind: 'none' };
  if (matches.length === 1) {
    parts[parts.length - 1] = matches[0] ?? last;
    // A completed command gets a trailing space, ready for an argument.
    return { kind: 'replace', value: parts.join(' ') + (parts.length === 1 ? ' ' : '') };
  }
  const prefix = commonPrefix(matches);
  if (prefix.length > last.length) {
    parts[parts.length - 1] = prefix;
    return { kind: 'replace', value: parts.join(' ') };
  }
  return { kind: 'candidates', candidates: matches };
}

/** Up/down arrow history, like a shell's. */
export class History {
  private entries: string[] = [];
  private cursor = 0;

  push(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (this.entries[this.entries.length - 1] !== trimmed) this.entries.push(trimmed);
    this.cursor = this.entries.length;
  }

  /** The previous entry, or undefined when there is none. */
  prev(): string | undefined {
    if (this.cursor === 0) return this.entries.length ? this.entries[0] : undefined;
    this.cursor -= 1;
    return this.entries[this.cursor];
  }

  /** The next entry, or an empty string after the newest one. */
  next(): string {
    if (this.cursor >= this.entries.length - 1) {
      this.cursor = this.entries.length;
      return '';
    }
    this.cursor += 1;
    return this.entries[this.cursor] ?? '';
  }
}
