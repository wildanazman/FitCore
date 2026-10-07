import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../store/AppContext'
import { ACTIVITIES, ACTIVITY_CATEGORIES, HOME_EQUIPMENT, MUSCLE_GROUPS, activityTracking, canUseEquipment, equipmentLabel, requiredEquipment, caloriesFromMet, type ActivityCategory, type EquipmentId, type MuscleGroup } from '../lib/activities'
import { isLogDate, timestampOnDate, todayISO, uid } from '../lib/date'
import { LogDatePicker } from './LogDatePicker'
import { Icon } from './Icon'
import { ExerciseDemo } from './ExerciseDemo'
import { StrengthSets, type SetDraft } from './StrengthSets'
import { estimateStrengthEnergy } from '../lib/strengthEnergy'
import { RunSettings } from './RunSettings'
import { RUN_TYPES, initialRunSettings, plannedRunMinutes, validRunSettings, type RunKind, type RunSettings as RunDraft } from '../lib/runTypes'
import './exercise-library.css'

/** Inline activity logger using the same catalog and calorie engine as Activity. */
export function ActivityComposer({ onSaved, date: controlledDate, onDateChange, variant = 'compact' }: { onSaved: () => void; date?: string; onDateChange?: (date: string) => void; variant?: 'compact' | 'library' }) {
  const library = variant === 'library'
  const [editing, setEditing] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12)
  const editorHeading = useRef<HTMLHeadingElement>(null)
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
  const [includeEnergy, setIncludeEnergy] = useState(false)
  const [tempo, setTempo] = useState('3')
  const [rest, setRest] = useState('60')
  const [sides, setSides] = useState<1 | 2>(1)
  const [effort, setEffort] = useState<'moderate' | 'hard'>('moderate')
  const [runSettings, setRunSettings] = useState<RunDraft | null>(null)
  const selected = ACTIVITIES.find((item) => item.id === selectedId)
  const runKind = selected && Object.prototype.hasOwnProperty.call(RUN_TYPES, selected.id) ? selected.id as RunKind : null
  const weighted = selected ? selected.load ?? (requiredEquipment(selected).some(id => id === 'dumbbell' || id === 'kettlebell') || ['bench_press', 'squat', 'deadlift'].includes(selected.id)) : true
  const strength = tracking !== 'time'
  const energy = estimateStrengthEnergy({ bodyWeightKg: weightKg, sets: sets.map(set => ({ reps: +set.reps || 0, holdSeconds: +set.holdSeconds || 0 })), mode: tracking === 'hold' ? 'hold' : 'reps', tempoSeconds: +tempo || 0, restSeconds: +rest || 0, sides, effort })
  const validEstimate = Number.isFinite(weightKg) && weightKg > 0 && rest !== '' && Number.isFinite(+rest) && +rest >= 0 && +rest <= 600 && (tracking === 'hold' || (tempo !== '' && Number.isFinite(+tempo) && +tempo >= 1 && +tempo <= 10)) && Number.isFinite(energy.kcal) && energy.durationMin > 0 && energy.durationMin <= 1440
  const homeFilters = category === 'home' || category === 'all'
  const muscleFilters = homeFilters || category === 'gym'
  const options = ACTIVITIES.filter((item) => (category === 'all' || item.category === category) && (item.category !== 'home' || canUseEquipment(item, gear)) && (!muscleFilters || muscle === 'all' || item.muscles?.includes(muscle)) && `${item.label} ${item.detail ?? ''} ${item.muscles?.join(' ') ?? ''} ${equipmentLabel(item)}`.toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => requiredEquipment(b).length - requiredEquipment(a).length || a.label.localeCompare(b.label))
  const validTime = Number.isFinite(+minutes) && +minutes > 0 && +minutes <= 1440 && kcal !== '' && Number.isFinite(+kcal) && (strength ? +kcal >= 0 : +kcal > 0)
  const validSets = sets.length > 0 && sets.every(set => {
    const value = tracking === 'hold' ? set.holdSeconds : set.reps
    return value !== '' && Number.isInteger(+value) && +value > 0 && +value <= (tracking === 'hold' ? 3600 : 1000) && (!weighted || (set.weightKg !== '' && Number.isFinite(+set.weightKg) && +set.weightKg >= 0 && +set.weightKg <= 1000))
  })
  const valid = isLogDate(date) && name.trim().length > 0 && (!runKind || (runSettings !== null && validRunSettings(runSettings))) && (strength ? validSets && (includeEnergy ? validTime : validEstimate) : validTime)

  function choose(id: string) {
    const item = ACTIVITIES.find((activity) => activity.id === id)
    if (!item) return
    setSelectedId(id); setName(item.label); setEditing(true)
    const nextTracking = activityTracking(item)
    setTracking(nextTracking); setIncludeEnergy(false); setSides(1); setEffort('moderate')
    setSets([{ reps: '10', weightKg: '', holdSeconds: '30' }]); setImplementCount(1)
    setMinutes(nextTracking === 'time' ? String(+minutes || 30) : '')
    setKcal(nextTracking === 'time' ? String(caloriesFromMet(weightKg, item.met, +minutes || 30)) : '')
    if (Object.prototype.hasOwnProperty.call(RUN_TYPES, id)) {
      const draft = initialRunSettings(id as RunKind, profile.age), duration = plannedRunMinutes(id as RunKind, draft)
      setRunSettings(draft); setMinutes(String(duration)); setKcal(String(caloriesFromMet(weightKg, item.met, duration)))
    } else setRunSettings(null)
  }
  function changeMinutes(value: string) {
    setMinutes(value)
    if (strength || selected) setKcal(+value > 0 ? String(caloriesFromMet(weightKg, strength ? (effort === 'hard' ? 6 : 3.5) - 1 : selected!.met, +value)) : '')
  }
  function resetChoice() { setSelectedId(null); setName(''); setKcal(''); setTracking('time'); setIncludeEnergy(false); setRunSettings(null) }
  function toggleGear(id: EquipmentId) {
    const next = gear.includes(id) ? gear.filter(item => item !== id) : [...gear, id]
    updateProfile({ homeEquipment: next })
    if (selected?.category === 'home' && !canUseEquipment(selected, next)) resetChoice()
  }
  function save(event: FormEvent) {
    event.preventDefault()
    if (!valid || (library && !editing)) return
    const loggedSets = sets.map(set => ({ reps: tracking === 'reps' ? +set.reps : 0, weightKg: weighted ? +set.weightKg : 0, ...(tracking === 'hold' ? { holdSeconds: +set.holdSeconds } : {}) }))
    const count = weighted ? implementCount : 1
    const volumeKg = loggedSets.reduce((sum, set) => sum + set.reps * set.weightKg * count * sides, 0)
    const hrTarget = runKind === 'maf_run' && runSettings ? { min: 170-profile.age+runSettings.mafAdjustment, max: 180-profile.age+runSettings.mafAdjustment } : runKind === 'zone2_run' && runSettings ? { min: Math.round(runSettings.maxHr*.6), max: Math.round(runSettings.maxHr*.7) } : undefined
    const detail = strength ? `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} · ${tracking === 'hold' ? `${sets.map(set => set.holdSeconds).join('/')} sec` : `${sets.map(set => set.reps).join('/')} reps`}${weighted ? ` · ${sets.map(set => set.weightKg).join('/')} kg each × ${count}` : ' · bodyweight'}${sides === 2 ? ' · both sides' : ''} · ${includeEnergy ? 'entered calories' : 'estimated active kcal'}` : `${minutes} min actual${runSettings?.distanceKm ? ` · ${runSettings.distanceKm} km` : ''}${hrTarget ? ` · guidance ${hrTarget.min}–${hrTarget.max} bpm` : ''}${runKind && runSettings && RUN_TYPES[runKind].block ? ` · ${runSettings.rounds} × ${runSettings.work} min / ${runSettings.recovery} min easy` : ''} · manually logged`
    addSession({ id: uid(), date, loggedAt: timestampOnDate(date), type: strength ? 'strength' : selected?.type ?? 'sport', title: name.trim(), detail, durationMin: strength && !includeEnergy ? energy.durationMin : +minutes, kcal: strength && !includeEnergy ? energy.kcal : +kcal, ...(strength ? { strengthLog: { exerciseId: selected?.id, mode: tracking as 'reps' | 'hold', implementCount: count as 1 | 2, sets: loggedSets, volumeKg, calorieEstimate: { method: includeEnergy ? 'entered' : 'sets-tempo', bodyWeightKg: weightKg, tempoSeconds: +tempo, restSeconds: +rest, sides, effort } } } : {}), ...(runKind && runSettings ? { runLog: { kind: runKind, settings: runSettings, plannedDurationMin: plannedRunMinutes(runKind, runSettings), hrTarget }, ...(runSettings.distanceKm ? { distanceKm: +runSettings.distanceKm } : {}) } : {}), completed: true, plan: 'manual', icon: selected?.icon ?? 'exercise', manual: true })
    onSaved()
  }

  return <form className={`home-activity-form ${library ? 'activity-library' : ''}`} onSubmit={save}>
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
    {library && <div className="activity-editor-heading"><button type="button" onClick={() => setEditing(false)}><Icon name="arrow_back" size={18} />Exercise library</button><h2 tabIndex={-1} ref={editorHeading}>{selected?.label ?? 'Log a custom activity'}</h2><p>{selected ? `${equipmentLabel(selected)} · ${selected.detail ?? 'Record what you completed, not what you planned.'}` : 'Give it a name, choose how to track it, and save.'}</p></div>}
    <label className="home-form-label">Activity name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Choose above or type your own" required maxLength={90} /></label>
    {selected && (library ? <details className="activity-guide"><summary><Icon name="play_circle" size={21} />Exercise guide<Icon name="expand_more" size={18} /></summary><ExerciseDemo key={selected.id} exerciseId={selected.demoId ?? selected.id} /></details> : <ExerciseDemo key={selected.id} exerciseId={selected.demoId ?? selected.id} />)}
    {runKind && runSettings && <RunSettings kind={runKind} settings={runSettings} age={profile.age} onChange={setRunSettings} />}
    {!runKind && <div className="exercise-tracking" role="group" aria-label="Logging method">{([{ id: 'reps', label: 'Sets & reps' }, { id: 'hold', label: 'Timed holds' }, { id: 'time', label: 'Duration' }] as const).map(item => <button type="button" key={item.id} aria-pressed={tracking === item.id} onClick={() => setTracking(item.id)}>{item.label}</button>)}</div>}
    {strength && <><StrengthSets sets={sets} onChange={setSets} mode={tracking as 'reps' | 'hold'} weighted={weighted} implementCount={implementCount} onImplementCountChange={setImplementCount} sides={sides} />
      {!includeEnergy && <fieldset className="strength-energy"><legend>Estimated calorie burn</legend><p className="strength-volume" aria-live="polite">{validSets && validEstimate ? `≈ ${energy.kcal} active kcal · ${energy.durationMin.toFixed(1)} min estimated` : 'Complete your sets to see the estimate'}</p>
        <details className="activity-energy-details" open={library ? undefined : true}><summary>Adjust the estimate<Icon name="tune" size={18} /></summary>
        <div className="home-activity-values">{tracking === 'reps' && <label className="home-form-label">Seconds per rep<input type="number" min="1" max="10" step="0.5" value={tempo} onChange={event => setTempo(event.target.value)} /></label>}<label className="home-form-label">Rest between sets (seconds)<input type="number" min="0" max="600" value={rest} onChange={event => setRest(event.target.value)} /></label></div>
        <div className="home-activity-values"><label className="home-form-label">Effort with this load<select value={effort} onChange={event => setEffort(event.target.value as 'moderate' | 'hard')}><option value="moderate">Moderate</option><option value="hard">Hard / vigorous</option></select></label><label className="home-form-label">Rep / hold count<select value={sides} onChange={event => setSides(+event.target.value as 1 | 2)}><option value={1}>Total, or both sides together</option><option value={2}>Per side — doing both sides</option></select></label></div>
        <p className="home-form-note">Uses your {weightKg} kg body weight, sets, tempo, rest and chosen effort. Lifting kg affects how hard it feels, not a fixed kcal-per-kg multiplier. This is a rough model, not a measurement. Active kcal excludes resting energy. Don’t also log the same workout as a separate session.</p><p className="exercise-demo-source">Effort reference: <a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener noreferrer">2024 Activity Compendium</a>. Tempo and rest are editable assumptions.</p>
        </details>
      </fieldset>}
      <label className="exercise-energy-option"><input type="checkbox" checked={includeEnergy} onChange={event => { setIncludeEnergy(event.target.checked); if (event.target.checked) { setMinutes(energy.durationMin.toFixed(1)); setKcal(String(energy.kcal)) } }} />Use actual duration / device active calories instead</label></>}
    {(!strength || includeEnergy) && <><div className="home-duration-presets" role="group" aria-label="Duration presets">{[15, 30, 45, 60].map((value) => <button key={value} type="button" aria-pressed={+minutes === value} onClick={() => changeMinutes(String(value))}>{value} min</button>)}</div><div className="home-activity-values"><label className="home-form-label">Duration (minutes)<input required type="number" inputMode="decimal" min={strength ? 0.1 : 1} step="any" max="1440" value={minutes} onChange={(event) => changeMinutes(event.target.value)} /></label><label className="home-form-label">Calories burned<input required type="number" inputMode="decimal" min={strength ? 0 : 1} value={kcal} onChange={(event) => setKcal(event.target.value)} placeholder="kcal" /></label></div><p className="home-form-note">{strength ? 'Rough active calorie estimate from weight and actual duration; use device active calories instead if available.' : 'Rough session estimate from weight and duration. Use your device’s reading instead if available.'} Don’t log the same workout minutes twice.</p></>}
    <button type="submit" className="home-save-activity" disabled={!valid}><Icon name="check" size={19} />Save activity{valid && <span>{strength ? `${sets.length} sets · ${includeEnergy ? Math.round(+kcal) : `≈ ${energy.kcal}`} kcal` : `${Math.round(+kcal)} kcal`}</span>}</button>
    </>}
  </form>
}
