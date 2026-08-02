import { useEffect, useMemo, useRef, useState } from 'react'
import programsData from './data/programs.json'
import roadmapData from './data/roadmap.json'
import scholarshipsData from './data/scholarships.json'
import { usePersistentState } from './hooks/usePersistentState'
import { Autocomplete, MultiAutocomplete } from './components/Autocomplete'
import { countries, countryPreferenceDefaults, currencies, subjects, timezones, universities } from './data/referenceData'
import { defaultDocuments } from './data/documents'
import { studyPhases } from './data/studyPlan'
import { experts } from './data/experts'
import { careerRoles, careerTasks, defaultCareerProfile } from './data/careers'
import { defaultJobPreparationProfile, interviewPrompts, jobPreparationTasks } from './data/jobPreparation'
import { defaultJobApplications, jobs } from './data/jobs'
import { destinationInsights } from './data/destinationInsights'
import { canUseFeature, minimumPlanName, plans, type GatedFeature } from './data/plans'
import { bdtToPreferred, buildNotifications, defaultProfile, estimateCost, formatPreferredCurrency, formatProfileCurrency, formatProfileDate, preferredToBdt, scoreProgram } from './lib/personalization'
import type { ApplicationRecord, ApplicationStatus, AppNotification, CareerProfile, CareerRole, ChatMessage, ConsultationBooking, DocumentFile, Expert, JobApplication, JobPreparationProfile, Program, ProgramScore, RoadmapItem, Scholarship, ServiceState, ServiceType, StudyPhaseId, SubscriptionPlan, SubscriptionState, UserDocument, UserProfile, View } from './types'
import './App.css'

type AuthMode = 'login' | 'signup'

const programs = programsData as Program[]
const initialRoadmap = roadmapData as RoadmapItem[]
const scholarships = scholarshipsData as Scholarship[]

const serviceMeta: Record<ServiceType, { label: string, icon: string, view: View, description: string }> = {
  study: { label: 'Study abroad', icon: '◎', view: 'study-plan', description: 'Programs, funding and applications' },
  career: { label: 'Career planning', icon: '↗', view: 'career-plan', description: 'Direction, role fit and skill growth' },
  'job-preparation': { label: 'Job preparation', icon: '▣', view: 'job-preparation', description: 'CV, evidence and interviews' },
  'job-search': { label: 'Job search', icon: '⌕', view: 'job-search', description: 'Opportunities and applications' },
}

function serviceFromGoal(goal: string): ServiceType {
  if (goal === 'Career planning') return 'career'
  if (goal === 'Job preparation') return 'job-preparation'
  if (goal === 'Job search') return 'job-search'
  return 'study'
}

const careerBundle: ServiceType[] = ['career', 'job-preparation', 'job-search']

function servicesForGoal(goal: string): ServiceType[] {
  return goal === 'Career planning' ? careerBundle : ['study']
}

function planningTrackCount(active: ServiceType[]) {
  return Number(active.includes('study')) + Number(active.some((service) => careerBundle.includes(service)))
}

const bn: Record<string, string> = {
  Overview: 'সারসংক্ষেপ', 'Study plan': 'স্টাডি প্ল্যান', 'Career plan': 'ক্যারিয়ার প্ল্যান',
  'Job preparation': 'চাকরির প্রস্তুতি', 'Job search': 'চাকরি খোঁজা', Documents: 'ডকুমেন্টস',
  'Ask Navigator': 'নেভিগেটরকে জিজ্ঞাসা', 'Expert consultations': 'বিশেষজ্ঞ পরামর্শ',
  'Plans & usage': 'প্ল্যান ও ব্যবহার', 'My profile': 'আমার প্রোফাইল', 'Log out': 'লগ আউট',
  Scholarships: 'স্কলারশিপ', 'My roadmap': 'আমার রোডম্যাপ', 'Explore programs': 'প্রোগ্রাম খুঁজুন',
  'Shortlist & comparison': 'শর্টলিস্ট ও তুলনা', 'Document center': 'ডকুমেন্ট সেন্টার',
}

function translate(profile: UserProfile, text: string) {
  return profile.interfaceLanguage === 'bn' ? (bn[text] ?? text) : text
}

function useAccessibleModal(onClose: () => void) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const modal = ref.current
    if (!modal) return
    const previous = document.activeElement as HTMLElement | null
    const focusable = () => [...modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')]
    focusable()[0]?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [onClose])
  return ref
}

function normalizeDocuments(saved: UserDocument[]) {
  const normalized = defaultDocuments.map((template) => {
    const current = saved.find((item) => item.id === template.id)
    if (!current) return template
    const files = current.files ?? (current.fileName ? [{ id: `${current.id}-legacy`, name: current.fileName, addedAt: current.uploadedAt ?? 'Previously added' }] : [])
    return { ...template, ...current, files, status: files.length ? current.status : 'missing' } as UserDocument
  })
  const custom = saved.filter((item) => item.custom).map((item) => ({
    ...item,
    category: item.category ?? 'supporting',
    files: item.files ?? (item.fileName ? [{ id: `${item.id}-legacy`, name: item.fileName, addedAt: item.uploadedAt ?? 'Previously added' }] : []),
  }))
  return [...normalized, ...custom]
}

function Logo({ onClick }: { onClick?: () => void } = {}) {
  const content = <><span className="brand-mark">N</span><span>Project <strong>Navigator</strong></span></>
  if (onClick) return <button className="brand logo-button" aria-label="Project Navigator home" onClick={onClick}>{content}</button>
  return (
    <div className="brand" aria-label="Project Navigator">
      {content}
    </div>
  )
}

function ExternalLink({ href, children, className = '' }: { href: string, children: React.ReactNode, className?: string }) {
  return <a className={`external-link ${className}`} href={href} target="_blank" rel="noreferrer noopener">{children} <span aria-hidden="true">↗</span></a>
}

function PublicLanding({ onStart, onDemo }: { onStart: () => void, onDemo: () => void }) {
  return <main className="landing-page">
    <header className="landing-nav"><Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} /><nav aria-label="Public navigation"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#plans">Plans</a></nav><div><button className="text-button" onClick={onStart}>Log in</button><button className="primary small" onClick={onStart}>Build my plan</button></div></header>
    <section className="landing-hero">
      <div><span className="eyebrow">Important decisions, made navigable</span><h1>A personal route from “maybe” to <em>ready.</em></h1><p>Plan study, career and job goals, build evidence, track applications, and bring in expert help—without losing the thread.</p><div className="landing-actions"><button className="primary" onClick={onStart}>Create my guidance profile →</button><button className="secondary" onClick={onDemo}>Explore the demo</button></div><small>No payment required · Prototype data stays in this browser</small></div>
      <div className="landing-preview" aria-label="Product preview"><div className="preview-head"><span>Samira’s study plan</span><strong>74% ready</strong></div><div className="preview-route"><span className="done">✓</span><div><strong>Profile and goals</strong><small>Complete</small></div></div><div className="preview-route"><span className="active">2</span><div><strong>Research and shortlist</strong><small>3 strong programme matches</small></div></div><div className="preview-route"><span>3</span><div><strong>Tests and documents</strong><small>IELTS is the next priority</small></div></div><div className="preview-match"><small>Strongest current match</small><strong>Technical University of Munich</strong><span>88% profile fit · budget needs funding</span></div></div>
    </section>
    <section className="landing-proof"><span>One connected workspace for</span><div><strong>Programme discovery</strong><strong>Funding strategy</strong><strong>Application tracking</strong><strong>Expert review</strong></div></section>
    <section className="landing-section" id="how-it-works"><span className="eyebrow">How it works</span><h2>Guidance that changes when your reality changes.</h2><div className="landing-steps">{[['01','Map your profile','Add your academic background, budget, destinations and target intake.'],['02','See the trade-offs','Compare fit, funding pressure, readiness gaps and practical next steps.'],['03','Follow one plan','Track documents, applications, expert reviews, visa and departure work.']].map(([number,title,text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="landing-section landing-features" id="features"><div><span className="eyebrow light">Built for consequential choices</span><h2>More than a list of universities.</h2><p>Navigator connects recommendations to the work required to make them possible.</p></div><div className="feature-list"><article><span>✦</span><strong>Profile-aware matching</strong><p>Recommendations recalculate around academics, budget, destinations and readiness.</p></article><article><span>◇</span><strong>Application workspace</strong><p>Move from shortlist to documents, funding, submission, visa and departure.</p></article><article><span>◎</span><strong>Human review when needed</strong><p>Prepare a structured case and selectively share it with an expert.</p></article></div></section>
    <section className="landing-cta" id="plans"><span className="eyebrow">Start with the free discovery plan</span><h2>Your next decision should feel smaller than your whole future.</h2><button className="primary" onClick={onStart}>Start building my plan →</button></section>
    <footer className="landing-footer"><Logo /><span>Global study, career and job guidance prototype · 2026</span></footer>
  </main>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (isNew: boolean) => void }) {
  const [showAuth, setShowAuth] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please complete all required fields.')
      return
    }
    setLoading(true)
    window.setTimeout(() => {
      localStorage.setItem('navigator-session', JSON.stringify({ name: name || 'Samira Rahman', email }))
      onAuthenticated(mode === 'signup')
    }, 450)
  }

  const useDemo = () => {
    localStorage.setItem('navigator-session', JSON.stringify({ name: 'Samira Rahman', email: 'demo@navigator.app' }))
    onAuthenticated(false)
  }

  if (!showAuth) return <PublicLanding onStart={() => setShowAuth(true)} onDemo={useDemo} />

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Logo onClick={() => setShowAuth(false)} />
        <div className="auth-copy">
          <span className="eyebrow light">Your ambition, mapped.</span>
          <h1>Build a future that fits <em>you.</em></h1>
          <p>Evidence-backed study and career guidance, transformed into a roadmap you can actually follow.</p>
        </div>
        <div className="trust-row">
          <div><strong>12K+</strong><span>Programs mapped</span></div>
          <div><strong>42</strong><span>Destination countries</span></div>
          <div><strong>94%</strong><span>Guidance satisfaction</span></div>
        </div>
        <div className="story-orbit orbit-one" />
        <div className="story-orbit orbit-two" />
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <button className="auth-back" onClick={() => setShowAuth(false)}>← Back to overview</button>
          <span className="mobile-brand"><Logo onClick={() => setShowAuth(false)} /></span>
          <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</span>
          <h2>{mode === 'login' ? 'Continue your roadmap' : 'Create your free profile'}</h2>
          <p className="muted">{mode === 'login' ? 'Sign in to review your next best action.' : 'It takes about five minutes to get your first guidance.'}</p>

          <div className="auth-tabs" role="tablist">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Log in</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError('') }}>Sign up</button>
          </div>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
            )}
            <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary wide" type="submit" disabled={loading}>{loading ? 'Preparing your workspace…' : mode === 'login' ? 'Log in' : 'Create my profile'} <span>{loading ? '◌' : '→'}</span></button>
          </form>

          <button className="demo-login" onClick={useDemo}>Use demo account</button>
          <p className="legal">Prototype only — your information stays in this browser.</p>
        </div>
      </section>
    </main>
  )
}

function Onboarding({ profile, career, onComplete, onExit }: { profile: UserProfile, career: CareerProfile, onComplete: (profile: UserProfile, career: CareerProfile) => void, onExit: () => void }) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState(profile)
  const [careerDraft, setCareerDraft] = useState(career)
  const steps = ['Your goal', 'Education', 'Preferences']
  const careerTrack = draft.goal === 'Career planning'
  const toggleCareerValue = (field: 'workStyle' | 'interests' | 'currentSkills', value: string) => setCareerDraft((current) => ({
    ...current,
    [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
  }))

  return (
    <main className="onboarding-page">
      <header><Logo onClick={onExit} /><span className="step-label">Profile setup · {step} of 3</span></header>
      <div className="onboarding-shell">
        <div className="stepper">
          {steps.map((item, index) => <div className={index + 1 <= step ? 'done' : ''} key={item}><span>{index + 1}</span>{item}</div>)}
        </div>
        <section className="onboarding-card">
          {step === 1 && <>
            <span className="eyebrow">Let’s begin</span>
            <h1>What would you like help with?</h1>
            <p className="muted">Choose one planning track. Career Planning includes career direction, job preparation and job search.</p>
            <div className="choice-grid">
              {['Study abroad', 'Career planning'].map((item) =>
                <button className={draft.goal === item ? 'selected' : ''} onClick={() => setDraft({ ...draft, goal: item })} key={item}>
                  <span className="choice-icon">{item === 'Study abroad' ? '✦' : '↗'}</span>
                  <strong>{item}</strong><small>{item === 'Study abroad' ? 'Programs, destination life, funding and applications' : 'Career direction, CV, interview preparation and job search'}</small>
                </button>)}
            </div>
          </>}
          {step === 2 && <>
            <span className="eyebrow">{draft.goal === 'Study abroad' ? 'Your academic direction' : 'Your current background'}</span>
            <h1>{draft.goal === 'Study abroad' ? 'What do you want to study?' : 'What experience are you bringing?'}</h1>
            <div className="field-grid">
              <label>{careerTrack ? 'Highest/current degree' : 'Target degree'}<select value={draft.targetDegree} onChange={(e) => setDraft({ ...draft, targetDegree: e.target.value })}><option>Master’s</option><option>Bachelor’s</option><option>PhD</option></select></label>
              <Autocomplete label={draft.goal === 'Study abroad' ? 'Subject area' : 'Background area'} value={draft.subject} options={subjects} onChange={(subject) => setDraft({ ...draft, subject })} placeholder="Start typing a subject" />
              {careerTrack && <><label>Current degree or role<input value={draft.currentDegree} onChange={(e) => setDraft({ ...draft, currentDegree: e.target.value })} /></label><Autocomplete label="Institution or employer" value={draft.institution} options={universities} onChange={(institution) => setDraft({ ...draft, institution })} placeholder="Institution or employer" /><label>Experience level<select value={careerDraft.experienceLevel} onChange={(event) => setCareerDraft({ ...careerDraft, experienceLevel: event.target.value as CareerProfile['experienceLevel'] })}><option value="student">Student</option><option value="entry">Entry level</option><option value="mid">Mid-career</option><option value="senior">Senior</option></select></label><label>Career objective<select value={careerDraft.careerGoal} onChange={(event) => setCareerDraft({ ...careerDraft, careerGoal: event.target.value as CareerProfile['careerGoal'] })}><option value="first-role">Find my first role</option><option value="career-change">Change career</option><option value="promotion">Prepare for progression</option><option value="exploration">Explore options</option></select></label></>}
              <label>Current CGPA<input type="number" min="0" max="4" step=".01" value={draft.cgpa} onChange={(e) => setDraft({ ...draft, cgpa: Number(e.target.value) })} /></label>
              <label>Graduation year<input type="number" value={draft.graduationYear} onChange={(e) => setDraft({ ...draft, graduationYear: Number(e.target.value) })} /></label>
            </div>
          </>}
          {step === 3 && <>
            <span className="eyebrow">Make it realistic</span>
            <h1>Tell us what matters to you</h1>
            {!careerTrack ? <div className="field-grid">
              <label>Preferred intake<select value={draft.preferredIntake} onChange={(e) => setDraft({ ...draft, preferredIntake: e.target.value })}><option>Fall 2027</option><option>Spring 2027</option><option>Fall 2028</option></select></label>
              <label>Preferred currency<select value={draft.preferredCurrency} onChange={(e) => setDraft({ ...draft, preferredCurrency: e.target.value })}>{currencies.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.label}</option>)}</select></label>
              <label>Annual budget ({draft.preferredCurrency})<input type="number" step="1000" value={bdtToPreferred(draft.annualBudgetBdt, draft.preferredCurrency)} onChange={(e) => setDraft({ ...draft, annualBudgetBdt: preferredToBdt(Number(e.target.value), draft.preferredCurrency) })} /></label>
              <MultiAutocomplete label="Preferred destinations" values={draft.preferredCountries} options={countries} onChange={(preferredCountries) => setDraft({ ...draft, preferredCountries })} />
              <label>English test<select value={draft.ieltsStatus} onChange={(e) => setDraft({ ...draft, ieltsStatus: e.target.value as UserProfile['ieltsStatus'] })}><option value="planning">Planning IELTS</option><option value="completed">IELTS completed</option><option value="not-planned">Not planned</option></select></label>
              <label>Interface language<select value={draft.interfaceLanguage} onChange={(e) => setDraft({ ...draft, interfaceLanguage: e.target.value as UserProfile['interfaceLanguage'] })}><option value="en">English</option><option value="bn">বাংলা</option></select></label>
              <label>Timezone<select value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>{timezones.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></label>
            </div> : <div className="career-onboarding-preferences">
              <div className="field-grid"><Autocomplete label="Current country" value={draft.country} options={countries} onChange={(country) => setDraft({ ...draft, country })} placeholder="Current country" /><label>Target timeline<select value={careerDraft.targetTimeline} onChange={(event) => setCareerDraft({ ...careerDraft, targetTimeline: event.target.value as CareerProfile['targetTimeline'] })}><option value="3-months">Within 3 months</option><option value="6-months">Within 6 months</option><option value="12-months">Within 12 months</option><option value="exploring">Still exploring</option></select></label><label>Interface language<select value={draft.interfaceLanguage} onChange={(e) => setDraft({ ...draft, interfaceLanguage: e.target.value as UserProfile['interfaceLanguage'] })}><option value="en">English</option><option value="bn">বাংলা</option></select></label><label>Timezone<select value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>{timezones.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></label></div>
              <CareerChoiceGroup title="Preferred work style" options={['Analytical work', 'Deep technical work', 'Cross-team collaboration', 'Client-facing work', 'Human-centered work', 'Continuous learning', 'Technology products', 'Research']} values={careerDraft.workStyle} onToggle={(value) => toggleCareerValue('workStyle', value)} />
              <CareerChoiceGroup title="Career interests" options={['Data and insights', 'Technology products', 'Business strategy', 'AI systems', 'People and behavior', 'Design and research']} values={careerDraft.interests} onToggle={(value) => toggleCareerValue('interests', value)} />
              <CareerChoiceGroup title="Current skills" options={['Python', 'SQL', 'Excel', 'Statistics', 'Data visualization', 'Machine learning', 'Software engineering', 'Presentation', 'Stakeholder communication', 'Research design']} values={careerDraft.currentSkills} onToggle={(value) => toggleCareerValue('currentSkills', value)} />
            </div>}
          </>}
          <div className="onboarding-actions">
            <button className="text-button" onClick={() => step === 1 ? onExit() : setStep((value) => value - 1)}>← Back</button>
            <button className="primary" onClick={() => step < 3 ? setStep((value) => value + 1) : onComplete(draft, careerDraft)}>
              {step < 3 ? 'Continue' : 'Build my roadmap'} →
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function Sidebar({ view, setView, onLogout, documentCount, planId, onLocked, profile, services, onServiceChange }: { view: View, setView: (view: View) => void, onLogout: () => void, documentCount: number, planId: SubscriptionPlan['id'], onLocked: (feature: GatedFeature) => void, profile: UserProfile, services: ServiceState, onServiceChange: (service: ServiceType) => void }) {
  const planName = plans.find((plan) => plan.id === planId)?.name ?? 'Discovery'
  const initials = profile.fullName.split(' ').map((item) => item[0]).slice(0, 2).join('').toUpperCase()
  const links: { id: View, label: string, icon: string, feature?: GatedFeature, service?: ServiceType }[] = [
    { id: 'dashboard', label: 'Overview', icon: '⌂' },
    { id: 'study-plan', label: 'Study plan', icon: '◎', feature: 'studyPlan', service: 'study' },
    { id: 'explore', label: 'Explore programs', icon: '⌕', service: 'study' },
    { id: 'shortlist', label: 'Shortlist & compare', icon: '◇', feature: 'shortlist', service: 'study' },
    { id: 'scholarships', label: 'Scholarships', icon: '$', feature: 'scholarships', service: 'study' },
    { id: 'roadmap', label: 'My roadmap', icon: '✓', feature: 'roadmap', service: 'study' },
    { id: 'career-plan', label: 'Career plan', icon: '↗', feature: 'careerPlan', service: 'career' },
    { id: 'job-preparation', label: 'Job preparation', icon: '▣', feature: 'jobPreparation', service: 'job-preparation' },
    { id: 'job-search', label: 'Job search', icon: '⌕', feature: 'jobSearch', service: 'job-search' },
    { id: 'documents', label: 'Documents', icon: '▤', feature: 'documents' },
    { id: 'adviser', label: 'Ask Navigator', icon: '✦', feature: 'adviser' },
    { id: 'experts', label: 'Expert consultations', icon: '◉', feature: 'expertBooking' },
    { id: 'subscription', label: 'Plans & usage', icon: '◆' },
    { id: 'profile', label: 'My profile', icon: '○' },
  ]
  return (
    <aside className="sidebar">
      <Logo />
      <label className="service-switcher"><span>{translate(profile, 'Workspace')}</span><select value={services.selected} onChange={(event) => onServiceChange(event.target.value as ServiceType)}>{services.active.map((service) => <option value={service} key={service}>{serviceMeta[service].label}</option>)}</select></label>
      <nav>
        <span className="nav-label">{translate(profile, 'Workspace')}</span>
        {links.filter((link) => !link.service || link.service === services.selected).map((link) => {
          const locked = Boolean(link.feature && !canUseFeature(planId, link.feature))
          return <button key={link.id} className={`${view === link.id || (view === 'program' && link.id === 'explore') ? 'active' : ''} ${locked ? 'locked-nav' : ''}`} onClick={() => locked && link.feature ? onLocked(link.feature) : setView(link.id)}><span>{link.icon}</span>{translate(profile, link.label)}{locked && <em className="lock-badge">⌁</em>}{link.id === 'documents' && !locked && documentCount > 0 && <em className="nav-badge">{documentCount}</em>}</button>
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="mini-profile"><span>{initials}</span><div><strong>{profile.fullName}</strong><small>{planName} plan</small></div></div>
        <button className="logout" onClick={onLogout}>{translate(profile, 'Log out')}</button>
      </div>
    </aside>
  )
}

function Topbar({ title, notifications = [], onNotification }: { title: string, notifications?: AppNotification[], onNotification?: (item: AppNotification) => void }) {
  const [open, setOpen] = useState(false)
  const savedProfile = JSON.parse(localStorage.getItem('navigator-profile') || '{}') as Partial<UserProfile>
  const savedSession = JSON.parse(localStorage.getItem('navigator-session') || '{}') as { name?: string }
  const name = savedProfile.fullName || savedSession.name || 'User'
  const initials = name.split(' ').map((item) => item[0]).slice(0, 2).join('').toUpperCase()
  const displayTitle = savedProfile.interfaceLanguage === 'bn' ? (bn[title] ?? title) : title
  return <header className="topbar"><div><span className="mobile-logo"><Logo /></span><h1>{displayTitle}</h1></div><div className="top-actions"><button aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>♢{notifications.length > 0 && <span className="notification-dot" />}</button><div className="avatar" aria-label={name}>{initials}</div>{open && <div className="notification-menu"><div className="notification-title"><strong>Notifications</strong><span>{notifications.length} new</span></div>{notifications.length ? notifications.map((item) => <button className="notification-item" key={item.id} onClick={() => { onNotification?.(item); setOpen(false) }}><span className={`notice-icon ${item.type}`}>{item.type === 'funding' ? '$' : item.type === 'deadline' ? '!' : item.type === 'profile' ? '○' : '✦'}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></button>) : <div className="notification-empty"><span>✓</span><strong>You’re caught up</strong><small>New guidance alerts will appear here.</small></div>}</div>}</div></header>
}

function ProgramCard({ program, score, profile, onOpen, saved, compared, onSave, onCompare, saveDisabled = false, compareDisabled = false }: {
  program: Program
  score: ProgramScore
  profile: UserProfile
  onOpen: () => void
  saved: boolean
  compared: boolean
  onSave: () => void
  onCompare: () => void
  saveDisabled?: boolean
  compareDisabled?: boolean
}) {
  return (
    <article className="program-card">
      <div className="program-top">
        <div className="uni-logo" style={{ background: program.accent }}>{program.university.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
        <div className="card-actions">
          <button className={saved ? 'saved' : ''} disabled={saveDisabled && !saved} onClick={onSave} aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'} title={saveDisabled && !saved ? 'Your current plan shortlist limit has been reached.' : ''}>{saved ? '♥' : '♡'}</button>
          <div className="match-ring" style={{ '--score': `${score.overall * 3.6}deg` } as React.CSSProperties}><span>{score.overall}%</span></div>
        </div>
      </div>
      <span className="country">{program.flag} {program.city}, {program.country}</span>
      <h3>{program.program}</h3>
      <p>{program.university}</p>
      <div className="tag-row"><span>{program.degree}</span><span>{program.duration}</span><span>{program.intake}</span></div>
      <div className="program-meta">
        <div><small>Annual tuition</small><strong>{formatProfileCurrency(estimateCost(program, profile).tuitionBdt, profile)}</strong></div>
        <div><small>Deadline</small><strong>{program.deadline}</strong></div>
      </div>
      <div className="score-mini"><span>Academic {score.academic}%</span><span>Budget {score.budget}%</span></div>
      <ExternalLink href={program.programUrl} className="card-source">Official programme page</ExternalLink>
      <div className="program-card-footer">
        <label className={compareDisabled && !compared ? 'disabled-control' : ''}><input type="checkbox" disabled={compareDisabled && !compared} checked={compared} onChange={onCompare} /> Compare</label>
        <button onClick={onOpen}>View match <span>→</span></button>
      </div>
    </article>
  )
}

function Dashboard({ setView, openProgram, savedIds, compareIds, toggleSaved, toggleCompare, profile, scores, notifications, plan, services, onSelectService, onAddService, career, preparation, jobApplications }: {
  setView: (view: View) => void
  openProgram: (program: Program) => void
  savedIds: string[]
  compareIds: string[]
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  profile: UserProfile
  scores: Record<string, ProgramScore>
  notifications: AppNotification[]
  plan: SubscriptionPlan
  services: ServiceState
  onSelectService: (service: ServiceType) => void
  onAddService: (service: ServiceType) => void
  career: CareerProfile
  preparation: JobPreparationProfile
  jobApplications: JobApplication[]
}) {
  const topPrograms = [...programs].sort((a, b) => scores[b.id].overall - scores[a.id].overall).slice(0, 3)
  const readiness = Math.round((profile.cgpa / 4 * 35) + (profile.ieltsStatus === 'completed' ? 30 : profile.ieltsStatus === 'planning' ? 18 : 5) + (profile.transcriptReady ? 20 : 8) + (profile.sponsorReady ? 15 : 7))
  const careerRole = careerRoles.find((role) => career.targetRoleIds.includes(role.id)) ?? careerRoles[0]
  const cvReady = Math.round(Object.values(preparation.cvSections).filter(Boolean).length / 6 * 100)
  const serviceContent = {
    study: { readiness, label: 'Application readiness', title: 'Build a realistic study-abroad route.', text: 'Your profile shapes programme matches, costs, funding and next actions.', action: 'Create or update your IELTS plan', actionText: 'Complete the next academic-readiness task before applications.', actionView: 'roadmap' as View },
    career: { readiness: Math.round((career.targetRoleIds.length / 3 * 35) + (career.currentSkills.length / 10 * 30) + (career.completedTasks.length / careerTasks.length * 35)), label: 'Career direction readiness', title: 'Turn career ideas into evidence.', text: `Your current primary direction is ${careerRole.title}.`, action: 'Validate your priority skill gap', actionText: 'Choose the next skill and connect it to a project or work example.', actionView: 'career-plan' as View },
    'job-preparation': { readiness: Math.round(cvReady * .45 + preparation.interviewConfidence * .3 + preparation.completedTasks.length / jobPreparationTasks.length * 25), label: 'Candidate readiness', title: 'Prepare before applications become urgent.', text: `Your materials are currently tailored for ${careerRoles.find((role) => role.id === preparation.targetRoleId)?.title ?? careerRole.title}.`, action: 'Strengthen one evidence gap', actionText: 'Improve a CV section, portfolio item or interview story today.', actionView: 'job-preparation' as View },
    'job-search': { readiness: Math.min(100, 25 + jobApplications.length * 15), label: 'Search momentum', title: 'Run a focused, trackable job search.', text: 'Match opportunities to your chosen role and keep every next action visible.', action: 'Review matched opportunities', actionText: 'Save a relevant role or progress an active application.', actionView: 'job-search' as View },
  }[services.selected]
  const upcoming = services.selected === 'study'
    ? [['25', 'JUN', 'IELTS plan'], ['02', 'JUL', 'Scholarship review'], ['15', 'JUL', 'Transcript verification']]
    : services.selected === 'career'
      ? [['24', 'JUN', 'Skill evidence'], ['29', 'JUN', 'Career conversation'], ['05', 'JUL', 'Direction review']]
      : services.selected === 'job-preparation'
        ? [['23', 'JUN', 'CV evidence'], ['27', 'JUN', 'Interview practice'], ['03', 'JUL', 'Portfolio review']]
        : [['22', 'JUN', 'Review saved jobs'], ['26', 'JUN', 'Tailor application'], ['01', 'JUL', 'Follow-up review']]
  const bestProgram = topPrograms[0]
  const bestScore = bestProgram ? scores[bestProgram.id] : undefined
  const flowSteps: Array<{ number: string, title: string, text: string, view: View, metric: string }> = services.selected === 'study'
    ? [
      { number: '01', title: 'Profile mapping', text: 'Academic result, English status, budget, subject and destination preferences are converted into a guidance profile.', view: 'profile', metric: `${Math.round(profile.cgpa / 4 * 100)}% academic signal` },
      { number: '02', title: 'Data matching', text: 'Programs are ranked by academic fit, budget pressure, career alignment and funding possibility.', view: 'explore', metric: bestScore ? `${bestScore.overall}% top match` : 'Live ranking' },
      { number: '03', title: 'Decision support', text: 'Shortlist, compare cost, check scholarships, and understand why a destination is recommended.', view: 'shortlist', metric: `${savedIds.length}/${plan.limits.shortlist === 999 ? '∞' : plan.limits.shortlist} saved` },
      { number: '04', title: 'Execution plan', text: 'The roadmap turns research into tasks: tests, documents, applications, funding, visa and departure.', view: 'study-plan', metric: `${serviceContent.readiness}% ready` },
      { number: '05', title: 'Human review', text: 'When the case is ready, the user can book an expert and share only selected documents.', view: 'experts', metric: plan.limits.expertCredits ? `${plan.limits.expertCredits} credit/month` : 'Book when needed' },
    ]
    : [
      { number: '01', title: 'Goal diagnosis', text: 'The user selects a direction and the platform maps skills, confidence, evidence and urgency.', view: 'profile', metric: `${serviceContent.readiness}% baseline` },
      { number: '02', title: 'Skill and evidence plan', text: 'Recommended tasks connect the target role to projects, CV proof and interview stories.', view: serviceContent.actionView, metric: `${career.completedTasks.length + preparation.completedTasks.length} tasks done` },
      { number: '03', title: 'Document readiness', text: 'CV, certificates, references and supporting files stay in one checklist-based workspace.', view: 'documents', metric: `${Object.values(preparation.cvSections).filter(Boolean).length}/6 CV sections` },
      { number: '04', title: 'Opportunity tracking', text: 'Applications and follow-ups become visible, so the user does not lose momentum.', view: 'job-search', metric: `${jobApplications.length} tracked` },
      { number: '05', title: 'Expert review', text: 'The user can prepare a clear case and get structured professional feedback.', view: 'experts', metric: 'Review-ready case' },
    ]
  const benefitCards = services.selected === 'study'
    ? [
      { label: 'Clear next step', value: serviceContent.action, text: 'The user does not need to guess what to do first.' },
      { label: 'Best visible option', value: bestProgram ? bestProgram.university : 'Program ranking', text: bestScore ? `${bestScore.overall}% match based on profile, budget and career fit.` : 'Program list updates from profile data.' },
      { label: 'Risk signal', value: profile.sponsorReady ? 'Funding evidence ready' : 'Funding evidence pending', text: 'The prototype highlights weak points before application deadlines.' },
    ]
    : [
      { label: 'Clear next step', value: serviceContent.action, text: 'The user sees one useful action instead of generic advice.' },
      { label: 'Target direction', value: careerRole.title, text: 'Career guidance is connected to role requirements and current skills.' },
      { label: 'Evidence readiness', value: `${cvReady}% CV ready`, text: 'Preparation focuses on proof, not only motivation.' },
    ]
  return (
    <>
      <Topbar title="Overview" notifications={notifications} onNotification={(item) => setView(item.action)} />
      <div className="page-content">
        <section className="welcome-banner">
          <div><span className="eyebrow light">{serviceMeta[services.selected].label}</span><h2>{serviceContent.title}</h2><p>{serviceContent.text}</p></div>
          <div className="readiness"><div className="large-ring" style={{ background: `conic-gradient(#79d9cc 0 ${serviceContent.readiness}%,rgba(255,255,255,.16) ${serviceContent.readiness}%)` }}><span>{serviceContent.readiness}%</span></div><div><strong>{serviceContent.label}</strong><small>Calculated from saved progress</small></div></div>
        </section>

        <div className="service-tabs">{services.active.map((service) => <button className={services.selected === service ? 'active' : ''} onClick={() => onSelectService(service)} key={service}><span>{serviceMeta[service].icon}</span><div><strong>{serviceMeta[service].label}</strong><small>{serviceMeta[service].description}</small></div></button>)}{!services.active.includes('study') && <button className="add-service" onClick={() => onAddService('study')}><span>+</span><div><strong>Add Study Abroad</strong><small>{planningTrackCount(services.active)}/{plan.limits.activeGoals} planning-track limit</small></div></button>}{!services.active.some((service) => careerBundle.includes(service)) && <button className="add-service" onClick={() => onAddService('career')}><span>+</span><div><strong>Add Career Planning</strong><small>Includes career, preparation and job search</small></div></button>}</div>

        <div className="stat-grid">
          <div className="stat-card"><span className="stat-icon blue">✦</span><div><strong>{services.selected === 'study' ? programs.filter((program) => scores[program.id].overall >= 75).length : services.selected === 'career' ? career.targetRoleIds.length : services.selected === 'job-preparation' ? Object.values(preparation.cvSections).filter(Boolean).length : jobs.length}</strong><small>{services.selected === 'study' ? 'Strong programme matches' : services.selected === 'career' ? 'Target career roles' : services.selected === 'job-preparation' ? 'CV sections ready' : 'Matched opportunities'}</small></div><em>Dynamic</em></div>
          <div className="stat-card"><span className="stat-icon green">✓</span><div><strong>{services.selected === 'career' ? `${career.completedTasks.length}/${careerTasks.length}` : services.selected === 'job-preparation' ? `${preparation.completedTasks.length}/${jobPreparationTasks.length}` : services.selected === 'job-search' ? jobApplications.length : savedIds.length}</strong><small>{services.selected === 'study' ? 'Saved programmes' : services.selected === 'job-search' ? 'Tracked applications' : 'Roadmap tasks complete'}</small></div><em>On track</em></div>
          <div className="stat-card"><span className="stat-icon amber">◷</span><div><strong>{upcoming.length}</strong><small>Upcoming actions</small></div><em>Next: {upcoming[0][0]} Jun</em></div>
        </div>

        <section className="demo-flow-panel">
          <div className="section-title">
            <div><span className="eyebrow">How it works</span><h2>From profile to guided outcome</h2></div>
            <button className="secondary" onClick={() => setView(services.selected === 'study' ? 'study-plan' : serviceContent.actionView)}>Open full workspace</button>
          </div>
          <div className="flow-rail">
            {flowSteps.map((step, index) => <button className="flow-step" onClick={() => setView(step.view)} key={step.number}>
              <span className="flow-number">{step.number}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
                <small>{step.metric}</small>
              </div>
              {index < flowSteps.length - 1 && <em aria-hidden="true">→</em>}
            </button>)}
          </div>
        </section>

        <section className="benefit-panel">
          <div className="section-title">
            <div><span className="eyebrow">How this helps the user</span><h2>Friendly guidance backed by visible data</h2></div>
            <button className="text-button" onClick={() => setView('adviser')}>Ask Navigator →</button>
          </div>
          <div className="benefit-grid">
            {benefitCards.map((item) => <article key={item.label}>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <p>{item.text}</p>
            </article>)}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel next-action">
            <div className="section-title"><div><span className="eyebrow">Priority</span><h2>Your next best action</h2></div><span className="due-pill">This week</span></div>
            <div className="action-body"><span className="action-number">01</span><div><h3>{serviceContent.action}</h3><p>{serviceContent.actionText}</p><div className="progress"><span style={{ width: `${serviceContent.readiness}%` }} /></div><small>{serviceContent.readiness}% readiness</small></div></div>
            <button className="primary" onClick={() => setView(serviceContent.actionView)}>Continue task →</button>
          </section>
          <section className="panel deadline-panel">
            <div className="section-title"><div><span className="eyebrow">Calendar</span><h2>Coming up</h2></div><button className="text-button" onClick={() => setView(serviceContent.actionView)}>View all</button></div>
            {upcoming.map((item) => <button className="deadline-row deadline-button" onClick={() => setView(serviceContent.actionView)} key={item[2]}><div className="date-box"><strong>{item[0]}</strong><small>{item[1]}</small></div><div><strong>{item[2]}</strong><small>Planned action</small></div><span>›</span></button>)}
          </section>
        </div>

        {services.selected === 'study' && <section className="recommend-section">
          <div className="section-title"><div><span className="eyebrow">Recommended for you</span><h2>Your strongest program matches</h2></div><button className="text-button" onClick={() => setView('explore')}>Explore all programs →</button></div>
          <div className="program-grid">{topPrograms.map((program) => <ProgramCard key={program.id} program={program} score={scores[program.id]} profile={profile} onOpen={() => openProgram(program)} saved={savedIds.includes(program.id)} compared={compareIds.includes(program.id)} saveDisabled={savedIds.length >= plan.limits.shortlist} compareDisabled={compareIds.length >= plan.limits.comparisons} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div>
        </section>}
      </div>
    </>
  )
}

function Explore({ openProgram, savedIds, compareIds, toggleSaved, toggleCompare, openCompare, scores, profile, plan }: {
  openProgram: (program: Program) => void
  savedIds: string[]
  compareIds: string[]
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  openCompare: () => void
  scores: Record<string, ProgramScore>
  profile: UserProfile
  plan: SubscriptionPlan
}) {
  const [country, setCountry] = useState('All countries')
  const [insightCountry, setInsightCountry] = useState(profile.preferredCountries.find((item) => destinationInsights.some((insight) => insight.country === item)) ?? 'Germany')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => programs.filter((program) =>
    (country === 'All countries' || program.country === country) &&
    `${program.program} ${program.university}`.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => scores[b.id].overall - scores[a.id].overall), [country, query, scores])
  return (
    <>
      <Topbar title="Explore programs" />
      <div className="page-content">
        <section className="explore-hero"><span className="eyebrow light">Curated around your profile</span><h2>Find programs where you can thrive.</h2><p>Every result is ranked against your academic background, budget and career direction.</p>
          <div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs or universities" /></div>
        </section>
        <div className="filter-bar">
          <div>{['All countries', 'Germany', 'Finland', 'Netherlands'].map((item) => <button className={country === item ? 'active' : ''} onClick={() => { setCountry(item); if (item !== 'All countries') setInsightCountry(item) }} key={item}>{item}</button>)}</div>
          <span>{filtered.length} programs · {compareIds.length}/3 selected</span>
        </div>
        {compareIds.length >= 2 && <div className="compare-banner"><span><strong>{compareIds.length} programs selected.</strong> See their cost, match and funding side by side.</span><button onClick={openCompare}>Compare now →</button></div>}
        <div className="program-grid wide-grid">{filtered.map((program) => <ProgramCard key={program.id} program={program} score={scores[program.id]} profile={profile} onOpen={() => openProgram(program)} saved={savedIds.includes(program.id)} compared={compareIds.includes(program.id)} saveDisabled={savedIds.length >= plan.limits.shortlist} compareDisabled={compareIds.length >= plan.limits.comparisons} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div>
        <DestinationInsights country={insightCountry} onCountryChange={setInsightCountry} />
      </div>
    </>
  )
}

function DestinationInsights({ country, onCountryChange }: { country: string, onCountryChange: (country: string) => void }) {
  const insight = destinationInsights.find((item) => item.country === country) ?? destinationInsights[0]
  const [city, setCity] = useState(Object.keys(insight.cities)[0])
  const cityNames = Object.keys(insight.cities)
  const selectedCity = cityNames.includes(city) ? city : cityNames[0]
  const cityData = insight.cities[selectedCity as keyof typeof insight.cities] as { livingUsd: string, salary: string, partTime: string }
  return <section className="destination-insights"><div className="section-title"><div><span className="eyebrow">Destination reality check</span><h2>Living, working and career context</h2></div><div className="destination-selectors"><select value={insight.country} onChange={(event) => { const next = destinationInsights.find((item) => item.country === event.target.value); setCity(next ? Object.keys(next.cities)[0] : ''); onCountryChange(event.target.value) }}>{destinationInsights.map((item) => <option key={item.country}>{item.country}</option>)}</select><select value={selectedCity} onChange={(event) => setCity(event.target.value)}>{cityNames.map((item) => <option key={item}>{item}</option>)}</select></div></div>
    <div className="destination-metrics"><article><small>Estimated living cost</small><strong>{cityData.livingUsd}</strong></article><article><small>Graduate salary context</small><strong>{cityData.salary}</strong></article><article><small>Part-time opportunity</small><p>{cityData.partTime}</p></article></div>
    <div className="destination-detail-grid"><article><h3>Student job rules</h3><p>{insight.workRules}</p><small>Prototype summary—always verify current immigration and employment rules officially.</small></article><article><h3>Common job options</h3><div className="career-tags">{insight.jobOptions.map((item) => <span key={item}>{item}</span>)}</div></article><article><h3>Pros</h3>{insight.pros.map((item) => <p key={item}>✓ {item}</p>)}</article><article><h3>Cons</h3>{insight.cons.map((item) => <p key={item}>– {item}</p>)}</article></div>
  </section>
}

function Shortlist({ savedIds, compareIds, openProgram, toggleSaved, toggleCompare, scores, profile, plan }: {
  savedIds: string[]
  compareIds: string[]
  openProgram: (program: Program) => void
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  scores: Record<string, ProgramScore>
  profile: UserProfile
  plan: SubscriptionPlan
}) {
  const savedPrograms = programs.filter((program) => savedIds.includes(program.id))
  const comparedPrograms = programs.filter((program) => compareIds.includes(program.id))

  return (
    <>
      <Topbar title="Shortlist & comparison" />
      <div className="page-content">
        <section className="page-intro">
          <div><span className="eyebrow">Decision workspace</span><h2>Turn interesting options into a balanced shortlist.</h2><p>Save any program, then select up to three to compare the factors that matter most.</p></div>
          <div className="intro-count"><strong>{savedPrograms.length}</strong><span>saved programs</span></div>
        </section>

        {comparedPrograms.length > 0 && (
          <section className="comparison-section">
            <div className="section-title"><div><span className="eyebrow">Side-by-side</span><h2>Current comparison</h2></div><span className="muted">{comparedPrograms.length}/3 selected</span></div>
            <div className="comparison-scroll">
              <table className="comparison-table">
                <thead><tr><th>Factor</th>{comparedPrograms.map((program) => <th key={program.id}>{program.university}</th>)}</tr></thead>
                <tbody>
                  <tr><td>Program</td>{comparedPrograms.map((program) => <td key={program.id}><strong>{program.program}</strong></td>)}</tr>
                  <tr><td>Match</td>{comparedPrograms.map((program) => <td key={program.id}><span className="score-chip">{scores[program.id].overall}%</span></td>)}</tr>
                  <tr><td>Academic</td>{comparedPrograms.map((program) => <td key={program.id}>{scores[program.id].academic}%</td>)}</tr>
                  <tr><td>Budget fit</td>{comparedPrograms.map((program) => <td key={program.id}>{scores[program.id].budget}%</td>)}</tr>
                  <tr><td>Tuition</td>{comparedPrograms.map((program) => <td key={program.id}>{formatProfileCurrency(estimateCost(program, profile).tuitionBdt, profile)}</td>)}</tr>
                  <tr><td>Funding</td>{comparedPrograms.map((program) => <td key={program.id}>{program.scholarship}</td>)}</tr>
                  <tr><td>Deadline</td>{comparedPrograms.map((program) => <td key={program.id}>{program.deadline}</td>)}</tr>
                  <tr><td>Action</td>{comparedPrograms.map((program) => <td key={program.id}><button className="text-button" onClick={() => openProgram(program)}>Open match →</button><button className="remove-link" onClick={() => toggleCompare(program.id)}>Remove</button></td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="recommend-section">
          <div className="section-title"><div><span className="eyebrow">Saved options</span><h2>Your shortlist</h2></div></div>
          {savedPrograms.length ? <div className="program-grid">{savedPrograms.map((program) => <ProgramCard key={program.id} program={program} score={scores[program.id]} profile={profile} onOpen={() => openProgram(program)} saved compared={compareIds.includes(program.id)} compareDisabled={compareIds.length >= plan.limits.comparisons} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div> : <EmptyState title="No programs saved yet" text="Explore your matches and save the options you want to revisit." />}
        </section>
      </div>
    </>
  )
}

function Scholarships({ openProgram }: { openProgram: (program: Program) => void }) {
  return (
    <>
      <Topbar title="Scholarships" />
      <div className="page-content">
        <section className="funding-hero"><div><span className="eyebrow light">Funding strategy</span><h2>Reduce cost without building your plan around wishful thinking.</h2><p>These mock opportunities are ranked against your target countries, academic profile and shortlisted subject.</p></div><div><strong>4</strong><span>potential matches</span></div></section>
        <div className="scholarship-grid">
          {scholarships.map((item) => {
            const related = programs.find((program) => item.countries.includes(program.country))
            return <article className="scholarship-card" key={item.id}>
              <div className="scholarship-score"><strong>{item.match}%</strong><span>funding fit</span></div>
              <span className="eyebrow">{item.provider}</span><h3>{item.name}</h3><p>{item.note}</p>
              <div className="funding-value"><small>Potential coverage</small><strong>{item.coverage}</strong></div>
              <div className="eligibility-list">{item.eligibility.map((rule) => <span key={rule}>✓ {rule}</span>)}</div>
              <div className="source-strip"><div><strong>Official reference</strong><small>{item.sourceLabel} · Checked {item.verifiedAt}</small></div><ExternalLink href={item.sourceUrl}>View source</ExternalLink></div>
              <div className="scholarship-footer"><span>Deadline: {item.deadline}</span>{related && <button onClick={() => openProgram(related)}>Related program →</button>}</div>
            </article>
          })}
        </div>
      </div>
    </>
  )
}

const adviserReplies = [
  {
    match: ['ielts', 'english'],
    text: 'For your current shortlist, a 7.0 overall target is sensible. Begin with a diagnostic test, then spend six weeks on the two weakest skills. A 6.5 may satisfy several minimums, but 7.0 keeps more options comfortable.',
    sources: ['Your roadmap', 'Mock program requirements']
  },
  {
    match: ['germany', 'finland', 'country'],
    text: 'Germany is the strongest budget fit because two matched programs have very low tuition. Finland offers clearer university scholarships, but the remaining tuition and living cost need a stronger sponsor plan.',
    sources: ['Program comparison', 'Mock funding records']
  },
  {
    match: ['scholarship', 'funding', 'cost'],
    text: 'Your strongest funding match is Aalto University’s merit scholarship. Do not treat it as guaranteed: keep at least one low-tuition German option in your final shortlist and prepare financial evidence independently.',
    sources: ['Scholarship matches', 'Your preferred budget']
  },
  {
    match: ['shortlist', 'program', 'university'],
    text: 'A balanced five-program shortlist for you would include two ambitious options, two realistic targets and one financially safe option. At the moment, TUM and Aalto are strong targets while Saarland is the clearest cost-safe choice.',
    sources: ['Your profile', 'Program match scores']
  },
  {
    match: ['career', 'role', 'direction', 'skill gap'],
    text: 'Start with one primary role and one adjacent alternative. Compare the required skills against evidence you already have, then choose the smallest project or conversation that can test your assumptions.',
    sources: ['Career Plan', 'Target-role skill map']
  },
  {
    match: ['cv', 'resume', 'interview', 'portfolio'],
    text: 'Tailor your CV and evidence to one target role. Prioritize measurable project outcomes, prepare six behavioral stories, and practice the actual interview format rather than generic questions.',
    sources: ['Job Preparation', 'Portfolio evidence']
  },
  {
    match: ['job', 'application', 'search', 'follow up'],
    text: 'Use a focused search: save only roles aligned with your target direction, tailor the strongest evidence, record a next action, and review applications weekly instead of sending high-volume generic submissions.',
    sources: ['Job Search tracker', 'Career targets']
  }
]

function Adviser({ plan, subscription, setSubscription, openPlans, activeService, profile }: { plan: SubscriptionPlan, subscription: SubscriptionState, setSubscription: React.Dispatch<React.SetStateAction<SubscriptionState>>, openPlans: () => void, activeService: ServiceType, profile: UserProfile }) {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messageCounter = useRef(2)
  const [messages, setMessages] = usePersistentState<ChatMessage[]>('navigator-chat', [{
    id: 1,
    role: 'assistant',
    text: `Hi ${profile.fullName.split(' ')[0]}. I can help with your ${serviceMeta[activeService].label.toLowerCase()} goal using the information saved in this prototype. What decision are you working on?`,
    sources: ['Your profile', 'Prototype guidance data']
  }])

  const send = (question?: string) => {
    if (subscription.usage.adviserMessages >= plan.limits.adviserMessages) {
      openPlans()
      return
    }
    const text = (question ?? input).trim()
    if (!text) return
    const lower = text.toLowerCase()
    const response = adviserReplies.find((reply) => reply.match.some((keyword) => lower.includes(keyword))) ?? ({
      study: { text: 'Complete the next study-readiness task and compare your strongest programmes before investing more time in applications.', sources: ['Study Plan', 'Current match scores'] },
      career: { text: 'Clarify one target role, identify the highest-impact skill gap, and test it with evidence or a practitioner conversation.', sources: ['Career Plan', 'Role-fit analysis'] },
      'job-preparation': { text: 'Strengthen the weakest of CV evidence, portfolio proof or interview practice before starting a larger application push.', sources: ['Job Preparation', 'Readiness scores'] },
      'job-search': { text: 'Review tracked opportunities, progress one next action, and remove roles that no longer fit your target direction.', sources: ['Job Search', 'Application tracker'] },
    }[activeService])
    const messageId = messageCounter.current
    messageCounter.current += 2
    setMessages((current) => [...current, { id: messageId, role: 'user', text }])
    setIsTyping(true)
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: messageId + 1, role: 'assistant', text: response.text, sources: response.sources }])
      setIsTyping(false)
    }, 450)
    setSubscription((current) => ({ ...current, usage: { ...current.usage, adviserMessages: current.usage.adviserMessages + 1 } }))
    setInput('')
  }

  const suggestions: Record<ServiceType, string[]> = {
    study: ['Which country fits my budget?', 'How should I prepare for IELTS?', 'Help me build a balanced shortlist', 'What funding should I prioritize?'],
    career: ['Which role fits my strengths?', 'What skill gap should I prioritize?', 'How can I test a career direction?', 'Help me build a career story'],
    'job-preparation': ['How should I improve my CV?', 'Give me an interview practice plan', 'What belongs in my portfolio?', 'How do I show measurable impact?'],
    'job-search': ['How should I focus my job search?', 'When should I follow up?', 'How do I tailor an application?', 'Which roles should I avoid?'],
  }
  return (
    <>
      <Topbar title="Ask Navigator" />
      <div className="page-content adviser-page">
        <section className="chat-shell">
          <div className="chat-header"><div className="navigator-orb">N</div><div><span className="eyebrow">Mock AI adviser · {serviceMeta[activeService].label}</span><h2>Navigator</h2><p>Ask follow-ups, use suggested prompts, and receive answers grounded in your active plan.</p></div><div className="chat-header-actions"><span className="online-pill">{subscription.usage.adviserMessages}/{plan.limits.adviserMessages} used</span><button onClick={() => setMessages([])}>Clear chat</button></div></div>
          <div className="chat-context-strip"><span>{serviceMeta[activeService].icon}</span><div><strong>Current planning context</strong><small>{serviceMeta[activeService].description} · {profile.fullName}</small></div></div>
          <div className="suggestion-row">{suggestions[activeService].map((question) => <button onClick={() => send(question)} key={question}>{question}</button>)}</div>
          <div className="messages">
            {messages.map((message) => <div className={`message ${message.role}`} key={message.id}><div>{message.text}</div>{message.sources && <small>Based on: {message.sources.join(' · ')}</small>}</div>)}{isTyping && <div className="message assistant typing-message"><div><span /><span /><span /></div><small>Navigator is reviewing your plan…</small></div>}
          </div>
          <div className="chat-input"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !isTyping) send() }} placeholder={`Ask about ${serviceMeta[activeService].label.toLowerCase()}…`} /><button disabled={isTyping} onClick={() => send()}>Send →</button></div>
        </section>
      </div>
    </>
  )
}

function EmptyState({ title, text }: { title: string, text: string }) {
  return <div className="empty-state"><span>◇</span><h3>{title}</h3><p>{text}</p></div>
}

const gatedFeatureLabels: Record<GatedFeature, string> = {
  studyPlan: 'Full study plan',
  careerPlan: 'Career planning workspace',
  jobPreparation: 'Job preparation workspace',
  jobSearch: 'Job search and application tracking',
  premiumCv: 'Premium CV maker',
  shortlist: 'Shortlist and comparison',
  scholarships: 'Scholarship matching',
  roadmap: 'Personal roadmap',
  documents: 'Document center',
  adviser: 'Navigator adviser',
  advancedCosts: 'Advanced cost scenarios',
  customDocumentFolders: 'Custom document folders',
  expertBooking: 'Expert consultations',
  priorityExperts: 'Priority expert access',
}

function LockedFeature({ feature, compact = false, onUpgrade }: { feature: GatedFeature, compact?: boolean, onUpgrade: () => void }) {
  return <div className={`locked-feature ${compact ? 'compact' : ''}`}><span>⌁</span><div><strong>{gatedFeatureLabels[feature]}</strong><small>Available on the {minimumPlanName(feature)} plan.</small></div><button onClick={onUpgrade}>View plans</button></div>
}

function ProgramDetail({ program, score, profile, goBack, goRoadmap, saved, toggleSaved, advancedCosts, onUpgrade }: { program: Program, score: ProgramScore, profile: UserProfile, goBack: () => void, goRoadmap: () => void, saved: boolean, toggleSaved: () => void, advancedCosts: boolean, onUpgrade: () => void }) {
  const [scholarshipPercent, setScholarshipPercent] = useState(0)
  const cost = estimateCost(program, profile, scholarshipPercent)
  return (
    <>
      <Topbar title="Program match" />
      <div className="page-content detail-page">
        <button className="back-button" onClick={goBack}>← Back to programs</button>
        <section className="detail-hero">
          <div className="uni-logo large" style={{ background: program.accent }}>{program.university.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
          <div className="detail-heading"><span>{program.flag} {program.city}, {program.country}</span><h1>{program.program}</h1><p>{program.university} · {program.ranking}</p><div className="heading-links"><ExternalLink href={program.programUrl}>Official programme</ExternalLink><ExternalLink href={program.universityUrl}>University website</ExternalLink></div></div>
          <div className="detail-score"><strong>{score.overall}%</strong><span>{score.overall >= 85 ? 'Excellent match' : score.overall >= 70 ? 'Good match' : 'Conditional match'}</span></div>
        </section>
        <div className="detail-grid">
          <main>
            <section className="panel"><span className="eyebrow">Your match breakdown</span><h2>Calculated from your current profile.</h2><div className="score-breakdown">{[['Academic', score.academic], ['Budget', score.budget], ['Destination', score.destination], ['English', score.english], ['Funding', score.funding]].map(([label, value]) => <div className="score-bar" key={label}><div><span>{label}</span><strong>{value}%</strong></div><div><span style={{ width: `${value}%` }} /></div></div>)}</div><div className="reason-list">{score.reasons.map((reason) => <div key={reason}><span>✓</span><p>{reason}</p></div>)}</div></section>
            <section className="panel"><span className="eyebrow">Program overview</span><h2>About this program</h2><p className="body-copy">{program.description}</p><div className="fact-grid"><div><small>Degree</small><strong>{program.degree}</strong></div><div><small>Duration</small><strong>{program.duration}</strong></div><div><small>Intake</small><strong>{program.intake}</strong></div><div><small>Deadline</small><strong>{program.deadline}</strong></div></div></section>
            <section className="panel"><span className="eyebrow">Career direction</span><h2>Where this can take you</h2><div className="career-tags">{program.careerPaths.map((item) => <span key={item}>{item}</span>)}</div></section>
          </main>
          <aside>
            <section className="panel cost-card"><span className="eyebrow">Cost estimate · {profile.preferredCurrency}</span><div className="cost-line"><small>Tuition</small><strong>{formatProfileCurrency(cost.tuitionBdt, profile)}</strong></div><div className="cost-line"><small>Living estimate</small><strong>{formatProfileCurrency(cost.livingBdt, profile)}</strong></div><div className="cost-line"><small>Visa, travel & applications</small><strong>{formatProfileCurrency(cost.visaTravelBdt + cost.applicationBdt, profile)}</strong></div>{advancedCosts ? <><label className="scholarship-input">Expected tuition scholarship <strong>{scholarshipPercent}%</strong><input type="range" min="0" max="100" step="10" value={scholarshipPercent} onChange={(event) => setScholarshipPercent(Number(event.target.value))} /></label><div className="cost-line green-text"><small>Scholarship deduction</small><strong>- {formatProfileCurrency(cost.scholarshipBdt, profile)}</strong></div></> : <LockedFeature feature="advancedCosts" compact onUpgrade={onUpgrade} />}<div className="cost-line total"><small>Estimated first year</small><strong>{formatProfileCurrency(cost.firstYearBdt, profile)}</strong></div><div className={`budget-result ${cost.budgetGapBdt <= 0 ? 'within' : 'gap'}`}><strong>{cost.budgetGapBdt <= 0 ? 'Within your budget' : `${formatProfileCurrency(cost.budgetGapBdt, profile)} above budget`}</strong><small>Your stated annual budget: {formatProfileCurrency(profile.annualBudgetBdt, profile)}</small></div><small className="rate-note">Prototype conversion uses fixed mock exchange rates, not live market rates.</small><button className="primary wide" onClick={goRoadmap}>Add to my roadmap →</button><button className={`secondary wide ${saved ? 'saved-button' : ''}`} onClick={toggleSaved}>{saved ? '✓ Saved to shortlist' : 'Save to shortlist'}</button></section>
            <section className="panel"><span className="eyebrow">Entry requirements</span><ul className="requirements">{program.requirements.map((item) => <li key={item}>{item}</li>)}</ul><div className="official-source"><span className="source-shield">✓</span><div><strong>Official reference available</strong><small>{program.sourceLabel}<br />Checked {program.verifiedAt}</small></div><ExternalLink href={program.programUrl}>Open source</ExternalLink></div><small className="source-note">Prototype values may be simplified. Always confirm fees, requirements and deadlines on the official page.</small></section>
          </aside>
        </div>
      </div>
    </>
  )
}

const applicationStatuses: { value: ApplicationStatus, label: string }[] = [
  { value: 'considering', label: 'Considering' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready to submit' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'interview', label: 'Interview / review' },
  { value: 'offer', label: 'Offer received' },
  { value: 'rejected', label: 'Not selected' },
]

function StudyPlan({ profile, documents, savedIds, scores, applications, setApplications, setView, openProgram }: {
  profile: UserProfile
  documents: UserDocument[]
  savedIds: string[]
  scores: Record<string, ProgramScore>
  applications: ApplicationRecord[]
  setApplications: React.Dispatch<React.SetStateAction<ApplicationRecord[]>>
  setView: (view: View) => void
  openProgram: (program: Program) => void
}) {
  const [activePhase, setActivePhase] = useState<StudyPhaseId>('foundation')
  const [laterTasks, setLaterTasks] = usePersistentState<Record<string, boolean>>('navigator-later-study-tasks', {})
  const [toast, setToast] = useState('')
  const savedPrograms = programs.filter((program) => savedIds.includes(program.id))
  const documentProgress = documents.filter((item) => item.required && item.status !== 'missing').length
  const requiredDocuments = documents.filter((item) => item.required).length
  const submittedCount = applications.filter((item) => ['submitted', 'interview', 'offer'].includes(item.status)).length
  const offerCount = applications.filter((item) => item.status === 'offer').length

  const progress: Record<StudyPhaseId, number> = {
    foundation: Math.round((profile.cgpa > 0 ? 25 : 0) + (profile.preferredCountries.length ? 25 : 0) + (profile.annualBudgetBdt > 0 ? 25 : 0) + (profile.preferredIntake ? 25 : 0)),
    research: Math.min(100, savedIds.length * 20),
    tests: profile.ieltsStatus === 'completed' ? 100 : profile.ieltsStatus === 'planning' ? 45 : 10,
    documents: requiredDocuments ? Math.round(documentProgress / requiredDocuments * 100) : 0,
    funding: profile.sponsorReady ? 70 : applications.some((item) => item.fundingStatus !== 'not-started') ? 45 : 20,
    applications: applications.length ? Math.round(applications.reduce((total, item) => total + ({ considering: 10, preparing: 35, ready: 60, submitted: 80, interview: 90, offer: 100, rejected: 100 }[item.status]), 0) / applications.length) : 0,
    visa: offerCount ? Math.round(['visa-finance', 'visa-docs', 'visa-appointment', 'visa-submit'].filter((id) => laterTasks[id]).length / 4 * 100) : 0,
    departure: offerCount ? Math.round(['housing', 'insurance', 'flight', 'arrival'].filter((id) => laterTasks[id]).length / 4 * 100) : 0,
  }

  const overall = Math.round(Object.values(progress).reduce((sum, value) => sum + value, 0) / Object.keys(progress).length)
  const addApplication = (program: Program) => {
    if (applications.some((item) => item.programId === program.id)) return
    setApplications((current) => [...current, { programId: program.id, status: 'preparing', fundingStatus: 'not-started', applicationDeadline: program.deadline, notes: '' }])
    setToast(`${program.university} added to your application tracker.`)
  }
  const updateApplication = (programId: string, patch: Partial<ApplicationRecord>) => setApplications((current) => current.map((item) => item.programId === programId ? { ...item, ...patch } : item))
  const removeApplication = (programId: string) => setApplications((current) => current.filter((item) => item.programId !== programId))

  const phaseAction: Record<StudyPhaseId, { label: string, view: View }> = {
    foundation: { label: 'Review profile', view: 'profile' },
    research: { label: 'Manage shortlist', view: 'shortlist' },
    tests: { label: 'Open roadmap', view: 'roadmap' },
    documents: { label: 'Open documents', view: 'documents' },
    funding: { label: 'View scholarships', view: 'scholarships' },
    applications: { label: 'Application tracker', view: 'study-plan' },
    visa: { label: 'Visa checklist', view: 'study-plan' },
    departure: { label: 'Departure checklist', view: 'study-plan' },
  }

  return (
    <>
      <Topbar title="Study plan" />
      <div className="page-content">
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
        <section className="study-plan-hero">
          <div><span className="eyebrow light">{profile.targetDegree} · {profile.subject} · {profile.preferredIntake}</span><h2>Your complete journey from decision to departure.</h2><p>One workspace for research, preparation, applications, visa and arrival.</p></div>
          <div className="plan-progress-ring" style={{ background: `conic-gradient(#85dfd3 0 ${overall}%,rgba(255,255,255,.16) ${overall}%)` }}><div><strong>{overall}%</strong><span>overall plan</span></div></div>
        </section>

        <section className="phase-grid">
          {studyPhases.map((phase, index) => <button className={`phase-card ${activePhase === phase.id ? 'active' : ''} ${progress[phase.id] === 100 ? 'complete' : ''}`} key={phase.id} onClick={() => setActivePhase(phase.id)}>
            <div className="phase-card-top"><span className="phase-number">{index + 1}</span><span className="phase-icon">{progress[phase.id] === 100 ? '✓' : phase.icon}</span></div>
            <strong>{phase.title}</strong><small>{phase.target}</small><div className="phase-progress"><span style={{ width: `${progress[phase.id]}%` }} /></div><em>{progress[phase.id]}%</em>
          </button>)}
        </section>

        <section className="phase-focus panel">
          <div><span className="eyebrow">Current stage</span><h2>{studyPhases.find((phase) => phase.id === activePhase)?.title}</h2><p>{studyPhases.find((phase) => phase.id === activePhase)?.description}</p></div>
          <div className="phase-focus-score"><strong>{progress[activePhase]}%</strong><span>complete</span><button className="primary small" onClick={() => setView(phaseAction[activePhase].view)}>{phaseAction[activePhase].label} →</button></div>
        </section>

        <div className="study-plan-layout">
          <main>
            <section className="panel application-tracker">
              <div className="section-title"><div><span className="eyebrow">Application tracker</span><h2>From shortlist to decision</h2></div><div className="application-summary"><span>{applications.length} active</span><span>{submittedCount} submitted</span><span>{offerCount} offers</span></div></div>
              {applications.length ? <div className="application-list">{applications.map((application) => {
                const program = programs.find((item) => item.id === application.programId)
                if (!program) return null
                return <article className="application-row" key={application.programId}>
                  <div className="uni-logo" style={{ background: program.accent }}>{program.university.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
                  <div className="application-program"><button onClick={() => openProgram(program)}>{program.university}</button><strong>{program.program}</strong><small>{program.flag} {program.country} · Deadline {application.applicationDeadline}</small></div>
                  <label>Status<select value={application.status} onChange={(event) => updateApplication(program.id, { status: event.target.value as ApplicationStatus })}>{applicationStatuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
                  <label>Funding<select value={application.fundingStatus} onChange={(event) => updateApplication(program.id, { fundingStatus: event.target.value as ApplicationRecord['fundingStatus'] })}><option value="not-started">Not started</option><option value="researching">Researching</option><option value="applied">Applied</option><option value="awarded">Awarded</option></select></label>
                  <button className="application-remove" onClick={() => removeApplication(program.id)}>×</button>
                </article>
              })}</div> : <EmptyState title="No active applications" text="Add a shortlisted programme when you are ready to begin preparing its application." />}
            </section>

            <section className="panel shortlist-to-application">
              <div className="section-title"><div><span className="eyebrow">Your shortlist</span><h2>Choose what moves into application preparation</h2></div><button className="text-button" onClick={() => setView('shortlist')}>Manage shortlist →</button></div>
              <div className="application-candidates">{savedPrograms.map((program) => {
                const alreadyAdded = applications.some((item) => item.programId === program.id)
                return <div key={program.id}><div><strong>{program.university}</strong><small>{scores[program.id].overall}% match · {formatProfileCurrency(estimateCost(program, profile).firstYearBdt, profile)} first year</small></div><button disabled={alreadyAdded} onClick={() => addApplication(program)}>{alreadyAdded ? 'Added' : 'Start application'}</button></div>
              })}</div>
            </section>
          </main>

          <aside className="study-plan-aside">
            <section className="panel"><span className="eyebrow">Readiness snapshot</span>{[
              ['Shortlist', `${savedIds.length}/5`, Math.min(100, savedIds.length * 20)],
              ['English test', profile.ieltsStatus === 'completed' ? `${profile.ieltsScore}` : 'Pending', progress.tests],
              ['Required documents', `${documentProgress}/${requiredDocuments}`, progress.documents],
              ['Funding evidence', profile.sponsorReady ? 'Ready' : 'Pending', profile.sponsorReady ? 100 : 25],
            ].map(([label, value, score]) => <div className="plan-readiness" key={label}><div><span>{label}</span><strong>{value}</strong></div><div><span style={{ width: `${score}%` }} /></div></div>)}</section>

            <LaterStageChecklist title="Visa preparation" locked={!offerCount} tasks={[
              ['visa-finance', 'Financial evidence'],
              ['visa-docs', 'Visa document set'],
              ['visa-appointment', 'Appointment / biometrics'],
              ['visa-submit', 'Application submitted'],
            ]} values={laterTasks} onToggle={(id) => setLaterTasks((current) => ({ ...current, [id]: !current[id] }))} />
            <LaterStageChecklist title="Pre-departure" locked={!offerCount} tasks={[
              ['housing', 'Housing confirmed'],
              ['insurance', 'Insurance arranged'],
              ['flight', 'Travel booked'],
              ['arrival', 'Arrival checklist ready'],
            ]} values={laterTasks} onToggle={(id) => setLaterTasks((current) => ({ ...current, [id]: !current[id] }))} />
          </aside>
        </div>
      </div>
    </>
  )
}

function LaterStageChecklist({ title, locked, tasks, values, onToggle }: { title: string, locked: boolean, tasks: string[][], values: Record<string, boolean>, onToggle: (id: string) => void }) {
  return <section className={`panel later-checklist ${locked ? 'locked' : ''}`}><div className="section-title"><h2>{title}</h2>{locked && <span className="locked-pill">Unlocks after offer</span>}</div>{tasks.map(([id, label]) => <label key={id}><input type="checkbox" disabled={locked} checked={Boolean(values[id])} onChange={() => onToggle(id)} /><span>{label}</span></label>)}</section>
}

function scoreCareerRole(role: CareerRole, career: CareerProfile, profile: UserProfile) {
  const skillMatches = role.coreSkills.filter((skill) => career.currentSkills.some((current) => current.toLowerCase() === skill.toLowerCase())).length
  const styleMatches = role.workStyles.filter((style) => career.workStyle.includes(style)).length
  const backgroundMatch = role.relatedBackgrounds.some((background) => `${profile.currentDegree} ${profile.subject}`.toLowerCase().includes(background.toLowerCase()))
  const score = Math.min(96, 48 + skillMatches * 9 + styleMatches * 6 + (backgroundMatch ? 10 : 0))
  return {
    score,
    matchedSkills: role.coreSkills.filter((skill) => career.currentSkills.some((current) => current.toLowerCase() === skill.toLowerCase())),
    gaps: role.coreSkills.filter((skill) => !career.currentSkills.some((current) => current.toLowerCase() === skill.toLowerCase())),
  }
}

function CareerPlan({ profile, career, setCareer, openExperts }: {
  profile: UserProfile
  career: CareerProfile
  setCareer: React.Dispatch<React.SetStateAction<CareerProfile>>
  openExperts: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(career)
  const [family, setFamily] = useState('All paths')
  const [toast, setToast] = useState('')
  const roleScores = useMemo(() => Object.fromEntries(careerRoles.map((role) => [role.id, scoreCareerRole(role, career, profile)])), [career, profile])
  const rankedRoles = [...careerRoles].sort((a, b) => roleScores[b.id].score - roleScores[a.id].score)
  const filteredRoles = rankedRoles.filter((role) => family === 'All paths' || role.family === family)
  const targetRoles = rankedRoles.filter((role) => career.targetRoleIds.includes(role.id))
  const primaryRole = targetRoles[0] ?? rankedRoles[0]
  const primaryScore = roleScores[primaryRole.id]
  const completed = career.completedTasks.length
  const overall = Math.round((Math.min(career.targetRoleIds.length, 3) / 3 * 30) + (Math.min(career.currentSkills.length, 6) / 6 * 25) + (completed / careerTasks.length * 45))

  const toggleListValue = (field: 'workStyle' | 'interests' | 'currentSkills', value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value],
    }))
  }
  const toggleTarget = (id: string) => setCareer((current) => ({
    ...current,
    targetRoleIds: current.targetRoleIds.includes(id)
      ? current.targetRoleIds.filter((item) => item !== id)
      : current.targetRoleIds.length >= 3 ? current.targetRoleIds : [...current.targetRoleIds, id],
  }))
  const toggleTask = (id: string) => setCareer((current) => ({
    ...current,
    completedTasks: current.completedTasks.includes(id)
      ? current.completedTasks.filter((item) => item !== id)
      : [...current.completedTasks, id],
  }))

  return <>
    <Topbar title="Career plan" />
    <div className="page-content">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <section className="career-hero">
        <div><span className="eyebrow light">{profile.currentDegree} · {career.experienceLevel} level</span><h2>Turn career uncertainty into testable direction.</h2><p>Compare roles, expose skill gaps, build evidence and review your progress in one workspace.</p></div>
        <div className="career-progress"><strong>{overall}%</strong><span>career plan ready</span></div>
      </section>

      <div className="career-summary-grid">
        <article><span>◎</span><div><small>Primary direction</small><strong>{primaryRole.title}</strong></div></article>
        <article><span>↗</span><div><small>Current role fit</small><strong>{primaryScore.score}%</strong></div></article>
        <article><span>✓</span><div><small>Roadmap progress</small><strong>{completed}/{careerTasks.length} tasks</strong></div></article>
        <article><span>⌁</span><div><small>Priority gaps</small><strong>{primaryScore.gaps.slice(0, 2).join(', ') || 'Evidence building'}</strong></div></article>
      </div>

      <section className="panel career-profile-panel">
        <div className="section-title"><div><span className="eyebrow">Career baseline</span><h2>Your direction inputs</h2></div><button className="secondary" onClick={() => { setDraft(career); setEditing((value) => !value) }}>{editing ? 'Cancel' : 'Edit baseline'}</button></div>
        {editing ? <div className="career-editor">
          <div className="field-grid">
            <label>Experience level<select value={draft.experienceLevel} onChange={(event) => setDraft({ ...draft, experienceLevel: event.target.value as CareerProfile['experienceLevel'] })}><option value="student">Student</option><option value="entry">Entry level</option><option value="mid">Mid-career</option><option value="senior">Senior</option></select></label>
            <label>Career objective<select value={draft.careerGoal} onChange={(event) => setDraft({ ...draft, careerGoal: event.target.value as CareerProfile['careerGoal'] })}><option value="first-role">Find my first role</option><option value="career-change">Change career direction</option><option value="promotion">Prepare for progression</option><option value="exploration">Explore possibilities</option></select></label>
            <label>Target timeline<select value={draft.targetTimeline} onChange={(event) => setDraft({ ...draft, targetTimeline: event.target.value as CareerProfile['targetTimeline'] })}><option value="3-months">Within 3 months</option><option value="6-months">Within 6 months</option><option value="12-months">Within 12 months</option><option value="exploring">Still exploring</option></select></label>
          </div>
          <CareerChoiceGroup title="Preferred work style" options={['Analytical work', 'Deep technical work', 'Cross-team collaboration', 'Client-facing work', 'Human-centered work', 'Continuous learning', 'Technology products', 'Research', 'Problem solving']} values={draft.workStyle} onToggle={(value) => toggleListValue('workStyle', value)} />
          <CareerChoiceGroup title="Interests" options={['Data and insights', 'Technology products', 'Business strategy', 'AI systems', 'People and behavior', 'Design and research']} values={draft.interests} onToggle={(value) => toggleListValue('interests', value)} />
          <CareerChoiceGroup title="Current skills" options={['Python', 'SQL', 'Excel', 'Statistics', 'Data visualization', 'Machine learning', 'Software engineering', 'Presentation', 'Stakeholder communication', 'Research design']} values={draft.currentSkills} onToggle={(value) => toggleListValue('currentSkills', value)} />
          <div className="profile-save"><button className="primary" onClick={() => { setCareer(draft); setEditing(false); setToast('Career baseline saved and role matches recalculated.') }}>Save career baseline →</button></div>
        </div> : <div className="career-baseline">
          <div><small>Objective</small><strong>{career.careerGoal.replaceAll('-', ' ')}</strong></div><div><small>Timeline</small><strong>{career.targetTimeline.replaceAll('-', ' ')}</strong></div><div><small>Work preferences</small><strong>{career.workStyle.join(', ')}</strong></div><div><small>Current skills</small><strong>{career.currentSkills.join(', ')}</strong></div>
        </div>}
      </section>

      <section className="career-role-section">
        <div className="section-title"><div><span className="eyebrow">Role explorer</span><h2>Career paths ranked around your profile</h2></div><div className="career-family-filter">{['All paths', ...new Set(careerRoles.map((role) => role.family))].map((item) => <button className={family === item ? 'active' : ''} onClick={() => setFamily(item)} key={item}>{item}</button>)}</div></div>
        <div className="career-role-grid">{filteredRoles.map((role) => {
          const result = roleScores[role.id]
          const selected = career.targetRoleIds.includes(role.id)
          return <article className={`career-role-card ${selected ? 'selected' : ''}`} key={role.id}>
            <div className="career-role-head"><span style={{ background: role.accent }}>{role.title.split(' ').map((word) => word[0]).join('')}</span><div><small>{role.family}</small><h3>{role.title}</h3></div><strong>{result.score}%</strong></div>
            <p>{role.summary}</p>
            <div className="career-role-facts"><span>{role.demand} demand</span><span>{role.salaryUsd}</span></div>
            <div className="career-skill-tags">{result.matchedSkills.map((skill) => <span className="matched" key={skill}>✓ {skill}</span>)}{result.gaps.slice(0, 3).map((skill) => <span key={skill}>+ {skill}</span>)}</div>
            <button className={selected ? 'secondary wide' : 'primary wide'} disabled={!selected && career.targetRoleIds.length >= 3} onClick={() => toggleTarget(role.id)}>{selected ? 'Remove target' : career.targetRoleIds.length >= 3 ? 'Three-role limit reached' : 'Add as target role'}</button>
          </article>
        })}</div>
      </section>

      <div className="career-workspace-grid">
        <main>
          <section className="panel career-roadmap">
            <div className="section-title"><div><span className="eyebrow">Action roadmap</span><h2>Build direction through evidence</h2></div><span className="verified">{completed}/{careerTasks.length} complete</span></div>
            {careerTasks.map((task) => <label className={career.completedTasks.includes(task.id) ? 'complete' : ''} key={task.id}><input type="checkbox" checked={career.completedTasks.includes(task.id)} onChange={() => toggleTask(task.id)} /><span>{task.phase}</span><div><strong>{task.title}</strong><small>{task.detail}</small></div></label>)}
          </section>
        </main>
        <aside>
          <section className="panel skill-gap-panel"><span className="eyebrow">Primary role gap</span><h2>{primaryRole.title}</h2><p>{primaryScore.score}% current fit based on your selected skills, work style and background.</p>{primaryRole.coreSkills.map((skill) => <div key={skill}><span>{skill}</span><strong>{primaryScore.matchedSkills.includes(skill) ? 'Ready' : 'Develop'}</strong></div>)}</section>
          <section className="career-expert-card"><span>◎</span><h3>Validate this direction</h3><p>Use an expert session to challenge your assumptions, review evidence and prioritize the next skill cycle.</p><button onClick={openExperts}>Find a career expert →</button></section>
        </aside>
      </div>
    </div>
  </>
}

function CareerChoiceGroup({ title, options, values, onToggle }: { title: string, options: string[], values: string[], onToggle: (value: string) => void }) {
  return <div className="career-choice-group"><strong>{title}</strong><div>{options.map((option) => <button className={values.includes(option) ? 'selected' : ''} onClick={() => onToggle(option)} key={option}>{values.includes(option) ? '✓ ' : '+ '}{option}</button>)}</div></div>
}

function JobPreparation({ career, preparation, setPreparation, documents, openDocuments, openExperts, premiumCv, onUpgrade }: {
  career: CareerProfile
  preparation: JobPreparationProfile
  setPreparation: React.Dispatch<React.SetStateAction<JobPreparationProfile>>
  documents: UserDocument[]
  openDocuments: () => void
  openExperts: () => void
  premiumCv: boolean
  onUpgrade: () => void
}) {
  const [newPortfolioTitle, setNewPortfolioTitle] = useState('')
  const [activePrompt, setActivePrompt] = useState(0)
  const [toast, setToast] = useState('')
  const selectedCareerRole = careerRoles.find((role) => role.id === preparation.targetRoleId)
  const fallbackRole = careerRoles.find((role) => career.targetRoleIds.includes(role.id)) ?? careerRoles[0]
  const targetRole = selectedCareerRole ?? fallbackRole
  const prompts = interviewPrompts[targetRole.id] ?? interviewPrompts['data-analyst']
  const cvDocument = documents.find((document) => document.id === 'cv')
  const portfolioDocument = documents.find((document) => document.id === 'other')
  const cvSectionCount = Object.values(preparation.cvSections).filter(Boolean).length
  const cvScore = Math.round((cvSectionCount / 6 * 80) + (cvDocument?.status === 'verified' ? 20 : cvDocument?.status === 'uploaded' ? 10 : 0))
  const readyPortfolioItems = preparation.portfolioItems.filter((item) => item.status === 'ready').length
  const portfolioScore = Math.min(100, preparation.portfolioItems.length * 18 + readyPortfolioItems * 22 + (portfolioDocument?.status !== 'missing' ? 12 : 0))
  const interviewScore = Math.min(100, Math.round(preparation.interviewConfidence * .65 + preparation.practiceSessions * 12))
  const taskScore = Math.round(preparation.completedTasks.length / jobPreparationTasks.length * 100)
  const overall = Math.round(cvScore * .3 + portfolioScore * .25 + interviewScore * .25 + taskScore * .2)
  const cvAnalysis = [
    { label: 'Role-specific headline', ready: preparation.cvDraft.headline.toLowerCase().includes(targetRole.title.toLowerCase()) },
    { label: 'Focused professional summary', ready: preparation.cvDraft.summary.trim().length >= 80 },
    { label: 'Evidence-based experience', ready: /\d|%|increased|reduced|improved|built/i.test(preparation.cvDraft.experience) },
    { label: 'Relevant project evidence', ready: preparation.cvDraft.projects.trim().length >= 60 },
    { label: 'Target-role keywords', ready: targetRole.coreSkills.some((skill) => preparation.cvDraft.skills.toLowerCase().includes(skill.toLowerCase())) },
  ]
  const cvAnalysisScore = Math.round(cvAnalysis.filter((item) => item.ready).length / cvAnalysis.length * 100)

  const toggleCvSection = (section: keyof JobPreparationProfile['cvSections']) => setPreparation((current) => ({
    ...current,
    cvSections: { ...current.cvSections, [section]: !current.cvSections[section] },
  }))
  const updatePortfolio = (id: string, patch: Partial<JobPreparationProfile['portfolioItems'][number]>) => setPreparation((current) => ({
    ...current,
    portfolioItems: current.portfolioItems.map((item) => item.id === id ? { ...item, ...patch } : item),
  }))
  const addPortfolio = () => {
    const title = newPortfolioTitle.trim()
    if (!title) return
    setPreparation((current) => ({ ...current, portfolioItems: [...current.portfolioItems, { id: `portfolio-${Date.now()}`, title, type: 'project', status: 'idea' }] }))
    setNewPortfolioTitle('')
    setToast('Portfolio item added to your preparation workspace.')
  }
  const toggleTask = (id: string) => setPreparation((current) => ({
    ...current,
    completedTasks: current.completedTasks.includes(id) ? current.completedTasks.filter((item) => item !== id) : [...current.completedTasks, id],
  }))

  return <>
    <Topbar title="Job preparation" />
    <div className="page-content">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <section className="job-prep-hero">
        <div><span className="eyebrow light">{targetRole.title} · {career.targetTimeline.replaceAll('-', ' ')}</span><h2>Build evidence before you start sending applications.</h2><p>Strengthen your CV, portfolio, professional story and interview performance around one target role.</p></div>
        <div className="job-prep-score"><strong>{overall}%</strong><span>application ready</span></div>
      </section>

      <section className="job-prep-overview">
        {[['CV readiness', cvScore, cvDocument?.status ?? 'missing'], ['Portfolio evidence', portfolioScore, `${readyPortfolioItems} ready`], ['Interview readiness', interviewScore, `${preparation.practiceSessions} practices`], ['Preparation roadmap', taskScore, `${preparation.completedTasks.length}/${jobPreparationTasks.length} tasks`]].map(([label, score, detail]) => <article key={label}><div><small>{label}</small><strong>{score}%</strong></div><div><span style={{ width: `${score}%` }} /></div><small>{detail}</small></article>)}
      </section>

      <section className="panel job-target-panel">
        <div><span className="eyebrow">Preparation target</span><h2>Which role should this material be tailored for?</h2><p>Career Plan targets are available here. Choose one primary role for CV language, portfolio evidence and interview practice.</p></div>
        <select value={preparation.targetRoleId} onChange={(event) => setPreparation((current) => ({ ...current, targetRoleId: event.target.value }))}>{careerRoles.filter((role) => career.targetRoleIds.includes(role.id) || role.id === preparation.targetRoleId).map((role) => <option value={role.id} key={role.id}>{role.title}</option>)}</select>
      </section>

      <div className="job-prep-grid">
        <main>
          <section className="panel cv-builder">
            <div className="section-title"><div><span className="eyebrow">CV readiness</span><h2>Content structure and evidence</h2></div><span className={`status-pill ${cvDocument?.status ?? 'missing'}`}>{cvDocument?.status ?? 'missing'}</span></div>
            <p className="section-copy">This prototype reviews completion signals, not the content of your file. A production version would need explicit document permission and secure analysis.</p>
            <div className="cv-section-grid">{(Object.keys(preparation.cvSections) as (keyof JobPreparationProfile['cvSections'])[]).map((section) => <button className={preparation.cvSections[section] ? 'complete' : ''} onClick={() => toggleCvSection(section)} key={section}><span>{preparation.cvSections[section] ? '✓' : '+'}</span><div><strong>{section}</strong><small>{section === 'summary' ? `Targeted to ${targetRole.title}` : section === 'projects' ? 'Evidence and measurable outcomes' : 'Relevant, concise and role-aligned'}</small></div></button>)}</div>
            <div className="document-connection"><div><strong>{cvDocument?.files.length ?? 0} CV file(s) connected</strong><small>Document center status: {cvDocument?.status ?? 'missing'}</small></div><button className="secondary" onClick={openDocuments}>Open document center</button></div>
          </section>

          <section className="panel cv-analysis-maker">
            <div className="section-title"><div><span className="eyebrow">CV analysis</span><h2>{cvAnalysisScore}% positioning strength</h2></div>{premiumCv ? <span className="verified">Premium maker enabled</span> : <button className="locked-inline" onClick={onUpgrade}>⌁ Premium CV maker · {minimumPlanName('premiumCv')}</button>}</div>
            <div className="cv-analysis-grid"><div>{cvAnalysis.map((item) => <p className={item.ready ? 'ready' : ''} key={item.label}><span>{item.ready ? '✓' : '!'}</span>{item.label}</p>)}</div><div className={`cv-maker-fields ${premiumCv ? '' : 'locked-maker'}`}>
              <label>Professional headline<input disabled={!premiumCv} value={preparation.cvDraft.headline} onChange={(event) => setPreparation((current) => ({ ...current, cvDraft: { ...current.cvDraft, headline: event.target.value } }))} /></label>
              <label>Professional summary<textarea disabled={!premiumCv} value={preparation.cvDraft.summary} onChange={(event) => setPreparation((current) => ({ ...current, cvDraft: { ...current.cvDraft, summary: event.target.value } }))} /></label>
              <label>Experience evidence<textarea disabled={!premiumCv} value={preparation.cvDraft.experience} onChange={(event) => setPreparation((current) => ({ ...current, cvDraft: { ...current.cvDraft, experience: event.target.value } }))} /></label>
              <label>Projects<textarea disabled={!premiumCv} value={preparation.cvDraft.projects} onChange={(event) => setPreparation((current) => ({ ...current, cvDraft: { ...current.cvDraft, projects: event.target.value } }))} /></label>
              <label>Skills<input disabled={!premiumCv} value={preparation.cvDraft.skills} onChange={(event) => setPreparation((current) => ({ ...current, cvDraft: { ...current.cvDraft, skills: event.target.value } }))} /></label>
              {premiumCv && <button className="primary" onClick={() => setToast('Premium CV draft saved in this browser.')}>Save CV draft</button>}
            </div></div>
          </section>

          <section className="panel portfolio-builder">
            <div className="section-title"><div><span className="eyebrow">Portfolio and proof</span><h2>Evidence employers can inspect</h2></div><span className="verified">{readyPortfolioItems} ready</span></div>
            <div className="portfolio-add"><input value={newPortfolioTitle} onChange={(event) => setNewPortfolioTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addPortfolio() }} placeholder="Add a project or case study" /><button className="primary" onClick={addPortfolio}>Add evidence</button></div>
            {preparation.portfolioItems.length ? <div className="portfolio-list">{preparation.portfolioItems.map((item) => <article key={item.id}><span>◇</span><div><strong>{item.title}</strong><small>{item.type.replace('-', ' ')}</small></div><select value={item.type} onChange={(event) => updatePortfolio(item.id, { type: event.target.value as typeof item.type })}><option value="project">Project</option><option value="case-study">Case study</option><option value="writing">Writing</option><option value="presentation">Presentation</option></select><select value={item.status} onChange={(event) => updatePortfolio(item.id, { status: event.target.value as typeof item.status })}><option value="idea">Idea</option><option value="draft">Draft</option><option value="ready">Ready</option></select><button aria-label={`Remove ${item.title}`} onClick={() => setPreparation((current) => ({ ...current, portfolioItems: current.portfolioItems.filter((entry) => entry.id !== item.id) }))}>×</button></article>)}</div> : <EmptyState title="No portfolio evidence yet" text={`Add a ${targetRole.title} project, case study, writing sample or presentation.`} />}
          </section>

          <section className="panel preparation-roadmap">
            <div className="section-title"><div><span className="eyebrow">Preparation roadmap</span><h2>From generic profile to credible candidate</h2></div><span className="verified">{preparation.completedTasks.length}/{jobPreparationTasks.length}</span></div>
            {jobPreparationTasks.map((task) => <label className={preparation.completedTasks.includes(task.id) ? 'complete' : ''} key={task.id}><input type="checkbox" checked={preparation.completedTasks.includes(task.id)} onChange={() => toggleTask(task.id)} /><span>{task.phase}</span><div><strong>{task.title}</strong><small>{task.detail}</small></div></label>)}
          </section>
        </main>

        <aside>
          <section className="panel interview-practice">
            <span className="eyebrow">Interview practice</span><h2>{targetRole.title}</h2><div className="prompt-card"><small>Practice prompt {activePrompt + 1} of {prompts.length}</small><strong>{prompts[activePrompt]}</strong><button onClick={() => setActivePrompt((current) => (current + 1) % prompts.length)}>Next prompt →</button></div>
            <label>Confidence after practice <strong>{preparation.interviewConfidence}%</strong><input type="range" min="0" max="100" step="5" value={preparation.interviewConfidence} onChange={(event) => setPreparation((current) => ({ ...current, interviewConfidence: Number(event.target.value) }))} /></label>
            <button className="primary wide" onClick={() => { setPreparation((current) => ({ ...current, practiceSessions: current.practiceSessions + 1, interviewConfidence: Math.min(100, current.interviewConfidence + 5) })); setToast('Practice session recorded.') }}>Record practice session</button>
          </section>
          <section className="panel role-keywords"><span className="eyebrow">Role language</span><h2>Evidence to emphasize</h2>{targetRole.coreSkills.map((skill) => <div key={skill}><span>{skill}</span><strong>{career.currentSkills.includes(skill) ? 'Existing skill' : 'Build evidence'}</strong></div>)}</section>
          <section className="job-review-card"><span>✦</span><h3>Get a human review</h3><p>Share your CV metadata, target role and portfolio plan with a career specialist.</p><button onClick={openExperts}>Book a preparation review →</button></section>
        </aside>
      </div>
    </div>
  </>
}

function JobSearch({ profile, career, preparation, documents, applications, setApplications }: {
  profile: UserProfile
  career: CareerProfile
  preparation: JobPreparationProfile
  documents: UserDocument[]
  applications: JobApplication[]
  setApplications: React.Dispatch<React.SetStateAction<JobApplication[]>>
}) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('All')
  const [toast, setToast] = useState('')
  const targetIds = new Set([...career.targetRoleIds, preparation.targetRoleId])
  const matched = jobs.filter((job) => targetIds.has(job.roleId) && (mode === 'All' || job.workMode === mode) && `${job.title} ${job.company} ${job.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const update = (jobId: string, patch: Partial<JobApplication>) => setApplications((current) => current.map((item) => item.jobId === jobId ? { ...item, ...patch } : item))
  const track = (jobId: string) => {
    if (applications.some((item) => item.jobId === jobId)) return
    setApplications((current) => [...current, { jobId, status: 'saved', nextAction: 'Review role and tailor CV', notes: '' }])
    setToast('Job added to your application tracker.')
  }
  return <>
    <Topbar title="Job search" />
    <div className="page-content">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      <section className="job-search-hero"><div><span className="eyebrow light">Focused opportunity search</span><h2>Find roles that match the direction you prepared for.</h2><p>Prototype opportunities are matched to Career Plan targets and connected to a persistent application tracker.</p></div><div><strong>{matched.length}</strong><span>matched roles</span></div></section>
      <div className="job-search-toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, company or skill" /></div><div>{['All', 'Remote', 'Hybrid', 'On-site'].map((item) => <button className={mode === item ? 'active' : ''} onClick={() => setMode(item)} key={item}>{item}</button>)}</div></div>
      <div className="job-search-layout">
        <main className="job-listings">{matched.length ? matched.map((job) => {
          const tracked = applications.find((item) => item.jobId === job.id)
          const skillFit = job.skills.filter((skill) => career.currentSkills.some((current) => current.toLowerCase() === skill.toLowerCase())).length / job.skills.length
          const role = careerRoles.find((item) => item.id === job.roleId)
          const educationFit = role?.relatedBackgrounds.some((background) => `${profile.currentDegree} ${profile.subject}`.toLowerCase().includes(background.toLowerCase())) ? 1 : .55
          const evidenceFit = Math.min(1, (preparation.portfolioItems.filter((item) => item.status === 'ready').length * .35) + (documents.find((item) => item.id === 'cv')?.status === 'verified' ? .35 : documents.find((item) => item.id === 'cv')?.status === 'uploaded' ? .2 : 0) + preparation.completedTasks.length / jobPreparationTasks.length * .3)
          const matchingRate = Math.round(skillFit * 50 + educationFit * 20 + evidenceFit * 30)
          return <article key={job.id}><div className="job-company-mark" style={{ background: role?.accent }}>{job.company.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div><div className="job-listing-copy"><span>{job.company} · {job.location}</span><h3>{job.title}</h3><div><em>{job.workMode}</em><em>{job.level}</em><em>{job.salaryUsd}</em><em className="match-em">{matchingRate}% match</em></div><p>{job.skills.join(' · ')}</p><small>Match uses skills, education, portfolio, CV and preparation progress.</small></div><button className={tracked ? 'secondary' : 'primary'} onClick={() => track(job.id)} disabled={Boolean(tracked)}>{tracked ? 'Tracked' : 'Track application'}</button></article>
        }) : <EmptyState title="No roles match these filters" text="Try another work mode or broaden the search words." />}</main>
        <aside className="panel job-application-tracker"><div className="section-title"><div><span className="eyebrow">Application tracker</span><h2>{applications.length} active roles</h2></div></div>{applications.length ? applications.map((application) => {
          const job = jobs.find((item) => item.id === application.jobId)
          if (!job) return null
          return <article key={application.jobId}><div><strong>{job.title}</strong><small>{job.company}</small></div><label>Status<select value={application.status} onChange={(event) => update(job.id, { status: event.target.value as JobApplication['status'], appliedAt: event.target.value === 'applied' ? new Date().toISOString().slice(0, 10) : application.appliedAt })}><option value="saved">Saved</option><option value="preparing">Preparing</option><option value="applied">Applied</option><option value="interview">Interview</option><option value="offer">Offer</option><option value="closed">Closed</option></select></label><label>Next action<input value={application.nextAction} onChange={(event) => update(job.id, { nextAction: event.target.value })} /></label><textarea value={application.notes} onChange={(event) => update(job.id, { notes: event.target.value })} placeholder="Notes, contacts or follow-up details" /><button onClick={() => setApplications((current) => current.filter((item) => item.jobId !== job.id))}>Remove</button></article>
        }) : <EmptyState title="No tracked applications" text="Add a matched role to start managing its next actions." />}</aside>
      </div>
    </div>
  </>
}

function Experts({ profile, documents, bookings, setBookings, plan, subscription, setSubscription, activeService }: {
  profile: UserProfile
  documents: UserDocument[]
  bookings: ConsultationBooking[]
  setBookings: React.Dispatch<React.SetStateAction<ConsultationBooking[]>>
  plan: SubscriptionPlan
  subscription: SubscriptionState
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionState>>
  activeService: ServiceType
}) {
  const [specialization, setSpecialization] = useState('All expertise')
  const [country, setCountry] = useState('All countries')
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [bookingExpert, setBookingExpert] = useState<Expert | null>(null)
  const [toast, setToast] = useState('')
  const serviceKeywords: Record<ServiceType, string[]> = {
    study: ['study', 'admission', 'scholarship', 'programme', 'sop', 'academic'],
    career: ['career', 'transition', 'positioning'],
    'job-preparation': ['cv', 'portfolio', 'interview'],
    'job-search': ['cv', 'interview', 'positioning'],
  }
  const serviceExperts = experts.filter((expert) => expert.specializations.some((item) => serviceKeywords[activeService].some((keyword) => item.toLowerCase().includes(keyword))))
  const filtered = serviceExperts.filter((expert) =>
    (specialization === 'All expertise' || expert.specializations.includes(specialization)) &&
    (country === 'All countries' || expert.countries.includes(country))
  )
  const upcoming = bookings.filter((booking) => booking.status === 'confirmed')
  const previous = bookings.filter((booking) => booking.status !== 'confirmed')

  const updateBooking = (id: string, patch: Partial<ConsultationBooking>) => setBookings((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))

  return (
    <>
      <Topbar title="Expert consultations" />
      <div className="page-content">
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
        <section className="expert-hero"><div><span className="eyebrow light">Human guidance · {serviceMeta[activeService].label}</span><h2>Bring a specialist into your current plan.</h2><p>Book a focused review with your profile, progress and selected documents already organized.</p></div><div><strong>{serviceExperts.length}</strong><span>relevant experts</span></div></section>

        {upcoming.length > 0 && <section className="upcoming-consultations panel">
          <div className="section-title"><div><span className="eyebrow">Upcoming</span><h2>Your booked consultations</h2></div></div>
          <div className="booking-list">{upcoming.map((booking) => {
            const expert = experts.find((item) => item.id === booking.expertId)
            const service = expert?.services.find((item) => item.id === booking.serviceId)
            if (!expert || !service) return null
            const nextDate = Object.keys(expert.availability).find((item) => item !== booking.date) ?? booking.date
            return <article className="booking-row" key={booking.id}><div className="expert-avatar small" style={{ background: expert.accent }}>{expert.initials}</div><div><strong>{service.title}</strong><span>{expert.name}</span><small>{formatProfileDate(booking.date, profile)} · {booking.time} · {booking.timezone}</small></div><div className="shared-count">▤ {booking.documentIds.length} shared</div><div className="booking-row-actions"><button onClick={() => { updateBooking(booking.id, { date: nextDate, time: expert.availability[nextDate][0] }); setToast('Consultation rescheduled to the next available prototype slot.') }}>Reschedule</button><button onClick={() => updateBooking(booking.id, { status: 'completed', expertNotes: booking.expertNotes || 'Expert review completed. Add recommendations here.' })}>Complete</button><button onClick={() => { updateBooking(booking.id, { status: 'cancelled' }); setToast('Consultation cancelled in the prototype.') }}>Cancel</button></div></article>
          })}</div>
        </section>}

        <div className="expert-toolbar">
          <div><select value={specialization} onChange={(event) => setSpecialization(event.target.value)}><option>All expertise</option>{[...new Set(serviceExperts.flatMap((expert) => expert.specializations))].map((item) => <option key={item}>{item}</option>)}</select><select value={country} onChange={(event) => setCountry(event.target.value)}><option>All countries</option>{[...new Set(serviceExperts.flatMap((expert) => expert.countries))].sort().map((item) => <option key={item}>{item}</option>)}</select></div><span>{filtered.length} experts</span>
        </div>

        <div className="expert-grid">{filtered.map((expert) => {
          const startingPrice = Math.min(...expert.services.map((service) => service.priceUsd))
          return <article className="expert-card" key={expert.id}>
            <div className="expert-card-head"><div className="expert-avatar" style={{ background: expert.accent }}>{expert.initials}</div><div className="rating">★ {expert.rating}<small>({expert.reviews})</small></div></div>
            <span className="eyebrow">{expert.specializations[0]}</span><h3>{expert.name}</h3><p className="expert-title">{expert.title}</p><p className="expert-bio">{expert.bio}</p>
            <div className="expert-tags">{expert.countries.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
            <div className="expert-facts"><div><small>Experience</small><strong>{expert.experienceYears} years</strong></div><div><small>Languages</small><strong>{expert.languages.join(', ')}</strong></div></div>
            <div className="expert-card-footer"><div><small>From</small><strong>{formatUsd(startingPrice, profile)}</strong></div><button className="secondary" onClick={() => setSelectedExpert(expert)}>View profile</button><button className="primary" onClick={() => setBookingExpert(expert)}>Book</button></div>
          </article>
        })}</div>

        {previous.length > 0 && <section className="consultation-history panel"><span className="eyebrow">History</span><h2>Previous and cancelled consultations</h2>{previous.map((booking) => {
          const expert = experts.find((item) => item.id === booking.expertId)
          return <div className="history-record" key={booking.id}><div><strong>{expert?.name}</strong><span>{formatProfileDate(booking.date, profile)} · {booking.status}</span></div>{booking.status === 'completed' && <textarea value={booking.expertNotes ?? ''} onChange={(event) => updateBooking(booking.id, { expertNotes: event.target.value })} placeholder="Expert notes and recommendations" />}</div>
        })}</section>}
      </div>
      {selectedExpert && <ExpertProfileModal expert={selectedExpert} profile={profile} onClose={() => setSelectedExpert(null)} onBook={() => { setBookingExpert(selectedExpert); setSelectedExpert(null) }} />}
      {bookingExpert && <BookingModal expert={bookingExpert} profile={profile} documents={documents} activeService={activeService} availableExpertCredits={subscription.usage.expertCredits} priorityAccess={canUseFeature(plan.id, 'priorityExperts')} onClose={() => setBookingExpert(null)} onConfirm={(booking) => { setBookings((current) => [...current, booking]); if (booking.usedExpertCredit) setSubscription((current) => ({ ...current, usage: { ...current.usage, expertCredits: Math.max(0, current.usage.expertCredits - 1) } })); setBookingExpert(null); setToast(booking.usedExpertCredit ? 'Consultation booked using an expert credit.' : 'Consultation booked successfully.') }} />}
    </>
  )
}

function ExpertProfileModal({ expert, profile, onClose, onBook }: { expert: Expert, profile: UserProfile, onClose: () => void, onBook: () => void }) {
  const modalRef = useAccessibleModal(onClose)
  return <div className="modal-backdrop" onMouseDown={onClose}><section ref={modalRef} className="expert-profile-modal" role="dialog" aria-modal="true" aria-labelledby="expert-profile-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" aria-label="Close expert profile" onClick={onClose}>×</button>
    <div className="expert-profile-head"><div className="expert-avatar large" style={{ background: expert.accent }}>{expert.initials}</div><div><span className="eyebrow">{expert.specializations.join(' · ')}</span><h2 id="expert-profile-title">{expert.name}</h2><p>{expert.title}</p><div className="profile-rating">★ {expert.rating} from {expert.reviews} reviews · {expert.experienceYears} years experience</div></div></div>
    <p className="modal-bio">{expert.bio}</p>
    <div className="expert-profile-grid"><div><span className="eyebrow">Destination coverage</span><div className="expert-tags">{expert.countries.map((item) => <span key={item}>{item}</span>)}</div></div><div><span className="eyebrow">Education & background</span>{expert.education.map((item) => <p className="credential-line" key={item}>✓ {item}</p>)}</div></div>
    <ExternalLink href={expert.credentialsUrl}>View public credential reference</ExternalLink>
    <div className="service-preview"><span className="eyebrow">Available services</span>{expert.services.map((service) => <div key={service.id}><div><strong>{service.title}</strong><small>{service.durationMinutes} minutes · {service.description}</small></div><strong>{formatUsd(service.priceUsd, profile)}</strong></div>)}</div>
    <button className="primary wide" onClick={onBook}>Choose a service and book →</button>
  </section></div>
}

function BookingModal({ expert, profile, documents, activeService, availableExpertCredits, priorityAccess, onClose, onConfirm }: { expert: Expert, profile: UserProfile, documents: UserDocument[], activeService: ServiceType, availableExpertCredits: number, priorityAccess: boolean, onClose: () => void, onConfirm: (booking: ConsultationBooking) => void }) {
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState(expert.services[0].id)
  const dates = Object.keys(expert.availability)
  const [date, setDate] = useState(dates[0])
  const [time, setTime] = useState(expert.availability[dates[0]][0])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(documents.filter((item) => item.status !== 'missing').map((item) => item.id).slice(0, 2))
  const [summary, setSummary] = useState(activeService === 'study'
    ? `I want expert guidance on my ${profile.targetDegree} ${profile.subject} plan for ${profile.preferredIntake}. My preferred destinations are ${profile.preferredCountries.join(', ')}.`
    : `I want expert guidance for my ${serviceMeta[activeService].label.toLowerCase()} goal. Please review my current direction, evidence and next actions.`)
  const [consent, setConsent] = useState(false)
  const [useCredit, setUseCredit] = useState(availableExpertCredits > 0)
  const service = expert.services.find((item) => item.id === serviceId) ?? expert.services[0]
  const availableDocuments = documents.filter((item) => item.status !== 'missing')

  const confirm = () => {
    if (!consent) return
    onConfirm({
      id: `booking-${expert.id}-${date}-${time}`,
      expertId: expert.id,
      serviceId,
      date,
      time,
      timezone: profile.timezone,
      documentIds: selectedDocuments,
      caseSummary: summary,
      consent,
      status: 'confirmed',
      usedExpertCredit: useCredit,
    })
  }

  const modalRef = useAccessibleModal(onClose)
  return <div className="modal-backdrop" onMouseDown={onClose}><section ref={modalRef} className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" aria-label="Close booking" onClick={onClose}>×</button>
    <div className="booking-heading"><span className="eyebrow">Book consultation · Step {step} of 4</span><h2 id="booking-title">{expert.name}</h2><div className="booking-stepper">{[1, 2, 3, 4].map((item) => <span className={item <= step ? 'active' : ''} key={item} />)}</div></div>
    {step === 1 && <div className="booking-content"><h3>Choose a service</h3><div className="service-choice">{expert.services.map((item) => <button className={serviceId === item.id ? 'selected' : ''} onClick={() => setServiceId(item.id)} key={item.id}><div><strong>{item.title}</strong><small>{item.durationMinutes} minutes · {item.description}</small></div><strong>{formatUsd(item.priceUsd, profile)}</strong></button>)}</div></div>}
    {step === 2 && <div className="booking-content"><h3>Select a date and time</h3>{priorityAccess && <div className="priority-access">◆ Priority booking access enabled by your plan</div>}<div className="date-choice">{dates.map((item) => <button className={date === item ? 'selected' : ''} onClick={() => { setDate(item); setTime(expert.availability[item][0]) }} key={item}>{formatProfileDate(item, profile)}</button>)}</div><div className="time-choice">{expert.availability[date].map((item) => <button className={time === item ? 'selected' : ''} onClick={() => setTime(item)} key={item}>{item}</button>)}</div><small className="timezone-note">Times are shown in your saved timezone: {profile.timezone}.</small></div>}
    {step === 3 && <div className="booking-content"><h3>Prepare the expert case</h3><label className="case-summary">Case summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label><span className="eyebrow">Documents to share</span>{availableDocuments.length ? <div className="share-documents">{availableDocuments.map((document) => <label key={document.id}><input type="checkbox" checked={selectedDocuments.includes(document.id)} onChange={() => setSelectedDocuments((current) => current.includes(document.id) ? current.filter((id) => id !== document.id) : [...current, document.id])} /><div><strong>{document.title}</strong><small>{document.files.length} file(s) · {document.status}</small></div></label>)}</div> : <p className="muted">No documents are available to share. You can still book the consultation.</p>}</div>}
    {step === 4 && <div className="booking-content booking-review"><h3>Review and consent</h3><div className="review-grid"><div><small>Service</small><strong>{service.title}</strong></div><div><small>Price</small><strong>{useCredit ? 'Included expert credit' : formatUsd(service.priceUsd, profile)}</strong></div><div><small>Schedule</small><strong>{formatProfileDate(date, profile)} · {time}</strong></div><div><small>Documents</small><strong>{selectedDocuments.length} selected</strong></div></div>{availableExpertCredits > 0 && <label className="credit-choice"><input type="checkbox" checked={useCredit} onChange={(event) => setUseCredit(event.target.checked)} /><span>Use one of my {availableExpertCredits} expert credit(s) for this booking.</span></label>}<div className="case-preview"><small>Case summary</small><p>{summary}</p></div><label className="consent-box"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I consent to sharing this case summary and the selected prototype document metadata with {expert.name} for this consultation. No actual file contents are transmitted in this prototype.</span></label></div>}
    <div className="booking-actions"><button className="text-button" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>← Back</button>{step < 4 ? <button className="primary" onClick={() => setStep((value) => value + 1)}>Continue →</button> : <button className="primary" disabled={!consent} onClick={confirm}>Confirm mock booking</button>}</div>
  </section></div>
}

function formatUsd(valueUsd: number, profile: UserProfile) {
  return formatPreferredCurrency(valueUsd * 122, profile.preferredCurrency, profile.interfaceLanguage)
}

function Subscription({ profile, subscription, setSubscription, savedCount, documentFolderCount, bookingCount, activeGoalCount }: {
  profile: UserProfile
  subscription: SubscriptionState
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionState>>
  savedCount: number
  documentFolderCount: number
  bookingCount: number
  activeGoalCount: number
}) {
  const [billingCycle, setBillingCycle] = useState(subscription.billingCycle)
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null)
  const [toast, setToast] = useState('')
  const closePlanModal = () => setPendingPlan(null)
  const planModalRef = useAccessibleModal(closePlanModal)
  const currentPlan = plans.find((plan) => plan.id === subscription.planId) ?? plans[1]
  const usageItems = [
    { label: 'Adviser messages', used: subscription.usage.adviserMessages, limit: currentPlan.limits.adviserMessages },
    { label: 'Programme comparisons', used: subscription.usage.comparisons, limit: currentPlan.limits.comparisons },
    { label: 'Saved programmes', used: savedCount, limit: currentPlan.limits.shortlist },
    { label: 'Document folders', used: documentFolderCount, limit: currentPlan.limits.documentFolders },
    { label: 'Expert credits', used: Math.max(0, currentPlan.limits.expertCredits - subscription.usage.expertCredits), limit: currentPlan.limits.expertCredits },
    { label: 'Active planning tracks', used: activeGoalCount, limit: currentPlan.limits.activeGoals },
  ]
  const applyPlan = () => {
    if (!pendingPlan) return
    setSubscription((current) => ({
      ...current,
      planId: pendingPlan.id,
      billingCycle,
      renewsAt: pendingPlan.id === 'free' ? 'No renewal' : billingCycle === 'annual' ? '18 June 2027' : '18 July 2026',
      usage: { ...current.usage, expertCredits: pendingPlan.limits.expertCredits },
    }))
    setToast(`Plan changed to ${pendingPlan.name}.`)
    setPendingPlan(null)
  }

  return (
    <>
      <Topbar title="Plans & usage" />
      <div className="page-content">
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
        <section className="subscription-hero">
          <div><span className="eyebrow light">Current plan</span><h2>{currentPlan.name}</h2><p>{currentPlan.tagline}</p><div className="renewal-line">{subscription.renewsAt === 'No renewal' ? 'Free plan · no billing' : `Renews ${subscription.renewsAt} · ${subscription.billingCycle} billing`}</div></div>
          <div className="plan-price"><strong>{currentPlan.monthlyUsd === 0 ? 'Free' : formatUsd(subscription.billingCycle === 'annual' ? currentPlan.annualUsd : currentPlan.monthlyUsd, profile)}</strong><span>{currentPlan.monthlyUsd === 0 ? 'forever' : subscription.billingCycle === 'annual' ? 'per year' : 'per month'}</span></div>
        </section>

        <section className="usage-panel panel">
          <div className="section-title"><div><span className="eyebrow">This billing period</span><h2>Usage and entitlements</h2></div><span className="muted">{bookingCount} consultation booking(s)</span></div>
          <div className="usage-grid">{usageItems.map((item) => {
            const unlimited = item.limit >= 999
            const percentage = unlimited ? Math.min(100, item.used * 5) : item.limit === 0 ? 100 : Math.min(100, item.used / item.limit * 100)
            return <div className="usage-item" key={item.label}><div><span>{item.label}</span><strong>{unlimited ? `${item.used} / Unlimited` : `${item.used} / ${item.limit}`}</strong></div><div className={item.used >= item.limit && !unlimited ? 'limit-hit' : ''}><span style={{ width: `${percentage}%` }} /></div></div>
          })}</div>
        </section>

        <div className="billing-toggle"><span>Billing</span><button className={billingCycle === 'monthly' ? 'active' : ''} onClick={() => setBillingCycle('monthly')}>Monthly</button><button className={billingCycle === 'annual' ? 'active' : ''} onClick={() => setBillingCycle('annual')}>Annual <em>Save ~17%</em></button></div>

        <section className="plan-grid">{plans.map((plan) => {
          const current = plan.id === subscription.planId
          const price = billingCycle === 'annual' ? plan.annualUsd : plan.monthlyUsd
          return <article className={`plan-card ${plan.recommended ? 'recommended' : ''} ${current ? 'current' : ''}`} key={plan.id}>
            {plan.recommended && <span className="recommended-label">Recommended</span>}
            <div className="plan-card-heading"><div><span className="eyebrow">{current ? 'Your plan' : plan.name}</span><h3>{plan.name}</h3></div>{current && <span className="current-check">✓</span>}</div>
            <p>{plan.tagline}</p><div className="plan-card-price"><strong>{price === 0 ? 'Free' : formatUsd(price, profile)}</strong><span>{price === 0 ? 'No payment' : billingCycle === 'annual' ? '/ year' : '/ month'}</span></div>
            <ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
            <div className="plan-limits"><span>{plan.limits.activeGoals} active planning track(s)</span><span>{plan.limits.shortlist >= 999 ? 'Unlimited' : plan.limits.shortlist} saved programmes</span><span>{plan.limits.adviserMessages} adviser messages</span><span>{plan.limits.expertCredits} expert credit(s)</span></div>
            <button className={current ? 'secondary wide' : 'primary wide'} disabled={current} onClick={() => setPendingPlan(plan)}>{current ? 'Current plan' : plan.monthlyUsd > currentPlan.monthlyUsd ? 'Upgrade plan' : 'Change plan'}</button>
          </article>
        })}</section>

        <section className="billing-note"><span>i</span><div><strong>Prototype billing</strong><p>No payment method is collected. Plan changes only update local browser entitlements so you can test feature access and usage.</p></div></section>
      </div>
      {pendingPlan && <div className="modal-backdrop" onMouseDown={closePlanModal}><section ref={planModalRef} className="plan-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="plan-change-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close plan change" onClick={closePlanModal}>×</button><span className="eyebrow">Confirm plan change</span><h2 id="plan-change-title">{currentPlan.name} → {pendingPlan.name}</h2><p>Your prototype entitlements will update immediately. No payment will be processed.</p><div className="confirmation-price"><small>{billingCycle} price</small><strong>{pendingPlan.monthlyUsd === 0 ? 'Free' : formatUsd(billingCycle === 'annual' ? pendingPlan.annualUsd : pendingPlan.monthlyUsd, profile)}</strong></div><div className="plan-confirm-actions"><button className="secondary" onClick={closePlanModal}>Cancel</button><button className="primary" onClick={applyPlan}>Confirm change</button></div></section></div>}
    </>
  )
}

function Roadmap({ documents, setView }: { documents: UserDocument[], setView: (view: View) => void }) {
  const [items, setItems] = usePersistentState<RoadmapItem[]>('navigator-roadmap', initialRoadmap)
  const effectiveItems = items.map((item) => {
    const linkedDocument = documents.find((document) => document.linkedTask === item.title)
    return linkedDocument && linkedDocument.status === 'verified' ? { ...item, status: 'completed' as const } : item
  })
  const complete = effectiveItems.filter((item) => item.status === 'completed').length
  const toggle = (id: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, status: item.status === 'completed' ? 'current' : 'completed' } : item))
  return (
    <>
      <Topbar title="My roadmap" />
      <div className="page-content">
        <section className="roadmap-head"><div><span className="eyebrow">MSc Data Science · Fall 2027</span><h2>Your path from profile to application.</h2><p>We’ll adjust the sequence as your profile and deadlines change.</p></div><div className="roadmap-progress"><strong>{complete}/{items.length}</strong><span>tasks complete</span></div></section>
        <div className="roadmap-layout">
          <section className="roadmap-list">
            {effectiveItems.map((item, index) => <article className={`roadmap-item ${item.status}`} key={item.id}>
              <div className="timeline"><button onClick={() => toggle(item.id)}>{item.status === 'completed' ? '✓' : index + 1}</button><span /></div>
              <div className="roadmap-copy"><div><span className="category">{item.category}</span><span className="roadmap-due">{item.due}</span></div><h3>{item.title}</h3><p>{item.description}</p>{documents.some((document) => document.linkedTask === item.title && document.status !== 'missing') && <span className="evidence-badge">▤ Document evidence added</span>}{item.status === 'current' && <button className="primary small" onClick={() => setView(item.category === 'Documents' ? 'documents' : item.category === 'Funding' ? 'scholarships' : 'study-plan')}>Continue task →</button>}</div>
            </article>)}
          </section>
          <aside className="roadmap-aside"><section className="panel"><span className="eyebrow">Readiness breakdown</span>{[['Academic profile', 88], ['English test', 35], ['Documents', 62], ['Funding plan', 48]].map(([label, score]) => <div className="skill-progress" key={label}><div><span>{label}</span><strong>{score}%</strong></div><div><span style={{ width: `${score}%` }} /></div></div>)}</section><section className="advisor-card"><span>✦</span><h3>Need a hand?</h3><p>Ask your AI guide to explain a task or help you make a decision.</p><button onClick={() => setView('adviser')}>Ask Navigator</button></section></aside>
        </div>
      </div>
    </>
  )
}

function Documents({ documents, onChange, onProfileUpdate, setView, plan, onUpgrade }: {
  documents: UserDocument[]
  onChange: (documents: UserDocument[]) => void
  onProfileUpdate: (update: Partial<UserProfile>) => void
  setView: (view: View) => void
  plan: SubscriptionPlan
  onUpgrade: (feature: GatedFeature) => void
}) {
  const [toast, setToast] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const completed = documents.filter((item) => item.status !== 'missing').length
  const update = (id: UserDocument['id'], patch: Partial<UserDocument>) => {
    const updated = documents.map((item) => item.id === id ? { ...item, ...patch } : item)
    onChange(updated)
    if (id === 'transcript') onProfileUpdate({ transcriptReady: patch.status !== 'missing' })
    if (id === 'ielts' && patch.status === 'verified') onProfileUpdate({ ieltsStatus: 'completed', ieltsScore: 7 })
  }
  const upload = (document: UserDocument, selectedFiles?: FileList | null) => {
    const incoming: DocumentFile[] = selectedFiles?.length
      ? Array.from(selectedFiles).map((file, index) => ({ id: `${document.id}-${document.files.length + index}-${file.name}`, name: file.name, addedAt: 'Today' }))
      : [{ id: `${document.id}-${document.files.length}-sample`, name: `${document.id}-sample-document.pdf`, addedAt: 'Today' }]
    update(document.id, { status: 'uploaded', files: [...document.files, ...incoming], fileName: undefined, uploadedAt: undefined })
    setToast(`${incoming.length} file${incoming.length > 1 ? 's' : ''} added to ${document.title}.`)
  }
  const removeFile = (document: UserDocument, fileId: string) => {
    const files = document.files.filter((file) => file.id !== fileId)
    update(document.id, { files, status: files.length ? 'uploaded' : 'missing', fileName: undefined, uploadedAt: undefined })
    setToast(`File removed from ${document.title}.`)
  }
  const addCustomFolder = () => {
    if (!canUseFeature(plan.id, 'customDocumentFolders')) {
      onUpgrade('customDocumentFolders')
      return
    }
    if (documents.length >= plan.limits.documentFolders) {
      onUpgrade('customDocumentFolders')
      return
    }
    const title = newFolderName.trim()
    if (!title) return
    onChange([...documents, {
      id: `custom-${Date.now()}`,
      title,
      description: 'Custom supporting-document folder.',
      required: false,
      status: 'missing',
      category: 'supporting',
      files: [],
      custom: true,
      linkedTask: 'Finalize a five-program shortlist',
    }])
    setNewFolderName('')
    setToast(`${title} folder created.`)
  }
  const removeFolder = (document: UserDocument) => {
    if (!document.custom || !window.confirm(`Remove the "${document.title}" folder and its prototype file records?`)) return
    onChange(documents.filter((item) => item.id !== document.id))
    setToast(`${document.title} folder removed.`)
  }

  const sections = [
    { id: 'academic', title: 'Academic records', description: 'Transcripts, language tests and other formal academic evidence.' },
    { id: 'application', title: 'Application documents', description: 'Documents used directly across applications and expert reviews.' },
    { id: 'supporting', title: 'Other supporting documents', description: 'References, training certificates, awards, portfolios and additional evidence.' },
  ] as const

  return (
    <>
      <Topbar title="Document center" />
      <div className="page-content">
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
        <section className="document-hero"><div><span className="eyebrow light">Evidence workspace</span><h2>Keep the documents behind your profile in one place.</h2><p>Prototype uploads store only a filename and status in this browser. No file content is uploaded anywhere.</p></div><div className="document-completion"><strong>{completed}/{documents.length}</strong><span>documents added</span></div></section>
        <div className="document-summary">
          <div><span className="summary-dot verified-dot" /><strong>{documents.filter((item) => item.status === 'verified').length}</strong><small>Verified</small></div>
          <div><span className="summary-dot upload-dot" /><strong>{documents.filter((item) => item.status === 'uploaded').length}</strong><small>Awaiting review</small></div>
          <div><span className="summary-dot missing-dot" /><strong>{documents.filter((item) => item.status === 'missing').length}</strong><small>Missing</small></div>
        </div>
        {sections.map((section) => <section className="document-section" key={section.id}>
          <div className="document-section-head"><div><span className="eyebrow">{section.title}</span><h2>{section.description}</h2></div>{section.id === 'supporting' && (canUseFeature(plan.id, 'customDocumentFolders') ? <div className="custom-folder-form"><input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addCustomFolder() }} placeholder="New document folder name" /><button onClick={addCustomFolder}>Add folder</button></div> : <button className="locked-inline" onClick={() => onUpgrade('customDocumentFolders')}>⌁ Custom folders · {minimumPlanName('customDocumentFolders')}</button>)}</div>
          <div className="document-list">
          {documents.filter((document) => document.category === section.id).map((document) => <article className="document-card" key={document.id}>
            <div className={`document-icon ${document.status}`}>▤</div>
            <div className="document-copy"><div className="document-title-row"><h3>{document.title}</h3><span className={`status-pill ${document.status}`}>{document.status}</span>{document.required && <span className="required-pill">Required</span>}</div><p>{document.description}</p>
              {document.files.length ? <div className="file-record-list">{document.files.map((file) => <div className="file-record" key={file.id}><span>▤</span><div><strong>{file.name}</strong><small>Added {file.addedAt}</small></div><button onClick={() => removeFile(document, file.id)} aria-label={`Remove ${file.name}`}>×</button></div>)}</div> : <small className="missing-copy">No files have been added.</small>}
              <button className="task-link" onClick={() => setView('roadmap')}>Linked roadmap task: {document.linkedTask} →</button>
            </div>
            <div className="document-actions">
              <label className="upload-button">{document.files.length ? 'Add more files' : 'Choose files'}<input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => { upload(document, event.target.files); event.target.value = '' }} /></label>
              {document.status === 'uploaded' && <button className="verify-button" onClick={() => { update(document.id, { status: 'verified' }); setToast(`${document.title} marked as verified.`) }}>Mark verified</button>}
              {document.custom && <button className="remove-button" onClick={() => removeFolder(document)}>Remove folder</button>}
            </div>
          </article>)}
          </div>
        </section>)}
        <section className="privacy-note"><span>i</span><div><strong>Prototype privacy behavior</strong><p>The browser reads the selected filename only. We do not store, transmit or inspect the file. A production version would require encrypted storage, malware scanning, permissions and retention controls.</p></div></section>
      </div>
    </>
  )
}

function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  return <div className="toast" role="status" aria-live="polite"><span>✓</span><strong>{message}</strong><button aria-label="Dismiss notification" onClick={onClose}>×</button></div>
}

function Profile({ profile, onSave }: { profile: UserProfile, onSave: (profile: UserProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const regionalDefaults = countryPreferenceDefaults[draft.country]
  const save = () => { onSave(draft); setEditing(false) }
  const applyRegionalDefaults = () => {
    if (!regionalDefaults) return
    setDraft((current) => ({
      ...current,
      preferredCurrency: regionalDefaults.currency,
      timezone: regionalDefaults.timezone,
      dateFormat: regionalDefaults.dateFormat,
      weekStartsOn: regionalDefaults.weekStartsOn,
    }))
  }
  const addSuggestedDestination = (country: string) => setDraft((current) => ({
    ...current,
    preferredCountries: current.preferredCountries.includes(country) ? current.preferredCountries : [...current.preferredCountries, country],
  }))
  return (
    <>
      <Topbar title="My profile" />
      <div className="page-content">
        <section className="profile-head"><div className="profile-avatar">{profile.fullName.split(' ').map((item) => item[0]).slice(0, 2).join('')}</div><div><span className="eyebrow">Application profile</span><h2>{profile.fullName}</h2><p>{profile.city}, {profile.country} · Changes update recommendations immediately</p></div><button className="secondary" onClick={() => { setDraft(profile); setEditing((value) => !value) }}>{editing ? 'Cancel editing' : 'Edit profile'}</button></section>
        {editing ? <section className="panel profile-editor"><div className="section-title"><div><span className="eyebrow">Personalization inputs</span><h2>Edit your guidance profile</h2></div></div><div className="field-grid">
          <label>Full name<input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></label>
          <Autocomplete label="Current institution" value={draft.institution} options={universities} onChange={(institution) => setDraft({ ...draft, institution })} placeholder="Start typing a university" />
          <label>Current degree<input value={draft.currentDegree} onChange={(e) => setDraft({ ...draft, currentDegree: e.target.value })} /></label>
          <label>CGPA<input type="number" min="0" max="4" step=".01" value={draft.cgpa} onChange={(e) => setDraft({ ...draft, cgpa: Number(e.target.value) })} /></label>
          <Autocomplete label="Target subject" value={draft.subject} options={subjects} onChange={(subject) => setDraft({ ...draft, subject })} placeholder="Start typing a subject" />
          <label>Preferred intake<select value={draft.preferredIntake} onChange={(e) => setDraft({ ...draft, preferredIntake: e.target.value })}><option>Fall 2027</option><option>Spring 2027</option><option>Fall 2028</option></select></label>
          <Autocomplete label="Current country" value={draft.country} options={countries} onChange={(country) => setDraft({ ...draft, country })} placeholder="Start typing a country" />
          <label>Current city<input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></label>
          <MultiAutocomplete label="Preferred countries" values={draft.preferredCountries} options={countries} onChange={(preferredCountries) => setDraft({ ...draft, preferredCountries })} />
          <label>Preferred currency<select value={draft.preferredCurrency} onChange={(e) => setDraft({ ...draft, preferredCurrency: e.target.value })}>{currencies.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.label}</option>)}</select></label>
          <label>Annual budget ({draft.preferredCurrency})<input type="number" step="1000" value={bdtToPreferred(draft.annualBudgetBdt, draft.preferredCurrency)} onChange={(e) => setDraft({ ...draft, annualBudgetBdt: preferredToBdt(Number(e.target.value), draft.preferredCurrency) })} /></label>
          <label>Interface language<select value={draft.interfaceLanguage} onChange={(e) => setDraft({ ...draft, interfaceLanguage: e.target.value as UserProfile['interfaceLanguage'] })}><option value="en">English</option><option value="bn">বাংলা</option></select></label>
          <label>Timezone<select value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>{timezones.map((timezone) => <option key={timezone}>{timezone}</option>)}</select></label>
          <label>Date format<select value={draft.dateFormat} onChange={(e) => setDraft({ ...draft, dateFormat: e.target.value as UserProfile['dateFormat'] })}><option value="day-first">Day first · 18 Jun 2026</option><option value="month-first">Month first · Jun 18, 2026</option><option value="iso">ISO · 2026-06-18</option></select></label>
          <label>Week starts on<select value={draft.weekStartsOn} onChange={(e) => setDraft({ ...draft, weekStartsOn: e.target.value as UserProfile['weekStartsOn'] })}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label>
          <label>IELTS status<select value={draft.ieltsStatus} onChange={(e) => setDraft({ ...draft, ieltsStatus: e.target.value as UserProfile['ieltsStatus'] })}><option value="not-planned">Not planned</option><option value="planning">Planning</option><option value="completed">Completed</option></select></label>
          <label>IELTS score<input type="number" min="0" max="9" step=".5" value={draft.ieltsScore} onChange={(e) => setDraft({ ...draft, ieltsScore: Number(e.target.value) })} disabled={draft.ieltsStatus !== 'completed'} /></label>
          <label className="check-field"><input type="checkbox" checked={draft.transcriptReady} onChange={(e) => setDraft({ ...draft, transcriptReady: e.target.checked })} /> Transcript is ready</label>
          <label className="check-field"><input type="checkbox" checked={draft.sponsorReady} onChange={(e) => setDraft({ ...draft, sponsorReady: e.target.checked })} /> Sponsor/funding evidence is ready</label>
        </div>
        {regionalDefaults && <div className="regional-suggestions"><div><span className="eyebrow">Regional starting point</span><strong>Suggested for {draft.country}</strong><small>{regionalDefaults.currency} · {regionalDefaults.timezone} · {regionalDefaults.weekStartsOn} week start</small></div><button className="secondary" onClick={applyRegionalDefaults}>Apply regional defaults</button><div className="destination-suggestions"><small>Common destination ideas from this market</small>{regionalDefaults.destinations.map((country) => <button key={country} disabled={draft.preferredCountries.includes(country)} onClick={() => addSuggestedDestination(country)}>{draft.preferredCountries.includes(country) ? '✓ ' : '+ '}{country}</button>)}</div></div>}
        <div className="profile-save"><button className="primary" onClick={save}>Save and recalculate guidance →</button></div></section> :
        <div className="profile-grid">
          <section className="panel"><div className="section-title"><h2>Academic background</h2><span className="verified">Profile data</span></div><div className="info-row"><small>Current degree</small><strong>{profile.currentDegree}</strong></div><div className="info-row"><small>Institution</small><strong>{profile.institution}</strong></div><div className="info-row"><small>CGPA</small><strong>{profile.cgpa.toFixed(2)} / 4.00</strong></div><div className="info-row"><small>IELTS</small><strong>{profile.ieltsStatus === 'completed' ? profile.ieltsScore : profile.ieltsStatus}</strong></div></section>
          <section className="panel"><div className="section-title"><h2>Study preferences</h2></div><div className="info-row"><small>Target</small><strong>{profile.targetDegree} · {profile.subject}</strong></div><div className="info-row"><small>Preferred intake</small><strong>{profile.preferredIntake}</strong></div><div className="info-row"><small>Destinations</small><strong>{profile.preferredCountries.join(', ')}</strong></div><div className="info-row"><small>Annual budget</small><strong>{formatProfileCurrency(profile.annualBudgetBdt, profile)}</strong></div><div className="info-row"><small>Display currency</small><strong>{profile.preferredCurrency}</strong></div></section>
          <section className="panel global-preferences-panel"><div className="section-title"><h2>Global preferences</h2><span className="verified">{profile.interfaceLanguage === 'bn' ? 'বাংলা preview' : 'English'}</span></div><div className="info-row"><small>Location</small><strong>{profile.city}, {profile.country}</strong></div><div className="info-row"><small>Timezone</small><strong>{profile.timezone}</strong></div><div className="info-row"><small>Date preview</small><strong>{formatProfileDate('2026-06-18', profile)}</strong></div><div className="info-row"><small>Week starts</small><strong className="capitalize">{profile.weekStartsOn}</strong></div></section>
        </div>}
      </div>
    </>
  )
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem('navigator-session')))
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('navigator-onboarded') === 'true')
  const [view, setView] = useState<View>('dashboard')
  const [selectedProgram, setSelectedProgram] = useState<Program>(programs[0])
  const [savedIds, setSavedIds] = usePersistentState<string[]>('navigator-shortlist', ['tum-ds', 'aalto-ml'])
  const [compareIds, setCompareIds] = usePersistentState<string[]>('navigator-comparison', ['tum-ds', 'aalto-ml'])
  const [profile, setProfile] = usePersistentState<UserProfile>('navigator-profile', defaultProfile)
  const [documents, setDocuments] = usePersistentState<UserDocument[]>('navigator-documents', defaultDocuments)
  const [applications, setApplications] = usePersistentState<ApplicationRecord[]>('navigator-applications', [])
  const [careerProfile, setCareerProfile] = usePersistentState<CareerProfile>('navigator-career-profile', defaultCareerProfile)
  const [jobPreparation, setJobPreparation] = usePersistentState<JobPreparationProfile>('navigator-job-preparation', defaultJobPreparationProfile)
  const [jobApplications, setJobApplications] = usePersistentState<JobApplication[]>('navigator-job-applications', defaultJobApplications)
  const initialService = serviceFromGoal(profile.goal)
  const [services, setServices] = usePersistentState<ServiceState>('navigator-services', { active: servicesForGoal(profile.goal), selected: initialService })
  const [bookings, setBookings] = usePersistentState<ConsultationBooking[]>('navigator-consultations', [])
  const [subscription, setSubscription] = usePersistentState<SubscriptionState>('navigator-subscription', {
    planId: 'essential',
    billingCycle: 'monthly',
    renewsAt: '18 July 2026',
    usage: { adviserMessages: 4, comparisons: 1, expertCredits: 0 },
  })
  const [appToast, setAppToast] = useState('')
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  useEffect(() => {
    document.documentElement.lang = profile.interfaceLanguage
  }, [profile.interfaceLanguage])
  useEffect(() => {
    setSubscription((current) => current.usage.comparisons === compareIds.length ? current : ({ ...current, usage: { ...current.usage, comparisons: compareIds.length } }))
  }, [compareIds.length, setSubscription])
  const normalizedDocuments = useMemo(() => normalizeDocuments(documents), [documents])
  useEffect(() => {
    if (JSON.stringify(documents) !== JSON.stringify(normalizedDocuments)) setDocuments(normalizedDocuments)
  }, [documents, normalizedDocuments, setDocuments])
  const scores = useMemo(() => Object.fromEntries(programs.map((program) => [program.id, scoreProgram(program, profile)])) as Record<string, ProgramScore>, [profile])
  const strongestProgram = useMemo(() => [...programs].sort((a, b) => scores[b.id].overall - scores[a.id].overall)[0], [scores])
  const notifications = useMemo(() => buildNotifications(profile, strongestProgram, normalizedDocuments), [profile, strongestProgram, normalizedDocuments])
  const missingDocuments = normalizedDocuments.filter((item) => item.required && item.status === 'missing').length
  const currentPlan = plans.find((plan) => plan.id === subscription.planId) ?? plans[1]
  useEffect(() => {
    setServices((current) => {
      if (planningTrackCount(current.active) <= currentPlan.limits.activeGoals) return current
      const selectedTrack: ServiceType[] = current.selected === 'study' ? ['study'] : careerBundle
      const active = selectedTrack.slice()
      return { active, selected: active.includes(current.selected) ? current.selected : active[0] }
    })
  }, [currentPlan.limits.activeGoals, setServices])

  if (!authenticated) return <AuthScreen onAuthenticated={(isNew) => { setAuthenticated(true); if (isNew) setOnboarded(false) }} />
  if (!onboarded) return <Onboarding profile={profile} career={careerProfile} onExit={() => { localStorage.removeItem('navigator-session'); setAuthenticated(false) }} onComplete={(updatedProfile, updatedCareer) => {
    const session = JSON.parse(localStorage.getItem('navigator-session') || '{}') as { name?: string }
    const completedProfile = session.name && session.name !== 'Samira Rahman' ? { ...updatedProfile, fullName: session.name } : updatedProfile
    const selected = serviceFromGoal(completedProfile.goal)
    setProfile(completedProfile)
    setCareerProfile(updatedCareer)
    setServices({ active: servicesForGoal(completedProfile.goal), selected })
    localStorage.setItem('navigator-onboarded', 'true')
    setOnboarded(true)
  }} />

  const openProgram = (program: Program) => { setSelectedProgram(program); setView('program') }
  const logout = () => { localStorage.removeItem('navigator-session'); setAuthenticated(false) }
  const requestUpgrade = (feature: GatedFeature) => {
    setView('subscription')
    setAppToast(`${gatedFeatureLabels[feature]} is available on the ${minimumPlanName(feature)} plan.`)
  }
  const selectService = (service: ServiceType) => {
    setServices((current) => ({ ...current, selected: service }))
    setView('dashboard')
  }
  const addService = (service: ServiceType) => {
    const bundle = service === 'study' ? ['study'] as ServiceType[] : careerBundle
    if (bundle.every((item) => services.active.includes(item))) return selectService(service)
    if (planningTrackCount(services.active) >= currentPlan.limits.activeGoals) {
      setView('subscription')
      setAppToast(`Your ${currentPlan.name} plan supports ${currentPlan.limits.activeGoals} active planning track(s).`)
      return
    }
    setServices((current) => ({ active: [...new Set([...current.active, ...bundle])], selected: service }))
    setView('dashboard')
    setAppToast(`${serviceMeta[service].label} added to your workspace.`)
  }
  const toggleSaved = (id: string) => setSavedIds((current) => {
    if (current.includes(id)) return current.filter((item) => item !== id)
    if (current.length >= currentPlan.limits.shortlist) {
      setView('subscription')
      setAppToast(`Your ${currentPlan.name} plan shortlist limit has been reached.`)
      return current
    }
    return [...current, id]
  })
  const toggleCompare = (id: string) => setCompareIds((current) => {
    if (current.includes(id)) {
      const next = current.filter((item) => item !== id)
      setSubscription((state) => ({ ...state, usage: { ...state.usage, comparisons: next.length } }))
      return next
    }
    if (current.length >= currentPlan.limits.comparisons) {
      setView('subscription')
      setAppToast(`Your ${currentPlan.name} plan comparison limit has been reached.`)
      return current
    }
    const next = [...current, id]
    setSubscription((state) => ({ ...state, usage: { ...state.usage, comparisons: next.length } }))
    return next
  })
  const resetDemo = () => {
    if (!window.confirm('Reset all prototype profile, document, shortlist, roadmap and adviser data?')) return
    ;['navigator-profile', 'navigator-documents', 'navigator-shortlist', 'navigator-comparison', 'navigator-roadmap', 'navigator-chat', 'navigator-applications', 'navigator-career-profile', 'navigator-job-preparation', 'navigator-job-applications', 'navigator-services', 'navigator-later-study-tasks', 'navigator-consultations', 'navigator-subscription'].forEach((key) => localStorage.removeItem(key))
    window.location.reload()
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-workspace">Skip to main content</a>
      <Sidebar view={view} setView={setView} onLogout={logout} documentCount={missingDocuments} planId={currentPlan.id} onLocked={requestUpgrade} profile={profile} services={services} onServiceChange={selectService} />
      <main className="workspace" id="main-workspace" tabIndex={-1}>
        {appToast && <Toast message={appToast} onClose={() => setAppToast('')} />}
        {view === 'dashboard' && <Dashboard setView={setView} openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} profile={profile} scores={scores} notifications={notifications} plan={currentPlan} services={services} onSelectService={selectService} onAddService={addService} career={careerProfile} preparation={jobPreparation} jobApplications={jobApplications} />}
        {view === 'study-plan' && <StudyPlan profile={profile} documents={normalizedDocuments} savedIds={savedIds} scores={scores} applications={applications} setApplications={setApplications} setView={setView} openProgram={openProgram} />}
        {view === 'career-plan' && <CareerPlan profile={profile} career={careerProfile} setCareer={setCareerProfile} openExperts={() => setView('experts')} />}
        {view === 'job-preparation' && <JobPreparation career={careerProfile} preparation={jobPreparation} setPreparation={setJobPreparation} documents={normalizedDocuments} openDocuments={() => setView('documents')} openExperts={() => setView('experts')} premiumCv={canUseFeature(currentPlan.id, 'premiumCv')} onUpgrade={() => requestUpgrade('premiumCv')} />}
        {view === 'job-search' && <JobSearch profile={profile} career={careerProfile} preparation={jobPreparation} documents={normalizedDocuments} applications={jobApplications} setApplications={setJobApplications} />}
        {view === 'explore' && <Explore openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} openCompare={() => setView('shortlist')} scores={scores} profile={profile} plan={currentPlan} />}
        {view === 'program' && <ProgramDetail program={selectedProgram} score={scores[selectedProgram.id]} profile={profile} goBack={() => setView('explore')} goRoadmap={() => canUseFeature(currentPlan.id, 'roadmap') ? setView('roadmap') : requestUpgrade('roadmap')} saved={savedIds.includes(selectedProgram.id)} toggleSaved={() => toggleSaved(selectedProgram.id)} advancedCosts={canUseFeature(currentPlan.id, 'advancedCosts')} onUpgrade={() => requestUpgrade('advancedCosts')} />}
        {view === 'shortlist' && <Shortlist savedIds={savedIds} compareIds={compareIds} openProgram={openProgram} toggleSaved={toggleSaved} toggleCompare={toggleCompare} scores={scores} profile={profile} plan={currentPlan} />}
        {view === 'scholarships' && <Scholarships openProgram={openProgram} />}
        {view === 'roadmap' && <Roadmap documents={normalizedDocuments} setView={setView} />}
        {view === 'documents' && <Documents documents={normalizedDocuments} onChange={setDocuments} onProfileUpdate={(update) => { setProfile((current) => ({ ...current, ...update })); setAppToast('Profile readiness updated from document status.') }} setView={setView} plan={currentPlan} onUpgrade={requestUpgrade} />}
        {view === 'adviser' && <Adviser plan={currentPlan} subscription={subscription} setSubscription={setSubscription} openPlans={() => setView('subscription')} activeService={services.selected} profile={profile} />}
        {view === 'experts' && <Experts profile={profile} documents={normalizedDocuments} bookings={bookings} setBookings={setBookings} plan={currentPlan} subscription={subscription} setSubscription={setSubscription} activeService={services.selected} />}
        {view === 'subscription' && <Subscription profile={profile} subscription={subscription} setSubscription={setSubscription} savedCount={savedIds.length} documentFolderCount={normalizedDocuments.length} bookingCount={bookings.length} activeGoalCount={planningTrackCount(services.active)} />}
        {view === 'profile' && <><Profile profile={profile} onSave={(updated) => { setProfile(updated); setAppToast('Profile saved. Guidance has been recalculated.') }} /><div className="reset-demo-wrap"><button className="reset-demo" onClick={resetDemo}>Reset all demo data</button></div></>}
      </main>
      <nav className="mobile-nav">
        {([
          ['dashboard', '⌂', 'Home'],
          [serviceMeta[services.selected].view, serviceMeta[services.selected].icon, serviceMeta[services.selected].label.split(' ')[0], services.selected === 'study' ? 'studyPlan' : services.selected === 'career' ? 'careerPlan' : services.selected === 'job-preparation' ? 'jobPreparation' : 'jobSearch'],
          ...(services.selected === 'study' ? [['explore', '⌕', 'Explore'], ['shortlist', '◇', 'Saved', 'shortlist']] : []),
          ['documents', '▤', 'Docs', 'documents'],
        ] as [View, string, string, GatedFeature?][]).map(([id, icon, label, feature]) => {
          const locked = Boolean(feature && !canUseFeature(currentPlan.id, feature))
          return <button className={`${view === id || (view === 'program' && id === 'explore') ? 'active' : ''} ${locked ? 'locked' : ''}`} onClick={() => locked && feature ? requestUpgrade(feature) : setView(id)} key={id}><span>{icon}</span>{label}{locked && <em>⌁</em>}</button>
        })}
        <button className={mobileMoreOpen ? 'active' : ''} aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen((open) => !open)}><span>•••</span>More</button>
      </nav>
      {mobileMoreOpen && <div className="mobile-more-backdrop" onClick={() => setMobileMoreOpen(false)}><section className="mobile-more-sheet" aria-label="More navigation" onClick={(event) => event.stopPropagation()}><div><strong>More tools</strong><button aria-label="Close more navigation" onClick={() => setMobileMoreOpen(false)}>×</button></div>{([
        ['scholarships', '$', 'Scholarships', 'scholarships'],
        ['shortlist', '◇', 'Saved programmes', 'shortlist'],
        ['roadmap', '✓', 'My roadmap', 'roadmap'],
        ['adviser', '✦', 'Ask Navigator', 'adviser'],
        ['experts', '◉', 'Expert consultations', 'expertBooking'],
        ['documents', '▤', 'Documents', 'documents'],
        ['subscription', '◆', 'Plans & usage'],
        ['profile', '○', 'My profile'],
      ] as [View, string, string, GatedFeature?][]).map(([id, icon, label, feature]) => {
        const locked = Boolean(feature && !canUseFeature(currentPlan.id, feature))
        return <button key={id} className={locked ? 'locked' : ''} onClick={() => { setMobileMoreOpen(false); if (locked && feature) requestUpgrade(feature); else setView(id) }}><span>{icon}</span><strong>{label}</strong>{locked && <em>{minimumPlanName(feature!)}</em>}</button>
      })}</section></div>}
    </div>
  )
}

export default App
