// Build-time helpers over the projects collection, shared by every page.

import { getCollection, type CollectionEntry } from 'astro:content';
import type { ShellConfig, ShellContext } from '../lib/shell';
import { site } from './site';

export type Project = CollectionEntry<'projects'>;

/** All projects in display order. */
export async function getProjects(): Promise<Project[]> {
  return (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
}

/** The project's case study page, e.g. `/work/neokeys`. */
export const projectPath = (p: Project): string => `/work/${p.data.route ?? p.id}`;

export const host = (url: string): string => new URL(url).host;

/** Everything the prompt needs, generated from the same data as the pages. */
export function shellConfig(projects: Project[], context: ShellContext): ShellConfig {
  return {
    context,
    handle: site.handle,
    name: site.name,
    github: site.github,
    company: { name: site.company.name, url: site.company.url },
    projects: [
      ...projects.map((p) => ({
        slug: p.id,
        summary: p.data.summary,
        href: projectPath(p),
        caseStudy: true,
        url: p.data.site,
      })),
      {
        slug: 'matrix',
        summary: site.company.name,
        href: '/#matrix',
        caseStudy: false,
        url: site.company.url,
        listing: 'matrix@',
      },
    ],
  };
}

/** Serialise data for a `<script type="application/json">` block. */
export const jsonForScript = (data: unknown): string =>
  // `<` is escaped so no string in the data can close the script element.
  JSON.stringify(data).replace(/</g, '\\u003c');
