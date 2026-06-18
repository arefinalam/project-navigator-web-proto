import type { SubscriptionPlan } from '../types'

export type GatedFeature =
  | 'studyPlan'
  | 'careerPlan'
  | 'jobPreparation'
  | 'jobSearch'
  | 'shortlist'
  | 'scholarships'
  | 'roadmap'
  | 'documents'
  | 'adviser'
  | 'advancedCosts'
  | 'customDocumentFolders'
  | 'expertBooking'
  | 'priorityExperts'

export const featureMinimumPlan: Record<GatedFeature, SubscriptionPlan['id']> = {
  studyPlan: 'essential',
  careerPlan: 'essential',
  jobPreparation: 'essential',
  jobSearch: 'essential',
  shortlist: 'essential',
  scholarships: 'essential',
  roadmap: 'essential',
  documents: 'free',
  adviser: 'free',
  advancedCosts: 'plus',
  customDocumentFolders: 'plus',
  expertBooking: 'essential',
  priorityExperts: 'expert',
}

const planRank: Record<SubscriptionPlan['id'], number> = {
  free: 0,
  essential: 1,
  plus: 2,
  expert: 3,
}

export function canUseFeature(planId: SubscriptionPlan['id'], feature: GatedFeature) {
  return planRank[planId] >= planRank[featureMinimumPlan[feature]]
}

export function minimumPlanName(feature: GatedFeature) {
  return plans.find((plan) => plan.id === featureMinimumPlan[feature])?.name ?? 'a higher plan'
}

export const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Discovery',
    tagline: 'Explore the platform and build a basic plan.',
    monthlyUsd: 0,
    annualUsd: 0,
    features: ['Profile and readiness overview', 'Basic programme matches', 'One saved programme', 'Limited document center'],
    limits: { activeGoals: 1, shortlist: 1, comparisons: 1, adviserMessages: 5, documentFolders: 3, expertCredits: 0 },
  },
  {
    id: 'essential',
    name: 'Essential',
    tagline: 'One complete guided journey for study, career or job goals.',
    monthlyUsd: 9,
    annualUsd: 90,
    features: ['One active guided service', 'Study, career or job workspace', 'Document and application tracking', 'Expert booking', '30 adviser messages/month'],
    limits: { activeGoals: 1, shortlist: 5, comparisons: 3, adviserMessages: 30, documentFolders: 10, expertCredits: 0 },
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'Deeper analysis, more guidance and broader planning.',
    monthlyUsd: 19,
    annualUsd: 190,
    recommended: true,
    features: ['Everything in Essential', 'Three active services', 'Unlimited shortlist', 'Advanced analysis', '100 adviser messages/month'],
    limits: { activeGoals: 3, shortlist: 999, comparisons: 5, adviserMessages: 100, documentFolders: 999, expertCredits: 0 },
  },
  {
    id: 'expert',
    name: 'Expert-assisted',
    tagline: 'Digital guidance plus recurring human review.',
    monthlyUsd: 49,
    annualUsd: 490,
    features: ['Everything in Plus', 'Five active services', 'One expert credit/month', 'Priority consultation slots', 'Expert-ready reviews'],
    limits: { activeGoals: 5, shortlist: 999, comparisons: 5, adviserMessages: 250, documentFolders: 999, expertCredits: 1 },
  },
]
