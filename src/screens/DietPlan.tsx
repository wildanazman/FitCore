import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { SectionLabel } from '../components/ui'
import { dietDef, DIET_LIST, windowLengthHours, windowState } from '../lib/diet'
import { personalPlan } from '../lib/dietGuide'
import { toDisplayWeight, weightUnit } from '../lib/nutrition'

export function DietPlan() {
  const { profile, weightKg, updateProfile } = useApp()
  const nav = useNavigate()
  const plan = personalPlan(profile, weightKg)
  const def = dietDef(profile.dietMode)
  const unit = weightUnit(profile.units)
  const rec = plan.recommendation
  const recDef = dietDef(rec.mode)
  const onRecommended = rec.mode === profile.dietMode
  const [now, setNow] = useState(() => new Date())
  const windowNow = def.kind === 'window' ? windowState(profile.eatingWindowStartHour, profile.dietMode, now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) : null
  const countdown = windowNow ? formatCountdown(windowNow, now) : null

  useEffect(() => {
    if (def.kind !== 'window') return
    const timer = globalThis.setInterval(() => setNow(new Date()), 1000)
    return () => globalThis.clearInterval(timer)
  }, [def.kind])

  return (
    <div>
      <TopBar />
      <div className="px-margin-mobile pt-sm space-y-xl pb-md">
        <div className="flex items-center gap-sm">
          <button onClick={() => nav(-1)} className="text-on-surface-variant hover:text-on-surface p-1 -ml-1">
            <Icon name="arrow_back" />
          </button>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Your diet plan</h1>
        </div>

        <section className="relative overflow-hidden rounded-2xl bg-surface-container-high border border-outline-variant p-lg card-elev">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-md">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Icon name={def.icon} fill size={18} />
                <span className="font-label-caps text-label-caps uppercase">Active protocol</span>
              </div>
              <h2 className="font-display-hero text-display-hero text-on-surface mt-2">{def.label}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">{def.tagline}</p>
            </div>
            {windowNow && countdown && (
              <div className="text-right shrink-0">
                <span className={`font-label-caps text-label-caps uppercase ${windowNow.eating ? 'text-secondary' : 'text-primary'}`}>
                  {windowNow.eating ? 'Eating now' : 'Fasting'}
                </span>
                <div className="font-data-mono text-[28px] leading-none text-on-surface mt-2 tabular-nums">{countdown}</div>
                <p className="font-data-mono text-[11px] text-on-surface-variant mt-1">{windowNow.detail}</p>
              </div>
            )}
          </div>
          {windowNow && (
            <div className="relative mt-lg">
              <div className="flex justify-between font-data-mono text-[11px] text-on-surface-variant mb-2">
                <span>{formatHour(windowNow.startHour)}</span>
                <span>{formatHour(windowNow.endHour)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${windowNow.eating ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${Math.max(4, windowNow.pct * 100)}%` }} />
              </div>
              <p className="font-body-md text-[13px] text-on-surface-variant mt-2">
                {windowNow.eating ? `Keep your ${windowLengthHours(profile.dietMode)}-hour window focused and hit your target.` : `Your next eating window opens at ${formatHour(windowNow.startHour)}.`}
              </p>
            </div>
          )}
        </section>

        <ProtocolSettings profile={profile} updateProfile={updateProfile} />

        {/* Stats from weight/height/activity */}
        <section>
          <SectionLabel>Your numbers</SectionLabel>
          <div className="grid grid-cols-2 gap-md mt-md">
            <Stat label="BMI" value={String(plan.bmi.value)} sub={plan.bmi.category} tone={plan.bmi.tone} />
            <Stat
              label="Healthy range"
              value={`${toDisplayWeight(plan.ideal.minKg, profile.units).toFixed(0)}–${toDisplayWeight(plan.ideal.maxKg, profile.units).toFixed(0)}`}
              sub={unit}
            />
            <Stat label="Maintenance" value={`${plan.tdee}`} sub="kcal / day" />
            <Stat label="Your target" value={`${plan.target}`} sub="kcal / day" tone="good" />
          </div>
          <div className="grid grid-cols-4 gap-sm mt-md">
            <MiniMacro label="Protein" v={plan.macros.protein} color="text-secondary" />
            <MiniMacro label="Carbs" v={plan.macros.carbs} color="text-tertiary" />
            <MiniMacro label="Fat" v={plan.macros.fat} color="text-error" />
            <MiniMacro label="Water" v={Math.round(plan.waterMl / 100) / 10} color="text-primary" unit="L" />
          </div>
        </section>

        {/* Recommendation */}
        <section>
          <SectionLabel>Recommended for you</SectionLabel>
          <div className="bg-lime/10 border-l-2 border-lime rounded-r-[20px] p-md mt-md">
            <div className="flex items-center gap-sm mb-sm">
              <Icon name={recDef.icon} fill className="text-lime" />
              <span className="font-metric-md text-metric-md text-on-surface">{recDef.label}</span>
              {onRecommended && (
                <span className="ml-auto font-label-caps text-label-caps uppercase text-secondary flex items-center gap-1">
                  <Icon name="check_circle" size={14} fill /> Active
                </span>
              )}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">{rec.reason}</p>
            {!onRecommended && (
              <button
                onClick={() => updateProfile({ dietMode: rec.mode })}
                className="mt-md bg-lime text-on-lime font-metric-md text-metric-md py-2 px-lg rounded-full active:scale-95 transition flex items-center gap-2"
              >
                Switch to {recDef.label} <Icon name="arrow_forward" size={18} />
              </button>
            )}
          </div>
        </section>

        {/* Switch mode */}
        <section>
          <SectionLabel>Switch protocol</SectionLabel>
          <div className="flex gap-sm overflow-x-auto no-scrollbar mt-md pb-1">
            {DIET_LIST.map((d) => {
              const on = d.id === profile.dietMode
              return (
                <button
                  key={d.id}
                  onClick={() => updateProfile({ dietMode: d.id })}
                  className={`shrink-0 flex items-center gap-2 px-md py-sm rounded-full border transition ${
                    on ? 'bg-lime text-on-lime border-transparent' : 'bg-transparent text-on-surface-variant border-outline-variant'
                  }`}
                >
                  <Icon name={d.icon} size={18} fill={on} />
                  {d.short}
                </button>
              )
            })}
          </div>
        </section>

        {/* Detailed guide for active mode */}
        <section>
          <div className="flex items-center gap-sm mb-sm">
            <Icon name={def.icon} fill className="text-primary" />
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{def.label}</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mb-lg">{plan.guide.headline}</p>

          <GuideBlock icon="menu_book" title="How it works" items={plan.guide.howItWorks} />
          <div className="grid grid-cols-1 gap-md mt-md">
            <ListCard icon="check_circle" tone="secondary" title="Eat" items={plan.guide.eat} />
            <ListCard icon="block" tone="error" title="Avoid" items={plan.guide.avoid} />
          </div>
          <GuideBlock icon="tips_and_updates" title="Tips" items={plan.guide.tips} />
          <GuideBlock icon="warning" title="Cautions" items={plan.guide.cautions} tone="tertiary" />
        </section>

        {/* Sample day scaled to target */}
        <section>
          <SectionLabel>Sample day · ~{plan.target} kcal</SectionLabel>
          <div className="space-y-sm mt-md">
            {plan.scaledDay.map((meal) => (
              <div key={meal.name} className="bg-tile border border-tile-border rounded-xl p-md">
                <div className="flex justify-between items-baseline">
                  <span className="font-metric-md text-metric-md text-on-surface">{meal.name}</span>
                  <span className="font-data-mono text-data-mono text-on-surface">{meal.kcal} kcal</span>
                </div>
                <p className="font-body-md text-[14px] text-on-surface-variant mt-1">{meal.items}</p>
                <p className="font-data-mono text-[12px] text-on-surface-variant mt-1">
                  <span className="text-secondary">{meal.protein}g P</span> · <span className="text-tertiary">{meal.carbs}g C</span> · <span className="text-error">{meal.fat}g F</span>
                </p>
              </div>
            ))}
            <div className="flex justify-between px-md py-2 font-data-mono text-data-mono">
              <span className="text-on-surface-variant">Day total</span>
              <span className="text-on-surface">
                {plan.scaledTotal.kcal} kcal · {plan.scaledTotal.protein}P {plan.scaledTotal.carbs}C {plan.scaledTotal.fat}F
              </span>
            </div>
          </div>
        </section>

        <button
          onClick={() => nav('/food')}
          className="w-full bg-lime text-on-lime font-metric-md text-metric-md py-3 rounded-full active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Icon name="restaurant" /> Start logging today
        </button>
        <p className="text-center font-data-mono text-[11px] text-on-surface-variant">
          Guidance is general, not medical advice. Check with a clinician before big diet changes.
        </p>
      </div>
    </div>
  )
}

function ProtocolSettings({ profile, updateProfile }: { profile: ReturnType<typeof useApp>['profile']; updateProfile: ReturnType<typeof useApp>['updateProfile'] }) {
  const isWindow = profile.dietMode === 'omad' || profile.dietMode === '16:8'
  const isLowCarb = profile.dietMode === 'keto' || profile.dietMode === 'egg'
  if (!isWindow && !isLowCarb) return null

  return (
    <section className="bg-tile border border-tile-border rounded-xl p-md">
      <div className="flex items-center justify-between gap-md">
        <div>
          <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Personalise your plan</p>
          <p className="font-metric-md text-metric-md text-on-surface mt-1">Make the protocol fit your day</p>
        </div>
        <Icon name="tune" className="text-primary" />
      </div>
      <div className="grid grid-cols-2 gap-md mt-md">
        {isWindow && (
          <label className="block">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Eating starts</span>
            <select
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-high px-sm py-2 text-on-surface outline-none focus:border-primary"
              value={profile.eatingWindowStartHour}
              onChange={(e) => updateProfile({ eatingWindowStartHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
            </select>
          </label>
        )}
        {isLowCarb && (
          <label className="block">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Daily net carb cap</span>
            <div className="relative mt-2">
              <input
                type="number"
                min={5}
                max={200}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-high px-sm py-2 pr-10 text-on-surface outline-none focus:border-primary"
                value={profile.netCarbCapG}
                onChange={(e) => updateProfile({ netCarbCapG: Math.max(5, Math.min(200, Number(e.target.value) || 5)) })}
              />
              <span className="absolute right-3 top-2 text-on-surface-variant">g</span>
            </div>
          </label>
        )}
      </div>
      <p className="font-body-md text-[12px] text-on-surface-variant mt-md">
        {profile.dietMode === 'omad' ? 'Default is a 1-hour window. Choose the meal time that works best for you.' : profile.dietMode === '16:8' ? 'Default is an 8-hour eating window. Move it around your training and sleep.' : profile.dietMode === 'keto' ? 'Lower the cap for stricter keto, or raise it to make training fuel more flexible.' : 'Egg mode uses this cap as a guardrail for the rest of your meals.'}
      </p>
    </section>
  )
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  return `${h % 12 || 12}:${String(0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function formatCountdown(state: { eating: boolean; startHour: number; endHour: number }, now: Date): string {
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const startSeconds = state.startHour * 3600
  let endSeconds = state.endHour * 3600
  if (endSeconds <= startSeconds) endSeconds += 24 * 3600
  let current = nowSeconds
  if (current < startSeconds) current += 24 * 3600
  let remaining = state.eating ? endSeconds - current : startSeconds - current
  if (!state.eating && remaining <= 0) remaining += 24 * 3600
  remaining = Math.max(0, remaining)
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'good' | 'warn' | 'tertiary' | 'error' }) {
  const color = tone === 'good' ? 'text-secondary' : tone === 'warn' ? 'text-tertiary' : tone === 'error' ? 'text-error' : tone === 'tertiary' ? 'text-tertiary' : 'text-on-surface'
  return (
    <div className="bg-tile border border-tile-border rounded-xl p-md">
      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{label}</span>
      <div className={`font-display-hero text-headline-lg mt-1 leading-none ${color}`}>{value}</div>
      <span className="font-data-mono text-[11px] text-on-surface-variant">{sub}</span>
    </div>
  )
}

function MiniMacro({ label, v, color, unit = 'g' }: { label: string; v: number; color: string; unit?: string }) {
  return (
    <div className="bg-tile border border-tile-border rounded-lg p-sm text-center">
      <div className={`font-data-mono text-metric-md ${color}`}>{v}{unit}</div>
      <div className="font-label-caps text-[10px] uppercase text-on-surface-variant mt-0.5">{label}</div>
    </div>
  )
}

function GuideBlock({ icon, title, items, tone }: { icon: string; title: string; items: string[]; tone?: 'tertiary' }) {
  const c = tone === 'tertiary' ? 'text-tertiary' : 'text-primary'
  return (
    <div className="mt-md">
      <div className="flex items-center gap-2 mb-sm">
        <Icon name={icon} size={18} className={c} />
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="font-body-md text-[14px] text-on-surface-variant flex gap-2">
            <span className={c}>•</span>
            <span className="text-on-surface">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ListCard({ icon, tone, title, items }: { icon: string; tone: 'secondary' | 'error'; title: string; items: string[] }) {
  const border = tone === 'secondary' ? 'border-secondary' : 'border-error'
  const text = tone === 'secondary' ? 'text-secondary' : 'text-error'
  return (
    <div className={`bg-tile border-l-2 ${border} border-y border-r border-y-tile-border border-r-tile-border rounded-r-xl p-md`}>
      <div className={`flex items-center gap-2 mb-sm ${text}`}>
        <Icon name={icon} size={18} fill />
        <span className="font-label-caps text-label-caps uppercase">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span key={i} className="bg-surface-container-high rounded-full px-sm py-1 font-body-md text-[13px] text-on-surface">{it}</span>
        ))}
      </div>
    </div>
  )
}
