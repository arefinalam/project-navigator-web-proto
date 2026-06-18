import type { JobApplication, JobListing } from '../types'

export const jobs: JobListing[] = [
  { id: 'job-1', title: 'Junior Data Analyst', company: 'Northstar Labs', location: 'Berlin, Germany', workMode: 'Hybrid', level: 'Entry level', roleId: 'data-analyst', salaryUsd: '$58k–72k', skills: ['SQL', 'Excel', 'Data visualization'], postedAt: '2026-06-14', deadline: '2026-07-10' },
  { id: 'job-2', title: 'Product Data Analyst', company: 'Lumen Product Co.', location: 'Remote · Europe', workMode: 'Remote', level: 'Entry–mid', roleId: 'product-analyst', salaryUsd: '$68k–92k', skills: ['SQL', 'Product metrics', 'Experimentation'], postedAt: '2026-06-16', deadline: '2026-07-15' },
  { id: 'job-3', title: 'Graduate ML Engineer', company: 'Arc Intelligence', location: 'Helsinki, Finland', workMode: 'Hybrid', level: 'Graduate', roleId: 'ml-engineer', salaryUsd: '$72k–98k', skills: ['Python', 'Machine learning', 'Software engineering'], postedAt: '2026-06-12', deadline: '2026-07-08' },
  { id: 'job-4', title: 'Associate Business Analyst', company: 'Clearpath Consulting', location: 'London, UK', workMode: 'On-site', level: 'Entry level', roleId: 'business-analyst', salaryUsd: '$52k–70k', skills: ['Requirements analysis', 'Excel', 'Presentation'], postedAt: '2026-06-10', deadline: '2026-07-04' },
  { id: 'job-5', title: 'Junior UX Researcher', company: 'Fieldwork Digital', location: 'Toronto, Canada', workMode: 'Hybrid', level: 'Junior', roleId: 'ux-researcher', salaryUsd: '$60k–82k', skills: ['User interviews', 'Usability testing', 'Synthesis'], postedAt: '2026-06-17', deadline: '2026-07-18' },
]

export const defaultJobApplications: JobApplication[] = [
  { jobId: 'job-1', status: 'preparing', nextAction: 'Tailor CV project bullets', notes: '' },
]
