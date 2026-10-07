import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { Icon } from '../components/Icon'
import { FitCoreMark } from '../components/FitCoreLogo'
import { ActivityComposer } from '../components/ActivityComposer'
import { ShowUpTrail } from '../components/ShowUpTrail'
import { MilestoneCelebration } from '../components/MilestoneCelebration'
import { TopBar } from '../components/TopBar'
import { HomeProteinIdeas } from '../components/HomeProteinIdeas'
import { todayISO } from '../lib/date'
import { dayFuel, tdee, toDisplayWeight, weightUnit } from '../lib/nutrition'
import { dietDef, netCarbsOn, nowMinutes, windowState } from '../lib/diet'
import type { DayFuel } from '../types'
import './home.css'

const ease = [0.16, 1, 0.3, 1] as const
const spring = { type: 'spring', stiffness: 380, damping: 34 } as const

export function Home() {
  const { state, profile, weightKg, toggleSession, toggleDietTask } = useApp()
  const nav = useNavigate()
  const reducedMotion = useReducedMotion()
  const [today, setToday] = useState(todayISO())
  const [date, setDate] = useState(today)
  useEffect(() => {
    const refreshDay = () => {
      const next = todayISO()
      if (today !== next) {
        setDate(selected => selected === today ? next : selected)
        setToday(next)
      }
    }
    const timer = window.setInterval(refreshDay, 30_000)
    window.addEventListener('focus', refreshDay)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDay) }
  }, [today])
  const [activityOpen, setActivityOpen] = useState(false)
  const activityRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (activityOpen) activityRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'nearest' })
  }, [activityOpen, reducedMotion])
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [feed, setFeed] = useState<'all' | 'meal' | 'activity'>('all')
  const isToday = date === today
  const dayWeight = [...state.weights].filter((entry) => entry.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg ?? profile.startWeightKg
  const fuel = dayFuel(profile, dayWeight, date, state.foods, state.sessions)
  const foods = state.foods.filter((entry) => entry.date === date)
  const sessions = state.sessions.filter((entry) => entry.date === date && entry.type !== 'rest')
  const completed = sessions.filter((entry) => entry.completed)
  const burned = Math.round(completed.reduce((total, entry) => total + entry.kcal, 0))
  const minutes = completed.reduce((total, entry) => total + entry.durationMin, 0)
  const maintenance = tdee(profile, dayWeight)
  const balance = maintenance + burned - fuel.consumed
  const tasks = state.dietTasks.filter((task) => task.date === date)
  const doneTasks = tasks.filter((task) => task.completed).length
  const firstName = (profile.name.trim().split(/\s+/)[0] || 'there').replace(/^./, (char) => char.toUpperCase())
  const diet = dietDef(profile.dietMode)
  const fasting = diet.kind === 'window' && isToday ? windowState(profile.eatingWindowStartHour, profile.dietMode, nowMinutes()) : null
  const carbRemaining = Math.max(0, profile.netCarbCapG - netCarbsOn(state.foods, date))
  const weightChange = toDisplayWeight(weightKg - profile.startWeightKg, profile.units)
  const weightLabel = weightUnit(profile.units)
  const entries = [
    ...foods.map((food) => ({ id: food.id, kind: 'meal' as const, title: food.name, detail: food.slot, at: food.loggedAt, kcal: Math.round(food.kcal * food.servings), photo: food.photo, session: null })),
    ...sessions.map((session) => ({ id: session.id, kind: 'activity' as const, title: session.title, detail: session.strengthLog ? session.detail : `${session.durationMin} min${session.completed ? ' · completed' : ' · planned'}`, at: session.loggedAt ?? `${session.date}T23:59:59`, kcal: Math.round(session.kcal), photo: undefined, session })),
  ].filter((entry) => feed === 'all' || entry.kind === feed).sort((a, b) => b.at.localeCompare(a.at))
  const transition = { duration: reducedMotion ? 0 : 0.24, ease }

  function chooseDay(day: string) { setDate(day); setActivityOpen(false) }

  return <div className="home-page">
    <MilestoneCelebration />
    <TopBar inset />

    <div className="home-welcome"><div><h1>{greeting()}, {firstName}<span>.</span></h1><p>Small steps. A stronger you.</p></div><span className="home-goal"><Icon name={profile.goal === 'lose' ? 'trending_down' : profile.goal === 'gain' ? 'trending_up' : 'balance'} size={16} />{profile.goal === 'lose' ? 'Cut weight' : profile.goal === 'gain' ? 'Build up' : 'Stay balanced'}</span></div>

    <ShowUpTrail date={date} today={today} onChooseDay={chooseDay} onActivity={() => { chooseDay(todayISO()); setActivityOpen(true) }} />

    <div className="home-dashboard">
      <div className="home-primary-column">
        <EnergyBoard fuel={fuel} onOpenFood={() => nav(`/food?date=${date}`)} />
        <div className="home-quick-actions">
          <motion.button type="button" className="home-log-meal" onClick={() => nav(`/food?add=1&date=${date}`)} whileTap={reducedMotion ? undefined : { scale: 0.975 }} transition={spring}><span className="home-action-icon"><Icon name="restaurant" size={23} /></span><span><strong>Log a meal</strong><small>Search, scan or add</small></span><Icon name="add" size={21} /></motion.button>
          <motion.button type="button" className={`home-log-activity ${activityOpen ? 'is-open' : ''}`} onClick={() => setActivityOpen((open) => !open)} aria-expanded={activityOpen} aria-controls="home-activity-composer" whileTap={reducedMotion ? undefined : { scale: 0.975 }} transition={spring}><span className="home-action-icon"><Icon name="exercise" size={23} /></span><span><strong>Log activity</strong><small>Every move counts</small></span><Icon name={activityOpen ? 'close' : 'add'} size={21} /></motion.button>
        </div>

        <AnimatePresence initial={false}>{activityOpen && <motion.div ref={activityRef} id="home-activity-composer" className="home-composer" initial={{ height: reducedMotion ? 'auto' : 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: reducedMotion ? 'auto' : 0, opacity: 0 }} transition={transition}><div className="home-composer-title"><h2>Add your movement</h2><button type="button" onClick={() => setActivityOpen(false)} aria-label="Close activity form"><Icon name="close" size={20} /></button></div><ActivityComposer date={date} onSaved={() => setActivityOpen(false)} /></motion.div>}</AnimatePresence>

        <section className="home-nutrition" aria-labelledby="home-nutrition-title">
          <div className="home-section-heading"><h2 id="home-nutrition-title">A little of everything.</h2><button type="button" onClick={() => nav('/food')} aria-label="View nutrition details"><Icon name="arrow_outward" size={20} /></button></div>
          <div className="home-macros"><Macro label="Protein" value={fuel.protein} target={fuel.proteinTarget} color="protein" /><Macro label="Carbs" value={fuel.carbs} target={fuel.carbTarget} color="carbs" /><Macro label="Fat" value={fuel.fat} target={fuel.fatTarget} color="fat" /></div>
          <details className="home-macro-explanation"><summary><Icon name="info" size={18} /><span>Why these targets?</span><Icon name="expand_more" size={18} /></summary><div><p>Based on your {dayWeight.toFixed(1)} kg weight, saved protein setting and {fuel.budget.toLocaleString()} kcal daily budget.</p><ul><li><strong>Protein · {fuel.proteinTarget} g</strong><span>{dayWeight.toFixed(1)} kg × {profile.proteinPerKg} g/kg, rounded. Protein contributes about {fuel.proteinTarget * 4} kcal.</span></li><li><strong>Fat · {fuel.fatTarget} g</strong><span>{profile.dietMode === 'keto' || profile.dietMode === 'egg' ? 'Your low-carb plan assigns the remaining calories to fat after protein and your carb cap.' : '25% of your calorie budget ÷ 9 kcal per gram, rounded.'}</span></li><li><strong>Carbs · {fuel.carbTarget} g</strong><span>{profile.dietMode === 'keto' || profile.dietMode === 'egg' ? `Your selected low-carb plan uses a ${profile.netCarbCapG} g carb cap.` : 'Calories left after protein and fat ÷ 4 kcal per gram, rounded.'}</span></li></ul><p>These are planning estimates, not an exact measurement of your needs or a requirement to finish every target. Your calorie budget reflects your profile, goal and app training adjustment; a manual calorie override takes priority.</p><div className="home-macro-evidence"><strong>What does the evidence say?</strong><p>ISSN suggests 1.4–2.0 g/kg/day for most exercising adults. This app uses your saved setting, not a measured personal requirement. General adult guidance gives fat 20–35% and carbs 45–65% of calories; this app’s protein-first split can fall outside the carb range. It is not a universally optimal split.</p><p>Health conditions, pregnancy and individual training needs may require guidance from a clinician or dietitian.</p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noreferrer">ISSN protein position stand<Icon name="open_in_new" size={14} /></a><a href="https://www.nationalacademies.org/news/report-offers-new-eating-and-physical-activity-targets-to-reduce-chronic-disease-risk" target="_blank" rel="noreferrer">National Academies macro ranges<Icon name="open_in_new" size={14} /></a></div></div></details>
          <HomeProteinIdeas remaining={Math.max(0, fuel.proteinTarget - fuel.protein)} calorieRemaining={fuel.remaining} date={date} lowCarb={profile.dietMode === 'keto' || profile.dietMode === 'egg'} />
        </section>

        <section className="home-balance" aria-label="Daily energy balance">
          <button type="button" className="home-balance-toggle" onClick={() => setBalanceOpen((open) => !open)} aria-expanded={balanceOpen} aria-controls="home-balance-details"><span className="home-balance-icon"><Icon name="data_usage" size={23} /></span><span><strong>Your energy balance</strong><small>{foods.length ? `${Math.abs(balance).toLocaleString()} kcal estimated ${balance >= 0 ? 'deficit' : 'surplus'}${isToday ? ' so far' : ''}` : 'Add a meal to see your balance'}</small></span><motion.span animate={{ rotate: balanceOpen ? 180 : 0 }} transition={transition}><Icon name="expand_more" size={20} /></motion.span></button>
          <AnimatePresence initial={false}>{balanceOpen && <motion.div id="home-balance-details" className="home-balance-details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition}><dl><div><dt>Estimated maintenance</dt><dd>{maintenance.toLocaleString()} kcal</dd></div><div><dt>Completed activity</dt><dd>+{burned.toLocaleString()} kcal</dd></div><div><dt>Food logged</dt><dd>−{fuel.consumed.toLocaleString()} kcal</dd></div></dl>{foods.length > 0 ? <p>If this is your complete daily intake and you repeat it, the energy-equivalent estimate is <strong>{Math.abs(balance * 7 / 7700).toFixed(1)} kg {balance >= 0 ? 'loss' : 'gain'}/week</strong>. Partial logs and activity already included in maintenance can overstate this.</p> : <p>A day with no meals logged is incomplete. Add your food before using the weekly estimate.</p>}</motion.div>}</AnimatePresence>
        </section>
      </div>

      <div className="home-secondary-column">
        <section className="home-journal" aria-labelledby="home-journal-title">
          <div className="home-section-heading"><div><h2 id="home-journal-title">{isToday ? 'Your day, so far.' : 'Your day, revisited.'}</h2><p>{foods.length} meal{foods.length === 1 ? '' : 's'} · {minutes} min of movement</p></div><button type="button" onClick={() => nav('/food')} aria-label="Open food log"><Icon name="arrow_outward" size={20} /></button></div>
          <div className="home-feed-tabs" role="group" aria-label="Filter daily timeline">{([{ id: 'all', label: 'Everything' }, { id: 'meal', label: 'Meals' }, { id: 'activity', label: 'Movement' }] as const).map((tab) => <button type="button" key={tab.id} onClick={() => setFeed(tab.id)} aria-pressed={feed === tab.id}>{feed === tab.id && <motion.span layoutId="home-feed-selected" transition={reducedMotion ? { duration: 0 } : spring} />}<span>{tab.label}</span></button>)}</div>
          <div className="home-entries" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.div key={`${date}-${feed}`} initial={{ opacity: reducedMotion ? 1 : 0.4, y: reducedMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -4 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}>
            {entries.length ? entries.map((entry) => <div className={`home-entry home-entry-${entry.kind}`} key={`${entry.kind}-${entry.id}`}>
              <span className="home-entry-symbol">{entry.photo ? <img src={entry.photo} alt="" /> : <Icon name={entry.kind === 'meal' ? 'restaurant' : entry.session?.icon ?? 'exercise'} size={22} />}</span>
              <div className="home-entry-copy"><strong>{entry.title}</strong><span>{entry.detail}{entry.kind === 'meal' || entry.session?.loggedAt ? ` · ${time(entry.at)}` : ''}</span></div>
              {entry.session && !entry.session.manual ? <motion.button type="button" className="home-session-check" aria-label={`${entry.session.completed ? 'Mark incomplete' : 'Mark complete'}: ${entry.title}`} aria-pressed={entry.session.completed} onClick={() => toggleSession(entry.id)} whileTap={reducedMotion ? undefined : { scale: 0.9 }}><Icon name={entry.session.completed ? 'check_circle' : 'radio_button_unchecked'} size={25} fill={entry.session.completed} /></motion.button> : <span className="home-entry-energy"><strong>{entry.session?.strengthLog && !entry.session.strengthLog.calorieEstimate && entry.kcal === 0 ? '—' : `${entry.kind === 'meal' ? '+' : '−'}${entry.kcal}`}</strong><small>{entry.session?.strengthLog && !entry.session.strengthLog.calorieEstimate && entry.kcal === 0 ? 'not estimated' : 'kcal'}</small></span>}
            </div>) : <div className="home-journal-empty"><span className="home-empty-symbol"><Icon name={feed === 'activity' ? 'exercise' : 'restaurant'} size={28} /></span><h3>{feed === 'activity' ? 'Make room for movement.' : feed === 'meal' ? 'Your next meal starts here.' : 'A fresh page for your day.'}</h3><p>{isToday ? feed === 'activity' ? 'A walk, a workout, a little stretch. Log what you do.' : 'Log a meal or activity and watch your day come together.' : 'There are no entries for this day.'}</p>{isToday && <button type="button" onClick={() => feed === 'activity' ? setActivityOpen(true) : nav('/food?add=1')}>{feed === 'activity' ? 'Add an activity' : 'Find your first meal'}<Icon name="arrow_forward" size={17} /></button>}</div>}
          </motion.div></AnimatePresence></div>
          {completed.length > 0 && <div className="home-movement-total"><Icon name="local_fire_department" size={19} /><span>{burned.toLocaleString()} kcal from {completed.length} completed activit{completed.length === 1 ? 'y' : 'ies'}</span></div>}
        </section>

        <section className="home-plan" aria-labelledby="home-plan-title">
          <div className="home-section-heading"><h2 id="home-plan-title">Keep your promise.</h2><button type="button" onClick={() => nav('/diet')} aria-label="Open weekly diet plan"><Icon name="arrow_outward" size={20} /></button></div>
          <button type="button" className="home-diet-link" onClick={() => nav('/diet')}><span className="home-diet-icon"><Icon name={diet.icon} size={22} /></span><span><strong>{diet.label} plan</strong><small>{fasting ? `${fasting.phase} · ${fasting.detail}` : diet.kind === 'carb' ? `${carbRemaining} g net carbs left` : diet.tagline}</small></span><Icon name="chevron_right" size={20} /></button>
          {tasks.length > 0 ? <><div className="home-habit-summary"><span>{doneTasks} of {tasks.length} planned actions complete</span><span>{Math.round(doneTasks / tasks.length * 100)}%</span></div><div className="home-habit-list">{tasks.slice(0, 3).map((task) => <label key={task.id} className={task.completed ? 'is-done' : ''}><input type="checkbox" checked={task.completed} onChange={() => toggleDietTask(task.id)} /><span className="home-habit-check"><Icon name="check" size={15} /></span><span>{task.title}</span></label>)}</div>{tasks.length > 3 && <button type="button" className="home-text-link" onClick={() => nav('/diet')}>See all {tasks.length} actions<Icon name="arrow_forward" size={16} /></button>}</> : <button type="button" className="home-create-plan" onClick={() => nav('/diet')}><Icon name="add" size={18} />Build your weekly plan<span>One small promise at a time.</span></button>}
        </section>

        <button type="button" className="home-body-link" onClick={() => nav('/body')}><span className="home-body-icon"><Icon name="monitor_weight" size={26} /></span><span className="home-body-copy"><strong>Your weight, your journey.</strong><small>{state.weights.length ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} ${weightLabel} since you started` : 'Log a weigh-in to track your change'}</small></span><span className="home-body-value">{toDisplayWeight(weightKg, profile.units).toFixed(1)}<small>{weightLabel}</small></span><Icon name="chevron_right" size={18} /></button>
      </div>
    </div>
    <footer className="home-footer"><FitCoreMark size={19} color="#d8deeb" ink="#526079" /><span>Progress is personal. Keep showing up.</span></footer>
  </div>
}

function EnergyBoard({ fuel, onOpenFood }: { fuel: DayFuel; onOpenFood: () => void }) {
  const reducedMotion = useReducedMotion()
  const pct = percent(fuel.consumed, fuel.budget)
  return <section className={`home-energy ${fuel.remaining < 0 ? 'is-over' : ''}`} aria-labelledby="home-energy-title">
    <div className="home-energy-top"><h2 id="home-energy-title">Your daily fuel</h2><button type="button" onClick={onOpenFood} aria-label="Open food log"><Icon name="arrow_outward" size={21} /></button></div>
    <div className="home-energy-reading"><HomeNumber value={Math.abs(fuel.remaining)} /><div><span>kcal</span><strong>{fuel.remaining >= 0 ? 'left to eat' : 'over budget'}</strong></div><span className="home-energy-emblem" aria-hidden="true"><Icon name={fuel.remaining < 0 ? 'restaurant' : 'bolt'} size={40} fill /></span></div>
    <div className="home-energy-meter" role="progressbar" aria-label="Daily food budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${fuel.consumed} of ${fuel.budget} kcal eaten`}>
      <div className="home-energy-ticks" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} />)}</div>
      <motion.div className="home-energy-fill" initial={false} animate={{ scaleX: pct / 100 }} transition={reducedMotion ? { duration: 0 } : { ...spring, stiffness: 170 }} />
      <motion.span className="home-energy-marker" initial={false} animate={{ left: `${pct}%` }} transition={reducedMotion ? { duration: 0 } : { ...spring, stiffness: 170 }}><span /></motion.span>
    </div>
    <div className="home-energy-ends"><span><strong><HomeNumber value={fuel.consumed} /></strong> eaten</span><span><strong>{fuel.budget.toLocaleString()}</strong> kcal budget</span></div>
    <div className="home-energy-message"><Icon name={fuel.consumed ? 'check_circle' : 'info'} size={17} /><span>{fuel.remaining < 0 ? 'One day is one data point. Keep logging.' : fuel.consumed ? `${pct}% of your daily budget used${fuel.trainingBonus ? ` · +${fuel.trainingBonus} activity allowance` : ''}` : 'Start with your next meal. We’ll do the numbers.'}</span></div>
  </section>
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0
  const progress = safeTarget > 0 ? Math.min(100, safeValue / safeTarget * 100) : 0
  const difference = Math.round(Math.abs(safeTarget - safeValue))
  return <div className={`home-macro home-macro-${color}`}><span className="home-macro-label">{label}</span><div className="home-macro-ring" role="progressbar" aria-label={`${label} target`} aria-valuemin={0} aria-valuemax={safeTarget || 100} aria-valuenow={safeTarget > 0 ? Math.min(safeValue, safeTarget) : 0} aria-valuetext={`${safeValue} of ${safeTarget} grams${safeValue > safeTarget ? `, ${difference} grams over target` : ''}`}><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle className="home-macro-ring-track" cx="50" cy="50" r="42" /><circle className="home-macro-ring-fill" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${progress} 100`} transform="rotate(-90 50 50)" opacity={progress > 0 ? 1 : 0} /></svg><strong><HomeNumber value={safeValue} /><small>g</small></strong></div><span className="home-macro-target">of {safeTarget} g</span><span className="home-macro-remaining">{safeTarget === 0 ? 'No target set' : safeValue > safeTarget ? `${difference} g over` : difference === 0 ? 'Target reached' : `${difference} g left`}</span></div>
}

function HomeNumber({ value }: { value: number }) {
  const reducedMotion = useReducedMotion()
  const number = useMotionValue(value)
  const formatted = useTransform(number, (current) => Math.round(current).toLocaleString())
  useEffect(() => { const controls = animate(number, value, { duration: reducedMotion ? 0 : 0.45, ease }); return () => controls.stop() }, [value, number, reducedMotion])
  return <motion.span>{formatted}</motion.span>
}

function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening' }
function percent(value: number, target: number) { return target > 0 ? Math.min(100, Math.max(0, Math.round(value / target * 100))) : 0 }
function time(value: string) { return new Date(value).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }) }
