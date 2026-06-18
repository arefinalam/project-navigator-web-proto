import { useMemo, useState } from 'react'
import programsData from './data/programs.json'
import roadmapData from './data/roadmap.json'
import scholarshipsData from './data/scholarships.json'
import { usePersistentState } from './hooks/usePersistentState'
import { Autocomplete, MultiAutocomplete } from './components/Autocomplete'
import { countries, currencies, subjects, universities } from './data/referenceData'
import { bdtToPreferred, buildNotifications, defaultProfile, estimateCost, formatPreferredCurrency, preferredToBdt, scoreProgram } from './lib/personalization'
import type { AppNotification, ChatMessage, Program, ProgramScore, RoadmapItem, Scholarship, UserProfile, View } from './types'
import './App.css'

type AuthMode = 'login' | 'signup'

const programs = programsData as Program[]
const initialRoadmap = roadmapData as RoadmapItem[]
const scholarships = scholarshipsData as Scholarship[]

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

function Sidebar({ view, setView, onLogout }: { view: View, setView: (view: View) => void, onLogout: () => void }) {
  const links: { id: View, label: string, icon: string }[] = [
    { id: 'dashboard', label: 'Overview', icon: '⌂' },
    { id: 'explore', label: 'Explore programs', icon: '⌕' },
    { id: 'shortlist', label: 'Shortlist & compare', icon: '◇' },
    { id: 'scholarships', label: 'Scholarships', icon: '$' },
    { id: 'roadmap', label: 'My roadmap', icon: '✓' },
    { id: 'adviser', label: 'Ask Navigator', icon: '✦' },
    { id: 'profile', label: 'My profile', icon: '○' },
  ]
  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        <span className="nav-label">Workspace</span>
        {links.map((link) => <button key={link.id} className={view === link.id || (view === 'program' && link.id === 'explore') ? 'active' : ''} onClick={() => setView(link.id)}><span>{link.icon}</span>{link.label}</button>)}
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

function Roadmap() {
  const [items, setItems] = usePersistentState<RoadmapItem[]>('navigator-roadmap', initialRoadmap)
  const complete = items.filter((item) => item.status === 'completed').length
  const toggle = (id: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, status: item.status === 'completed' ? 'current' : 'completed' } : item))
  return (
    <>
      <Topbar title="My roadmap" />
      <div className="page-content">
        <section className="roadmap-head"><div><span className="eyebrow">MSc Data Science · Fall 2027</span><h2>Your path from profile to application.</h2><p>We’ll adjust the sequence as your profile and deadlines change.</p></div><div className="roadmap-progress"><strong>{complete}/{items.length}</strong><span>tasks complete</span></div></section>
        <div className="roadmap-layout">
          <section className="roadmap-list">
            {items.map((item, index) => <article className={`roadmap-item ${item.status}`} key={item.id}>
              <div className="timeline"><button onClick={() => toggle(item.id)}>{item.status === 'completed' ? '✓' : index + 1}</button><span /></div>
              <div className="roadmap-copy"><div><span className="category">{item.category}</span><span className="roadmap-due">{item.due}</span></div><h3>{item.title}</h3><p>{item.description}</p>{item.status === 'current' && <button className="primary small">Continue task →</button>}</div>
            </article>)}
          </section>
          <aside className="roadmap-aside"><section className="panel"><span className="eyebrow">Readiness breakdown</span>{[['Academic profile', 88], ['English test', 35], ['Documents', 62], ['Funding plan', 48]].map(([label, score]) => <div className="skill-progress" key={label}><div><span>{label}</span><strong>{score}%</strong></div><div><span style={{ width: `${score}%` }} /></div></div>)}</section><section className="advisor-card"><span>✦</span><h3>Need a hand?</h3><p>Ask your AI guide to explain a task or help you make a decision.</p><button>Ask Navigator</button></section></aside>
        </div>
      </div>
    </>
  )
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
  const scores = useMemo(() => Object.fromEntries(programs.map((program) => [program.id, scoreProgram(program, profile)])) as Record<string, ProgramScore>, [profile])
  const strongestProgram = useMemo(() => [...programs].sort((a, b) => scores[b.id].overall - scores[a.id].overall)[0], [scores])
  const notifications = useMemo(() => buildNotifications(profile, strongestProgram), [profile, strongestProgram])

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

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} onLogout={logout} />
      <main className="workspace">
        {view === 'dashboard' && <Dashboard setView={setView} openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} profile={profile} scores={scores} notifications={notifications} />}
        {view === 'explore' && <Explore openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} openCompare={() => setView('shortlist')} scores={scores} profile={profile} />}
        {view === 'program' && <ProgramDetail program={selectedProgram} score={scores[selectedProgram.id]} profile={profile} goBack={() => setView('explore')} goRoadmap={() => setView('roadmap')} saved={savedIds.includes(selectedProgram.id)} toggleSaved={() => toggleSaved(selectedProgram.id)} />}
        {view === 'shortlist' && <Shortlist savedIds={savedIds} compareIds={compareIds} openProgram={openProgram} toggleSaved={toggleSaved} toggleCompare={toggleCompare} scores={scores} profile={profile} />}
        {view === 'scholarships' && <Scholarships openProgram={openProgram} />}
        {view === 'roadmap' && <Roadmap />}
        {view === 'adviser' && <Adviser />}
        {view === 'profile' && <Profile profile={profile} onSave={setProfile} />}
      </main>
      <nav className="mobile-nav">
        {([['dashboard', '⌂', 'Home'], ['explore', '⌕', 'Explore'], ['shortlist', '◇', 'Saved'], ['roadmap', '✓', 'Roadmap'], ['adviser', '✦', 'Ask']] as [View, string, string][]).map(([id, icon, label]) =>
          <button className={view === id || (view === 'program' && id === 'explore') ? 'active' : ''} onClick={() => setView(id)} key={id}><span>{icon}</span>{label}</button>)}
      </nav>
    </div>
  )
}

export default App
