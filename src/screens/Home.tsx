import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { DietCard } from '../components/DietCard'
import { Icon } from '../components/Icon'
import { CountUp, Press, Reveal, listContainer, spring } from '../components/motion'
import { addDays, mondayIndex, startOfWeek, todayISO } from '../lib/date'
import { dayFuel } from '../lib/nutrition'
import type { PlanSession, SessionType } from '../types'

type Filter = 'all' | 'run' | 'strength' | 'sport'

export function Home() {
  const { state, profile, weightKg, toggleSession } = useApp()
  const nav = useNavigate()
  const today = todayISO()
  const [filter, setFilter] = useState<Filter>('all')

  const fuel = dayFuel(profile, weightKg, today, state.foods, state.sessions)
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
            <div className="w-11 h-11 rounded-full bg-lilac text-on-lilac flex items-center justify-center font-metric-md border border-white/10">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface leading-none">
                Hi {firstName}
              </h1>
              <p className="font-data-mono text-[12px] text-lime flex items-center gap-1 mt-0.5">
                <Icon name="bolt" size={14} fill /> Fitness Freak
              </p>
            </div>
          </div>
          <Press
            onClick={() => nav('/settings')}
            className="w-11 h-11 rounded-full bg-ink-card border border-white/10 flex items-center justify-center text-on-surface"
          >
            <Icon name="notifications" />
          </Press>
        </header>
      </Reveal>

      {/* Hero progress card (lime) */}
      <Reveal>
        <Press
          as="div"
          onClick={() => nav('/train')}
          className="block w-full text-left rounded-[28px] bg-lime text-on-lime p-lg relative overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-8 opacity-10">
            <Icon name="exercise" size={160} fill />
          </div>
          <div className="relative flex justify-between items-start">
            <div>
              <p className="font-label-caps text-label-caps uppercase opacity-70">Today's progress</p>
              <h2 className="font-display-hero text-headline-lg mt-1 leading-tight">
                {hero ? hero.title : 'Rest day'}
              </h2>
              <p className="font-data-mono text-[13px] opacity-80 mt-1">
                {hero ? hero.detail : 'Recover & refuel'}
              </p>
            </div>
            <ProgressBadge pct={calPct} />
          </div>
          <div className="relative mt-lg inline-flex items-center gap-2 bg-on-lime text-lime rounded-full pl-md pr-sm py-2">
            <span className="font-display-hero text-metric-md">
              <CountUp value={fuel.consumed} />
            </span>
            <span className="font-label-caps text-label-caps uppercase">kcal in</span>
            <span className="w-7 h-7 rounded-full bg-lime text-on-lime flex items-center justify-center">
              <Icon name="arrow_outward" size={16} />
            </span>
          </div>
        </Press>
      </Reveal>

      {/* Week strip */}
      <Reveal>
        <WeekStrip today={today} />
      </Reveal>

      {/* Stat cards */}
      <Reveal>
        <div className="grid grid-cols-2 gap-md">
          <StatCard
            bg="bg-lilac"
            fg="text-on-lilac"
            icon="directions_run"
            label="KM today"
            value={<CountUp value={kmToday} format={(n) => n.toFixed(1)} />}
            sub="distance"
            onClick={() => nav('/train')}
          />
          <StatCard
            bg="bg-pink"
            fg="text-on-pink"
            icon="target"
            label="Calorie goal"
            value={<CountUp value={calPct} format={(n) => `${Math.round(n)}%`} />}
            sub={`${Math.max(0, fuel.remaining)} kcal left`}
            onClick={() => nav('/food')}
          />
        </div>
      </Reveal>

      {/* Activity donut */}
      <Reveal>
        <ActivityCard target={fuel.budget} eaten={fuel.consumed} burned={burned} remaining={Math.max(0, fuel.remaining)} />
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
              <div className="rounded-[24px] bg-ink-card border border-white/5 p-md flex items-center gap-md">
                <Icon name="self_improvement" className="text-lilac" />
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

function ProgressBadge({ pct }: { pct: number }) {
  const size = 56
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
      <span className="absolute inset-0 flex items-center justify-center font-display-hero text-metric-md">{pct}%</span>
    </div>
  )
}

function WeekStrip({ today }: { today: string }) {
  const start = startOfWeek(today)
  const idx = mondayIndex(today)
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="flex justify-between">
      {letters.map((l, i) => {
        const date = addDays(start, i)
        const dayNum = Number(date.slice(-2))
        const active = i === idx
        return (
          <div key={i} className="flex flex-col items-center gap-2">
            <span className="font-label-caps text-label-caps text-on-surface-variant">{l}</span>
            <motion.div
              animate={active ? { scale: 1 } : { scale: 1 }}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-metric-md text-[15px] ${
                active ? 'bg-lime text-on-lime' : 'text-on-surface-variant'
              }`}
            >
              {dayNum}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({
  bg,
  fg,
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  bg: string
  fg: string
  icon: string
  label: string
  value: React.ReactNode
  sub: string
  onClick: () => void
}) {
  return (
    <Press as="div" onClick={onClick} className={`rounded-[24px] ${bg} ${fg} p-md flex flex-col justify-between min-h-[128px] cursor-pointer`}>
      <div className="flex items-center justify-between">
        <span className="font-metric-md text-metric-md">{label}</span>
        <span className="w-8 h-8 rounded-full bg-on-lime/10 flex items-center justify-center">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div>
        <div className="font-display-hero text-display-hero leading-none">{value}</div>
        <span className="font-data-mono text-[12px] opacity-70">{sub}</span>
      </div>
    </Press>
  )
}

function ActivityCard({ target, eaten, burned, remaining }: { target: number; eaten: number; burned: number; remaining: number }) {
  const rows = [
    { label: 'Target', value: target, color: '#c9f24e' },
    { label: 'Eaten', value: eaten, color: '#f0b8db' },
    { label: 'Burned', value: burned, color: '#7c6cf0' },
    { label: 'Remaining', value: remaining, color: '#c8c4d5' },
  ]
  return (
    <div className="rounded-[28px] bg-ink-card border border-white/5 p-lg flex items-center justify-between">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="font-display-hero text-metric-md text-on-surface">
              <CountUp value={r.value} /> <span className="font-body-md text-[12px] text-on-surface-variant">Kcal</span>
            </span>
            <span className="font-data-mono text-[11px] text-on-surface-variant">{r.label}</span>
          </div>
        ))}
      </div>
      <ActivityDonut eaten={eaten} burned={burned} remaining={remaining} />
    </div>
  )
}

function ActivityDonut({ eaten, burned, remaining }: { eaten: number; burned: number; remaining: number }) {
  const size = 120
  const stroke = 16
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
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      {segs.map((s, i) => {
        const frac = s.v / total
        const dash = frac * circ
        const offset = acc
        acc += dash
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
            transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}
    </svg>
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
  run: { bg: 'bg-lilac', fg: 'text-on-lilac' },
  strength: { bg: 'bg-pink', fg: 'text-on-pink' },
  sport: { bg: 'bg-lime', fg: 'text-on-lime' },
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
        className={`rounded-[24px] p-md flex items-center justify-between cursor-pointer ${done ? 'bg-ink-card border border-white/5' : `${pastel.bg} ${pastel.fg}`}`}
      >
        <div className="flex items-center gap-md">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${done ? 'bg-secondary/20 text-secondary' : 'bg-on-lime/15'}`}>
            <Icon name={done ? 'check' : s.icon} fill />
          </div>
          <div>
            <p className={`font-metric-md text-metric-md ${done ? 'text-on-surface line-through' : ''}`}>{s.title}</p>
            <p className={`font-data-mono text-[12px] ${done ? 'text-on-surface-variant' : 'opacity-70'}`}>{s.detail}</p>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center ${done ? 'bg-transparent' : 'bg-on-lime text-lime'} shrink-0`}>
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
