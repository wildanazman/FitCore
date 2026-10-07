import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { addDays, isLogDate, parseISO, shortDate, startOfWeek, weekday } from '../lib/date'
import { showUpStreak, STREAK_MILESTONES } from '../lib/streak'
import { Icon } from './Icon'
import './show-up-trail.css'

export function ShowUpTrail({ date, today, onChooseDay }: { date: string; today: string; onChooseDay: (date: string) => void }) {
  const { state } = useApp()
  const nav = useNavigate()
  const reduced = useReducedMotion()
  const [celebrate, setCelebrate] = useState(false)
  const streak = showUpStreak(state, today)
  const track = useRef<HTMLDivElement>(null)
  const week = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const weekCount = days.filter(day => streak.checked.has(day)).length
  useEffect(() => {
    const row = track.current
    const selected = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (row && selected) row.scrollLeft = Math.max(0, selected.offsetLeft - row.offsetLeft - row.clientWidth / 2 + selected.offsetWidth / 2)
  }, [date, week])
  useEffect(() => {
    let newlyDone = false
    try {
      const key = `fitcore.show-up.${today}`
      newlyDone = streak.todayDone && sessionStorage.getItem(key) === 'pending'
      sessionStorage.setItem(key, streak.todayDone ? 'done' : 'pending')
    } catch { /* Streak still works when browser storage is unavailable. */ }
    if (!streak.todayDone) { setCelebrate(false); return }
    if (!newlyDone && !celebrate) return
    if (newlyDone) setCelebrate(true)
    const timer = window.setTimeout(() => setCelebrate(false), 4000)
    return () => window.clearTimeout(timer)
  }, [streak.todayDone, today, celebrate])

  const title = streak.current === 0 ? (streak.best ? 'Your next chapter starts here.' : 'Start your Show Up streak.') : `${streak.current}-day Show Up streak`
  const message = streak.todayDone ? 'Today is secured. You showed up.' : streak.pendingRescue ? 'Missed yesterday? Log today to rescue your streak.' : streak.current ? 'One real log today keeps your rhythm going.' : 'One meal, movement or weigh-in. That’s all it takes.'
  return <section className={`show-up ${celebrate ? 'is-celebrating' : ''}`} aria-labelledby="show-up-title">
    <div className="show-up-heading">
      <div><h2 id="show-up-title"><Icon name="bolt" size={20} fill />{title}</h2><p>{message}</p></div>
      <button type="button" className="show-up-awards" onClick={()=>nav('/achievements')} aria-label={`Achievements: ${streak.earned.length} earned`}><Icon name="emoji_events" size={20}/><span>{streak.earned.length}</span></button>
    </div>
    <nav className="show-up-week" aria-label="Browse check-in weeks"><button type="button" aria-label="Previous week" disabled={addDays(date, -7) < '1900-01-01'} onClick={() => onChooseDay(addDays(date, -7))}><Icon name="chevron_left" size={22} /></button><span>{week === startOfWeek(today) ? 'This week' : 'Your week'}<small>{shortDate(week)} – {shortDate(addDays(week, 6))}</small></span><button type="button" aria-label="Next week" disabled={addDays(week, 7) > today} onClick={() => onChooseDay(addDays(date, 7) > today ? today : addDays(date, 7))}><Icon name="chevron_right" size={22} /></button></nav>
    <div ref={track} className="show-up-dates" role="group" aria-label="Choose a day, Monday to Sunday">
      {days.map(day => {
        const done = streak.checked.has(day)
        const rescued = streak.rescued.has(day)
        const status = done ? 'Checked in' : rescued ? 'Rescued' : day > today ? 'Upcoming' : day === today ? 'Today' : 'No check-in'
        return <button type="button" key={day} disabled={day > today} onClick={() => onChooseDay(day)} className={`show-up-day ${done ? 'is-done' : ''} ${rescued ? 'is-rescued' : ''} ${date === day ? 'is-selected' : ''}`} aria-pressed={date === day} aria-label={`${weekday(day)}, ${shortDate(day)}: ${status}`}>
          <span>{weekday(day)}</span>
          <motion.span className="show-up-stamp" animate={day === today && celebrate && !reduced ? { scale: [1, 1.16, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
            {done || rescued ? <Icon name={done ? 'check' : 'shield'} size={21} /> : <strong>{parseISO(day).getDate()}</strong>}
          </motion.span>
          <small>{done ? parseISO(day).getDate() : rescued ? 'Saved' : day === today ? 'Today' : '—'}</small>
        </button>
      })}
    </div>
    <p className="show-up-swipe">Swipe dates to explore your week</p>
    <div className="show-up-feedback" role="status" aria-live="polite">
      {celebrate ? <><Icon name="celebration" size={19} /><strong>{STREAK_MILESTONES.some(item => item.days === streak.current) ? `${streak.current} days. Milestone reached!` : `Day ${streak.current}, stamped. Nice work.`}</strong></> : <><span>{weekCount} check-in{weekCount === 1 ? '' : 's'} {week===startOfWeek(today)?'this week':'in this week'}</span><span><Icon name="flag" size={16} />{streak.next.days - streak.current} to {streak.next.days} days</span></>}
    </div>
    <details className="show-up-history"><summary><span className="show-up-calendar-icon"><Icon name="calendar_month" size={22} /></span><span><strong>Explore your days</strong><small>{date === today ? 'Today' : weekday(date)} · {shortDate(date)} · tap to change</small></span><Icon name="expand_more" size={21} /></summary><div className="show-up-calendar"><label>View a date<input type="date" min="1900-01-01" max={today} value={date} onChange={event => { if (isLogDate(event.target.value)) onChooseDay(event.target.value) }} /></label><div><button type="button" aria-pressed={date === today} onClick={() => onChooseDay(today)}>Today</button><button type="button" aria-pressed={date === addDays(today, -1)} onClick={() => onChooseDay(addDays(today, -1))}>Yesterday</button></div><p>Review your check-ins and daily totals. Past logs stay on their actual dates.</p></div></details>
  </section>
}
