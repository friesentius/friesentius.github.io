# friesentius.github.io

Personal site of Tyler Friesen (friesentius): a public resume for clients, employers and other
developers, with projects, a CV and a link to
[Matrix Automation Solutions](https://matrixautomate.co).

It lives at <https://friesentius.github.io> until the planned domain,
friesentius.com, is attached.

## What it is

Pages: `/` (home), `/work` (project index), `/work/<project>` (a case study
for each of Neokeys, Kanso, Potful and internal tools) and `/cv` (the CV,
which also prints as a clean paper CV and downloads as a PDF). Any other address gets the custom 404
page (`src/pages/404.astro`): a `find` that searches the site for the missing
path and reports no matches, links home, to work and to the CV, and the same
working prompt. It is marked `noindex`, has no canonical URL and is not in
the sitemap.

The home page boots like a machine and then becomes a tiling window manager;
the other pages share its panes, top bar and toggles without the boot:

- **Boot sequence:** a short typed log that plays once per browser session.
  Any key, a tap or the skip button ends it; it never plays with motion off.
- **Workspaces:** `0` Home, `1` Work, `2` CV and `3` Contact in the top bar
  are real links, and the number keys follow them on every page.
- **Working command prompt:** `help`, `ls`, `open <project>`, `work`, `cv`,
  `contact`, `cd`, `whoami`, `theme`, `motion`, plus `reboot` and `clear` in
  the home page's full shell, with tab completion and up/down history. `open`,
  `work` and `cv` go to their pages. Every other page has a one-line prompt
  with the same commands (and `home`). On phones, tappable chips run the
  common commands.
- **Work index:** filter chips (all, plugin, theme, web app, tooling); without
  JavaScript every project is listed.
- **Light and dark themes** (following the OS until the visitor picks one),
  with a circular reveal when switching.
- **Motion:** an on-page toggle, and full `prefers-reduced-motion` support:
  with either one off there is no boot, no typing, no scrambling and no
  running animation.
- **No JavaScript needed to read it:** without JavaScript the panes are
  ordinary sections, project tiles are native `<details>`, and the prompt is
  hidden.

Copy the owner has not written yet (for now, the internal tools write-up) is
rendered with a dashed underline and the `Placeholder copy` tooltip. Never
replace it with a guess; fill it in from `src/data/site.ts`, `src/data/cv.ts`
and `src/content/projects/` (in a project file, replace a `placeholder: ...`
value with plain text).

Case study screenshots are real captures of the real product, never mockups.
Each is a WebP under `src/assets/shots/<project>/`, captured at its frame's
shape (16:10 for a wide frame, 9:18 for a phone), and listed in the project
file with its alt text; the build turns it into sized AVIF and WebP files.

The CV PDF (`/tyler-friesen-cv.pdf`) is not drawn by hand: after every build,
`scripts/cv-pdf.mjs` prints the built `/cv` page to it with Playwright's
Chromium, using the same print rules as the browser's print button. So the
build needs that browser (`npx playwright install chromium`), and `npm run dev`
does not serve the PDF; use `npm run build && npm run preview`.

The email address is never in the source or the build output. Every email row
renders `src/components/ContactEmail.astro`: a "show email" button that passes
a Cloudflare Turnstile check and then gets the address from a small Worker in
`worker/`. Until the owner sets it up (see [worker/README.md](worker/README.md))
the row reads "email coming soon".

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
  content/projects/   one Markdown file per project: the home Work pane, the
                      boot log, the shell's ls/open, the Work index and each
                      case study all read these
  data/site.ts        owner facts; unknown ones stay null and render as placeholders
  data/cv.ts          the CV entries, skills and education, and the PDF's path
  assets/shots/       the case studies' screenshots, one folder per project
  lib/shell.ts        the command prompt as pure, unit-tested logic
  lib/email.ts        the "show email" reveal logic, unit-tested
  scripts/            browser behaviour: boot, terminal, prompt, panes, effects,
                      prefs, and one module per page (work, dial, cv)
  components/         the panes and their parts
  layouts/Base.astro  document shell, plus the inline pre-paint script
  layouts/Page.astro  top bar, prompt and footer for every page but home
  pages/              index (home), work/index, work/[slug], cv, 404 and robots.txt
  data/social.ts      the social share image's path, size and alt text
scripts/og-image.mjs  renders public/og.png (the Open Graph and Twitter card)
scripts/cv-pdf.mjs    Astro integration that prints /cv to the CV PDF at build time
tests/
  unit/               Vitest tests for the shell and the email reveal
  e2e/                Playwright tests against the production build
worker/               Cloudflare Worker that reveals the email (own README)
```

## Search and sharing

Every page has a canonical URL (with the trailing slash GitHub Pages serves),
a description, and Open Graph and Twitter card tags pointing at
`public/og.png` (1200x630). The image is generated, not drawn: edit the name
or tagline in `src/data/site.ts`, run `npm run og` (it renders with the
site's own JetBrains Mono, so it does not depend on installed fonts) and
commit the PNG. `robots.txt` and the sitemap are built from `site`; the home
page also carries `Person` structured data.

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
| `npm run build`     | Build the site and CV PDF into `dist/`  |
| `npm run preview`   | Serve `dist/` locally                   |
| `npm run lint`      | ESLint and Prettier check               |
| `npm run format`    | Format everything with Prettier         |
| `npm run og`        | Regenerate `public/og.png` (share card) |
| `npm run check`     | Type check (`astro check`)              |
| `npm run test:unit` | Vitest unit tests (site and Worker)     |
| `npm run test:e2e`  | Build, then Playwright end-to-end tests |
| `npm test`          | Unit and end-to-end tests               |

The build (for the CV PDF) and the end-to-end tests need a browser:
`npx playwright install chromium`.

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
   With an Actions deploy no `CNAME` file is needed. `site` is the only place
   the domain lives: canonical URLs, Open Graph and Twitter card URLs, the
   sitemap and `robots.txt` all follow it.
