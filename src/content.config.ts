import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One entry per project. The home page's Work pane, the boot log and the
// shell's `ls` / `open` commands all read this collection, so they cannot
// drift apart. Phase 2 adds the case-study body to each file.
const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    // Extra summary text the owner still has to write (rendered as placeholder).
    summaryPlaceholder: z.string().optional(),
    // Expanded-tile body; every word here is placeholder until phase 2.
    detailPlaceholder: z.string(),
    tags: z.array(z.string()),
    order: z.number().int(),
    visual: z.enum(['dial', 'kanso', 'pot', 'bars']),
    repo: z.url().optional(),
    site: z.url().optional(),
    caseStudyLabel: z.string().default('case study'),
  }),
});

export const collections = { projects };
