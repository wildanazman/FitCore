import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TopBar } from '../components/TopBar'
import { ActivityComposer } from '../components/ActivityComposer'
import { useApp } from '../store/AppContext'
import { shortDate, timeLabel, todayISO } from '../lib/date'
import { Icon } from '../components/Icon'
import { LogDatePicker } from '../components/LogDatePicker'
import './activity.css'

export function Activity() {
  const nav = useNavigate()
  const { state, removeSession, toggleSession } = useApp()
  const [view, setView] = useState<'workout' | 'history'>('workout')
  const [saved, setSaved] = useState(false)
  const [date, setDate] = useState(todayISO)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const sessions = state.sessions.filter(s => s.date === date && s.type !== 'rest').sort((a,b) => (b.loggedAt ?? '').localeCompare(a.loggedAt ?? ''))
  const done = state.sessions.filter(s => s.date === date && s.completed && s.type !== 'rest')
  return <div className="activity-page"><TopBar /><header className="page-heading"><h1>Make your move.</h1><p>Home, gym or a walk outside. It all counts.</p></header>
    <details className="activity-date"><summary><span><Icon name="calendar_today" size={18} />Logging for <strong>{date === todayISO() ? 'Today' : shortDate(date)}</strong></span><span>Change date<Icon name="expand_more" size={18} /></span></summary><LogDatePicker date={date} onChange={(day) => { setDate(day); setSaved(false); setRemoveId(null) }} /></details>
    <div className="activity-summary"><div><strong>{done.reduce((n,s) => n+s.durationMin,0)} <small>min</small></strong><span>{date === todayISO() ? 'Moved today' : 'Moved this day'}</span></div><div><strong>{Math.round(done.reduce((n,s) => n+s.kcal,0))} <small>kcal</small></strong><span>Activity estimate</span></div><div><strong>{done.length}</strong><span>Activities logged</span></div></div>
    <nav className="page-switch" aria-label="Activity views"><button type="button" aria-pressed={view === 'workout'} onClick={() => { setView('workout'); setSaved(false) }}>Find a workout</button><button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}>{date === todayISO() ? "Today's log" : 'Day’s log'}</button></nav>
    {saved && <p className="activity-saved" role="status"><Icon name="check_circle" size={20} />Saved to your activity log.</p>}
    {view === 'workout' ? <ActivityComposer variant="library" date={date} onSaved={() => { setSaved(true); setView('history') }} /> : <section className="activity-journal" aria-labelledby="activity-journal-title">
      <div className="activity-journal-heading"><div><h2 id="activity-journal-title">Your movement journal.</h2><p>{done.length} completed · {sessions.length - done.length} planned</p></div><button type="button" onClick={() => { setView('workout'); setSaved(false) }}><Icon name="add" size={20} />Log activity</button></div>
      {sessions.length ? <ul className="activity-journal-list">{sessions.map(session => <li key={session.id}>
        <div className="activity-journal-icon"><Icon name={session.icon ?? 'exercise'} size={24} /></div>
        <div className="activity-journal-body"><div className="activity-journal-meta"><span>{session.completed ? 'Completed' : 'Planned'}</span>{session.loggedAt && <time dateTime={session.loggedAt}>{timeLabel(session.loggedAt)}</time>}</div><h3>{session.title}</h3><p>{session.detail || `${session.durationMin} min`}</p><div className="activity-journal-energy">{session.kcal > 0 ? `≈ ${Math.round(session.kcal)} kcal` : 'Calories not estimated'}</div>
        {removeId === session.id ? <div className="activity-remove-confirm"><span>Remove this activity?</span><button type="button" onClick={() => setRemoveId(null)}>Cancel</button><button type="button" onClick={() => { removeSession(session.id); setRemoveId(null) }}>Remove</button></div> : <div className="activity-journal-actions"><button type="button" onClick={() => toggleSession(session.id)}>{session.completed ? 'Mark incomplete' : 'Mark completed'}</button><button type="button" aria-label={`Remove ${session.title}`} onClick={() => setRemoveId(session.id)}><Icon name="delete" size={18} /></button></div>}</div>
      </li>)}</ul> : <div className="activity-journal-empty"><Icon name="exercise" size={36} /><h3>A fresh page for your movement.</h3><p>A short walk or a set of squats—start with what you did.</p><button type="button" onClick={() => setView('workout')}>Find an activity<Icon name="arrow_forward" size={18} /></button></div>}
    </section>}
    <button type="button" className="activity-running-link" onClick={() => nav('/running')}><span><strong>Race goals & running plans</strong><small>Your running workspace, separate from daily logging.</small></span><Icon name="arrow_forward" size={21} /></button></div>
}
