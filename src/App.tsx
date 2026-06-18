import { useMemo, useState } from 'react'
import programsData from './data/programs.json'
import roadmapData from './data/roadmap.json'
import scholarshipsData from './data/scholarships.json'
import { usePersistentState } from './hooks/usePersistentState'
import type { ChatMessage, Program, RoadmapItem, Scholarship, View } from './types'
import './App.css'

type AuthMode = 'login' | 'signup'

const programs = programsData as Program[]
const initialRoadmap = roadmapData as RoadmapItem[]
const scholarships = scholarshipsData as Scholarship[]

const money = new Intl.NumberFormat('en-US')

function Logo() {
  return (
    <div className="brand" aria-label="Project Navigator">
      <span className="brand-mark">N</span>
      <span>Project <strong>Navigator</strong></span>
    </div>
  )
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

function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('Study abroad')
  const [degree, setDegree] = useState('Master’s')
  const [subject, setSubject] = useState('Data Science & AI')
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
                <button className={goal === item ? 'selected' : ''} onClick={() => setGoal(item)} key={item}>
                  <span className="choice-icon">{item === 'Study abroad' ? '✦' : item === 'Career planning' ? '⌁' : item === 'Job preparation' ? '◫' : '◎'}</span>
                  <strong>{item}</strong><small>{item === 'Study abroad' ? 'Programs, funding and applications' : item === 'Career planning' ? 'Find a direction that fits' : item === 'Job preparation' ? 'CV, skills and interviews' : 'Review with a specialist'}</small>
                </button>)}
            </div>
          </>}
          {step === 2 && <>
            <span className="eyebrow">Your academic direction</span>
            <h1>What do you want to study?</h1>
            <div className="field-grid">
              <label>Target degree<select value={degree} onChange={(e) => setDegree(e.target.value)}><option>Master’s</option><option>Bachelor’s</option><option>PhD</option></select></label>
              <label>Subject area<select value={subject} onChange={(e) => setSubject(e.target.value)}><option>Data Science & AI</option><option>Business & Management</option><option>Engineering</option><option>Public Health</option></select></label>
              <label>Current CGPA<input defaultValue="3.62 / 4.00" /></label>
              <label>Graduation year<input defaultValue="2025" /></label>
            </div>
          </>}
          {step === 3 && <>
            <span className="eyebrow">Make it realistic</span>
            <h1>Tell us what matters to you</h1>
            <div className="field-grid">
              <label>Preferred intake<select><option>Fall 2027</option><option>Spring 2027</option><option>Fall 2028</option></select></label>
              <label>Annual budget<select><option>BDT 15–25 lakh</option><option>Under BDT 15 lakh</option><option>BDT 25–40 lakh</option></select></label>
              <label>Preferred destinations<input defaultValue="Germany, Finland, Netherlands" /></label>
              <label>English test<select><option>Planning IELTS</option><option>IELTS completed</option><option>Not planned</option></select></label>
            </div>
          </>}
          <div className="onboarding-actions">
            <button className="text-button" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>← Back</button>
            <button className="primary" onClick={() => step < 3 ? setStep((value) => value + 1) : onComplete()}>
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

function Topbar({ title }: { title: string }) {
  return <header className="topbar"><div><span className="mobile-logo"><Logo /></span><h1>{title}</h1></div><div className="top-actions"><button aria-label="Notifications">♢<span className="notification-dot" /></button><div className="avatar">SR</div></div></header>
}

function ProgramCard({ program, onOpen, saved, compared, onSave, onCompare }: {
  program: Program
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
          <div className="match-ring" style={{ '--score': `${program.match * 3.6}deg` } as React.CSSProperties}><span>{program.match}%</span></div>
        </div>
      </div>
      <span className="country">{program.flag} {program.city}, {program.country}</span>
      <h3>{program.program}</h3>
      <p>{program.university}</p>
      <div className="tag-row"><span>{program.degree}</span><span>{program.duration}</span><span>{program.intake}</span></div>
      <div className="program-meta">
        <div><small>Annual tuition</small><strong>{program.currency} {money.format(program.tuition)}</strong></div>
        <div><small>Deadline</small><strong>{program.deadline}</strong></div>
      </div>
      <div className="program-card-footer">
        <label><input type="checkbox" checked={compared} onChange={onCompare} /> Compare</label>
        <button onClick={onOpen}>View match <span>→</span></button>
      </div>
    </article>
  )
}

function Dashboard({ setView, openProgram, savedIds, compareIds, toggleSaved, toggleCompare }: {
  setView: (view: View) => void
  openProgram: (program: Program) => void
  savedIds: string[]
  compareIds: string[]
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
}) {
  const topPrograms = programs.slice(0, 3)
  return (
    <>
      <Topbar title="Overview" />
      <div className="page-content">
        <section className="welcome-banner">
          <div><span className="eyebrow light">Thursday, 18 June</span><h2>Good afternoon, Samira.</h2><p>You are making steady progress toward your MSc Data Science goal.</p></div>
          <div className="readiness"><div className="large-ring"><span>74%</span></div><div><strong>Application readiness</strong><small>Up 6% this month</small></div></div>
        </section>

        <div className="stat-grid">
          <div className="stat-card"><span className="stat-icon blue">✦</span><div><strong>12</strong><small>Strong program matches</small></div><em>3 new</em></div>
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
          <div className="program-grid">{topPrograms.map((program) => <ProgramCard key={program.id} program={program} onOpen={() => openProgram(program)} saved={savedIds.includes(program.id)} compared={compareIds.includes(program.id)} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div>
        </section>
      </div>
    </>
  )
}

function Explore({ openProgram, savedIds, compareIds, toggleSaved, toggleCompare, openCompare }: {
  openProgram: (program: Program) => void
  savedIds: string[]
  compareIds: string[]
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
  openCompare: () => void
}) {
  const [country, setCountry] = useState('All countries')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => programs.filter((program) =>
    (country === 'All countries' || program.country === country) &&
    `${program.program} ${program.university}`.toLowerCase().includes(query.toLowerCase())
  ), [country, query])
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
        <div className="program-grid wide-grid">{filtered.map((program) => <ProgramCard key={program.id} program={program} onOpen={() => openProgram(program)} saved={savedIds.includes(program.id)} compared={compareIds.includes(program.id)} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div>
      </div>
    </>
  )
}

function Shortlist({ savedIds, compareIds, openProgram, toggleSaved, toggleCompare }: {
  savedIds: string[]
  compareIds: string[]
  openProgram: (program: Program) => void
  toggleSaved: (id: string) => void
  toggleCompare: (id: string) => void
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
                  <tr><td>Match</td>{comparedPrograms.map((program) => <td key={program.id}><span className="score-chip">{program.match}%</span></td>)}</tr>
                  <tr><td>Tuition</td>{comparedPrograms.map((program) => <td key={program.id}>{program.currency} {money.format(program.tuition)}</td>)}</tr>
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
          {savedPrograms.length ? <div className="program-grid">{savedPrograms.map((program) => <ProgramCard key={program.id} program={program} onOpen={() => openProgram(program)} saved compared={compareIds.includes(program.id)} onSave={() => toggleSaved(program.id)} onCompare={() => toggleCompare(program.id)} />)}</div> : <EmptyState title="No programs saved yet" text="Explore your matches and save the options you want to revisit." />}
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

function ProgramDetail({ program, goBack, goRoadmap, saved, toggleSaved }: { program: Program, goBack: () => void, goRoadmap: () => void, saved: boolean, toggleSaved: () => void }) {
  return (
    <>
      <Topbar title="Program match" />
      <div className="page-content detail-page">
        <button className="back-button" onClick={goBack}>← Back to programs</button>
        <section className="detail-hero">
          <div className="uni-logo large" style={{ background: program.accent }}>{program.university.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
          <div className="detail-heading"><span>{program.flag} {program.city}, {program.country}</span><h1>{program.program}</h1><p>{program.university} · {program.ranking}</p></div>
          <div className="detail-score"><strong>{program.match}%</strong><span>Excellent match</span></div>
        </section>
        <div className="detail-grid">
          <main>
            <section className="panel"><span className="eyebrow">Why it fits you</span><h2>A strong balance of ambition and reality.</h2><div className="reason-list">{program.matchReasons.map((reason) => <div key={reason}><span>✓</span><p>{reason}</p></div>)}</div></section>
            <section className="panel"><span className="eyebrow">Program overview</span><h2>About this program</h2><p className="body-copy">{program.description}</p><div className="fact-grid"><div><small>Degree</small><strong>{program.degree}</strong></div><div><small>Duration</small><strong>{program.duration}</strong></div><div><small>Intake</small><strong>{program.intake}</strong></div><div><small>Deadline</small><strong>{program.deadline}</strong></div></div></section>
            <section className="panel"><span className="eyebrow">Career direction</span><h2>Where this can take you</h2><div className="career-tags">{program.careerPaths.map((item) => <span key={item}>{item}</span>)}</div></section>
          </main>
          <aside>
            <section className="panel cost-card"><span className="eyebrow">Estimated cost</span><div className="cost-line"><small>Annual tuition</small><strong>{program.currency} {money.format(program.tuition)}</strong></div><div className="cost-line"><small>Scholarship</small><strong className="green-text">{program.scholarship}</strong></div><div className="cost-line total"><small>Estimated first year</small><strong>BDT 18–24 lakh</strong></div><button className="primary wide" onClick={goRoadmap}>Add to my roadmap →</button><button className={`secondary wide ${saved ? 'saved-button' : ''}`} onClick={toggleSaved}>{saved ? '✓ Saved to shortlist' : 'Save to shortlist'}</button></section>
            <section className="panel"><span className="eyebrow">Entry requirements</span><ul className="requirements">{program.requirements.map((item) => <li key={item}>{item}</li>)}</ul><small className="source-note">Mock data · Last reviewed 18 Jun 2026</small></section>
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

function Profile() {
  return (
    <>
      <Topbar title="My profile" />
      <div className="page-content">
        <section className="profile-head"><div className="profile-avatar">SR</div><div><span className="eyebrow">Application profile</span><h2>Samira Rahman</h2><p>Dhaka, Bangladesh · Updated today</p></div><button className="secondary">Edit profile</button></section>
        <div className="profile-grid">
          <section className="panel"><div className="section-title"><h2>Academic background</h2><span className="verified">✓ Verified</span></div><div className="info-row"><small>Current degree</small><strong>BSc in Computer Science</strong></div><div className="info-row"><small>Institution</small><strong>North South University</strong></div><div className="info-row"><small>CGPA</small><strong>3.62 / 4.00</strong></div><div className="info-row"><small>Graduation</small><strong>2025</strong></div></section>
          <section className="panel"><div className="section-title"><h2>Study preferences</h2></div><div className="info-row"><small>Target</small><strong>MSc Data Science & AI</strong></div><div className="info-row"><small>Preferred intake</small><strong>Fall 2027</strong></div><div className="info-row"><small>Destinations</small><strong>Germany, Finland, Netherlands</strong></div><div className="info-row"><small>Annual budget</small><strong>BDT 15–25 lakh</strong></div></section>
        </div>
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

  if (!authenticated) return <AuthScreen onAuthenticated={(isNew) => { setAuthenticated(true); if (isNew) setOnboarded(false) }} />
  if (!onboarded) return <Onboarding onComplete={() => { localStorage.setItem('navigator-onboarded', 'true'); setOnboarded(true) }} />

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
        {view === 'dashboard' && <Dashboard setView={setView} openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} />}
        {view === 'explore' && <Explore openProgram={openProgram} savedIds={savedIds} compareIds={compareIds} toggleSaved={toggleSaved} toggleCompare={toggleCompare} openCompare={() => setView('shortlist')} />}
        {view === 'program' && <ProgramDetail program={selectedProgram} goBack={() => setView('explore')} goRoadmap={() => setView('roadmap')} saved={savedIds.includes(selectedProgram.id)} toggleSaved={() => toggleSaved(selectedProgram.id)} />}
        {view === 'shortlist' && <Shortlist savedIds={savedIds} compareIds={compareIds} openProgram={openProgram} toggleSaved={toggleSaved} toggleCompare={toggleCompare} />}
        {view === 'scholarships' && <Scholarships openProgram={openProgram} />}
        {view === 'roadmap' && <Roadmap />}
        {view === 'adviser' && <Adviser />}
        {view === 'profile' && <Profile />}
      </main>
      <nav className="mobile-nav">
        {([['dashboard', '⌂', 'Home'], ['explore', '⌕', 'Explore'], ['shortlist', '◇', 'Saved'], ['roadmap', '✓', 'Roadmap'], ['adviser', '✦', 'Ask']] as [View, string, string][]).map(([id, icon, label]) =>
          <button className={view === id || (view === 'program' && id === 'explore') ? 'active' : ''} onClick={() => setView(id)} key={id}><span>{icon}</span>{label}</button>)}
      </nav>
    </div>
  )
}

export default App
