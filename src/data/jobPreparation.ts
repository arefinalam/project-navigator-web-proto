import type { JobPreparationProfile } from '../types'

export const defaultJobPreparationProfile: JobPreparationProfile = {
  targetRoleId: 'data-analyst',
  cvSections: {
    summary: true,
    skills: true,
    experience: false,
    projects: true,
    education: true,
    achievements: false,
  },
  portfolioItems: [
    { id: 'portfolio-1', title: 'Customer churn analysis', type: 'project', status: 'draft' },
  ],
  interviewConfidence: 42,
  practiceSessions: 1,
  completedTasks: ['job-target', 'cv-baseline'],
}

export const jobPreparationTasks = [
  { id: 'job-target', phase: 'Positioning', title: 'Confirm one primary target role', detail: 'Tailor the preparation cycle around a specific role instead of a generic job search.' },
  { id: 'cv-baseline', phase: 'CV', title: 'Complete the CV baseline review', detail: 'Check structure, evidence, relevance and clarity before visual formatting.' },
  { id: 'cv-impact', phase: 'CV', title: 'Rewrite five bullets with evidence', detail: 'Use action, context and measurable outcome rather than duty descriptions.' },
  { id: 'portfolio-ready', phase: 'Portfolio', title: 'Publish one role-relevant case study', detail: 'Show the problem, your decisions, the work and the result.' },
  { id: 'linkedin-positioning', phase: 'Presence', title: 'Align headline and professional summary', detail: 'Make your online positioning consistent with the target role and strongest evidence.' },
  { id: 'behavioral-stories', phase: 'Interview', title: 'Prepare six behavioral stories', detail: 'Cover ownership, conflict, failure, teamwork, ambiguity and impact.' },
  { id: 'technical-practice', phase: 'Interview', title: 'Complete two role-specific practice sessions', detail: 'Practice the actual analysis, case, technical or presentation format used by employers.' },
  { id: 'mock-interview', phase: 'Interview', title: 'Complete a timed mock interview', detail: 'Review content, clarity, confidence and follow-up gaps.' },
]

export const interviewPrompts: Record<string, string[]> = {
  'data-analyst': [
    'Walk through how you would investigate a sudden drop in conversion.',
    'Explain a project where your analysis changed a decision.',
    'How do you validate the accuracy of a dashboard or report?',
  ],
  'product-analyst': [
    'Choose a product metric and explain when it could become misleading.',
    'Design an experiment for a new onboarding flow.',
    'Tell me about a time you influenced a product decision with evidence.',
  ],
  'ml-engineer': [
    'How would you monitor a model after deployment?',
    'Explain the trade-off between model quality and production reliability.',
    'Describe a difficult engineering issue you solved in an ML project.',
  ],
  'business-analyst': [
    'How do you handle conflicting stakeholder requirements?',
    'Walk through how you would improve an inefficient process.',
    'Tell me about a recommendation you presented to a resistant audience.',
  ],
  'ux-researcher': [
    'How would you choose between interviews and usability testing?',
    'Describe a research insight that changed a product direction.',
    'How do you communicate uncertainty in qualitative findings?',
  ],
}
