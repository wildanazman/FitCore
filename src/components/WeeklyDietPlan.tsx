import { useState, type FormEvent } from 'react'
import { useApp } from '../store/AppContext'
import { Icon } from './Icon'
import { addDays, parseISO, shortDate, startOfWeek, todayISO, uid, weekday } from '../lib/date'
import { dietWeekIdeas } from '../lib/dietWeekIdeas'
import type { DietMode } from '../types'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeeklyDietPlan({ mode, startHour }: { mode: DietMode; startHour: number }) {
  const { state, addDietTask, toggleDietTask, removeDietTask } = useApp()
  const today = todayISO()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [date, setDate] = useState(today)
  const [title, setTitle] = useState('')
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekTasks = state.dietTasks.filter((task) => task.date >= weekStart && task.date <= weekDates[6])
  const completed = weekTasks.filter((task) => task.completed).length
  const weeks = Array.from({ length: 13 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(startOfWeek(today), (w - 12) * 7 + d)))
  const ideas = dietWeekIdeas(mode, startHour)
  const openDays = weekDates.filter((day) => !weekTasks.some((task) => task.date === day))

  function moveWeek(direction: number) {
    const next = addDays(weekStart, direction * 7)
    setWeekStart(next)
    setDate(next <= today && today <= addDays(next, 6) ? today : next)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle || cleanTitle.length > 80) return
    addDietTask({ id: uid(), date, title: cleanTitle, completed: false })
    setTitle('')
  }

  function addExampleWeek() {
    weekDates.forEach((day, index) => {
      if (weekTasks.some((task) => task.date === day)) return
      addDietTask({ id: uid(), date: day, title: ideas[index], completed: false })
    })
  }

  return (
    <section className="weekly-plan" id="weekly-plan">
      <div className="diet-section-title"><h2>Make this week yours.</h2><p>Plan meals or simple food goals, then tick off what you did.</p></div>
      <button className="weekly-template" type="button" disabled={openDays.length === 0} onClick={addExampleWeek}><Icon name="auto_awesome" size={18} /> Add {mode === 'standard' ? 'balanced' : mode === '16:8' ? '16:8' : mode === 'omad' ? 'one-meal' : mode === 'keto' ? 'low-carb' : 'egg-centred'} example week <Icon name="arrow_forward" size={17} /></button>
      <p className="weekly-template-note">Adds suggestions only to empty days. Your existing plans stay untouched.</p>
      <div className="weekly-nav"><button type="button" onClick={() => moveWeek(-1)} aria-label="Previous week"><Icon name="chevron_left" /></button><strong>{shortDate(weekStart)} – {shortDate(weekDates[6])}</strong><button type="button" onClick={() => moveWeek(1)} aria-label="Next week"><Icon name="chevron_right" /></button></div>
      <div className="weekly-days">
        {weekDates.map((day, index) => {
          const tasks = weekTasks.filter((task) => task.date === day)
          return <div className={`weekly-day ${day === today ? 'is-today' : ''}`} key={day}>
            <div className="weekly-day-head"><span>{DAY_NAMES[index]} <b>{parseISO(day).getDate()}</b></span><small>{tasks.length ? `${tasks.filter((task) => task.completed).length}/${tasks.length} done` : 'No plan yet'}</small></div>
            {tasks.map((task) => <div className="weekly-task" key={task.id}><label><input type="checkbox" checked={task.completed} onChange={() => toggleDietTask(task.id)} /><span>{task.title}</span></label><button type="button" onClick={() => removeDietTask(task.id)} aria-label={`Remove ${task.title}`}><Icon name="close" size={16} /></button></div>)}
          </div>
        })}
      </div>
      <form className="weekly-add" onSubmit={submit}><label htmlFor="diet-task-title">Add to your plan</label><div><select value={date} onChange={(e) => setDate(e.target.value)} aria-label="Plan day">{weekDates.map((day) => <option key={day} value={day}>{weekday(day)} {parseISO(day).getDate()}</option>)}</select><input id="diet-task-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prep lunch at home" required /><button type="submit" disabled={!title.trim()} aria-label="Add plan item"><Icon name="add" /></button></div></form>
      <div className="diet-activity"><div className="diet-activity-head"><h3>Consistency map</h3><span>{weekTasks.length ? `${completed}/${weekTasks.length} done this week` : 'Plan your first item'}</span></div><p>Each dot shows how many items you ticked off on that day.</p><div className="diet-activity-grid" role="img" aria-label="Daily completed diet plan items over the last thirteen weeks">{weeks.map((week, wi) => <div className="diet-activity-week" key={wi}>{week.map((day) => { const count = state.dietTasks.filter((task) => task.completed && (task.completedAt ?? task.date) === day).length; return <span key={day} className={`diet-dot level-${Math.min(count, 4)} ${day > today ? 'future' : ''}`} title={`${shortDate(day)}: ${count} completed`} /> })}</div>)}</div><div className="diet-activity-legend"><span>Less</span><i className="level-0" /><i className="level-1" /><i className="level-2" /><i className="level-3" /><i className="level-4" /><span>More</span></div></div>
    </section>
  )
}
