import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { shortDate, todayISO } from '../lib/date'
import { tdee } from '../lib/nutrition'
import { ActivityComposer } from './ActivityComposer'
import './daily-timeline.css'

type LogMode = 'activity' | null
export function DailyTimeline({ date = todayISO() }: { date?: string }) {
  const { state, profile, weightKg, removeFood, removeSession } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<LogMode>(null)
  const today = date
  const foods = state.foods.filter((item) => item.date === today)
  const activities = state.sessions.filter((item) => item.date === today && item.manual && item.completed)
  const eaten = Math.round(foods.reduce((sum, item) => sum + item.kcal * item.servings, 0))
  const burned = Math.round(activities.reduce((sum, item) => sum + item.kcal, 0))
  const maintenance = tdee(profile, weightKg)
  const deficit = maintenance + burned - eaten
  const weeklyKg = Math.abs(deficit * 7 / 7700)
  const entries = [
    ...foods.map((item) => ({ id: item.id, kind: 'meal' as const, at: item.loggedAt, title: item.name, detail: item.slot, kcal: Math.round(item.kcal * item.servings), unestimated: false })),
    ...activities.map((item) => ({ id: item.id, kind: 'activity' as const, at: item.loggedAt ?? `${item.date}T12:00:00`, title: item.title, detail: item.strengthLog ? item.detail : `${item.durationMin} min`, kcal: item.kcal, unestimated: !!item.strengthLog && !item.strengthLog.calorieEstimate && item.kcal === 0 })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  return <section className="daily-timeline" aria-labelledby="daily-timeline-title">
    <div className="daily-timeline-heading"><div><h2 id="daily-timeline-title">{date === todayISO() ? "Today's timeline" : `${shortDate(date)} timeline`}</h2><p>Food in. Movement out. All in one place.</p></div></div>
    <div className="daily-log-actions"><button type="button" onClick={() => navigate(`/food?add=1&date=${date}`)}>+ Log meal</button><button type="button" onClick={() => setMode(mode === 'activity' ? null : 'activity')} aria-expanded={mode === 'activity'}>+ Log activity</button></div>
    {mode === 'activity' && <ActivityComposer date={date} onSaved={() => setMode(null)} />}
    <div className="daily-balance"><div><span>Maintenance</span><strong>{maintenance.toLocaleString()}</strong></div><div><span>Food</span><strong>−{eaten.toLocaleString()}</strong></div><div><span>Logged activity</span><strong>+{burned.toLocaleString()}</strong></div><div className="daily-balance-result"><span>{deficit >= 0 ? 'Estimated deficit' : 'Estimated surplus'}</span><strong>{Math.abs(deficit).toLocaleString()} kcal</strong></div></div>
    {foods.length > 0 ? <p className="daily-projection">If this full-day intake repeats: <strong>about {weeklyKg.toFixed(1)} kg {deficit >= 0 ? 'loss' : 'gain'} in a week</strong>. Rough estimate only; incomplete food logs or activity already counted in maintenance can overstate it.</p> : <p className="daily-projection">Log your meals to unlock a weekly trend estimate. A partial-day balance is not a completed deficit.</p>}
    <div className="daily-entry-list">{entries.length ? entries.map((entry) => <div className="daily-entry" key={`${entry.kind}-${entry.id}`}><span className="daily-entry-time">{new Date(entry.at).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}</span><div><strong>{entry.title}</strong><span>{entry.detail}</span></div><b>{entry.unestimated ? 'Not estimated' : `${entry.kind === 'meal' ? '+' : '−'}${entry.kcal} kcal`}</b><button type="button" aria-label={`Remove ${entry.title}`} onClick={() => entry.kind === 'meal' ? removeFood(entry.id) : removeSession(entry.id)}>×</button></div>) : <p className="daily-empty">Nothing logged yet. Start with your next meal or activity.</p>}</div>
  </section>
}
