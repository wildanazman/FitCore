import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Icon } from './Icon'
import { todayISO } from '../lib/date'
import {
  dietDef,
  eggsOn,
  mealsOn,
  netCarbsOn,
  nowMinutes,
  windowState,
} from '../lib/diet'

/** Dashboard card that reflects the active eating protocol. Null for standard. */
export function DietCard({ compact = false }: { compact?: boolean }) {
  const { profile, state } = useApp()
  const nav = useNavigate()
  const mode = profile.dietMode
  const def = dietDef(mode)
  const today = todayISO()

  // Standard mode: no live metric — offer the personalized plan instead.
  if (def.kind === 'none') {
    return (
      <button
        onClick={() => nav('/diet')}
        className="w-full bg-tile border border-tile-border rounded-xl p-md flex items-center gap-md text-left hover:border-primary/50 transition-colors active:scale-[0.99]"
      >
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          <Icon name="nutrition" fill size={18} className="text-on-primary-container" />
        </div>
        <div className="flex-1">
          <p className="font-metric-md text-metric-md text-on-surface leading-none">Your diet plan</p>
          <p className="font-data-mono text-[11px] text-on-surface-variant">Personalized targets & guidance</p>
        </div>
        <Icon name="chevron_right" className="text-on-surface-variant" />
      </button>
    )
  }

  if (def.kind === 'window') {
    const w = windowState(profile.eatingWindowStartHour, mode, nowMinutes())
    const ringColor = w.eating ? '#44e2cd' : '#c5c0ff'
    const meals = mealsOn(state.foods, today)
    return (
      <Shell icon={def.icon} title={def.label} tagline={def.tagline} onClick={() => nav('/diet')}>
        <div className="flex items-center gap-md">
          <Ring pct={w.pct} color={ringColor} label={w.eating ? 'EAT' : 'FAST'} />
          <div className="flex-1">
            <p className={`font-metric-md text-metric-md ${w.eating ? 'text-secondary' : 'text-primary'}`}>{w.phase}</p>
            <p className="font-data-mono text-data-mono text-on-surface-variant">{w.detail}</p>
            {!compact && (
              <p className="font-data-mono text-[11px] text-on-surface-variant mt-1">
                Window {fmtHour(w.startHour)}–{fmtHour(w.endHour)} · {meals} meal{meals === 1 ? '' : 's'} today
              </p>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  if (def.kind === 'carb') {
    const carbs = netCarbsOn(state.foods, today)
    const cap = profile.netCarbCapG
    const over = carbs > cap
    const pct = Math.min(100, (carbs / Math.max(1, cap)) * 100)
    return (
      <Shell icon={def.icon} title={def.label} tagline={def.tagline} onClick={() => nav('/diet')}>
        <div className="flex items-baseline justify-between">
          <div>
            <span className={`font-display-hero text-display-hero ${over ? 'text-error' : 'text-on-surface'}`}>{carbs}</span>
            <span className="font-metric-md text-metric-md text-on-surface-variant"> / {cap}g net carbs</span>
          </div>
          <span className={`font-data-mono text-data-mono ${over ? 'text-error' : 'text-secondary'}`}>
            {over ? `+${carbs - cap}g over` : `${cap - carbs}g left`}
          </span>
        </div>
        <div className="w-full h-2 bg-surface-container-high rounded-full mt-sm overflow-hidden">
          <div className={`h-full rounded-full ${over ? 'bg-error' : 'bg-secondary'}`} style={{ width: `${pct}%` }} />
        </div>
      </Shell>
    )
  }

  // food (egg diet)
  const eggs = eggsOn(state.foods, today)
  return (
    <Shell icon={def.icon} title={def.label} tagline={def.tagline} onClick={() => nav('/diet')}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-display-hero text-display-hero text-on-surface">{eggs}</span>
          <span className="font-metric-md text-metric-md text-on-surface-variant"> egg{eggs === 1 ? '' : 's'} today</span>
        </div>
        <Icon name="egg" fill className="text-tertiary" size={32} />
      </div>
    </Shell>
  )
}

function Shell({ icon, title, tagline, children, onClick }: { icon: string; title: string; tagline: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <section className="bg-tile border border-tile-border rounded-xl p-md">
      <button onClick={onClick} className="w-full flex items-center gap-sm mb-md text-left active:scale-[0.99] transition">
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          <Icon name={icon} fill size={18} className="text-on-primary-container" />
        </div>
        <div className="flex-1">
          <p className="font-metric-md text-metric-md text-on-surface leading-none">{title}</p>
          <p className="font-data-mono text-[11px] text-on-surface-variant">{tagline}</p>
        </div>
        <Icon name="chevron_right" className="text-on-surface-variant" size={20} />
      </button>
      {children}
    </section>
  )
}

function Ring({ pct, color, label }: { pct: number; color: string; label: string }) {
  const size = 64
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, pct)))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2a2c" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-label-caps text-label-caps"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

function fmtHour(h: number): string {
  const hr = ((h % 24) + 24) % 24
  const ap = hr >= 12 ? 'pm' : 'am'
  const h12 = hr % 12 || 12
  return `${h12}${ap}`
}
