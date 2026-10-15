import { useState } from 'react'
import { useApp } from '../store/AppContext'
import type { coachDay } from '../lib/strengthCoach'
import { coachProfileForDate, swapCandidates } from '../lib/workoutAdaptation'
import { postponeWorkout } from '../lib/postponeWorkout'
import { addDays, shortDate, todayISO } from '../lib/date'
import { equipmentLabel } from '../lib/activities'
import { Icon } from './Icon'
import './coach-tools.css'

type Workout = NonNullable<ReturnType<typeof coachDay>>
export function DayFit({date,plan,onMoved,allowPostpone=true}:{date:string;plan:Workout;onMoved?:(date:string)=>void;allowPostpone?:boolean}) {
  const {profile,state,updateProfile}=useApp()
  const [target,setTarget]=useState(addDays(date,1))
  const [message,setMessage]=useState('')
  const settings=profile.strengthDaySettings?.[date]??{}
  const budget=settings.minutes??profile.strengthCoach!.minutes
  function change(patch:Partial<typeof settings>){updateProfile({strengthDaySettings:{...profile.strengthDaySettings,[date]:{...settings,...patch}}})}
  function venue(value:'home'|'gym',equipment=settings.equipment??profile.homeEquipment??[]){
    const workouts={...profile.strengthWorkouts};delete workouts[date]
    updateProfile({strengthWorkouts:workouts,strengthDaySettings:{...profile.strengthDaySettings,[date]:{...settings,venue:value,equipment,swaps:undefined,prescriptions:undefined}}})
    setMessage('Remaining exercises rebuilt for this location. Saved logs stay; choose working weights again. Your regular routine is unchanged.')
  }
  const review=allowPostpone?postponeWorkout(profile,date,target,state.sessions):null
  return <details className="coach-day-fit"><summary><Icon name="tune" size={20}/><span>Make today fit<small>{settings.lighter?'Reduced volume':`${budget} min available`} · this day only</small></span><Icon name="expand_more" size={20}/></summary>
    <div className="coach-day-fit-body"><fieldset><legend>Where are you training this day?</legend><div className="coach-choice-row">{(['gym','home'] as const).map(value=><button type="button" key={value} aria-pressed={plan.gym===(value==='gym')} onClick={()=>venue(value)}>{value==='gym'?'Gym':'At home'}</button>)}</div></fieldset>
    {!plan.gym&&<fieldset><legend>Equipment available this day</legend><div className="coach-choice-row">{(['mat','dumbbell','bench','kettlebell'] as const).map(gear=><label key={gear}><input type="checkbox" checked={(settings.equipment??profile.homeEquipment??[]).includes(gear)} onChange={e=>{const kit=settings.equipment??profile.homeEquipment??[];venue('home',e.target.checked?[...kit,gear]:kit.filter(g=>g!==gear))}}/>{gear==='dumbbell'?'Dumbbells':gear[0].toUpperCase()+gear.slice(1)}</label>)}</div><small>No equipment selected? Bodyweight options only. Some muscle groups may have fewer suitable exercises. Changing location rebuilds this day’s custom exercise list; saved logs stay.</small></fieldset>}
    <fieldset><legend>Time for strength today</legend><div className="coach-choice-row">{([30,45,60] as const).filter(n=>n<=profile.strengthCoach!.minutes).map(n=><button type="button" key={n} aria-pressed={budget===n} onClick={()=>change({minutes:n})}>{n} min</button>)}</div></fieldset>
    <label className="coach-volume-switch"><input type="checkbox" checked={Boolean(settings.lighter)} onChange={e=>change({lighter:e.target.checked})}/><span>Fewer working sets today<small>Cap unlogged exercises at two sets. Choose a comfortable load.</small></span></label>
    <p>Priority movements stay first; optional work is reduced before rest time. Saved exercises stay untouched. Estimated session: <strong>{plan.estimatedMinutes} min</strong>{plan.estimatedMinutes>budget?' — allow more time or finish the remaining work another day; don’t rush.':'.'}</p>
    {plan.adapted&&<p>Today’s session adjusted. Optional supersets and drop sets are off; your weekly routine is unchanged.</p>}
    {allowPostpone&&!settings.postponedTo&&<fieldset className="coach-postpone"><legend>Too busy? Move the remaining workout.</legend><label>Train instead on<input type="date" min={date>todayISO()?addDays(date,1):addDays(todayISO(),1)} max={addDays(date,21)} value={target} onChange={e=>{setTarget(e.target.value);setMessage('')}}/></label><p>{review?.error??`${plan.exercises.filter(e=>!e.logged).length} remaining exercises → ${shortDate(target)}. Sets and reps stay the same. Check nearby workouts and allow recovery; moving a session does not rebalance your week.`}</p><button type="button" className="coach-primary" disabled={Boolean(review?.error)} onClick={()=>{const result=postponeWorkout(profile,date,target,state.sessions);if(!result.profile){setMessage(result.error);return}updateProfile({strengthWorkouts:result.profile.strengthWorkouts,strengthDaySettings:result.profile.strengthDaySettings});setMessage(`Workout moved to ${shortDate(target)}.`);onMoved?.(target)}}>Move workout<Icon name="arrow_forward" size={18}/></button></fieldset>}
    {message&&<p role="status">{message}</p>}</div>
  </details>
}

export function ExerciseSwap({date,plan,id,onSwapped,onCancel}:{date:string;plan:Workout;id:string;onSwapped:(id:string)=>void;onCancel:()=>void}) {
  const {profile,updateProfile}=useApp()
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState('')
  const current=plan.exercises.find(e=>e.item.id===id)
  const candidates=swapCandidates(id,coachProfileForDate(profile,date),plan.exercises.map(e=>e.item.id))
  const filtered=candidates.filter(a=>`${a.label} ${equipmentLabel(a)}`.toLowerCase().includes(query.toLowerCase()))
  function apply(){
    if(!current||current.logged||!candidates.some(a=>a.id===selected))return
    const settings=profile.strengthDaySettings?.[date]??{}
    const swaps={...settings.swaps}
    const root=Object.keys(swaps).find(key=>swaps[key]===id)??id
    swaps[root]=selected
    updateProfile({strengthDaySettings:{...profile.strengthDaySettings,[date]:{...settings,swaps}}})
    onSwapped(selected)
  }
  return <section className="coach-swap" aria-label="Choose a similar exercise"><header><div><small>Equipment busy?</small><h3>Keep the movement. Change the exercise.</h3></div><button type="button" aria-label="Close exercise swap" onClick={onCancel}><Icon name="close" size={22}/></button></header>
    <p>Replacing <strong>{current?.item.label}</strong>. These share a movement family, not identical difficulty. Pick a familiar movement you can perform comfortably.</p>
    <label className="coach-swap-search">Find an alternative<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Exercise or equipment"/></label>
    <div className="coach-swap-options">{filtered.map(item=><button type="button" key={item.id} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><span><strong>{item.label}</strong><small>{equipmentLabel(item)} · {current?.sets} sets</small></span><Icon name={selected===item.id?'check_circle':'add_circle'} size={22}/></button>)}</div>
    {!filtered.length&&<p>{candidates.length?'No alternative matches this search.':'No supported equivalent with your equipment. Keep this exercise, skip it, or review your routine—don’t substitute a different movement just to fill a slot.'}</p>}
    {selected&&<div className="coach-swap-confirm"><p>Unsaved sets for the current exercise will be discarded. Saved logs stay. <strong>Working kg is not transferred</strong>; start light or use this exercise’s own history.</p><button type="button" className="coach-primary" onClick={apply}>Use selected exercise<Icon name="check" size={18}/></button></div>}
  </section>
}

export function SessionFeedback({date,plan}:{date:string;plan:Workout}) {
  const {profile,updateProfile}=useApp()
  const existing=profile.strengthFeedback?.find(f=>f.date===date)
  const [effort,setEffort]=useState<'easy'|'right'|'hard'>(existing?.effort??'right')
  const [pain,setPain]=useState(existing?.pain??false)
  const [saved,setSaved]=useState(false)
  const ids=plan.exercises.filter(e=>e.logged?.strengthLog?.sets.length).map(e=>e.item.id)
  if(!ids.length)return null
  return <section className="coach-feedback" aria-label="Workout feedback"><span className="coach-feedback-eyebrow">One check-in. A better next session.</span><h3>How did that feel?</h3>
    <fieldset><legend>Overall effort</legend><div className="coach-choice-row">{(['easy','right','hard'] as const).map(value=><button type="button" key={value} aria-pressed={effort===value} onClick={()=>{setEffort(value);setSaved(false)}}>{value==='easy'?'Had more in me':value==='right'?'About right':'Too hard'}</button>)}</div></fieldset>
    <label className="coach-volume-switch"><input type="checkbox" checked={pain} onChange={e=>{setPain(e.target.checked);setSaved(false)}}/><span>I had pain during this session<small>Not ordinary muscular effort or fatigue.</small></span></label>
    <button type="button" className="coach-primary" onClick={()=>{updateProfile({strengthFeedback:[...(profile.strengthFeedback??[]).filter(f=>f.date!==date),{date,effort,pain,exerciseIds:ids}].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,1000)});setSaved(true)}}>{saved?'Feedback saved':'Save my check-in'}<Icon name={saved?'check_circle':'arrow_forward'} size={18}/></button>
    <div className="coach-feedback-next" aria-live="polite"><strong>{pain?'Stop and review before progressing':effort==='hard'?'Next time: hold, don’t chase more':effort==='easy'?'Next time: check the evidence first':'Next time: build on this'}</strong><p>{pain?'Stop movements that cause pain. This app cannot assess an injury; get appropriate professional advice if pain persists, recurs or concerns you. Progression advice for these exercises will be paused.':effort==='hard'?'Repeat a manageable load or reduce it. Choose fewer working sets if needed. We won’t suggest adding kg from these results.':effort==='easy'?'Feeling good alone does not justify more kg. Progression still checks two comparable logged sessions and every prescribed set.':'Keep controlled reps and roughly two reps in reserve. Use your recorded sets and rep range to decide whether to repeat or progress.'}{!saved?' Save this check-in to use it in future suggestions.':''}</p></div>
  </section>
}
