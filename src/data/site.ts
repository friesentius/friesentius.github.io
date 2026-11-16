// Facts about the owner that the site states. Anything the owner has not
// supplied yet stays `null` and renders as a marked placeholder; do not fill
// these in with guesses.
export const site = {
  handle: 'friesentius',
  /** Full display name. Placeholder until the owner supplies it. */
  name: null as string | null,
  /** One-line positioning statement. Placeholder until supplied. */
  tagline: null as string | null,
  /** Public contact email. Placeholder until the owner picks one. */
  email: null as string | null,
  github: 'https://github.com/friesentius',
  plannedDomain: 'friesentius.com',
  company: {
    name: 'Matrix Automation Solutions',
    url: 'https://matrixautomate.co',
    region: 'Ontario',
  },
  description:
    'Personal site of friesentius: projects, CV and contact, and a link to Matrix Automation Solutions.',
} as const;

export type Site = typeof site;
