import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TopBar } from '../components/TopBar'
import { ActivityComposer } from '../components/ActivityComposer'
import { useApp } from '../store/AppContext'
import { todayISO } from '../lib/date'
import { DailyTimeline } from '../components/DailyTimeline'
import { Icon } from '../components/Icon'
import './activity.css'

export function Activity() {
  const nav = useNavigate()
  const { state } = useApp()
  const [view, setView] = useState<'workout' | 'history'>('workout')
  const [saved, setSaved] = useState(false)
  const done = state.sessions.filter(s => s.date === todayISO() && s.completed && s.type !== 'rest')
  return <div className="activity-page"><TopBar /><header className="page-heading"><h1>Make your move.</h1><p>Home, gym or a walk outside. It all counts.</p></header>
    <div className="activity-summary"><div><strong>{done.reduce((n,s) => n+s.durationMin,0)} <small>min</small></strong><span>Moved today</span></div><div><strong>{Math.round(done.reduce((n,s) => n+s.kcal,0))} <small>kcal</small></strong><span>Activity estimate</span></div><div><strong>{done.length}</strong><span>Activities logged</span></div></div>
    <nav className="page-switch" aria-label="Activity views"><button type="button" aria-pressed={view === 'workout'} onClick={() => { setView('workout'); setSaved(false) }}>Find a workout</button><button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>Today's log</button></nav>
    {saved && <p className="activity-saved" role="status">Activity saved. Your calorie balance is updated.</p>}
    {view === 'workout' ? <ActivityComposer onSaved={() => { setSaved(true); setView('history') }} /> : <DailyTimeline />}
    <button type="button" className="activity-running-link" onClick={() => nav('/running')}><span><strong>Training for a run?</strong><small>Open your optional running plan</small></span><Icon name="arrow_forward" size={21} /></button></div>
}
