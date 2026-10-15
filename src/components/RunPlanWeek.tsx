import { useEffect, useRef, useState } from 'react'
import type { PlanSession, UserProfile } from '../types'
import { addDays, isLogDate, shortDate, todayISO, weekday } from '../lib/date'
import { coachRunLabel } from '../lib/runPresentation'
import { planPhase, planWeeks, runningBlock } from '../lib/plan'
import { Icon } from './Icon'
import './run-plan-experience.css'

export function RunPlanWeek({profile,sessions,start,week,total,onWeek,onComplete}:{profile:UserProfile;sessions:PlanSession[];start:string;week:number;total:number;onWeek:(week:number)=>void;onComplete:(session:PlanSession)=>void}) {
  const today=todayISO(),days=Array.from({length:7},(_,i)=>addDays(start,i))
  const [selected,setSelected]=useState(()=>days.includes(today)?today:sessions.find(s=>!s.completed)?.date??days[0])
  const detail=useRef<HTMLElement>(null),reveal=useRef(false)
  useEffect(()=>{if(reveal.current){detail.current?.focus({preventScroll:true});detail.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});reveal.current=false}},[selected])
  const current=sessions.find(s=>s.date===selected),done=sessions.filter(s=>s.completed).length
  const block=runningBlock(profile),phase=block.foundation?'Base building':block.weeks[week]?.taper?'Taper & recover':block.weeks[week]?.cutback?'Recovery week':planPhase(week+1,total)
  return <section className="run-week-experience" aria-label="Weekly running plan">
    <div className="run-week-picker"><button type="button" aria-label="Previous training week" disabled={!week} onClick={()=>onWeek(week-1)}><Icon name="chevron_left"/></button><label><span>Week {week+1} of {total}</span><select aria-label="Choose training week" value={week} onChange={e=>onWeek(Number(e.target.value))}>{Array.from({length:total},(_,i)=><option key={i} value={i}>Week {i+1} · {shortDate(addDays(profile.planStartDate!,i*7))}</option>)}</select><small>{phase}</small></label><button type="button" aria-label="Next training week" disabled={week>=total-1} onClick={()=>onWeek(week+1)}><Icon name="chevron_right"/></button></div>
    <div className="run-day-rail" role="group" aria-label="Choose a day">{days.map(day=>{const run=sessions.find(s=>s.date===day);return <button type="button" key={day} aria-pressed={selected===day} aria-label={`${weekday(day)} ${shortDate(day)}${run?`: ${run.completed?'Completed ':''}${coachRunLabel(run)}`:': Recovery day'}`} onClick={()=>setSelected(day)}><span>{weekday(day)}</span><strong>{Number(day.slice(-2))}</strong><span className="run-day-marker">{run?.completed?<Icon name="check" size={14}/>:run?<span className="run-day-dot"/>:<span aria-hidden="true">—</span>}</span>{day===today&&<span className="sr-only">Today</span>}</button>})}</div>
    <section ref={detail} tabIndex={-1} className={`run-selected-session ${current?.completed?'is-complete':''}`} aria-label="Selected run details" aria-live="polite">
      <p className="run-session-date">{selected===today?'Today':weekday(selected)} · {shortDate(selected)}</p>
      <h2>{current?coachRunLabel(current):'Take your recovery.'}</h2>
      {current?<><div className="run-session-facts"><span><Icon name="timer" size={18}/>{current.durationMin} min</span><span><Icon name="route" size={18}/>{current.distanceKm} km</span><span>{current.completed?'Completed':'Planned session'}</span></div>
      <div className="run-selected-pace"><span>Suggested pace</span><strong>{current.runBrief?.pace??'Conversational effort'}</strong></div>
      {current.runBrief?<><p className="run-session-purpose">{current.runBrief.note}</p><dl className="run-workout-sequence">{current.runBrief.steps.map((step,i)=><div key={step.label}><span aria-hidden="true">{i+1}</span><div><dt>{step.label}</dt><dd>{step.value}</dd></div></div>)}</dl></>:<p>{current.detail}</p>}
      <button type="button" className="run-complete-action" disabled={!isLogDate(current.date)} aria-pressed={current.completed} onClick={()=>onComplete(current)}><Icon name={current.completed?'check_circle':'radio_button_unchecked'} size={22}/>{current.completed?'Completed · tap to undo':isLogDate(current.date)?'Mark run completed':'Available on training day'}</button><small className="run-completion-note">{current.completed?'Completion saved.':'Only mark this after your run.'} This records the planned session, not GPS-measured distance or calories.</small></>:<><p className="run-session-purpose">No run scheduled. Rest, or choose gentle movement if you feel comfortable. Don’t stack missed workouts here.</p><button type="button" className="run-next-choice" onClick={()=>{const next=days.find(d=>d>selected&&sessions.some(s=>s.date===d));if(next)setSelected(next);else if(week<total-1)onWeek(week+1)}} disabled={!days.some(d=>d>selected&&sessions.some(s=>s.date===d))&&week>=total-1}>Find the next run<Icon name="arrow_forward" size={18}/></button></>}
    </section>
    <section className="run-week-lineup" aria-label="Runs this week"><header><h3>Your week.</h3><span>{done} / {sessions.length} completed</span></header><div className="run-week-completion" aria-hidden="true">{sessions.map(s=><span key={s.id} className={s.completed?'is-done':''}/>)}</div>
      {sessions.map((s,i)=><button type="button" key={s.id} className="run-lineup-row" aria-pressed={selected===s.date} onClick={()=>{if(selected===s.date){detail.current?.focus({preventScroll:true});detail.current?.scrollIntoView({block:'start',behavior:'auto'})}else{reveal.current=true;setSelected(s.date)}}}><span className="run-lineup-number">{s.completed?<Icon name="check" size={18}/>:String(i+1).padStart(2,'0')}</span><span className="run-lineup-copy"><strong>{coachRunLabel(s)}</strong><small>{weekday(s.date)} · {s.durationMin} min · {s.distanceKm} km</small></span><Icon name="chevron_right" size={20}/></button>)}
      <p>{sessions.reduce((sum,s)=>sum+(s.distanceKm??0),0).toFixed(1)} km planned this week. Recovery days are part of your training.</p>
    </section>
  </section>
}

export function RunPlanOverview({profile,sessions,selectedWeek,onSelect}:{profile:UserProfile;sessions:PlanSession[];selectedWeek:number;onSelect:(week:number)=>void}) {
  const block=runningBlock(profile)
  return <section className="run-block-overview" aria-label="Full running block"><h3>Every week has a purpose.</h3><p>Choose a week to see your sessions. Distances and paces are training estimates, not guaranteed results.</p><ol>{Array.from({length:planWeeks(profile)},(_,week)=>{
    const begin=addDays(profile.planStartDate!,week*7),end=addDays(begin,7),runs=sessions.filter(s=>s.date>=begin&&s.date<end&&s.zone!=='Event'),long=runs.find(s=>s.runKind==='long'),quality=runs.find(s=>['Tempo','Intervals'].includes(s.zone??''))
    const phase=block.foundation?'Base building':block.weeks[week].taper?'Taper & recover':block.weeks[week].cutback?'Recovery week':planPhase(week+1,planWeeks(profile))
    return <li key={week}><button type="button" aria-pressed={week===selectedWeek} onClick={()=>onSelect(week)}><span className="run-block-week">{week+1}</span><span className="run-block-copy"><strong>{phase}</strong><small>{shortDate(begin)} · {runs.reduce((n,s)=>n+(s.distanceKm??0),0).toFixed(1)} km training</small><span>{quality?coachRunLabel(quality):'Easy running & recovery'}{long?` · ${long.distanceKm} km long run`:''}</span></span><Icon name="chevron_right" size={20}/></button></li>
  })}</ol></section>
}
