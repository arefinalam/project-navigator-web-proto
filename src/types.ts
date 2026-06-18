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
  annualBudgetBdt: number
  ieltsStatus: 'not-planned' | 'planning' | 'completed'
  ieltsScore: number
  sponsorReady: boolean
  transcriptReady: boolean
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
