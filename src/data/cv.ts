// The CV, in the owner's words. `null` (or a missing list) renders as a
// marked placeholder; never fill these in with guesses.

export interface Role {
  title: string | null;
  company: string;
  /** e.g. "Jun 2022 - present". */
  years: string;
  /**
   * Achievements or responsibilities. `null` renders placeholder lines; an
   * empty list renders none (a role listed by title and dates only).
   */
  points: string[] | null;
}

export interface SkillGroup {
  heading: string;
  skills: string[];
}

/**
 * Where the build writes the CV as a PDF (scripts/cv-pdf.mjs prints the
 * built /cv page to it) and where the CV page links to it.
 */
export const cvPdfPath = '/tyler-friesen-cv.pdf';

export const cv = {
  /** Two or three sentence professional summary. */
  summary:
    'I lead IT and build software: integrating enterprise systems, automating business processes and turning data into decisions. I also run Matrix Automation Solutions, building custom software and automation for small businesses.' as
      string | null,
  location: 'Ontario, Canada' as string | null,
  /** Newest first. */
  experience: [
    {
      title: 'IT Manager',
      company: 'Universal Fabricating Inc',
      years: 'Jun 2022 - present',
      points: [
        'Lead and build the internal applications the company runs on; three are in daily use: equipment inspections, labour entry with ERP integration, and vendor scorecards.',
        'Lead IT strategy, governance and budgeting for the company.',
        "Designed and built integrations between the company's business systems so data is entered once.",
        'Automated manual business processes with custom software and workflows.',
        'Run the infrastructure: networks, servers, backups, security and user support.',
        'Built reporting and business intelligence dashboards from company data.',
        'Lead technology projects across departments, from scoping to rollout.',
        'Led digital transformation initiatives that moved paper and spreadsheet processes into connected systems.',
      ],
    },
    {
      title: 'Information Technology Technician',
      company: 'Universal Fabricating Inc',
      years: 'Nov 2019 - Jul 2022',
      points: [],
    },
  ] satisfies Role[] as Role[],
  skills: [
    {
      heading: 'software',
      skills: ['Software Engineering', 'Solutions Architecture', 'Full-Stack Development'],
    },
    {
      heading: 'automation',
      skills: [
        'Business Process Automation',
        'Enterprise Systems Integration',
        'Data Engineering & Business Intelligence',
      ],
    },
    {
      heading: 'infrastructure',
      skills: ['Infrastructure & DevOps', 'IT Strategy & Governance'],
    },
    {
      heading: 'leadership',
      skills: [
        'Technology Leadership',
        'Technical Project Management',
        'Cross-Functional Team Leadership',
        'Digital Transformation',
      ],
    },
  ] satisfies SkillGroup[] as SkillGroup[],
  /** e.g. "[Program], [Institution], [Year]". Empty renders a placeholder. */
  education: ['Bachelor of Computer Science, University of Windsor, 2021'] as string[],
};
