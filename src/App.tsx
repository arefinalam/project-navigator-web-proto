import { useEffect, useMemo, useState } from 'react'
import programsData from './data/programs.json'
import roadmapData from './data/roadmap.json'
import scholarshipsData from './data/scholarships.json'
import { usePersistentState } from './hooks/usePersistentState'
import { Autocomplete, MultiAutocomplete } from './components/Autocomplete'
import { countries, currencies, subjects, universities } from './data/referenceData'
import { defaultDocuments } from './data/documents'
import { studyPhases } from './data/studyPlan'
import { experts } from './data/experts'
import { bdtToPreferred, buildNotifications, defaultProfile, estimateCost, formatPreferredCurrency, preferredToBdt, scoreProgram } from './lib/personalization'
import type { ApplicationRecord, ApplicationStatus, AppNotification, ChatMessage, ConsultationBooking, DocumentFile, Expert, Program, ProgramScore, RoadmapItem, Scholarship, StudyPhaseId, UserDocument, UserProfile, View } from './types'
import './App.css'

type AuthMode = 'login' | 'signup'

const programs = programsData as Program[]
const initialRoadmap = roadmapData as RoadmapItem[]
const scholarships = scholarshipsData as Scholarship[]

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

function Logo() {
  return (
    <div className="brand" aria-label="Project Navigator">
      <span className="brand-mark">N</span>
      <span>Project <strong>Navigator</strong></span>
    </div>
  )
}

function ExternalLink({ href, children, className = '' }: { href: string, children: React.ReactNode, className?: string }) {
  return <a className={`external-link ${className}`} href={href} target="_blank" rel="noreferrer noopener">{children} <span aria-hidden="true">↗</span></a>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (isNew: boolean) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please complete all required fields.')
      return
    }
    localStorage.setItem('navigator-session', JSON.stringify({ name: name || 'Samira Rahman', email }))
    onAuthenticated(mode === 'signup')
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Logo />
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
          <span className="mobile-brand"><Logo /></span>
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
            <button className="primary wide" type="submit">{mode === 'login' ? 'Log in' : 'Create my profile'} <span>→</span></button>
          </form>

          <button className="demo-login" onClick={() => {
            localStorage.setItem('navigator-session', JSON.stringify({ name: 'Samira Rahman', email: 'demo@navigator.app' }))
            onAuthenticated(false)
          }}>Use demo account</button>
          <p className="legal">Prototype only — your information stays in this browser.</p>
        </div>
      </section>
    </main>
  )
}

function Onboarding({ profile, onComplete }: { profile: UserProfile, onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState(profile)
  const steps = ['Your goal', 'Education', 'Preferences']

  return (
    <main className="onboarding-page">
      <header><Logo /><span className="step-label">Profile setup · {step} of 3</span></header>
      <div className="onboarding-shell">
        <div className="stepper">
          {steps.map((item, index) => <div className={index + 1 <= step ? 'done' : ''} key={item}><span>{index + 1}</span>{item}</div>)}
        </div>
        <section className="onboarding-card">
          {step === 1 && <>
            <span className="eyebrow">Let’s begin</span>
            <h1>What would you like help with?</h1>
            <p className="muted">Choose your primary goal. You can add more services later.</p>
            <div className="choice-grid">
              {['Study abroad', 'Career planning', 'Job preparation', 'Expert opinion'].map((item) =>
                <button className={draft.goal === item ? 'selected' : ''} onClick={() => setDraft({ ...draft, goal: item })} key={item}>
                  <span className="choice-icon">{item === 'Study abroad' ? '✦' : item === 'Career planning' ? '⌁' : item === 'Job preparation' ? '◫' : '◎'}</span>
                  <strong>{item}</strong><small>{item === 'Study abroad' ? 'Programs, funding and applications' : item === 'Career planning' ? 'Find a direction that fits' : item === 'Job preparation' ? 'CV, skills and interviews' : 'Review with a specialist'}</small>
                </button>)}
            </div>
          </>}
          {step === 2 && <>
            <span className="eyebrow">Your academic direction</span>
            <h1>What do you want to study?</h1>
            <div className="field-grid">
              <label>Target degree<select value={draft.targetDegree} onChange={(e) => setDraft({ ...draft, targetDegree: e.target.value })}><option>Master’s</option><option>Bachelor’s</option><option>PhD</option></select></label>
              <Autocomplete label="Subject area" value={draft.subject} options={subjects} onChange={(subject) => setDraft({ ...draft, subject })} placeholder="Start typing a subject" />
              <label>Current CGPA<input type="number" min="0" max="4" step=".01" value={draft.cgpa} onChange={(e) => setDraft({ ...draft, cgpa: Number(e.target.value) })} /></label>
              <label>Graduation year<input type="number" value={draft.graduationYear} onChange={(e) => setDraft({ ...draft, graduationYear: Number(e.target.value) })} /></label>
            </div>
          </>}
          {step === 3 && <>
            <span className="eyebrow">Make it realistic</span>
            <h1>Tell us what matters to you</h1>
            <div className="field-grid">
              <label>Preferred intake<select value={draft.preferredIntake} onChange={(e) => setDraft({ ...draft, preferredIntake: e.target.value })}><option>Fall 2027</option><option>Spring 2027</option><option>Fall 2028</option></select></label>
              <label>Preferred currency<select value={draft.preferredCurrency} onChange={(e) => setDraft({ ...draft, preferredCurrency: e.target.value })}>{currencies.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.label}</option>)}</select></label>
              <label>Annual budget ({draft.preferredCurrency})<input type="number" step="1000" value={bdtToPreferred(draft.annualBudgetBdt, draft.preferredCurrency)} onChange={(e) => setDraft({ ...draft, annualBudgetBdt: preferredToBdt(Number(e.target.value), draft.preferredCurrency) })} /></label>
              <MultiAutocomplete label="Preferred destinations" values={draft.preferredCountries} options={countries} onChange={(preferredCountries) => setDraft({ ...draft, preferredCountries })} />
              <label>English test<select value={draft.ieltsStatus} onChange={(e) => setDraft({ ...draft, ieltsStatus: e.target.value as UserProfile['ieltsStatus'] })}><option value="planning">Planning IELTS</option><option value="completed">IELTS completed</option><option value="not-planned">Not planned</option></select></label>
            </div>
          </>}
          <div className="onboarding-actions">
            <button className="text-button" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>← Back</button>
            <button className="primary" onClick={() => step < 3 ? setStep((value) => value + 1) : onComplete(draft)}>
              {step < 3 ? 'Continue' : 'Build my roadmap'} →
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function Sidebar({ view, setView, onLogout, documentCount }: { view: View, setView: (view: View) => void, onLogout: () => void, documentCount: number }) {
  const links: { id: View, label: string, icon: string }[] = [
    { id: 'dashboard', label: 'Overview', icon: '⌂' },
    { id: 'study-plan', label: 'Study plan', icon: '◎' },
    { id: 'explore', label: 'Explore programs', icon: '⌕' },
    { id: 'shortlist', label: 'Shortlist & compare', icon: '◇' },
    { id: 'scholarships', label: 'Scholarships', icon: '$' },
    { id: 'roadmap', label: 'My roadmap', icon: '✓' },
    { id: 'documents', label: 'Documents', icon: '▤' },
    { id: 'adviser', label: 'Ask Navigator', icon: '✦' },
    { id: 'experts', label: 'Expert consultations', icon: '◉' },
    { id: 'profile', label: 'My profile', icon: '○' },
  ]
  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        <span className="nav-label">Workspace</span>
        {links.map((link) => <button key={link.id} className={view === link.id || (view === 'program' && link.id === 'explore') ? 'active' : ''} onClick={() => setView(link.id)}><span>{link.icon}</span>{link.label}{link.id === 'documents' && documentCount > 0 && <em className="nav-badge">{documentCount}</em>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="mini-profile"><span>SR</span><div><strong>Samira Rahman</strong><small>Essential plan</small></div></div>
        <button className="logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  )
}

function Topbar({ title, notifications = [], onNotification }: { title: string, notifications?: AppNotification[], onNotification?: (item: AppNotification) => void }) {
  const [open, setOpen] = useState(false)
  return <header className="topbar"><div><span className="mobile-logo"><Logo /></span><h1>{title}</h1></div><div className="top-actions"><button aria-label="Notifications" onClick={() => setOpen((value) => !value)}>♢{notifications.length > 0 && <span className="notification-dot" />}</button><div className="avatar">SR</div>{open && <div className="notification-menu"><div className="notification-title"><strong>Notifications</strong><span>{notifications.length} new</span></div>{notifications.map((item) => <button className="notification-item" key={item.id} onClick={() => { onNotification?.(item); setOpen(false) }}><span className={`notice-icon ${item.type}`}>{item.type === 'funding' ? '$' : item.type === 'deadline' ? '!' : item.type === 'profile' ? '○' : '✦'}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></button>)}</div>}</div></header>
}

function ProgramCard({ program, score, profile, onOpen, saved, compared, onSave, onCompare }: {
  program: Program
  score: ProgramScore
  profile: UserProfile
  onOpen: () => void
  saved: boolean
  compared: boolean
  onSave: () => void
  onCompare: () => void
}) {
  return (
    <article className="program-card">
      <div className="program-top">
        <div className="uni-logo" style={{ background: program.accent }}>{program.university.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
        <div className="card-actions">
          <button className={saved ? 'saved' : ''} onClick={onSave} aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}>{saved ? '♥' : '♡'}</button>
          <div className="match-ring" style={{ '--score': `${score.overall * 3.6}deg` } as React.CSSProperties}><span>{score.overall}%</span></div>
        </div>
      </div>
      <span className="country">{program.flag} {program.city}, {program.country}</span>
      <h3>{program.program}</h3>
      <p>{program.university}</p>
      <div className="tag-row"><span>{program.degree}</span><span>{program.duration}</span><span>{program.intake}</span></div>
      <div className="program-meta">
        <div><small>Annual tuition</small><strong>{formatPreferredCurrency(estimateCost(program, profile).tuitionBdt, profile.preferredCurrency)}</strong></div>
        <div><small>Deadline</small><strong>{program.deadline}</strong></div>
      </div>
      <div className="score-mini"><span>Academic {score.academic}%</span><span>Budget {score.budget}%</span></div>
      <ExternalLink href={program.programUrl} className="card-source">Official programme page</ExternalLink>
      <div className="program-card-footer">
        <label><input type="checkbox" checked={compared} onChange={onCompare} /> Compare</label>
        <button onClick={onOpen}>View match <span>→</span></button>
      </div>
    </article>
  )
}

function Dashboard({ setView, openProgram, savedIds, compareIds, toggleSaved, toggleCompare, profile, scores, notifications }: {
  setView: (view: View) => void
  openProgram: (program: Program) => void
  savedIds: string[]
  compareIds: string[]
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  profile: UserProfile
  scores: Record<string, ProgramScore>
  notifications: AppNotification[]
}) {
  const topPrograms = [...programs].sort((a, b) => scores[b.id].overall - scores[a.id].overall).slice(0, 3)
  const readiness = Math.round((profile.cgpa / 4 * 35) + (profile.ieltsStatus === 'completed' ? 30 : profile.ieltsStatus === 'planning' ? 18 : 5) + (profile.transcriptReady ? 20 : 8) + (profile.sponsorReady ? 15 : 7))
  return (
    <>
      <Topbar title="Overview" notifications={notifications} onNotification={(item) => setView(item.action)} />
      <div className="page-content">
        <section className="welcome-banner">
          <div><span className="eyebrow light">Personalized guidance</span><h2>Good afternoon, {profile.fullName.split(' ')[0]}.</h2><p>Your profile now shapes every match, cost estimate and next action.</p></div>
          <div className="readiness"><div className="large-ring" style={{ background: `conic-gradient(#79d9cc 0 ${readiness}%,rgba(255,255,255,.16) ${readiness}%)` }}><span>{readiness}%</span></div><div><strong>Application readiness</strong><small>Calculated from your profile</small></div></div>
        </section>

        <div className="stat-grid">
          <div className="stat-card"><span className="stat-icon blue">✦</span><div><strong>{programs.filter((program) => scores[program.id].overall >= 75).length}</strong><small>Strong program matches</small></div><em>Dynamic</em></div>
          <div className="stat-card"><span className="stat-icon green">✓</span><div><strong>7 / 18</strong><small>Roadmap tasks complete</small></div><em>On track</em></div>
          <div className="stat-card"><span className="stat-icon amber">◷</span><div><strong>3</strong><small>Upcoming deadlines</small></div><em>Next: 25 Jun</em></div>
        </div>

        <div className="dashboard-grid">
          <section className="panel next-action">
            <div className="section-title"><div><span className="eyebrow">Priority</span><h2>Your next best action</h2></div><span className="due-pill">Due in 7 days</span></div>
            <div className="action-body"><span className="action-number">01</span><div><h3>Create your IELTS study plan</h3><p>A target score of 7.0 will keep all 12 matched programs open. Start with a diagnostic test, then plan six weeks of preparation.</p><div className="progress"><span style={{ width: '35%' }} /></div><small>2 of 5 preparation steps completed</small></div></div>
            <button className="primary" onClick={() => setView('roadmap')}>Continue task →</button>
          </section>
          <section className="panel deadline-panel">
            <div className="section-title"><div><span className="eyebrow">Calendar</span><h2>Coming up</h2></div><button className="text-button">View all</button></div>
            {[['25', 'JUN', 'IELTS plan', 'Personal task'], ['02', 'JUL', 'Aalto scholarship', 'Funding deadline'], ['15', 'JUL', 'Transcript verification', 'Document task']].map((item) =>
              <div className="deadline-row" key={item[2]}><div className="date-box"><strong>{item[0]}</strong><small>{item[1]}</small></div><div><strong>{item[2]}</strong><small>{item[3]}</small></div><span>›</span></div>)}
          </section>
        </div>

        <section className="recommend-section">
          <div className="section-title"><div><span className="eyebrow">Recommended for you</span><h2>Your strongest program matches</h2></div><button className="text-button" onClick={() => setView('explore')}>Explore all programs →</button></div>
          <div className="program-grid">{topPrograms.map((program) => <ProgramCard key={program.id} program={program} score={scores[program.id]} profile={profile} onOpen={() => openProgram(program)} saved={savedIds.includes(program.id)} compared={compareIds.includes(program.id)} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div>
        </section>
      </div>
    </>
  )
}

function Explore({ openProgram, savedIds, compareIds, toggleSaved, toggleCompare, openCompare, scores, profile }: {
  openProgram: (program: Program) => void
  savedIds: string[]
  compareIds: string[]
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  openCompare: () => void
  scores: Record<string, ProgramScore>
  profile: UserProfile
}) {
  const [country, setCountry] = useState('All countries')
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
          <div>{['All countries', 'Germany', 'Finland', 'Netherlands'].map((item) => <button className={country === item ? 'active' : ''} onClick={() => setCountry(item)} key={item}>{item}</button>)}</div>
          <span>{filtered.length} programs · {compareIds.length}/3 selected</span>
        </div>
        {compareIds.length >= 2 && <div className="compare-banner"><span><strong>{compareIds.length} programs selected.</strong> See their cost, match and funding side by side.</span><button onClick={openCompare}>Compare now →</button></div>}
        <div className="program-grid wide-grid">{filtered.map((program) => <ProgramCard key={program.id} program={program} score={scores[program.id]} profile={profile} onOpen={() => openProgram(program)} saved={savedIds.includes(program.id)} compared={compareIds.includes(program.id)} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div>
      </div>
    </>
  )
}

function Shortlist({ savedIds, compareIds, openProgram, toggleSaved, toggleCompare, scores, profile }: {
  savedIds: string[]
  compareIds: string[]
  openProgram: (program: Program) => void
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  scores: Record<string, ProgramScore>
  profile: UserProfile
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
                  <tr><td>Tuition</td>{comparedPrograms.map((program) => <td key={program.id}>{formatPreferredCurrency(estimateCost(program, profile).tuitionBdt, profile.preferredCurrency)}</td>)}</tr>
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
          {savedPrograms.length ? <div className="program-grid">{savedPrograms.map((program) => <ProgramCard key={program.id} program={program} score={scores[program.id]} profile={profile} onOpen={() => openProgram(program)} saved compared={compareIds.includes(program.id)} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div> : <EmptyState title="No programs saved yet" text="Explore your matches and save the options you want to revisit." />}
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
  }
]

function Adviser() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = usePersistentState<ChatMessage[]>('navigator-chat', [{
    id: 1,
    role: 'assistant',
    text: 'Hi Samira. I can help you think through your program matches, funding plan, IELTS preparation and roadmap. What decision are you working on?',
    sources: ['Your profile', 'Prototype guidance data']
  }])

  const send = (question?: string) => {
    const text = (question ?? input).trim()
    if (!text) return
    const lower = text.toLowerCase()
    const response = adviserReplies.find((reply) => reply.match.some((keyword) => lower.includes(keyword))) ?? {
      text: 'Based on your current profile, the best next step is to complete the IELTS diagnostic and compare your three strongest programs. That will expose both academic and affordability gaps before you invest time in documents.',
      sources: ['Your roadmap', 'Current match scores']
    }
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text }, { id: Date.now() + 1, role: 'assistant', text: response.text, sources: response.sources }])
    setInput('')
  }

  return (
    <>
      <Topbar title="Ask Navigator" />
      <div className="page-content adviser-page">
        <section className="chat-shell">
          <div className="chat-header"><div className="navigator-orb">N</div><div><span className="eyebrow">Mock AI adviser</span><h2>Navigator</h2><p>Answers from your profile and prototype data—not live AI yet.</p></div><span className="online-pill">● Ready</span></div>
          <div className="suggestion-row">{['Which country fits my budget?', 'How should I prepare for IELTS?', 'Help me build a balanced shortlist', 'What funding should I prioritize?'].map((question) => <button onClick={() => send(question)} key={question}>{question}</button>)}</div>
          <div className="messages">
            {messages.map((message) => <div className={`message ${message.role}`} key={message.id}><div>{message.text}</div>{message.sources && <small>Based on: {message.sources.join(' · ')}</small>}</div>)}
          </div>
          <div className="chat-input"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} placeholder="Ask about your options or next step…" /><button onClick={() => send()}>Send →</button></div>
        </section>
      </div>
    </>
  )
}

function EmptyState({ title, text }: { title: string, text: string }) {
  return <div className="empty-state"><span>◇</span><h3>{title}</h3><p>{text}</p></div>
}

function ProgramDetail({ program, score, profile, goBack, goRoadmap, saved, toggleSaved }: { program: Program, score: ProgramScore, profile: UserProfile, goBack: () => void, goRoadmap: () => void, saved: boolean, toggleSaved: () => void }) {
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
            <section className="panel cost-card"><span className="eyebrow">Interactive cost estimate · {profile.preferredCurrency}</span><div className="cost-line"><small>Tuition</small><strong>{formatPreferredCurrency(cost.tuitionBdt, profile.preferredCurrency)}</strong></div><div className="cost-line"><small>Living estimate</small><strong>{formatPreferredCurrency(cost.livingBdt, profile.preferredCurrency)}</strong></div><div className="cost-line"><small>Visa, travel & applications</small><strong>{formatPreferredCurrency(cost.visaTravelBdt + cost.applicationBdt, profile.preferredCurrency)}</strong></div><label className="scholarship-input">Expected tuition scholarship <strong>{scholarshipPercent}%</strong><input type="range" min="0" max="100" step="10" value={scholarshipPercent} onChange={(event) => setScholarshipPercent(Number(event.target.value))} /></label><div className="cost-line green-text"><small>Scholarship deduction</small><strong>- {formatPreferredCurrency(cost.scholarshipBdt, profile.preferredCurrency)}</strong></div><div className="cost-line total"><small>Estimated first year</small><strong>{formatPreferredCurrency(cost.firstYearBdt, profile.preferredCurrency)}</strong></div><div className={`budget-result ${cost.budgetGapBdt <= 0 ? 'within' : 'gap'}`}><strong>{cost.budgetGapBdt <= 0 ? 'Within your budget' : `${formatPreferredCurrency(cost.budgetGapBdt, profile.preferredCurrency)} above budget`}</strong><small>Your stated annual budget: {formatPreferredCurrency(profile.annualBudgetBdt, profile.preferredCurrency)}</small></div><small className="rate-note">Prototype conversion uses fixed mock exchange rates, not live market rates.</small><button className="primary wide" onClick={goRoadmap}>Add to my roadmap →</button><button className={`secondary wide ${saved ? 'saved-button' : ''}`} onClick={toggleSaved}>{saved ? '✓ Saved to shortlist' : 'Save to shortlist'}</button></section>
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
                return <div key={program.id}><div><strong>{program.university}</strong><small>{scores[program.id].overall}% match · {formatPreferredCurrency(estimateCost(program, profile).firstYearBdt, profile.preferredCurrency)} first year</small></div><button disabled={alreadyAdded} onClick={() => addApplication(program)}>{alreadyAdded ? 'Added' : 'Start application'}</button></div>
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

function Experts({ profile, documents, bookings, setBookings }: {
  profile: UserProfile
  documents: UserDocument[]
  bookings: ConsultationBooking[]
  setBookings: React.Dispatch<React.SetStateAction<ConsultationBooking[]>>
}) {
  const [specialization, setSpecialization] = useState('All expertise')
  const [country, setCountry] = useState('All countries')
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [bookingExpert, setBookingExpert] = useState<Expert | null>(null)
  const [toast, setToast] = useState('')
  const filtered = experts.filter((expert) =>
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
        <section className="expert-hero"><div><span className="eyebrow light">Human guidance, when it matters</span><h2>Bring an expert into your study plan.</h2><p>Book a focused review with your profile, shortlist and selected documents already organized.</p></div><div><strong>{experts.length}</strong><span>prototype experts</span></div></section>

        {upcoming.length > 0 && <section className="upcoming-consultations panel">
          <div className="section-title"><div><span className="eyebrow">Upcoming</span><h2>Your booked consultations</h2></div></div>
          <div className="booking-list">{upcoming.map((booking) => {
            const expert = experts.find((item) => item.id === booking.expertId)
            const service = expert?.services.find((item) => item.id === booking.serviceId)
            if (!expert || !service) return null
            return <article className="booking-row" key={booking.id}><div className="expert-avatar small" style={{ background: expert.accent }}>{expert.initials}</div><div><strong>{service.title}</strong><span>{expert.name}</span><small>{booking.date} · {booking.time} · {booking.timezone}</small></div><div className="shared-count">▤ {booking.documentIds.length} shared</div><button onClick={() => { updateBooking(booking.id, { status: 'cancelled' }); setToast('Consultation cancelled in the prototype.') }}>Cancel</button></article>
          })}</div>
        </section>}

        <div className="expert-toolbar">
          <div><select value={specialization} onChange={(event) => setSpecialization(event.target.value)}><option>All expertise</option>{[...new Set(experts.flatMap((expert) => expert.specializations))].map((item) => <option key={item}>{item}</option>)}</select><select value={country} onChange={(event) => setCountry(event.target.value)}><option>All countries</option>{[...new Set(experts.flatMap((expert) => expert.countries))].sort().map((item) => <option key={item}>{item}</option>)}</select></div><span>{filtered.length} experts</span>
        </div>

        <div className="expert-grid">{filtered.map((expert) => {
          const startingPrice = Math.min(...expert.services.map((service) => service.priceUsd))
          return <article className="expert-card" key={expert.id}>
            <div className="expert-card-head"><div className="expert-avatar" style={{ background: expert.accent }}>{expert.initials}</div><div className="rating">★ {expert.rating}<small>({expert.reviews})</small></div></div>
            <span className="eyebrow">{expert.specializations[0]}</span><h3>{expert.name}</h3><p className="expert-title">{expert.title}</p><p className="expert-bio">{expert.bio}</p>
            <div className="expert-tags">{expert.countries.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
            <div className="expert-facts"><div><small>Experience</small><strong>{expert.experienceYears} years</strong></div><div><small>Languages</small><strong>{expert.languages.join(', ')}</strong></div></div>
            <div className="expert-card-footer"><div><small>From</small><strong>{formatUsd(startingPrice, profile.preferredCurrency)}</strong></div><button className="secondary" onClick={() => setSelectedExpert(expert)}>View profile</button><button className="primary" onClick={() => setBookingExpert(expert)}>Book</button></div>
          </article>
        })}</div>

        {previous.length > 0 && <section className="consultation-history panel"><span className="eyebrow">History</span><h2>Previous and cancelled consultations</h2>{previous.map((booking) => {
          const expert = experts.find((item) => item.id === booking.expertId)
          return <div key={booking.id}><strong>{expert?.name}</strong><span>{booking.date} · {booking.status}</span></div>
        })}</section>}
      </div>
      {selectedExpert && <ExpertProfileModal expert={selectedExpert} profile={profile} onClose={() => setSelectedExpert(null)} onBook={() => { setBookingExpert(selectedExpert); setSelectedExpert(null) }} />}
      {bookingExpert && <BookingModal expert={bookingExpert} profile={profile} documents={documents} onClose={() => setBookingExpert(null)} onConfirm={(booking) => { setBookings((current) => [...current, booking]); setBookingExpert(null); setToast('Consultation booked successfully.') }} />}
    </>
  )
}

function ExpertProfileModal({ expert, profile, onClose, onBook }: { expert: Expert, profile: UserProfile, onClose: () => void, onBook: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="expert-profile-modal" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose}>×</button>
    <div className="expert-profile-head"><div className="expert-avatar large" style={{ background: expert.accent }}>{expert.initials}</div><div><span className="eyebrow">{expert.specializations.join(' · ')}</span><h2>{expert.name}</h2><p>{expert.title}</p><div className="profile-rating">★ {expert.rating} from {expert.reviews} reviews · {expert.experienceYears} years experience</div></div></div>
    <p className="modal-bio">{expert.bio}</p>
    <div className="expert-profile-grid"><div><span className="eyebrow">Destination coverage</span><div className="expert-tags">{expert.countries.map((item) => <span key={item}>{item}</span>)}</div></div><div><span className="eyebrow">Education & background</span>{expert.education.map((item) => <p className="credential-line" key={item}>✓ {item}</p>)}</div></div>
    <ExternalLink href={expert.credentialsUrl}>View public credential reference</ExternalLink>
    <div className="service-preview"><span className="eyebrow">Available services</span>{expert.services.map((service) => <div key={service.id}><div><strong>{service.title}</strong><small>{service.durationMinutes} minutes · {service.description}</small></div><strong>{formatUsd(service.priceUsd, profile.preferredCurrency)}</strong></div>)}</div>
    <button className="primary wide" onClick={onBook}>Choose a service and book →</button>
  </section></div>
}

function BookingModal({ expert, profile, documents, onClose, onConfirm }: { expert: Expert, profile: UserProfile, documents: UserDocument[], onClose: () => void, onConfirm: (booking: ConsultationBooking) => void }) {
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState(expert.services[0].id)
  const dates = Object.keys(expert.availability)
  const [date, setDate] = useState(dates[0])
  const [time, setTime] = useState(expert.availability[dates[0]][0])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(documents.filter((item) => item.status !== 'missing').map((item) => item.id).slice(0, 2))
  const [summary, setSummary] = useState(`I want expert guidance on my ${profile.targetDegree} ${profile.subject} plan for ${profile.preferredIntake}. My preferred destinations are ${profile.preferredCountries.join(', ')}.`)
  const [consent, setConsent] = useState(false)
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
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      documentIds: selectedDocuments,
      caseSummary: summary,
      consent,
      status: 'confirmed',
    })
  }

  return <div className="modal-backdrop"><section className="booking-modal">
    <button className="modal-close" onClick={onClose}>×</button>
    <div className="booking-heading"><span className="eyebrow">Book consultation · Step {step} of 4</span><h2>{expert.name}</h2><div className="booking-stepper">{[1, 2, 3, 4].map((item) => <span className={item <= step ? 'active' : ''} key={item} />)}</div></div>
    {step === 1 && <div className="booking-content"><h3>Choose a service</h3><div className="service-choice">{expert.services.map((item) => <button className={serviceId === item.id ? 'selected' : ''} onClick={() => setServiceId(item.id)} key={item.id}><div><strong>{item.title}</strong><small>{item.durationMinutes} minutes · {item.description}</small></div><strong>{formatUsd(item.priceUsd, profile.preferredCurrency)}</strong></button>)}</div></div>}
    {step === 2 && <div className="booking-content"><h3>Select a date and time</h3><div className="date-choice">{dates.map((item) => <button className={date === item ? 'selected' : ''} onClick={() => { setDate(item); setTime(expert.availability[item][0]) }} key={item}>{item}</button>)}</div><div className="time-choice">{expert.availability[date].map((item) => <button className={time === item ? 'selected' : ''} onClick={() => setTime(item)} key={item}>{item}</button>)}</div><small className="timezone-note">Times will be treated as {Intl.DateTimeFormat().resolvedOptions().timeZone} for this prototype.</small></div>}
    {step === 3 && <div className="booking-content"><h3>Prepare the expert case</h3><label className="case-summary">Case summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label><span className="eyebrow">Documents to share</span>{availableDocuments.length ? <div className="share-documents">{availableDocuments.map((document) => <label key={document.id}><input type="checkbox" checked={selectedDocuments.includes(document.id)} onChange={() => setSelectedDocuments((current) => current.includes(document.id) ? current.filter((id) => id !== document.id) : [...current, document.id])} /><div><strong>{document.title}</strong><small>{document.files.length} file(s) · {document.status}</small></div></label>)}</div> : <p className="muted">No documents are available to share. You can still book the consultation.</p>}</div>}
    {step === 4 && <div className="booking-content booking-review"><h3>Review and consent</h3><div className="review-grid"><div><small>Service</small><strong>{service.title}</strong></div><div><small>Price</small><strong>{formatUsd(service.priceUsd, profile.preferredCurrency)}</strong></div><div><small>Schedule</small><strong>{date} · {time}</strong></div><div><small>Documents</small><strong>{selectedDocuments.length} selected</strong></div></div><div className="case-preview"><small>Case summary</small><p>{summary}</p></div><label className="consent-box"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I consent to sharing this case summary and the selected prototype document metadata with {expert.name} for this consultation. No actual file contents are transmitted in this prototype.</span></label></div>}
    <div className="booking-actions"><button className="text-button" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>← Back</button>{step < 4 ? <button className="primary" onClick={() => setStep((value) => value + 1)}>Continue →</button> : <button className="primary" disabled={!consent} onClick={confirm}>Confirm mock booking</button>}</div>
  </section></div>
}

function formatUsd(valueUsd: number, currencyCode: string) {
  return formatPreferredCurrency(valueUsd * 122, currencyCode)
}

function Roadmap({ documents }: { documents: UserDocument[] }) {
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
              <div className="roadmap-copy"><div><span className="category">{item.category}</span><span className="roadmap-due">{item.due}</span></div><h3>{item.title}</h3><p>{item.description}</p>{documents.some((document) => document.linkedTask === item.title && document.status !== 'missing') && <span className="evidence-badge">▤ Document evidence added</span>}{item.status === 'current' && <button className="primary small">Continue task →</button>}</div>
            </article>)}
          </section>
          <aside className="roadmap-aside"><section className="panel"><span className="eyebrow">Readiness breakdown</span>{[['Academic profile', 88], ['English test', 35], ['Documents', 62], ['Funding plan', 48]].map(([label, score]) => <div className="skill-progress" key={label}><div><span>{label}</span><strong>{score}%</strong></div><div><span style={{ width: `${score}%` }} /></div></div>)}</section><section className="advisor-card"><span>✦</span><h3>Need a hand?</h3><p>Ask your AI guide to explain a task or help you make a decision.</p><button>Ask Navigator</button></section></aside>
        </div>
      </div>
    </>
  )
}

function Documents({ documents, onChange, onProfileUpdate, setView }: {
  documents: UserDocument[]
  onChange: (documents: UserDocument[]) => void
  onProfileUpdate: (update: Partial<UserProfile>) => void
  setView: (view: View) => void
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
          <div className="document-section-head"><div><span className="eyebrow">{section.title}</span><h2>{section.description}</h2></div>{section.id === 'supporting' && <div className="custom-folder-form"><input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addCustomFolder() }} placeholder="New document folder name" /><button onClick={addCustomFolder}>Add folder</button></div>}</div>
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
  return <div className="toast"><span>✓</span><strong>{message}</strong><button onClick={onClose}>×</button></div>
}

function Profile({ profile, onSave }: { profile: UserProfile, onSave: (profile: UserProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const save = () => { onSave(draft); setEditing(false) }
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
          <MultiAutocomplete label="Preferred countries" values={draft.preferredCountries} options={countries} onChange={(preferredCountries) => setDraft({ ...draft, preferredCountries })} />
          <label>Preferred currency<select value={draft.preferredCurrency} onChange={(e) => setDraft({ ...draft, preferredCurrency: e.target.value })}>{currencies.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.label}</option>)}</select></label>
          <label>Annual budget ({draft.preferredCurrency})<input type="number" step="1000" value={bdtToPreferred(draft.annualBudgetBdt, draft.preferredCurrency)} onChange={(e) => setDraft({ ...draft, annualBudgetBdt: preferredToBdt(Number(e.target.value), draft.preferredCurrency) })} /></label>
          <label>IELTS status<select value={draft.ieltsStatus} onChange={(e) => setDraft({ ...draft, ieltsStatus: e.target.value as UserProfile['ieltsStatus'] })}><option value="not-planned">Not planned</option><option value="planning">Planning</option><option value="completed">Completed</option></select></label>
          <label>IELTS score<input type="number" min="0" max="9" step=".5" value={draft.ieltsScore} onChange={(e) => setDraft({ ...draft, ieltsScore: Number(e.target.value) })} disabled={draft.ieltsStatus !== 'completed'} /></label>
          <label className="check-field"><input type="checkbox" checked={draft.transcriptReady} onChange={(e) => setDraft({ ...draft, transcriptReady: e.target.checked })} /> Transcript is ready</label>
          <label className="check-field"><input type="checkbox" checked={draft.sponsorReady} onChange={(e) => setDraft({ ...draft, sponsorReady: e.target.checked })} /> Sponsor/funding evidence is ready</label>
        </div><div className="profile-save"><button className="primary" onClick={save}>Save and recalculate guidance →</button></div></section> :
        <div className="profile-grid">
          <section className="panel"><div className="section-title"><h2>Academic background</h2><span className="verified">Profile data</span></div><div className="info-row"><small>Current degree</small><strong>{profile.currentDegree}</strong></div><div className="info-row"><small>Institution</small><strong>{profile.institution}</strong></div><div className="info-row"><small>CGPA</small><strong>{profile.cgpa.toFixed(2)} / 4.00</strong></div><div className="info-row"><small>IELTS</small><strong>{profile.ieltsStatus === 'completed' ? profile.ieltsScore : profile.ieltsStatus}</strong></div></section>
          <section className="panel"><div className="section-title"><h2>Study preferences</h2></div><div className="info-row"><small>Target</small><strong>{profile.targetDegree} · {profile.subject}</strong></div><div className="info-row"><small>Preferred intake</small><strong>{profile.preferredIntake}</strong></div><div className="info-row"><small>Destinations</small><strong>{profile.preferredCountries.join(', ')}</strong></div><div className="info-row"><small>Annual budget</small><strong>{formatPreferredCurrency(profile.annualBudgetBdt, profile.preferredCurrency)}</strong></div><div className="info-row"><small>Display currency</small><strong>{profile.preferredCurrency}</strong></div></section>
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
  const [bookings, setBookings] = usePersistentState<ConsultationBooking[]>('navigator-consultations', [])
  const [appToast, setAppToast] = useState('')
  const normalizedDocuments = useMemo(() => normalizeDocuments(documents), [documents])
  useEffect(() => {
    if (JSON.stringify(documents) !== JSON.stringify(normalizedDocuments)) setDocuments(normalizedDocuments)
  }, [documents, normalizedDocuments, setDocuments])
  const scores = useMemo(() => Object.fromEntries(programs.map((program) => [program.id, scoreProgram(program, profile)])) as Record<string, ProgramScore>, [profile])
  const strongestProgram = useMemo(() => [...programs].sort((a, b) => scores[b.id].overall - scores[a.id].overall)[0], [scores])
  const notifications = useMemo(() => buildNotifications(profile, strongestProgram, normalizedDocuments), [profile, strongestProgram, normalizedDocuments])
  const missingDocuments = normalizedDocuments.filter((item) => item.required && item.status === 'missing').length

  if (!authenticated) return <AuthScreen onAuthenticated={(isNew) => { setAuthenticated(true); if (isNew) setOnboarded(false) }} />
  if (!onboarded) return <Onboarding profile={profile} onComplete={(updatedProfile) => { setProfile(updatedProfile); localStorage.setItem('navigator-onboarded', 'true'); setOnboarded(true) }} />

  const openProgram = (program: Program) => { setSelectedProgram(program); setView('program') }
  const logout = () => { localStorage.removeItem('navigator-session'); setAuthenticated(false) }
  const toggleSaved = (id: string) => setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const toggleCompare = (id: string) => setCompareIds((current) => {
    if (current.includes(id)) return current.filter((item) => item !== id)
    if (current.length >= 3) return [...current.slice(1), id]
    return [...current, id]
  })
  const resetDemo = () => {
    if (!window.confirm('Reset all prototype profile, document, shortlist, roadmap and adviser data?')) return
    ;['navigator-profile', 'navigator-documents', 'navigator-shortlist', 'navigator-comparison', 'navigator-roadmap', 'navigator-chat', 'navigator-applications', 'navigator-later-study-tasks', 'navigator-consultations'].forEach((key) => localStorage.removeItem(key))
    window.location.reload()
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} onLogout={logout} documentCount={missingDocuments} />
      <main className="workspace">
        {appToast && <Toast message={appToast} onClose={() => setAppToast('')} />}
        {view === 'dashboard' && <Dashboard setView={setView} openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} profile={profile} scores={scores} notifications={notifications} />}
        {view === 'study-plan' && <StudyPlan profile={profile} documents={normalizedDocuments} savedIds={savedIds} scores={scores} applications={applications} setApplications={setApplications} setView={setView} openProgram={openProgram} />}
        {view === 'explore' && <Explore openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} openCompare={() => setView('shortlist')} scores={scores} profile={profile} />}
        {view === 'program' && <ProgramDetail program={selectedProgram} score={scores[selectedProgram.id]} profile={profile} goBack={() => setView('explore')} goRoadmap={() => setView('roadmap')} saved={savedIds.includes(selectedProgram.id)} toggleSaved={() => toggleSaved(selectedProgram.id)} />}
        {view === 'shortlist' && <Shortlist savedIds={savedIds} compareIds={compareIds} openProgram={openProgram} toggleSaved={toggleSaved} toggleCompare={toggleCompare} scores={scores} profile={profile} />}
        {view === 'scholarships' && <Scholarships openProgram={openProgram} />}
        {view === 'roadmap' && <Roadmap documents={normalizedDocuments} />}
        {view === 'documents' && <Documents documents={normalizedDocuments} onChange={setDocuments} onProfileUpdate={(update) => { setProfile((current) => ({ ...current, ...update })); setAppToast('Profile readiness updated from document status.') }} setView={setView} />}
        {view === 'adviser' && <Adviser />}
        {view === 'experts' && <Experts profile={profile} documents={normalizedDocuments} bookings={bookings} setBookings={setBookings} />}
        {view === 'profile' && <><Profile profile={profile} onSave={(updated) => { setProfile(updated); setAppToast('Profile saved. Guidance has been recalculated.') }} /><div className="reset-demo-wrap"><button className="reset-demo" onClick={resetDemo}>Reset all demo data</button></div></>}
      </main>
      <nav className="mobile-nav">
        {([['dashboard', '⌂', 'Home'], ['study-plan', '◎', 'Plan'], ['explore', '⌕', 'Explore'], ['shortlist', '◇', 'Saved'], ['documents', '▤', 'Docs'], ['experts', '◉', 'Experts']] as [View, string, string][]).map(([id, icon, label]) =>
          <button className={view === id || (view === 'program' && id === 'explore') ? 'active' : ''} onClick={() => setView(id)} key={id}><span>{icon}</span>{label}</button>)}
      </nav>
    </div>
  )
}

export default App
