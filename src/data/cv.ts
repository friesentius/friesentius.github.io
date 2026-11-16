// The CV, in the owner's words. `null` (or a missing list) renders as a
// marked placeholder; never fill these in with guesses.

export interface Role {
  title: string | null;
  company: string;
  /** e.g. "2019 - present". */
  years: string;
  /** Achievements or responsibilities. Empty renders placeholder lines. */
  points: string[];
}

export interface SkillGroup {
  heading: string;
  skills: string[];
}

export const cv = {
  /** Two or three sentence professional summary. */
  summary: null as string | null,
  location: null as string | null,
  /** Newest first. */
  experience: [
    {
      title: 'IT Manager',
      company: 'Universal Fabricating Inc',
      years: '2019 - present',
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
      skills: ['Infrastructure & DevOps', 'IT Strategy & Governance', 'Digital Transformation'],
    },
    {
      heading: 'leadership',
      skills: [
        'Technology Leadership',
        'Technical Project Management',
        'Cross-Functional Team Leadership',
      ],
    },
  ] satisfies SkillGroup[] as SkillGroup[],
  /** e.g. "[Program], [Institution], [Year]". Empty renders a placeholder. */
  education: [] as string[],
  certifications: [] as string[],
};
