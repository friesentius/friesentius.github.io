import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Copy the owner has written, or a `{ placeholder }` prompt for copy they
 * still have to write. Placeholders render with a dashed underline; replace
 * `- placeholder: ...` with plain text to fill one in.
 */
const copy = z.union([z.string(), z.object({ placeholder: z.string() })]);

// One entry per project. The home page's Work pane, the boot log, the shell's
// `ls` / `open` commands, the Work index and each case study page all read
// this collection, so they cannot drift apart. Copy is the owner's own or
// written from their notes and the project's own docs; anything still
// unwritten stays a placeholder.
const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      summary: z.string(),
      // Extra summary text the owner still has to write (rendered as placeholder).
      summaryPlaceholder: z.string().optional(),
      // Expanded home-tile body.
      detail: copy,
      tags: z.array(z.string()),
      /** Drives the Work index filter chips. */
      type: z.enum(['plugin', 'theme', 'web-app', 'tooling']),
      /** Spelled-out type for the case study's meta pane, e.g. "Obsidian plugin". */
      typeLabel: z.string(),
      order: z.number().int(),
      visual: z.enum(['dial', 'kanso', 'pot', 'bars']),
      repo: z.url().optional(),
      site: z.url().optional(),
      licence: z.string().optional(),
      caseStudyLabel: z.string().default('case study'),
      /** Page path under /work/ when it differs from the entry id (`tools`). */
      route: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .optional(),
      caseStudy: z.object({
        /** One-paragraph summary under the page title. */
        intro: copy,
        /** Rows of the meta pane, after the always-known type, licence, repo and site rows. */
        facts: z.array(
          z.object({
            label: z.string(),
            value: copy,
            href: z.url().optional(),
          }),
        ),
        problem: z.array(copy),
        approach: z.array(copy),
        /**
         * Screenshot frames: a real screenshot (an image under src/assets/,
         * captured at the frame's shape, 16:10 wide or 9:18 tall) with its alt
         * text, or a placeholder until one is added.
         */
        shots: z.array(
          z.union([
            z.object({
              shape: z.enum(['wide', 'tall']),
              src: image(),
              alt: z.string().min(1),
            }),
            z.object({
              shape: z.enum(['wide', 'tall']),
              placeholder: z.string(),
            }),
          ]),
        ),
        stack: z.array(copy),
        result: z.array(copy),
      }),
    }),
});

export const collections = { projects };
