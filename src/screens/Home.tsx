import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { DietCard } from '../components/DietCard'
import { Icon } from '../components/Icon'
import { ProteinIdeas } from '../components/ProteinIdeas'
import { DailyTimeline } from '../components/DailyTimeline'
import { addDays, mondayIndex, startOfWeek, todayISO } from '../lib/date'
import { morningBrief, recoveryScore, underFuelAlert } from '../lib/coach'
import { dayFuel } from '../lib/nutrition'
import type { PlanSession } from '../types'
import './home.css'

export function Home() {
  const { state, profile, weightKg, toggleSession } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const todaySessions = state.sessions.filter((session) => session.date === today)
  const activeSessions = todaySessions.filter((session) => session.type !== 'rest')
  const completedSessions = activeSessions.filter((session) => session.completed)
  const nextSession = activeSessions.find((session) => !session.completed) ?? null
  const readiness = recoveryScore(state.sessions, today)
  const daysToRace = profile.raceDate ? Math.ceil((Date.parse(profile.raceDate) - Date.parse(today)) / 86_400_000) : null
  const lateFuelAlert = new Date().getHours() >= 16 ? underFuelAlert(fuel, todaySessions) : null
  const brief = lateFuelAlert ?? morningBrief(fuel, todaySessions, state.sessions, today, daysToRace)
  const raceWindow = daysToRace !== null && daysToRace >= 0 && daysToRace <= 3
  const hasPlannedTraining = state.sessions.some((session) => session.plan !== 'manual' && session.date >= today)
  const briefTitle = lateFuelAlert || raceWindow ? brief.headline : nextSession ? nextSession.title : hasPlannedTraining ? 'Recovery day' : 'Your day, your pace'
  const briefBody = hasPlannedTraining || lateFuelAlert ? brief.body : 'Log your meals and any movement you do. FitCore will bring your daily balance together as you go.'
  const foodLogs = state.foods.filter((food) => food.date === today).length
  const burned = completedSessions.reduce((total, session) => total + session.kcal, 0)
  const distance = completedSessions.filter((session) => session.type === 'run').reduce((total, session) => total + (session.distanceKm ?? 0), 0)
  const rawFirstName = (profile.name || 'Athlete').trim().split(/\s+/)[0]
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)

  return <div className="home-page">
    <header className="home-header"><div><p className="home-date">{new Date(`${today}T12:00:00`).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>{greeting()}, <span>{firstName}.</span></h1></div><button type="button" className="home-settings" onClick={() => nav('/settings')} aria-label="Open settings"><Icon name="settings" size={22} /></button></header>

    <section className={`home-mission ${brief.tone === 'error' ? 'home-mission-alert' : ''}`} aria-labelledby="home-mission-title"><div className="home-mission-top"><span>TODAY'S FOCUS</span>{hasPlannedTraining && <span aria-label={`Estimated training readiness ${readiness} percent`}>READINESS {readiness}% EST.</span>}</div><h2 id="home-mission-title">{briefTitle}</h2><p>{briefBody}</p><button type="button" onClick={() => nav(nextSession ? '/running' : '/food')}>{nextSession ? 'View workout' : 'Open food log'}<Icon name="arrow_forward" size={20} /></button></section>

    <WeekStrip today={today} sessions={state.sessions} />

    <div className="home-timeline"><DailyTimeline /></div>

    <section className="home-section" aria-labelledby="home-fuel-title"><SectionHeading title="Fuel today" id="home-fuel-title" action="Food log" onAction={() => nav('/food')} /><button type="button" className="home-fuel" onClick={() => nav('/food')} aria-label={`Open food log. ${Math.abs(fuel.remaining)} calories ${fuel.remaining >= 0 ? 'remaining' : 'over target'}.`}><div className="home-fuel-main"><span className="home-fuel-label">{fuel.remaining >= 0 ? 'CALORIES LEFT' : 'OVER TARGET'}</span><strong className={fuel.remaining < 0 ? 'home-negative' : ''}>{Math.abs(fuel.remaining).toLocaleString()}<small>kcal</small></strong><span className="home-fuel-arrow" aria-hidden="true"><Icon name="arrow_forward" size={22} /></span></div><div className="home-fuel-track" role="progressbar" aria-label={`${fuel.consumed} of ${fuel.budget} calories eaten`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(fuel.consumed, fuel.budget)}><span style={{ width: `${percent(fuel.consumed, fuel.budget)}%` }} /></div><div className="home-fuel-bottom"><span>{fuel.consumed.toLocaleString()} eaten</span><span>{fuel.budget.toLocaleString()} target</span></div></button><div className="home-macros"><Macro label="Protein" value={fuel.protein} target={fuel.proteinTarget} /><Macro label="Carbs" value={fuel.carbs} target={fuel.carbTarget} /><Macro label="Fat" value={fuel.fat} target={fuel.fatTarget} /></div><p className="home-footnote">{foodLogs} food log{foodLogs === 1 ? '' : 's'} today</p><div className="home-protein-ideas"><ProteinIdeas target={fuel.proteinTarget} eaten={fuel.protein} /></div></section>

    <section className="home-section" aria-labelledby="home-training-title"><SectionHeading title="Activity" id="home-training-title" action="All activity" onAction={() => nav('/train')} /><div className="home-training-summary"><span>{activeSessions.length ? `${completedSessions.length} of ${activeSessions.length} sessions complete` : 'No planned session today'}</span><span>{burned} kcal burned{distance > 0 ? ` · ${distance.toFixed(1)} km` : ''}</span></div><div className="home-training-list">{activeSessions.length === 0 ? <div className="home-rest"><Icon name="self_improvement" size={24} /><div><strong>{hasPlannedTraining ? 'Recovery day' : 'Move on your terms'}</strong><span>{hasPlannedTraining ? 'Move lightly and prioritise sleep.' : 'Add an activity only when you do one.'}</span></div></div> : activeSessions.map((session) => <SessionRow key={session.id} session={session} onToggle={() => toggleSession(session.id)} />)}</div></section>

    <section className="home-section home-diet-section" aria-label="Diet plan"><DietCard /></section>
  </div>
}

function SectionHeading({ title, id, action, onAction }: { title: string; id: string; action: string; onAction: () => void }) { return <div className="home-section-heading"><h2 id={id}>{title}</h2><button type="button" onClick={onAction}>{action}<Icon name="chevron_right" size={18} /></button></div> }

function Macro({ label, value, target }: { label: string; value: number; target: number }) { return <div className="home-macro"><span>{label}</span><strong>{value}<small>/{target} g</small></strong><div role="progressbar" aria-label={`${value} of ${target} grams ${label.toLowerCase()}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(value, target)}><span style={{ width: `${percent(value, target)}%` }} /></div></div> }

function SessionRow({ session, onToggle }: { session: PlanSession; onToggle: () => void }) { return <div className={`home-session ${session.completed ? 'home-session-done' : ''}`}><span className="home-session-icon"><Icon name={session.completed ? 'check' : session.icon} size={24} /></span><div><strong>{session.title}</strong><span>{session.detail}</span></div><button type="button" onClick={onToggle} aria-label={`${session.completed ? 'Mark incomplete' : 'Mark complete'}: ${session.title}`} aria-pressed={session.completed}><Icon name={session.completed ? 'check' : 'done'} size={20} /></button></div> }

function WeekStrip({ today, sessions }: { today: string; sessions: PlanSession[] }) { const start = startOfWeek(today); const todayIndex = mondayIndex(today); const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; return <section className="home-week" aria-label="Weekly training consistency"><div className="home-week-title"><strong>This week</strong><span>TRAINING RHYTHM</span></div><div className="home-week-days">{letters.map((letter, index) => { const date = addDays(start, index); const isToday = index === todayIndex; const hasCompleted = sessions.some((session) => session.date === date && session.type !== 'rest' && session.completed); const hasPlan = sessions.some((session) => session.date === date && session.type !== 'rest'); return <div key={date} className={isToday ? 'home-week-today' : ''}><span>{letter}</span><strong>{Number(date.slice(-2))}</strong><i className={hasCompleted ? 'home-week-complete' : hasPlan ? 'home-week-planned' : ''} aria-hidden="true" /></div> })}</div></section> }

function greeting(): string { const hour = new Date().getHours(); if (hour < 12) return 'Morning'; if (hour < 18) return 'Afternoon'; return 'Evening' }
function percent(value: number, target: number): number { return target > 0 ? Math.min(100, Math.max(0, Math.round((value / target) * 100))) : 0 }
