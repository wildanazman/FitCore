import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { WeeklyDietPlan } from '../components/WeeklyDietPlan'
import { dietDef, DIET_LIST, eggsOn, netCarbsOn, windowLengthHours, windowState } from '../lib/diet'
import { personalPlan } from '../lib/dietGuide'
import { toDisplayWeight, weightUnit } from '../lib/nutrition'
import { todayISO } from '../lib/date'
import './diet-plan.css'

export function DietPlan() {
  const { profile, weightKg, state, updateProfile } = useApp()
  const nav = useNavigate()
  const plan = personalPlan(profile, weightKg)
  const def = dietDef(profile.dietMode)
  const [now, setNow] = useState(() => new Date())
  const windowNow = def.kind === 'window' ? windowState(profile.eatingWindowStartHour, profile.dietMode, now.getHours() * 60 + now.getMinutes()) : null
  const today = todayISO()
  const focusStats = profile.dietMode === 'standard'
    ? [['PROTEIN', `${plan.macros.protein}g`], ['CARBS', `${plan.macros.carbs}g`], ['FAT', `${plan.macros.fat}g`]]
    : profile.dietMode === '16:8'
      ? [['EAT FROM', formatHour(profile.eatingWindowStartHour)], ['UNTIL', formatHour(profile.eatingWindowStartHour + 8)], ['PROTEIN', `${plan.macros.protein}g`]]
      : profile.dietMode === 'omad'
        ? [['MEAL WINDOW', `${windowLengthHours(profile.dietMode)} hour`], ['STARTS', formatHour(profile.eatingWindowStartHour)], ['PROTEIN', `${plan.macros.protein}g`]]
        : profile.dietMode === 'keto'
          ? [['NET CARB CAP', `${profile.netCarbCapG}g`], ['LOGGED TODAY', `${netCarbsOn(state.foods, today)}g`], ['PROTEIN', `${plan.macros.protein}g`]]
          : [['EGGS LOGGED', `${eggsOn(state.foods, today)}`], ['CARBS', `${plan.macros.carbs}g`], ['PROTEIN', `${plan.macros.protein}g`]]

  useEffect(() => {
    if (def.kind !== 'window') return
    const timer = globalThis.setInterval(() => setNow(new Date()), 60_000)
    return () => globalThis.clearInterval(timer)
  }, [def.kind])

  return <div className="diet-page"><TopBar /><main className="diet-content">
    <header className="diet-heading"><button type="button" onClick={() => nav(-1)} aria-label="Go back"><Icon name="arrow_back" /></button><div><h1>Your diet plan.</h1><p>Pick an approach, shape your week, and track what actually happens.</p></div></header>

    <section className="diet-protocols" aria-label="Choose a diet approach"><div className="diet-section-title"><h2>Choose your approach.</h2><p>Your calorie estimate stays personal. Each approach changes meal timing, food structure and macro limits.</p></div><div className="diet-protocol-list">{DIET_LIST.map((item) => <button type="button" key={item.id} className={item.id === profile.dietMode ? 'active' : ''} aria-label={`${item.label}: ${item.tagline}`} aria-pressed={item.id === profile.dietMode} onClick={() => updateProfile({ dietMode: item.id })}><Icon name={item.icon} size={20} /><strong>{item.label}</strong></button>)}</div></section>

    <section className="diet-brief"><div className="diet-brief-top"><span>ACTIVE PLAN</span><strong>{def.label}</strong></div><h2>{plan.target.toLocaleString()} <span>kcal / day</span></h2><p>{plan.guide.headline}</p><div className="diet-brief-stats">{focusStats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{windowNow && <div className="diet-window"><span>{windowNow.eating ? 'Eating window is open' : 'Fasting window'}</span><strong>{formatHour(windowNow.startHour)} – {formatHour(windowNow.endHour)}</strong><small>{windowNow.eating ? `You have ${windowLengthHours(profile.dietMode)} hours to eat toward your target.` : 'Plan your next meal for the window.'}</small></div>}<button type="button" onClick={() => nav('/food')} className="diet-log-button">Log food today <Icon name="arrow_outward" size={20} /></button></section>

    <section className="diet-protocol-guidance"><div className="diet-section-title"><h2>{def.label}, in practice.</h2><p>What makes this approach different today.</p></div><ol>{plan.guide.howItWorks.map((item, i) => <li key={item}><span>{String(i + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ol>{(profile.dietMode === 'omad' || profile.dietMode === 'egg') && <p className="diet-protocol-caution"><Icon name="warning" size={17} />{profile.dietMode === 'omad' ? 'A one-hour window is restrictive. Check suitability with a clinician, especially if you have diabetes, take medication, are pregnant or have a history of disordered eating.' : 'Egg Diet is nutritionally narrow and intended only as a short-term approach. Do not use it as a long-term default.'}</p>}</section>

    <WeeklyDietPlan mode={profile.dietMode} startHour={profile.eatingWindowStartHour} />

    <section className="diet-sample"><div className="diet-section-title"><h2>A day you could follow.</h2><p>Example portions scaled to about {plan.target.toLocaleString()} kcal. Adjust food and servings to suit you.</p></div><div className="diet-meal-list">{plan.scaledDay.map((meal, i) => <div className="diet-meal" key={`${meal.name}-${i}`}><div className="diet-meal-time">{String(i + 1).padStart(2, '0')}</div><div><h3>{meal.name}</h3><p>{meal.items}</p><small>{meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g fat</small></div><strong>{meal.kcal}<span> kcal</span></strong></div>)}</div><div className="diet-sample-total"><span>EXAMPLE TOTAL</span><strong>{plan.scaledTotal.kcal.toLocaleString()} kcal</strong></div></section>

    <section className="diet-knowledge"><div className="diet-section-title"><h2>Know the plan.</h2><p>The useful details, without turning your day into a rulebook.</p></div><details><summary>How it works</summary><ul>{plan.guide.howItWorks.map((item) => <li key={item}>{item}</li>)}</ul></details><details><summary>Foods to lean on</summary><ul>{plan.guide.eat.map((item) => <li key={item}>{item}</li>)}</ul></details><details><summary>Foods to limit</summary><ul>{plan.guide.avoid.map((item) => <li key={item}>{item}</li>)}</ul></details><details><summary>Practical tips & cautions</summary><ul>{[...plan.guide.tips, ...plan.guide.cautions].map((item) => <li key={item}>{item}</li>)}</ul></details></section>

    {(def.kind === 'window' || profile.dietMode === 'keto' || profile.dietMode === 'egg') && <section className="diet-settings"><div className="diet-section-title"><h2>Fine-tune it.</h2></div>{def.kind === 'window' && <label>Eating window starts<select value={profile.eatingWindowStartHour} onChange={(e) => updateProfile({ eatingWindowStartHour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select></label>}{(profile.dietMode === 'keto' || profile.dietMode === 'egg') && <label>Daily net carb cap (g)<input type="number" min={5} max={200} value={profile.netCarbCapG} onChange={(e) => updateProfile({ netCarbCapG: Math.max(5, Math.min(200, Number(e.target.value) || 5)) })} /></label>}</section>}

    <details className="diet-body-details"><summary>Your body & target calculations</summary><div><span>BMI</span><strong>{plan.bmi.value} · {plan.bmi.category}</strong></div><div><span>BMI-based weight range</span><strong>{toDisplayWeight(plan.ideal.minKg, profile.units).toFixed(0)}–{toDisplayWeight(plan.ideal.maxKg, profile.units).toFixed(0)} {weightUnit(profile.units)}</strong></div><div><span>Carbs / fat targets</span><strong>{plan.macros.carbs}g / {plan.macros.fat}g</strong></div><p>These are estimates, not a diagnosis or a requirement to reach a particular weight.</p></details>
    <p className="diet-disclaimer">General guidance only. Restrictive diets or major calorie changes may not be suitable for everyone; discuss them with a qualified clinician if you have a medical condition.</p>
  </main></div>
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`
}
