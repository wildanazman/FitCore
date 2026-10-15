import { useEffect, useRef, useState } from 'react'
import type { coachDay } from '../lib/strengthCoach'
import type { PlanSession } from '../types'
import { shortDate } from '../lib/date'
import { workoutTime } from '../lib/workoutClock'
import { useWorkoutClock } from './useWorkoutClock'
import { ActivityComposer } from './ActivityComposer'
import { Icon } from './Icon'
import './workout-runner.css'
import { DayFit, ExerciseSwap, SessionFeedback } from './CoachTools'
import { useApp } from '../store/AppContext'
import { liftNextStep } from '../lib/strengthInsights'

type Workout = NonNullable<ReturnType<typeof coachDay>>
export function WorkoutRunner({ plan, date, onExit }: { plan: Workout; date: string; onExit: () => void }) {
  const {profile,state}=useApp()
  const [stage,setStage] = useState<'warmup'|'exercise'|'complete'|'summary'>(plan.exercises.some(e=>e.logged)?'exercise':'warmup')
  const [currentId,setCurrentId] = useState(plan.exercises.find(e=>!e.logged)?.item.id)
  const [paused,setPaused] = useState(false)
  const [confirm,setConfirm] = useState<'end'|'skip'|null>(null)
  const [skipped,setSkipped] = useState<string[]>([])
  const [last,setLast] = useState<PlanSession|null>(null)
  const [cardio,setCardio] = useState(false)
  const [swapping,setSwapping] = useState(false)
  const [voice,setVoice] = useState(false)
  const speechSupported=typeof window!=='undefined'&&'speechSynthesis' in window
  const heading = useRef<HTMLHeadingElement>(null)
  const clock = useWorkoutClock(paused || swapping || confirm!==null || stage==='summary' || stage==='complete')
  const current = plan.exercises.find(e=>e.item.id===currentId)
  useEffect(()=>{if(stage==='warmup'&&!current)setCurrentId(plan.exercises.find(e=>!e.logged)?.item.id)},[stage,current,plan.exercises])
  const guidance=current?liftNextStep(current.item.id,date,state.sessions,current.sets,profile.strengthCoach!.focus,profile.strengthFeedback):null
  const logs = plan.exercises.flatMap(e=>e.logged?[e.logged]:[])
  const remaining = plan.exercises.filter(e=>!e.logged)
  const next = remaining.find(e=>e.item.id!==currentId&&!skipped.includes(e.item.id))
  const cue=stage==='exercise'&&current?`${current.item.label}. ${current.sets} working sets. ${current.reps} ${current.held?'seconds':'repetitions'} per set. Rest ${current.rest} seconds between sets. Keep two to three repetitions in reserve. ${current.item.detail??''}`:stage==='warmup'?'Start with five to eight minutes of easy movement, then a light practice set. Stop if you have pain or feel dizzy.':''
  function readCue(){if(!speechSupported||!cue)return;window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(cue);speech.lang='en-GB';speech.rate=.95;window.speechSynthesis.speak(speech)}
  useEffect(()=>{
    if(voice&&!paused&&!swapping&&!confirm)readCue()
    else if(speechSupported)window.speechSynthesis.cancel()
    return ()=>{if(speechSupported)window.speechSynthesis.cancel()}
  },[voice,paused,swapping,confirm,cue])
  useEffect(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'auto'})},[stage,currentId])
  useEffect(()=>{
    if(stage==='summary')return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return ()=>window.removeEventListener('beforeunload',warn)
  },[stage])
  function openExercise(id:string) {setCurrentId(id);setStage('exercise');setLast(null);setPaused(false);setConfirm(null);setSwapping(false);setSkipped(ids=>ids.filter(value=>value!==id))}
  function advance() {if(next)openExercise(next.item.id);else setStage('summary')}
  function skip() {if(currentId)setSkipped(ids=>[...ids,currentId]);setConfirm(null);advance()}
  return <section className="workout-runner" aria-label="Guided workout">
    <header className="workout-toolbar"><div><h2 ref={heading} tabIndex={-1}>{stage==='summary'?'Your session.':plan.title}</h2><p>{shortDate(date)} · {plan.gym?'Gym':'Home'} · {logs.length}/{plan.exercises.length} exercises completed</p></div><div><span className="workout-total-time"><Icon name="timer" size={18}/>{workoutTime(clock.seconds)}</span>{stage!=='summary'&&<button type="button" onClick={()=>setConfirm('end')}>End session</button>}</div></header>
    <div className="workout-step-track" aria-label={`${logs.length} of ${plan.exercises.length} exercises completed`}>{plan.exercises.map(e=><span key={e.key} className={e.logged?'is-done':e.item.id===currentId&&stage==='exercise'?'is-current':''}/>)}</div>
    {speechSupported&&cue&&<div className="workout-voice"><button type="button" aria-pressed={voice} onClick={()=>setVoice(!voice)}><Icon name={voice?'volume_up':'volume_off'} size={18}/>{voice?'Voice cues on':'Enable voice cues'}</button>{voice&&<button type="button" disabled={paused||swapping||Boolean(confirm)} onClick={readCue}>Replay instructions</button>}<small>Optional exercise introductions. Keep the app open.</small></div>}
    {swapping&&current&&<ExerciseSwap key={current.item.id} date={date} plan={plan} id={current.item.id} onCancel={()=>setSwapping(false)} onSwapped={id=>openExercise(id)}/>}
    {confirm&&<section className="workout-confirm" role="alert"><h3>{confirm==='skip'?'Skip this exercise for now?':'Finish this session now?'}</h3><p>Completed exercises stay saved. Unsaved sets in the current exercise will not be logged.</p><div><button type="button" className="coach-primary" onClick={()=>confirm==='skip'?skip():(setConfirm(null),setStage('summary'))}>{confirm==='skip'?'Skip exercise':'Finish session'}</button><button type="button" onClick={()=>setConfirm(null)}>Keep training</button></div></section>}
    {!confirm&&stage==='warmup'&&<section className="workout-warmup"><Icon name="exercise" size={36}/><h3>Get ready to train.</h3><p>Start with 5–8 minutes of easy movement, then a lighter practice set for your first lift.</p><ul><li>Next: <strong>{current?.item.label}</strong></li><li>Keep 2–3 reps in reserve.</li><li>Check working sets only. Stop for pain or dizziness.</li></ul><DayFit date={date} plan={plan} allowPostpone={false}/><button className="coach-primary" type="button" onClick={()=>current&&openExercise(current.item.id)}>Begin working sets<Icon name="arrow_forward" size={20}/></button><small>Warm-up time is not added to exercise calories.</small></section>}
    {stage==='exercise'&&current&&<div hidden={confirm!==null||swapping}>
      <div className="workout-current-bar"><span>Exercise {plan.exercises.indexOf(current)+1} of {plan.exercises.length}</span><button type="button" onClick={()=>setPaused(value=>!value)}><Icon name={paused?'play_arrow':'pause'} size={20}/>{paused?'Resume workout':'Pause workout'}</button></div>
      {paused&&<p className="workout-paused" role="status">Paused. Your sets are kept; exercise and rest timers are stopped.</p>}
      {guidance&&<aside className="workout-next-step"><strong>{guidance.title}</strong><p>{guidance.detail}</p></aside>}
      <button type="button" className="workout-skip" onClick={()=>setSwapping(true)}>Swap exercise · equipment busy?</button>
      <ActivityComposer key={current.key} variant="library" date={date} guided paused={paused||swapping||confirm!==null} prescription={{exerciseId:current.item.id,sets:current.sets,reps:current.reps,rest:current.rest,coachKey:current.key}} onSaved={session=>{setLast(session??null);setStage('complete')}}/>
      <button type="button" className="workout-skip" onClick={()=>setConfirm('skip')}>Skip this exercise for now</button>
    </div>}
    {!confirm&&stage==='complete'&&last&&<section className="workout-step-complete" role="status"><Icon name="check_circle" size={48}/><h3>{last.title} complete.</h3><p>{last.strengthLog?.sets.length} sets · {last.durationMin.toFixed(1)} minutes · ≈ {Math.round(last.kcal)} active kcal</p><p>{next?`Up next: ${next.item.label}`:remaining.length?'Your skipped exercises are still available.':'All strength exercises completed.'}</p><button type="button" className="coach-primary" onClick={advance}>{next?'Next exercise':'View session summary'}<Icon name="arrow_forward" size={20}/></button></section>}
    {stage==='summary'&&<section className="workout-summary"><h3>{remaining.length?'Good work. Your progress is saved.':'Strength session complete.'}</h3><dl><div><dt>Exercises</dt><dd>{logs.length}/{plan.exercises.length}</dd></div><div><dt>Working sets</dt><dd>{logs.reduce((sum,s)=>sum+(s.strengthLog?.sets.length??0),0)}</dd></div><div><dt>Active kcal ≈</dt><dd>{Math.round(logs.reduce((sum,s)=>sum+s.kcal,0))}</dd></div></dl><ul>{logs.map(log=><li key={log.id}><Icon name="check_circle" size={20}/><span>{log.title}<small>{log.strengthLog?.sets.length} sets · {log.durationMin.toFixed(1)} min</small></span></li>)}</ul>{remaining.length>0&&<><h4>Not completed</h4><div className="workout-remaining">{remaining.map(e=><button type="button" key={e.key} onClick={()=>openExercise(e.item.id)}>Resume {e.item.label}<Icon name="arrow_forward" size={18}/></button>)}</div></>}{plan.cardio&&!plan.cardio.logged&&<><button type="button" className="coach-primary" onClick={()=>setCardio(!cardio)}>{cardio?'Close treadmill log':'Log optional treadmill'}</button>{cardio&&<ActivityComposer date={date} variant="library" prescription={{exerciseId:plan.cardio.item.id,sets:0,reps:0,rest:0,coachKey:plan.cardio.key,durationMin:plan.cardio.minutes}} onSaved={()=>setCardio(false)}/>}</>}<p>Energy is the sum of saved exercise estimates, not an extra whole-session calorie log. Session time excludes pauses and result screens.</p><button type="button" className="coach-primary" onClick={onExit}>Back to my plan<Icon name="check" size={18}/></button></section>}
    {stage==='summary'&&<SessionFeedback key={date} date={date} plan={plan}/>}
    {stage!=='summary'&&<details className="workout-queue"><summary>Session lineup · {plan.exercises.length} exercises</summary><ol>{plan.exercises.map(e=><li key={e.key}><span>{e.item.label}</span><strong>{e.logged?'Done':skipped.includes(e.item.id)?'Skipped':e.item.id===currentId?'Current':'Next'}</strong></li>)}</ol></details>}
  </section>
}
