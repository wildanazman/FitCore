import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../store/AppContext'
import { ACTIVITIES, ACTIVITY_CATEGORIES, HOME_EQUIPMENT, MUSCLE_GROUPS, activityTracking, canUseEquipment, equipmentLabel, requiredEquipment, caloriesFromMet, type ActivityCategory, type EquipmentId, type MuscleGroup } from '../lib/activities'
import { isLogDate, timestampOnDate, todayISO, uid } from '../lib/date'
import { LogDatePicker } from './LogDatePicker'
import { Icon } from './Icon'
import { ExerciseDemo } from './ExerciseDemo'
import { exerciseDemoId } from '../lib/exerciseVideos'
import { StrengthSets, type SetDraft } from './StrengthSets'
import { estimateStrengthEnergy } from '../lib/strengthEnergy'
import { RunSettings } from './RunSettings'
import { RUN_TYPES, initialRunSettings, plannedRunMinutes, validRunSettings, type RunKind, type RunSettings as RunDraft } from '../lib/runTypes'
import type { PlanSession } from '../types'
import { useWorkoutClock } from './useWorkoutClock'
import { workoutTime } from '../lib/workoutClock'
import './exercise-library.css'

/** Inline activity logger using the same catalog and calorie engine as Activity. */
export function ActivityComposer({ onSaved, date: controlledDate, onDateChange, variant = 'compact', prescription, customOnly = false, guided = false, paused = false }: { onSaved: (session?: PlanSession) => void; date?: string; onDateChange?: (date: string) => void; variant?: 'compact' | 'library'; customOnly?:boolean; guided?:boolean; paused?:boolean; prescription?: { exerciseId: string; sets: number; reps: number; rest: number; coachKey: string; durationMin?:number } }) {
  const library = variant === 'library'
  const [editing, setEditing] = useState(customOnly)
  const [visibleCount, setVisibleCount] = useState(12)
  const editorHeading = useRef<HTMLHeadingElement>(null)
  const saving = useRef(false)
  useEffect(() => { if (library && editing) editorHeading.current?.focus() }, [library, editing])
  const [ownDate, setOwnDate] = useState(todayISO)
  const date = controlledDate ?? ownDate
  const { profile, weightKg, addSession, updateProfile } = useApp()
  const [category, setCategory] = useState<ActivityCategory | 'all'>('home')
  const gear = profile.homeEquipment ?? []
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('30')
  const [kcal, setKcal] = useState('')
  const [tracking, setTracking] = useState<'time' | 'reps' | 'hold'>('time')
  const [sets, setSets] = useState<SetDraft[]>([{ reps: '10', weightKg: '', holdSeconds: '30' }])
  const [implementCount, setImplementCount] = useState<1 | 2>(1)
  const [customWeighted, setCustomWeighted] = useState(true)
  const [includeEnergy, setIncludeEnergy] = useState(false)
  const [actualMinutes, setActualMinutes] = useState('')
  const [tempo, setTempo] = useState('3')
  const [rest, setRest] = useState('60')
  const [sides, setSides] = useState<1 | 2>(1)
  const [effort, setEffort] = useState<'moderate' | 'hard'>('moderate')
  const [runSettings, setRunSettings] = useState<RunDraft | null>(null)
  const selected = ACTIVITIES.find((item) => item.id === selectedId)
  const runKind = selected && Object.prototype.hasOwnProperty.call(RUN_TYPES, selected.id) ? selected.id as RunKind : null
  const weighted = selected ? selected.load ?? (requiredEquipment(selected).some(id => id === 'dumbbell' || id === 'kettlebell') || ['bench_press', 'squat', 'deadlift'].includes(selected.id)) : customWeighted
  const totalLoad = /\b(barbell|ez bar|trap bar|smith machine)\b/i.test(selected ? equipmentLabel(selected) : name)
  const pairedLoad = /dumbbell|kettlebell/i.test(selected ? equipmentLabel(selected) : name)
  const usedCount = totalLoad || !pairedLoad ? 1 : implementCount
  const strength = tracking !== 'time'
  const workout = Boolean(prescription && strength)
  const allSetsDone = sets.length > 0 && sets.every(set=>set.done)
  const clock = useWorkoutClock(!guided || paused || allSetsDone)
  const [restEnds, setRestEnds] = useState<number | null>(null)
  const restPanel = useRef<HTMLElement>(null)
  useEffect(()=>{if(restEnds!==null)restPanel.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},[restEnds])
  const restRemaining = restEnds === null ? 0 : Math.max(0, Math.ceil(restEnds-clock.seconds))
  function changeSets(next: SetDraft[]) {
    if (guided && next.some((set,index)=>set.done && !sets[index]?.done)) {
      setRestEnds(next.every(set=>set.done) ? null : clock.seconds + Math.max(0,+rest||0))
    }
    setSets(next)
  }
  const measuredMinutes = actualMinutes !== '' ? +actualMinutes : guided ? Math.max(1/60,clock.seconds/60) : undefined
  const energyKind = tracking==='hold'?'hold':!weighted?'bodyweight':selected?.id==='home_kb_swing'?'kettlebell-swing':/squat|deadlift/i.test(selected?.label??name)?'compound':'resistance'
  const energy = estimateStrengthEnergy({ bodyWeightKg: weightKg, sets: sets.map(set => ({ reps: +set.reps || 0, holdSeconds: +set.holdSeconds || 0 })), mode: tracking === 'hold' ? 'hold' : 'reps', tempoSeconds: +tempo || 0, restSeconds: +rest || 0, sides, effort, kind:energyKind, actualMinutes: measuredMinutes })
  const validEstimate = (actualMinutes === '' || (Number.isFinite(+actualMinutes) && +actualMinutes > 0 && +actualMinutes <= 1440)) && Number.isFinite(weightKg) && weightKg > 0 && rest !== '' && Number.isFinite(+rest) && +rest >= 0 && +rest <= 600 && (tracking === 'hold' || (tempo !== '' && Number.isFinite(+tempo) && +tempo >= 1 && +tempo <= 10)) && Number.isFinite(energy.kcal) && energy.durationMin > 0 && energy.durationMin <= 1440
  const homeFilters = category === 'home' || category === 'all'
  const muscleFilters = homeFilters || category === 'gym'
  const options = ACTIVITIES.filter((item) => (category === 'all' || item.category === category) && (item.category !== 'home' || canUseEquipment(item, gear)) && (!muscleFilters || muscle === 'all' || item.muscles?.includes(muscle)) && `${item.label} ${item.detail ?? ''} ${item.muscles?.join(' ') ?? ''} ${equipmentLabel(item)}`.toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => requiredEquipment(b).length - requiredEquipment(a).length || a.label.localeCompare(b.label))
  const validTime = Number.isFinite(+minutes) && +minutes > 0 && +minutes <= 1440 && kcal !== '' && Number.isFinite(+kcal) && (strength ? +kcal >= 0 : +kcal > 0)
  const validSets = sets.length > 0 && sets.every(set => {
    const value = tracking === 'hold' ? set.holdSeconds : set.reps
    return value !== '' && Number.isInteger(+value) && +value > 0 && +value <= (tracking === 'hold' ? 3600 : 1000) && (!weighted || (set.weightKg !== '' && Number.isFinite(+set.weightKg) && +set.weightKg >= 0 && +set.weightKg <= 1000))
  })
  const valid = isLogDate(date) && name.trim().length > 0 && (!runKind || (runSettings !== null && validRunSettings(runSettings))) && (strength ? (!workout || sets.every(set=>set.done)) && validSets && (includeEnergy ? validTime : validEstimate) : validTime)

  function choose(id: string) {
    const item = ACTIVITIES.find((activity) => activity.id === id)
    if (!item) return
    saving.current = false
    setSelectedId(id); setName(item.label); setEditing(true)
    const nextTracking = activityTracking(item)
    setTracking(nextTracking); setIncludeEnergy(false); setSides(1); setEffort('moderate')
    setSets([{ reps: '10', weightKg: '', holdSeconds: '30' }]); setActualMinutes(''); setImplementCount(1)
    setMinutes(nextTracking === 'time' ? String(+minutes || 30) : '')
    setKcal(nextTracking === 'time' ? String(caloriesFromMet(weightKg, item.met-(item.id.startsWith('treadmill_')?1:0), +minutes || 30)) : '')
    if (Object.prototype.hasOwnProperty.call(RUN_TYPES, id)) {
      const draft = initialRunSettings(id as RunKind, profile.age), duration = plannedRunMinutes(id as RunKind, draft)
      setRunSettings(draft); setMinutes(String(duration)); setKcal(String(caloriesFromMet(weightKg, item.met, duration)))
    } else setRunSettings(null)
  }
  function changeMinutes(value: string) {
    setMinutes(value)
    if (strength || selected) setKcal(+value > 0 ? String(caloriesFromMet(weightKg, strength ? energy.met - 1 : selected!.met-(selected!.id.startsWith('treadmill_')?1:0), +value)) : '')
  }
  useEffect(() => {
    if (!prescription) return
    choose(prescription.exerciseId)
    if(prescription.durationMin){const item=ACTIVITIES.find(a=>a.id===prescription.exerciseId);setMinutes(String(prescription.durationMin));if(item)setKcal(String(caloriesFromMet(weightKg,Math.max(0,item.met-1),prescription.durationMin)))}
    setSets(Array.from({ length: prescription.sets }, () => ({ reps: String(prescription.reps), holdSeconds: String(prescription.reps), weightKg: '' })))
    setRest(String(prescription.rest))
    // Keep actual load blank: a plan cannot know what the user lifted.
  }, [prescription?.coachKey])
  function resetChoice() { setSelectedId(null); setName(''); setKcal(''); setTracking('time'); setIncludeEnergy(false); setRunSettings(null) }
  function toggleGear(id: EquipmentId) {
    const next = gear.includes(id) ? gear.filter(item => item !== id) : [...gear, id]
    updateProfile({ homeEquipment: next })
    if (selected?.category === 'home' && !canUseEquipment(selected, next)) resetChoice()
  }
  function save(event: FormEvent) {
    event.preventDefault()
    if (paused || !valid || saving.current || (library && !editing)) return
    saving.current = true
    const loggedSets = sets.map(set => ({ reps: tracking === 'reps' ? +set.reps : 0, weightKg: weighted ? +set.weightKg : 0, ...(tracking === 'hold' ? { holdSeconds: +set.holdSeconds } : {}) }))
    const count = weighted ? usedCount : 1
    const volumeKg = loggedSets.reduce((sum, set) => sum + set.reps * set.weightKg * count * sides, 0)
    const hrTarget = runKind === 'maf_run' && runSettings ? { min: 170-profile.age+runSettings.mafAdjustment, max: 180-profile.age+runSettings.mafAdjustment } : runKind === 'zone2_run' && runSettings ? { min: Math.round(runSettings.maxHr*.6), max: Math.round(runSettings.maxHr*.7) } : undefined
    const detail = strength ? `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} · ${tracking === 'hold' ? `${sets.map(set => set.holdSeconds).join('/')} sec` : `${sets.map(set => set.reps).join('/')} reps`}${weighted ? ` · ${sets.map(set => set.weightKg).join('/')} kg${totalLoad || !pairedLoad ? ' total' : ` each × ${count}`}` : ' · bodyweight'}${sides === 2 ? ' · both sides' : ''} · ${includeEnergy ? 'entered calories' : actualMinutes || guided ? 'duration-based estimated active kcal' : 'sets-based estimated active kcal'}` : `${minutes} min actual${runSettings?.distanceKm ? ` · ${runSettings.distanceKm} km` : ''}${hrTarget ? ` · guidance ${hrTarget.min}–${hrTarget.max} bpm` : ''}${runKind && runSettings && RUN_TYPES[runKind].block ? ` · ${runSettings.rounds} × ${runSettings.work} min / ${runSettings.recovery} min easy` : ''} · manually logged`
    const session: PlanSession = { id: uid(), date, ...(prescription && selectedId === prescription.exerciseId ? { coachKey: prescription.coachKey } : {}), loggedAt: timestampOnDate(date), type: strength ? 'strength' : selected?.type ?? 'sport', title: name.trim(), detail, durationMin: strength && !includeEnergy ? energy.durationMin : +minutes, kcal: strength && !includeEnergy ? energy.kcal : +kcal, ...(strength ? { strengthLog: { exerciseId: selected?.id, mode: tracking as 'reps' | 'hold', implementCount: count as 1 | 2, sets: loggedSets, volumeKg, calorieEstimate: { method: includeEnergy ? 'entered' : actualMinutes || guided ? 'duration-met' : 'sets-tempo', bodyWeightKg: weightKg, tempoSeconds: +tempo, restSeconds: +rest, sides, effort } } } : {}), ...(runKind && runSettings ? { runLog: { kind: runKind, settings: runSettings, plannedDurationMin: plannedRunMinutes(runKind, runSettings), hrTarget }, ...(runSettings.distanceKm ? { distanceKm: +runSettings.distanceKm } : {}) } : {}), completed: true, plan: 'manual', icon: selected?.icon ?? 'exercise', manual: true }
    addSession(session)
    onSaved(session)
  }

  return <form className={`home-activity-form ${library ? 'activity-library' : ''} ${workout?'coach-live-log':''}`} onSubmit={save}><fieldset disabled={paused} className="workout-control-fields">
    {(controlledDate === undefined || onDateChange) && <LogDatePicker date={date} onChange={onDateChange ?? setOwnDate} />}
    {(!library || !editing) && <>
    {library && <div className="activity-library-title"><div><h2>Build your<br />session<span>.</span></h2><p>Your space. Your equipment. Your next move.</p></div><button type="button" onClick={() => { resetChoice(); setEditing(true) }}><Icon name="add" size={22} /><span>Custom<br />activity</span></button></div>}
    <div className="home-activity-categories" role="group" aria-label="Activity category">{ACTIVITY_CATEGORIES.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setMuscle('all'); setVisibleCount(12); resetChoice() }}>{item.label}</button>)}</div>
    {homeFilters && <>
      <details className="activity-gear-disclosure" open><summary><span>Your equipment<strong>{gear.length ? HOME_EQUIPMENT.filter(item => gear.includes(item.id)).map(item => item.label).join(' · ') : 'Bodyweight only'}</strong></span><Icon name="tune" size={22} /></summary>
      <fieldset className="exercise-equipment"><legend>{library ? 'Your kit' : 'Your home equipment'}</legend>{!library && <p>Tick everything you have. We’ll remember your setup.</p>}<div>{HOME_EQUIPMENT.map(item => <label key={item.id}><input type="checkbox" checked={gear.includes(item.id)} onChange={() => toggleGear(item.id)} />{library && <Icon name={item.id === 'mat' ? 'crop_landscape' : item.id === 'bench' ? 'chair' : 'fitness_center'} size={24} />}<span>{item.label}</span></label>)}</div><small>{library ? 'Saved to your profile. Bodyweight movements always included.' : gear.length ? 'Only exercises using your equipment, plus bodyweight movements.' : 'No equipment selected. Start with bodyweight exercises.'}</small></fieldset>
      </details>
    </>}
    {muscleFilters && <>
      <fieldset className="exercise-muscles"><legend>{library ? 'Pick your focus' : 'What are you working on?'}</legend><div>{[{ id: 'all' as const, label: 'All muscles' }, ...MUSCLE_GROUPS].map(item => <button type="button" key={item.id} aria-pressed={muscle === item.id} onClick={() => { setMuscle(item.id); setVisibleCount(12); resetChoice() }}>{item.label}</button>)}</div></fieldset>
    </>}
    <label className="home-activity-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12) }} placeholder="Search exercises or movements" aria-label="Find an activity" /></label>
    <div className="exercise-results-heading"><strong>{options.length} {category === 'home' ? 'home exercises' : 'activities'}</strong><span>{muscle === 'all' ? 'Matching your selection' : MUSCLE_GROUPS.find(item => item.id === muscle)?.label}</span></div>
    <div className="home-activity-options exercise-results" role="group" aria-label="Choose an activity">{(library ? options.slice(0, visibleCount) : options).map((item) => <button type="button" key={item.id} aria-pressed={selectedId === item.id} onClick={() => choose(item.id)}><Icon name={item.icon} size={19} /><span><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}{(item.category === 'home' || item.category === 'gym') && <small className="exercise-requirements">{equipmentLabel(item)} · {item.muscles?.map(id => MUSCLE_GROUPS.find(group => group.id === id)?.label).join(', ')}</small>}</span>{library && <span className="activity-exercise-mode">{activityTracking(item) === 'reps' ? 'SETS / REPS' : activityTracking(item) === 'hold' ? 'TIMED HOLD' : 'DURATION'}</span>}<Icon name={selectedId === item.id ? 'check' : 'chevron_right'} size={18} /></button>)}{options.length === 0 && <p>No matching exercises. Try another focus area or equipment setup, clear your search, or log a custom activity.</p>}</div>
    {library && visibleCount < options.length && <button type="button" className="activity-show-more" onClick={() => setVisibleCount(count => count + 12)}>Show more exercises<Icon name="expand_more" size={18} /></button>}
    </>}
    {(!library || editing) && <>
    {library && <div className="activity-editor-heading">{!prescription&&<button type="button" onClick={() => setEditing(false)}><Icon name="arrow_back" size={18} />Exercise library</button>}<h2 tabIndex={-1} ref={editorHeading}>{selected?.label ?? 'Log a custom activity'}</h2><p>{selected ? `${equipmentLabel(selected)} · ${selected.detail ?? 'Record what you completed, not what you planned.'}` : 'Give it a name, choose how to track it, and save.'}</p></div>}
    {!prescription&&<label className="home-form-label">Activity name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Choose above or type your own" required maxLength={90} /></label>}
    {guided&&<div className="workout-exercise-clock"><span><Icon name="timer" size={18}/>Exercise time <strong>{workoutTime(clock.seconds)}</strong></span><span>{allSetsDone?'All sets checked':paused?'Paused':'Recording'}</span></div>}
    {workout&&<p className="workout-target">Planned {prescription!.sets} sets · logging {sets.length} sets. Record what you actually do.</p>}
    {selected && (library ? <details className="activity-guide"><summary><Icon name="play_circle" size={21} />Exercise guide<Icon name="expand_more" size={18} /></summary><ExerciseDemo key={selected.id} exerciseId={exerciseDemoId(selected)} /></details> : <ExerciseDemo key={selected.id} exerciseId={exerciseDemoId(selected)} />)}
    {runKind && runSettings && <RunSettings kind={runKind} settings={runSettings} age={profile.age} onChange={setRunSettings} />}
    {!prescription && !runKind && !selected?.id.startsWith('treadmill_') && <div className="exercise-tracking" role="group" aria-label="Logging method">{([{ id: 'reps', label: 'Sets & reps' }, { id: 'hold', label: 'Timed holds' }, { id: 'time', label: 'Duration' }] as const).map(item => <button type="button" key={item.id} aria-pressed={tracking === item.id} onClick={() => setTracking(item.id)}>{item.label}</button>)}</div>}
    {strength && <>{!selected&&<label className="exercise-energy-option"><input type="checkbox" checked={customWeighted} onChange={event=>setCustomWeighted(event.target.checked)}/>Uses weights (turn off for bodyweight)</label>}<StrengthSets sets={sets} onChange={changeSets} mode={tracking as 'reps' | 'hold'} weighted={weighted} implementCount={usedCount} onImplementCountChange={setImplementCount} sides={sides} totalLoad={totalLoad} pairedLoad={pairedLoad} workout={workout} />
      {guided&&restEnds!==null&&!allSetsDone&&<section className={`workout-rest ${restRemaining===0?'is-ready':''}`} ref={restPanel} aria-label="Rest between sets"><div><strong>{restRemaining>0?'Rest & reset':'Ready for your next set'}</strong><span role="timer">{workoutTime(restRemaining)}</span></div><p>{restRemaining>0?'Breathe. Start the next set when you feel ready.':'Timer finished. Take extra rest if you need it.'}</p><div><button type="button" onClick={()=>setRestEnds(Math.max(clock.seconds,restEnds)+30)}>+30 sec</button><button type="button" onClick={()=>setRestEnds(null)}>End rest</button></div></section>}
      {!includeEnergy && <fieldset className="strength-energy"><legend>Energy estimate</legend><label className="home-form-label">Actual minutes for this exercise (including between-set rests)<input type="number" min="0.1" max="1440" step="any" value={actualMinutes} placeholder={guided?"Optional — use the exercise timer":"Optional — otherwise estimated from sets"} onChange={event=>setActualMinutes(event.target.value)}/></label><p className="strength-volume" aria-live="polite">{validSets && validEstimate ? `≈ ${energy.kcal} active kcal · ${energy.durationMin.toFixed(1)} min ${actualMinutes?'entered':guided?'timed':'estimated from sets'}` : 'Complete your sets to see the estimate'}</p>
        <details className="activity-energy-details" open={library ? undefined : true}><summary>Adjust the estimate<Icon name="tune" size={18} /></summary>
        <div className="home-activity-values">{tracking === 'reps' && <label className="home-form-label">Seconds per rep<input type="number" min="1" max="10" step="0.5" value={tempo} onChange={event => setTempo(event.target.value)} /></label>}<label className="home-form-label">Rest between sets (seconds)<input type="number" min="0" max="600" value={rest} onChange={event => setRest(event.target.value)} /></label></div>
        <div className="home-activity-values"><label className="home-form-label">Effort with this load<select value={effort} onChange={event => setEffort(event.target.value as 'moderate' | 'hard')}><option value="moderate">Moderate</option><option value="hard">Hard / vigorous</option></select></label><label className="home-form-label">Rep / hold count<select value={sides} onChange={event => setSides(+event.target.value as 1 | 2)}><option value={1}>Total, or both sides together</option><option value={2}>Per side — doing both sides</option></select></label></div>
        <p className="home-form-note">Uses your {weightKg} kg body weight, exercise-block duration and chosen effort. Without actual minutes, duration is estimated from reps, tempo and between-set rests. Lifting kg affects how hard it feels, not a fixed kcal-per-kg multiplier. This is a rough model, not a measurement. Active kcal excludes resting energy. Count only this exercise block, not the entire gym visit. Don’t also log the same workout as a separate session.</p><p className="exercise-demo-source">Effort reference: <a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener noreferrer">2024 Activity Compendium</a>. Tempo and rest are editable assumptions.</p>
        </details>
      </fieldset>}
      <label className="exercise-energy-option"><input type="checkbox" checked={includeEnergy} onChange={event => { setIncludeEnergy(event.target.checked); if (event.target.checked) { setMinutes(energy.durationMin.toFixed(1)); setKcal(String(energy.kcal)) } }} />Use actual duration / device active calories instead</label></>}
    {(!strength || includeEnergy) && <><div className="home-duration-presets" role="group" aria-label="Duration presets">{[15, 30, 45, 60].map((value) => <button key={value} type="button" aria-pressed={+minutes === value} onClick={() => changeMinutes(String(value))}>{value} min</button>)}</div><div className="home-activity-values"><label className="home-form-label">Duration (minutes)<input required type="number" inputMode="decimal" min={strength ? 0.1 : 1} step="any" max="1440" value={minutes} onChange={(event) => changeMinutes(event.target.value)} /></label><label className="home-form-label">Calories burned<input required type="number" inputMode="decimal" min={strength ? 0 : 1} value={kcal} onChange={(event) => setKcal(event.target.value)} placeholder="kcal" /></label></div><p className="home-form-note">{strength ? 'Rough active calorie estimate from weight and actual duration; use device active calories instead if available.' : 'Rough session estimate from weight and duration. Use your device’s reading instead if available.'} Don’t log the same workout minutes twice.</p></>}
    <button type="submit" className="home-save-activity" disabled={!valid}><Icon name="check" size={19} />{workout?'Finish exercise':'Save activity'}{valid && <span>{strength ? `${sets.length} sets · ${includeEnergy ? Math.round(+kcal) : `≈ ${energy.kcal}`} kcal` : `${Math.round(+kcal)} kcal`}</span>}</button>
    </>}
  </fieldset></form>
}
