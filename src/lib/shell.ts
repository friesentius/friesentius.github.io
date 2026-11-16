// The home page's command prompt, as pure logic with no DOM access.
//
// `execute` turns one input line into printable output plus a list of effects
// (scroll to a pane, toggle the theme, ...). The browser layer in
// `src/scripts/terminal.ts` renders the output and carries out the effects,
// which keeps every command unit-testable.

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
  | { type: 'goto'; target: string }
  | { type: 'expand'; target: string }
  | { type: 'toggle-theme' }
  | { type: 'toggle-motion' }
  | { type: 'reboot' }
  | { type: 'clear' };

export interface ShellProject {
  /** What `open` takes, e.g. `neokeys`. */
  slug: string;
  summary: string;
  /** Element id of the project's tile, or of its pane for `matrix`. */
  target: string;
  /** True when `open` should expand a collapsible tile. */
  expandable: boolean;
  /** External link printed by `open`, if any. */
  url?: string;
  /** Printed by `ls` instead of `slug/`. */
  listing?: string;
}

export interface ShellConfig {
  handle: string;
  /** Owner's display name, or null while it is still a placeholder. */
  name: string | null;
  email: string | null;
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
  run: (arg: string, config: ShellConfig, state: ShellState) => Result;
}

const text = (tone: Tone, ...parts: Part[]): Line => ({ kind: 'text', tone, parts });
const link = (url: string): Part => ({
  text: url.replace(/^https?:\/\//, ''),
  href: url,
  external: true,
});

function contactRows(config: ShellConfig): Line {
  const email: Part = config.email
    ? { text: config.email, href: `mailto:${config.email}` }
    : { text: '[public email address]', placeholder: true };
  return {
    kind: 'rows',
    rows: [
      [['github'], [link(config.github)]],
      [['company'], [link(config.company.url)]],
      [['email'], [email]],
    ],
  };
}

const COMMANDS: Command[] = [
  {
    name: 'help',
    usage: 'help',
    help: 'this list',
    run: () => ({
      lines: [
        {
          kind: 'rows',
          rows: COMMANDS.map((c) => [[c.usage], [c.help]] as [Part[], Part[]]),
        },
      ],
      effects: [],
    }),
  },
  {
    name: 'ls',
    usage: 'ls',
    help: 'list projects',
    run: (_arg, config) => ({
      lines: [
        {
          kind: 'rows',
          rows: config.projects.map((p) => [[p.listing ?? `${p.slug}/`], [p.summary]]),
        },
      ],
      effects: [],
    }),
  },
  {
    name: 'open',
    usage: 'open <name>',
    help: 'open a project (see ls)',
    run: (arg, config) => {
      if (!arg)
        return {
          lines: [text('err', 'usage: open <name>. try ', { text: 'ls', strong: true })],
          effects: [],
        };
      const project = config.projects.find((p) => p.slug === arg);
      if (!project) return { lines: [text('err', `open: no such project: ${arg}`)], effects: [] };
      const parts: Part[] = [`opening ${project.slug}`];
      if (project.url) parts.push(' (', link(project.url), ')');
      parts.push(' ...');
      const effects: Effect[] = project.expandable
        ? [{ type: 'expand', target: project.target }]
        : [];
      effects.push({ type: 'goto', target: project.target });
      return { lines: [text('ok', ...parts)], effects };
    },
  },
  {
    name: 'cv',
    usage: 'cv',
    help: 'jump to the CV',
    run: () => ({ lines: [text('ok', '-> cv.txt')], effects: [{ type: 'goto', target: 'cv' }] }),
  },
  {
    name: 'contact',
    usage: 'contact',
    help: 'how to get in touch',
    run: (_arg, config) => ({
      lines: [contactRows(config)],
      effects: [{ type: 'goto', target: 'contact' }],
    }),
  },
  {
    name: 'work',
    usage: 'work',
    help: 'jump to the projects',
    run: () => ({ lines: [text('ok', '-> ~/work')], effects: [{ type: 'goto', target: 'work' }] }),
  },
  {
    name: 'whoami',
    usage: 'whoami',
    help: 'who runs this site',
    run: (_arg, config) => {
      const name: Part = config.name ?? { text: '[Full name]', placeholder: true };
      const builds = config.projects
        .filter((p) => p.expandable)
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
    run: (_arg, _config, state) =>
      state.motion
        ? { lines: [text('ok', 'rebooting...')], effects: [{ type: 'reboot' }] }
        : { lines: [text('err', 'reboot skipped: motion is off')], effects: [] },
  },
  {
    name: 'clear',
    usage: 'clear',
    help: 'clear the screen',
    run: () => ({ lines: [], effects: [{ type: 'clear' }] }),
  },
];

const ALIASES: Record<string, string> = { cd: 'open' };

/** Command names in help order, for tab completion. */
export const COMMAND_NAMES: readonly string[] = COMMANDS.map((c) => c.name);

export function execute(input: string, config: ShellConfig, state: ShellState): Result {
  const line = input.trim();
  if (!line) return { lines: [], effects: [] };
  const [head = '', rawArg = ''] = line.split(/\s+/);
  const name = ALIASES[head.toLowerCase()] ?? head.toLowerCase();
  const arg = rawArg.toLowerCase().replace(/\/$/, '');
  if (name === 'sudo') return { lines: [text('err', 'nice try.')], effects: [] };
  const command = COMMANDS.find((c) => c.name === name);
  if (!command) {
    return {
      lines: [text('err', `${head}: command not found. try `, { text: 'help', strong: true })],
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

/** Tab completion: command names first, then project names after `open`/`cd`. */
export function complete(value: string, config: ShellConfig): Completion {
  if (!value.trim()) return { kind: 'none' };
  const parts = value.split(' ');
  const last = (parts[parts.length - 1] ?? '').toLowerCase();
  let pool: readonly string[];
  if (parts.length === 1) pool = COMMAND_NAMES;
  else if (parts.length === 2 && ['open', 'cd'].includes((parts[0] ?? '').toLowerCase()))
    pool = config.projects.map((p) => p.slug);
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
