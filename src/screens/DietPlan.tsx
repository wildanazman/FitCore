import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { SectionLabel } from '../components/ui'
import { dietDef, DIET_LIST } from '../lib/diet'
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
          <SectionLabel>Active protocol</SectionLabel>
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
