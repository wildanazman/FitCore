import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { addDays, isLogDate, shortDate, startOfWeek, todayISO } from '../lib/date'
import { coachDay, COACH_DAYS, validCoachDays } from '../lib/strengthCoach'
import { HOME_EQUIPMENT, equipmentLabel } from '../lib/activities'
import type { UserProfile } from '../types'
import { ActivityComposer } from './ActivityComposer'
import { ExerciseDemo } from './ExerciseDemo'
import { Icon } from './Icon'
import './strength-coach.css'

export function CoachToday({ date }: { date: string }) {
  const { profile, state } = useApp()
  const nav = useNavigate()
  const plan = coachDay(profile, date, state.sessions)
  return <section className="coach-today" aria-label="Coach today"><div><h2>{plan ? plan.completed ? 'Session done. Recover well.' : plan.title : 'A workout that fits your life.'}</h2><p>{plan ? plan.rest ? `Next workout: ${shortDate(plan.nextDate)}. Easy movement is optional.` : `${plan.gym ? 'Gym' : 'Home'} · ${plan.exercises.length} exercises · sets, reps & rest ready` : 'Gym membership or home equipment? Build your personal strength plan.'}</p></div><button type="button" onClick={() => nav(`/train?plan=1&date=${date}`)}>{plan ? 'View plan' : 'Build my plan'}<Icon name="arrow_forward" size={18}/></button></section>
}

export function StrengthCoach({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const { profile, state, updateProfile } = useApp()
  const [editing, setEditing] = useState(!profile.strengthCoach)
  const [draft, setDraft] = useState<NonNullable<UserProfile['strengthCoach']>>(profile.strengthCoach ?? { gym: false, experience: 'new', days: [0,2,4], minutes: 45, focus: 'balanced', startDate: todayISO(), clearance: false })
  const [gear, setGear] = useState(profile.homeEquipment ?? [])
  const [error, setError] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [demo, setDemo] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const plan = coachDay(profile, date, state.sessions)
  const weekStart = startOfWeek(date)
  const exercise = plan?.exercises.find(e => e.item.id === active)
  const repRange = profile.strengthCoach?.focus === 'muscle' ? '8–12 reps' : '10–15 reps'
  function build() {
    if (profile.age < 18) { setError('This starter plan is for adults. Get age-appropriate guidance from a qualified coach.'); return }
    if (!draft.clearance) { setError('Confirm you can exercise safely. If you have pain, injury or a medical restriction, get professional guidance first.'); return }
    if (!validCoachDays(draft.days)) { setError('Choose 2–4 days. For 2–3 full-body days, leave a rest day between sessions—including Sunday to Monday.'); return }
    updateProfile({ strengthCoach: { ...draft, days: [...draft.days].sort((a,b)=>a-b), startDate: profile.strengthCoach?.startDate ?? todayISO() }, homeEquipment: gear })
    setEditing(false); setActive(null); setSaved(true); setError('')
  }
  if (editing || !plan) return <section className="strength-coach"><header className="coach-heading"><div><h2>Train around your life.</h2><p>A practical starter plan. No gym required.</p></div></header><form className="coach-setup" onSubmit={e=>{e.preventDefault();build()}}>
    <fieldset><legend>Do you have gym access?</legend><div className="coach-options">{[{value:false,label:'Home workout',hint:'Only equipment you own'},{value:true,label:'Gym membership',hint:'Standard gym machines & weights'}].map(option=><button key={option.label} type="button" aria-pressed={draft.gym===option.value} onClick={()=>setDraft({...draft,gym:option.value})}><strong>{option.label}</strong><span>{option.hint}</span></button>)}</div></fieldset>
    {!draft.gym && <fieldset><legend>Equipment at home</legend><div className="coach-chips">{HOME_EQUIPMENT.map(item=><button key={item.id} type="button" aria-pressed={gear.includes(item.id)} onClick={()=>setGear(gear.includes(item.id)?gear.filter(id=>id!==item.id):[...gear,item.id])}>{item.label}</button>)}</div><p>No equipment? We’ll use bodyweight. A weight or resistance band is useful for back training.</p></fieldset>}
    <div className="coach-field-grid"><label>Training experience<select value={draft.experience} onChange={e=>setDraft({...draft,experience:e.target.value as 'new'|'regular'})}><option value="new">New / returning</option><option value="regular">Consistent strength training</option></select></label><label>Time per session<select value={draft.minutes} onChange={e=>setDraft({...draft,minutes:Number(e.target.value) as 30|45|60})}>{[30,45,60].map(time=><option key={time} value={time}>{time} min available</option>)}</select></label><label>Strength priority<select value={draft.focus} onChange={e=>setDraft({...draft,focus:e.target.value as 'balanced'|'muscle'})}><option value="balanced">Build a balanced routine</option><option value="muscle">Build / preserve muscle</option></select></label></div>
    <fieldset><legend>Which days can you train?</legend><div className="coach-days">{COACH_DAYS.map((day,index)=><button type="button" key={day} aria-pressed={draft.days.includes(index)} onClick={()=>setDraft({...draft,days:draft.days.includes(index)?draft.days.filter(d=>d!==index):[...draft.days,index]})}>{day}</button>)}</div><p>2–3 days: full body. 4 days: alternating upper / lower. Recovery stays in the schedule.</p></fieldset>
    <label className="coach-clearance"><input type="checkbox" checked={draft.clearance} onChange={e=>setDraft({...draft,clearance:e.target.checked})}/><span>I can exercise without current pain, injury or a medical restriction that needs professional advice.</span></label>
    {error && <p role="alert">{error}</p>}<div className="coach-actions"><button className="coach-primary" type="submit">{profile.strengthCoach?'Update my plan':'Build my plan'}<Icon name="arrow_forward" size={18}/></button>{profile.strengthCoach&&<button type="button" onClick={()=>{setEditing(false);setError('')}}>Cancel</button>}</div>
  </form></section>
  return <section className="strength-coach"><header className="coach-heading"><div><h2>Your strength plan.</h2><p>{plan.gym?'Gym':'Home'} · {profile.strengthCoach!.days.length} days / week · {profile.strengthCoach!.focus==='muscle'?'Muscle focus':'Balanced routine'}</p></div><button type="button" onClick={()=>{setDraft(profile.strengthCoach!);setGear(profile.homeEquipment??[]);setEditing(true)}}>Edit setup</button></header>
    <div className="coach-week-nav"><button type="button" aria-label="Previous strength week" onClick={()=>{onDateChange(addDays(date,-7));setActive(null)}}><Icon name="chevron_left"/></button><span>{shortDate(weekStart)} – {shortDate(addDays(weekStart,6))}</span><button type="button" aria-label="Next strength week" onClick={()=>{onDateChange(addDays(date,7));setActive(null)}}><Icon name="chevron_right"/></button></div>
    <div className="coach-week" aria-label="Strength schedule Monday to Sunday">{COACH_DAYS.map((day,index)=>{const dayDate=addDays(weekStart,index),dayPlan=coachDay(profile,dayDate,state.sessions);return <button type="button" key={day} aria-pressed={date===dayDate} aria-label={`${day}, ${dayDate}: ${dayPlan?.rest?'Recovery':dayPlan?.title}`} onClick={()=>{onDateChange(dayDate);setActive(null);setSaved(false)}}><span>{day}</span><strong>{dayPlan?.rest?'Rest':profile.strengthCoach!.days.length===4?(profile.strengthCoach!.days.indexOf(index)%2===0?'Upper':'Lower'):'Full'}</strong>{dayPlan?.completed&&<Icon name="check" size={16}/>}</button>})}</div>
    <div className="coach-session-heading"><div><h3>{plan.title}</h3><p>{shortDate(date)} · {plan.rest?'Keep it easy':`${plan.exercises.filter(e=>e.logged).length} / ${plan.exercises.length} exercises logged`}</p></div>{plan.completed&&<Icon name="check_circle" size={26}/>}</div>
    {saved&&<p role="status" className="coach-status">Saved on this device. Your earlier logs are kept.</p>}
    {plan.rest?<div className="coach-recovery"><p>No strength session today. An easy walk or gentle mobility is optional—not a workout you must complete.</p><button type="button" onClick={()=>onDateChange(plan.nextDate)}>See next workout · {shortDate(plan.nextDate)}<Icon name="arrow_forward" size={18}/></button></div>:<>
      <p className="coach-instruction">Warm up for 5–8 minutes, then do a lighter practice set. Keep 2–3 reps in reserve; don’t chase failure.</p>
      {(plan.hardRun||plan.recoveryWarning)&&<p className="coach-caution">{plan.hardRun?'A hard or long run is also scheduled today. Move strength to a recovered day or reduce the session.':'You logged strength yesterday. If the same muscles are sore or tired, take recovery today—don’t make up missed workouts back-to-back.'}</p>}
      {plan.limitedPull&&<p className="coach-caution">Without weights or a pulling setup, back work here is control / endurance—not equivalent to rows or pulldowns. Add dumbbells for a more complete muscle-building plan.</p>}
      <ol className="coach-exercises">{plan.exercises.map(e=><li key={e.key}><div className="coach-exercise-top"><div><h4>{e.item.label}</h4><p>{e.item.muscles?.join(' · ')} · {equipmentLabel(e.item)}</p></div>{e.logged&&<span className="coach-done">Logged<Icon name="check" size={16}/></span>}</div><div className="coach-prescription"><strong>{e.sets} sets × {e.held?'20–30 sec':repRange}</strong><span>Rest {e.rest} sec</span></div>{e.recent?.strengthLog&&<p className="coach-last">Last time: {e.recent.strengthLog.sets.map(s=>e.held?`${s.holdSeconds}s`:`${s.reps} reps${s.weightKg>0?` at ${s.weightKg} kg each`:''}`).join(' / ')}. {e.recent.strengthLog.sets.every(s=>s.reps >= (profile.strengthCoach!.focus === 'muscle' ? 12 : 15))&&e.recent.strengthLog.calorieEstimate?.effort==='moderate'?'If every set felt controlled, try the smallest load increase and return to the lower end of your rep range.':'Repeat a comfortable load; add reps before adding weight.'}</p>}<div className="coach-row-actions"><button type="button" onClick={()=>setDemo(demo===e.item.id?null:e.item.id)}>{demo===e.item.id?'Hide technique':'Technique'}</button><button type="button" disabled={Boolean(e.logged)||!isLogDate(date)} onClick={()=>setActive(active===e.item.id?null:e.item.id)}>{e.logged?'In your activity log':active===e.item.id?'Close log':'Log actual sets'}<Icon name="arrow_forward" size={16}/></button></div>{demo===e.item.id&&<><p>{e.item.detail}</p><ExerciseDemo exerciseId={e.item.demoId??e.item.id}/></>}{exercise?.item.id===e.item.id&&<ActivityComposer key={e.key} variant="library" date={date} prescription={{exerciseId:e.item.id,sets:e.sets,reps:e.reps,rest:e.rest,coachKey:e.key}} onSaved={()=>{setActive(null);setSaved(true)}}/>}</li>)}</ol>
      {!isLogDate(date)&&<p>Preview only. Log completed sets on the day you actually train.</p>}
    </>}
    <details className="coach-method"><summary>How your plan works</summary><ul><li>Healthy-adult starter guidance, not a replacement for a qualified coach or rehabilitation plan.</li><li>2–3 days distribute full-body training; 4 days alternate upper and lower sessions.</li><li>Shorter sessions reduce volume. Beginners start with two working sets; experienced users get up to three.</li><li>Choose a load you can control. No automatic weight increases or invented starting kg.</li><li>Missing a workout is not a debt. Resume the schedule rather than doubling sessions.</li><li>Fat loss and muscle training can coexist; this does not replace your nutrition targets.</li></ul><a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noreferrer">ACSM resistance training guidance</a></details>
  </section>
}
