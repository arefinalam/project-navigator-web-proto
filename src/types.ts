export type View =
  | 'dashboard'
  | 'explore'
  | 'program'
  | 'shortlist'
  | 'scholarships'
  | 'roadmap'
  | 'adviser'
  | 'documents'
  | 'study-plan'
  | 'career-plan'
  | 'job-preparation'
  | 'job-search'
  | 'experts'
  | 'subscription'
  | 'profile'

export type Program = {
  id: string
  university: string
  program: string
  country: string
  city: string
  flag: string
  degree: string
  duration: string
  tuition: number
  currency: string
  intake: string
  deadline: string
  match: number
  scholarship: string
  ranking: string
  description: string
  requirements: string[]
  matchReasons: string[]
  careerPaths: string[]
  accent: string
  programUrl: string
  universityUrl: string
  sourceLabel: string
  verifiedAt: string
}

export type RoadmapItem = {
  id: number
  title: string
  description: string
  due: string
  status: 'completed' | 'current' | 'upcoming'
  category: string
}

export type Scholarship = {
  id: string
  name: string
  provider: string
  countries: string[]
  coverage: string
  deadline: string
  match: number
  eligibility: string[]
  note: string
  sourceUrl: string
  sourceLabel: string
  verifiedAt: string
}

export type ChatMessage = {
  id: number
  role: 'assistant' | 'user'
  text: string
  sources?: string[]
}

export type UserProfile = {
  fullName: string
  city: string
  country: string
  goal: string
  currentDegree: string
  institution: string
  cgpa: number
  graduationYear: number
  targetDegree: string
  subject: string
  preferredIntake: string
  preferredCountries: string[]
  preferredCurrency: string
  interfaceLanguage: 'en' | 'bn'
  timezone: string
  dateFormat: 'day-first' | 'month-first' | 'iso'
  weekStartsOn: 'monday' | 'sunday'
  annualBudgetBdt: number
  ieltsStatus: 'not-planned' | 'planning' | 'completed'
  ieltsScore: number
  sponsorReady: boolean
  transcriptReady: boolean
}

export type ServiceType = 'study' | 'career' | 'job-preparation' | 'job-search'

export type ServiceState = {
  active: ServiceType[]
  selected: ServiceType
}

export type ProgramScore = {
  overall: number
  academic: number
  budget: number
  destination: number
  english: number
  funding: number
  reasons: string[]
}

export type CostEstimate = {
  tuitionBdt: number
  livingBdt: number
  applicationBdt: number
  visaTravelBdt: number
  scholarshipBdt: number
  firstYearBdt: number
  fullProgramBdt: number
  budgetGapBdt: number
}

export type AppNotification = {
  id: string
  title: string
  detail: string
  type: 'deadline' | 'profile' | 'funding' | 'recommendation'
  action: View
}

export type DocumentType = 'transcript' | 'cv' | 'ielts' | 'reference' | 'training' | 'other' | string

export type DocumentFile = {
  id: string
  name: string
  addedAt: string
}

export type UserDocument = {
  id: DocumentType
  title: string
  description: string
  required: boolean
  status: 'missing' | 'uploaded' | 'verified'
  category: 'academic' | 'application' | 'supporting'
  files: DocumentFile[]
  custom?: boolean
  // Legacy fields are retained so existing browser data can be migrated.
  fileName?: string
  uploadedAt?: string
  linkedTask: string
}

export type StudyPhaseId =
  | 'foundation'
  | 'research'
  | 'tests'
  | 'documents'
  | 'funding'
  | 'applications'
  | 'visa'
  | 'departure'

export type StudyPhase = {
  id: StudyPhaseId
  title: string
  description: string
  icon: string
  target: string
}

export type CareerRole = {
  id: string
  title: string
  family: string
  summary: string
  demand: 'Growing' | 'Strong' | 'Stable'
  salaryUsd: string
  workStyles: string[]
  coreSkills: string[]
  relatedBackgrounds: string[]
  accent: string
}

export type CareerProfile = {
  experienceLevel: 'student' | 'entry' | 'mid' | 'senior'
  careerGoal: 'first-role' | 'career-change' | 'promotion' | 'exploration'
  targetTimeline: '3-months' | '6-months' | '12-months' | 'exploring'
  workStyle: string[]
  interests: string[]
  currentSkills: string[]
  targetRoleIds: string[]
  completedTasks: string[]
}

export type JobPreparationProfile = {
  targetRoleId: string
  cvSections: Record<'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'achievements', boolean>
  portfolioItems: {
    id: string
    title: string
    type: 'project' | 'case-study' | 'writing' | 'presentation'
    status: 'idea' | 'draft' | 'ready'
  }[]
  interviewConfidence: number
  practiceSessions: number
  completedTasks: string[]
}

export type JobListing = {
  id: string
  title: string
  company: string
  location: string
  workMode: 'Remote' | 'Hybrid' | 'On-site'
  level: string
  roleId: string
  salaryUsd: string
  skills: string[]
  postedAt: string
  deadline: string
}

export type JobApplication = {
  jobId: string
  status: 'saved' | 'preparing' | 'applied' | 'interview' | 'offer' | 'closed'
  appliedAt?: string
  nextAction: string
  notes: string
}

export type ApplicationStatus =
  | 'considering'
  | 'preparing'
  | 'ready'
  | 'submitted'
  | 'interview'
  | 'offer'
  | 'rejected'

export type ApplicationRecord = {
  programId: string
  status: ApplicationStatus
  fundingStatus: 'not-started' | 'researching' | 'applied' | 'awarded'
  applicationDeadline: string
  submittedAt?: string
  notes: string
}

export type ExpertService = {
  id: string
  title: string
  durationMinutes: number
  priceUsd: number
  description: string
}

export type Expert = {
  id: string
  name: string
  title: string
  initials: string
  accent: string
  rating: number
  reviews: number
  experienceYears: number
  specializations: string[]
  countries: string[]
  languages: string[]
  education: string[]
  bio: string
  credentialsUrl: string
  services: ExpertService[]
  availability: Record<string, string[]>
}

export type ConsultationBooking = {
  id: string
  expertId: string
  serviceId: string
  date: string
  time: string
  timezone: string
  documentIds: string[]
  caseSummary: string
  consent: boolean
  status: 'confirmed' | 'completed' | 'cancelled'
  usedExpertCredit?: boolean
  expertNotes?: string
}

export type PlanId = 'free' | 'essential' | 'plus' | 'expert'

export type SubscriptionPlan = {
  id: PlanId
  name: string
  tagline: string
  monthlyUsd: number
  annualUsd: number
  recommended?: boolean
  features: string[]
  limits: {
    activeGoals: number
    shortlist: number
    comparisons: number
    adviserMessages: number
    documentFolders: number
    expertCredits: number
  }
}

export type SubscriptionState = {
  planId: PlanId
  billingCycle: 'monthly' | 'annual'
  renewsAt: string
  usage: {
    adviserMessages: number
    comparisons: number
    expertCredits: number
  }
}
