import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { DietCard } from '../components/DietCard'
import { Icon } from '../components/Icon'
import { Rings } from '../components/Decor'
import { CountUp, Press, Reveal, listContainer, spring } from '../components/motion'
import { addDays, mondayIndex, startOfWeek, todayISO } from '../lib/date'
import { dayFuel, tdee } from '../lib/nutrition'
import type { PlanSession, SessionType } from '../types'

type Filter = 'all' | 'run' | 'strength' | 'sport'

export function Home() {
  const { state, profile, weightKg, toggleSession } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const [filter, setFilter] = useState<Filter>('all')

  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
  const maintenance = tdee(profile, weightKg)
  const targetLabel = profile.goal === 'lose' ? 'Deficit target' : profile.goal === 'gain' ? 'Surplus target' : 'Maintenance target'
  const todaySessions = state.sessions.filter((s) => s.date === today)
  const burned = todaySessions.filter((s) => s.completed).reduce((a, s) => a + s.kcal, 0)
  const kmToday = todaySessions
    .filter((s) => s.type === 'run' && s.completed)
    .reduce((a, s) => a + (s.distanceKm ?? 0), 0)
  const calPct = fuel.budget ? Math.min(100, Math.round((fuel.consumed / fuel.budget) * 100)) : 0
  const hero = todaySessions.find((s) => !s.completed && s.type !== 'rest') ?? todaySessions[0] ?? null
  const filtered = filter === 'all' ? todaySessions : todaySessions.filter((s) => s.type === filter)
  const firstName = (profile.name || 'Athlete').split(' ')[0]

  return (
    <motion.div variants={listContainer} className="px-margin-mobile pt-lg space-y-lg">
      {/* Header */}
      <Reveal>
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            {/* Gradient-ringed avatar */}
            <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-lime via-lilac to-violet shrink-0">
              <div className="w-full h-full rounded-full bg-ink flex items-center justify-center font-display-hero text-metric-md text-on-surface">
                {firstName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <p className="font-body-md text-[12px] text-on-surface-variant leading-none">{greeting()},</p>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface leading-tight">
                {firstName}
              </h1>
            </div>
          </div>
          <Press
            onClick={() => nav('/settings')}
            className="relative w-11 h-11 rounded-full bg-ink-card border border-white/10 flex items-center justify-center text-on-surface glow-soft"
          >
            <Icon name="notifications" size={20} />
            <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-lime border border-ink" />
          </Press>
        </header>
      </Reveal>

      {/* Hero progress card */}
      <Reveal>
        <Press
          as="div"
          onClick={() => nav('/train')}
          className="block w-full text-left rounded-[28px] bg-gradient-to-br from-lime to-lime-dim text-on-lime p-lg relative overflow-hidden glow-lime cursor-pointer"
        >
          <Rings size={210} className="absolute -right-12 -top-14 text-on-lime opacity-[0.12]" />
          <div className="relative flex justify-between items-start gap-md">
            <div className="min-w-0">
              <p className="font-label-caps text-label-caps uppercase opacity-60 tracking-widest">Today's focus</p>
              <h2 className="font-display-hero text-headline-lg mt-1 leading-tight truncate">
                {hero ? hero.title : 'Rest day'}
              </h2>
              <p className="font-data-mono text-[13px] opacity-75 mt-1 truncate">
                {hero ? hero.detail : 'Recover & refuel'}
              </p>
            </div>
            <ProgressBadge pct={calPct} />
          </div>
          <div className="relative mt-lg flex items-center justify-between">
            <div className="inline-flex items-center gap-2 bg-on-lime text-lime rounded-full pl-md pr-1.5 py-1.5">
              <span className="font-display-hero text-metric-md">
                <CountUp value={fuel.consumed} />
              </span>
              <span className="font-label-caps text-label-caps uppercase opacity-80">kcal in</span>
              <span className="w-8 h-8 rounded-full bg-lime text-on-lime flex items-center justify-center">
                <Icon name="arrow_outward" size={16} />
              </span>
            </div>
            {burned > 0 && (
              <span className="font-data-mono text-[12px] opacity-70 flex items-center gap-1">
                <Icon name="local_fire_department" size={15} fill /> {burned} burned
              </span>
            )}
          </div>
        </Press>
      </Reveal>

      {/* Week strip */}
      <Reveal>
        <WeekStrip today={today} sessions={state.sessions} />
      </Reveal>

      {/* Stat cards */}
      <Reveal>
        <div className="grid grid-cols-2 gap-md">
          <StatCard
            gradient="bg-gradient-to-br from-lilac to-lilac-deep"
            fg="text-on-lilac"
            icon="directions_run"
            label="Distance"
            value={<CountUp value={kmToday} format={(n) => n.toFixed(1)} />}
            unit="km"
            sub="logged today"
            onClick={() => nav('/train')}
          />
          <StatCard
            gradient="bg-gradient-to-br from-pink to-pink-deep"
            fg="text-on-pink"
            icon="target"
            label={targetLabel}
            value={<CountUp value={fuel.budget} />}
            unit="kcal"
            sub={`${Math.max(0, fuel.remaining)} kcal left`}
            onClick={() => nav('/food')}
          />
        </div>
      </Reveal>

      {/* Energy donut */}
      <Reveal>
        <ActivityCard target={fuel.budget} targetLabel={targetLabel} maintenance={maintenance} eaten={fuel.consumed} burned={burned} remaining={Math.max(0, fuel.remaining)} />
      </Reveal>

      {/* Diet plan card */}
      <Reveal>
        <DietCard />
      </Reveal>

      {/* Plan with filter pills */}
      <Reveal>
        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Your plan</h3>
            <Press onClick={() => nav('/train')} className="text-lime font-data-mono text-[12px] flex items-center gap-1">
              All <Icon name="chevron_right" size={16} />
            </Press>
          </div>
          <div className="flex gap-sm overflow-x-auto no-scrollbar">
            {([['all', 'All'], ['run', 'Cardio'], ['strength', 'Strength'], ['sport', 'Sport']] as const).map(([id, label]) => (
              <FilterPill key={id} active={filter === id} label={label} onClick={() => setFilter(id)} />
            ))}
          </div>
          <div className="space-y-sm">
            {filtered.length === 0 ? (
              <div className="rounded-[24px] bg-ink-card border border-white/5 p-md flex items-center gap-md glow-soft">
                <div className="w-11 h-11 rounded-full bg-lilac/15 flex items-center justify-center">
                  <Icon name="self_improvement" className="text-lilac" />
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">Nothing here today. Recover well.</p>
              </div>
            ) : (
              filtered.map((s, i) => <PlanCard key={s.id} session={s} index={i} onToggle={() => toggleSession(s.id)} />)
            )}
          </div>
        </div>
      </Reveal>
    </motion.div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function ProgressBadge({ pct }: { pct: number }) {
  const size = 58
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(20,26,5,0.15)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#141a05"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display-hero text-[15px]">{pct}%</span>
    </div>
  )
}

function WeekStrip({ today, sessions }: { today: string; sessions: PlanSession[] }) {
  const start = startOfWeek(today)
  const idx = mondayIndex(today)
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="rounded-[24px] bg-ink-card border border-white/5 px-md py-sm flex justify-between glow-soft">
      {letters.map((l, i) => {
        const date = addDays(start, i)
        const dayNum = Number(date.slice(-2))
        const active = i === idx
        const dayDone = sessions.some((s) => s.date === date && s.completed)
        const dayPlanned = sessions.some((s) => s.date === date && s.type !== 'rest')
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 py-1">
            <span className={`font-label-caps text-label-caps ${active ? 'text-lime' : 'text-on-surface-variant'}`}>{l}</span>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-metric-md text-[14px] transition-colors ${
                active ? 'bg-lime text-on-lime shadow-[0_6px_16px_rgba(201,242,78,0.35)]' : 'text-on-surface-variant'
              }`}
            >
              {dayNum}
            </div>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dayDone ? 'bg-lime' : dayPlanned ? 'bg-white/15' : 'bg-transparent'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

function StatCard({
  gradient,
  fg,
  icon,
  label,
  value,
  unit,
  sub,
  onClick,
}: {
  gradient: string
  fg: string
  icon: string
  label: string
  value: React.ReactNode
  unit: string
  sub: string
  onClick: () => void
}) {
  return (
    <Press
      as="div"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[24px] ${gradient} ${fg} p-md flex flex-col justify-between min-h-[132px] cursor-pointer glow-soft`}
    >
      <Rings size={120} className="absolute -right-8 -bottom-10 opacity-[0.14]" />
      <div className="relative flex items-center justify-between">
        <span className="font-metric-md text-[15px]">{label}</span>
        <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
          <Icon name={icon} size={17} />
        </span>
      </div>
      <div className="relative">
        <div className="font-display-hero text-display-hero leading-none">
          {value}
          <span className="text-metric-md opacity-70"> {unit}</span>
        </div>
        <span className="font-data-mono text-[11px] opacity-70">{sub}</span>
      </div>
    </Press>
  )
}

function ActivityCard({ target, targetLabel, maintenance, eaten, burned, remaining }: { target: number; targetLabel: string; maintenance: number; eaten: number; burned: number; remaining: number }) {
  const rows = [
    { label: targetLabel, value: target, color: '#c8c4d5' },
    { label: 'Eaten', value: eaten, color: '#c9f24e' },
    { label: 'Burned', value: burned, color: '#7c6cf0' },
    { label: 'Remaining', value: remaining, color: '#f0b8db' },
  ]
  return (
    <div className="rounded-[28px] bg-ink-card border border-white/5 p-lg glow-soft">
      <div className="flex items-center justify-between mb-md">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-widest">Energy today</span>
        <span className="font-data-mono text-[10px] text-on-surface-variant">Maintenance {maintenance} kcal</span>
      </div>
      <div className="flex items-center justify-between gap-md">
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <div className="leading-tight">
                <span className="font-display-hero text-metric-md text-on-surface block">
                  <CountUp value={r.value} />
                </span>
                <span className="font-data-mono text-[10px] text-on-surface-variant uppercase">{r.label}</span>
              </div>
            </div>
          ))}
        </div>
        <ActivityDonut eaten={eaten} burned={burned} remaining={remaining} />
      </div>
    </div>
  )
}

function ActivityDonut({ eaten, burned, remaining }: { eaten: number; burned: number; remaining: number }) {
  const size = 136
  const stroke = 15
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const total = Math.max(1, eaten + burned + remaining)
  const segs = [
    { v: eaten, color: '#c9f24e' },
    { v: burned, color: '#7c6cf0' },
    { v: remaining, color: '#f0b8db' },
  ]
  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {segs.map((s, i) => {
          const frac = s.v / total
          const dash = Math.max(0, frac * circ - 4) // small gap between segments
          const offset = acc
          acc += frac * circ
          if (dash <= 0) return null
          return (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
              initial={{ strokeDashoffset: circ, opacity: 0 }}
              animate={{ strokeDashoffset: -offset, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] }}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display-hero text-headline-lg-mobile text-on-surface leading-none">
          <CountUp value={remaining} />
        </span>
        <span className="font-label-caps text-[9px] uppercase text-on-surface-variant tracking-widest mt-0.5">left</span>
      </div>
    </div>
  )
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative shrink-0 px-md py-sm rounded-full">
      {active && <motion.span layoutId="home-filter" transition={spring} className="absolute inset-0 rounded-full bg-on-surface" />}
      <span className={`relative z-10 font-body-md text-[13px] ${active ? 'text-ink' : 'text-on-surface-variant'}`}>{label}</span>
    </button>
  )
}

const PASTELS: Record<SessionType, { bg: string; fg: string }> = {
  run: { bg: 'bg-gradient-to-br from-lilac to-lilac-deep', fg: 'text-on-lilac' },
  strength: { bg: 'bg-gradient-to-br from-pink to-pink-deep', fg: 'text-on-pink' },
  sport: { bg: 'bg-gradient-to-br from-lime to-lime-dim', fg: 'text-on-lime' },
  rest: { bg: 'bg-ink-card', fg: 'text-on-surface' },
}

function PlanCard({ session: s, index, onToggle }: { session: PlanSession; index: number; onToggle: () => void }) {
  const pastel = PASTELS[s.type]
  const done = s.completed
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ...spring }}
    >
      <Press
        as="div"
        onClick={onToggle}
        className={`relative overflow-hidden rounded-[24px] p-md flex items-center justify-between cursor-pointer ${
          done ? 'bg-ink-card border border-white/5' : `${pastel.bg} ${pastel.fg} glow-soft`
        }`}
      >
        {!done && <Rings size={110} className="absolute -right-7 -top-9 opacity-[0.1]" />}
        <div className="relative flex items-center gap-md min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-secondary/20 text-secondary' : 'bg-black/10'}`}>
            <Icon name={done ? 'check' : s.icon} fill />
          </div>
          <div className="min-w-0">
            <p className={`font-metric-md text-metric-md truncate ${done ? 'text-on-surface line-through' : ''}`}>{s.title}</p>
            <p className={`font-data-mono text-[12px] truncate ${done ? 'text-on-surface-variant' : 'opacity-70'}`}>{s.detail}</p>
          </div>
        </div>
        <div className={`relative w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 ${done ? 'bg-transparent' : 'bg-black/85 text-lime'}`}>
          {done ? (
            <Icon name="check_circle" fill className="text-secondary" />
          ) : (
            <>
              <span className="font-display-hero text-[15px] leading-none">{s.durationMin}</span>
              <span className="font-label-caps text-[8px] uppercase">min</span>
            </>
          )}
        </div>
      </Press>
    </motion.div>
  )
}
