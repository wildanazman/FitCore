import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { addDays, isLogDate, shortDate, startOfWeek, todayISO } from '../lib/date'
import { coachDay, coachSplit, COACH_DAYS, validCoachDays } from '../lib/strengthCoach'
import { HOME_EQUIPMENT, equipmentLabel, ACTIVITIES, canUseEquipment, activityTracking } from '../lib/activities'
import type { UserProfile, PlanSession } from '../types'
import { ActivityComposer } from './ActivityComposer'
import { ExerciseDemo } from './ExerciseDemo'
import { StrengthProgress } from './StrengthProgress'
import { WorkoutRunner } from './WorkoutRunner'
import { exerciseDemoId } from '../lib/exerciseVideos'
import { Icon } from './Icon'
import './strength-coach.css'

export function CoachToday({ date }: { date: string }) {
  const { profile, state } = useApp()
  const nav = useNavigate()
  const plan = coachDay(profile, date, state.sessions)
  const next = plan?.exercises.find(exercise => !exercise.logged)
  const resting = plan?.rest && !plan.cardio
  return <section className={`coach-today ${plan?.completed ? 'is-complete' : ''}`} aria-label="Coach today">
    <div className="coach-today-main">
      <span className="coach-today-emblem"><Icon name={plan?.completed ? 'check_circle' : resting ? 'self_improvement' : 'exercise'} size={25}/></span>
      <div className="coach-today-copy">
        <p className="coach-today-context">{date===todayISO()?"Today’s training":`Training · ${shortDate(date)}`}</p>
        <h2>{plan ? plan.completed ? 'Session complete' : plan.rest&&plan.cardio?'Treadmill day':plan.title : 'Your strength plan'}</h2>
        <p className="coach-today-meta">{plan ? resting ? `Next workout ${shortDate(plan.nextDate)}` : `${plan.gym?'Gym':'Home'} · ${plan.exercises.length} exercises${plan.estimatedMinutes?` · ~${plan.estimatedMinutes} min`:''}${plan.cardio?` + ${plan.cardio.minutes} min cardio`:''}` : 'A routine that fits your week.'}</p>
      </div>
    </div>
    <div className="coach-today-footer">
      <div className="coach-today-next">{plan?.completed ? <><span>Nice work today</span><strong>Give yourself time to recover.</strong></> : next ? <><span>Up next</span><strong>{next.item.label}</strong><small>{next.sets} sets · {next.reps} {next.held?'sec':'reps'}</small></> : <><span>{resting?'Recovery':'Your routine'}</span><strong>{resting?'Easy movement, if you feel like it.':plan?.cardio?`${plan.cardio.minutes} min ${plan.cardio.item.label.toLowerCase()}`:'Choose your equipment and training days.'}</strong></>}</div>
      <button type="button" onClick={() => nav(`/train?plan=1&date=${date}`)}>{plan ? 'View plan' : 'Build plan'}<Icon name="arrow_forward" size={18}/></button>
    </div>
  </section>
}

export function StrengthCoach({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const { profile, state, updateProfile } = useApp()
  const [editing, setEditing] = useState(!profile.strengthCoach)
  const [draft, setDraft] = useState<NonNullable<UserProfile['strengthCoach']>>(profile.strengthCoach ?? { gym: false, experience: 'new', days: [0,2,4], minutes: 45, focus: 'balanced', split: 'muscle-days', startDate: todayISO(), clearance: false })
  const [gear, setGear] = useState(profile.homeEquipment ?? [])
  const [error, setError] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [demo, setDemo] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [finished, setFinished] = useState<PlanSession | null>(null)
  const finishRef = useRef<HTMLElement>(null)
  useEffect(()=>{if(finished){finishRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});finishRef.current?.focus({preventScroll:true})}},[finished])
  const [customizing, setCustomizing] = useState(false)
  const [customActivity, setCustomActivity] = useState(false)
  const [cardioLog,setCardioLog] = useState(false)
  const [running,setRunning] = useState(false)
  const plan = coachDay(profile, date, state.sessions)
  const weekStart = startOfWeek(date)
  const exercise = plan?.exercises.find(e => e.item.id === active)
  const repRange = profile.strengthCoach?.focus === 'muscle' ? '8–12' : '10–15'
  const completed = plan?.exercises.filter(e => e.logged).length ?? 0
  const nextExercise = plan?.exercises.find(e => !e.logged)
  function startWorkout() {
    if (!isLogDate(date)) return
    if (!nextExercise) {if(plan?.cardio&&!plan.cardio.logged)setCardioLog(true);return}
    setActive(null);setFinished(null);setRunning(true)
  }
  function build() {
    if (profile.age < 18) { setError('This starter plan is for adults. Get age-appropriate guidance from a qualified coach.'); return }
    if (!draft.clearance) { setError('Confirm you can exercise safely. If you have pain, injury or a medical restriction, get professional guidance first.'); return }
    if (!validCoachDays(draft.days,draft.split)) { setError('Choose 2–5 days. Full-body routines need a rest day between sessions—including Sunday to Monday.'); return }
    if(draft.gym&&draft.treadmill&&!draft.treadmill.days.length){setError('Choose at least one treadmill day, or turn treadmill off.');return}
    updateProfile({ strengthCoach: { ...draft, days: [...draft.days].sort((a,b)=>a-b), startDate: profile.strengthCoach?.startDate ?? todayISO() }, homeEquipment: gear })
    setEditing(false); setActive(null); setSaved(true); setError('')
  }
  if (editing || !plan) return <section className="strength-coach coach-building"><header className="coach-heading"><div><h2>Build your routine.</h2><p>Your space, your equipment, your schedule.</p></div></header><form className="coach-setup" onSubmit={e=>{e.preventDefault();build()}}>
    <fieldset><legend>Do you have gym access?</legend><div className="coach-options">{[{value:false,label:'Home workout',hint:'Only equipment you own'},{value:true,label:'Gym membership',hint:'Standard gym machines & weights'}].map(option=><button key={option.label} type="button" aria-pressed={draft.gym===option.value} onClick={()=>setDraft({...draft,gym:option.value})}><strong>{option.label}</strong><span>{option.hint}</span></button>)}</div></fieldset>
    {!draft.gym && <fieldset><legend>Equipment at home</legend><div className="coach-chips">{HOME_EQUIPMENT.map(item=><button key={item.id} type="button" aria-pressed={gear.includes(item.id)} onClick={()=>setGear(gear.includes(item.id)?gear.filter(id=>id!==item.id):[...gear,item.id])}>{item.label}</button>)}</div><p>No equipment? We’ll use bodyweight. A weight or resistance band is useful for back training.</p></fieldset>}
    <div className="coach-field-grid"><label>Training experience<select value={draft.experience} onChange={e=>setDraft({...draft,experience:e.target.value as 'new'|'regular'})}><option value="new">New / returning</option><option value="regular">Consistent strength training</option></select></label><label>Time per session<select value={draft.minutes} onChange={e=>setDraft({...draft,minutes:Number(e.target.value) as 30|45|60})}>{[30,45,60].map(time=><option key={time} value={time}>{time} min available</option>)}</select></label><label>Strength priority<select value={draft.focus} onChange={e=>setDraft({...draft,focus:e.target.value as 'balanced'|'muscle'})}><option value="balanced">Build a balanced routine</option><option value="muscle">Build / preserve muscle</option></select></label></div>
    <fieldset><legend>How do you want to split training?</legend><div className="coach-options">{([{id:'muscle-days',name:'Muscle days',hint:'Chest, back, legs + supporting sessions'},{id:'balanced',name:'Full body / upper-lower',hint:'Spread major muscle groups across the week'}] as const).map(option=><button type="button" key={option.id} aria-pressed={(draft.split??'muscle-days')===option.id} onClick={()=>setDraft({...draft,split:option.id})}><strong>{option.name}</strong><span>{option.hint}</span></button>)}</div><p>Muscle days are a preference, not automatically better. With only 2 days, both routines use full body.</p></fieldset>
    <fieldset><legend>Which days can you train?</legend><div className="coach-days">{COACH_DAYS.map((day,index)=><button type="button" key={day} aria-pressed={draft.days.includes(index)} onClick={()=>setDraft({...draft,days:draft.days.includes(index)?draft.days.filter(d=>d!==index):draft.days.length<5?[...draft.days,index]:draft.days})}>{day}</button>)}</div><p>Choose 2–5 days. We arrange repeat muscle sessions around your selected days, including the weekend.</p>{draft.days.length>=2&&<ul className="coach-split-preview">{coachSplit({...profile,strengthCoach:draft}).days.map(day=><li key={day.day}><span>{COACH_DAYS[day.day]}</span><strong>{day.label}</strong></li>)}</ul>}</fieldset>
    <label className="coach-technique-select">Set style<select value={draft.techniques??'auto'} onChange={e=>setDraft({...draft,techniques:e.target.value as 'auto'|'straight'})}><option value="auto">Coach-selected options</option><option value="straight">Straight sets only</option></select></label><p>Beginners use straight sets. For experienced users, optional supersets can save time; suitable machine isolation exercises may get one drop-set option. Neither is compulsory.</p>
    {draft.gym&&<fieldset><legend>Treadmill in your gym routine</legend><label className="coach-clearance"><input type="checkbox" checked={Boolean(draft.treadmill)} onChange={event=>setDraft({...draft,treadmill:event.target.checked?{mode:'walk',minutes:10,days:[...draft.days]}:undefined})}/><span>Add optional walking or easy running</span></label>{draft.treadmill&&<><div className="coach-field-grid"><label>Activity<select value={draft.treadmill.mode} onChange={e=>setDraft({...draft,treadmill:{...draft.treadmill!,mode:e.target.value as 'walk'|'run'}})}><option value="walk">Comfortable walk</option><option value="run">Easy conversational run</option></select></label><label>Minutes per treadmill session<select value={draft.treadmill.minutes} onChange={e=>setDraft({...draft,treadmill:{...draft.treadmill!,minutes:Number(e.target.value) as 10|15|20|30}})}>{[10,15,20,30].map(n=><option key={n} value={n}>{n} min</option>)}</select></label></div><div className="coach-days">{COACH_DAYS.map((day,index)=><button type="button" key={day} aria-label={`Treadmill ${day}`} aria-pressed={draft.treadmill!.days.includes(index)} onClick={()=>setDraft({...draft,treadmill:{...draft.treadmill!,days:draft.treadmill!.days.includes(index)?draft.treadmill!.days.filter(d=>d!==index):[...draft.treadmill!.days,index]}})}>{day}</button>)}</div><p>Treadmill time is extra, not included in the strength time budget. Keep it easy; after a tiring leg day, walking or a separate day may suit you better. This is not a race-training plan.</p></>}</fieldset>}
    <label className="coach-clearance"><input type="checkbox" checked={draft.clearance} onChange={e=>setDraft({...draft,clearance:e.target.checked})}/><span>I can exercise without current pain, injury or a medical restriction that needs professional advice.</span></label>
    {error && <p role="alert">{error}</p>}<div className="coach-actions"><button className="coach-primary" type="submit">{profile.strengthCoach?'Update my plan':'Build my plan'}<Icon name="arrow_forward" size={18}/></button>{profile.strengthCoach&&<button type="button" onClick={()=>{setEditing(false);setError('')}}>Cancel</button>}</div>
  </form></section>
  if(running) return <WorkoutRunner plan={plan} date={date} onExit={()=>setRunning(false)}/>
  const sessionTitle = plan.rest ? plan.cardio?'Treadmill day.':'Recovery day.' : `${plan.shortTitle === 'Full' ? 'Full-body' : plan.shortTitle === 'Shoulder' ? 'Shoulders & abs' : plan.shortTitle} day.`
  return <section className="strength-coach coach-workspace">
    <aside className="coach-week-panel" aria-label="Your training week">
      <header className="coach-heading"><div><h2>Your week.</h2><p>{plan.gym ? 'Gym' : 'Home'} · {profile.strengthCoach!.days.length} training days</p></div><button type="button" aria-label="Edit training setup" onClick={()=>{setDraft(profile.strengthCoach!);setGear(profile.homeEquipment??[]);setEditing(true)}}><Icon name="tune" size={18}/>Edit</button></header>
      <div className="coach-week-nav"><button type="button" aria-label="Previous strength week" onClick={()=>{onDateChange(addDays(date,-7));setActive(null);setSaved(false)}}><Icon name="chevron_left"/></button><span>{shortDate(weekStart)} – {shortDate(addDays(weekStart,6))}</span><button type="button" aria-label="Next strength week" onClick={()=>{onDateChange(addDays(date,7));setActive(null);setSaved(false)}}><Icon name="chevron_right"/></button></div>
      <div className="coach-week" aria-label="Training schedule Monday to Sunday">{COACH_DAYS.map((day,index)=>{const dayDate=addDays(weekStart,index),dayPlan=coachDay(profile,dayDate,state.sessions);return <button type="button" key={day} aria-pressed={date===dayDate} aria-label={`${day}, ${dayDate}: ${dayPlan?.rest?dayPlan.cardio?.item.label??'Recovery':dayPlan?.title}`} onClick={()=>{onDateChange(dayDate);setActive(null);setCardioLog(false);setSaved(false)}}><span>{day}</span><strong>{Number(dayDate.slice(-2))}</strong><small>{dayPlan?.completed?'Done':dayPlan?.shortTitle??'Rest'}</small></button>})}</div>
      <div className="coach-routine-meta"><span><Icon name="schedule" size={16}/>{profile.strengthCoach!.minutes} min available</span><span><Icon name="exercise" size={16}/>{profile.strengthCoach!.focus==='muscle'?'Muscle focus':'General fitness'}</span></div>
    </aside>
    <div className="coach-workout-panel">
      <section className="coach-session" aria-labelledby="coach-session-title">
        <div className="coach-session-date"><span>{date===todayISO()?'Today':shortDate(date)}</span><span>{plan.rest?plan.cardio?`${plan.cardio.minutes} min cardio`:'Recovery':`${plan.exercises.length} exercises${plan.cardio?' + treadmill':''}`}</span></div>
        <h3 id="coach-session-title">{sessionTitle}</h3><p className="coach-session-focus">{plan.rest?plan.cardio?'Cardio today; no strength session scheduled.':'Rest is part of the routine.':plan.title.replace(/^Full body · /,'').replace(/^Chest/,'Chest')}</p>
        {plan.rest ? <div className="coach-recovery"><p>{plan.cardio?'Your treadmill session is below. Log only the time you actually complete.':'No strength workout today. An easy walk or gentle mobility is optional.'}</p><button type="button" onClick={()=>{onDateChange(plan.nextDate);setActive(null);setSaved(false)}}>Next strength workout · {shortDate(plan.nextDate)}<Icon name="arrow_forward" size={18}/></button></div> : <>
          <div className="coach-completion"><span>{completed} of {plan.exercises.length} logged</span><div className="coach-completion-track" aria-hidden="true">{plan.exercises.map(e=><span key={e.key} className={e.logged?'is-done':''}/>)}</div></div>
          <button type="button" className="coach-primary coach-start" disabled={plan.completed||!isLogDate(date)} onClick={startWorkout}>{plan.completed?'Workout logged':!isLogDate(date)?'Upcoming workout':completed?'Continue workout':'Start workout'}<Icon name={plan.completed?'check_circle':'arrow_forward'} size={20}/></button>
        </>}
      </section>
      <div className="coach-row-actions"><button type="button" onClick={()=>{setCustomizing(!customizing);setCustomActivity(false)}}><Icon name="tune" size={18}/>{customizing?'Close customization':'Customize workout'}</button><button type="button" onClick={()=>{setCustomActivity(!customActivity);setCustomizing(false)}}><Icon name="add" size={18}/>{customActivity?'Close custom activity':'Log my own activity'}</button></div>
      {customizing&&<WorkoutEditor key={date} date={date} profile={profile} ids={plan.exercises.map(e=>e.item.id)} onCancel={()=>setCustomizing(false)} onSave={ids=>{updateProfile({strengthWorkouts:{...profile.strengthWorkouts,[date]:ids}});setCustomizing(false);setActive(null);setSaved(true)}} onReset={()=>{const overrides={...profile.strengthWorkouts};delete overrides[date];updateProfile({strengthWorkouts:overrides});setCustomizing(false);setActive(null);setSaved(true)}}/>}
      {customActivity&&<ActivityComposer key={`custom-${date}`} customOnly date={date} variant="library" onSaved={()=>{setCustomActivity(false);setSaved(true)}}/>}
      {finished?.date===date&&<section className="coach-finish" ref={finishRef} tabIndex={-1} role="status"><Icon name="check_circle" size={32}/><div><h3>{plan.completed?'Workout complete.':'Exercise complete.'}</h3><strong>{finished.title}</strong><p>{finished.strengthLog?.sets.length} sets completed · {finished.durationMin.toFixed(1)} min · ≈ {Math.round(finished.kcal)} active kcal</p><p>{completed} of {plan.exercises.length} exercises completed. {plan.completed?'Take a moment to recover.':'Your progress is saved.'}</p></div>{!plan.completed&&<button type="button" className="coach-primary" onClick={()=>{setFinished(null);startWorkout()}}>Next exercise<Icon name="arrow_forward" size={18}/></button>}<button type="button" aria-label="Dismiss completion" onClick={()=>setFinished(null)}><Icon name="close" size={20}/></button></section>}
      {saved&&!finished&&<p role="status" className="coach-status"><Icon name="check_circle" size={18}/>Saved on this device. Your earlier logs are kept.</p>}
      {!plan.rest && <>
        <div className="coach-warmup"><Icon name="timer" size={24}/><div><strong>Warm up <span>5–8 min</span></strong><p>Lighter practice set first. Keep 2–3 reps in reserve.</p></div></div>
        <p className="coach-volume-note">{plan.volumeReason} Session estimate: about {plan.estimatedMinutes} min.</p>
        {plan.supersetPairs.map(pair=>{const a=plan.exercises.find(e=>e.item.id===pair.first)!,b=plan.exercises.find(e=>e.item.id===pair.second)!;return <div className="coach-set-guide" key={pair.first}><h4>Optional superset</h4><p><strong>{a.item.label} + {b.item.label}</strong></p><ol><li>Do one set of the first exercise.</li><li>Move to the second after a brief setup transition.</li><li>Rest {pair.rest} sec after both. Repeat {pair.rounds} rounds.</li></ol><p>Two exercises paired together, not extra sets. Keep 2–3 reps in reserve. If equipment is busy or technique suffers, use straight sets with the listed rests.</p></div>})}
        {plan.dropSetExercise&&<div className="coach-set-guide"><h4>Optional drop-set finisher</h4><p><strong>{plan.exercises.find(e=>e.item.id===plan.dropSetExercise)!.item.label} only</strong></p><ol><li>Finish the final normal working set.</li><li>Reduce the machine load by about 20%, using an available increment.</li><li>Aim for 8–12 controlled reps. Stop with 1–2 reps in reserve; no forced reps.</li></ol><p>A drop set means lighter weight immediately after a working set. One drop only; skip if fatigued, in pain, or your form changes. Log the lower-weight work using “Add set”.</p></div>}
        {(plan.hardRun||plan.recoveryWarning)&&<p className="coach-caution">{plan.hardRun?'A hard or long run is scheduled today. Move strength to a recovered day or reduce this session.':plan.split.tightRecovery?'These selected days place repeat primary-muscle sessions close together. Spread the days further apart or reduce a session if you are not recovered.':'Strength was logged yesterday. If these muscles are sore or tired, take recovery—don’t double up missed workouts.'}</p>}
        {plan.limitedExercises&&<p className="coach-caution">Your equipment limits this session’s exercise options. We kept only suitable movements rather than filling the list with unrelated exercises.</p>}
        {plan.limitedPull&&<p className="coach-caution">No pulling equipment: back work is control / endurance, not equivalent to rows. Add dumbbells for a more complete muscle-building routine.</p>}
        <div className="coach-exercises-heading"><h3>Your exercises</h3><span>In workout order</span></div>
        <ol className="coach-exercises">{plan.exercises.map((e,index)=><li id={`coach-exercise-${e.item.id}`} key={e.key} className={e.logged?'is-logged':''}>
          <div className="coach-exercise-top"><span className="coach-exercise-number" aria-hidden="true">{e.logged?<Icon name="check" size={18}/>:index+1}</span><div><h4>{e.item.label}</h4><p>{equipmentLabel(e.item)} <span>{e.item.muscles?.join(' / ')}</span></p></div>{e.logged&&<span className="coach-done">Logged</span>}</div>
          <dl className="coach-prescription"><div><dt>{e.logged?'Completed sets':'Planned sets'}</dt><dd>{e.logged?.strengthLog?.sets.length??e.sets}</dd></div><div><dt>{e.held?'Hold (sec)':'Reps'}</dt><dd>{e.logged?.strengthLog?e.logged.strengthLog.sets.map(s=>e.held?s.holdSeconds:s.reps).join(' / '):e.held?'20–30':repRange}</dd></div><div><dt>{e.logged?'Active kcal ≈':'Rest (sec)'}</dt><dd>{e.logged?Math.round(e.logged.kcal):e.rest}</dd></div></dl>
          {e.logged&&<p className="coach-last"><strong>Completed</strong> {e.logged.detail}</p>}
          {e.recent?.strengthLog&&<p className="coach-last"><strong>Last time</strong> {e.recent.strengthLog.sets.map(s=>e.held?`${s.holdSeconds}s`:`${s.reps} reps${s.weightKg>0?` at ${s.weightKg} kg${e.recent!.strengthLog!.implementCount===2?' each':''}`:''}`).join(' / ')}. {e.recent.strengthLog.sets.every(s=>s.reps >= (profile.strengthCoach!.focus === 'muscle' ? 12 : 15))?'If all sets still left 2–3 reps in reserve without pain, try the smallest available load increase next time. Otherwise repeat the load.':'Repeat a comfortable load; add reps before adding weight.'}</p>}
          <div className="coach-row-actions"><button type="button" onClick={()=>setDemo(demo===e.item.id?null:e.item.id)}><Icon name="play_circle" size={18}/>{demo===e.item.id?'Hide technique':'Technique'}</button><button id={`coach-log-${e.item.id}`} type="button" disabled={Boolean(e.logged)||!isLogDate(date)} onClick={()=>setActive(active===e.item.id?null:e.item.id)}>{e.logged?'Logged':active===e.item.id?'Close log':'Log sets'}<Icon name={e.logged?'check':'add'} size={18}/></button></div>
          {demo===e.item.id&&<div className="coach-technique"><p>{e.item.detail}</p><ExerciseDemo key={e.item.id} exerciseId={exerciseDemoId(e.item)}/></div>}
          {exercise?.item.id===e.item.id&&<ActivityComposer key={e.key} variant="library" date={date} prescription={{exerciseId:e.item.id,sets:e.sets,reps:e.reps,rest:e.rest,coachKey:e.key}} onSaved={session=>{setActive(null);setSaved(true);setFinished(session??null)}}/>}
        </li>)}</ol>
        {!isLogDate(date)&&<p className="coach-preview-note">Preview only. Log sets on the day you actually train.</p>}
      </>}
      {plan.cardio&&<section className="coach-set-guide" aria-label="Planned treadmill session"><h3>{plan.cardio.item.label}</h3><p><strong>{plan.cardio.minutes} min</strong> · {plan.cardio.logged?'Logged':plan.rest?'Cardio-only day':'Optional after strength, or do it separately today'}</p><ul><li>Ease in and cool down within your logged duration.</li><li>Keep a comfortable conversational effort. Adjust speed to your ability; no forced pace.</li><li>Use the safety clip. Stop for pain, dizziness or unusual breathlessness.</li></ul>{plan.hardRun&&<p>A hard run is already scheduled today. Skip this extra cardio rather than doubling the running load.</p>}<p>Treadmill and lifting are logged separately. Don’t also add a duplicate whole-gym calorie total.</p><button type="button" className="coach-primary" disabled={Boolean(plan.cardio.logged)||!isLogDate(date)} onClick={()=>setCardioLog(!cardioLog)}>{plan.cardio.logged?'Treadmill logged':cardioLog?'Close treadmill log':'Log treadmill'}</button>{cardioLog&&!plan.cardio.logged&&<ActivityComposer key={plan.cardio.key} variant="library" date={date} prescription={{exerciseId:plan.cardio.item.id,sets:0,reps:0,rest:0,coachKey:plan.cardio.key,durationMin:plan.cardio.minutes}} onSaved={()=>{setCardioLog(false);setSaved(true)}}/>}</section>}
      <div className="coach-support"><details className="coach-method"><summary>How your plan works</summary><ul><li>Healthy-adult starter guidance, not a replacement for a qualified coach or rehabilitation plan.</li><li>Muscle days: 3 days = chest / back / legs; 4 adds shoulders & abs; 5 adds upper / lower top-up sessions.</li><li>With fewer muscle days, each major group may receive only one focused session weekly. Full body / upper-lower is an alternative for spreading that work.</li><li>The order checks repeat primary-muscle spacing across the week, including Sunday to Monday. Secondary-muscle fatigue and your recovery still matter.</li><li>Shorter sessions reduce volume. Beginners start with two working sets; experienced users get 2–4 depending on the lift and session budget.</li><li>Choose a load you can control. No automatic weight increases or invented starting kg.</li><li>Missing a workout is not a debt. Resume the schedule rather than doubling sessions.</li></ul><a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noreferrer">ACSM resistance training guidance</a></details><StrengthProgress/></div>
    </div>
  </section>
}

function WorkoutEditor({date,profile,ids,onSave,onCancel,onReset}:{date:string;profile:UserProfile;ids:string[];onSave:(ids:string[])=>void;onCancel:()=>void;onReset:()=>void}) {
  const [selected,setSelected]=useState(ids)
  const [query,setQuery]=useState('')
  const catalog=ACTIVITIES.filter(item=>item.type==='strength'&&activityTracking(item)!=='time'&&(profile.strengthCoach?.gym?(item.category==='gym'||item.category==='home'):item.category==='home'&&canUseEquipment(item,profile.homeEquipment??[])))
  const matches=catalog.filter(item=>!selected.includes(item.id)&&`${item.label} ${equipmentLabel(item)} ${item.muscles?.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()))
  function move(index:number,offset:number) {const next=[...selected];[next[index],next[index+offset]]=[next[index+offset],next[index]];setSelected(next)}
  return <section className="coach-customize" aria-label="Customize this workout"><h3>Your workout, your choice.</h3><p>Only changes {shortDate(date)}. Earlier logs stay saved. This is your chosen session, not a coach-validated split.</p>
    <ol>{selected.map((id,index)=><li key={id}><strong>{ACTIVITIES.find(item=>item.id===id)?.label??id}</strong><div><button type="button" aria-label={`Move exercise ${index+1} up`} disabled={!index} onClick={()=>move(index,-1)}><Icon name="arrow_upward" size={18}/></button><button type="button" aria-label={`Move exercise ${index+1} down`} disabled={index===selected.length-1} onClick={()=>move(index,1)}><Icon name="arrow_downward" size={18}/></button><button type="button" aria-label={`Remove ${ACTIVITIES.find(item=>item.id===id)?.label??id} from this workout`} onClick={()=>setSelected(selected.filter(value=>value!==id))}><Icon name="close" size={18}/></button></div></li>)}</ol>
    <label>Add or replace an exercise<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search barbell, deadlift, chest…" maxLength={100}/></label>
    <div className="coach-custom-results">{matches.map(item=><button type="button" key={item.id} disabled={selected.length>=30} onClick={()=>setSelected([...selected,item.id])}><span><strong>{item.label}</strong><small>{equipmentLabel(item)}</small></span><Icon name="add" size={18}/></button>)}</div>
    {!matches.length&&<p>No matching exercise. Use “Log my own activity” for a movement outside the library.</p>}
    <p>{selected.length}/30 exercises. Review load, recovery and time; adding exercises may exceed your session budget. Remove the old exercise and add another to replace it.</p>
    <div className="coach-actions"><button className="coach-primary" type="button" onClick={()=>onSave(selected)}>Save this workout</button><button type="button" onClick={onCancel}>Cancel</button><button type="button" onClick={onReset}>Restore coach workout</button></div>
  </section>
}
