import type { AppNotification, CostEstimate, Program, ProgramScore, UserProfile } from '../types'

export const defaultProfile: UserProfile = {
  fullName: 'Samira Rahman',
  city: 'Dhaka',
  country: 'Bangladesh',
  goal: 'Study abroad',
  currentDegree: 'BSc in Computer Science',
  institution: 'North South University',
  cgpa: 3.62,
  graduationYear: 2025,
  targetDegree: 'Master’s',
  subject: 'Data Science & AI',
  preferredIntake: 'Fall 2027',
  preferredCountries: ['Germany', 'Finland', 'Netherlands'],
  annualBudgetBdt: 2500000,
  ieltsStatus: 'planning',
  ieltsScore: 0,
  sponsorReady: false,
  transcriptReady: false,
}

const countryCosts: Record<string, { living: number, application: number, visaTravel: number }> = {
  Germany: { living: 1450000, application: 70000, visaTravel: 190000 },
  Finland: { living: 1550000, application: 65000, visaTravel: 180000 },
  Netherlands: { living: 1750000, application: 85000, visaTravel: 180000 },
}

const eurToBdt = 140

export function estimateCost(program: Program, profile: UserProfile, scholarshipPercent = 0): CostEstimate {
  const base = countryCosts[program.country] ?? { living: 1600000, application: 75000, visaTravel: 190000 }
  const tuitionBdt = program.currency === 'EUR' ? program.tuition * eurToBdt : program.tuition
  const scholarshipBdt = Math.round(tuitionBdt * scholarshipPercent / 100)
  const firstYearBdt = tuitionBdt - scholarshipBdt + base.living + base.application + base.visaTravel
  const years = Number.parseFloat(program.duration) || 2
  const fullProgramBdt = Math.round((tuitionBdt - scholarshipBdt + base.living) * years + base.application + base.visaTravel)

  return {
    tuitionBdt,
    livingBdt: base.living,
    applicationBdt: base.application,
    visaTravelBdt: base.visaTravel,
    scholarshipBdt,
    firstYearBdt,
    fullProgramBdt,
    budgetGapBdt: firstYearBdt - profile.annualBudgetBdt,
  }
}

export function scoreProgram(program: Program, profile: UserProfile): ProgramScore {
  const academic = Math.max(45, Math.min(98, Math.round(38 + profile.cgpa * 15)))
  const destination = profile.preferredCountries.includes(program.country) ? 100 : 58
  const english = profile.ieltsStatus === 'completed'
    ? Math.min(100, Math.round(55 + profile.ieltsScore * 6))
    : profile.ieltsStatus === 'planning' ? 68 : 35
  const funding = /no tuition|100%|50–100%|daad/i.test(program.scholarship) ? 92 : /50%|scholarship/i.test(program.scholarship) ? 78 : 55
  const cost = estimateCost(program, profile, funding >= 90 && program.tuition > 0 ? 50 : 0)
  const budget = cost.firstYearBdt <= profile.annualBudgetBdt
    ? 96
    : Math.max(25, Math.round(96 - ((cost.firstYearBdt - profile.annualBudgetBdt) / profile.annualBudgetBdt) * 80))
  const overall = Math.round(academic * .3 + budget * .25 + destination * .15 + english * .15 + funding * .15)
  const reasons = [
    academic >= 85 ? `Your ${profile.cgpa.toFixed(2)} CGPA creates a strong academic fit.` : 'Your academic profile meets several core requirements but remains competitive.',
    budget >= 80 ? 'The estimated first-year cost is close to your stated budget.' : 'The estimated cost exceeds your budget without meaningful funding.',
    destination === 100 ? `${program.country} is one of your preferred destinations.` : `${program.country} is outside your current preferred destination list.`,
    english >= 85 ? 'Your English-test profile is ready for this option.' : 'Completing your IELTS plan would improve application readiness.',
  ]

  return { overall, academic, budget, destination, english, funding, reasons }
}

export function buildNotifications(profile: UserProfile, strongest: Program): AppNotification[] {
  const notifications: AppNotification[] = [
    {
      id: 'new-match',
      title: `${strongest.university} is now your strongest match`,
      detail: 'Your profile settings changed the recommendation ranking.',
      type: 'recommendation',
      action: 'explore',
    },
    {
      id: 'funding',
      title: 'Two scholarship routes need early preparation',
      detail: 'Review funding requirements before finalizing your shortlist.',
      type: 'funding',
      action: 'scholarships',
    },
  ]
  if (profile.ieltsStatus !== 'completed') notifications.unshift({
    id: 'ielts',
    title: 'IELTS readiness is limiting your match score',
    detail: 'Add a completed score or continue your preparation roadmap.',
    type: 'profile',
    action: 'profile',
  })
  if (!profile.transcriptReady) notifications.push({
    id: 'transcript',
    title: 'Academic transcript is still marked incomplete',
    detail: 'Update your document readiness before application season.',
    type: 'deadline',
    action: 'roadmap',
  })
  return notifications
}

export function lakh(value: number) {
  return `BDT ${(value / 100000).toFixed(1)} lakh`
}
