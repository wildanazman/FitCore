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
  const heroMetric = countdown ?? (profile.dietMode === 'keto' ? `${profile.netCarbCapG}g` : profile.dietMode === 'egg' ? `${plan.macros.protein}g` : `${plan.target}`)
  const heroMetricLabel = windowNow
    ? windowNow.eating ? 'Until fasting starts' : 'Until your window opens'
    : profile.dietMode === 'keto' ? 'Daily net carb cap' : profile.dietMode === 'egg' ? 'Daily protein target' : 'Daily calorie target'

  useEffect(() => {
    if (def.kind !== 'window') return
    const timer = globalThis.setInterval(() => setNow(new Date()), 1000)
    return () => globalThis.clearInterval(timer)
  }, [def.kind])

  return (
    <div>
      <TopBar />
      <div className="px-margin-mobile pt-sm space-y-xl pb-lg">
        <div className="flex items-center gap-sm">
          <button
            onClick={() => nav(-1)}
            aria-label="Go back"
            className="-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-full text-on-surface-variant transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Your diet plan</h1>
        </div>

        <section className="diet-hero relative overflow-hidden rounded-2xl p-lg">
          <div className="relative flex items-center justify-between gap-md">
            <div className="flex min-w-0 items-center gap-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime text-on-lime shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                <Icon name={def.icon} fill size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-body-md text-[14px] font-semibold text-lime">Active protocol</p>
                <h2 className="truncate font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{def.label}</h2>
              </div>
            </div>
            {windowNow && (
              <span className={`shrink-0 rounded-full px-3 py-1.5 font-data-mono text-[12px] ${windowNow.eating ? 'bg-secondary/15 text-secondary' : 'bg-lime/15 text-lime'}`}>
                {windowNow.eating ? 'Eating now' : 'Fasting'}
              </span>
            )}
          </div>
          <div className="relative mt-lg border-t border-white/10 pt-lg">
            <p className="font-body-md text-[14px] text-on-surface-variant">{heroMetricLabel}</p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-md gap-y-sm">
              <div className="font-data-mono text-[36px] font-semibold leading-none tracking-[-0.03em] text-on-surface tabular-nums">{heroMetric}</div>
              <p className="max-w-[190px] text-right font-body-md text-[14px] leading-5 text-on-surface-variant">{def.tagline}</p>
            </div>
          </div>
          {windowNow && (
            <div className="relative mt-lg">
              <div className="mb-2 flex justify-between font-data-mono text-[12px] text-on-surface-variant">
                <span>{formatHour(windowNow.startHour)}</span>
                <span>{formatHour(windowNow.endHour)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-label={`${windowNow.phase} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(windowNow.pct * 100)}>
                <div className={`h-full rounded-full transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${windowNow.eating ? 'bg-secondary' : 'bg-lime'}`} style={{ width: `${Math.max(4, windowNow.pct * 100)}%` }} />
              </div>
              <p className="mt-2 font-body-md text-[14px] leading-5 text-on-surface-variant">
                {windowNow.eating ? `Keep your ${windowLengthHours(profile.dietMode)}-hour window focused and hit your target.` : `Your next eating window opens at ${formatHour(windowNow.startHour)}.`}
              </p>
            </div>
          )}
        </section>

        <ProtocolSettings profile={profile} updateProfile={updateProfile} />

        {/* Stats from weight/height/activity */}
        <section>
          <SectionLabel>Your numbers</SectionLabel>
          <div className="mt-md grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-tile-border ring-1 ring-tile-border">
            <Stat label="BMI" value={String(plan.bmi.value)} sub={plan.bmi.category} tone={plan.bmi.tone} />
            <Stat
              label="Healthy range"
              value={`${toDisplayWeight(plan.ideal.minKg, profile.units).toFixed(0)}–${toDisplayWeight(plan.ideal.maxKg, profile.units).toFixed(0)}`}
              sub={unit}
            />
            <Stat label="Maintenance" value={`${plan.tdee}`} sub="kcal / day" />
            <Stat label="Your target" value={`${plan.target}`} sub="kcal / day" tone="good" />
          </div>
          <div className="mt-sm grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-tile-border ring-1 ring-tile-border">
            <MiniMacro label="Protein" v={plan.macros.protein} color="text-secondary" />
            <MiniMacro label="Carbs" v={plan.macros.carbs} color="text-tertiary" />
            <MiniMacro label="Fat" v={plan.macros.fat} color="text-error" />
            <MiniMacro label="Water" v={Math.round(plan.waterMl / 100) / 10} color="text-primary" unit="L" />
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
          <div className="mt-md grid grid-cols-1 gap-sm">
            <ListCard icon="check_circle" tone="secondary" title="Eat" items={plan.guide.eat} />
            <ListCard icon="block" tone="error" title="Avoid" items={plan.guide.avoid} />
          </div>
          <GuideBlock icon="tips_and_updates" title="Tips" items={plan.guide.tips} />
          <GuideBlock icon="warning" title="Cautions" items={plan.guide.cautions} tone="tertiary" />
        </section>

        {/* Sample day scaled to target */}
        <section>
          <SectionLabel>Sample day · ~{plan.target} kcal</SectionLabel>
          <div className="mt-md overflow-hidden rounded-2xl bg-tile ring-1 ring-tile-border">
            {plan.scaledDay.map((meal) => (
              <div key={meal.name} className="border-b border-tile-border p-md last:border-b-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-metric-md text-metric-md text-on-surface">{meal.name}</span>
                  <span className="font-data-mono text-data-mono text-on-surface">{meal.kcal} kcal</span>
                </div>
                <p className="font-body-md text-[14px] text-on-surface-variant mt-1">{meal.items}</p>
                <p className="mt-1 font-data-mono text-[12px] text-on-surface-variant">
                  <span className="text-secondary">{meal.protein}g P</span> · <span className="text-tertiary">{meal.carbs}g C</span> · <span className="text-error">{meal.fat}g F</span>
                </p>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2 bg-surface-container-high px-md py-3 font-data-mono text-[12px]">
              <span className="text-on-surface-variant">Day total</span>
              <span className="text-on-surface">
                {plan.scaledTotal.kcal} kcal · {plan.scaledTotal.protein}P {plan.scaledTotal.carbs}C {plan.scaledTotal.fat}F
              </span>
            </div>
          </div>
        </section>

        {/* Decision support comes after the full plan, so the user can choose with context. */}
        <section>
          <SectionLabel>Recommended for you</SectionLabel>
          <div className="mt-md rounded-2xl bg-lime/10 p-md ring-1 ring-lime/25">
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
                className="mt-md flex min-h-11 items-center gap-2 rounded-full bg-lime px-lg py-2 font-metric-md text-metric-md text-on-lime transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none"
              >
                Switch to {recDef.label} <Icon name="arrow_forward" size={18} />
              </button>
            )}
          </div>
        </section>

        <section>
          <SectionLabel>Switch protocol</SectionLabel>
          <div className="flex gap-sm overflow-x-auto no-scrollbar mt-md pb-1">
            {DIET_LIST.map((d) => {
              const on = d.id === profile.dietMode
              return (
                <button
                  key={d.id}
                  onClick={() => updateProfile({ dietMode: d.id })}
                  aria-current={on ? 'true' : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-md py-sm transition-[color,background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none ${
                    on ? 'bg-lime text-on-lime shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]' : 'bg-surface-container text-on-surface-variant ring-1 ring-outline-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon name={d.icon} size={18} fill={on} />
                  {d.short}
                </button>
              )
            })}
          </div>
        </section>

        <button
          onClick={() => nav('/food')}
          className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-lime px-5 py-3 font-metric-md text-metric-md text-on-lime transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime active:scale-[0.97] motion-reduce:transition-none"
        >
          <span>Start logging today</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-on-lime/10">
            <Icon name="arrow_forward" size={18} />
          </span>
        </button>
        <p className="text-center font-body-md text-[12px] leading-5 text-on-surface-variant">
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
    <section className="rounded-2xl bg-tile p-md ring-1 ring-tile-border">
      <div className="flex items-center justify-between gap-md">
        <div>
          <p className="font-body-md text-[14px] font-semibold text-lime">Protocol settings</p>
          <p className="mt-0.5 font-metric-md text-metric-md text-on-surface">Make it fit your day</p>
        </div>
        <Icon name="tune" className="text-primary" />
      </div>
      <div className="mt-md">
        {isWindow && (
          <label className="block" htmlFor="eating-window-start">
            <span className="font-body-md text-[14px] text-on-surface-variant">Eating window starts</span>
            <select
              id="eating-window-start"
              className="mt-2 min-h-12 w-full rounded-xl bg-surface-container-high px-md py-2 text-on-surface ring-1 ring-outline-variant outline-none transition-[box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus:bg-surface-container-highest focus:ring-2 focus:ring-lime motion-reduce:transition-none"
              value={profile.eatingWindowStartHour}
              onChange={(e) => updateProfile({ eatingWindowStartHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
            </select>
          </label>
        )}
        {isLowCarb && (
          <label className="block" htmlFor="net-carb-cap">
            <span className="font-body-md text-[14px] text-on-surface-variant">Daily net carb cap</span>
            <div className="relative mt-2">
              <input
                id="net-carb-cap"
                type="number"
                min={5}
                max={200}
                className="min-h-12 w-full rounded-xl bg-surface-container-high px-md py-2 pr-10 text-on-surface ring-1 ring-outline-variant outline-none transition-[box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus:bg-surface-container-highest focus:ring-2 focus:ring-lime motion-reduce:transition-none"
                value={profile.netCarbCapG}
                onChange={(e) => updateProfile({ netCarbCapG: Math.max(5, Math.min(200, Number(e.target.value) || 5)) })}
              />
              <span className="pointer-events-none absolute right-4 top-3 text-on-surface-variant">g</span>
            </div>
          </label>
        )}
      </div>
      <p className="mt-md max-w-[62ch] font-body-md text-[14px] leading-5 text-on-surface-variant">
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
    <div className="bg-tile p-md">
      <span className="font-body-md text-[13px] text-on-surface-variant">{label}</span>
      <div className={`mt-2 font-data-mono text-[24px] font-semibold leading-none tabular-nums ${color}`}>{value}</div>
      <span className="mt-1 block font-body-md text-[12px] text-on-surface-variant">{sub}</span>
    </div>
  )
}

function MiniMacro({ label, v, color, unit = 'g' }: { label: string; v: number; color: string; unit?: string }) {
  return (
    <div className="bg-tile px-1 py-sm text-center">
      <div className={`font-data-mono text-metric-md ${color}`}>{v}{unit}</div>
      <div className="mt-0.5 font-body-md text-[12px] text-on-surface-variant">{label}</div>
    </div>
  )
}

function GuideBlock({ icon, title, items, tone }: { icon: string; title: string; items: string[]; tone?: 'tertiary' }) {
  const c = tone === 'tertiary' ? 'text-tertiary' : 'text-primary'
  return (
    <div className="mt-md">
      <div className="flex items-center gap-2 mb-sm">
        <Icon name={icon} size={18} className={c} />
        <span className="font-body-md text-[14px] font-semibold text-on-surface-variant">{title}</span>
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
  const text = tone === 'secondary' ? 'text-secondary' : 'text-error'
  const surface = tone === 'secondary' ? 'bg-secondary/5 ring-secondary/20' : 'bg-error/5 ring-error/20'
  return (
    <div className={`rounded-xl p-md ring-1 ${surface}`}>
      <div className={`flex items-center gap-2 mb-sm ${text}`}>
        <Icon name={icon} size={18} fill />
        <span className="font-body-md text-[14px] font-semibold">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span key={i} className="rounded-full bg-surface-container-high px-sm py-1.5 font-body-md text-[13px] text-on-surface">{it}</span>
        ))}
      </div>
    </div>
  )
}
