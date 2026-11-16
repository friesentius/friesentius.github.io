// Facts about the owner that the site states. Anything the owner has not
// supplied yet stays `null` and renders as a marked placeholder; do not fill
// these in with guesses.
export const site = {
  handle: 'friesentius',
  /** Full display name. */
  name: 'Tyler Friesen' as string | null,
  /** One-line positioning statement. */
  tagline:
    'Solutions architect and full-stack engineer who turns manual processes into connected, reliable systems.' as
      string | null,
  github: 'https://github.com/friesentius',
  plannedDomain: 'friesentius.com',
  company: {
    name: 'Matrix Automation Solutions',
    url: 'https://matrixautomate.co',
    region: 'Ontario',
    /** One-line description of the company, in the owner's words. */
    blurb:
      'Matrix Automation Solutions builds custom software, systems integrations and process automation for small businesses.',
  },
  description:
    'Tyler Friesen (friesentius): solutions architect and full-stack engineer. Projects, CV and contact, and a link to Matrix Automation Solutions.',
} as const;

export type Site = typeof site;

/** "Tyler Friesen" once known, else the handle: for titles and other plain-text spots. */
export const displayName = site.name ?? site.handle;
