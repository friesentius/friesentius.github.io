# friesentius.github.io

Personal site of friesentius: a public resume for clients, employers and other
developers, with projects, a CV and a link to
[Matrix Automation Solutions](https://matrixautomate.co).

It lives at <https://friesentius.github.io> until the planned domain,
friesentius.com, is attached.

## What it is

The home page boots like a machine and then becomes a tiling window manager:

- **Boot sequence:** a short typed log that plays once per browser session.
  Any key, a tap or the skip button ends it; it never plays with motion off.
- **Panes:** hero, shell, work, Matrix Automation, CV and contact. Keys `1` to
  `3` jump between the Work, CV and Contact workspaces.
- **Working command prompt:** `help`, `ls`, `open <project>`, `cv`, `contact`,
  `work`, `whoami`, `theme`, `motion`, `reboot` and `clear`, with tab
  completion and up/down history. On phones, tappable chips type the common
  commands.
- **Light and dark themes** (following the OS until the visitor picks one),
  with a circular reveal when switching.
- **Motion:** an on-page toggle, and full `prefers-reduced-motion` support:
  with either one off there is no boot, no typing, no scrambling and no
  running animation.
- **No JavaScript needed to read it:** without JavaScript the panes are
  ordinary sections, project tiles are native `<details>`, and the prompt is
  hidden.

Copy the owner has not written yet (name, positioning line, CV entries, case
studies, public email) is rendered with a dashed underline and the
`Placeholder copy` tooltip. Never replace it with a guess; fill it in from
`src/data/site.ts` and `src/content/projects/`.

## Stack

- [Astro](https://astro.build) with static output: every page is plain HTML.
- [Tailwind CSS](https://tailwindcss.com) v4 for tokens and utilities; the
  design tokens live in `src/styles/global.css`.
- Interaction is a few small TypeScript modules (`src/scripts/`) shipped as
  one deferred script. No UI framework is needed yet; React islands can be
  added with `@astrojs/react` where a later page needs one.
- Animation is CSS first (keyframes, scroll-driven reveals with an
  IntersectionObserver fallback, View Transitions for the theme reveal and
  tile expansion).
- JetBrains Mono is self-hosted from `@fontsource-variable/jetbrains-mono`.

## Layout

```
src/
  content/projects/   one Markdown file per project (the Work pane, the boot
                      log and the shell's ls/open all read these)
  data/site.ts        owner facts; unknown ones stay null and render as placeholders
  lib/shell.ts        the command prompt as pure, unit-tested logic
  scripts/            browser behaviour: boot, terminal, panes, effects, prefs
  components/         the panes and their parts
  layouts/Base.astro  document shell, plus the inline pre-paint script
  pages/index.astro   the home page
tests/
  unit/               Vitest tests for the shell
  e2e/                Playwright tests against the production build
```

## Local development

Requires Node.js 22.23.4 or newer (CI uses the version in `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
```

Tip: the boot sequence plays once per browser session. Run `reboot` in the
prompt, or clear session storage, to see it again.

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run build`     | Build the static site into `dist/`      |
| `npm run preview`   | Serve `dist/` locally                   |
| `npm run lint`      | ESLint and Prettier check               |
| `npm run format`    | Format everything with Prettier         |
| `npm run check`     | Type check (`astro check`)              |
| `npm run test:unit` | Vitest unit tests                       |
| `npm run test:e2e`  | Build, then Playwright end-to-end tests |
| `npm test`          | Unit and end-to-end tests               |

The first end-to-end run needs a browser: `npx playwright install chromium`.

## Branches and deploy

- Work lands on `dev` by pull request. The CI workflow
  (`.github/workflows/ci.yml`) runs lint, type check, unit tests, the build
  and the end-to-end tests on every pull request.
- A release is a pull request from `dev` to `main`. Every push to `main` runs
  `.github/workflows/deploy.yml`, which builds the site and publishes `dist/`
  to GitHub Pages with `actions/upload-pages-artifact` and
  `actions/deploy-pages`.

One-time repository setup (done by the owner, not by the workflows):

1. **Settings > Pages > Build and deployment > Source: GitHub Actions.** The
   deploy workflow fails until this is set.
2. Later, for the custom domain: verify friesentius.com in the account's
   Pages settings, add it under Settings > Pages > Custom domain, point DNS at
   GitHub Pages, tick Enforce HTTPS, and change `site` in `astro.config.mjs`.
   With an Actions deploy no `CNAME` file is needed.
