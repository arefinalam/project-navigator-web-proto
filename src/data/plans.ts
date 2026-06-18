import type { SubscriptionPlan } from '../types'

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
    tagline: 'A guided study-abroad plan from research to application.',
    monthlyUsd: 9,
    annualUsd: 90,
    features: ['Full study plan', 'Five-program shortlist', 'Three-way comparison', 'Document and application tracking', '30 adviser messages/month'],
    limits: { activeGoals: 1, shortlist: 5, comparisons: 3, adviserMessages: 30, documentFolders: 10, expertCredits: 0 },
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'Deeper analysis, more guidance and broader planning.',
    monthlyUsd: 19,
    annualUsd: 190,
    recommended: true,
    features: ['Everything in Essential', 'Unlimited shortlist', 'Advanced cost scenarios', '100 adviser messages/month', 'Priority data alerts'],
    limits: { activeGoals: 3, shortlist: 999, comparisons: 5, adviserMessages: 100, documentFolders: 999, expertCredits: 0 },
  },
  {
    id: 'expert',
    name: 'Expert-assisted',
    tagline: 'Digital guidance plus recurring human review.',
    monthlyUsd: 49,
    annualUsd: 490,
    features: ['Everything in Plus', 'One expert credit/month', 'Priority consultation slots', 'Expert-ready case summaries', 'Application review queue'],
    limits: { activeGoals: 5, shortlist: 999, comparisons: 5, adviserMessages: 250, documentFolders: 999, expertCredits: 1 },
  },
]
