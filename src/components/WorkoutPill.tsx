import type { PlanSession } from '../types'
import { Icon } from './Icon'
import { weekday } from '../lib/date'

interface Props {
  session: PlanSession
  today: string
  onToggle?: () => void
}

export function WorkoutPill({ session: s, today, onToggle }: Props) {
  const isToday = s.date === today
  const isPast = s.date < today

  if (s.completed) {
    return (
      <button
        onClick={onToggle}
        className="w-full bg-surface-container-low rounded-full border border-outline-variant p-sm flex items-center justify-between opacity-70 active:scale-[0.98] transition"
      >
        <div className="flex items-center gap-sm">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
            <Icon name="check_circle" fill />
          </div>
          <div className="text-left">
            <p className="font-metric-md text-metric-md text-on-surface line-through">{s.title}</p>
            <p className="font-data-mono text-[12px] text-on-surface-variant">{weekday(s.date)} • {s.detail}</p>
          </div>
        </div>
        <span className="font-data-mono text-[12px] text-secondary mr-sm">{s.kcal} kcal</span>
      </button>
    )
  }

  if (isToday) {
    return (
      <div className="w-full bg-surface-container-high rounded-full border-2 border-primary p-sm flex items-center justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
        <div className="flex items-center gap-sm relative z-10">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <Icon name={s.icon} fill />
          </div>
          <div>
            <p className="font-metric-md text-metric-md text-on-surface">{s.title}</p>
            <p className="font-data-mono text-[12px] text-primary">Today • {s.detail}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="relative z-10 bg-primary text-on-primary px-md py-xs rounded-full font-label-caps text-label-caps mr-sm hover:opacity-90 active:scale-95 transition"
        >
          {s.type === 'rest' ? 'LOG' : 'DONE'}
        </button>
      </div>
    )
  }

  // Upcoming / rest
  const dashed = s.type === 'rest' ? 'border-dashed' : ''
  return (
    <button
      onClick={onToggle}
      className={`w-full bg-surface-container-low rounded-full border border-outline-variant ${dashed} p-sm flex items-center justify-between active:scale-[0.98] transition ${isPast ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
          <Icon name={s.icon} />
        </div>
        <div className="text-left">
          <p className="font-metric-md text-metric-md text-on-surface">{s.title}</p>
          <p className="font-data-mono text-[12px] text-on-surface-variant">{weekday(s.date)} • {s.detail}</p>
        </div>
      </div>
    </button>
  )
}
