import type { StudyPhase } from '../types'

export const studyPhases: StudyPhase[] = [
  { id: 'foundation', title: 'Goal & feasibility', description: 'Confirm target, intake, countries, budget and sponsor capacity.', icon: '◎', target: 'Start here' },
  { id: 'research', title: 'Research & shortlist', description: 'Build a balanced shortlist using fit, cost and career outcomes.', icon: '⌕', target: '5 programmes' },
  { id: 'tests', title: 'Tests & preparation', description: 'Complete English testing and any programme-specific preparation.', icon: 'A', target: 'IELTS 7.0' },
  { id: 'documents', title: 'Documents', description: 'Prepare verified academic and supporting application evidence.', icon: '▤', target: 'Core set ready' },
  { id: 'funding', title: 'Funding plan', description: 'Map scholarships, sponsor evidence and affordability scenarios.', icon: '$', target: 'Before applications' },
  { id: 'applications', title: 'Applications', description: 'Track preparation, submission, decisions and offer conditions.', icon: '→', target: 'Per deadline' },
  { id: 'visa', title: 'Visa & compliance', description: 'Prepare financial evidence, forms, appointment and official checks.', icon: '✓', target: 'After offer' },
  { id: 'departure', title: 'Pre-departure', description: 'Arrange housing, insurance, travel and arrival essentials.', icon: '✈', target: 'Final 8 weeks' },
]
